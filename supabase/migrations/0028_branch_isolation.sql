-- 1. Add branch_id to pos_sales
alter table pos_sales add column if not exists branch_id uuid references branches(id) on delete set null;

-- Try to backfill branch_id for existing sales based on the creator's branch
update pos_sales ps
set branch_id = s.branch_id
from staff s
where ps.created_by = s.id and ps.branch_id is null;

-- Helper function to check if a user is a super admin
create or replace function is_super_admin()
returns boolean as $$
declare
  v_role text;
begin
  select r.name into v_role
  from staff s
  join roles r on s.role_id = r.id
  where s.id = auth.uid();
  
  return coalesce(v_role = 'super_admin', false);
end;
$$ language plpgsql security definer;

-- Helper function to check if a user is staff
create or replace function is_staff()
returns boolean as $$
begin
  return exists (select 1 from staff where id = auth.uid());
end;
$$ language plpgsql security definer;

-- 2. Strict Branch Isolation for pos_sales
drop policy if exists "pos_sales_read" on pos_sales;
create policy "pos_sales_read" on pos_sales
  for select using (
    has_permission(auth.uid(), 'pos.view') AND
    (
      is_super_admin() OR
      branch_id = (select branch_id from staff where id = auth.uid()) OR
      branch_id is null
    )
  );

-- 3. Strict Branch Isolation for appointments
drop policy if exists "appointments_read" on appointments;
create policy "appointments_read" on appointments
  for select using (
    has_permission(auth.uid(), 'appointments.view') AND
    (
      is_super_admin() OR
      branch_id = (select branch_id from staff where id = auth.uid())
    )
  );

-- 4. Strict Branch Isolation for cashier_shifts
drop policy if exists "Staff can view shifts in their branch" on cashier_shifts;
create policy "Staff can view shifts in their branch" on cashier_shifts
  for select using (
    is_staff() AND
    (
      is_super_admin() OR
      branch_id = (select branch_id from staff where id = auth.uid())
    )
  );
