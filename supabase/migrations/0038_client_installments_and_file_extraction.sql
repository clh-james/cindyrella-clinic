-- ==============================================================================
-- Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
-- Migration 0038: Client Installments, Payment History & File Extraction System
-- ==============================================================================

-- 1. INSTALLMENT APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS installment_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  service_package_name TEXT NOT NULL,
  treatment_id UUID REFERENCES treatments(id) ON DELETE SET NULL,
  original_contract_amount NUMERIC(12,2) NOT NULL CHECK (original_contract_amount >= 0),
  down_payment_required NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (down_payment_required >= 0),
  down_payment_received NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (down_payment_received >= 0),
  frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'bi_weekly', 'semi_monthly', 'monthly', 'quarterly', 'custom')),
  installment_amount NUMERIC(12,2) NOT NULL CHECK (installment_amount >= 0),
  number_of_installments INTEGER NOT NULL CHECK (number_of_installments > 0),
  contract_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  contract_end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'pending', 'active', 'completed', 'defaulted', 'cancelled', 'rejected')),
  approval_status TEXT NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('draft', 'pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_installment_apps_customer ON installment_applications(customer_id);
CREATE INDEX IF NOT EXISTS idx_installment_apps_branch ON installment_applications(branch_id);
CREATE INDEX IF NOT EXISTS idx_installment_apps_app_number ON installment_applications(application_number);
CREATE INDEX IF NOT EXISTS idx_installment_apps_status ON installment_applications(status);

-- 2. INSTALLMENT SCHEDULES TABLE
CREATE TABLE IF NOT EXISTS installment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES installment_applications(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  scheduled_amount NUMERIC(12,2) NOT NULL CHECK (scheduled_amount >= 0),
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (amount_paid >= 0),
  remaining_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (remaining_amount >= 0),
  payment_date DATE,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'due_today', 'partially_paid', 'paid', 'overdue', 'waived', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (application_id, installment_number)
);

CREATE INDEX IF NOT EXISTS idx_installment_schedules_app ON installment_schedules(application_id);
CREATE INDEX IF NOT EXISTS idx_installment_schedules_due ON installment_schedules(due_date);
CREATE INDEX IF NOT EXISTS idx_installment_schedules_status ON installment_schedules(status);

-- 3. INSTALLMENT PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS installment_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number TEXT UNIQUE NOT NULL,
  application_id UUID NOT NULL REFERENCES installment_applications(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  schedule_id UUID REFERENCES installment_schedules(id) ON DELETE SET NULL,
  installment_number INTEGER,
  amount_paid NUMERIC(12,2) NOT NULL CHECK (amount_paid > 0),
  payment_method TEXT NOT NULL DEFAULT 'cash',
  payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  received_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  shift_id UUID REFERENCES cashier_shifts(id) ON DELETE SET NULL,
  receipt_number TEXT,
  reference_number TEXT,
  transaction_reference TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'reversed', 'refunded', 'voided')),
  reversed_at TIMESTAMPTZ,
  reversed_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  reversal_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_installment_payments_app ON installment_payments(application_id);
CREATE INDEX IF NOT EXISTS idx_installment_payments_customer ON installment_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_installment_payments_date ON installment_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_installment_payments_ref ON installment_payments(payment_number);
CREATE INDEX IF NOT EXISTS idx_installment_payments_txn ON installment_payments(transaction_reference);

