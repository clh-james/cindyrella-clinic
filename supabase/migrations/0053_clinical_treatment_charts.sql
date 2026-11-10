-- ==============================================================================
-- Migration 0053: Clinical Treatment Charting & EMR Notes System
-- Enables aestheticians and clinical staff to record precise procedural parameters,
-- needle size/depth, laser settings, serum/products, skin reaction, and practitioner endorsements.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS clinical_treatment_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  treatment_id UUID REFERENCES treatments(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  package_id UUID REFERENCES customer_packages(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  treatment_name TEXT NOT NULL,
  session_number INT NOT NULL DEFAULT 1,
  total_sessions_planned INT DEFAULT 6,
  chart_date DATE NOT NULL DEFAULT CURRENT_DATE,
  performed_by_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  performed_by_name TEXT NOT NULL,
  performed_by_role TEXT DEFAULT 'Aesthetician',
  
  -- Clinical Procedure Parameters (JSONB for rich flexible attributes)
  needle_parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  energy_parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  products_used JSONB NOT NULL DEFAULT '{}'::jsonb,
  skin_reaction JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Narrative Clinical & Endorsement Records
  clinical_notes TEXT,
  endorsement_notes TEXT, -- Critical notes handed off to the next aesthetician
  homecare_advice TEXT,
  next_recommended_date DATE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_clinical_charts_customer ON clinical_treatment_charts(customer_id);
CREATE INDEX IF NOT EXISTS idx_clinical_charts_treatment ON clinical_treatment_charts(treatment_name);
CREATE INDEX IF NOT EXISTS idx_clinical_charts_date ON clinical_treatment_charts(chart_date DESC);
CREATE INDEX IF NOT EXISTS idx_clinical_charts_performed_by ON clinical_treatment_charts(performed_by_id);

-- Enable Row Level Security
ALTER TABLE clinical_treatment_charts ENABLE ROW LEVEL SECURITY;

-- Staff RLS Policies
DROP POLICY IF EXISTS "Staff can view clinical charts" ON clinical_treatment_charts;
CREATE POLICY "Staff can view clinical charts"
  ON clinical_treatment_charts FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Staff can insert clinical charts" ON clinical_treatment_charts;
CREATE POLICY "Staff can insert clinical charts"
  ON clinical_treatment_charts FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Staff can update clinical charts" ON clinical_treatment_charts;
CREATE POLICY "Staff can update clinical charts"
  ON clinical_treatment_charts FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Staff can delete clinical charts" ON clinical_treatment_charts;
CREATE POLICY "Staff can delete clinical charts"
  ON clinical_treatment_charts FOR DELETE
  USING (true);

-- Register RBAC permissions
INSERT INTO permissions (key, name, module)
VALUES 
  ('customers.charts_view', 'View Clinical Treatment Charts & EMR', 'customers'),
  ('customers.charts_create', 'Chart Treatment Session & Clinical Notes', 'customers'),
  ('customers.charts_delete', 'Delete Clinical Treatment Chart', 'customers')
ON CONFLICT (key) DO NOTHING;

-- Grant permissions to roles
DO $$
DECLARE
  v_perm RECORD;
  v_role RECORD;
BEGIN
  -- View & Create for all practitioners and clinical staff
  FOR v_perm IN SELECT id FROM permissions WHERE key IN ('customers.charts_view', 'customers.charts_create') LOOP
    FOR v_role IN SELECT id FROM roles WHERE name IN ('super_admin', 'admin', 'manager', 'aesthetician', 'staff') LOOP
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (v_role.id, v_perm.id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  -- Delete for managers & admins only
  FOR v_perm IN SELECT id FROM permissions WHERE key = 'customers.charts_delete' LOOP
    FOR v_role IN SELECT id FROM roles WHERE name IN ('super_admin', 'admin', 'manager') LOOP
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (v_role.id, v_perm.id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

