-- Drop the existing constraint
ALTER TABLE cashier_shifts DROP CONSTRAINT IF EXISTS cashier_shifts_status_check;

-- Add the new constraint with all required statuses
ALTER TABLE cashier_shifts ADD CONSTRAINT cashier_shifts_status_check 
  CHECK (status IN ('open', 'closed', 'variance_review', 'investigation', 'cancelled'));

-- Add missing columns for reconciliation if needed
ALTER TABLE cashier_shifts ADD COLUMN IF NOT EXISTS cash_sales integer default 0;
ALTER TABLE cashier_shifts ADD COLUMN IF NOT EXISTS cash_refunds integer default 0;
ALTER TABLE cashier_shifts ADD COLUMN IF NOT EXISTS closed_by uuid references auth.users(id);
ALTER TABLE cashier_shifts ADD COLUMN IF NOT EXISTS variance_reason text;
