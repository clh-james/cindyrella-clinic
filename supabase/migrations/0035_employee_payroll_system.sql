-- ==============================================================================
-- Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
-- Migration: 0035_employee_payroll_system.sql
-- Description: Complete Employee Payroll Management Module
-- Includes: Compensation Setup, Attendance & Overtime, Commissions,
--           Payroll Runs & Items, Payslips, 13th Month Pay, Statutory Settings,
--           and Complete Audit Trail with Philippine Labor Compliance.
-- ==============================================================================

-- 1. Employee Compensation (Effective-Dated Salary Records)
CREATE TABLE IF NOT EXISTS employee_compensation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  position text NOT NULL DEFAULT 'Clinic Staff',
  employment_status text NOT NULL DEFAULT 'active' CHECK (employment_status IN ('active', 'on_leave', 'resigned', 'terminated')),
  employment_type text NOT NULL DEFAULT 'regular' CHECK (employment_type IN ('regular', 'probationary', 'part_time', 'contractual', 'commission_based')),
  salary_type text NOT NULL DEFAULT 'monthly' CHECK (salary_type IN ('monthly', 'daily', 'hourly', 'commission_based', 'mixed')),
  basic_salary numeric(12,2) NOT NULL DEFAULT 0.00,
  daily_rate numeric(10,2) NOT NULL DEFAULT 0.00,
  hourly_rate numeric(10,2) NOT NULL DEFAULT 0.00,
  payroll_frequency text NOT NULL DEFAULT 'semi_monthly' CHECK (payroll_frequency IN ('weekly', 'semi_monthly', 'monthly', 'custom')),
  effective_date date NOT NULL DEFAULT current_date,
  is_current boolean NOT NULL DEFAULT true,
  allowances jsonb NOT NULL DEFAULT '[]'::jsonb, -- Array of { id, name, amount, is_taxable, is_de_minimis }
  commission_eligible boolean NOT NULL DEFAULT false,
  overtime_eligible boolean NOT NULL DEFAULT true,
  sss_enabled boolean NOT NULL DEFAULT true,
  philhealth_enabled boolean NOT NULL DEFAULT true,
  pagibig_enabled boolean NOT NULL DEFAULT true,
  pagibig_custom_amount numeric(10,2) NOT NULL DEFAULT 200.00,
  tax_exempt boolean NOT NULL DEFAULT false,
  is_minimum_wage_earner boolean NOT NULL DEFAULT false,
  bank_name text,
  bank_account_number text,
  bank_account_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Attendance & Overtime Records
CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  work_date date NOT NULL,
  time_in timestamptz,
  time_out timestamptz,
  hours_worked numeric(5,2) NOT NULL DEFAULT 0.00,
  late_minutes integer NOT NULL DEFAULT 0,
  undertime_minutes integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'on_leave', 'rest_day', 'holiday')),
  leave_type text CHECK (leave_type IN ('vacation', 'sick', 'emergency', 'maternity', 'paternity', 'unpaid', 'none')),
  is_approved_leave boolean NOT NULL DEFAULT false,
  overtime_hours numeric(4,2) NOT NULL DEFAULT 0.00,
  overtime_type text NOT NULL DEFAULT 'regular_workday' CHECK (overtime_type IN (
    'regular_workday', 'rest_day', 'special_holiday', 'regular_holiday', 
    'rest_day_special_holiday', 'rest_day_regular_holiday', 'night_diff'
  )),
  overtime_status text NOT NULL DEFAULT 'none' CHECK (overtime_status IN ('none', 'pending', 'approved', 'rejected')),
  overtime_approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, work_date)
);