-- 4. CUSTOMER PACKAGES & MEMBERSHIPS TABLE
CREATE TABLE IF NOT EXISTS customer_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  package_name TEXT NOT NULL,
  treatment_id UUID REFERENCES treatments(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  total_sessions INTEGER NOT NULL DEFAULT 1 CHECK (total_sessions > 0),
  sessions_remaining INTEGER NOT NULL DEFAULT 1 CHECK (sessions_remaining >= 0),
  price_paid NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (price_paid >= 0),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'fully_redeemed', 'expired', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_packages_customer ON customer_packages(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_packages_branch ON customer_packages(branch_id);

-- 5. CLIENT AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS client_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL, -- CLIENT_FILE_EXPORTED, CLIENT_HISTORY_VIEWED, CLIENT_PAYMENT_HISTORY_EXPORTED, INSTALLMENT_APPLICATION_VIEWED
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  export_type TEXT, -- PDF, EXCEL, STATEMENT, VIEW
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_audit_logs_cust ON client_audit_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_client_audit_logs_date ON client_audit_logs(created_at);

-- 6. EXTEND CUSTOMERS TABLE WITH OPTIONAL METADATA
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_code TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(customer_code);

-- 7. ENABLE ROW LEVEL SECURITY
ALTER TABLE installment_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE installment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE installment_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_audit_logs ENABLE ROW LEVEL SECURITY;

-- 8. RLS POLICIES WITH BRANCH ISOLATION AND SUPER ADMIN BYPASS

-- Installment Applications
DROP POLICY IF EXISTS "Staff view installment applications" ON installment_applications;
CREATE POLICY "Staff view installment applications" ON installment_applications
  FOR SELECT USING (
    is_staff() AND (
      is_super_admin() OR
      branch_id = (SELECT branch_id FROM staff WHERE id = auth.uid()) OR
      branch_id IS NULL
    )
  );

DROP POLICY IF EXISTS "Staff manage installment applications" ON installment_applications;
CREATE POLICY "Staff manage installment applications" ON installment_applications
  FOR ALL USING (is_staff()) WITH CHECK (is_staff());

-- Installment Schedules
DROP POLICY IF EXISTS "Staff view installment schedules" ON installment_schedules;
CREATE POLICY "Staff view installment schedules" ON installment_schedules
  FOR SELECT USING (is_staff());

DROP POLICY IF EXISTS "Staff manage installment schedules" ON installment_schedules;
CREATE POLICY "Staff manage installment schedules" ON installment_schedules
  FOR ALL USING (is_staff()) WITH CHECK (is_staff());

-- Installment Payments
DROP POLICY IF EXISTS "Staff view installment payments" ON installment_payments;
CREATE POLICY "Staff view installment payments" ON installment_payments
  FOR SELECT USING (
    is_staff() AND (
      is_super_admin() OR
      branch_id = (SELECT branch_id FROM staff WHERE id = auth.uid()) OR
      branch_id IS NULL
    )
  );

DROP POLICY IF EXISTS "Staff manage installment payments" ON installment_payments;
CREATE POLICY "Staff manage installment payments" ON installment_payments
  FOR ALL USING (is_staff()) WITH CHECK (is_staff());

-- Customer Packages
DROP POLICY IF EXISTS "Staff view customer packages" ON customer_packages;
CREATE POLICY "Staff view customer packages" ON customer_packages
  FOR SELECT USING (is_staff());

DROP POLICY IF EXISTS "Staff manage customer packages" ON customer_packages;
CREATE POLICY "Staff manage customer packages" ON customer_packages
  FOR ALL USING (is_staff()) WITH CHECK (is_staff());

-- Client Audit Logs
DROP POLICY IF EXISTS "Staff view client audit logs" ON client_audit_logs;
CREATE POLICY "Staff view client audit logs" ON client_audit_logs
  FOR SELECT USING (is_staff());

DROP POLICY IF EXISTS "Staff insert client audit logs" ON client_audit_logs;
CREATE POLICY "Staff insert client audit logs" ON client_audit_logs
  FOR INSERT WITH CHECK (is_staff());

-- 9. SEED PERMISSIONS FOR CLIENT FILE EXTRACTION & INSTALLMENTS
INSERT INTO permissions (key, name, module) VALUES
  ('customers.export_file', 'Extract Client File and Statements', 'customers'),
  ('customers.view_history', 'View Complete Client History', 'customers'),
  ('installments.view', 'View Installment Applications and Schedules', 'installments'),
  ('installments.create', 'Create Installment Applications', 'installments'),
  ('installments.approve', 'Approve Installment Applications', 'installments'),
  ('installments.pay', 'Record Installment Payments', 'installments'),
  ('installments.reverse', 'Reverse Installment Payments', 'installments')
ON CONFLICT (key) DO NOTHING;

-- Grant permissions to roles
DO $$
DECLARE
  v_super_admin_id UUID;
  v_admin_id UUID;
  v_manager_id UUID;
  v_cashier_id UUID;
  v_staff_id UUID;
BEGIN
  SELECT id INTO v_super_admin_id FROM roles WHERE name = 'super_admin';
  SELECT id INTO v_admin_id FROM roles WHERE name = 'admin';
  SELECT id INTO v_manager_id FROM roles WHERE name = 'manager';
  SELECT id INTO v_cashier_id FROM roles WHERE name = 'cashier';
  SELECT id INTO v_staff_id FROM roles WHERE name = 'staff';

  -- Super Admin & Admin get all
  IF v_super_admin_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_super_admin_id, p.id FROM permissions p
    WHERE p.key IN (
      'customers.export_file', 'customers.view_history',
      'installments.view', 'installments.create', 'installments.approve', 'installments.pay', 'installments.reverse'
    ) ON CONFLICT DO NOTHING;
  END IF;

  IF v_admin_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_admin_id, p.id FROM permissions p
    WHERE p.key IN (
      'customers.export_file', 'customers.view_history',
      'installments.view', 'installments.create', 'installments.approve', 'installments.pay', 'installments.reverse'
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Manager
  IF v_manager_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_manager_id, p.id FROM permissions p
    WHERE p.key IN (
      'customers.export_file', 'customers.view_history',
      'installments.view', 'installments.create', 'installments.approve', 'installments.pay'
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Cashier (can view, pay, and extract file)
  IF v_cashier_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_cashier_id, p.id FROM permissions p
    WHERE p.key IN (
      'customers.export_file', 'customers.view_history',
      'installments.view', 'installments.pay'
    ) ON CONFLICT DO NOTHING;
  END IF;

  -- Staff (read only permitted client info)
  IF v_staff_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_staff_id, p.id FROM permissions p
    WHERE p.key IN ('customers.view_history')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
