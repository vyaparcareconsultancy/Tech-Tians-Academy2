-- =============================================================================
-- Migration 007: Fix "infinite recursion detected in policy" on batches /
-- batch_students.
--
-- Cause: the SELECT policy on batches queried batch_students, and the SELECT
-- policy on batch_students queried batches. Postgres evaluates each table's RLS
-- inside the other's policy, so the two policies recurse forever.
--
-- Fix: move the cross-table checks into SECURITY DEFINER helper functions.
-- They run with the owner's rights, so their inner query does not trigger RLS
-- again, which breaks the cycle. Access rules stay the same:
--   batches        : admin, teachers, and students who are members of the batch
--   batch_students : the student themself, admin, and the batch's teacher
--                    (assigned teacher or a teacher who owns the course)
-- =============================================================================

create or replace function public.is_batch_member(p_batch_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.batch_students bs
    where bs.batch_id = p_batch_id and bs.student_id = auth.uid()
  );
$$ language sql stable security definer set search_path = public;

create or replace function public.teaches_batch(p_batch_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.batches b
    where b.id = p_batch_id
      and (b.teacher_id = auth.uid() or public.owns_course(b.course_id))
  );
$$ language sql stable security definer set search_path = public;

revoke all on function public.is_batch_member(uuid) from public;
revoke all on function public.teaches_batch(uuid) from public;
grant execute on function public.is_batch_member(uuid) to authenticated;
grant execute on function public.teaches_batch(uuid) to authenticated;

drop policy if exists "batches: visible to staff and enrolled students" on public.batches;
create policy "batches: visible to staff and enrolled students"
  on public.batches for select using (
    public.is_admin()
    or public.is_teacher()
    or public.is_batch_member(id)
  );

drop policy if exists "batch_students: read own and own-batch membership" on public.batch_students;
create policy "batch_students: read own and own-batch membership"
  on public.batch_students for select using (
    auth.uid() = student_id
    or public.is_admin()
    or (public.is_teacher() and public.teaches_batch(batch_id))
  );
