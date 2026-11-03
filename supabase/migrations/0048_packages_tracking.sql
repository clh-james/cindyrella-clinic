-- Migration 0048: Treatment Packages & Session Credits Tracking System
-- Provides multi-session package tracking (e.g. 5+1 or 10+2 sessions), customer balances, and session redemption logs.

-- 1. Packages Template Table (Catalog of Packages offered by the clinic)
CREATE TABLE IF NOT EXISTS packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  treatment_id UUID REFERENCES treatments(id) ON DELETE SET NULL,
  package_type TEXT NOT NULL DEFAULT 'sessions', -- 'sessions', 'combo', 'custom'
  total_sessions INT NOT NULL DEFAULT 6,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  validity_months INT DEFAULT 12,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Customer Packages Table (Purchased balances per customer)
CREATE TABLE IF NOT EXISTS customer_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_code TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
  treatment_id UUID REFERENCES treatments(id) ON DELETE SET NULL,
  package_name TEXT NOT NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  total_sessions INT NOT NULL DEFAULT 6,
  used_sessions INT NOT NULL DEFAULT 0,
  remaining_sessions INT NOT NULL DEFAULT 6,
  price_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'cancelled')),
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Package Redemptions Table (Audit log of each session availed)
CREATE TABLE IF NOT EXISTS package_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_package_id UUID NOT NULL REFERENCES customer_packages(id) ON DELETE CASCADE,
  session_number INT NOT NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  performed_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT
);

-- 4. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_customer_packages_customer ON customer_packages(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_packages_status ON customer_packages(status);
CREATE INDEX IF NOT EXISTS idx_package_redemptions_pkg ON package_redemptions(customer_package_id);

-- 5. Seed default permissions for packages
INSERT INTO permissions (key, name, description, module)
VALUES 
  ('packages.view', 'View Packages', 'Allows viewing package catalog and customer package session balances', 'packages'),
  ('packages.create', 'Create Packages', 'Allows creating and assigning packages to customers', 'packages'),
  ('packages.redeem', 'Redeem Package Sessions', 'Allows deducting and claiming a package session for a customer', 'packages')
ON CONFLICT (key) DO NOTHING;

-- Grant permissions to super_admin and admin
DO $$
DECLARE
  v_role_id UUID;
  v_perm_id UUID;
  r_perm RECORD;
BEGIN
  FOR r_perm IN SELECT id FROM permissions WHERE module = 'packages' LOOP
    FOR v_role_id IN SELECT id FROM roles WHERE name IN ('super_admin', 'admin', 'manager') LOOP
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (v_role_id, r_perm.id)
      ON CONFLICT DO NOTHING;
    END LOOP;
    
    -- Also allow staff to view and redeem sessions
    FOR v_role_id IN SELECT id FROM roles WHERE name IN ('staff', 'cashier') LOOP
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT v_role_id, p.id FROM permissions p WHERE p.key IN ('packages.view', 'packages.redeem')
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
