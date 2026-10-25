-- ==============================================================================
-- Cindyrella Aesthetic & Wellness Clinic
-- Migration 0045: Client Classification for POS
-- Adds client classification tracking: 'walk-in', 'booked', 'boosting_from_main'
-- ==============================================================================

-- 1. Add client_classification to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS client_classification text DEFAULT 'walk-in'
CHECK (client_classification IN ('walk-in', 'booked', 'boosting_from_main', 'boosting from main'));

-- 2. Add client_classification to pos_sales table
ALTER TABLE pos_sales 
ADD COLUMN IF NOT EXISTS client_classification text DEFAULT 'walk-in'
CHECK (client_classification IN ('walk-in', 'booked', 'boosting_from_main', 'boosting from main'));

-- 3. Add client_classification to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS client_classification text DEFAULT 'walk-in';

-- 4. Create indexes for quick reporting and filtering
CREATE INDEX IF NOT EXISTS idx_appointments_client_classification ON appointments(client_classification);
CREATE INDEX IF NOT EXISTS idx_pos_sales_client_classification ON pos_sales(client_classification);

-- 5. Comments
COMMENT ON COLUMN appointments.client_classification IS 'Client classification: walk-in, booked, or boosting_from_main';
COMMENT ON COLUMN pos_sales.client_classification IS 'Client classification for POS retail: walk-in, booked, or boosting_from_main';
COMMENT ON COLUMN customers.client_classification IS 'Client classification / acquisition channel';
