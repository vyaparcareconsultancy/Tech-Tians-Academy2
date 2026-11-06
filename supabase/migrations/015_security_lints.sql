-- =============================================================================
-- Migration 015: Fixes from the Supabase Security Advisor
-- =============================================================================
-- 1. Trigger functions can never be called by clients.
-- 2. Logged-out visitors (anon) can no longer call RPCs that need a login.
--    RLS helper functions and verify_certificate stay callable because
--    policies and the public /verify page need them.
-- 3. request_refund now checks that the caller is an admin or owns the order.
-- 4. Removed two "always true" UPDATE policies on orders/payments. They already
--    blocked every update (WITH CHECK false); with no UPDATE policy at all,
--    RLS still blocks every client update.
-- 5. Avatars bucket: files stay public by URL, but clients can no longer list
--    every file in the bucket.

-- ---------------------------------------------------------------------------
-- 1. Trigger functions
-- ---------------------------------------------------------------------------
revoke execute on function public.block_notification_column_changes() from public, anon, authenticated;
revoke execute on function public.enforce_teacher_profile_columns()   from public, anon, authenticated;
revoke execute on function public.handle_new_user()                   from public, anon, authenticated;
revoke execute on function public.log_audit_event()                   from public, anon, authenticated;
revoke execute on function public.notify_announcement()               from public, anon, authenticated;
revoke execute on function public.notify_live_class_change()          from public, anon, authenticated;
revoke execute on function public.notify_order_paid()                 from public, anon, authenticated;
revoke execute on function public.notify_submission_graded()          from public, anon, authenticated;
revoke execute on function public.sync_course_teacher()               from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. RPCs that require a signed-in user: remove anon access
-- ---------------------------------------------------------------------------
revoke execute on function public.get_admin_dashboard_kpis()                    from public, anon;
revoke execute on function public.get_course_performance()                      from public, anon;
revoke execute on function public.get_monthly_metrics(integer)                  from public, anon;
revoke execute on function public.get_progress_distribution()                   from public, anon;
revoke execute on function public.get_teacher_leaderboard()                     from public, anon;
revoke execute on function public.get_quiz_questions(uuid)                      from public, anon;
revoke execute on function public.list_student_quizzes()                        from public, anon;
revoke execute on function public.start_quiz(uuid)                              from public, anon;
revoke execute on function public.submit_quiz(uuid, jsonb)                      from public, anon;
revoke execute on function public.request_refund(text, text)                    from public, anon;
revoke execute on function public.update_teacher_profile(text, text, text, text) from public, anon;
revoke execute on function public.upsert_attendance(uuid, uuid, date, text)     from public, anon;
revoke execute on function public.issue_certificate(uuid)                       from public, anon;

grant execute on function public.get_admin_dashboard_kpis()                    to authenticated;
grant execute on function public.get_course_performance()                      to authenticated;
grant execute on function public.get_monthly_metrics(integer)                  to authenticated;
grant execute on function public.get_progress_distribution()                   to authenticated;
grant execute on function public.get_teacher_leaderboard()                     to authenticated;
grant execute on function public.get_quiz_questions(uuid)                      to authenticated;
grant execute on function public.list_student_quizzes()                        to authenticated;
grant execute on function public.start_quiz(uuid)                              to authenticated;
grant execute on function public.submit_quiz(uuid, jsonb)                      to authenticated;
grant execute on function public.request_refund(text, text)                    to authenticated;
grant execute on function public.update_teacher_profile(text, text, text, text) to authenticated;
grant execute on function public.upsert_attendance(uuid, uuid, date, text)     to authenticated;
grant execute on function public.issue_certificate(uuid)                       to authenticated;

-- ---------------------------------------------------------------------------
-- 3. request_refund: only an admin, or the student who paid for the order
-- ---------------------------------------------------------------------------
create or replace function public.request_refund(p_order_id text, p_reason text) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  if p_order_id is null or length(trim(p_order_id)) = 0 then
    raise exception 'order id is required';
  end if;

  select * into v_order
  from public.orders o
  where o.order_id = p_order_id or o.id::text = p_order_id
  limit 1;

  if not found then
    raise exception 'Order not found';
  end if;

  if not (public.is_admin() or v_order.student_id = auth.uid()) then
    raise exception 'Not allowed to request a refund for this order';
  end if;

  if v_order.status <> 'paid' then
    raise exception 'Only paid orders can be refunded';
  end if;

  -- Ignore duplicate requests for the same order.
  if exists (
    select 1 from public.audit_logs
    where action = 'payment.refund_requested' and entity = 'orders' and entity_id = v_order.order_id
  ) then
    return;
  end if;

  insert into public.audit_logs (actor_id, actor_name, action, entity, entity_id, details)
  values (
    auth.uid(),
    (select full_name from public.profiles where id = auth.uid()),
    'payment.refund_requested',
    'orders',
    v_order.order_id,
    left(coalesce(p_reason, ''), 500)
  );
end;
$$;

revoke execute on function public.request_refund(text, text) from public, anon;
grant execute on function public.request_refund(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Always-true UPDATE policies (no client may update these tables)
-- ---------------------------------------------------------------------------
drop policy if exists "orders: no client updates (webhooks only)" on public.orders;
drop policy if exists "payments: verified flag server-only" on public.payments;

-- ---------------------------------------------------------------------------
-- 5. Avatars: no public listing; owners and admins can still read their files
-- ---------------------------------------------------------------------------
drop policy if exists "avatars: public read access" on storage.objects;

create policy "avatars: owner or admin read"
  on storage.objects for select
  using (
    bucket_id = 'avatars'
    and auth.uid() is not null
    and (public.extract_avatar_user_id(name) = auth.uid() or public.is_admin())
  );
