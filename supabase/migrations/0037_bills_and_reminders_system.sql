-- ==============================================================================
-- 0037_bills_and_reminders_system.sql
-- Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
-- Production-Ready Bills Due, Recurring Bills & Automated Payment Reminders
-- ==============================================================================

-- 1. RECURRING BILL TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS recurring_bill_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  category_id UUID REFERENCES expense_categories(id) ON DELETE RESTRICT,
  vendor_or_payee TEXT NOT NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'semi_annually', 'annually', 'custom')),
  custom_interval_days INTEGER,
  default_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (default_amount >= 0),
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
  due_date_rule TEXT NOT NULL DEFAULT 'day_of_month', -- 'day_of_month' or 'days_after_billing'
  due_day_offset INTEGER DEFAULT 15,                 -- e.g. due on the 15th of the month or 15 days after issue
  start_date DATE NOT NULL,
  next_billing_date DATE NOT NULL,
  end_date DATE,
  payment_method TEXT DEFAULT 'bank_transfer',
  responsible_employee_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  reminder_schedule JSONB DEFAULT '{"stages": ["7_days", "3_days", "1_day", "due_date", "overdue"]}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  auto_generate BOOLEAN DEFAULT true,
  notes TEXT,
  last_generated_at TIMESTAMPTZ,
  last_generated_bill_id UUID,
  created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. BILLS TABLE
CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category_id UUID REFERENCES expense_categories(id) ON DELETE RESTRICT,
  vendor_or_payee TEXT NOT NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  invoice_number TEXT,
  billing_period TEXT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  amount_before_tax NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (amount_before_tax >= 0),
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (amount_paid >= 0),
  outstanding_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (outstanding_balance >= 0),
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('draft', 'upcoming', 'due_today', 'overdue', 'partially_paid', 'paid', 'cancelled')),
  approval_status TEXT NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('draft', 'pending', 'approved', 'rejected')),
  is_recurring BOOLEAN DEFAULT false,
  recurring_rule_id UUID REFERENCES recurring_bill_templates(id) ON DELETE SET NULL,
  responsible_employee_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  reminder_schedule JSONB DEFAULT '{"stages": ["7_days", "3_days", "1_day", "due_date", "overdue"]}'::jsonb,
  receipt_url TEXT,
  notes TEXT,
  expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
  created_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for Bills table
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bills(due_date);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_branch_id ON bills(branch_id);
CREATE INDEX IF NOT EXISTS idx_bills_vendor ON bills(vendor_or_payee);
CREATE INDEX IF NOT EXISTS idx_bills_expense_id ON bills(expense_id);

-- 3. BILL PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS bill_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  payment_number TEXT UNIQUE NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
  payment_account TEXT,
  reference_number TEXT,
  paid_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  receipt_url TEXT,
  shift_id UUID REFERENCES cashier_shifts(id) ON DELETE SET NULL,
  expense_payment_id UUID REFERENCES expense_payments(id) ON DELETE SET NULL,
  is_reversed BOOLEAN DEFAULT false,
  reversed_at TIMESTAMPTZ,
  reversed_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  reversal_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bill_payments_bill_id ON bill_payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_payments_date ON bill_payments(payment_date);

-- 4. BILL REMINDER LOGS TABLE (Idempotent delivery records)
CREATE TABLE IF NOT EXISTS bill_reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  reminder_stage TEXT NOT NULL,
  scheduled_for DATE NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  recipient_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  recipient_email TEXT,
  recipient_phone TEXT,
  recipient_name TEXT,
  channel TEXT NOT NULL DEFAULT 'in_app', -- 'in_app', 'email', 'sms'
  delivery_status TEXT NOT NULL DEFAULT 'sent' CHECK (delivery_status IN ('pending', 'sent', 'failed', 'skipped')),
  delivery_error TEXT,
  idempotency_key TEXT UNIQUE NOT NULL,
  outstanding_balance_at_send NUMERIC(12,2) NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bill_reminder_logs_bill ON bill_reminder_logs(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_reminder_logs_key ON bill_reminder_logs(idempotency_key);

-- 5. STAFF IN-APP NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS staff_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'bill_reminder',
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_notifications_recipient ON staff_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_staff_notifications_read ON staff_notifications(is_read);

-- 6. BILL AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS bill_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bill_audit_logs_bill ON bill_audit_logs(bill_id);

-- 7. BILL REMINDER SETTINGS TABLE
CREATE TABLE IF NOT EXISTS bill_reminder_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID UNIQUE REFERENCES branches(id) ON DELETE CASCADE,
  stages_enabled JSONB DEFAULT '{"7_days": true, "3_days": true, "1_day": true, "due_date": true, "overdue": true}'::jsonb,
  overdue_frequency_days INTEGER DEFAULT 3,
  in_app_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  notify_branch_managers BOOLEAN DEFAULT true,
  notify_super_admins BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed company-wide default reminder settings if none exist
INSERT INTO bill_reminder_settings (branch_id, stages_enabled, overdue_frequency_days, in_app_enabled, email_enabled, sms_enabled)
SELECT NULL, '{"7_days": true, "3_days": true, "1_day": true, "due_date": true, "overdue": true}'::jsonb, 3, true, true, false
WHERE NOT EXISTS (SELECT 1 FROM bill_reminder_settings WHERE branch_id IS NULL);

-- 8. EXPENSES TABLE ENHANCEMENT FOR ACCRUALS / BILL LINK
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS bill_id UUID REFERENCES bills(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_accrual BOOLEAN DEFAULT false;

-- 9. ENABLE ROW LEVEL SECURITY
ALTER TABLE recurring_bill_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_reminder_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_reminder_settings ENABLE ROW LEVEL SECURITY;

-- 10. ROW LEVEL SECURITY POLICIES
-- Recurring Bill Templates RLS
DROP POLICY IF EXISTS "Staff view branch recurring templates" ON recurring_bill_templates;
CREATE POLICY "Staff view branch recurring templates" ON recurring_bill_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM staff 
      LEFT JOIN roles ON roles.id = staff.role_id
      WHERE staff.id = auth.uid() 
      AND staff.is_active = true
      AND (
        roles.name IN ('super_admin', 'admin') OR
        staff.branch_id = recurring_bill_templates.branch_id OR
        recurring_bill_templates.branch_id IS NULL
      )
    )
  );

