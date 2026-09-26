-- 1. Insert missing permissions used by AdminShell and Middleware
insert into permissions (key, name, module) values
('transactions.view', 'View Transactions', 'transactions'),
('cashier.view', 'View Cashier/Shifts', 'cashier'),
('cashier.manage', 'Manage Shifts', 'cashier')
on conflict (key) do nothing;

-- 2. Assign these new permissions to the admin and manager roles
do $$
declare
    v_super_admin_id uuid;
    v_admin_id uuid;
    v_manager_id uuid;
    v_cashier_id uuid;
    
    v_perm_tx uuid;
    v_perm_cash_v uuid;
    v_perm_cash_m uuid;
begin
    select id into v_super_admin_id from roles where name = 'super_admin';
    select id into v_admin_id from roles where name = 'admin';
    select id into v_manager_id from roles where name = 'manager';
    select id into v_cashier_id from roles where name = 'cashier';

    select id into v_perm_tx from permissions where key = 'transactions.view';
    select id into v_perm_cash_v from permissions where key = 'cashier.view';
    select id into v_perm_cash_m from permissions where key = 'cashier.manage';

    -- Transactions & Cashier View to Admin/Manager/Cashier
    insert into role_permissions (role_id, permission_id) values
    (v_super_admin_id, v_perm_tx),
    (v_super_admin_id, v_perm_cash_v),
    (v_super_admin_id, v_perm_cash_m),

    (v_admin_id, v_perm_tx),
    (v_admin_id, v_perm_cash_v),
    (v_admin_id, v_perm_cash_m),

    (v_manager_id, v_perm_tx),
    (v_manager_id, v_perm_cash_v),
    (v_manager_id, v_perm_cash_m),

    (v_cashier_id, v_perm_tx),
    (v_cashier_id, v_perm_cash_v)
    on conflict do nothing;
end;
$$;
