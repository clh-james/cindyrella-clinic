import { createClient } from "@/lib/supabase/server";

const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;

export const metadata = { title: "Services & Pricing — Admin" };

export default async function ServicesPage() {
  const supabase = await createClient();
  const { data: treatments } = await supabase
    .from("treatments")
    .select("*")
    .order("sort_order", { ascending: true });

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink">Services & Pricing</h1>
      <p className="mt-1 text-sm text-ink-soft">View and manage your IV drip treatments.</p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[800px] border-collapse text-sm">
          <thead>
            <tr className="bg-pale text-left text-ink">
              <th className="px-5 py-3 font-medium">Service Name</th>
              <th className="px-5 py-3 font-medium">Duration</th>
              <th className="px-5 py-3 font-medium">Session Price</th>
              <th className="px-5 py-3 font-medium">5 + 1 Price</th>
              <th className="px-5 py-3 font-medium">10 + 2 Price</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(treatments ?? []).map((t) => (
              <tr key={t.id} className="border-b border-line last:border-0 hover:bg-pale/50">
                <td className="px-5 py-3 font-medium text-ink">{t.name}</td>
                <td className="px-5 py-3 text-ink-soft">{t.duration_minutes} min</td>
                <td className="px-5 py-3 text-ink-soft">{peso(t.session_price)}</td>
                <td className="px-5 py-3 text-ink-soft">{peso(t.five_plus_one_price)}</td>
                <td className="px-5 py-3 text-ink-soft">{peso(t.ten_plus_two_price)}</td>
                <td className="px-5 py-3 text-ink-soft">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {t.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-ink-soft">
        Note: To edit prices or add new services, please run the SQL migration or update via Supabase Studio directly in Phase 3.
      </p>
    </div>
  );
}
