-- =============================================================================
-- Migration 005: UI Compatibility Fields & Foreign Keys
--
-- Adds fields required by the frontend UI that were present in mockData.js
-- but missing from 001_schema.sql, along with helper indexes and policy updates.
-- =============================================================================

-- 1. Profiles: student_id identifier and last_active_at tracking
alter table public.profiles
  add column if not exists student_id text,
  add column if not exists last_active_at timestamptz default now();

-- 2. Courses: direct teacher_id reference
alter table public.courses
  add column if not exists teacher_id uuid references public.profiles(id) on delete set null;

create index if not exists idx_courses_teacher_id on public.courses(teacher_id);

-- 3. Quizzes: max_attempts allowed per student
alter table public.quizzes
  add column if not exists max_attempts integer not null default 1 check (max_attempts > 0);

-- 4. Quiz Attempts: status column ('completed' | 'in_progress')
alter table public.quiz_attempts
  add column if not exists status text not null default 'completed';

-- 5. Update public.owns_course to account for courses.teacher_id as well as teacher_courses
create or replace function public.owns_course(course_uuid uuid) returns boolean as $$
  select exists (
    select 1 from public.teacher_courses tc
    where tc.teacher_id = auth.uid() and tc.course_id = course_uuid
  ) or exists (
    select 1 from public.courses c
    where c.id = course_uuid and c.teacher_id = auth.uid()
  );
$$ language sql stable security definer set search_path = public;

-- 6. Trigger to automatically sync courses.teacher_id into teacher_courses
create or replace function public.sync_course_teacher() returns trigger as $$
begin
  if new.teacher_id is not null then
    insert into public.teacher_courses (teacher_id, course_id, role)
    values (new.teacher_id, new.id, 'owner')
    on conflict (teacher_id, course_id) do nothing;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_sync_course_teacher on public.courses;
create trigger trg_sync_course_teacher
  after insert or update of teacher_id on public.courses
  for each row execute function public.sync_course_teacher();
