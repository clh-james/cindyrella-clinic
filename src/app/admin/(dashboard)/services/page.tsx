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
      <h1 className="font-serif text-xl sm:text-2xl font-semibold text-ink">Services & Pricing</h1>
      <p className="mt-1 text-xs sm:text-sm text-ink-soft">View and manage your IV drip treatments.</p>

      {/* MOBILE VIEW (CARDS) */}
      <div className="mt-6 grid gap-4 lg:hidden">
        {(treatments ?? []).map((t) => (
          <div key={t.id} className="rounded-xl border border-line bg-white p-4 shadow-sm flex flex-col gap-3">
            <div className="flex justify-between items-start gap-2">
              <div>
                <h3 className="font-semibold text-ink leading-tight text-base">{t.name}</h3>
                <p className="text-xs text-ink-soft capitalize mt-0.5">{t.category}</p>
              </div>
              <span className={`shrink-0 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${t.is_active ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
                {t.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 border-t border-line border-dashed pt-3 mt-1">
              <div>
                <p className="text-[10px] text-ink-soft uppercase tracking-wider font-semibold mb-0.5">Session Price</p>
                <p className="font-mono font-bold text-royal">{peso(t.session_price)}</p>
              </div>
              <div>
                <p className="text-[10px] text-ink-soft uppercase tracking-wider font-semibold mb-0.5">Duration</p>
                <p className="font-medium text-ink text-sm">{t.duration_minutes ? `${t.duration_minutes} min` : '-'}</p>
              </div>
            </div>
            
            {(t.five_plus_one_price || t.ten_plus_two_price) && (
              <div className="grid grid-cols-2 gap-3 bg-pale/50 p-2.5 rounded-lg border border-line/50">
                <div>
                  <p className="text-[10px] text-ink-soft uppercase tracking-wider font-semibold mb-0.5">5 + 1 Price</p>
                  <p className="font-mono text-sm text-ink">{t.five_plus_one_price ? peso(t.five_plus_one_price) : '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-ink-soft uppercase tracking-wider font-semibold mb-0.5">10 + 2 Price</p>
                  <p className="font-mono text-sm text-ink">{t.ten_plus_two_price ? peso(t.ten_plus_two_price) : '-'}</p>
                </div>
              </div>
            )}
          </div>
        ))}
        {(treatments ?? []).length === 0 && (
          <div className="py-10 text-center text-sm text-ink-soft border border-line rounded-xl bg-white">
            No services found.
          </div>
        )}
      </div>

      {/* DESKTOP VIEW (TABLE) */}
      <div className="mt-6 hidden lg:block overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[800px] border-collapse text-sm">
          <thead>
            <tr className="bg-pale text-left text-ink">
              <th className="px-5 py-3 font-medium">Service Name</th>
              <th className="px-5 py-3 font-medium">Category</th>
              <th className="px-5 py-3 font-medium">Duration</th>
              <th className="px-5 py-3 font-medium">Session Price</th>
              <th className="px-5 py-3 font-medium">5 + 1 Price</th>
              <th className="px-5 py-3 font-medium">10 + 2 Price</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(treatments ?? []).map((t) => (
              <tr key={t.id} className="border-b border-line last:border-0 hover:bg-pale/50 transition-colors">
                <td className="px-5 py-3 font-medium text-ink">{t.name}</td>
                <td className="px-5 py-3 text-ink-soft">{t.category}</td>
                <td className="px-5 py-3 text-ink-soft">{t.duration_minutes ? `${t.duration_minutes} min` : '-'}</td>
                <td className="px-5 py-3 text-ink font-mono">{peso(t.session_price)}</td>
                <td className="px-5 py-3 text-ink-soft font-mono">{t.five_plus_one_price ? peso(t.five_plus_one_price) : '-'}</td>
                <td className="px-5 py-3 text-ink-soft font-mono">{t.ten_plus_two_price ? peso(t.ten_plus_two_price) : '-'}</td>
                <td className="px-5 py-3 text-ink-soft">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium border ${t.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>
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
