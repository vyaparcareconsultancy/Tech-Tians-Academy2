-- =============================================================================
-- Migration 010: Supabase Storage configuration and RLS policies
-- =============================================================================

-- 1. Buckets: private `materials` & `submissions`, public `avatars`
insert into storage.buckets (id, name, public)
values
  ('materials', 'materials', false),
  ('submissions', 'submissions', false),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Ensure profiles table has avatar_url column
alter table public.profiles
  add column if not exists avatar_url text;

-- Helper functions to parse paths safely in storage policies
-- Path formats supported:
--   materials:   materials/<course_id>/<file>   or <course_id>/<file>
--   submissions: submissions/<assignment_id>/<user_id>/<file> or <assignment_id>/<user_id>/<file>
--   avatars:     avatars/<user_id>/<file>       or <user_id>/<file>

create or replace function public.extract_course_id_from_path(p_name text) returns uuid as $$
declare
  part1 text := split_part(p_name, '/', 1);
  part2 text := split_part(p_name, '/', 2);
  target text := case when part1 = 'materials' then part2 else part1 end;
begin
  if target ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return target::uuid;
  end if;
  return null;
end;
$$ language plpgsql stable security definer set search_path = public;

create or replace function public.extract_assignment_id_from_path(p_name text) returns uuid as $$
declare
  part1 text := split_part(p_name, '/', 1);
  part2 text := split_part(p_name, '/', 2);
  target text := case when part1 = 'submissions' then part2 else part1 end;
begin
  if target ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return target::uuid;
  end if;
  return null;
end;
$$ language plpgsql stable security definer set search_path = public;

create or replace function public.extract_submission_user_id_from_path(p_name text) returns uuid as $$
declare
  part1 text := split_part(p_name, '/', 1);
  part2 text := split_part(p_name, '/', 2);
  part3 text := split_part(p_name, '/', 3);
  target text := case when part1 = 'submissions' then part3 else part2 end;
begin
  if target ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return target::uuid;
  end if;
  return null;
end;
$$ language plpgsql stable security definer set search_path = public;

create or replace function public.extract_avatar_user_id(p_name text) returns uuid as $$
declare
  part1 text := split_part(p_name, '/', 1);
  part2 text := split_part(p_name, '/', 2);
  target text := case when part1 = 'avatars' then part2 else part1 end;
begin
  if target ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return target::uuid;
  end if;
  return null;
end;
$$ language plpgsql stable security definer set search_path = public;

grant execute on function public.extract_course_id_from_path(text) to authenticated, anon;
grant execute on function public.extract_assignment_id_from_path(text) to authenticated, anon;
grant execute on function public.extract_submission_user_id_from_path(text) to authenticated, anon;
grant execute on function public.extract_avatar_user_id(text) to authenticated, anon;

