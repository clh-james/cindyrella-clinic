"use client";

import { useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { addInventoryItem } from "./actions";

export function AddInventoryItem() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const res = await addInventoryItem(formData);

    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      setIsOpen(false);
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-royal px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-royal-deep"
      >
        <Plus size={16} />
        Add Item
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <h2 className="text-lg font-semibold text-ink">Add New Item</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-2 text-ink-soft hover:bg-pale hover:text-ink"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="name" className="mb-1 block text-sm font-medium text-ink">Item Name *</label>
                <input required type="text" id="name" name="name" className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-royal" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="category" className="mb-1 block text-sm font-medium text-ink">Category *</label>
                  <select required id="category" name="category" className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-royal bg-white">
                    <option value="">Select Category</option>
                    <option value="Vitamins">Vitamins</option>
                    <option value="IV Bags">IV Bags</option>
                    <option value="Consumables">Consumables</option>
                    <option value="Retail">Retail</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="unit" className="mb-1 block text-sm font-medium text-ink">Unit *</label>
                  <input required type="text" id="unit" name="unit" placeholder="e.g. ampoules, bags, pcs" className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-royal" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="current_stock" className="mb-1 block text-sm font-medium text-ink">Initial Stock</label>
                  <input type="number" id="current_stock" name="current_stock" defaultValue={0} min={0} className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-royal" />
                </div>
                <div>
                  <label htmlFor="low_stock_threshold" className="mb-1 block text-sm font-medium text-ink">Low Stock Alert At</label>
                  <input type="number" id="low_stock_threshold" name="low_stock_threshold" defaultValue={5} min={0} className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-royal" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="retail_price" className="mb-1 block text-sm font-medium text-ink">Retail Price (₱)</label>
                  <input type="number" id="retail_price" name="retail_price" min={0} placeholder="Leave blank if not for sale" className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-royal" />
                </div>
                <div>
                  <label htmlFor="sku" className="mb-1 block text-sm font-medium text-ink">SKU (Optional)</label>
                  <input type="text" id="sku" name="sku" className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-royal" />
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-pale hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 rounded-xl bg-royal px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-royal-deep disabled:opacity-50"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
