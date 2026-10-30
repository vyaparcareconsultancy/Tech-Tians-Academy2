-- =============================================================================
-- Migration 012: Quiz fixes on top of 011
--
-- 1. Students could not see quizzes in their list: the quizzes SELECT policy
--    (004) hides quiz rows from students until results are published, because
--    quizzes.questions contains the correct answers. Instead of opening the
--    table, list_student_quizzes() returns only safe metadata (no questions,
--    no answers) for published quizzes of the caller's courses/batches.
-- 2. submit_quiz() fallback branch (questions stored in quiz_questions) used a
--    jsonb variable as a loop record and would fail at runtime. Recreated with
--    a proper record variable. Grading logic is otherwise unchanged.
-- =============================================================================

create or replace function public.list_student_quizzes()
returns table (
  id uuid,
  course_id uuid,
  batch_id uuid,
  teacher_id uuid,
  title text,
  time_limit_min integer,
  total_marks integer,
  max_attempts integer,
  status text,
  results_published boolean,
  created_at timestamptz,
  question_count integer
) as $$
  select
    q.id, q.course_id, q.batch_id, q.teacher_id, q.title,
    q.time_limit_min, q.total_marks, coalesce(q.max_attempts, 1),
    q.status, q.results_published, q.created_at,
    case
      when jsonb_typeof(q.questions) = 'array' and jsonb_array_length(q.questions) > 0
        then jsonb_array_length(q.questions)
      else (select count(*)::integer from public.quiz_questions qq where qq.quiz_id = q.id)
    end
  from public.quizzes q
  where q.status = 'published'
    and auth.uid() is not null
    and exists (
      select 1 from public.enrollments e
      where e.student_id = auth.uid()
        and e.course_id = q.course_id
        and (e.status is null or e.status in ('active', 'completed'))
    )
    and (
      q.batch_id is null
      or exists (
        select 1 from public.batch_students bs
        where bs.batch_id = q.batch_id and bs.student_id = auth.uid()
      )
    )
  order by q.created_at desc;
$$ language sql stable security definer set search_path = public;

revoke execute on function public.list_student_quizzes() from public;
grant execute on function public.list_student_quizzes() to authenticated;

create or replace function public.submit_quiz(p_attempt_id uuid, p_answers jsonb)
returns jsonb as $$
declare
  v_attempt record;
  v_quiz record;
  v_time_limit_sec integer;
  v_elapsed_sec numeric;
  v_is_late boolean := false;
  v_score integer := 0;
  v_total integer := 0;
  v_q_count integer := 0;
  v_correct_count integer := 0;
  v_correct_answers jsonb := '[]'::jsonb;
  v_q jsonb;
  v_row record;
  v_q_marks integer;
  v_q_correct integer;
  v_student_ans text;
  v_student_opt integer;
  v_idx integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_attempt from public.quiz_attempts where id = p_attempt_id;
  if not found then
    raise exception 'Attempt not found';
  end if;

  -- Only attempt owner (or admin)
  if v_attempt.student_id <> auth.uid() and not public.is_admin() then
    raise exception 'Unauthorized: you do not own this attempt';
  end if;

  -- Only if status in_progress
  if v_attempt.status <> 'in_progress' then
    raise exception 'Quiz attempt is not in progress';
  end if;

  select * into v_quiz from public.quizzes where id = v_attempt.quiz_id;
  if not found then
    raise exception 'Quiz not found';
  end if;

  -- Check time limit + 1 minute grace
  v_time_limit_sec := coalesce(v_quiz.time_limit_min, 20) * 60;
  v_elapsed_sec := extract(epoch from (now() - coalesce(v_attempt.started_at, v_attempt.attempted_at)));
  if v_elapsed_sec > (v_time_limit_sec + 60) then
    v_is_late := true;
  end if;

  -- Server-side grading
  if jsonb_typeof(v_quiz.questions) = 'array' and jsonb_array_length(v_quiz.questions) > 0 then
    v_q_count := jsonb_array_length(v_quiz.questions);
    for v_idx in 0..(v_q_count - 1) loop
      v_q := v_quiz.questions->v_idx;
      v_q_marks := coalesce((v_q->>'marks')::integer, 10);
      v_total := v_total + v_q_marks;
      v_q_correct := coalesce(
        (v_q->>'correctIndex')::integer,
        (v_q->>'correct_index')::integer,
        (v_q->>'correctOption')::integer,
        (v_q->>'correct_option')::integer
      );

      if jsonb_typeof(p_answers) = 'array' then
        v_student_ans := p_answers->>v_idx;
      else
        v_student_ans := p_answers->>v_idx::text;
      end if;

      if v_student_ans is not null and v_student_ans ~ '^-?[0-9]+$' then
        v_student_opt := v_student_ans::integer;
        if v_q_correct is not null and v_student_opt = v_q_correct then
          v_score := v_score + v_q_marks;
          v_correct_count := v_correct_count + 1;
        end if;
      end if;

      if v_quiz.results_published then
        v_correct_answers := v_correct_answers || jsonb_build_array(v_q_correct);
      end if;
    end loop;
  else
    v_idx := 0;
    for v_row in
      select qq.correct_index, qq.marks
      from public.quiz_questions qq
      where qq.quiz_id = v_quiz.id
      order by qq."order", qq.id
    loop
      v_q_marks := coalesce(v_row.marks, 10);
      v_total := v_total + v_q_marks;
      v_q_correct := v_row.correct_index;
      v_q_count := v_q_count + 1;

      if jsonb_typeof(p_answers) = 'array' then
        v_student_ans := p_answers->>v_idx;
      else
        v_student_ans := p_answers->>v_idx::text;
      end if;

      if v_student_ans is not null and v_student_ans ~ '^-?[0-9]+$' then
        v_student_opt := v_student_ans::integer;
        if v_q_correct is not null and v_student_opt = v_q_correct then
          v_score := v_score + v_q_marks;
          v_correct_count := v_correct_count + 1;
        end if;
      end if;

      if v_quiz.results_published then
        v_correct_answers := v_correct_answers || jsonb_build_array(v_q_correct);
      end if;

      v_idx := v_idx + 1;
    end loop;
  end if;

  -- Stores score, total, answers, submitted_at, status 'completed'
  update public.quiz_attempts
  set score = v_score,
      max_score = v_total,
      answers = p_answers,
      submitted_at = now(),
      status = 'completed',
      late = v_is_late,
      published = v_quiz.results_published
  where id = p_attempt_id;

  return jsonb_build_object(
    'score', v_score,
    'total', v_total,
    'correct_count', v_correct_count,
    'total_questions', v_q_count,
    'percentage', case when v_total > 0 then round((v_score::numeric / v_total::numeric) * 100) else 0 end,
    'passed', case when v_total > 0 and (v_score::numeric / v_total::numeric) >= 0.5 then true else false end,
    'late', v_is_late,
    'results_published', v_quiz.results_published,
    'correct_answers', case when v_quiz.results_published then v_correct_answers else null end
  );
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.submit_quiz(uuid, jsonb) from public;
grant execute on function public.submit_quiz(uuid, jsonb) to authenticated;

-- 3. Students could INSERT their own quiz_attempts row directly with any score
--    (policy from 002). Attempts are now created only by start_quiz() and
--    graded only by submit_quiz(), both security definer, so remove the
--    direct insert path for clients.
drop policy if exists "quiz_attempts: students insert own attempts" on public.quiz_attempts;
