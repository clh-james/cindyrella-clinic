"use client";

import { useState } from "react";
import { X, Wallet, Plus } from "lucide-react";
import { PettyCashFund, BranchInfo } from "@/app/admin/(dashboard)/expenses/types";
import { replenishPettyCash } from "@/app/admin/(dashboard)/expenses/actions";
import { formatPHP } from "@/lib/payroll/philippine-tax";
import toast from "react-hot-toast";

interface PettyCashModalProps {
  funds: PettyCashFund[];
  branches: BranchInfo[];
  defaultBranchId?: string;
  onClose: () => void;
  onUpdated: () => void;
}

export function PettyCashModal({
  funds,
  branches,
  defaultBranchId,
  onClose,
  onUpdated,
}: PettyCashModalProps) {
  const [selectedBranchId, setSelectedBranchId] = useState(
    defaultBranchId || branches[0]?.id || ""
  );
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReplenish = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      toast.error("Please enter a valid top-up amount");
      return;
    }

    setLoading(true);
    try {
      const res = await replenishPettyCash(selectedBranchId, val, notes);
      if (res.success) {
        toast.success(`Petty cash topped up by ${formatPHP(val)}!`);
        setAmount("");
        setNotes("");
        onUpdated();
      } else {
        toast.error(res.error || "Replenishment failed");
      }
    } catch {
      toast.error("Failed to update petty cash fund");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
              <Wallet size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold font-serif text-ink">Branch Petty Cash Drawer</h2>
              <p className="text-xs text-ink-soft">
                Manage emergency clinic cash on hand, receipts, and float replenishment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-line p-2 text-ink-soft hover:bg-pale transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current Balances Grid */}
        <div className="space-y-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft block">
            Current Drawer Balances
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {branches.map((b) => {
              const fund = funds.find((f) => f.branch_id === b.id);
              const bal = fund ? Number(fund.current_balance) : 5000;
              const isLow = bal < 1500;

              return (
                <div
                  key={b.id}
                  className={`rounded-2xl border p-4 space-y-2 transition-all ${
                    isLow
                      ? "border-amber-300 bg-amber-50/50"
                      : "border-line bg-pale/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-ink">{b.name}</span>
                    {isLow && (
                      <span className="text-[9px] font-bold text-amber-800 bg-amber-100 rounded-full px-2 py-0.5 uppercase">
                        Low Float
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-xl font-bold font-mono text-ink block">
                      {formatPHP(bal)}
                    </span>
                    <span className="text-[10px] text-ink-soft">
                      Target Float: {formatPHP(fund ? Number(fund.target_float) : 5000)}
                    </span>
                  </div>
                  {fund?.last_replenished_at && (
                    <p className="text-[10px] text-ink-soft pt-1 border-t border-line/50">
                      Last top-up: {new Date(fund.last_replenished_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Replenish Form */}
        <form
          onSubmit={handleReplenish}
          className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-4 text-xs"
        >
          <div className="flex items-center gap-1.5 font-bold text-emerald-900">
            <Plus size={15} className="text-emerald-700" />
            <span>Replenish / Top Up Petty Cash Fund</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink mb-1">Target Branch</label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full rounded-xl border border-line bg-white p-2.5 text-xs text-ink font-medium"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-ink mb-1">Top-Up Amount (₱) *</label>
              <input
                type="number"
                step="50"
                min="50"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="5000.00"
                required
                className="w-full rounded-xl border border-line bg-white p-2.5 font-mono font-bold text-ink"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-ink mb-1">Source / Check Reference Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Bank Cash Withdrawal Ref #91823"
              className="w-full rounded-xl border border-line bg-white p-2.5 text-xs text-ink"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-600 py-2.5 font-bold text-white hover:bg-emerald-700 shadow-sm disabled:opacity-50 transition-colors"
          >
            {loading ? "Updating Fund..." : "Confirm Replenishment"}
          </button>
        </form>
      </div>
    </div>
  );
}
