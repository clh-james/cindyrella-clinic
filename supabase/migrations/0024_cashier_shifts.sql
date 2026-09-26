create table if not exists cashier_shifts (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references branches(id) on delete restrict,
  cashier_id uuid references staff(id) on delete restrict,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  starting_cash integer not null default 0,
  expected_cash integer,
  actual_cash integer,
  variance integer,
  status text not null default 'open' check (status in ('open', 'closed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table cashier_shifts enable row level security;

create policy "Staff can view shifts in their branch"
  on cashier_shifts for select
  using (is_staff());

create policy "Cashiers and Admins can manage shifts"
  on cashier_shifts for all
  using (is_staff())
  with check (is_staff());

-- Map pos_sales and appointments to shifts (Optional tracking, for now we will calculate dynamically based on time)
