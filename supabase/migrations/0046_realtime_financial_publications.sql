-- ==============================================================================
-- Cindyrella Aesthetic & Wellness Clinic
-- Migration 0046: Realtime Publications for Financial Statements Hub
-- Enables supabase_realtime publication for operational & financial tables
-- ==============================================================================

DO $$
BEGIN
  -- Add appointments if not already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'appointments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
  END IF;

  -- Add pos_sales
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'pos_sales'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE pos_sales;
  END IF;

  -- Add pos_sale_items
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'pos_sale_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE pos_sale_items;
  END IF;

  -- Add expenses
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'expenses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
  END IF;

  -- Add installment_payments
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'installment_payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE installment_payments;
  END IF;

  -- Add inventory_movements
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'inventory_movements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE inventory_movements;
  END IF;

  -- Add payroll_runs
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'payroll_runs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE payroll_runs;
  END IF;

  -- Add cashier_shifts
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'cashier_shifts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE cashier_shifts;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Realtime publication configuration notice: %', SQLERRM;
END $$;
