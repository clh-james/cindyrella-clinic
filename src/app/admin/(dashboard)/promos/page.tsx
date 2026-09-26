import { createClient } from "@/lib/supabase/server";
import { Tag } from "lucide-react";
import { AddPromoCode } from "./AddPromoCode";

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
          <h1 className="font-serif text-xl sm:text-2xl font-semibold text-ink">Promo Codes</h1>
          <p className="mt-1 text-xs sm:text-sm text-ink-soft">View active promotions and track usage.</p>
        </div>
        <AddPromoCode />
      </div>

      {/* MOBILE VIEW (CARDS) */}
      <div className="mt-6 grid gap-4 lg:hidden">
        {(promos ?? []).map((promo) => {
          const discountText = promo.discount_type === 'fixed' 
            ? `₱${promo.discount_value}` 
            : `${promo.discount_value}%`;
            
          return (
            <div key={promo.id} className="rounded-xl border border-line bg-white p-4 shadow-sm flex flex-col gap-3">
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-2">
                  <div className="bg-pale p-1.5 rounded-lg">
                    <Tag size={16} className="text-royal" />
                  </div>
                  <h3 className="font-mono font-bold text-ink text-lg">{promo.code}</h3>
                </div>
                <span className={`shrink-0 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${promo.is_active ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
                  {promo.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 border-t border-line border-dashed pt-3 mt-1">
                <div>
                  <p className="text-[10px] text-ink-soft uppercase tracking-wider font-semibold mb-0.5">Discount</p>
                  <p className="font-medium text-ink text-base">{discountText}</p>
                </div>
                <div>
                  <p className="text-[10px] text-ink-soft uppercase tracking-wider font-semibold mb-0.5">Usage</p>
                  <p className="font-mono text-ink text-sm">
                    {promo.current_uses} {promo.max_uses ? `/ ${promo.max_uses}` : ''}
                  </p>
                </div>
              </div>
              
              <div className="bg-pale/50 p-2.5 rounded-lg border border-line/50 flex justify-between items-center">
                <p className="text-[10px] text-ink-soft uppercase tracking-wider font-semibold">Valid Until</p>
                <p className="font-medium text-ink text-xs">
                  {promo.valid_until ? new Date(promo.valid_until).toLocaleDateString() : 'Never expires'}
                </p>
              </div>
            </div>
          );
        })}
        {(promos ?? []).length === 0 && (
          <div className="py-10 text-center text-sm text-ink-soft border border-line rounded-xl bg-white">
            No promo codes have been created yet.
          </div>
        )}
      </div>

      {/* DESKTOP VIEW (TABLE) */}
      <div className="mt-6 hidden lg:block overflow-x-auto rounded-2xl border border-line">
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
                <tr key={promo.id} className="border-b border-line last:border-0 hover:bg-pale/50 transition-colors">
                  <td className="px-5 py-3 font-mono font-medium text-ink">
                    <div className="flex items-center gap-2">
                      <Tag size={14} className="text-royal" />
                      {promo.code}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-ink-soft">{discountText}</td>
                  <td className="px-5 py-3 text-ink-soft font-mono">
                    {promo.current_uses} {promo.max_uses ? `/ ${promo.max_uses}` : ''}
                  </td>
                  <td className="px-5 py-3 text-ink-soft">
                    {promo.valid_until ? new Date(promo.valid_until).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium border ${promo.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>
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
