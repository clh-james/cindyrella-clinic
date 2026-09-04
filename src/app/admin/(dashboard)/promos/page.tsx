import { createClient } from "@/lib/supabase/server";
import { Tag } from "lucide-react";

export const metadata = { title: "Promo Codes — Admin" };

export default async function PromosPage() {
  const supabase = await createClient();
  const { data: promos } = await supabase
    .from("promo_codes")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-ink">Promo Codes</h1>
          <p className="mt-1 text-sm text-ink-soft">View active promotions and track usage.</p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[800px] border-collapse text-sm">
          <thead>
            <tr className="bg-pale text-left text-ink">
              <th className="px-5 py-3 font-medium">Code</th>
              <th className="px-5 py-3 font-medium">Discount</th>
              <th className="px-5 py-3 font-medium">Usage</th>
              <th className="px-5 py-3 font-medium">Expires</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(promos ?? []).map((promo) => {
              const discountText = promo.discount_type === 'fixed' 
                ? `₱${promo.discount_value}` 
                : `${promo.discount_value}%`;
                
              return (
                <tr key={promo.id} className="border-b border-line last:border-0 hover:bg-pale/50">
                  <td className="px-5 py-3 font-mono font-medium text-ink">
                    <div className="flex items-center gap-2">
                      <Tag size={14} className="text-royal" />
                      {promo.code}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-ink-soft">{discountText}</td>
                  <td className="px-5 py-3 text-ink-soft">
                    {promo.current_uses} {promo.max_uses ? `/ ${promo.max_uses}` : ''}
                  </td>
                  <td className="px-5 py-3 text-ink-soft">
                    {promo.valid_until ? new Date(promo.valid_until).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${promo.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {promo.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              );
            })}
            {(promos ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-ink-soft">
                  No promo codes have been created yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