-- 3. Commission Records (Service & Retail Attributions)
CREATE TABLE IF NOT EXISTS commission_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  source_type text NOT NULL CHECK (source_type IN ('appointment', 'pos_sale', 'manual_service', 'manual_retail')),
  source_id uuid, -- appointment or pos_sale id
  reference_number text,
  item_name text NOT NULL,
  base_amount numeric(10,2) NOT NULL DEFAULT 0.00,
  commission_rate numeric(5,2) NOT NULL DEFAULT 0.00, -- e.g. 10.00 for 10%
  is_percentage boolean NOT NULL DEFAULT true,
  commission_amount numeric(10,2) NOT NULL DEFAULT 0.00,
  split_ratio numeric(4,2) NOT NULL DEFAULT 1.00, -- 1.0 = 100%, 0.5 = 50%
  date_earned date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  payroll_run_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Payroll Runs (Batches)
CREATE TABLE IF NOT EXISTS payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_number text UNIQUE NOT NULL, -- e.g. PR-202610-SM1-DVO
  title text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  pay_date date NOT NULL,
  cutoff_frequency text NOT NULL DEFAULT 'semi_monthly' CHECK (cutoff_frequency IN ('weekly', 'semi_monthly', 'monthly', 'custom')),
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'calculating', 'for_review', 'for_approval', 'approved', 'released', 'cancelled'
  )),
  total_employees integer NOT NULL DEFAULT 0,
  total_gross_pay numeric(12,2) NOT NULL DEFAULT 0.00,
  total_deductions numeric(12,2) NOT NULL DEFAULT 0.00,
  total_net_pay numeric(12,2) NOT NULL DEFAULT 0.00,
  total_employer_contributions numeric(12,2) NOT NULL DEFAULT 0.00,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  released_at timestamptz,
  approval_comments text,
  rejection_reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Payroll Items (Itemized Snapshot per Employee)
CREATE TABLE IF NOT EXISTS payroll_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id uuid NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  employee_name text NOT NULL,
  position text NOT NULL DEFAULT 'Staff',
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  branch_name text,
  salary_type text NOT NULL,
  base_salary_rate numeric(12,2) NOT NULL DEFAULT 0.00,
  days_worked numeric(5,2) NOT NULL DEFAULT 0.00,
  hours_worked numeric(6,2) NOT NULL DEFAULT 0.00,
  basic_pay numeric(12,2) NOT NULL DEFAULT 0.00,
  overtime_pay numeric(12,2) NOT NULL DEFAULT 0.00,
  commission_pay numeric(12,2) NOT NULL DEFAULT 0.00,
  allowance_pay numeric(12,2) NOT NULL DEFAULT 0.00,
  holiday_pay numeric(12,2) NOT NULL DEFAULT 0.00,
  other_earnings numeric(12,2) NOT NULL DEFAULT 0.00,
  gross_pay numeric(12,2) NOT NULL DEFAULT 0.00,
  sss_employee numeric(10,2) NOT NULL DEFAULT 0.00,
  sss_employer numeric(10,2) NOT NULL DEFAULT 0.00,
  philhealth_employee numeric(10,2) NOT NULL DEFAULT 0.00,
  philhealth_employer numeric(10,2) NOT NULL DEFAULT 0.00,
  pagibig_employee numeric(10,2) NOT NULL DEFAULT 0.00,
  pagibig_employer numeric(10,2) NOT NULL DEFAULT 0.00,
  withholding_tax numeric(10,2) NOT NULL DEFAULT 0.00,
  late_undertime_deduction numeric(10,2) NOT NULL DEFAULT 0.00,
  absence_deduction numeric(10,2) NOT NULL DEFAULT 0.00,
  loan_advance_deduction numeric(10,2) NOT NULL DEFAULT 0.00,
  other_deductions numeric(10,2) NOT NULL DEFAULT 0.00,
  total_deductions numeric(12,2) NOT NULL DEFAULT 0.00,
  net_pay numeric(12,2) NOT NULL DEFAULT 0.00,
  total_employer_cost numeric(12,2) NOT NULL DEFAULT 0.00,
  earnings_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  deductions_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  attendance_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'held')),
  payslip_number text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(payroll_run_id, employee_id)
);

