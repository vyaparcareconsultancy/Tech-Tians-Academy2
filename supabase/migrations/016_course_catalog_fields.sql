-- =============================================================================
-- Migration 016: Course catalog fields for the technology course list
-- =============================================================================
-- duration_months   : course length shown to students ("6 Months")
-- market_price_min  : lower end of the typical market price (INR), display only
-- market_price_max  : upper end of the typical market price (INR), display only
-- The amount a student pays is still courses.price.

alter table public.courses
  add column if not exists duration_months integer check (duration_months is null or duration_months > 0),
  add column if not exists market_price_min integer check (market_price_min is null or market_price_min >= 0),
  add column if not exists market_price_max integer check (market_price_max is null or market_price_max >= 0);

alter table public.courses drop constraint if exists courses_market_price_range_check;
alter table public.courses add constraint courses_market_price_range_check
  check (market_price_min is null or market_price_max is null or market_price_min <= market_price_max);