-- Update update_teacher_profile to allow optional avatar_url parameter
-- Drop the old 3-argument version first; keeping both overloads makes the
-- RPC call ambiguous ("could not choose the best candidate function").
drop function if exists public.update_teacher_profile(text, text, text);
create or replace function public.update_teacher_profile(
  p_phone text default null,
  p_bio text default null,
  p_qualification text default null,
  p_avatar_url text default null
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
    avatar_url = coalesce(p_avatar_url, avatar_url),
    updated_at = now()
  where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.update_teacher_profile(text, text, text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 2. storage.objects Policies
-- -----------------------------------------------------------------------------

-- RLS on storage.objects is already enabled and owned by Supabase.
-- Do NOT run "alter table storage.objects ..." here: it fails with
-- "must be owner of table objects" in the SQL editor.

-- -----------------------------------------------------------------------------
-- Bucket: materials
-- path: materials/<course_id>/<file>
-- Read: enrolled students, course owner teachers, and admins
-- Upload/Delete: course owner teachers and admins
-- -----------------------------------------------------------------------------

drop policy if exists "materials: read access" on storage.objects;
create policy "materials: read access"
  on storage.objects for select
  using (
    bucket_id = 'materials' and (
      public.is_admin()
      or (
        public.extract_course_id_from_path(name) is not null and (
          public.owns_course(public.extract_course_id_from_path(name))
          or public.enrolled_in_course(public.extract_course_id_from_path(name))
        )
      )
    )
  );

drop policy if exists "materials: insert access" on storage.objects;
create policy "materials: insert access"
  on storage.objects for insert
  with check (
    bucket_id = 'materials' and (
      public.is_admin()
      or (
        public.is_teacher()
        and public.extract_course_id_from_path(name) is not null
        and public.owns_course(public.extract_course_id_from_path(name))
      )
    )
  );

drop policy if exists "materials: update access" on storage.objects;
create policy "materials: update access"
  on storage.objects for update
  using (
    bucket_id = 'materials' and (
      public.is_admin()
      or (
        public.is_teacher()
        and public.extract_course_id_from_path(name) is not null
        and public.owns_course(public.extract_course_id_from_path(name))
      )
    )
  );

drop policy if exists "materials: delete access" on storage.objects;
create policy "materials: delete access"
  on storage.objects for delete
  using (
    bucket_id = 'materials' and (
      public.is_admin()
      or (
        public.is_teacher()
        and public.extract_course_id_from_path(name) is not null
        and public.owns_course(public.extract_course_id_from_path(name))
      )
    )
  );

-- -----------------------------------------------------------------------------
-- Bucket: submissions
-- path: submissions/<assignment_id>/<user_id>/<file>
-- Read: student under own user_id, course teacher, and admins
-- Upload: student under own user_id
-- Delete: student under own user_id and admins
-- -----------------------------------------------------------------------------

drop policy if exists "submissions: read access" on storage.objects;
create policy "submissions: read access"
  on storage.objects for select
  using (
    bucket_id = 'submissions' and (
      (auth.uid() is not null and public.extract_submission_user_id_from_path(name) = auth.uid())
      or public.is_admin()
      or (
        public.is_teacher()
        and exists (
          select 1 from public.assignments a
          where a.id = public.extract_assignment_id_from_path(name)
            and (public.owns_course(a.course_id) or a.teacher_id = auth.uid())
        )
      )
    )
  );

drop policy if exists "submissions: insert access" on storage.objects;
create policy "submissions: insert access"
  on storage.objects for insert
  with check (
    bucket_id = 'submissions' and (
      auth.uid() is not null
      and public.extract_submission_user_id_from_path(name) = auth.uid()
      and exists (
        select 1 from public.assignments a
        where a.id = public.extract_assignment_id_from_path(name)
          and public.enrolled_in_course(a.course_id)
      )
    )
  );

drop policy if exists "submissions: update access" on storage.objects;
create policy "submissions: update access"
  on storage.objects for update
  using (
    bucket_id = 'submissions' and (
      auth.uid() is not null
      and public.extract_submission_user_id_from_path(name) = auth.uid()
    )
  );

drop policy if exists "submissions: delete access" on storage.objects;
create policy "submissions: delete access"
  on storage.objects for delete
  using (
    bucket_id = 'submissions' and (
      (auth.uid() is not null and public.extract_submission_user_id_from_path(name) = auth.uid())
      or public.is_admin()
    )
  );

-- -----------------------------------------------------------------------------
-- Bucket: avatars
-- path: avatars/<user_id>/<file>
-- Read: public (anyone)
-- Upload/Update: users under own user_id
-- Delete: users under own user_id and admins
-- -----------------------------------------------------------------------------

drop policy if exists "avatars: public read access" on storage.objects;
create policy "avatars: public read access"
  on storage.objects for select
  using (
    bucket_id = 'avatars'
  );

drop policy if exists "avatars: user insert access" on storage.objects;
create policy "avatars: user insert access"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars' and (
      auth.uid() is not null and (
        public.extract_avatar_user_id(name) = auth.uid()
        or public.is_admin()
      )
    )
  );

drop policy if exists "avatars: user update access" on storage.objects;
create policy "avatars: user update access"
  on storage.objects for update
  using (
    bucket_id = 'avatars' and (
      auth.uid() is not null and (
        public.extract_avatar_user_id(name) = auth.uid()
        or public.is_admin()
      )
    )
  );

drop policy if exists "avatars: user delete access" on storage.objects;
create policy "avatars: user delete access"
  on storage.objects for delete
  using (
    bucket_id = 'avatars' and (
      auth.uid() is not null and (
        public.extract_avatar_user_id(name) = auth.uid()
        or public.is_admin()
      )
    )
  );