-- 6. 13th-Month Pay Records (Annual Republic Act 851 Compliance)
CREATE TABLE IF NOT EXISTS thirteenth_month_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  employee_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  months_worked numeric(4,2) NOT NULL DEFAULT 12.00,
  total_basic_earned numeric(12,2) NOT NULL DEFAULT 0.00,
  thirteenth_month_pay numeric(12,2) NOT NULL DEFAULT 0.00,
  adjustments numeric(10,2) NOT NULL DEFAULT 0.00,
  adjustment_reason text,
  final_payout numeric(12,2) NOT NULL DEFAULT 0.00,
  status text NOT NULL DEFAULT 'calculated' CHECK (status IN ('calculated', 'reviewed', 'approved', 'released')),
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(year, employee_id)
);

-- 7. Payroll System Settings (Configurable Statutory Tables & Policy Options)
CREATE TABLE IF NOT EXISTS payroll_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 8. Payroll Audit Logs (Tamper-evident Audit Trail)
CREATE TABLE IF NOT EXISTS payroll_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL, -- PAYROLL_CREATED, PAYROLL_CALCULATED, PAYROLL_SUBMITTED, PAYROLL_APPROVED, etc.
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name text NOT NULL DEFAULT 'System Staff',
  target_id text,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for high-performance querying
CREATE INDEX IF NOT EXISTS idx_employee_comp_emp ON employee_compensation(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_comp_branch ON employee_compensation(branch_id);
CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON attendance_records(employee_id, work_date);
CREATE INDEX IF NOT EXISTS idx_attendance_branch ON attendance_records(branch_id);
CREATE INDEX IF NOT EXISTS idx_commission_emp ON commission_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_commission_status ON commission_records(status);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_status ON payroll_runs(status);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_period ON payroll_runs(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_payroll_items_run ON payroll_items(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_emp ON payroll_items(employee_id);
CREATE INDEX IF NOT EXISTS idx_thirteenth_year ON thirteenth_month_records(year);
CREATE INDEX IF NOT EXISTS idx_payroll_audit_created ON payroll_audit_logs(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE employee_compensation ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE thirteenth_month_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_audit_logs ENABLE ROW LEVEL SECURITY;

-- Seed Initial Default Payroll Settings
INSERT INTO payroll_settings (key, value, description)
VALUES 
(
  'statutory_rates',
  '{
    "sss": {
      "employee_rate": 0.05,
      "employer_rate": 0.095,
      "msc_min": 5000,
      "msc_max": 35000,
      "ec_threshold": 15000,
      "ec_low": 10,
      "ec_high": 30
    },
    "philhealth": {
      "rate": 0.05,
      "employee_share": 0.025,
      "employer_share": 0.025,
      "salary_floor": 10000,
      "salary_ceiling": 100000
    },
    "pagibig": {
      "employee_rate": 0.02,
      "employer_rate": 0.02,
      "standard_max": 200.00
    },
    "withholding_tax_version": "TRAIN_LAW_2023_2026"
  }'::jsonb,
  'Official Philippine Statutory Rates for SSS, PhilHealth, Pag-IBIG, and BIR TRAIN Law'
),
(
  'overtime_multipliers',
  '{
    "regular_workday": 1.25,
    "rest_day": 1.30,
    "rest_day_ot": 1.69,
    "special_holiday": 1.30,
    "special_holiday_ot": 1.69,
    "regular_holiday": 2.00,
    "regular_holiday_ot": 2.60,
    "rest_day_special_holiday": 1.50,
    "rest_day_regular_holiday": 2.60,
    "night_differential": 0.10
  }'::jsonb,
  'Standard Philippine DOLE Overtime and Holiday multiplier factors'
),
(
  'schedule_policy',
  '{
    "standard_daily_hours": 8,
    "working_days_per_month": 26,
    "contribution_schedule": "split_50_50",
    "semi_monthly_cutoffs": [
      { "period": "1st_half", "start_day": 1, "end_day": 15, "pay_day": 20 },
      { "period": "2nd_half", "start_day": 16, "end_day": "end_of_month", "pay_day": 5 }
    ]
  }'::jsonb,
  'Cutoff rules and contribution deduction frequency settings'
)
ON CONFLICT (key) DO NOTHING;

-- RLS Policies
-- Service Role and Admins have full access; Staff have self-service payslip read access
CREATE POLICY "Staff read own payslips" ON payroll_items
  FOR SELECT
  USING (
    auth.uid() = employee_id OR 
    EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid() AND staff.is_active = true)
  );

