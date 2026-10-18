-- =============================================================================
-- Migration 004: Security hardening, audit wiring, idempotency & schema fixes
--
-- Summary of Changes:
-- 1. Recreate log_audit_event() with type-safe entity_id, proper DELETE handling,
--    returning coalesce(new, old), and search_path = public.
-- 2. Enable audit triggers on courses, batches, enrollments, coupons, announcements,
--    profiles, and live_classes.
-- 3. Wire on_auth_user_created trigger on auth.users to public.handle_new_user().
-- 4. Pin search_path = public on all security definer functions (is_admin, is_teacher,
--    owns_course, enrolled_in_course, verify_payment, request_refund, handle_new_user,
--    and log_audit_event).
-- 5. Revoke EXECUTE on verify_payment from public/anon/authenticated; grant to service_role.
-- 6. Add updated_at trigger for all tables with an updated_at column (profiles, platform_policies).
-- 7. Make verify_payment idempotent for replayed txn_id and auto-enroll the student on payment.
-- 8. Fix RLS leaks:
--    - profiles: restrict student reads so students cannot see other students' PII.
--    - quizzes & quiz_questions: hide correct answers from students until results_published.
--    - announcements: restrict audience to prevent students seeing teacher or other batch announcements.
--    - live_classes & assignments: enforce batch-level scoping instead of broad course-level access.
-- 9. Add missing performance indexes on unindexed foreign keys.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Recreate public.log_audit_event()
-- ---------------------------------------------------------------------------
create or replace function public.log_audit_event() returns trigger as $$
declare
  v_details text;
begin
  if (tg_op = 'DELETE') then
    v_details := row_to_json(old)::text;
  else
    v_details := row_to_json(new)::text;
  end if;

  insert into public.audit_logs (actor_id, actor_name, action, entity, entity_id, details)
  values (
    auth.uid(),
    (select full_name || ' (' || initcap(role) || ')' from public.profiles where id = auth.uid()),
    tg_table_name || '.' || tg_op,
    tg_table_name,
    coalesce(new.id, old.id)::text,
    v_details
  );

  return coalesce(new, old);
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- 2. Audit triggers on key entities
-- ---------------------------------------------------------------------------
drop trigger if exists trg_courses_audit on public.courses;
create trigger trg_courses_audit after insert or update or delete on public.courses
  for each row execute function public.log_audit_event();

drop trigger if exists trg_batches_audit on public.batches;
create trigger trg_batches_audit after insert or update or delete on public.batches
  for each row execute function public.log_audit_event();

drop trigger if exists trg_enrollments_audit on public.enrollments;
create trigger trg_enrollments_audit after insert or update or delete on public.enrollments
  for each row execute function public.log_audit_event();

drop trigger if exists trg_coupons_audit on public.coupons;
create trigger trg_coupons_audit after insert or update or delete on public.coupons
  for each row execute function public.log_audit_event();

drop trigger if exists trg_announcements_audit on public.announcements;
create trigger trg_announcements_audit after insert or update or delete on public.announcements
  for each row execute function public.log_audit_event();

drop trigger if exists trg_profiles_audit on public.profiles;
create trigger trg_profiles_audit after insert or update or delete on public.profiles
  for each row execute function public.log_audit_event();

drop trigger if exists trg_live_classes_audit on public.live_classes;
create trigger trg_live_classes_audit after insert or update or delete on public.live_classes
  for each row execute function public.log_audit_event();

-- ---------------------------------------------------------------------------
-- 3. Trigger on auth.users for new signups
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), new.email, 'student')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 4. Set search_path = public on all security definer functions
-- ---------------------------------------------------------------------------
create or replace function public.is_admin() returns boolean as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$ language sql stable security definer set search_path = public;

create or replace function public.is_teacher() returns boolean as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher' and status = 'active')
$$ language sql stable security definer set search_path = public;

create or replace function public.owns_course(course_uuid uuid) returns boolean as $$
  select exists (
    select 1 from public.teacher_courses tc
    where tc.teacher_id = auth.uid() and tc.course_id = course_uuid
  )
$$ language sql stable security definer set search_path = public;

create or replace function public.enrolled_in_course(course_uuid uuid) returns boolean as $$
  select exists (
    select 1 from public.enrollments e
    where e.student_id = auth.uid() and e.course_id = course_uuid and e.status = 'active'
  )
$$ language sql stable security definer set search_path = public;

