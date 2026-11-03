"use client";

import { useState } from "react";
import { Sparkles, X, Loader2, AlertCircle, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { CustomerMember } from "./types";
import { adjustCustomerPoints } from "./actions";

interface AdjustPointsModalProps {
  member: CustomerMember | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdjustPointsModal({
  member,
  isOpen,
  onClose,
  onSuccess,
}: AdjustPointsModalProps) {
  const [pointsType, setPointsType] = useState<"add" | "deduct">("add");
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [referenceId, setReferenceId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !member) return null;

  const currentPoints = member.loyalty_points || 0;
  const numAmount = parseInt(amount, 10) || 0;
  const delta = pointsType === "add" ? numAmount : -numAmount;
  const projectedBalance = Math.max(0, currentPoints + delta);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numAmount || numAmount <= 0) {
      setError("Please enter a valid points amount greater than zero.");
      return;
    }
    if (!reason.trim()) {
      setError("Please provide a reason for this points adjustment.");
      return;
    }
    if (pointsType === "deduct" && numAmount > currentPoints) {
      setError(`Cannot deduct ${numAmount} points: Customer only has ${currentPoints} points available.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await adjustCustomerPoints({
        customerId: member.id,
        pointsDelta: delta,
        reason: reason.trim(),
        referenceId: referenceId.trim() || undefined,
      });

      if (res.error) {
        setError(res.error);
        setIsSubmitting(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to adjust points.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-line overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line bg-mist/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">Adjust Loyalty Points</h2>
              <p className="text-xs text-ink-soft">
                {member.first_name} {member.last_name} ({member.card_number})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="rounded-lg p-2 text-ink-soft hover:bg-mist transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 border border-red-200">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current & Projected Points */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-mist/30 p-3 text-center">
            <div>
              <p className="text-[11px] font-semibold text-ink-soft uppercase">Current Balance</p>
              <p className="text-xl font-bold text-ink mt-0.5">{currentPoints.toLocaleString()} pts</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-ink-soft uppercase">New Balance</p>
              <p className="text-xl font-bold text-royal mt-0.5">{projectedBalance.toLocaleString()} pts</p>
            </div>
          </div>

          {/* Action Type Toggle */}
          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
              Adjustment Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPointsType("add")}
                className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold border transition-all ${
                  pointsType === "add"
                    ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm"
                    : "border-line bg-white text-ink-soft hover:bg-mist"
                }`}
              >
                <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                Award / Bonus
              </button>

              <button
                type="button"
                onClick={() => setPointsType("deduct")}
                className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold border transition-all ${
                  pointsType === "deduct"
                    ? "bg-amber-50 border-amber-300 text-amber-800 shadow-sm"
                    : "border-line bg-white text-ink-soft hover:bg-mist"
                }`}
              >
                <ArrowDownRight className="h-4 w-4 text-amber-600" />
                Redeem / Deduct
              </button>
            </div>
          </div>

          {/* Points Amount */}
          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
              Points Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              required
              placeholder="e.g. 50, 100, 250"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm text-ink outline-none focus:border-royal focus:ring-2 focus:ring-royal/20 transition-all font-semibold"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
              Reason / Notes <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder={
                pointsType === "add"
                  ? "e.g. Birthday gift points, referral bonus, promotional reward"
                  : "e.g. Redeemed for ₱100 treatment discount, merchandise voucher"
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-line px-3.5 py-2 text-sm text-ink outline-none focus:border-royal focus:ring-2 focus:ring-royal/20 transition-all"
            />
          </div>

          {/* Reference ID */}
          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
              Reference / Receipt ID (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. POS-2026-0842 or APT-104"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              className="w-full rounded-xl border border-line px-3.5 py-2 text-sm text-ink outline-none focus:border-royal focus:ring-2 focus:ring-royal/20 transition-all"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-line mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-mist transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-royal px-5 py-2 text-sm font-semibold text-white hover:bg-royal/90 shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : pointsType === "add" ? (
                "Award Points"
              ) : (
                "Redeem Points"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

