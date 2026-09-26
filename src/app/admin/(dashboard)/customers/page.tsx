import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Customers — Admin" };

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data: customers } = await supabase
    .from("customers")
    .select("*, appointments(count)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="font-serif text-xl sm:text-2xl font-semibold text-ink">Customers</h1>
      <p className="mt-1 text-xs sm:text-sm text-ink-soft">View all registered customers and their booking counts.</p>

      {/* MOBILE VIEW (CARDS) */}
      <div className="mt-6 grid gap-4 lg:hidden">
        {(customers ?? []).map((c) => {
          const apptCount = Array.isArray(c.appointments) ? c.appointments[0]?.count : 0;
          
          return (
            <div key={c.id} className="rounded-xl border border-line bg-white p-4 shadow-sm flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-ink text-base">
                    {c.first_name} {c.last_name}
                  </h3>
                  <p className="text-xs text-ink-soft mt-0.5">{c.phone}</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-ink-soft uppercase tracking-wider font-semibold">Bookings</span>
                  <span className="font-mono text-lg font-bold text-royal">{apptCount || 0}</span>
                </div>
              </div>
              
              <div className="mt-2 space-y-1">
                <p className="text-xs text-ink-soft">
                  <span className="font-medium mr-1">Email:</span>
                  {c.email}
                </p>
                <p className="text-xs text-ink-soft line-clamp-2">
                  <span className="font-medium mr-1">Medical Info:</span>
                  {c.medical_conditions || "None"}
                </p>
              </div>
            </div>
          );
        })}
        {(customers ?? []).length === 0 && (
          <div className="py-10 text-center text-sm text-ink-soft border border-line rounded-xl bg-white">
            No customers found.
          </div>
        )}
      </div>

      {/* DESKTOP VIEW (TABLE) */}
      <div className="mt-6 hidden lg:block overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[800px] border-collapse text-sm">
          <thead>
            <tr className="bg-pale text-left text-ink">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Phone</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Medical Info</th>
              <th className="px-5 py-3 font-medium text-center">Bookings</th>
            </tr>
          </thead>
          <tbody>
            {(customers ?? []).map((c) => {
              const apptCount = Array.isArray(c.appointments) ? c.appointments[0]?.count : 0;
              
              return (
                <tr key={c.id} className="border-b border-line last:border-0 hover:bg-pale/50 transition-colors">
                  <td className="px-5 py-3 font-medium text-ink">
                    {c.first_name} {c.last_name}
                  </td>
                  <td className="px-5 py-3 text-ink-soft">{c.phone}</td>
                  <td className="px-5 py-3 text-ink-soft">{c.email}</td>
                  <td className="px-5 py-3 text-ink-soft max-w-xs truncate" title={c.medical_conditions || 'None'}>
                    {c.medical_conditions || "None"}
                  </td>
                  <td className="px-5 py-3 text-ink text-center font-medium">
                    {apptCount || 0}
                  </td>
                </tr>
              );
            })}
            {(customers ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-ink-soft">
                  No customers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
