-- ==============================================================================
-- PHASE 2: RBAC RLS UPDATES
-- ==============================================================================

-- 1. POS Sales Policies
drop policy if exists "staff manage pos sales" on pos_sales;
create policy "pos_sales_read" on pos_sales
  for select using (has_permission(auth.uid(), 'pos.view'));
create policy "pos_sales_insert" on pos_sales
  for insert with check (has_permission(auth.uid(), 'pos.create_sale'));
-- Usually sales records shouldn't be edited/deleted directly by cashiers, only super admin
create policy "pos_sales_update" on pos_sales
  for update using (has_permission(auth.uid(), 'pos.create_sale'));
create policy "pos_sales_delete" on pos_sales
  for delete using (has_permission(auth.uid(), 'payments.void'));

-- 2. POS Sale Items Policies
drop policy if exists "staff manage pos sale items" on pos_sale_items;
create policy "pos_sale_items_read" on pos_sale_items
  for select using (has_permission(auth.uid(), 'pos.view'));
create policy "pos_sale_items_insert" on pos_sale_items
  for insert with check (has_permission(auth.uid(), 'pos.create_sale'));
create policy "pos_sale_items_update" on pos_sale_items
  for update using (has_permission(auth.uid(), 'pos.create_sale'));
create policy "pos_sale_items_delete" on pos_sale_items
  for delete using (has_permission(auth.uid(), 'payments.void'));

-- 3. Inventory Policies
drop policy if exists "staff manage inventory" on inventory_items;
create policy "inventory_read" on inventory_items
  for select using (true); -- Public/Staff can read
create policy "inventory_insert" on inventory_items
  for insert with check (has_permission(auth.uid(), 'inventory.create'));
create policy "inventory_update" on inventory_items
  for update using (has_permission(auth.uid(), 'inventory.edit') or has_permission(auth.uid(), 'inventory.adjust'));
create policy "inventory_delete" on inventory_items
  for delete using (has_permission(auth.uid(), 'inventory.delete'));

-- 4. Staff Policies
drop policy if exists "staff read staff" on staff;
drop policy if exists "staff manage staff" on staff;
create policy "staff_read" on staff
  for select using (has_permission(auth.uid(), 'staff.view'));
create policy "staff_insert" on staff
  for insert with check (has_permission(auth.uid(), 'staff.create'));
create policy "staff_update" on staff
  for update using (has_permission(auth.uid(), 'staff.edit'));
create policy "staff_delete" on staff
  for delete using (has_permission(auth.uid(), 'staff.delete'));
