import { createClient } from "@/lib/supabase/server";
import { BlockDateForm } from "@/components/admin/BlockDateForm";
import { RemoveBlockedDate } from "@/components/admin/RemoveBlockedDate";

export const metadata = { title: "Schedule settings — Admin" };

export default async function SettingsPage() {
  const supabase = await createClient();

  const [{ data: branches }, { data: blockedDates }, { data: branchSettings }] =
    await Promise.all([
      supabase.from("branches").select("*").order("name"),
      supabase
        .from("blocked_dates")
        .select("id, blocked_date, reason, branch_id, branches(name)")
        .order("blocked_date"),
      supabase.from("branch_settings").select("branch_id, max_bookings_per_slot, branches(name)"),
    ]);

  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-2xl font-semibold text-ink">Schedule settings</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Block holidays or maintenance days, and see each branch&apos;s per-slot capacity.
      </p>

      <section className="mt-8 rounded-2xl border border-line p-6">
        <h2 className="text-sm font-semibold text-ink">Blocked dates</h2>
        <div className="mt-4">
          <BlockDateForm branches={branches ?? []} />
        </div>

        <ul className="mt-6 divide-y divide-line">
          {(blockedDates ?? []).length === 0 && (
            <li className="py-3 text-sm text-ink-soft">No blocked dates yet.</li>
          )}
          {(blockedDates ?? []).map((b) => {
            const branch = b.branches as unknown as { name: string } | null;
            return (
              <li key={b.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <span className="font-medium text-ink">{b.blocked_date}</span>
                  <span className="ml-2 text-ink-soft">
                    {branch?.name ?? "All branches"}
                    {b.reason ? ` · ${b.reason}` : ""}
                  </span>
                </div>
                <RemoveBlockedDate id={b.id} />
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-6 rounded-2xl border border-line p-6">
        <h2 className="text-sm font-semibold text-ink">Bookings per time slot</h2>
        <p className="mt-1 text-xs text-ink-soft">
          How many clients can be booked into the same time slot at each branch.
        </p>
        <ul className="mt-4 divide-y divide-line">
          {(branchSettings ?? []).map((s) => {
            const branch = s.branches as unknown as { name: string } | null;
            return (
              <li key={s.branch_id} className="flex items-center justify-between py-3 text-sm">
                <span className="text-ink">{branch?.name}</span>
                <span className="font-medium text-ink">{s.max_bookings_per_slot} / slot</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
