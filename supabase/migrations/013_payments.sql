-- =============================================================================
-- Migration 013: Payments & Orders Gateway Enhancements
-- =============================================================================

-- 1. Extend orders table with gateway identifiers and cohort batch assignment
alter table public.orders add column if not exists gateway_order_id text;
alter table public.orders add column if not exists batch_id uuid references public.batches(id) on delete set null;

create index if not exists idx_orders_gateway_order_id on public.orders(gateway_order_id);
create index if not exists idx_orders_batch_id on public.orders(batch_id);

-- 2. Update orders status check constraint to include 'created'
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('created', 'pending', 'paid', 'failed', 'refunded'));

-- 3. Unique index on payments.txn_id (where txn_id is not null)
create unique index if not exists idx_payments_txn_id on public.payments(txn_id) where txn_id is not null;

-- 4. Optional course restriction on coupons
alter table public.coupons add column if not exists course_id uuid references public.courses(id) on delete set null;

-- 5. Drop legacy function signatures for verify_payment
drop function if exists public.verify_payment(text, text, text, integer);
drop function if exists public.verify_payment(text, text, text, numeric);

-- 6. Idempotent server-side payment verification
create or replace function public.verify_payment(
  p_order_id text,
  p_gateway text,
  p_txn_id text,
  p_amount numeric
) returns void as $$
declare
  o record;
  v_already_paid boolean;
begin
  -- Match by internal order_id, gateway_order_id, or primary key id
  select * into o from public.orders
  where order_id = p_order_id
     or gateway_order_id = p_order_id
     or id::text = p_order_id
  limit 1;

  if not found then
    raise exception 'order not found: %', p_order_id;
  end if;

  -- Validate amount strictly: orders.amount is in rupees, gateways report paise.
  -- (Free orders: amount 0 and p_amount 0.) Anything else is rejected.
  if (o.amount * 100) <> p_amount then
    raise exception 'amount mismatch: gateway % paise vs order % rupees', p_amount, o.amount;
  end if;

  v_already_paid := (o.status = 'paid');

  -- If not yet paid, mark paid and increment coupon
  if not v_already_paid then
    update public.orders set status = 'paid' where id = o.id;

    if o.coupon_code is not null and length(trim(o.coupon_code)) > 0 then
      update public.coupons
      set used_count = used_count + 1
      where lower(trim(code)) = lower(trim(o.coupon_code));
    end if;
  end if;

  -- Idempotently upsert payments record
  insert into public.payments (order_id, amount, status, gateway, txn_id, verified, paid_at)
  values (o.id, o.amount, 'success', p_gateway, p_txn_id, true, now())
  on conflict (order_id) do update
    set status = 'success',
        verified = true,
        gateway = excluded.gateway,
        txn_id = coalesce(excluded.txn_id, public.payments.txn_id),
        paid_at = coalesce(public.payments.paid_at, now());

  -- Idempotently activate course enrollment for student
  insert into public.enrollments (student_id, course_id, batch_id, status, source, amount_paid, enrolled_at)
  values (
    o.student_id,
    o.course_id,
    o.batch_id,
    'active',
    case when o.coupon_code is not null and length(trim(o.coupon_code)) > 0 then 'coupon' else 'direct' end,
    o.amount,
    now()
  )
  on conflict (student_id, course_id) do update
    set status = 'active',
        batch_id = coalesce(excluded.batch_id, public.enrollments.batch_id),
        amount_paid = excluded.amount_paid;

  -- Idempotently enroll student into cohort batch if assigned
  if o.batch_id is not null then
    insert into public.batch_students (batch_id, student_id, status, enrolled_at)
    values (o.batch_id, o.student_id, 'active', now())
    on conflict (batch_id, student_id) do update
      set status = 'active';
  end if;

  -- Audit log entry
  if not v_already_paid then
    insert into public.audit_logs (actor_id, actor_name, action, entity, entity_id, details)
    values (
      null,
      'gateway:' || p_gateway,
      'payment.verified',
      'payments',
      o.id::text,
      format('Verified payment %s for order %s (%s INR)', coalesce(p_txn_id, 'none'), o.order_id, o.amount)
    );
  end if;
end;
$$ language plpgsql security definer set search_path = public;

-- Revoke execute from public/anon/authenticated and grant strictly to service_role
revoke execute on function public.verify_payment(text, text, text, numeric) from public, anon, authenticated;
grant execute on function public.verify_payment(text, text, text, numeric) to service_role;

