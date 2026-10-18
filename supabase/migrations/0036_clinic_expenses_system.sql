-- ==============================================================================
-- 0036_clinic_expenses_system.sql
-- Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
-- Production-Ready Clinic Operating Expenses, Petty Cash & Reimbursements System
-- ==============================================================================

-- 1. EXPENSE CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#4F46E5',
  requires_receipt BOOLEAN DEFAULT false,
  requires_approval BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure columns exist if table was already created in earlier attempts
ALTER TABLE expense_categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE expense_categories ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#4F46E5';
ALTER TABLE expense_categories ADD COLUMN IF NOT EXISTS requires_receipt BOOLEAN DEFAULT false;
ALTER TABLE expense_categories ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT true;
ALTER TABLE expense_categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE expense_categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Seed Default Clinic & Spa Expense Categories (23 configured categories)
INSERT INTO expense_categories (name, description, color, requires_receipt, requires_approval) VALUES
  ('Rent', 'Clinic commercial facility lease and space rent', '#4F46E5', true, true),
  ('Electricity', 'Meralco or local electric distribution utility bills', '#D97706', true, true),
  ('Water', 'Water utility services and purification supply', '#0284C7', true, true),
  ('Internet and Telephone', 'High-speed clinic fiber internet, landlines, SMS SIM accounts', '#2563EB', true, true),
  ('Clinic Supplies', 'Cotton pads, headbands, bed sheets, towels, spatulas, gloves', '#0D9488', true, false),
  ('Retail Supplies', 'Cosmetics, skincare serums, retail packaging, shopping bags', '#7C3AED', true, true),
  ('Medical and Treatment Supplies', 'Needles, botulinum toxins, dermal fillers, meso solutions, syringes', '#DC2626', true, true),
  ('Equipment', 'Capital investments in aesthetic lasers, HIFU, RF machines', '#9333EA', true, true),
  ('Equipment Maintenance', 'Preventative maintenance, recalibration, probe replacements', '#EA580C', true, true),
  ('Repairs', 'Air-conditioning maintenance, plumbing, electrical repairs', '#C026D3', true, true),
  ('Cleaning Supplies', 'Sanitizers, disinfectants, detergents, trash bags, mops', '#16A34A', false, false),
  ('Marketing and Advertising', 'Meta ads, Google ads, billboards, influencer shoots, printed flyers', '#EC4899', true, true),
  ('Employee Transportation', 'Grab/taxi fares for official errands, delivery gas allowance', '#059669', true, false),
  ('Staff Meals', 'Overtime allowances, clinic pantry coffee/tea, team lunches', '#F59E0B', false, false),
  ('Office Supplies', 'POS receipt rolls, bond paper, printer ink, barcode ribbons', '#64748B', false, false),
  ('Software Subscriptions', 'Cloud hosting, appointment SMS gateways, accounting software', '#3B82F6', true, true),
  ('Professional Services', 'Doctor consultation retainers, legal counsel, CPA audit fees', '#8B5CF6', true, true),
  ('Government Fees and Permits', 'BIR stamps, Mayor permits, sanitary permits, DOH certifications', '#0891B2', true, true),
  ('Bank Charges', 'Credit card terminal processing fees, wire transfer deductions', '#6B7280', false, false),
  ('Payroll-Related Expenses', 'Employee uniforms, HR training workshops, staff welfare', '#F97316', false, true),
  ('Petty Cash', 'Minor daily cash disbursements from the clinic drawer float', '#10B981', true, false),
  ('Employee Reimbursement', 'Out-of-pocket expenses incurred by staff for clinic needs', '#84CC16', true, true),
  ('Other Expenses', 'Miscellaneous operational costs not categorized elsewhere', '#78716C', false, false)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  color = EXCLUDED.color,
  requires_receipt = EXCLUDED.requires_receipt,
  requires_approval = EXCLUDED.requires_approval;

