-- ==============================================================================
-- Cindyrella Aesthetic & Wellness Clinic
-- Migration 0042: Add 'maya' and 'card' to payment_method PostgreSQL enum
-- ==============================================================================

DO $$
BEGIN
  -- Add 'maya' to payment_method enum if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'payment_method' AND e.enumlabel = 'maya'
  ) THEN
    ALTER TYPE payment_method ADD VALUE 'maya';
  END IF;

  -- Add 'card' to payment_method enum if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'payment_method' AND e.enumlabel = 'card'
  ) THEN
    ALTER TYPE payment_method ADD VALUE 'card';
  END IF;
END $$;
