-- ==============================================================================
-- CINDYRELLA DRIP INVENTORY MANAGEMENT SYSTEM - UPGRADE MIGRATION
-- Migration: 0034_comprehensive_inventory_system.sql
-- ==============================================================================

-- 1. Create inventory_categories table
CREATE TABLE IF NOT EXISTS inventory_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  code text UNIQUE NOT NULL,
  description text,
  subcategories text[] DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Seed Default Categories (Safe Upsert)
INSERT INTO inventory_categories (name, code, description, subcategories)
VALUES
  ('IV Drip & Infusion Supplies', 'IVS', 'IV bags, infusion sets, tubing, cannulas, and intravenous infusion essentials', ARRAY['IV Bags', 'Infusion Sets', 'Tubing', 'Cannulas', 'Catheters']),
  ('Aesthetic & Treatment Products', 'ATP', 'Approved treatment products, serums, ampoules, peels, and clinical vials', ARRAY['Serums', 'Ampoules', 'Vials', 'Peels', 'Boosters']),
  ('Medical Consumables & PPE', 'MCP', 'Gloves, masks, gauze, cotton, alcohol swabs, syringes, and clinical disposables', ARRAY['Gloves', 'Masks', 'Gauze & Cotton', 'Alcohol Swabs', 'Syringes & Needles', 'Bandages']),
  ('Skincare & Retail Products', 'SKN', 'Cleansers, moisturizers, sunscreen, lotions, and take-home retail products', ARRAY['Cleansers', 'Moisturizers', 'Sunscreen', 'Toners', 'Creams']),
  ('Spa, Nail & Beauty Supplies', 'SNB', 'Nail polish, files, acetone, wax, massage oils, and aesthetic beauty essentials', ARRAY['Nail Care', 'Waxing Supplies', 'Massage Oils', 'Eyelash Supplies', 'Piercing Supplies']),
  ('Cleaning & Sanitation Supplies', 'CLN', 'Disinfectants, detergents, hand soap, trash bags, and clinic sterilizers', ARRAY['Disinfectants', 'Sterilization', 'Detergents', 'Soaps & Sanitizers', 'Trash Bags']),
  ('Office & POS Supplies', 'OPS', 'Receipt rolls, printer paper, labels, pens, and clerical administrative supplies', ARRAY['Receipt Rolls', 'Printer Paper', 'Thermal Labels', 'Office Stationery']),
  ('Equipment & Reusable Tools', 'EQT', 'Treatment machines, reusable instruments, trolleys, autoclave trays, and hardware', ARRAY['Treatment Machines', 'Reusable Tools', 'Trolleys & Trays', 'Applicators'])
ON CONFLICT (name) DO UPDATE SET
  code = EXCLUDED.code,
  description = EXCLUDED.description,
  subcategories = EXCLUDED.subcategories;

-- 3. Create inventory_suppliers table
CREATE TABLE IF NOT EXISTS inventory_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  address text,
  products_supplied text,
  payment_terms text DEFAULT '30 Days Net',
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed initial aesthetic & medical suppliers if not exist
INSERT INTO inventory_suppliers (name, contact_person, phone, email, address, products_supplied, payment_terms)
SELECT v.name, v.contact_person, v.phone, v.email, v.address, v.products_supplied, v.payment_terms
FROM (VALUES
  ('PharmaDerm Aesthetics Philippines', 'Maria Santos', '+63 917 123 4567', 'orders@pharmaderm.ph', 'BGC, Taguig City, Metro Manila', 'IV Vials, Glutathione, Vitamin C, Collagen Drip', '30 Days Net'),
  ('MedSupply Express Phil', 'Dr. Ronald Tan', '+63 928 987 6543', 'sales@medsupply.ph', 'Quezon City, Metro Manila', 'Syringes, Infusion Sets, PNSS 500ml, Cannulas, Alcohol Swabs', '15 Days Net'),
  ('BeautyGlow Essentials Co.', 'Elena Cruz', '+63 905 555 1234', 'info@beautyglow.ph', 'Makati City, Metro Manila', 'Skincare Serums, Face Masks, Eyelash Extensions, Waxing Supplies', 'Cash on Delivery')
) AS v(name, contact_person, phone, email, address, products_supplied, payment_terms)
WHERE NOT EXISTS (SELECT 1 FROM inventory_suppliers s WHERE s.name = v.name);

