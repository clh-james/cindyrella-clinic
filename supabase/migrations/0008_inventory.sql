-- Create inventory_items table
create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text,
  category text not null, -- e.g., 'Vitamins', 'IV Bags', 'Consumables'
  unit text not null, -- e.g., 'ampoules', 'bags', 'ml'
  current_stock integer not null default 0,
  low_stock_threshold integer not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create inventory_logs table for audit trail
create table if not exists inventory_logs (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references inventory_items(id) on delete cascade,
  change_amount integer not null, -- positive for additions, negative for deductions
  reason text not null, -- e.g., 'Treatment Completed', 'Manual Adjustment', 'Restock'
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

-- Create treatment_materials table (The "Recipe" mapping)
create table if not exists treatment_materials (
  id uuid primary key default gen_random_uuid(),
  treatment_id uuid not null references treatments(id) on delete cascade,
  item_id uuid not null references inventory_items(id) on delete cascade,
  quantity_required integer not null default 1,
  unique(treatment_id, item_id)
);

-- Enable RLS
alter table inventory_items enable row level security;
alter table inventory_logs enable row level security;
alter table treatment_materials enable row level security;

-- Only staff can manage inventory
create policy "staff manage inventory" on inventory_items
  for all using (is_staff()) with check (is_staff());

create policy "staff manage inventory logs" on inventory_logs
  for all using (is_staff()) with check (is_staff());

create policy "staff manage treatment materials" on treatment_materials
  for all using (is_staff()) with check (is_staff());

-- Public can read treatment materials (needed for frontend booking calculation potentially, or just staff)
create policy "public read treatment materials" on treatment_materials
  for select using (true);

-- Function to safely deduct inventory and log it
create or replace function deduct_inventory_for_treatment(p_treatment_id uuid, p_user_id uuid)
returns void as $$
declare
  r record;
begin
  for r in 
    select item_id, quantity_required 
    from treatment_materials 
    where treatment_id = p_treatment_id
  loop
    -- Deduct stock
    update inventory_items
    set current_stock = current_stock - r.quantity_required,
        updated_at = now()
    where id = r.item_id;

    -- Create log entry
    insert into inventory_logs (item_id, change_amount, reason, created_by)
    values (r.item_id, -r.quantity_required, 'Treatment Completed', p_user_id);
  end loop;
end;
$$ language plpgsql security definer;