create or replace function public.request_refund(p_order_id text, p_reason text) returns void as $$
begin
  insert into public.audit_logs (actor_id, actor_name, action, entity, entity_id, details)
  values (auth.uid(), (select full_name from public.profiles where id = auth.uid()),
          'payment.refund_requested', 'orders', p_order_id, p_reason);
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- 5 & 7. Update verify_payment with idempotency, enrollment creation & security
-- ---------------------------------------------------------------------------
create or replace function public.verify_payment(
  p_order_id text,
  p_gateway text,
  p_txn_id text,
  p_amount integer
) returns void as $$
declare
  o record;
begin
  select * into o from public.orders where order_id = p_order_id;
  if not found then
    raise exception 'order not found';
  end if;

  if o.amount <> p_amount then
    raise exception 'amount mismatch: gateway % vs order %', p_amount, o.amount;
  end if;

  -- Idempotency check: if this transaction was already processed and verified
  if exists (
    select 1 from public.payments
    where order_id = o.id and txn_id = p_txn_id and verified = true
  ) then
    -- Ensure enrollment exists before early exit
    insert into public.enrollments (student_id, course_id, amount_paid, source)
    values (o.student_id, o.course_id, o.amount, case when o.coupon_code is not null then 'coupon' else 'direct' end)
    on conflict (student_id, course_id) do nothing;
    return;
  end if;

  -- Mark order paid
  update public.orders set status = 'paid' where id = o.id;

  -- Record payment
  insert into public.payments (order_id, amount, status, gateway, txn_id, verified, paid_at)
  values (o.id, p_amount, 'success', p_gateway, p_txn_id, true, now())
  on conflict (order_id) do update
    set status = 'success', verified = true, txn_id = p_txn_id, paid_at = now();

  -- Create course enrollment for the student
  insert into public.enrollments (student_id, course_id, amount_paid, source)
  values (o.student_id, o.course_id, o.amount, case when o.coupon_code is not null then 'coupon' else 'direct' end)
  on conflict (student_id, course_id) do nothing;

  -- Audit log
  insert into public.audit_logs (actor_id, actor_name, action, entity, entity_id, details)
  values (null, 'gateway:' || p_gateway, 'payment.verified', 'payments', o.id::text,
          format('Verified payment %s for order %s (%s)', p_txn_id, p_order_id, p_amount));
end;
$$ language plpgsql security definer set search_path = public;

-- Revoke execute from public/anon/authenticated and grant strictly to service_role
revoke execute on function public.verify_payment(text, text, text, integer) from public, anon, authenticated;
grant execute on function public.verify_payment(text, text, text, integer) to service_role;

-- ---------------------------------------------------------------------------
-- 6. Updated_at triggers for all tables with an updated_at column
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_platform_policies_updated on public.platform_policies;
create trigger trg_platform_policies_updated before update on public.platform_policies
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 8. Fix RLS Vulnerabilities
-- ---------------------------------------------------------------------------

-- Fix A: Prevent students from reading other students' profile data
drop policy if exists "profiles: everyone reads non-sensitive fields" on public.profiles;
create policy "profiles: staff read all, users read staff and own profile"
  on public.profiles for select using (
    public.is_admin()
    or public.is_teacher()
    or role in ('admin', 'teacher')
    or id = auth.uid()
  );

-- Fix B: Prevent students from reading quiz correct answers before results published
drop policy if exists "quizzes: published readable" on public.quizzes;
create policy "quizzes: staff or results published"
  on public.quizzes for select using (
    public.is_admin()
    or public.owns_course(course_id)
    or (status = 'published' and results_published = true)
  );

drop policy if exists "quiz_questions: follow quiz visibility" on public.quiz_questions;
create policy "quiz_questions: staff or results published"
  on public.quiz_questions for select using (
    public.is_admin()
    or (public.is_teacher() and exists (select 1 from public.quizzes q where q.id = quiz_id and public.owns_course(q.course_id)))
    or exists (select 1 from public.quizzes q where q.id = quiz_id and q.results_published = true)
  );

-- Secure question fetching helper that strips correctIndex for students taking a quiz
create or replace function public.get_quiz_questions(p_quiz_id uuid)
returns jsonb as $$
declare
  q record;
  sanitized jsonb;
