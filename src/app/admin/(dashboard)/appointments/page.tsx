import { createClient } from "@/lib/supabase/server";
import { StatusSelect } from "@/components/admin/StatusSelect";
import { SendReminderButton } from "@/components/admin/SendReminderButton";

const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;

export const metadata = { title: "Appointments — Admin" };

export default async function AppointmentsPage() {
  const supabase = await createClient();
  const { data: appointments } = await supabase
    .from("appointments")
    .select(
      "id, reference_number, appointment_date, appointment_time, status, amount_due, payment_method, treatments(name), branches(name), customers(first_name, last_name, phone)"
    )
    .order("appointment_date", { ascending: false })
    .limit(100);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-ink">Appointments</h1>
          <p className="mt-1 text-sm text-ink-soft">Most recent 100 bookings across all branches.</p>
        </div>
        <button className="flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-royal hover:text-royal">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export CSV
        </button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[880px] border-collapse text-sm">
          <thead>
            <tr className="bg-pale text-left text-ink">
              <th className="px-5 py-3 font-medium">Reference</th>
              <th className="px-5 py-3 font-medium">Client</th>
              <th className="px-5 py-3 font-medium">Treatment</th>
              <th className="px-5 py-3 font-medium">Branch</th>
              <th className="px-5 py-3 font-medium">When</th>
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Reminder</th>
            </tr>
          </thead>
          <tbody>
            {(appointments ?? []).map((a) => {
              const treatment = a.treatments as unknown as { name: string } | null;
              const branch = a.branches as unknown as { name: string } | null;
              const customer = a.customers as unknown as
                | { first_name: string; last_name: string; phone: string }
                | null;
              return (
                <tr key={a.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3 font-mono text-xs text-ink-soft">{a.reference_number}</td>
                  <td className="px-5 py-3 text-ink">
                    {customer?.first_name} {customer?.last_name}
                    <div className="text-xs text-ink-soft">{customer?.phone}</div>
                  </td>
                  <td className="px-5 py-3 text-ink-soft">{treatment?.name}</td>
                  <td className="px-5 py-3 text-ink-soft">{branch?.name}</td>
                  <td className="px-5 py-3 text-ink-soft">
                    {a.appointment_date} · {a.appointment_time}
                  </td>
                  <td className="px-5 py-3 text-ink-soft">{peso(a.amount_due)}</td>
                  <td className="px-5 py-3">
                    <StatusSelect appointmentId={a.id} status={a.status} />
                  </td>
                  <td className="px-5 py-3">
                    <SendReminderButton appointmentId={a.id} />
                  </td>
                </tr>
              );
            })}
            {(appointments ?? []).length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-sm text-ink-soft">
                  No appointments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