-- 4. Extend inventory_items with full production metadata
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES inventory_categories(id) ON DELETE SET NULL;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS subcategory text;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS barcode text;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS brand text;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS cost_price integer NOT NULL DEFAULT 0;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS reorder_quantity integer NOT NULL DEFAULT 10;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES inventory_suppliers(id) ON DELETE SET NULL;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS storage_location text;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS batch_number text;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS mfg_date date;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS expiry_date date;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS is_quarantined boolean NOT NULL DEFAULT false;

-- Map legacy text category to new category_id if not already set
UPDATE inventory_items i
SET category_id = (
  CASE 
    WHEN LOWER(i.category) LIKE '%iv%' THEN (SELECT id FROM inventory_categories WHERE code = 'IVS')
    WHEN LOWER(i.category) LIKE '%facial%' OR LOWER(i.category) LIKE '%wart%' OR LOWER(i.category) LIKE '%contouring%' OR LOWER(i.category) LIKE '%whitening%' OR LOWER(i.category) LIKE '%prp%' THEN (SELECT id FROM inventory_categories WHERE code = 'ATP')
    WHEN LOWER(i.category) LIKE '%eyelash%' OR LOWER(i.category) LIKE '%nail%' OR LOWER(i.category) LIKE '%wax%' OR LOWER(i.category) LIKE '%piercing%' THEN (SELECT id FROM inventory_categories WHERE code = 'SNB')
    WHEN LOWER(i.category) LIKE '%cleaning%' OR LOWER(i.category) LIKE '%sanitation%' THEN (SELECT id FROM inventory_categories WHERE code = 'CLN')
    WHEN LOWER(i.category) LIKE '%office%' OR LOWER(i.category) LIKE '%pos%' THEN (SELECT id FROM inventory_categories WHERE code = 'OPS')
    ELSE (SELECT id FROM inventory_categories WHERE code = 'MCP')
  END
)
WHERE category_id IS NULL;

-- 5. Multi-Branch Stock Balances table
CREATE TABLE IF NOT EXISTS inventory_stock_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0,
  low_stock_threshold integer NOT NULL DEFAULT 5,
  reorder_quantity integer NOT NULL DEFAULT 10,
  storage_location text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(item_id, branch_id)
);

-- Initialize stock balance records for all existing items across branches
INSERT INTO inventory_stock_balances (item_id, branch_id, quantity, low_stock_threshold, reorder_quantity)
SELECT 
  i.id AS item_id, 
  b.id AS branch_id,
  CASE 
    -- Allocate current stock to primary branch (or Davao / first branch), 0 for others
    WHEN b.name = 'Davao' THEN i.current_stock 
    ELSE 0 
  END AS quantity,
  i.low_stock_threshold,
  COALESCE(i.reorder_quantity, 10)
FROM inventory_items i
CROSS JOIN branches b
ON CONFLICT (item_id, branch_id) DO NOTHING;

-- 6. Batch & Lot Tracking table (FEFO Support & Medical Safety)
CREATE TABLE IF NOT EXISTS inventory_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  batch_number text NOT NULL,
  initial_quantity integer NOT NULL DEFAULT 0,
  current_quantity integer NOT NULL DEFAULT 0,
  cost_price integer NOT NULL DEFAULT 0,
  mfg_date date,
  expiry_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'quarantined', 'recalled', 'depleted', 'expired')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 7. Full Stock Movement Audit Trail
