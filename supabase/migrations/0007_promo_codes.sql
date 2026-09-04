-- Create promo_codes table
create table if not exists promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  discount_type text not null check (discount_type in ('fixed', 'percentage')),
  discount_value integer not null, -- If fixed, amount in pesos. If percentage, 1-100.
  valid_until timestamptz,
  max_uses integer,
  current_uses integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Add applied_promo_code to appointments
alter table appointments add column applied_promo_code uuid references promo_codes(id) on delete set null;

-- Add RLS for promo_codes
alter table promo_codes enable row level security;

-- Public can read active promo codes (to apply them at checkout)
create policy "public read active promo codes" on promo_codes
  for select using (is_active = true);

-- Staff can manage promo codes
create policy "staff manage promo codes" on promo_codes
  for all using (is_staff()) with check (is_staff());
