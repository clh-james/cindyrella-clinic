-- Add loyalty points and auth linkage to customers
alter table customers add column auth_id uuid references auth.users(id) on delete set null;
alter table customers add column loyalty_points integer not null default 0;

create index if not exists customers_auth_id_idx on customers(auth_id);

-- Add RLS policies for authenticated customers
create policy "customers can read own record" on customers
  for select using (auth.uid() = auth_id);

create policy "customers can update own record" on customers
  for update using (auth.uid() = auth_id);

create policy "customers can see own appointments" on appointments
  for select using (
    customer_id in (select id from customers where auth_id = auth.uid())
  );
