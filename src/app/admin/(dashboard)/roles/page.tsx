import { createClient } from "@/lib/supabase/server";
import { requireServerPermission } from "@/lib/rbac";
import { Shield } from "lucide-react";
import { RolePermissionsTable } from "./RolePermissionsTable";

export const metadata = { title: "Roles & Permissions — Admin" };

type Permission = { id: string, key: string, name: string, module: string };
type Role = { id: string, name: string, description: string, role_permissions: { permission_id: string }[] };

export default async function RolesPage() {
  await requireServerPermission("users.assign_role");
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
