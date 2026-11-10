-- Migration 0050: Add payroll.view_own permission
-- Allows staff/cashier/aesthetician to view only their own payslips

-- 1. Insert the new permission if not exists
INSERT INTO permissions (key, name, module)
VALUES ('payroll.view_own', 'View Own Payslip', 'payroll')
ON CONFLICT (key) DO NOTHING;

-- 2. Assign to staff, cashier, and aesthetician roles
DO $$
DECLARE
  v_perm_id UUID;
  v_role_name TEXT;
  v_role_id UUID;
  v_target_roles TEXT[] := ARRAY['staff', 'cashier', 'aesthetician'];
BEGIN
  SELECT id INTO v_perm_id FROM permissions WHERE key = 'payroll.view_own';

  IF v_perm_id IS NULL THEN
    RAISE EXCEPTION 'Permission payroll.view_own not found after insert';
  END IF;

  FOREACH v_role_name IN ARRAY v_target_roles LOOP
    SELECT id INTO v_role_id FROM roles WHERE name = v_role_name;
    IF v_role_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (v_role_id, v_perm_id)
      ON CONFLICT DO NOTHING;
      RAISE NOTICE 'Assigned payroll.view_own to role: %', v_role_name;
    ELSE
      RAISE NOTICE 'Role not found, skipping: %', v_role_name;
    END IF;
  END LOOP;
END $$;

