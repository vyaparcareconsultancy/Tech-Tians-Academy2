-- =============================================================================
-- Demo staff seed — run AFTER creating auth users in the Supabase dashboard.
-- Roles are granted by an administrator here; users can never self-assign.
-- Replace <user-uuid> with the auth.users.id of each account.
-- =============================================================================

-- Admin
insert into public.profiles (id, full_name, email, role, status, approved_at)
values ('<admin-user-uuid>', 'Aarav Sharma', 'admin@techtians.academy', 'admin', 'active', now());

-- Teacher (must exist as an auth user first)
insert into public.profiles (id, full_name, email, role, subject, qualification, status, approved_at)
values ('<teacher-user-uuid>', 'Dr. Meera Rao', 'meera.rao@techtians.academy', 'teacher', 'Physics', 'Ph.D. Physics, IIT Delhi', 'active', now());
