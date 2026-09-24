-- ==============================================================================
-- PHASE 1: RBAC FOUNDATION & MIGRATION
-- ==============================================================================

-- 1. Create robust RBAC tables
create table if not exists roles (
    id uuid primary key default gen_random_uuid(),
    name text unique not null,
    description text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists permissions (
    id uuid primary key default gen_random_uuid(),
    key text unique not null,
    name text not null,
    description text,
    module text not null,
    created_at timestamptz not null default now()
);

create table if not exists role_permissions (
    role_id uuid references roles(id) on delete cascade,
    permission_id uuid references permissions(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (role_id, permission_id)
);

create table if not exists audit_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete set null,
    action text not null,
    resource_type text,
    resource_id text,
    branch_id uuid references branches(id) on delete set null,
    metadata jsonb,
    created_at timestamptz not null default now()
);

-- Enable RLS on new tables
alter table roles enable row level security;
alter table permissions enable row level security;
alter table role_permissions enable row level security;
alter table audit_logs enable row level security;

-- 2. Seed default Roles
insert into roles (name, description) values
('super_admin', 'Full system access and security administration'),
('admin', 'Full operational access'),
('manager', 'Operational management and reporting'),
('cashier', 'POS and customer handling'),
('staff', 'Treatment and service focused')
on conflict (name) do nothing;

-- 3. Seed Permissions
insert into permissions (key, name, module) values
-- Dashboard
('dashboard.view', 'View Dashboard', 'dashboard'),
-- POS
('pos.view', 'View POS', 'pos'),
('pos.create_sale', 'Create Sale', 'pos'),
('pos.apply_discount', 'Apply Discount', 'pos'),
('pos.custom_discount', 'Apply Custom Discount', 'pos'),
('pos.process_payment', 'Process Payment', 'pos'),
('pos.print_receipt', 'Print Receipt', 'pos'),
-- Appointments
('appointments.view', 'View Appointments', 'appointments'),
('appointments.create', 'Create Appointments', 'appointments'),
('appointments.edit', 'Edit Appointments', 'appointments'),
('appointments.cancel', 'Cancel Appointments', 'appointments'),
('appointments.complete', 'Complete Appointments', 'appointments'),
-- Customers
('customers.view', 'View Customers', 'customers'),
('customers.create', 'Create Customers', 'customers'),
('customers.edit', 'Edit Customers', 'customers'),
('customers.delete', 'Delete Customers', 'customers'),
-- Services
('services.view', 'View Services', 'services'),
('services.create', 'Create Services', 'services'),
('services.edit', 'Edit Services', 'services'),
('services.delete', 'Delete Services', 'services'),
('services.change_price', 'Change Service Price', 'services'),
-- Inventory
('inventory.view', 'View Inventory', 'inventory'),
('inventory.create', 'Create Inventory', 'inventory'),
('inventory.edit', 'Edit Inventory', 'inventory'),
('inventory.adjust', 'Adjust Inventory Stock', 'inventory'),
('inventory.delete', 'Delete Inventory', 'inventory'),
-- Promos
('promos.view', 'View Promos', 'promos'),
('promos.create', 'Create Promos', 'promos'),
('promos.edit', 'Edit Promos', 'promos'),
('promos.delete', 'Delete Promos', 'promos'),
-- Gallery
('gallery.view', 'View Gallery', 'gallery'),
('gallery.create', 'Create Gallery', 'gallery'),
('gallery.edit', 'Edit Gallery', 'gallery'),
('gallery.delete', 'Delete Gallery', 'gallery'),
-- Staff
('staff.view', 'View Staff', 'staff'),
('staff.create', 'Create Staff', 'staff'),
('staff.edit', 'Edit Staff', 'staff'),
('staff.delete', 'Delete Staff', 'staff'),
-- Reports
('reports.view', 'View Reports', 'reports'),
('reports.sales', 'View Sales Reports', 'reports'),
('reports.inventory', 'View Inventory Reports', 'reports'),
('reports.staff', 'View Staff Reports', 'reports'),
('reports.financial', 'View Financial Reports', 'reports'),
-- Payments (Sensitive)
('payments.view', 'View Payments', 'payments'),
('payments.refund', 'Refund Payments', 'payments'),
('payments.void', 'Void Payments', 'payments'),
-- Users & Security
('users.view', 'View Users', 'users'),
('users.create', 'Create Users', 'users'),
('users.edit', 'Edit Users', 'users'),
('users.delete', 'Delete Users', 'users'),
('users.assign_role', 'Assign Roles', 'users'),
-- Settings & Branches
('settings.view', 'View Settings', 'settings'),
('settings.edit', 'Edit Settings', 'settings'),
('branches.view', 'View Branches', 'branches'),
('branches.create', 'Create Branches', 'branches'),
('branches.edit', 'Edit Branches', 'branches'),
('branches.delete', 'Delete Branches', 'branches'),
('audit_logs.view', 'View Audit Logs', 'audit_logs')
on conflict (key) do nothing;

-- 4. Map Permissions to Roles (Simplified mappings)
do $$
declare
    v_super_admin_id uuid;
    v_admin_id uuid;
    v_manager_id uuid;
    v_cashier_id uuid;
    v_staff_id uuid;
begin
    select id into v_super_admin_id from roles where name = 'super_admin';
    select id into v_admin_id from roles where name = 'admin';
    select id into v_manager_id from roles where name = 'manager';
    select id into v_cashier_id from roles where name = 'cashier';
    select id into v_staff_id from roles where name = 'staff';

    -- Super Admin gets everything
    insert into role_permissions (role_id, permission_id)
    select v_super_admin_id, id from permissions
    on conflict do nothing;

    -- Admin gets most operational things, but maybe not assigning roles
    insert into role_permissions (role_id, permission_id)
    select v_admin_id, id from permissions 
    where module not in ('users', 'audit_logs')
    on conflict do nothing;

    -- Cashier gets POS, customers, appointments
    insert into role_permissions (role_id, permission_id)
    select v_cashier_id, id from permissions 
    where key in (
        'pos.view', 'pos.create_sale', 'pos.apply_discount', 'pos.process_payment', 'pos.print_receipt',
        'customers.view', 'customers.create', 'customers.edit',
        'appointments.view', 'appointments.create', 'appointments.edit'
    )
    on conflict do nothing;
    
    -- Staff gets limited access
    insert into role_permissions (role_id, permission_id)
    select v_staff_id, id from permissions 
    where key in (
        'appointments.view', 'appointments.complete',
        'customers.view'
    )
    on conflict do nothing;
end $$;

-- 5. Safe Migration of existing staff table
-- Step A: Add the new role_id column
alter table staff add column if not exists role_id uuid references roles(id);

-- Step B: Migrate existing enum data over to the new table
update staff 
set role_id = (select id from roles where name = 'super_admin') 
where role::text = 'admin';

update staff 
set role_id = (select id from roles where name = 'cashier') 
where role::text = 'receptionist';

update staff 
set role_id = (select id from roles where name = 'staff') 
where role::text in ('nurse', 'doctor');

-- Step C: If any staff don't have a mapped role somehow, default them to staff
update staff set role_id = (select id from roles where name = 'staff') where role_id is null;

-- Step D: Make role_id NOT NULL now that data is seeded
alter table staff alter column role_id set not null;

-- Step E: Drop old enum column (we keep branch_id, it is already our scope)
alter table staff drop column if exists role;

-- 6. Helper function for RLS and Server checks
create or replace function has_permission(p_user_id uuid, p_permission_key text)
returns boolean as $$
declare
    v_has_permission boolean;
begin
    -- Super simple query: join staff -> role_permissions -> permissions
    select exists (
        select 1 
        from staff s
        join role_permissions rp on s.role_id = rp.role_id
        join permissions p on rp.permission_id = p.id
        where s.id = p_user_id 
        and p.key = p_permission_key
        and s.is_active = true
    ) into v_has_permission;
    
    return v_has_permission;
end;
$$ language plpgsql security definer set search_path = public;
