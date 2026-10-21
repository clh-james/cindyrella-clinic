"use client";

import { useState, useEffect } from "react";
import {
  X,
  Coins,
  ArrowUpRight,
  Loader2,
  Building2,
  Calendar,
  AlertCircle,
  SlidersHorizontal,
  Check,
} from "lucide-react";
import { PettyCashFund } from "@/app/admin/(dashboard)/expenses/types";
import { replenishPettyCash, adjustPettyCash } from "@/app/admin/(dashboard)/expenses/actions";
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
  const [activeTab, setActiveTab] = useState<"replenish" | "adjust">("replenish");

  // Replenish form state
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  // Adjust form state
  const [adjustBalance, setAdjustBalance] = useState("");
  const [adjustTargetFloat, setAdjustTargetFloat] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");

  const [loading, setLoading] = useState(false);

  const formatPHP = (val?: number | null) =>
    `₱${(val || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const currentFund = funds.find((f) => f.branch_id === selectedBranchId);

  useEffect(() => {
    if (currentFund) {
      setAdjustBalance(currentFund.current_balance !== undefined ? String(currentFund.current_balance) : "3000");
      setAdjustTargetFloat(currentFund.target_float !== undefined ? String(currentFund.target_float) : "3000");
    }
  }, [selectedBranchId, currentFund]);

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

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    const balAmt = parseFloat(adjustBalance);
    if (isNaN(balAmt) || balAmt < 0) {
      toast.error("Please enter a valid balance amount (₱0.00 or higher)");
      return;
    }
    const targetAmt = adjustTargetFloat ? parseFloat(adjustTargetFloat) : undefined;
    if (targetAmt !== undefined && (isNaN(targetAmt) || targetAmt <= 0)) {
      toast.error("Target float must be greater than ₱0.00");
      return;
    }

    setLoading(true);
    try {
      const res = await adjustPettyCash(
        selectedBranchId,
        balAmt,
        targetAmt,
        adjustNotes
      );
      if (res.success) {
        toast.success(`Successfully adjusted balance to ${formatPHP(balAmt)}!`);
        setAdjustNotes("");
        onRefresh();
      } else {
        toast.error(res.error || "Failed to adjust petty cash balance");
      }
    } catch {
      toast.error("Failed to adjust petty cash");
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
                Track, adjust, and replenish emergency cash drawer floats
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
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Branch Selector */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
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

          {/* Tab Selector */}
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("replenish")}
              className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "replenish"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" /> Replenish Cash Float
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("adjust");
                if (currentFund) {
                  setAdjustBalance(String(currentFund.current_balance ?? 3000));
                  setAdjustTargetFloat(String(currentFund.target_float ?? 3000));
                }
              }}
              className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "adjust"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" /> Adjust Balance / Target Float
            </button>
          </div>

          {/* Replenish Form */}
          {activeTab === "replenish" ? (
            <form onSubmit={handleReplenish} className="space-y-4">
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
          ) : (
            /* Adjust Form */
            <form onSubmit={handleAdjust} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    New Current Balance (₱) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="e.g. 3000.00"
                    value={adjustBalance}
                    onChange={(e) => setAdjustBalance(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Directly sets the actual cash currently in the drawer.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Float Ceiling (₱)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="e.g. 3000.00"
                    value={adjustTargetFloat}
                    onChange={(e) => setAdjustTargetFloat(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-semibold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Benchmark float level for replenishments.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Adjustment / Auditor Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Physical count reconciliation, starting float adjustment"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Adjusting the balance directly calibrates the drawer fund and logs an audit record with previous and new balances.
                </span>
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Save Balance Adjustment
                </button>
              </div>
            </form>
          )}
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
