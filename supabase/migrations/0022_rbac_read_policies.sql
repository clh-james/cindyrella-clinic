-- ==============================================================================
-- PHASE 2.1: RBAC READ POLICIES
-- ==============================================================================

-- Allow authenticated users to read roles
create policy "roles_read" on roles
  for select to authenticated using (true);

-- Allow authenticated users to read permissions
create policy "permissions_read" on permissions
  for select to authenticated using (true);

-- Allow authenticated users to read role_permissions
create policy "role_permissions_read" on role_permissions
  for select to authenticated using (true);
