-- =============================================================================
-- Migration 006: Reports, KPI Aggregates & Admin DB Persistence Fixes
--
-- 1. (removed) profiles stays linked to auth.users; invites use an Edge Function.
-- 2. Adds created_by to announcements for direct tracking.
-- 3. Adds SQL functions / RPCs for heavy dashboard & reports aggregates:
--    - get_admin_dashboard_kpis()
--    - get_monthly_metrics(p_months int)
--    - get_course_performance()
--    - get_progress_distribution()
--    - get_teacher_leaderboard()
-- 4. Ensures request_refund RPC is accessible to authenticated admin users.
-- =============================================================================

-- 1. (removed) Profiles must stay linked to auth.users via profiles_id_fkey.
--    Staff invites go through the invite-staff Edge Function (Step 8), which
--    creates the auth user first; the signup trigger then creates the profile.

-- 2. Announcements created_by column compatibility (column already exists in 001)
alter table public.announcements
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

-- 3. Heavy KPI Aggregate: Admin Dashboard
create or replace function public.get_admin_dashboard_kpis()
returns jsonb as $$
declare
  v_total_students bigint;
  v_total_teachers bigint;
  v_total_courses bigint;
  v_active_batches bigint;
  v_total_enrollments bigint;
  v_total_revenue numeric;
  v_pending_teachers bigint;
  v_upcoming_classes bigint;
  v_cur_month_rev numeric;
  v_prev_month_rev numeric;
  v_rev_delta integer;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized: admin role required';
  end if;

  select count(*) into v_total_students from public.profiles where role = 'student';
  select count(*) into v_total_teachers from public.profiles where role = 'teacher';
  select count(*) into v_total_courses from public.courses;
  select count(*) into v_active_batches from public.batches where status = 'active';
  select count(*) into v_total_enrollments from public.enrollments;

  select coalesce(sum(amount), 0) into v_total_revenue
  from public.payments
  where verified = true;

  if v_total_revenue = 0 then
    select coalesce(sum(amount), 0) into v_total_revenue
    from public.orders
    where status = 'paid';
  end if;

  select count(*) into v_pending_teachers from public.profiles where role = 'teacher' and status = 'pending';
  select count(*) into v_upcoming_classes from public.live_classes where status in ('upcoming', 'live');

  -- Monthly delta comparison
  select coalesce(sum(amount), 0) into v_cur_month_rev
  from public.orders
  where status = 'paid' and created_at >= date_trunc('month', now());

  select coalesce(sum(amount), 0) into v_prev_month_rev
  from public.orders
  where status = 'paid'
    and created_at >= date_trunc('month', now() - interval '1 month')
    and created_at < date_trunc('month', now());

  if v_prev_month_rev > 0 then
    v_rev_delta := round(((v_cur_month_rev - v_prev_month_rev) / v_prev_month_rev) * 100);
  else
    v_rev_delta := 0;
  end if;

  return jsonb_build_object(
    'total_students', v_total_students,
    'total_teachers', v_total_teachers,
    'total_courses', v_total_courses,
    'active_batches', v_active_batches,
    'total_enrollments', v_total_enrollments,
    'total_revenue', v_total_revenue,
    'pending_count', v_pending_teachers,
    'upcoming_count', v_upcoming_classes,
    'rev_delta', v_rev_delta
  );
end;
$$ language plpgsql security definer set search_path = public;

-- 4. Heavy Monthly Series Aggregate: Reports & Dashboard
create or replace function public.get_monthly_metrics(p_months integer default 12)
returns table (
  month text,
  month_label text,
  revenue numeric,
  enrollments bigint
) as $$
begin
  if not public.is_admin() then
    raise exception 'Unauthorized: admin role required';
  end if;

  return query
  with months as (
    select
      to_char(m, 'YYYY-MM') as m_key,
      to_char(m, 'Mon YY') as m_lbl,
      m as m_start,
      (m + interval '1 month') as m_end
    from generate_series(
      date_trunc('month', now()) - ((greatest(p_months, 1) - 1) || ' months')::interval,
      date_trunc('month', now()),
      interval '1 month'
    ) as m
  )
  select
    m.m_key as month,
    m.m_lbl as month_label,
    coalesce(sum(case when o.status = 'paid' then o.amount else 0 end), 0)::numeric as revenue,
    count(distinct e.id)::bigint as enrollments
  from months m
  left join public.orders o on o.created_at >= m.m_start and o.created_at < m.m_end
  left join public.enrollments e on e.enrolled_at >= m.m_start and e.enrolled_at < m.m_end
  group by m.m_key, m.m_lbl, m.m_start
  order by m.m_start asc;
