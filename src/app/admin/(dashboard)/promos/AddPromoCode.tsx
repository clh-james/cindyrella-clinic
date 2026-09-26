"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function AddPromoCode() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    code: "",
    discount_type: "fixed",
    discount_value: "",
    valid_until: "",
    max_uses: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.from("promo_codes").insert({
      code: formData.code.toUpperCase(),
      discount_type: formData.discount_type,
      discount_value: parseInt(formData.discount_value, 10),
      valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null,
      max_uses: formData.max_uses ? parseInt(formData.max_uses, 10) : null,
      is_active: true,
    });

    setLoading(false);

    if (error) {
      alert("Failed to create promo code: " + error.message);
    } else {
      setOpen(false);
      setFormData({
        code: "",
        discount_type: "fixed",
        discount_value: "",
        valid_until: "",
        max_uses: "",
      });
      router.refresh();
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full bg-royal px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-royal-deep"
      >
        <Plus size={16} /> Add Promo Code
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-ink">New Promo Code</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-ink-soft hover:bg-pale hover:text-ink transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-ink-soft uppercase tracking-wider">
                  Code Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SUMMER2026"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-royal focus:ring-1 focus:ring-royal uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-ink-soft uppercase tracking-wider">
                    Type
                  </label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                    className="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-royal focus:ring-1 focus:ring-royal bg-white"
                  >
                    <option value="fixed">Fixed (₱)</option>
                    <option value="percentage">Percentage (%)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-ink-soft uppercase tracking-wider">
                    Discount Value
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder={formData.discount_type === "fixed" ? "e.g. 500" : "e.g. 10"}
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                    className="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-royal focus:ring-1 focus:ring-royal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-ink-soft uppercase tracking-wider">
                    Max Uses (Optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={formData.max_uses}
                    onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                    className="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-royal focus:ring-1 focus:ring-royal"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-ink-soft uppercase tracking-wider">
                    Expiry (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                    className="w-full rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-royal focus:ring-1 focus:ring-royal bg-white"
                  />
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-pale"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-full bg-royal px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-royal-deep disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Create Promo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
