-- ==============================================================================
-- Migration 0052: Digital Consent Waiver & Medical Intake Form System
-- Enables paperless iPad / tablet signing, clinical waivers, & auto health updates
-- ==============================================================================

CREATE TABLE IF NOT EXISTS customer_waivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  treatment_name TEXT NOT NULL,
  form_type TEXT NOT NULL DEFAULT 'general_treatment',
  medical_history JSONB NOT NULL DEFAULT '{}'::jsonb,
  consent_acknowledgements JSONB NOT NULL DEFAULT '{}'::jsonb,
  signature_data_url TEXT NOT NULL,
  signer_full_name TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  staff_witness_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  staff_witness_name TEXT,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'signed' CHECK (status IN ('signed', 'revoked', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_waivers_customer_id ON customer_waivers(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_waivers_appointment_id ON customer_waivers(appointment_id);
CREATE INDEX IF NOT EXISTS idx_customer_waivers_signed_at ON customer_waivers(signed_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_waivers_status ON customer_waivers(status);

-- Enable Row Level Security
ALTER TABLE customer_waivers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Staff can view waivers" ON customer_waivers;
CREATE POLICY "Staff can view waivers"
  ON customer_waivers FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Staff can insert waivers" ON customer_waivers;
CREATE POLICY "Staff can insert waivers"
  ON customer_waivers FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Staff can update waivers" ON customer_waivers;
CREATE POLICY "Staff can update waivers"
  ON customer_waivers FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Staff can delete waivers" ON customer_waivers;
CREATE POLICY "Staff can delete waivers"
  ON customer_waivers FOR DELETE
  USING (true);

-- Register RBAC permissions
INSERT INTO permissions (key, name, module)
VALUES 
  ('customers.waivers_view', 'View Customer Consent Waivers', 'customers'),
  ('customers.waivers_sign', 'Initiate & Record Customer Consent Waivers', 'customers'),
  ('customers.waivers_delete', 'Revoke or Delete Customer Consent Waivers', 'customers')
ON CONFLICT (key) DO NOTHING;

-- Grant permissions to roles
DO $$
DECLARE
  v_perm RECORD;
  v_role RECORD;
BEGIN
  -- View & Sign for super_admin, admin, manager, aesthetician, staff
  FOR v_perm IN SELECT id FROM permissions WHERE key IN ('customers.waivers_view', 'customers.waivers_sign') LOOP
    FOR v_role IN SELECT id FROM roles WHERE name IN ('super_admin', 'admin', 'manager', 'aesthetician', 'staff', 'cashier') LOOP
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (v_role.id, v_perm.id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  -- Delete/Revoke for super_admin, admin, manager
  FOR v_perm IN SELECT id FROM permissions WHERE key = 'customers.waivers_delete' LOOP
    FOR v_role IN SELECT id FROM roles WHERE name IN ('super_admin', 'admin', 'manager') LOOP
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (v_role.id, v_perm.id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
