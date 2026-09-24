import React from "react";
import { createClient } from "@/lib/supabase/server";
import { requireServerPermission } from "@/lib/rbac";
import { Shield, Check } from "lucide-react";

export const metadata = { title: "Roles & Permissions — Admin" };

export default async function RolesPage() {
  await requireServerPermission("users.assign_role");
  const supabase = await createClient();

  const [{ data: roles }, { data: permissions }] = await Promise.all([
    supabase.from("roles").select("id, name, description, role_permissions(permission_id)").order("name"),
    supabase.from("permissions").select("id, key, name, module").order("module").order("name")
  ]);

  if (!roles || !permissions) return <div>Failed to load roles.</div>;

  // Group permissions by module
  const modules = permissions.reduce((acc: any, p: any) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex items-center gap-3">
        <Shield className="text-royal" size={28} />
        <h1 className="font-serif text-2xl font-semibold text-ink">Role Management</h1>
      </div>
      <p className="mb-8 text-sm text-ink-soft max-w-2xl">
        Define exactly what each role can see and do within the application. Changes here take effect on the user's next action.
      </p>

      <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#f4f7f9] text-ink-soft">
            <tr>
              <th className="px-6 py-4 font-semibold">Permission Module</th>
              {roles.map(r => (
                <th key={r.id} className="px-4 py-4 text-center font-semibold capitalize border-l border-line/50">
                  {r.name.replace('_', ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {Object.entries(modules).map(([moduleName, perms]: any) => (
              <React.Fragment key={moduleName}>
                <tr className="bg-pale/30">
                  <td colSpan={roles.length + 1} className="px-6 py-2 font-mono text-xs font-bold uppercase tracking-wider text-royal">
                    {moduleName}
                  </td>
                </tr>
                {perms.map((p: any) => (
                  <tr key={p.id} className="hover:bg-pale/50 transition-colors">
                    <td className="px-6 py-3">
                      <p className="font-medium text-ink">{p.name}</p>
                      <p className="text-xs text-ink-soft font-mono mt-0.5">{p.key}</p>
                    </td>
                    {roles.map((r: any) => {
                      const hasPerm = r.role_permissions.some((rp: any) => rp.permission_id === p.id);
                      return (
                        <td key={r.id} className="px-4 py-3 text-center border-l border-line/50">
                          {r.name === 'super_admin' ? (
                            <Check size={18} className="mx-auto text-emerald-500 opacity-50" />
                          ) : (
                            <input 
                              type="checkbox" 
                              checked={hasPerm} 
                              disabled
                              className="h-4 w-4 rounded border-line text-royal focus:ring-royal/20 opacity-70"
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-ink-soft flex items-center justify-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 opacity-50"></span>
        Super Admin permissions are locked and immutable.
      </p>
    </div>
  );
}
