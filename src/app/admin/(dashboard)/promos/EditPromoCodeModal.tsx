"use client";

import { useState, useTransition } from "react";
import { X, Loader2, Save, Tag, Calendar, Hash, Percent, DollarSign, CheckCircle2 } from "lucide-react";
import { PromoCode } from "./types";
import { editPromoCode } from "./actions";
import toast from "react-hot-toast";

export function EditPromoCodeModal({
  promo,
  onClose,
  onSuccess,
}: {
  promo: PromoCode;
  onClose: () => void;
  onSuccess: (updated: PromoCode) => void;
}) {
  const [code, setCode] = useState(promo.code);
  const [discountType, setDiscountType] = useState<"fixed" | "percentage">(promo.discount_type);
  const [discountValue, setDiscountValue] = useState(String(promo.discount_value));
  const [validUntil, setValidUntil] = useState(
    promo.valid_until ? promo.valid_until.slice(0, 10) : ""
  );
  const [maxUses, setMaxUses] = useState(promo.max_uses ? String(promo.max_uses) : "");
  const [isActive, setIsActive] = useState(promo.is_active);

  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const val = Number(discountValue);
    if (!code.trim()) {
      toast.error("Please enter a promo code.");
      return;
    }
    if (isNaN(val) || val <= 0) {
      toast.error("Discount value must be greater than zero.");
      return;
    }
    if (discountType === "percentage" && val > 100) {
      toast.error("Percentage discount cannot exceed 100%.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await editPromoCode({
          id: promo.id,
          code: code.trim().toUpperCase(),
          discountType,
          discountValue: val,
          validUntil: validUntil || null,
          maxUses: maxUses ? Number(maxUses) : null,
          isActive,
        });

        if (res.error) {
          toast.error(res.error);
          return;
        }

        toast.success("Promo code updated successfully!");
        if (res.promo) {
          onSuccess(res.promo as PromoCode);
        } else {
          onSuccess({
            ...promo,
            code: code.trim().toUpperCase(),
            discount_type: discountType,
            discount_value: val,
            valid_until: validUntil ? new Date(validUntil).toISOString() : null,
            max_uses: maxUses ? Number(maxUses) : null,
            is_active: isActive,
          });
        }
        onClose();
      } catch (err: any) {
        toast.error(err.message || "Failed to update promo code.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-line overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-pale/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-royal/10 text-royal">
              <Tag size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold font-serif text-ink">Edit Promo Code</h2>
              <p className="text-xs text-ink-soft">
                Editing: <span className="font-mono font-bold text-royal">{promo.code}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-ink-soft hover:bg-line/40 hover:text-ink transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5 uppercase tracking-wider">
              Promo Code Name
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              placeholder="e.g. SUMMER2026"
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm font-mono font-bold text-ink uppercase focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5 uppercase tracking-wider">
                Discount Type
              </label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-xs sm:text-sm text-ink focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20"
              >
                <option value="fixed">Fixed (₱)</option>
                <option value="percentage">Percentage (%)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5 uppercase tracking-wider">
                Discount Value
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-ink-soft">
                  {discountType === "fixed" ? "₱" : "%"}
                </span>
                <input
                  type="number"
                  min={1}
                  max={discountType === "percentage" ? 100 : undefined}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  required
                  className="w-full rounded-xl border border-line bg-white pl-8 pr-3 py-2.5 text-xs sm:text-sm font-mono font-bold text-royal focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5 uppercase tracking-wider flex items-center gap-1">
                <Calendar size={12} className="text-royal" />
                Valid Until
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-xs sm:text-sm text-ink focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20"
              />
              <span className="text-[10px] text-ink-soft mt-0.5 block">Leave empty for no expiry</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5 uppercase tracking-wider flex items-center gap-1">
                <Hash size={12} className="text-ink-soft" />
                Max Uses
              </label>
              <input
                type="number"
                min={1}
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Unlimited"
                className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-xs sm:text-sm font-mono text-ink focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20"
              />
              <span className="text-[10px] text-ink-soft mt-0.5 block">Used: {promo.current_uses} times</span>
            </div>
          </div>

          {/* Active Toggle */}
          <div className="pt-2 border-t border-line/80 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-ink block">Promo Status</span>
              <span className="text-[11px] text-ink-soft">Control whether customers can apply this code</span>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                isActive
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                  : "bg-gray-100 text-gray-600 border-gray-300"
              }`}
            >
              {isActive ? "Active" : "Inactive"}
            </button>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-xl border border-line px-4 py-2.5 text-xs font-bold text-ink-soft hover:bg-line/40 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-royal px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-royal/90 transition-all disabled:opacity-50 active:scale-95"
            >
              {isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={14} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

