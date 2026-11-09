-- Migration 0049: Add AESTHETICIAN Role and Permissions

-- 1. Insert role if not exists
INSERT INTO roles (name, description)
VALUES ('aesthetician', 'Aesthetician - Clinical treatment, services, and operational access')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- 2. Assign the 27 requested permissions to aesthetician
DO $$
DECLARE
  v_role_id UUID;
  v_keys TEXT[] := ARRAY[
    'announcements.create',
    'announcements.view',
    'appointments.view',
    'attendance.view',
    'branches.view',
    'cashier.view',
    'customers.view',
    'dashboard.view',
    'expenses.export',
    'expenses.reimburse',
    'expenses.view',
    'gallery.view',
    'installments.view',
    'memberships.view',
    'bills.approve',
    'approvals.view',
    'packages.view',
    'payments.view',
    'pos.custom_discount',
    'pos.view',
    'promos.view',
    'reports.financial',
    'reports.sales',
    'reports.staff',
    'reports.view',
    'services.view',
    'transactions.view'
  ];
  k TEXT;
  v_perm_id UUID;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE name = 'aesthetician';

  FOREACH k IN ARRAY v_keys LOOP
    SELECT id INTO v_perm_id FROM permissions WHERE key = k;
    IF v_perm_id IS NOT NULL THEN
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (v_role_id, v_perm_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