DROP POLICY IF EXISTS "Staff manage recurring templates" ON recurring_bill_templates;
CREATE POLICY "Staff manage recurring templates" ON recurring_bill_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid() AND staff.is_active = true)
  );

-- Bills RLS
DROP POLICY IF EXISTS "Staff view branch bills" ON bills;
CREATE POLICY "Staff view branch bills" ON bills
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM staff 
      LEFT JOIN roles ON roles.id = staff.role_id
      WHERE staff.id = auth.uid() 
      AND staff.is_active = true
      AND (
        roles.name IN ('super_admin', 'admin') OR
        staff.branch_id = bills.branch_id OR
        bills.branch_id IS NULL OR
        bills.responsible_employee_id = staff.id OR
        bills.created_by = staff.id
      )
    )
  );

DROP POLICY IF EXISTS "Staff manage bills" ON bills;
CREATE POLICY "Staff manage bills" ON bills
  FOR ALL USING (
    EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid() AND staff.is_active = true)
  );

-- Bill Payments RLS
DROP POLICY IF EXISTS "Staff view bill payments" ON bill_payments;
CREATE POLICY "Staff view bill payments" ON bill_payments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid() AND staff.is_active = true)
  );

DROP POLICY IF EXISTS "Staff manage bill payments" ON bill_payments;
CREATE POLICY "Staff manage bill payments" ON bill_payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid() AND staff.is_active = true)
  );

-- Reminder Logs RLS
DROP POLICY IF EXISTS "Staff view reminder logs" ON bill_reminder_logs;
CREATE POLICY "Staff view reminder logs" ON bill_reminder_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid() AND staff.is_active = true)
  );

-- Staff Notifications RLS
DROP POLICY IF EXISTS "Staff view own notifications" ON staff_notifications;
CREATE POLICY "Staff view own notifications" ON staff_notifications
  FOR SELECT USING (
    recipient_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM staff 
      LEFT JOIN roles ON roles.id = staff.role_id
      WHERE staff.id = auth.uid() AND roles.name IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Staff update own notifications" ON staff_notifications;
CREATE POLICY "Staff update own notifications" ON staff_notifications
  FOR UPDATE USING (
    recipient_id = auth.uid()
  );

-- Bill Audit Logs RLS
DROP POLICY IF EXISTS "Staff view bill audit" ON bill_audit_logs;
CREATE POLICY "Staff view bill audit" ON bill_audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid() AND staff.is_active = true)
  );

-- Bill Reminder Settings RLS
DROP POLICY IF EXISTS "Staff view reminder settings" ON bill_reminder_settings;
CREATE POLICY "Staff view reminder settings" ON bill_reminder_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage reminder settings" ON bill_reminder_settings;
CREATE POLICY "Admin manage reminder settings" ON bill_reminder_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staff 
      LEFT JOIN roles ON roles.id = staff.role_id
      WHERE staff.id = auth.uid() 
      AND staff.is_active = true
      AND roles.name IN ('super_admin', 'admin', 'manager')
    )
  );

-- 11. RBAC PERMISSIONS FOR BILLS
INSERT INTO permissions (key, name, module) VALUES
  ('bills.view', 'View Bills Due and Payment Schedules', 'operations'),
  ('bills.create', 'Register New Bill', 'operations'),
  ('bills.edit', 'Edit Bill Details', 'operations'),
  ('bills.approve', 'Approve Bills Due', 'operations'),
  ('bills.pay', 'Record Bill Payments', 'operations'),
  ('bills.cancel', 'Cancel Bills', 'operations'),
  ('bills.reminders', 'Configure Bill Reminders and Automation', 'operations'),
  ('bills.export', 'Export Bills and Financial Schedules', 'operations')
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

    -- Super Admin gets all bills permissions
    IF v_super_admin_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT v_super_admin_id, id FROM permissions WHERE key LIKE 'bills.%'
        ON CONFLICT DO NOTHING;
    END IF;

    -- Admin gets all bills permissions
    IF v_admin_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT v_admin_id, id FROM permissions WHERE key LIKE 'bills.%'
        ON CONFLICT DO NOTHING;
    END IF;

    -- Manager gets view, create, edit, approve, pay, reminders, export
    IF v_manager_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT v_manager_id, id FROM permissions 
        WHERE key IN (
          'bills.view', 'bills.create', 'bills.edit', 
          'bills.approve', 'bills.pay', 'bills.reminders', 'bills.export'
        )
        ON CONFLICT DO NOTHING;
    END IF;

    -- Cashier gets view, pay
    IF v_cashier_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT v_cashier_id, id FROM permissions 
        WHERE key IN ('bills.view', 'bills.pay')
        ON CONFLICT DO NOTHING;
    END IF;

    -- Staff gets view
    IF v_staff_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT v_staff_id, id FROM permissions 
        WHERE key IN ('bills.view')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