CREATE POLICY "Staff manage payroll" ON payroll_items
  FOR ALL
  USING (EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid() AND staff.is_active = true));

CREATE POLICY "Staff manage runs" ON payroll_runs
  FOR ALL
  USING (EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid() AND staff.is_active = true));

CREATE POLICY "Staff manage comp" ON employee_compensation
  FOR ALL
  USING (EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid() AND staff.is_active = true));

CREATE POLICY "Staff manage attendance" ON attendance_records
  FOR ALL
  USING (EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid() AND staff.is_active = true));

CREATE POLICY "Staff manage commissions" ON commission_records
  FOR ALL
  USING (EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid() AND staff.is_active = true));

CREATE POLICY "Staff manage 13th" ON thirteenth_month_records
  FOR ALL
  USING (EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid() AND staff.is_active = true));

CREATE POLICY "Staff manage settings" ON payroll_settings
  FOR ALL
  USING (EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid() AND staff.is_active = true));

CREATE POLICY "Staff view audit" ON payroll_audit_logs
  FOR ALL
  USING (EXISTS (SELECT 1 FROM staff WHERE staff.id = auth.uid() AND staff.is_active = true));

-- ==============================================================================
-- 9. PAYROLL RBAC PERMISSIONS SEED & MAPPING
-- ==============================================================================

INSERT INTO permissions (key, name, module) VALUES
  ('payroll.view', 'View Payroll Module', 'payroll'),
  ('payroll.manage_salary', 'Manage Employee Salary & Compensation', 'payroll'),
  ('payroll.manage_attendance', 'Log Attendance & Overtime', 'payroll'),
  ('payroll.manage_commissions', 'Manage Commissions', 'payroll'),
  ('payroll.process', 'Process & Calculate Payroll', 'payroll'),
  ('payroll.approve', 'Approve Payroll Runs', 'payroll'),
  ('payroll.release', 'Release & Finalize Payroll', 'payroll'),
  ('payroll.reports', 'View & Export Payroll Reports', 'payroll'),
  ('payroll.settings', 'Manage Statutory & Payroll Settings', 'payroll')
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

    -- Super Admin gets all payroll permissions
    IF v_super_admin_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT v_super_admin_id, id FROM permissions WHERE module = 'payroll'
        ON CONFLICT DO NOTHING;
    END IF;

    -- Admin gets all payroll permissions
    IF v_admin_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT v_admin_id, id FROM permissions WHERE module = 'payroll'
        ON CONFLICT DO NOTHING;
    END IF;

    -- Manager gets view, attendance, commissions, and reports
    IF v_manager_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT v_manager_id, id FROM permissions 
        WHERE key IN ('payroll.view', 'payroll.manage_attendance', 'payroll.manage_commissions', 'payroll.reports')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Update has_permission to ensure super_admin always bypasses
CREATE OR REPLACE FUNCTION has_permission(p_user_id uuid, p_permission_key text)
RETURNS boolean AS $$
DECLARE
    v_has_permission boolean;
    v_role_name text;
BEGIN
    SELECT r.name INTO v_role_name
    FROM staff s
    JOIN roles r ON s.role_id = r.id
    WHERE s.id = p_user_id AND s.is_active = true;

    IF v_role_name = 'super_admin' THEN
        RETURN true;
    END IF;

    SELECT EXISTS (
        SELECT 1 
        FROM staff s
        JOIN role_permissions rp ON s.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE s.id = p_user_id 
        AND p.key = p_permission_key
        AND s.is_active = true
    ) INTO v_has_permission;
    
    RETURN COALESCE(v_has_permission, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
