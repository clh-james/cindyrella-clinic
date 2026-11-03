"use client";

import { useState } from "react";
import { Crown, X, Loader2, AlertCircle, RefreshCw, Check } from "lucide-react";
import { CustomerMember, MembershipTier } from "./types";
import { assignMemberTier } from "./actions";

interface AssignTierModalProps {
  member: CustomerMember | null;
  tiers: MembershipTier[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AssignTierModal({
  member,
  tiers,
  isOpen,
  onClose,
  onSuccess,
}: AssignTierModalProps) {
  const [selectedTierId, setSelectedTierId] = useState<string>(member?.tier_id || "silver");
  const [cardNumber, setCardNumber] = useState<string>(member?.card_number || "");
  const [expiryDate, setExpiryDate] = useState<string>(member?.expiry_date || "");
  const [isLifetime, setIsLifetime] = useState<boolean>(!member?.expiry_date);
  const [notes, setNotes] = useState<string>(member?.notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !member) return null;

  const handleGenerateCard = () => {
    const randomHex = Math.random().toString(16).substring(2, 8).toUpperCase();
    setCardNumber(`CY-VIP-${randomHex}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTierId) {
      setError("Please select a membership tier.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await assignMemberTier({
        customerId: member.id,
        tierId: selectedTierId,
        cardNumber: cardNumber.trim() || undefined,
        expiryDate: isLifetime ? null : expiryDate || null,
        notes: notes.trim() || undefined,
      });

      if (res.error) {
        setError(res.error);
        setIsSubmitting(false);
        return;
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to assign membership tier.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-line overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line bg-mist/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">Upgrade / Assign VIP Tier</h2>
              <p className="text-xs text-ink-soft">
                {member.first_name} {member.last_name}
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

          {/* Tier Selection */}
          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-2">
              Select Membership Tier <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {tiers.map((tier) => {
                const isSelected = selectedTierId === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setSelectedTierId(tier.id)}
                    className={`relative flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-royal bg-royal/5 ring-1 ring-royal shadow-sm"
                        : "border-line bg-white hover:bg-mist/50"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-bold text-xs text-ink">{tier.name}</span>
                      {isSelected && <Check className="h-4 w-4 text-royal" />}
                    </div>
                    <p className="text-[11px] font-semibold text-royal">
                      {tier.discount_pct}% OFF Treatments
                    </p>
                    <p className="text-[10px] text-ink-soft mt-0.5">
                      Min. spend ₱{tier.min_spend.toLocaleString()}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* VIP Card Number */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
                VIP Card / Member Code
              </label>
              <button
                type="button"
                onClick={handleGenerateCard}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-royal hover:underline"
              >
                <RefreshCw className="h-3 w-3" /> Auto-Generate
              </button>
            </div>
            <input
              type="text"
              placeholder="e.g. CY-VIP-0023"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm text-ink outline-none focus:border-royal focus:ring-2 focus:ring-royal/20 transition-all font-mono"
            />
          </div>

          {/* Expiry / Lifetime */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
                Validity Period
              </label>
              <label className="flex items-center gap-1.5 text-xs text-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={isLifetime}
                  onChange={(e) => {
                    setIsLifetime(e.target.checked);
                    if (e.target.checked) setExpiryDate("");
                  }}
                  className="rounded border-line text-royal focus:ring-royal"
                />
                <span className="font-semibold text-royal">Lifetime VIP Pass</span>
              </label>
            </div>

            {!isLifetime && (
              <input
                type="date"
                required={!isLifetime}
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full rounded-xl border border-line px-3.5 py-2 text-sm text-ink outline-none focus:border-royal focus:ring-2 focus:ring-royal/20 transition-all"
              />
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
              Internal VIP Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Upgraded to Gold VIP due to consistent aesthetic packages purchases"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-line px-3.5 py-2 text-sm text-ink outline-none focus:border-royal focus:ring-2 focus:ring-royal/20 transition-all resize-none"
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
                  Saving...
                </>
              ) : (
                "Save VIP Tier"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

