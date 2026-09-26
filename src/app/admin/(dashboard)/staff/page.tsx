import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { hasServerPermission } from "@/lib/rbac";
import { InviteStaffForm } from "@/components/admin/InviteStaffForm";
import { StaffRowControls } from "@/components/admin/StaffRowControls";

export const metadata = { title: "Staff — Admin" };

export default async function StaffPage() {
  const session = await requireStaff();
  const supabase = await createClient();

  const [{ data: staff }, { data: branches }, { data: roles }] = await Promise.all([
    supabase
      .from("staff")
      .select("id, full_name, is_active, role_id, branches(name), roles(id, name)")
      .order("full_name"),
    supabase.from("branches").select("*").order("name"),
    supabase.from("roles").select("id, name").order("name"),
  ]);

  const canCreateStaff = await hasServerPermission("staff.create");
  const canAssignRole = await hasServerPermission("users.assign_role");

  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-2xl font-semibold text-ink">Staff</h1>
      <p className="mt-1 text-sm text-ink-soft">
        {canCreateStaff || canAssignRole
          ? "Add clinic staff and manage their roles."
          : "View clinic staff details."}
      </p>

      {canCreateStaff && (
        <section className="mt-6 rounded-2xl border border-line p-6">
          <h2 className="text-sm font-semibold text-ink">Add a staff member</h2>
          <p className="mt-1 text-xs text-ink-soft">
            Creates a login and shows a one-time temporary password to share
            with them directly — no email is sent yet.
          </p>
          <div className="mt-4">
            <InviteStaffForm branches={branches ?? []} roles={roles ?? []} />
          </div>
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-line p-6">
        <h2 className="text-sm font-semibold text-ink">Everyone</h2>
        <ul className="mt-4 divide-y divide-line">
          {(staff ?? []).map((s) => {
            const branch = s.branches as unknown as { name: string } | null;
            const staffRole = s.roles as unknown as { id: string, name: string } | null;
            return (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className={`font-medium ${s.is_active ? "text-ink" : "text-ink-soft line-through"}`}>
                    {s.full_name}
                  </p>
                  <p className="text-xs text-ink-soft">{branch?.name ?? "Unassigned branch"}</p>
                </div>
                {canAssignRole ? (
                  <StaffRowControls 
                    staffId={s.id} 
                    roleId={s.role_id} 
                    isActive={s.is_active} 
                    availableRoles={roles ?? []} 
                  />
                ) : (
                  <span className="text-xs capitalize text-ink-soft">{staffRole?.name?.replace('_', ' ') || "staff"}</span>
                )}
              </li>
            );
          })}
          {(staff ?? []).length === 0 && (
            <li className="py-3 text-sm text-ink-soft">No staff yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
