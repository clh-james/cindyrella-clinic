-- 1. Create user_sessions table
create table if not exists user_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    branch_id uuid references branches(id) on delete set null,
    login_at timestamptz not null default now(),
    logout_at timestamptz,
    last_activity_at timestamptz not null default now(),
    session_duration interval,
    ip_address text,
    device text,
    browser text,
    os text,
    status text not null default 'ACTIVE',
    logout_reason text,
    created_at timestamptz not null default now()
);

-- Indexes
create index idx_user_sessions_user_id on user_sessions(user_id);
create index idx_user_sessions_branch_id on user_sessions(branch_id);
create index idx_user_sessions_status on user_sessions(status);
create index idx_user_sessions_login_at on user_sessions(login_at);

-- Enable RLS
alter table user_sessions enable row level security;

-- 2. Add New Security Permissions
insert into permissions (key, name, module) values
('security.view_login_activity', 'View Login Activity', 'security'),
('security.view_active_sessions', 'View Active Sessions', 'security'),
('security.view_failed_logins', 'View Failed Logins', 'security'),
('security.force_logout', 'Force Logout Users', 'security'),
('security.view_audit_logs', 'View Audit Logs', 'security')
on conflict (key) do nothing;

-- 3. Assign Permissions to Super Admin and Admin
do $$
declare
    v_super_admin_id uuid;
    v_admin_id uuid;
begin
    select id into v_super_admin_id from roles where name = 'super_admin';
    select id into v_admin_id from roles where name = 'admin';

    if v_super_admin_id is not null then
        insert into role_permissions (role_id, permission_id)
        select v_super_admin_id, id from permissions where module = 'security'
        on conflict do nothing;
    end if;

    if v_admin_id is not null then
        insert into role_permissions (role_id, permission_id)
        select v_admin_id, id from permissions where module = 'security'
        on conflict do nothing;
    end if;
end $$;
