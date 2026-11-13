"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  X,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  Building2,
  Calendar,
  AlertCircle,
  SlidersHorizontal,
  Check,
  History,
  Download,
  Search,
  RefreshCw,
  ExternalLink,
  Receipt,
  FileSpreadsheet,
} from "lucide-react";
import { PettyCashFund, PettyCashTransaction } from "@/app/admin/(dashboard)/expenses/types";
import {
  replenishPettyCash,
  adjustPettyCash,
  getPettyCashHistory,
} from "@/app/admin/(dashboard)/expenses/actions";
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

  // Top-level Navigation: "management" (Replenish / Adjust) vs "history" (Ledger & Audit Trail)
  const [mainTab, setMainTab] = useState<"management" | "history">("management");

  // Management Sub-tab
  const [activeTab, setActiveTab] = useState<"replenish" | "adjust">("replenish");

  // Replenish form state
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  // Adjust form state
  const [adjustBalance, setAdjustBalance] = useState("");
  const [adjustTargetFloat, setAdjustTargetFloat] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");

  const [loading, setLoading] = useState(false);

  // History state
  const [historyTransactions, setHistoryTransactions] = useState<PettyCashTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilterType, setHistoryFilterType] = useState<
    "all" | "replenishment" | "disbursement" | "adjustment"
  >("all");
  const [historySearch, setHistorySearch] = useState("");

  const formatPHP = (val?: number | null) =>
    `₱${(val || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const currentFund = funds.find((f) => f.branch_id === selectedBranchId);
  const currentBranchName =
    branches.find((b) => b.id === selectedBranchId)?.name || "Branch";

  useEffect(() => {
    if (currentFund) {
      setAdjustBalance(
        currentFund.current_balance !== undefined
          ? String(currentFund.current_balance)
          : "3000"
      );
      setAdjustTargetFloat(
        currentFund.target_float !== undefined
          ? String(currentFund.target_float)
          : "3000"
      );
    }
  }, [selectedBranchId, currentFund]);

  // Fetch History for selected branch
  const fetchHistory = useCallback(async (branchId: string) => {
    setHistoryLoading(true);
    try {
      const res = await getPettyCashHistory(branchId);
      if (res.success) {
        setHistoryTransactions(res.transactions);
      } else {
        toast.error(res.error || "Failed to load transaction history");
      }
    } catch {
      toast.error("Error retrieving petty cash history");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Trigger fetch when branch changes or switching to history tab
  useEffect(() => {
    if (selectedBranchId) {
      fetchHistory(selectedBranchId);
    }
  }, [selectedBranchId, fetchHistory]);

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
        fetchHistory(selectedBranchId);
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
        fetchHistory(selectedBranchId);
      } else {
        toast.error(res.error || "Failed to adjust petty cash balance");
      }
    } catch {
      toast.error("Failed to adjust petty cash");
    } finally {
      setLoading(false);
    }
  };

  // Filtered History Transactions
  const filteredTransactions = useMemo(() => {
    return historyTransactions.filter((tx) => {
      if (historyFilterType !== "all" && tx.type !== historyFilterType) {
        return false;
      }
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const matchesVoucher = tx.voucher_number?.toLowerCase().includes(q);
        const matchesPayee = tx.payee?.toLowerCase().includes(q);
        const matchesTitle = tx.title?.toLowerCase().includes(q);
        const matchesDesc = tx.description?.toLowerCase().includes(q);
        const matchesStaff = tx.staff_name?.toLowerCase().includes(q);
        const matchesCat = tx.category_name?.toLowerCase().includes(q);
        if (
          !matchesVoucher &&
          !matchesPayee &&
          !matchesTitle &&
          !matchesDesc &&
          !matchesStaff &&
          !matchesCat
        ) {
          return false;
        }
      }
      return true;
    });
  }, [historyTransactions, historyFilterType, historySearch]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    let replenishmentCount = 0;
    let disbursementCount = 0;
    let adjustmentCount = 0;

    historyTransactions.forEach((tx) => {
      if (tx.type === "replenishment") {
        inflow += Number(tx.amount || 0);
        replenishmentCount++;
      } else if (tx.type === "disbursement") {
        outflow += Number(tx.amount || 0);
        disbursementCount++;
      } else if (tx.type === "adjustment") {
        adjustmentCount++;
      }
    });

    return {
      inflow,
      outflow,
      replenishmentCount,
      disbursementCount,
      adjustmentCount,
      totalCount: historyTransactions.length,
    };
  }, [historyTransactions]);

  // Export to CSV
  const handleExportCSV = () => {
    if (historyTransactions.length === 0) {
      toast.error("No transactions to export");
      return;
    }

    const headers = [
      "Date",
      "Type",
      "Voucher / Ref #",
      "Branch",
      "Payee / Vendor",
      "Category",
      "Title / Purpose",
      "Staff In Charge",
      "Amount (PHP)",
      "Status",
      "Notes",
    ];

    const rows = historyTransactions.map((tx) => [
      `"${new Date(tx.date).toLocaleString("en-PH")}"`,
      `"${tx.type.toUpperCase()}"`,
      `"${tx.voucher_number || ""}"`,
      `"${tx.branch_name || ""}"`,
      `"${(tx.payee || "").replace(/"/g, '""')}"`,
      `"${tx.category_name || ""}"`,
      `"${(tx.title || "").replace(/"/g, '""')}"`,
      `"${(tx.staff_name || "").replace(/"/g, '""')}"`,
      tx.type === "disbursement" ? `-${tx.amount}` : `${tx.amount}`,
      `"${tx.status || "completed"}"`,
      `"${(tx.notes || tx.description || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateStr = new Date().toISOString().split("T")[0];
    const cleanBranch = currentBranchName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    link.setAttribute("download", `petty_cash_history_${cleanBranch}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Petty cash ledger exported to CSV!");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-h-[90vh] flex flex-col overflow-hidden transition-all duration-300 ${
          mainTab === "history" ? "max-w-4xl" : "max-w-xl"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Petty Cash Float & Drawer
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {currentBranchName}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Manage emergency cash float, top-ups, disbursements, and audit logs
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

        {/* Top Navigation Switcher */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setMainTab("management")}
              className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                mainTab === "management"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Coins className="w-3.5 h-3.5" /> Overview & Actions
            </button>
            <button
              type="button"
              onClick={() => setMainTab("history")}
              className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                mainTab === "history"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Transaction History</span>
              {historyTransactions.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {historyTransactions.length}
                </span>
              )}
            </button>
          </div>

          {/* Quick Branch Selector in top bar if superadmin */}
          <div className="hidden sm:flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <select
              disabled={!isSuperAdmin && branches.length <= 1}
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Mobile branch selector */}
          <div className="sm:hidden">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" /> Branch Float
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

          {/* ============================================================== */}
          {/* TAB 1: MANAGEMENT (REPLENISH & ADJUST) */}
          {/* ============================================================== */}
          {mainTab === "management" ? (
            <>
              {/* Current Balance Card */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold text-emerald-800 block">
                    Current Petty Cash Balance ({currentBranchName})
                  </span>
                  <span className="text-2xl font-black text-emerald-700 font-mono">
                    {formatPHP(currentFund?.current_balance ?? 5000)}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Target Float Ceiling: {formatPHP(currentFund?.target_float ?? 5000)}
                  </p>
                </div>
                <div className="flex flex-col sm:items-end justify-center text-[11px] text-slate-500 border-t sm:border-t-0 pt-2 sm:pt-0 border-emerald-200/60">
                  {currentFund?.last_replenished_at && (
                    <div className="flex items-center gap-1 font-medium">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>Last Replenished:</span>
                      <span className="font-semibold text-slate-800">
                        {new Date(currentFund.last_replenished_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setMainTab("history")}
                    className="mt-1 text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 text-xs hover:underline"
                  >
                    View audit ledger ({historyTransactions.length} records) →
                  </button>
                </div>
              </div>

              {/* Action Form Tab Switcher */}
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
                  <SlidersHorizontal className="w-3.5 h-3.5" /> Adjust Balance / Target
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
                      Replenishments are recorded into the system audit trail and immediately
                      increment the available petty cash float for this branch.
                    </span>
                  </div>

                  <div className="flex items-center justify-end pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      )}
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
                      placeholder="e.g. Physical count reconciliation, starting float calibration"
                      value={adjustNotes}
                      onChange={(e) => setAdjustNotes(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      Adjusting the balance directly calibrates the drawer fund and logs an
                      audit record with previous and new balances.
                    </span>
                  </div>

                  <div className="flex items-center justify-end pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-5 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      Save Balance Adjustment
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            /* ============================================================== */
            /* TAB 2: TRANSACTION & REPLENISHMENT HISTORY LEDGER */
            /* ============================================================== */
            <div className="space-y-4">
              {/* Summary Stats Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-[11px] font-medium text-slate-500 block">
                    Available Float
                  </span>
                  <span className="text-base font-bold text-slate-900 font-mono">
                    {formatPHP(currentFund?.current_balance ?? 5000)}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Target: {formatPHP(currentFund?.target_float ?? 5000)}
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50">
                  <span className="text-[11px] font-medium text-emerald-800 flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3 text-emerald-600" /> Cash In (Replenished)
                  </span>
                  <span className="text-base font-bold text-emerald-700 font-mono">
                    {formatPHP(summaryMetrics.inflow)}
                  </span>
                  <span className="text-[10px] text-emerald-600 block mt-0.5">
                    {summaryMetrics.replenishmentCount} top-ups
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/50">
                  <span className="text-[11px] font-medium text-rose-800 flex items-center gap-1">
                    <ArrowDownLeft className="w-3 h-3 text-rose-600" /> Cash Out (Disbursed)
                  </span>
                  <span className="text-base font-bold text-rose-700 font-mono">
                    {formatPHP(summaryMetrics.outflow)}
                  </span>
                  <span className="text-[10px] text-rose-600 block mt-0.5">
                    {summaryMetrics.disbursementCount} disbursements
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/50">
                  <span className="text-[11px] font-medium text-amber-800 flex items-center gap-1">
                    <SlidersHorizontal className="w-3 h-3 text-amber-600" /> Drawer Adjustments
                  </span>
                  <span className="text-base font-bold text-amber-700 font-mono">
                    {summaryMetrics.adjustmentCount}
                  </span>
                  <span className="text-[10px] text-amber-600 block mt-0.5">
                    Count calibrations
                  </span>
                </div>
              </div>

              {/* Search, Filter & Action Bar */}
              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search voucher, payee, note, or staff..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {historySearch && (
                    <button
                      type="button"
                      onClick={() => setHistorySearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Pills & Actions */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => setHistoryFilterType("all")}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                      historyFilterType === "all"
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    All ({historyTransactions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryFilterType("replenishment")}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
                      historyFilterType === "replenishment"
                        ? "bg-emerald-600 text-white"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                    }`}
                  >
                    Cash In ({summaryMetrics.replenishmentCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryFilterType("disbursement")}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
                      historyFilterType === "disbursement"
                        ? "bg-rose-600 text-white"
                        : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                    }`}
                  >
                    Cash Out ({summaryMetrics.disbursementCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryFilterType("adjustment")}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
                      historyFilterType === "adjustment"
                        ? "bg-amber-600 text-white"
                        : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                    }`}
                  >
                    Adjustments ({summaryMetrics.adjustmentCount})
                  </button>

                  {/* Refresh Button */}
                  <button
                    type="button"
                    title="Refresh history"
                    onClick={() => fetchHistory(selectedBranchId)}
                    disabled={historyLoading}
                    className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${historyLoading ? "animate-spin" : ""}`}
                    />
                  </button>

                  {/* Export CSV Button */}
                  <button
                    type="button"
                    title="Export ledger to CSV"
                    onClick={handleExportCSV}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>

              {/* Transactions Ledger View */}
              {historyLoading ? (
                <div className="py-16 text-center text-slate-500 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
                  <p className="text-xs">Loading petty cash ledger history...</p>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="py-12 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 space-y-2">
                  <Coins className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700">
                    No petty cash records found
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {historySearch
                      ? `No transactions matched "${historySearch}". Try adjusting your search or filters.`
                      : "Expenses recorded with petty cash payment method or float replenishments will automatically appear in this ledger."}
                  </p>
                  {historySearch && (
                    <button
                      type="button"
                      onClick={() => setHistorySearch("")}
                      className="text-xs text-emerald-600 hover:underline font-semibold"
                    >
                      Clear search filter
                    </button>
                  )}
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                  {/* Table Header (hidden on small mobile) */}
                  <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <div className="col-span-3">Date & Voucher #</div>
                    <div className="col-span-4">Payee & Purpose</div>
                    <div className="col-span-2">Staff in Charge</div>
                    <div className="col-span-3 text-right">Amount</div>
                  </div>

                  {/* Transaction Rows */}
                  <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                    {filteredTransactions.map((tx) => {
                      const isReplenish = tx.type === "replenishment";
                      const isDisbursement = tx.type === "disbursement";
                      const isAdjustment = tx.type === "adjustment";

                      return (
                        <div
                          key={tx.id}
                          className="p-3 md:px-4 md:py-3 hover:bg-slate-50/80 transition-colors flex flex-col md:grid md:grid-cols-12 md:gap-3 md:items-center text-xs"
                        >
                          {/* Col 1: Date & Voucher (col-span-3) */}
                          <div className="col-span-3 space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isReplenish && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-0.5">
                                  <ArrowUpRight className="w-2.5 h-2.5" /> Cash In
                                </span>
                              )}
                              {isDisbursement && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-0.5">
                                  <ArrowDownLeft className="w-2.5 h-2.5" /> Cash Out
                                </span>
                              )}
                              {isAdjustment && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-0.5">
                                  <SlidersHorizontal className="w-2.5 h-2.5" /> Adjustment
                                </span>
                              )}
                              <span className="font-mono font-semibold text-slate-800">
                                {tx.voucher_number || "NO-REF"}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 block">
                              {new Date(tx.date).toLocaleString("en-PH", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          {/* Col 2: Payee & Purpose (col-span-4) */}
                          <div className="col-span-4 my-1 md:my-0 space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-slate-900">
                                {tx.payee || tx.title}
                              </span>
                              {tx.category_name && (
                                <span
                                  className="text-[10px] px-1.5 py-0.2 rounded-full font-medium"
                                  style={{
                                    backgroundColor: `${tx.category_color || "#64748B"}15`,
                                    color: tx.category_color || "#475569",
                                  }}
                                >
                                  {tx.category_name}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-1">
                              {tx.description || tx.notes || "—"}
                            </p>
                          </div>

                          {/* Col 3: Staff in Charge (col-span-2) */}
                          <div className="col-span-2 text-slate-600 text-[11px]">
                            <span className="font-medium">{tx.staff_name}</span>
                          </div>

                          {/* Col 4: Amount & Receipt (col-span-3) */}
                          <div className="col-span-3 flex items-center justify-between md:justify-end gap-2 mt-1 md:mt-0 pt-1 md:pt-0 border-t md:border-t-0 border-slate-100">
                            {tx.receipt_url ? (
                              <a
                                href={tx.receipt_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-0.5 text-[10px] font-semibold rounded-md border border-slate-200 text-slate-600 hover:text-emerald-700 hover:border-emerald-300 bg-white flex items-center gap-1 transition-colors"
                              >
                                <Receipt className="w-2.5 h-2.5" />
                                <span>Receipt</span>
                                <ExternalLink className="w-2 h-2" />
                              </a>
                            ) : (
                              <span className="hidden md:inline" />
                            )}

                            <div className="text-right">
                              <span
                                className={`text-sm font-black font-mono block ${
                                  isReplenish
                                    ? "text-emerald-600"
                                    : isDisbursement
                                    ? "text-rose-600"
                                    : "text-amber-700"
                                }`}
                              >
                                {isReplenish && `+${formatPHP(tx.amount)}`}
                                {isDisbursement && `-${formatPHP(tx.amount)}`}
                                {isAdjustment && `Set: ${formatPHP(tx.amount)}`}
                              </span>
                              {isAdjustment && tx.previous_balance !== null && (
                                <span className="text-[10px] text-slate-400 block">
                                  Prev: {formatPHP(tx.previous_balance)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {mainTab === "history" ? (
              <span>
                Showing {filteredTransactions.length} of {historyTransactions.length}{" "}
                transactions
              </span>
            ) : (
              <span>Petty Cash Drawer Float System</span>
            )}
          </div>
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
