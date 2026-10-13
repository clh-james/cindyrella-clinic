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

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex items-center gap-3">
        <Shield className="text-royal" size={28} />
        <h1 className="font-serif text-2xl font-semibold text-ink">Role Management</h1>
      </div>
      <p className="mb-8 text-sm text-ink-soft max-w-2xl">
        Define exactly what each role can see and do within the application. Changes here take effect on the user&apos;s next action.
      </p>

      <RolePermissionsTable 
        roles={roles as Role[]} 
        permissions={permissions as Permission[]} 
      />

      <p className="mt-4 text-xs text-ink-soft flex items-center justify-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 opacity-50"></span>
        Super Admin permissions are locked and immutable.
      </p>
    </div>
  );
}