CREATE TABLE IF NOT EXISTS inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number text UNIQUE NOT NULL,
  item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN (
    'stock_in', 'stock_out', 'adjustment', 'transfer', 
    'wastage', 'expired', 'customer_return', 'supplier_return'
  )),
  quantity integer NOT NULL,
  unit text NOT NULL,
  source_branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  destination_branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  batch_id uuid REFERENCES inventory_batches(id) ON DELETE SET NULL,
  batch_number text,
  previous_quantity integer NOT NULL,
  new_quantity integer NOT NULL,
  reason text NOT NULL,
  notes text,
  reference_id text,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8. Inter-Branch Transfer Workflow
CREATE TABLE IF NOT EXISTS inventory_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number text UNIQUE NOT NULL,
  source_branch_id uuid NOT NULL REFERENCES branches(id),
  destination_branch_id uuid NOT NULL REFERENCES branches(id),
  status text NOT NULL DEFAULT 'requested' CHECK (status IN (
    'requested', 'pending_approval', 'approved', 'dispatched', 'received', 'completed', 'rejected', 'cancelled'
  )),
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  dispatched_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  received_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  discrepancy_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_transfer_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id uuid NOT NULL REFERENCES inventory_transfers(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES inventory_batches(id) ON DELETE SET NULL,
  requested_quantity integer NOT NULL,
  dispatched_quantity integer NOT NULL DEFAULT 0,
  received_quantity integer NOT NULL DEFAULT 0
);

-- 9. Purchase Orders & Vendor Purchasing
CREATE TABLE IF NOT EXISTS inventory_purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text UNIQUE NOT NULL,
  supplier_id uuid NOT NULL REFERENCES inventory_suppliers(id),
  branch_id uuid NOT NULL REFERENCES branches(id),
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date date,
  total_cost integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'ordered', 'partially_received', 'received', 'cancelled'
  )),
  invoice_number text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_po_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES inventory_purchase_orders(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity_ordered integer NOT NULL,
  quantity_received integer NOT NULL DEFAULT 0,
  unit_cost integer NOT NULL DEFAULT 0,
  batch_number text,
  expiry_date date
);

-- 10. Enable Row Level Security (RLS)
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_po_items ENABLE ROW LEVEL SECURITY;

-- 11. Add new RBAC permissions
INSERT INTO permissions (key, name, module) VALUES
  ('inventory.transfer', 'Request and Manage Stock Transfers', 'inventory'),
  ('inventory.transfer_approve', 'Approve Stock Transfers', 'inventory'),
  ('inventory.suppliers', 'Manage Suppliers and Vendor Contacts', 'inventory'),
  ('inventory.purchase_orders', 'Manage Purchase Orders and Receiving', 'inventory'),
  ('inventory.categories', 'Manage Inventory Categories', 'inventory'),
  ('inventory.audit', 'View Valuation, Audit and Wastage Reports', 'inventory')
ON CONFLICT (key) DO NOTHING;

-- Map permissions to roles
DO $$
DECLARE
  v_super_admin_id uuid;
  v_admin_id uuid;
  v_manager_id uuid;
BEGIN
  SELECT id INTO v_super_admin_id FROM roles WHERE name = 'super_admin';
  SELECT id INTO v_admin_id FROM roles WHERE name = 'admin';
  SELECT id INTO v_manager_id FROM roles WHERE name = 'manager';

  IF v_super_admin_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_super_admin_id, id FROM permissions WHERE module = 'inventory'
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_admin_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_admin_id, id FROM permissions WHERE module = 'inventory'
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_manager_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_manager_id, id FROM permissions 
    WHERE key IN ('inventory.view', 'inventory.create', 'inventory.edit', 'inventory.adjust', 'inventory.transfer', 'inventory.purchase_orders', 'inventory.audit')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 12. Policies for Categories & Suppliers (Accessible to authorized staff)
