"use client";

import { Crown, X, CheckCircle2, Sparkles, Percent, Award } from "lucide-react";
import { MembershipTier } from "./types";

interface TierBenefitsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tiers: MembershipTier[];
}

export default function TierBenefitsDrawer({
  isOpen,
  onClose,
  tiers,
}: TierBenefitsDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative h-full w-full max-w-lg bg-white shadow-2xl border-l border-line overflow-y-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">VIP Membership Tiers</h2>
              <p className="text-xs text-ink-soft">Tier benefits, discounts, and point rules</p>
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

        {/* Tiers List */}
        <div className="space-y-4">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`rounded-2xl border p-5 transition-all ${
                tier.id === "platinum"
                  ? "border-purple-200 bg-gradient-to-br from-purple-50/50 to-pink-50/30"
                  : tier.id === "gold"
                  ? "border-amber-200 bg-gradient-to-br from-amber-50/50 to-yellow-50/30"
                  : tier.id === "silver"
                  ? "border-slate-200 bg-gradient-to-br from-slate-50 to-zinc-50"
                  : "border-line bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-ink flex items-center gap-2">
                    {tier.name}
                  </h3>
                  <p className="text-xs text-ink-soft mt-0.5">
                    Min. Spend: ₱{tier.min_spend.toLocaleString()} • Min. Points: {tier.min_points.toLocaleString()} pts
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
                    tier.id === "platinum"
                      ? "bg-purple-100 text-purple-800"
                      : tier.id === "gold"
                      ? "bg-amber-100 text-amber-800"
                      : tier.id === "silver"
                      ? "bg-slate-200 text-slate-800"
                      : "bg-zinc-100 text-zinc-700"
                  }`}
                >
                  {tier.id}
                </span>
              </div>

              {/* Discount & Points Badges */}
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="flex items-center gap-2 rounded-xl bg-white/80 border border-line p-2.5">
                  <Percent className="h-4 w-4 text-royal shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-ink-soft">Treatment Discount</p>
                    <p className="text-sm font-bold text-royal">{tier.discount_pct}% OFF</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-white/80 border border-line p-2.5">
                  <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase font-semibold text-ink-soft">Points Multiplier</p>
                    <p className="text-sm font-bold text-ink">{tier.points_multiplier}x</p>
                  </div>
                </div>
              </div>

              {/* Perks */}
              <div className="mt-4 pt-3 border-t border-line/60">
                <p className="text-[11px] font-bold text-ink uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-royal" /> Included Perks
                </p>
                <ul className="space-y-1.5">
                  {tier.perks.map((perk, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-ink">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-line">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-royal py-2.5 text-sm font-semibold text-white hover:bg-royal/90 transition-all shadow-sm"
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
}

