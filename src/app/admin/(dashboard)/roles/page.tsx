import { createClient } from "@/lib/supabase/server";
import { hasServerPermission } from "@/lib/rbac";
import { Shield, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { RolePermissionsTable } from "./RolePermissionsTable";

export const metadata = { title: "Roles & Permissions — Admin" };

type Permission = { id: string, key: string, name: string, module: string };
type Role = { id: string, name: string, description: string, role_permissions: { permission_id: string }[] };

export default async function RolesPage() {
  const hasAccess = await hasServerPermission("users.assign_role");
  if (!hasAccess) {
    return (
      <div className="max-w-xl mx-auto my-12 rounded-2xl border border-line bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <ShieldAlert size={28} />
        </div>
        <h2 className="font-serif text-xl font-semibold text-ink">Access Restricted</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Role &amp; Permission Management is restricted to <strong>Super Admin</strong> accounts.
          Your current account does not have the <code>users.assign_role</code> security permission.
        </p>
        <div className="mt-6">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-xl bg-royal px-5 py-2.5 text-sm font-medium text-white hover:bg-royal-deep transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: roles }, { data: permissions }] = await Promise.all([
    supabase.from("roles").select("id, name, description, role_permissions(permission_id)").order("name"),
    supabase.from("permissions").select("id, key, name, module").order("module").order("name")
  ]);

  if (!roles || !permissions) return <div>Failed to load roles.</div>;

  // Sort roles in logical hierarchy: super_admin, admin, manager, cashier, staff, then custom roles
  const systemPriority: Record<string, number> = {
    super_admin: 1,
    admin: 2,
    manager: 3,
    cashier: 4,
    staff: 5,
  };

  const sortedRoles = [...(roles as Role[])].sort((a, b) => {
    const pA = systemPriority[a.name.toLowerCase()] ?? 99;
    const pB = systemPriority[b.name.toLowerCase()] ?? 99;
    if (pA !== pB) return pA - pB;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="max-w-6xl pb-12">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-royal/10 text-royal">
              <Shield size={24} />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-semibold text-ink">Role &amp; Permission Management</h1>
              <p className="text-sm text-ink-soft">
                Define and configure access rights across all system modules for both default and custom roles.
              </p>
            </div>
          </div>
        </div>
      </div>

      <RolePermissionsTable 
        roles={sortedRoles} 
        permissions={permissions as Permission[]} 
      />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-ink-soft border-t border-line/60 pt-4">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 opacity-60"></span>
          <span><strong>Super Admin</strong> permissions are permanently locked and immutable.</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-royal"></span>
          <span>Custom roles can be created, copied from templates, or safely deleted when unassigned.</span>
        </div>
      </div>
    </div>
  );
}
