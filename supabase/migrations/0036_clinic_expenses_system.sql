-- ==============================================================================
-- 0036_clinic_expenses_system.sql
-- Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
-- Clinic Operating Expenses, Petty Cash & Receipt Tracking System
-- ==============================================================================

-- 1. EXPENSE CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#4F46E5',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed Default Clinic & Spa Expense Categories
INSERT INTO expense_categories (name, description, color) VALUES
  ('Clinical Supplies & Consumables', 'Needles, syringes, gauze, alcohol, gloves, disposables', '#0284C7'),
  ('Utilities & High-Speed Internet', 'Electricity, water, clinic internet, phone lines', '#D97706'),
  ('Rent & Facility Maintenance', 'Clinic commercial lease, air-conditioner service, cleaning', '#4F46E5'),
  ('Petty Cash Disbursements', 'Minor daily cash operational expenses and emergency supplies', '#10B981'),
  ('Marketing & Promotions', 'Social media advertising, influencer collaborations, print flyers', '#EC4899'),
  ('Professional & Doctor Fees', 'Specialist consultation fees, medical director retainers', '#8B5CF6'),
  ('Staff Welfare & Meals', 'Overtime meals, staff pantry, drinking water, uniforms', '#F59E0B'),
  ('Office & POS Supplies', 'Thermal receipt rolls, printer ink, stationary, barcode labels', '#64748B'),
  ('Equipment Maintenance & Repairs', 'Aesthetic laser maintenance, facial machine calibration', '#DC2626'),
  ('Taxes, Licenses & Permits', 'Mayor permits, BIR documentary stamps, sanitary permits', '#059669'),
  ('Miscellaneous Operating Costs', 'Bank transaction fees, courier, minor deliveries', '#6B7280')
ON CONFLICT (name) DO NOTHING;

-- 2. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_number TEXT UNIQUE NOT NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  category_id UUID REFERENCES expense_categories(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'petty_cash', 'bank_transfer', 'gcash', 'credit_card', 'check')),
  reference_number TEXT,
  vendor_or_payee TEXT NOT NULL,
  receipt_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'reimbursed')),
  is_petty_cash BOOLEAN DEFAULT false,
  created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. PETTY CASH FUNDS TABLE
CREATE TABLE IF NOT EXISTS petty_cash_funds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID UNIQUE REFERENCES branches(id) ON DELETE CASCADE,
  current_balance NUMERIC(12,2) NOT NULL DEFAULT 5000.00,
  target_float NUMERIC(12,2) NOT NULL DEFAULT 5000.00,
  last_replenished_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default petty cash funds for branches
INSERT INTO petty_cash_funds (branch_id, current_balance, target_float)
SELECT id, 5000.00, 5000.00 FROM branches
ON CONFLICT (branch_id) DO NOTHING;

-- 4. EXPENSE AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS expense_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. STORAGE BUCKET FOR RECEIPT ATTACHMENTS
INSERT INTO storage.buckets (id, name, public) 
VALUES ('expense-receipts', 'expense-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policy: Allow authenticated staff to upload
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Staff upload expense receipts'
  ) THEN
    CREATE POLICY "Staff upload expense receipts"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'expense-receipts');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public view expense receipts'
  ) THEN
    CREATE POLICY "Public view expense receipts"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'expense-receipts');
  END IF;
END $$;

-- 6. ENABLE ROW LEVEL SECURITY
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE petty_cash_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_audit_logs ENABLE ROW LEVEL SECURITY;

-- Staff Access Policies
DROP POLICY IF EXISTS "Staff view categories" ON expense_categories;
CREATE POLICY "Staff view categories" ON expense_categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage categories" ON expense_categories;
CREATE POLICY "Admin manage categories" ON expense_categories
  FOR ALL USING (EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid() AND staff.is_active = true));

DROP POLICY IF EXISTS "Staff view branch expenses" ON expenses;
CREATE POLICY "Staff view branch expenses" ON expenses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid() AND staff.is_active = true)
  );

DROP POLICY IF EXISTS "Staff manage expenses" ON expenses;
CREATE POLICY "Staff manage expenses" ON expenses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid() AND staff.is_active = true)
  );

DROP POLICY IF EXISTS "Staff view petty cash" ON petty_cash_funds;
CREATE POLICY "Staff view petty cash" ON petty_cash_funds
  FOR ALL USING (
    EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid() AND staff.is_active = true)
  );

DROP POLICY IF EXISTS "Staff view expense audit" ON expense_audit_logs;
CREATE POLICY "Staff view expense audit" ON expense_audit_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid() AND staff.is_active = true)
  );

-- 7. RBAC PERMISSIONS FOR EXPENSES
INSERT INTO permissions (key, name, module) VALUES
  ('expenses.view', 'View Clinic Operating Expenses', 'expenses'),
  ('expenses.create', 'Record New Expense', 'expenses'),
  ('expenses.edit', 'Edit Expense Details', 'expenses'),
  ('expenses.approve', 'Approve or Reject Expenses', 'expenses'),
  ('expenses.delete', 'Delete Unapproved Expenses', 'expenses'),
  ('expenses.petty_cash', 'Manage Petty Cash Fund', 'expenses'),
  ('expenses.categories', 'Manage Expense Categories', 'expenses')
ON CONFLICT (key) DO NOTHING;

-- Grant permissions to roles
DO $$
DECLARE
    v_super_admin_id uuid;
    v_admin_id uuid;
    v_manager_id uuid;
BEGIN
    SELECT id INTO v_super_admin_id FROM roles WHERE name = 'super_admin';
    SELECT id INTO v_admin_id FROM roles WHERE name = 'admin';
    SELECT id INTO v_manager_id FROM roles WHERE name = 'manager';

    -- Super Admin gets all expense permissions
    IF v_super_admin_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT v_super_admin_id, id FROM permissions WHERE module = 'expenses'
        ON CONFLICT DO NOTHING;
    END IF;

    -- Admin gets all expense permissions
    IF v_admin_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT v_admin_id, id FROM permissions WHERE module = 'expenses'
        ON CONFLICT DO NOTHING;
    END IF;

    -- Manager gets view, create, edit, petty_cash
    IF v_manager_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT v_manager_id, id FROM permissions 
        WHERE key IN ('expenses.view', 'expenses.create', 'expenses.edit', 'expenses.petty_cash')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