begin
  select * into q from public.quizzes where id = p_quiz_id;
  if not found or q.status <> 'published' then
    raise exception 'quiz not found or not published';
  end if;

  if not (public.is_admin() or public.owns_course(q.course_id) or exists (
    select 1 from public.batch_students bs where bs.batch_id = q.batch_id and bs.student_id = auth.uid()
  )) then
    raise exception 'not authorized to take this quiz';
  end if;

  if q.results_published or public.is_admin() or public.owns_course(q.course_id) then
    return q.questions;
  end if;

  select coalesce(jsonb_agg(elem - 'correctIndex'), '[]'::jsonb)
  into sanitized
  from jsonb_array_elements(q.questions) as elem;

  return sanitized;
end;
$$ language plpgsql stable security definer set search_path = public;

-- Fix C: Prevent students from reading teacher-only or other batches' announcements
drop policy if exists "announcements: readable by all" on public.announcements;
create policy "announcements: staff read all, students read targeted"
  on public.announcements for select using (
    public.is_admin()
    or public.is_teacher()
    or audience = 'all'
    or (audience = 'students' and (batch_id is null or exists (
      select 1 from public.batch_students bs where bs.batch_id = announcements.batch_id and bs.student_id = auth.uid()
    )))
    or (audience = 'batch' and exists (
      select 1 from public.batch_students bs where bs.batch_id = announcements.batch_id and bs.student_id = auth.uid()
    ))
  );

-- Fix D: Scope live_classes to batch students rather than any course student
drop policy if exists "live_classes: staff and enrolled students read" on public.live_classes;
create policy "live_classes: staff and batch students read"
  on public.live_classes for select using (
    public.is_admin() or public.is_teacher()
    or exists (
      select 1 from public.batch_students bs
      where bs.batch_id = live_classes.batch_id and bs.student_id = auth.uid()
    )
  );

-- Fix E: Scope assignments to batch students
drop policy if exists "assignments: staff and batch students read" on public.assignments;
create policy "assignments: staff and batch students read"
  on public.assignments for select using (
    public.is_admin() or public.is_teacher()
    or exists (
      select 1 from public.batch_students bs
      where bs.batch_id = assignments.batch_id and bs.student_id = auth.uid()
    )
  );

-- Fix F: Allow teachers to read platform policies
drop policy if exists "platform_policies: admin only" on public.platform_policies;
create policy "platform_policies: staff read"
  on public.platform_policies for select using (public.is_admin() or public.is_teacher());
create policy "platform_policies: admin write"
  on public.platform_policies for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 9. Missing Foreign Key Performance Indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_lessons_section on public.lessons(section_id);
create index if not exists idx_teacher_courses_course on public.teacher_courses(course_id);
create index if not exists idx_batches_course on public.batches(course_id);
create index if not exists idx_batches_teacher on public.batches(teacher_id);
create index if not exists idx_batch_students_student on public.batch_students(student_id);
create index if not exists idx_enrollments_batch on public.enrollments(batch_id);
create index if not exists idx_live_classes_course on public.live_classes(course_id);
create index if not exists idx_recorded_lectures_teacher on public.recorded_lectures(teacher_id);
create index if not exists idx_recorded_lectures_section on public.recorded_lectures(section_id);
create index if not exists idx_recorded_lectures_batch on public.recorded_lectures(batch_id);
create index if not exists idx_study_materials_course on public.study_materials(course_id);
create index if not exists idx_study_materials_teacher on public.study_materials(teacher_id);
create index if not exists idx_assignments_course on public.assignments(course_id);
create index if not exists idx_assignments_batch on public.assignments(batch_id);
create index if not exists idx_assignments_teacher on public.assignments(teacher_id);
create index if not exists idx_submissions_student on public.assignment_submissions(student_id);
create index if not exists idx_quizzes_course on public.quizzes(course_id);
create index if not exists idx_quizzes_batch on public.quizzes(batch_id);
create index if not exists idx_quizzes_teacher on public.quizzes(teacher_id);
create index if not exists idx_quiz_questions_quiz on public.quiz_questions(quiz_id);
create index if not exists idx_quiz_attempts_student on public.quiz_attempts(student_id);
create index if not exists idx_lesson_progress_lesson on public.lesson_progress(lesson_id);
create index if not exists idx_lesson_progress_course on public.lesson_progress(course_id);
create index if not exists idx_orders_course on public.orders(course_id);
create index if not exists idx_announcements_batch on public.announcements(batch_id);
create index if not exists idx_announcements_created_by on public.announcements(created_by);
create index if not exists idx_attendance_records_student on public.attendance_records(student_id);
create index if not exists idx_audit_logs_actor on public.audit_logs(actor_id);
