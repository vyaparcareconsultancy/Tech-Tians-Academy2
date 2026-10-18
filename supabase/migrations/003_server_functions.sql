-- =============================================================================
-- Server-side helpers (call via Supabase Edge Functions / service role only)
-- =============================================================================

-- Signed webhook verification happens in the Edge Function with the gateway's
-- secret. The function then marks the payment verified through this procedure.
-- Client apps can NEVER set verified = true (payments UPDATE policy = false).
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
  update public.orders set status = 'paid' where id = o.id;
  insert into public.payments (order_id, amount, status, gateway, txn_id, verified, paid_at)
  values (o.id, p_amount, 'success', p_gateway, p_txn_id, true, now())
  on conflict (order_id) do update
    set status = 'success', verified = true, txn_id = p_txn_id, paid_at = now();

  insert into public.audit_logs (actor_id, actor_name, action, entity, entity_id, details)
  values (null, 'gateway:' || p_gateway, 'payment.verified', 'payments', o.id::text,
          format('Verified payment %s for order %s (%s)', p_txn_id, p_order_id, p_amount));
end;
$$ language plpgsql security definer;

-- Refund request — two-step authorized process (request → finance approval).
create or replace function public.request_refund(p_order_id text, p_reason text) returns void as $$
begin
  insert into public.audit_logs (actor_id, actor_name, action, entity, entity_id, details)
  values (auth.uid(), (select full_name from public.profiles where id = auth.uid()),
          'payment.refund_requested', 'orders', p_order_id, p_reason);
  -- Finance team approves out-of-band, then runs:
  -- update orders set status='refunded' where order_id = ...; via service role
end;
$$ language plpgsql security definer;

-- Automatic audit trigger for administrative mutations
create or replace function public.log_audit_event() returns trigger as $$
begin
  insert into public.audit_logs (actor_id, actor_name, action, entity, entity_id, details)
  values (
    auth.uid(),
    (select full_name || ' (' || initcap(role) || ')' from public.profiles where id = auth.uid()),
    tg_table_name || '.' || tg_op,
    tg_table_name,
    (coalesce(new.id, old.id::text))::text,
    row_to_json(new)::text
  );
  return new;
end;
$$ language plpgsql security definer;

-- Example wiring (enable per table as needed):
-- create trigger trg_courses_audit after insert or update or delete on public.courses
--   for each row execute function public.log_audit_event();

-- On signup, create a profile with the default role 'student'. Staff roles are
-- promoted exclusively by admins (never self-assigned).
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), new.email, 'student');
  return new;
end;
$$ language plpgsql security definer;

-- enable in the dashboard:
-- create trigger on_auth_user_created after insert on auth.users
--   for each row execute function public.handle_new_user();
