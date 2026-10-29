-- =============================================================================
-- Migration 008: Teacher portal RLS hardening, position column, status & RPCs
-- =============================================================================

-- 1. Add 'pending_review' to courses.status check constraint
alter table public.courses drop constraint if exists courses_status_check;
alter table public.courses add constraint courses_status_check
  check (status in ('draft', 'pending_approval', 'pending_review', 'published', 'archived'));

-- 2. Add position column to course_sections and lessons to keep order
alter table public.course_sections
  add column if not exists position integer default 1;
update public.course_sections set position = "order" where position is null or position = 1;

alter table public.lessons
  add column if not exists position integer default 1;
update public.lessons set position = "order" where position is null or position = 1;

-- 3. Scope owns_course strictly to teacher_courses
create or replace function public.owns_course(course_uuid uuid) returns boolean as $$
  select exists (
    select 1 from public.teacher_courses tc
    where tc.teacher_id = auth.uid() and tc.course_id = course_uuid
  );
$$ language sql stable security definer set search_path = public;

-- 4. RLS: Teachers must only see courses linked in teacher_courses
drop policy if exists "courses: published visible to everyone" on public.courses;
drop policy if exists "courses: select policy" on public.courses;
create policy "courses: select policy"
  on public.courses for select using (
    public.is_admin()
    or (public.is_teacher() and public.owns_course(id))
    or (not public.is_teacher() and status = 'published')
  );

-- 5. RLS: Teachers must only see batches where batches.teacher_id = them
drop policy if exists "batches: visible to staff and enrolled students" on public.batches;
drop policy if exists "batches: select policy" on public.batches;
create policy "batches: select policy"
  on public.batches for select using (
    public.is_admin()
    or (public.is_teacher() and teacher_id = auth.uid())
    or public.is_batch_member(id)
  );

-- 6. Upsert attendance by (batch_id, student_id, date)
create or replace function public.upsert_attendance(
  p_batch_id uuid,
  p_student_id uuid,
  p_date date,
  p_status text
) returns void as $$
begin
  if not (public.is_admin() or (public.is_teacher() and exists (
    select 1 from public.batches b where b.id = p_batch_id and b.teacher_id = auth.uid()
  ))) then
    raise exception 'Unauthorized to mark attendance for this batch';
  end if;

  insert into public.attendance_records (batch_id, student_id, date, status, marked_by)
  values (p_batch_id, p_student_id, p_date, p_status, auth.uid())
  on conflict (batch_id, student_id, date)
  do update set status = excluded.status, marked_by = excluded.marked_by;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.upsert_attendance(uuid, uuid, date, text) to authenticated;

-- 7. RLS: Attendance records select policy scoped to teacher's own batches
drop policy if exists "attendance: students read own; teachers read own batches" on public.attendance_records;
drop policy if exists "attendance: select policy" on public.attendance_records;
create policy "attendance: select policy"
  on public.attendance_records for select using (
    student_id = auth.uid()
    or public.is_admin()
    or (public.is_teacher() and exists (select 1 from public.batches b where b.id = batch_id and b.teacher_id = auth.uid()))
  );

-- 8. Teacher profile: update only phone, bio, qualification
create or replace function public.update_teacher_profile(
  p_phone text default null,
  p_bio text default null,
  p_qualification text default null
) returns void as $$
begin
  if not public.is_teacher() then
    raise exception 'Unauthorized: teacher profile update';
  end if;

  update public.profiles
  set
    phone = coalesce(p_phone, phone),
    bio = coalesce(p_bio, bio),
    qualification = coalesce(p_qualification, qualification),
    updated_at = now()
  where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.update_teacher_profile(text, text, text) to authenticated;

-- Column-safe trigger preventing teachers from elevating role, status, rating or email
create or replace function public.enforce_teacher_profile_columns() returns trigger as $$
begin
  if not public.is_admin() and old.role = 'teacher' and auth.uid() = old.id then
    if new.role <> old.role or new.status <> old.status or new.rating is distinct from old.rating or new.email <> old.email or new.id <> old.id then
      raise exception 'Teachers may not modify role, status, rating, or email';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_enforce_teacher_profile on public.profiles;
create trigger trg_enforce_teacher_profile
  before update on public.profiles
  for each row execute function public.enforce_teacher_profile_columns();
