-- ==============================================================================
-- PHASE 2.2: FIX STAFF SELF-READ POLICY
-- ==============================================================================

-- A user must always be able to read their own staff profile to log in!
create policy "staff_read_self" on staff
  for select using (id = auth.uid());
