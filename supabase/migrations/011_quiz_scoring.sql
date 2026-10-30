-- =============================================================================
-- Migration 011: Server-Side Quiz Scoring and Secure Question Retrieval
-- =============================================================================

-- 1. Ensure quiz_attempts has started_at, submitted_at, late tracking columns
alter table public.quiz_attempts
  add column if not exists started_at timestamptz default now(),
  add column if not exists submitted_at timestamptz,
  add column if not exists late boolean default false;

alter table public.quiz_attempts
  alter column score set default 0,
  alter column max_score set default 0;

-- 2. Restrict quiz_questions RLS: Students must NEVER select quiz_questions directly.
-- Only admins and course-owner teachers keep full access.
drop policy if exists "quiz_questions: staff or results published" on public.quiz_questions;
drop policy if exists "quiz_questions: follow quiz visibility" on public.quiz_questions;
drop policy if exists "quiz_questions: staff select" on public.quiz_questions;
drop policy if exists "quiz_questions: staff write" on public.quiz_questions;
drop policy if exists "quiz_questions: admin/course-owner write" on public.quiz_questions;

create policy "quiz_questions: staff select"
  on public.quiz_questions for select using (
    public.is_admin()
    or (public.is_teacher() and exists (
      select 1 from public.quizzes q
      where q.id = quiz_id and public.owns_course(q.course_id)
    ))
  );

create policy "quiz_questions: staff write"
  on public.quiz_questions for all using (
    public.is_admin()
    or (public.is_teacher() and exists (
      select 1 from public.quizzes q
      where q.id = quiz_id and public.owns_course(q.course_id)
    ))
  ) with check (
    public.is_admin()
    or (public.is_teacher() and exists (
      select 1 from public.quizzes q
      where q.id = quiz_id and public.owns_course(q.course_id)
    ))
  );

-- 3. RPC start_quiz(p_quiz_id uuid)
-- Security definer: checks enrollment, status, attempts; creates attempt in_progress;
-- returns attempt id, time limit, and questions sanitized WITHOUT correct answers.
create or replace function public.start_quiz(p_quiz_id uuid)
returns jsonb as $$
declare
  v_quiz record;
  v_attempts_count integer;
  v_attempt_id uuid;
  v_started_at timestamptz;
  v_sanitized_questions jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_quiz from public.quizzes where id = p_quiz_id;
  if not found then
    raise exception 'Quiz not found';
  end if;

  if v_quiz.status <> 'published' then
    raise exception 'Quiz is not published';
  end if;

  -- Caller must be enrolled in the quiz's course (admins and course teachers bypass)
  if not (
    public.is_admin()
    or public.owns_course(v_quiz.course_id)
    or exists (
      select 1 from public.enrollments e
      where e.student_id = auth.uid()
        and e.course_id = v_quiz.course_id
        and (e.status is null or e.status in ('active', 'completed'))
    )
  ) then
    raise exception 'Not enrolled in this course';
  end if;

  -- If quiz has batch_id, caller must be assigned to that batch
  if v_quiz.batch_id is not null and not (
    public.is_admin()
    or public.owns_course(v_quiz.course_id)
    or exists (
      select 1 from public.batch_students bs
      where bs.batch_id = v_quiz.batch_id
        and bs.student_id = auth.uid()
    )
  ) then
    raise exception 'Not enrolled in this batch';
  end if;

  -- Resume existing in_progress attempt if one is already active for this quiz
  select id, started_at into v_attempt_id, v_started_at
  from public.quiz_attempts
  where quiz_id = p_quiz_id
    and student_id = auth.uid()
    and status = 'in_progress';

  if v_attempt_id is null then
    -- Check attempts used < max_attempts
    select count(*) into v_attempts_count
    from public.quiz_attempts
    where quiz_id = p_quiz_id
      and student_id = auth.uid()
      and status = 'completed';

    if v_attempts_count >= coalesce(v_quiz.max_attempts, 1) then
      raise exception 'Maximum attempts reached for this quiz';
    end if;

    v_started_at := now();
    insert into public.quiz_attempts (
      quiz_id, student_id, status, started_at, attempted_at, score, max_score, answers
    )
    values (
      p_quiz_id, auth.uid(), 'in_progress', v_started_at, v_started_at, 0, coalesce(v_quiz.total_marks, 0), '[]'::jsonb
    )
    on conflict (quiz_id, student_id) do update
      set status = 'in_progress',
          started_at = v_started_at,
          attempted_at = v_started_at,
          submitted_at = null,
          score = 0,
          max_score = coalesce(v_quiz.total_marks, 0),
          answers = '[]'::jsonb
    returning id into v_attempt_id;
  end if;

  -- Sanitize questions: strip correct answers / correctIndex
  if jsonb_typeof(v_quiz.questions) = 'array' and jsonb_array_length(v_quiz.questions) > 0 then
    select coalesce(
      jsonb_agg(
        elem - 'correctIndex' - 'correct_index' - 'correctOption' - 'correct_option' - 'answer'
      ),
      '[]'::jsonb
    )
    into v_sanitized_questions
    from jsonb_array_elements(v_quiz.questions) as elem;
  else
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', qq.id,
          'text', qq.text,
          'options', qq.options,
          'marks', qq.marks,
          'order', qq."order"
        )
        order by qq."order", qq.id
      ),
      '[]'::jsonb
    )
    into v_sanitized_questions
    from public.quiz_questions qq
    where qq.quiz_id = v_quiz.id;
  end if;

  return jsonb_build_object(
    'attempt_id', v_attempt_id,
    'quiz_id', v_quiz.id,
    'title', v_quiz.title,
    'time_limit_min', coalesce(v_quiz.time_limit_min, 20),
    'started_at', v_started_at,
    'total_marks', coalesce(v_quiz.total_marks, 0),
    'questions', v_sanitized_questions
  );
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.start_quiz(uuid) from public;
grant execute on function public.start_quiz(uuid) to authenticated;

-- 4. RPC submit_quiz(p_attempt_id uuid, p_answers jsonb)
-- Security definer: grades strictly on server, stores results, marks completed,
-- returns score and total. Returns correct answers only if results_published = true.
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
    for v_q in (
      select jsonb_build_object(
        'correct_index', qq.correct_index,
        'marks', qq.marks
      ) as q_obj
      from public.quiz_questions qq
      where qq.quiz_id = v_quiz.id
      order by qq."order", qq.id
    ) loop
      v_q_marks := coalesce((v_q.q_obj->>'marks')::integer, 10);
      v_total := v_total + v_q_marks;
      v_q_correct := (v_q.q_obj->>'correct_index')::integer;
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
