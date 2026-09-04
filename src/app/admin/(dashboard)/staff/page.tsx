import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { InviteStaffForm } from "@/components/admin/InviteStaffForm";
import { StaffRowControls } from "@/components/admin/StaffRowControls";

export const metadata = { title: "Staff — Admin" };

export default async function StaffPage() {
  const session = await requireStaff();
  const supabase = await createClient();

  const [{ data: staff }, { data: branches }] = await Promise.all([
    supabase
      .from("staff")
      .select("id, full_name, role, is_active, branches(name)")
      .order("full_name"),
    supabase.from("branches").select("*").order("name"),
  ]);

  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-2xl font-semibold text-ink">Staff</h1>
      <p className="mt-1 text-sm text-ink-soft">
        {session.role === "admin"
          ? "Add clinic staff and manage their roles."
          : "Only admins can add staff or change roles."}
      </p>

      {session.role === "admin" && (
        <section className="mt-6 rounded-2xl border border-line p-6">
          <h2 className="text-sm font-semibold text-ink">Add a staff member</h2>
          <p className="mt-1 text-xs text-ink-soft">
            Creates a login and shows a one-time temporary password to share
            with them directly — no email is sent yet.
          </p>
          <div className="mt-4">
            <InviteStaffForm branches={branches ?? []} />
          </div>
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-line p-6">
        <h2 className="text-sm font-semibold text-ink">Everyone</h2>
        <ul className="mt-4 divide-y divide-line">
          {(staff ?? []).map((s) => {
            const branch = s.branches as unknown as { name: string } | null;
            return (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className={`font-medium ${s.is_active ? "text-ink" : "text-ink-soft line-through"}`}>
                    {s.full_name}
                  </p>
                  <p className="text-xs text-ink-soft">{branch?.name ?? "Unassigned branch"}</p>
                </div>
                {session.role === "admin" ? (
                  <StaffRowControls staffId={s.id} role={s.role} isActive={s.is_active} />
                ) : (
                  <span className="text-xs capitalize text-ink-soft">{s.role}</span>
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
