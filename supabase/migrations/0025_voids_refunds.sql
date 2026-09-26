-- Add status to pos_sales
alter table pos_sales add column if not exists status text not null default 'completed' check (status in ('completed', 'voided', 'refunded'));

-- Add void_reason to pos_sales
alter table pos_sales add column if not exists void_reason text;

-- Add refunded_amount for partial refunds
alter table pos_sales add column if not exists refunded_amount integer default 0;

-- Add 'voided' to payment_status enum (if not exists requires a DO block)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'payment_status' AND e.enumlabel = 'voided') THEN
    ALTER TYPE payment_status ADD VALUE 'voided';
  END IF;
END
$$;

-- RPC to restock inventory upon void/refund
create or replace function restock_inventory(p_item_id uuid, p_quantity integer, p_user_id uuid, p_reason text)
returns void as $$
begin
  update inventory_items 
  set current_stock = current_stock + p_quantity, 
      updated_at = now() 
  where id = p_item_id;
  
  insert into inventory_logs (item_id, change_amount, reason, created_by) 
  values (p_item_id, p_quantity, p_reason, p_user_id);
end;
$$ language plpgsql security definer;
