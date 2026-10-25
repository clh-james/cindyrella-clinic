-- ==============================================================================
-- Cindyrella Aesthetic & Wellness Clinic
-- Migration 0044: Services Handler Attribution, Quotas & Automated Commissions
-- ==============================================================================

-- 1. Add Handler, Commission Rate, and Quota Target to treatments table
ALTER TABLE treatments 
ADD COLUMN IF NOT EXISTS handled_by uuid REFERENCES staff(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS commission_rate numeric(5,2) DEFAULT 10.00,
ADD COLUMN IF NOT EXISTS commission_type text DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'fixed')),
ADD COLUMN IF NOT EXISTS quota_target integer DEFAULT 0;

-- 2. Add Handled By and Commission Status to appointments table
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS handled_by uuid REFERENCES staff(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS commission_amount numeric(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS commission_status text DEFAULT 'none' CHECK (commission_status IN ('none', 'pending', 'approved', 'paid'));

-- 3. Comments for documentation & audit
COMMENT ON COLUMN treatments.handled_by IS 'Primary therapist or aesthetician assigned to perform this service';
COMMENT ON COLUMN treatments.commission_rate IS 'Commission rate (percentage or fixed pesos) attributed to the handler';
COMMENT ON COLUMN treatments.quota_target IS 'Monthly or cutoff target session quota for this service';
COMMENT ON COLUMN appointments.handled_by IS 'Staff member who performed/rendered the treatment for the client';
