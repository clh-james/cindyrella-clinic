-- Admins need to insert/update rows in `staff` from the dashboard.
-- (Reads were already covered by "staff read staff" in 0001.)

create function is_admin() returns boolean
  language sql stable security definer as $$
    select exists (
      select 1 from staff where id = auth.uid() and role = 'admin' and is_active = true
    );
  $$;

create policy "admins manage staff" on staff
  for all using (is_admin()) with check (is_admin());