DROP POLICY IF EXISTS "categories_read" ON inventory_categories;
CREATE POLICY "categories_read" ON inventory_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "categories_manage" ON inventory_categories;
CREATE POLICY "categories_manage" ON inventory_categories FOR ALL
  USING (has_permission(auth.uid(), 'inventory.categories') OR is_super_admin())
  WITH CHECK (has_permission(auth.uid(), 'inventory.categories') OR is_super_admin());

DROP POLICY IF EXISTS "suppliers_read" ON inventory_suppliers;
CREATE POLICY "suppliers_read" ON inventory_suppliers FOR SELECT USING (true);

DROP POLICY IF EXISTS "suppliers_manage" ON inventory_suppliers;
CREATE POLICY "suppliers_manage" ON inventory_suppliers FOR ALL
  USING (has_permission(auth.uid(), 'inventory.suppliers') OR is_super_admin())
  WITH CHECK (has_permission(auth.uid(), 'inventory.suppliers') OR is_super_admin());

-- 13. Policies with Branch Isolation
DROP POLICY IF EXISTS "stock_balances_read" ON inventory_stock_balances;
CREATE POLICY "stock_balances_read" ON inventory_stock_balances FOR SELECT
  USING (
    is_super_admin() OR
    has_permission(auth.uid(), 'inventory.view') AND (
      branch_id = (SELECT branch_id FROM staff WHERE id = auth.uid()) OR
      (SELECT branch_id FROM staff WHERE id = auth.uid()) IS NULL
    )
  );

DROP POLICY IF EXISTS "stock_balances_manage" ON inventory_stock_balances;
CREATE POLICY "stock_balances_manage" ON inventory_stock_balances FOR ALL
  USING (is_super_admin() OR has_permission(auth.uid(), 'inventory.adjust'))
  WITH CHECK (is_super_admin() OR has_permission(auth.uid(), 'inventory.adjust'));

DROP POLICY IF EXISTS "movements_read" ON inventory_movements;
CREATE POLICY "movements_read" ON inventory_movements FOR SELECT
  USING (
    is_super_admin() OR
    has_permission(auth.uid(), 'inventory.view') AND (
      source_branch_id = (SELECT branch_id FROM staff WHERE id = auth.uid()) OR
      destination_branch_id = (SELECT branch_id FROM staff WHERE id = auth.uid()) OR
      (SELECT branch_id FROM staff WHERE id = auth.uid()) IS NULL
    )
  );

DROP POLICY IF EXISTS "transfers_read" ON inventory_transfers;
CREATE POLICY "transfers_read" ON inventory_transfers FOR SELECT
  USING (
    is_super_admin() OR
    source_branch_id = (SELECT branch_id FROM staff WHERE id = auth.uid()) OR
    destination_branch_id = (SELECT branch_id FROM staff WHERE id = auth.uid()) OR
    (SELECT branch_id FROM staff WHERE id = auth.uid()) IS NULL
  );

DROP POLICY IF EXISTS "purchase_orders_read" ON inventory_purchase_orders;
CREATE POLICY "purchase_orders_read" ON inventory_purchase_orders FOR SELECT
  USING (
    is_super_admin() OR
    branch_id = (SELECT branch_id FROM staff WHERE id = auth.uid()) OR
    (SELECT branch_id FROM staff WHERE id = auth.uid()) IS NULL
  );

-- 14. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_items_category_id ON inventory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_items_barcode ON inventory_items(barcode);
CREATE INDEX IF NOT EXISTS idx_inventory_items_branch_id ON inventory_items(branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_balances_item_branch ON inventory_stock_balances(item_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_item_branch ON inventory_batches(item_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_expiry ON inventory_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item ON inventory_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created ON inventory_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_transfers_status ON inventory_transfers(status);
CREATE INDEX IF NOT EXISTS idx_inventory_purchase_orders_status ON inventory_purchase_orders(status);
