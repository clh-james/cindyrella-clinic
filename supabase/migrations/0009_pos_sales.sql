-- Create pos_sales table
create table if not exists pos_sales (
  id uuid primary key default gen_random_uuid(),
  reference_number text unique not null,
  total_amount integer not null,
  payment_method text not null, -- e.g., 'cash', 'card', 'maya', 'gcash'
  customer_id uuid references customers(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Create pos_sale_items table
create table if not exists pos_sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references pos_sales(id) on delete cascade,
  item_id uuid not null references inventory_items(id) on delete cascade,
  quantity integer not null,
  price_per_unit integer not null
);

-- Enable RLS
alter table pos_sales enable row level security;
alter table pos_sale_items enable row level security;

-- Only staff can manage pos sales
create policy "staff manage pos sales" on pos_sales
  for all using (is_staff()) with check (is_staff());

create policy "staff manage pos sale items" on pos_sale_items
  for all using (is_staff()) with check (is_staff());

-- Add 'price' column to inventory_items to support selling them
alter table inventory_items add column if not exists retail_price integer;

-- Update the deduct_inventory_for_sale function
create or replace function deduct_inventory_for_sale(p_sale_id uuid, p_user_id uuid)
returns void as $$
declare
  r record;
begin
  for r in 
    select item_id, quantity 
    from pos_sale_items 
    where sale_id = p_sale_id
  loop
    -- Deduct stock
    update inventory_items
    set current_stock = current_stock - r.quantity,
        updated_at = now()
    where id = r.item_id;

    -- Create log entry
    insert into inventory_logs (item_id, change_amount, reason, created_by)
    values (r.item_id, -r.quantity, 'Retail Sale', p_user_id);
  end loop;
end;
$$ language plpgsql security definer;