-- 2. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_number TEXT UNIQUE NOT NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  category_id UUID REFERENCES expense_categories(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT,
  vendor_or_payee TEXT NOT NULL,
  amount_before_tax NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  amount NUMERIC(12,2) DEFAULT 0.00,
  approved_amount NUMERIC(12,2),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  payment_date DATE,
  payment_account TEXT,
  approval_status TEXT NOT NULL DEFAULT 'draft',
  status TEXT DEFAULT 'pending',
  is_petty_cash BOOLEAN DEFAULT false,
  is_reimbursement BOOLEAN DEFAULT false,
  employee_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  requested_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  receipt_url TEXT,
  reference_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure all new columns exist on expenses if table was created in an earlier migration
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS amount_before_tax NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS amount NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approved_amount NUMERIC(12,2);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_date DATE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_account TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'draft';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_petty_cash BOOLEAN DEFAULT false;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_reimbursement BOOLEAN DEFAULT false;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS reference_number TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Sync amounts & status if existing records were present
UPDATE expenses SET total_amount = amount WHERE (total_amount IS NULL OR total_amount = 0) AND amount IS NOT NULL AND amount > 0;
UPDATE expenses SET amount = total_amount WHERE (amount IS NULL OR amount = 0) AND total_amount IS NOT NULL AND total_amount > 0;
UPDATE expenses SET requested_by = created_by WHERE requested_by IS NULL AND created_by IS NOT NULL;
UPDATE expenses SET created_by = requested_by WHERE created_by IS NULL AND requested_by IS NOT NULL;
UPDATE expenses SET approval_status = status WHERE (approval_status IS NULL OR approval_status = 'draft') AND status IS NOT NULL;

-- 3. EXPENSE ATTACHMENTS TABLE
CREATE TABLE IF NOT EXISTS expense_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- 4. EXPENSE PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS expense_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  payment_number TEXT UNIQUE NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL,
  payment_account TEXT,
  reference_number TEXT,
  paid_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  shift_id UUID REFERENCES cashier_shifts(id) ON DELETE SET NULL,
  is_reversed BOOLEAN DEFAULT false,
  reversed_at TIMESTAMPTZ,
  reversed_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  reversal_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. PETTY CASH FUNDS TABLE
CREATE TABLE IF NOT EXISTS petty_cash_funds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID UNIQUE REFERENCES branches(id) ON DELETE CASCADE,
  current_balance NUMERIC(12,2) NOT NULL DEFAULT 5000.00,
  target_float NUMERIC(12,2) NOT NULL DEFAULT 5000.00,
  last_replenished_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure unique constraint exists on branch_id if table was already created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'petty_cash_funds_branch_id_key'
  ) THEN
    ALTER TABLE petty_cash_funds ADD CONSTRAINT petty_cash_funds_branch_id_key UNIQUE (branch_id);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Seed default petty cash funds for branches
INSERT INTO petty_cash_funds (branch_id, current_balance, target_float)
SELECT id, 5000.00, 5000.00 FROM branches
ON CONFLICT (branch_id) DO NOTHING;

-- 6. EXPENSE AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS expense_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. CASHIER SHIFTS ENHANCEMENT FOR DISBURSEMENTS
ALTER TABLE cashier_shifts ADD COLUMN IF NOT EXISTS cash_disbursements integer DEFAULT 0;

-- 8. STORAGE BUCKET FOR RECEIPT ATTACHMENTS
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

-- 9. ENABLE ROW LEVEL SECURITY
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_payments ENABLE ROW LEVEL SECURITY;
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
    EXISTS (
      SELECT 1 FROM staff 
      LEFT JOIN roles ON roles.id = staff.role_id
      WHERE staff.id = auth.uid() 
      AND staff.is_active = true
      AND (
        roles.name = 'super_admin' OR
        staff.branch_id = expenses.branch_id OR
        expenses.branch_id IS NULL OR
        expenses.requested_by = staff.id OR
        expenses.employee_id = staff.id
      )
    )
  );