end;
$$ language plpgsql security definer set search_path = public;

-- 5. Course Performance Aggregate: Reports & Dashboard
create or replace function public.get_course_performance()
returns table (
  course_id uuid,
  title text,
  enrollments_count bigint,
  total_revenue numeric,
  avg_progress numeric
) as $$
begin
  if not public.is_admin() then
    raise exception 'Unauthorized: admin role required';
  end if;

  return query
  select
    c.id as course_id,
    c.title,
    count(distinct e.id)::bigint as enrollments_count,
    coalesce(sum(case when o.status = 'paid' then o.amount else 0 end), 0)::numeric as total_revenue,
    coalesce(round(avg(e.progress_pct)), 0)::numeric as avg_progress
  from public.courses c
  left join public.enrollments e on e.course_id = c.id
  left join public.orders o on o.course_id = c.id
  where c.status = 'published'
  group by c.id, c.title
  order by total_revenue desc;
end;
$$ language plpgsql security definer set search_path = public;

-- 6. Student Progress Distribution Aggregate: Reports
create or replace function public.get_progress_distribution()
returns table (
  band text,
  value bigint
) as $$
begin
  if not public.is_admin() then
    raise exception 'Unauthorized: admin role required';
  end if;

  return query
  with categorized as (
    select
      case
        when coalesce(progress_pct, 0) = 0 then 'Not started'
        when progress_pct > 0 and progress_pct < 25 then '0–25%'
        when progress_pct >= 25 and progress_pct < 50 then '25–50%'
        when progress_pct >= 50 and progress_pct < 75 then '50–75%'
        when progress_pct >= 75 and progress_pct < 100 then '75–100%'
        else 'Completed'
      end as b_name
    from public.enrollments
  ),
  bands as (
    select unnest(array['Not started', '0–25%', '25–50%', '50–75%', '75–100%', 'Completed']) as b_name,
           generate_series(1, 6) as ord
  )
  select
    b.b_name as band,
    count(c.b_name)::bigint as value
  from bands b
  left join categorized c on c.b_name = b.b_name
  group by b.b_name, b.ord
  order by b.ord;
end;
$$ language plpgsql security definer set search_path = public;

-- 7. Teacher Leaderboard Aggregate: Reports
create or replace function public.get_teacher_leaderboard()
returns table (
  teacher_id uuid,
  name text,
  subject text,
  rating numeric,
  students_count bigint,
  total_revenue numeric
) as $$
begin
  if not public.is_admin() then
    raise exception 'Unauthorized: admin role required';
  end if;

  return query
  with teacher_courses_map as (
    select distinct tc.teacher_id, tc.course_id
    from public.teacher_courses tc
    union
    select c.teacher_id, c.id as course_id
    from public.courses c
    where c.teacher_id is not null
  )
  select
    p.id as teacher_id,
    p.full_name as name,
    coalesce(p.subject, '') as subject,
    coalesce(p.rating, 0)::numeric as rating,
    count(distinct e.student_id)::bigint as students_count,
    coalesce(sum(case when o.status = 'paid' then o.amount else 0 end), 0)::numeric as total_revenue
  from public.profiles p
  left join teacher_courses_map tcm on tcm.teacher_id = p.id
  left join public.enrollments e on e.course_id = tcm.course_id
  left join public.orders o on o.course_id = tcm.course_id
  where p.role = 'teacher' and p.status = 'active'
  group by p.id, p.full_name, p.subject, p.rating
  order by total_revenue desc;
end;
$$ language plpgsql security definer set search_path = public;

-- 8. Explicit Permissions
grant execute on function public.get_admin_dashboard_kpis() to authenticated;
grant execute on function public.get_monthly_metrics(integer) to authenticated;
grant execute on function public.get_course_performance() to authenticated;
grant execute on function public.get_progress_distribution() to authenticated;
grant execute on function public.get_teacher_leaderboard() to authenticated;
grant execute on function public.request_refund(text, text) to authenticated;
