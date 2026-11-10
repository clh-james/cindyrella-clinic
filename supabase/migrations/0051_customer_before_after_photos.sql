-- ==============================================================================
-- Migration 0051: Customer Before & After Photos System
-- Enables clinical photo comparisons, session transformation tracking, & notes
-- ==============================================================================

CREATE TABLE IF NOT EXISTS customer_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  service_id UUID REFERENCES treatments(id) ON DELETE SET NULL,
  photo_type TEXT NOT NULL CHECK (photo_type IN ('before', 'after', 'progress')),
  photo_url TEXT NOT NULL,
  thumbnail_url TEXT,
  treatment_name TEXT,
  session_number INTEGER DEFAULT 1,
  date_taken DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  taken_by_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  taken_by_name TEXT,
  comparison_group_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_photos_customer_id ON customer_photos(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_photos_treatment ON customer_photos(treatment_name);
CREATE INDEX IF NOT EXISTS idx_customer_photos_comparison_group ON customer_photos(comparison_group_id);
CREATE INDEX IF NOT EXISTS idx_customer_photos_date_taken ON customer_photos(date_taken DESC);

-- Enable Row Level Security
ALTER TABLE customer_photos ENABLE ROW LEVEL SECURITY;

-- Staff RLS Policies
DROP POLICY IF EXISTS "Staff can view customer photos" ON customer_photos;
CREATE POLICY "Staff can view customer photos"
  ON customer_photos FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Staff can insert customer photos" ON customer_photos;
CREATE POLICY "Staff can insert customer photos"
  ON customer_photos FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Staff can update customer photos" ON customer_photos;
CREATE POLICY "Staff can update customer photos"
  ON customer_photos FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Staff can delete customer photos" ON customer_photos;
CREATE POLICY "Staff can delete customer photos"
  ON customer_photos FOR DELETE
  USING (true);

-- Register RBAC permissions
INSERT INTO permissions (key, name, module)
VALUES 
  ('customers.photos_view', 'View Customer Before & After Photos', 'customers'),
  ('customers.photos_upload', 'Upload Customer Before & After Photos', 'customers'),
  ('customers.photos_delete', 'Delete Customer Before & After Photos', 'customers')
ON CONFLICT (key) DO NOTHING;

-- Grant permissions to roles
DO $$
DECLARE
  v_perm RECORD;
  v_role RECORD;
BEGIN
  -- View & Upload for clinical staff
  FOR v_perm IN SELECT id FROM permissions WHERE key IN ('customers.photos_view', 'customers.photos_upload') LOOP
    FOR v_role IN SELECT id FROM roles WHERE name IN ('super_admin', 'admin', 'manager', 'aesthetician', 'staff') LOOP
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (v_role.id, v_perm.id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  -- Delete only for management
  FOR v_perm IN SELECT id FROM permissions WHERE key = 'customers.photos_delete' LOOP
    FOR v_role IN SELECT id FROM roles WHERE name IN ('super_admin', 'admin', 'manager') LOOP
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (v_role.id, v_perm.id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