DROP POLICY IF EXISTS "Staff manage expenses" ON expenses;
CREATE POLICY "Staff manage expenses" ON expenses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid() AND staff.is_active = true)
  );

DROP POLICY IF EXISTS "Staff view attachments" ON expense_attachments;
CREATE POLICY "Staff view attachments" ON expense_attachments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid() AND staff.is_active = true)
  );

DROP POLICY IF EXISTS "Staff view payments" ON expense_payments;
CREATE POLICY "Staff view payments" ON expense_payments
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

-- 10. RBAC PERMISSIONS FOR EXPENSES
INSERT INTO permissions (key, name, module) VALUES
  ('expenses.view', 'View Clinic Operating Expenses', 'expenses'),
  ('expenses.create', 'Record New Expense', 'expenses'),
  ('expenses.edit', 'Edit Expense Details', 'expenses'),
  ('expenses.approve', 'Approve or Reject Expenses', 'expenses'),
  ('expenses.delete', 'Delete Unapproved Expenses', 'expenses'),
  ('expenses.pay', 'Record Expense Payments and Drawer Disbursements', 'expenses'),
  ('expenses.pay_reverse', 'Reverse Expense Payments', 'expenses'),
  ('expenses.petty_cash', 'Manage Petty Cash Fund and Drawer Float', 'expenses'),
  ('expenses.categories', 'Manage Expense Categories', 'expenses'),
  ('expenses.reimburse', 'Submit Reimbursement Requests', 'expenses'),
  ('expenses.export', 'Export Financial Expense Reports', 'expenses'),
  ('approvals.view', 'View Expense & Operation Approvals', 'operations')
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  module = EXCLUDED.module;

-- Grant permissions to roles
DO $$
DECLARE
    v_super_admin_id uuid;
    v_admin_id uuid;
    v_manager_id uuid;
    v_cashier_id uuid;
    v_staff_id uuid;
BEGIN
    SELECT id INTO v_super_admin_id FROM roles WHERE name = 'super_admin';
    SELECT id INTO v_admin_id FROM roles WHERE name = 'admin';
    SELECT id INTO v_manager_id FROM roles WHERE name = 'manager';
    SELECT id INTO v_cashier_id FROM roles WHERE name = 'cashier';
    SELECT id INTO v_staff_id FROM roles WHERE name = 'staff';

    -- Super Admin gets all expense & approval permissions
    IF v_super_admin_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT v_super_admin_id, id FROM permissions WHERE module IN ('expenses', 'operations')
        ON CONFLICT DO NOTHING;
    END IF;

    -- Admin gets all expense & approval permissions
    IF v_admin_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT v_admin_id, id FROM permissions WHERE module IN ('expenses', 'operations')
        ON CONFLICT DO NOTHING;
    END IF;

    -- Manager gets view, create, edit, approve, pay, petty_cash, reimburse, export, approvals.view
    IF v_manager_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT v_manager_id, id FROM permissions 
        WHERE key IN (
          'expenses.view', 'expenses.create', 'expenses.edit', 
          'expenses.approve', 'expenses.pay', 'expenses.petty_cash', 
          'expenses.reimburse', 'expenses.export', 'approvals.view'
        )
        ON CONFLICT DO NOTHING;
    END IF;

    -- Cashier gets view, create, pay (drawer disbursements), reimburse
    IF v_cashier_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT v_cashier_id, id FROM permissions 
        WHERE key IN ('expenses.view', 'expenses.create', 'expenses.pay', 'expenses.reimburse')
        ON CONFLICT DO NOTHING;
    END IF;

    -- Staff gets reimburse (can submit and view own)
    IF v_staff_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT v_staff_id, id FROM permissions 
        WHERE key IN ('expenses.reimburse', 'expenses.view')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
