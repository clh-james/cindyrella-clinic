-- Cindyrella Medical Group — core schema
-- Run in the Supabase SQL editor, or via `supabase db push`.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------------

create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists treatments (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  badge text,
  session_price integer not null,          -- centavos-free PHP whole pesos
  five_plus_one_price integer not null,
  ten_plus_two_price integer not null,
  primary_desc text not null,
  secondary_desc text not null,
  best_for text not null,
  duration_minutes integer not null default 30,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Staff / roles (admin dashboard, phase 2)
-- ---------------------------------------------------------------------------

create type staff_role as enum ('admin', 'receptionist', 'nurse', 'doctor');

create table if not exists staff (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role staff_role not null,
  branch_id uuid references branches (id),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  birthday date,
  gender text,
  phone text not null,
  email text not null,
  address text,
  medical_conditions text,
  allergies text,
  is_pregnant boolean,
  emergency_contact text,
  created_at timestamptz not null default now()
);

create index if not exists customers_email_idx on customers (email);

-- ---------------------------------------------------------------------------
-- Availability (per-branch daily capacity + blocked dates)
-- ---------------------------------------------------------------------------

create table if not exists blocked_dates (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branches (id),   -- null = applies to all branches
  blocked_date date not null,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists branch_settings (
  branch_id uuid primary key references branches (id) on delete cascade,
  max_bookings_per_slot integer not null default 3,
  time_slots text[] not null default array['9AM','10AM','11AM','1PM','2PM','3PM','4PM','5PM']
);

-- ---------------------------------------------------------------------------
-- Appointments
-- ---------------------------------------------------------------------------

create type appointment_status as enum (
  'pending', 'confirmed', 'completed', 'cancelled', 'no_show'
);

create type payment_method as enum ('gcash', 'bank_transfer', 'cash', 'credit_card');
create type payment_status as enum ('pending', 'paid', 'refunded', 'failed');

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  reference_number text unique not null,
  customer_id uuid not null references customers (id),
  treatment_id uuid not null references treatments (id),
  branch_id uuid not null references branches (id),
  appointment_date date not null,
  appointment_time text not null,
  status appointment_status not null default 'pending',
  payment_method payment_method not null,
  payment_status payment_status not null default 'pending',
  amount_due integer not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists appointments_date_branch_idx
  on appointments (branch_id, appointment_date, appointment_time);

create index if not exists appointments_reference_idx
  on appointments (reference_number);

-- Prevents double-booking the same slot at the same branch beyond capacity
-- (enforced in application code against branch_settings.max_bookings_per_slot;
-- this index just makes the capacity check fast).

-- ---------------------------------------------------------------------------
-- Payments log (supports partial deposits, refunds)
-- ---------------------------------------------------------------------------

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments (id) on delete cascade,
  amount integer not null,
  method payment_method not null,
  status payment_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table branches enable row level security;
alter table treatments enable row level security;
alter table staff enable row level security;
alter table customers enable row level security;
alter table blocked_dates enable row level security;
alter table branch_settings enable row level security;
alter table appointments enable row level security;
alter table payments enable row level security;

-- Public (anon) can read active branches/treatments to build the booking UI.
create policy "public read active branches" on branches
  for select using (is_active = true);

create policy "public read active treatments" on treatments
  for select using (is_active = true);

create policy "public read blocked dates" on blocked_dates
  for select using (true);

create policy "public read branch settings" on branch_settings
  for select using (true);

-- Public can create a customer record and an appointment (guest booking).
-- They cannot read back other people's rows.
create policy "public can insert customers" on customers
  for insert with check (true);

create policy "public can insert appointments" on appointments
  for insert with check (true);

create policy "public can insert payments" on payments
  for insert with check (true);

-- Staff (any authenticated row in `staff`) can read/manage everything.
-- This keeps phase-2 admin dashboard access simple: one helper predicate.
create function is_staff() returns boolean
  language sql stable security definer as $$
    select exists (select 1 from staff where id = auth.uid() and is_active = true);
  $$;

create policy "staff full access branches" on branches
  for all using (is_staff()) with check (is_staff());
create policy "staff full access treatments" on treatments
  for all using (is_staff()) with check (is_staff());
create policy "staff full access customers" on customers
  for select using (is_staff());
create policy "staff full access appointments" on appointments
  for all using (is_staff()) with check (is_staff());
create policy "staff full access payments" on payments
  for all using (is_staff()) with check (is_staff());
create policy "staff manage blocked dates" on blocked_dates
  for all using (is_staff()) with check (is_staff());
create policy "staff manage branch settings" on branch_settings
  for all using (is_staff()) with check (is_staff());
create policy "staff read staff" on staff
  for select using (is_staff());
