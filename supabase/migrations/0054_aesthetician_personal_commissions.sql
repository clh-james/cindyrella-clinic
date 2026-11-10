-- ==============================================================================
-- Migration 0054: Aesthetician Personal Commission & Daily Session Tracking
-- Enables aestheticians and clinical staff to view their personal daily earnings,
-- serviced sessions, target quotas, and payroll credit status.
-- ==============================================================================

-- 1. Register RBAC permissions
INSERT INTO permissions (key, name, module)
VALUES 
  ('commissions.view_own', 'View Own Daily Commissions & Sessions', 'payroll'),
  ('commissions.claim', 'Submit Manual Commission Claim', 'payroll')
ON CONFLICT (key) DO NOTHING;

-- 2. Grant permissions to aesthetician, staff, cashier, manager, admin, super_admin
DO $$
DECLARE
  v_perm RECORD;
  v_role RECORD;
BEGIN
  FOR v_perm IN SELECT id FROM permissions WHERE key IN ('commissions.view_own', 'commissions.claim') LOOP
    FOR v_role IN SELECT id FROM roles WHERE name IN ('aesthetician', 'staff', 'cashier', 'manager', 'admin', 'super_admin') LOOP
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (v_role.id, v_perm.id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
