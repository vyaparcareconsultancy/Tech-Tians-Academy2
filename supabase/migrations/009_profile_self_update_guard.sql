-- =============================================================================
-- Migration 009: Lock sensitive profile columns for every non-admin user.
--
-- 008 added a trigger that stops TEACHERS from changing role/status/rating/email
-- on their own profile. Students were not covered: a suspended student could
-- update their own row and set status = 'active' again.
--
-- This replaces the trigger function so that any signed-in non-admin editing
-- their own profile cannot change: role, status, rating, email, approved_at,
-- applied_at or id. Normal fields (name, phone, bio, city, grade, qualification,
-- subject) stay editable. Admins and server code (service role, triggers with
-- no auth.uid()) are not affected.
-- =============================================================================

create or replace function public.enforce_teacher_profile_columns() returns trigger as $$
begin
  if auth.uid() is not null and auth.uid() = old.id and not public.is_admin() then
    if new.id <> old.id
       or new.role <> old.role
       or new.status <> old.status
       or new.rating is distinct from old.rating
       or new.email <> old.email
       or new.approved_at is distinct from old.approved_at
       or new.applied_at is distinct from old.applied_at then
      raise exception 'You may not change role, status, rating, email or approval fields on your own profile';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_enforce_teacher_profile on public.profiles;
create trigger trg_enforce_teacher_profile
  before update on public.profiles
  for each row execute function public.enforce_teacher_profile_columns();
