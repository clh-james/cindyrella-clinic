"use client";

import { useState } from "react";
import {
  X,
  Coins,
  ArrowUpRight,
  Loader2,
  Building2,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { PettyCashFund } from "@/app/admin/(dashboard)/expenses/types";
import { replenishPettyCash } from "@/app/admin/(dashboard)/expenses/actions";
import toast from "react-hot-toast";

interface PettyCashModalProps {
  funds: PettyCashFund[];
  branches: { id: string; name: string }[];
  defaultBranchId?: string;
  isSuperAdmin?: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function PettyCashModal({
  funds,
  branches,
  defaultBranchId,
  isSuperAdmin = false,
  onClose,
  onRefresh,
}: PettyCashModalProps) {
  const [selectedBranchId, setSelectedBranchId] = useState(
    defaultBranchId || branches[0]?.id || ""
  );
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const formatPHP = (val?: number | null) =>
    `₱${(val || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const currentFund = funds.find((f) => f.branch_id === selectedBranchId);

  const handleReplenish = async (e: React.FormEvent) => {
    e.preventDefault();
    const addAmt = parseFloat(amount);
    if (!addAmt || addAmt <= 0) {
      toast.error("Please enter a valid replenishment amount");
      return;
    }

    setLoading(true);
    try {
      const res = await replenishPettyCash(selectedBranchId, addAmt, notes);
      if (res.success) {
        toast.success(`Successfully replenished ${formatPHP(addAmt)}!`);
        setAmount("");
        setNotes("");
        onRefresh();
      } else {
        toast.error(res.error || "Failed to replenish petty cash");
      }
    } catch {
      toast.error("Failed to replenish");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Branch Petty Cash Float</h2>
              <p className="text-xs text-slate-500">
                Track and replenish emergency cash drawer floats
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Branch Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" /> Select Branch Float
            </label>
            <select
              disabled={!isSuperAdmin && branches.length <= 1}
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Current Balance Card */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-emerald-800 block">
                Current Petty Cash Balance
              </span>
              <span className="text-2xl font-black text-emerald-700 font-mono">
                {formatPHP(currentFund?.current_balance ?? 5000)}
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Target Float: {formatPHP(currentFund?.target_float ?? 5000)}
              </p>
            </div>
            {currentFund?.last_replenished_at && (
              <div className="text-right text-[11px] text-slate-500">
                <span className="flex items-center gap-1 justify-end font-medium">
                  <Calendar className="w-3 h-3 text-slate-400" /> Last Replenished:
                </span>
                <span className="font-semibold text-slate-800">
                  {new Date(currentFund.last_replenished_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {/* Replenish Form */}
          <form onSubmit={handleReplenish} className="space-y-4 pt-2 border-t border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Replenish Drawer Float
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Replenishment Cash Amount (₱) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="e.g. 5000.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cash Withdrawal Reference / Auditor Notes
              </label>
              <input
                type="text"
                placeholder="e.g. BDO ATM withdrawal slip #44091, manager emergency float top-up"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
              <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Replenishments are recorded into the system audit trail and immediately increment the available petty cash float for this branch.
              </span>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                Replenish Float
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/60 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 shadow-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
