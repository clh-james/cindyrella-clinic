import { createClient } from "@/lib/supabase/server";
import { Package, AlertTriangle } from "lucide-react";

export const metadata = { title: "Inventory — Admin" };

export default async function InventoryPage() {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("inventory_items")
    .select("*")
    .order("name", { ascending: true });

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-ink">Inventory</h1>
          <p className="mt-1 text-sm text-ink-soft">Manage clinic supplies and materials.</p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
        <table className="w-full min-w-[800px] border-collapse text-sm">
          <thead>
            <tr className="bg-pale text-left text-ink">
              <th className="px-5 py-3 font-medium">Item Name</th>
              <th className="px-5 py-3 font-medium">Category</th>
              <th className="px-5 py-3 font-medium">Stock Level</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(items ?? []).map((item) => {
              const isLowStock = item.current_stock <= item.low_stock_threshold;
              const isOutOfStock = item.current_stock === 0;

              return (
                <tr key={item.id} className="border-b border-line last:border-0 hover:bg-pale/50 transition-colors">
                  <td className="px-5 py-4 font-medium text-ink">
                    <div className="flex items-center gap-3">
                      <Package size={16} className="text-royal" />
                      <div>
                        {item.name}
                        {item.sku && <div className="text-xs font-mono text-ink-soft">{item.sku}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-ink-soft capitalize">{item.category}</td>
                  <td className="px-5 py-4 font-mono">
                    <span className={`text-lg font-semibold ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-ink'}`}>
                      {item.current_stock}
                    </span>
                    <span className="text-ink-soft text-xs ml-1">{item.unit}</span>
                  </td>
                  <td className="px-5 py-4">
                    {isOutOfStock ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 border border-red-200">
                        <AlertTriangle size={12} /> Out of Stock
                      </span>
                    ) : isLowStock ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 border border-amber-200">
                        <AlertTriangle size={12} /> Low Stock
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 border border-green-200">
                        In Stock
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {(items ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-sm text-ink-soft">
                  No inventory items have been created yet. Add items in the Supabase Dashboard.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
