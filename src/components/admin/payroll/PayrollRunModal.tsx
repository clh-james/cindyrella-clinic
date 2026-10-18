"use client";

import { useState } from "react";
import { X, Play, Calendar } from "lucide-react";
import { BranchInfo, PayrollFrequency, PayrollRun } from "@/app/admin/(dashboard)/payroll/types";
import { createPayrollRun } from "@/app/admin/(dashboard)/payroll/actions";
import toast from "react-hot-toast";

interface PayrollRunModalProps {
  branches: BranchInfo[];
  canViewAllBranches: boolean;
  onClose: () => void;
  onCreated: (run: PayrollRun) => void;
}

export function PayrollRunModal({
  branches,
  canViewAllBranches,
  onClose,
  onCreated,
}: PayrollRunModalProps) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const isFirstHalf = now.getDate() <= 15;

  const defaultStart = isFirstHalf
    ? `${year}-${String(month).padStart(2, "0")}-01`
    : `${year}-${String(month).padStart(2, "0")}-16`;

  // Compute last day of month
  const lastDay = new Date(year, month, 0).getDate();
  const defaultEnd = isFirstHalf
    ? `${year}-${String(month).padStart(2, "0")}-15`
    : `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

  const defaultPayDate = isFirstHalf
    ? `${year}-${String(month).padStart(2, "0")}-20`
    : `${year}-${String(month + 1).padStart(2, "0")}-05`;

  const defaultTitle = `${now.toLocaleString("en-US", { month: "long" })} ${year} — ${isFirstHalf ? "1st Cutoff" : "2nd Cutoff"}`;

  const [title, setTitle] = useState(defaultTitle);
  const [cutoffFrequency, setCutoffFrequency] = useState<PayrollFrequency>("semi_monthly");
  const [periodStart, setPeriodStart] = useState(defaultStart);
  const [periodEnd, setPeriodEnd] = useState(defaultEnd);
  const [payDate, setPayDate] = useState(defaultPayDate);
  const [branchId, setBranchId] = useState<string>(canViewAllBranches ? "" : branches[0]?.id || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await createPayrollRun({
        title,
        cutoffFrequency,
        periodStart,
        periodEnd,
        payDate,
        branchId: branchId || null,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to initiate payroll run");
      } else {
        toast.success("Payroll run created! Ready for calculation.");
        onCreated(res.run);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create payroll batch";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-royal/10 p-2 text-royal">
              <Calendar size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold font-serif text-ink">New Payroll Run</h2>
              <p className="text-xs text-ink-soft">Initiate a formal calculation batch for salary disbursement</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl border border-line p-2 text-ink-soft hover:bg-pale">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-ink mb-1">Payroll Run Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. October 2026 — 1st Cutoff"
              className="w-full rounded-xl border border-line px-3 py-2 text-xs font-semibold text-ink focus:border-royal focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink mb-1">Cutoff Frequency</label>
              <select
                value={cutoffFrequency}
                onChange={(e) => setCutoffFrequency(e.target.value as PayrollFrequency)}
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-ink font-medium"
              >
                <option value="semi_monthly">Semi-Monthly (15-Day Cycle)</option>
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-ink mb-1">Clinic Branch Scope</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full rounded-xl border border-line bg-pale/40 px-3 py-2 text-ink font-medium"
              >
                {canViewAllBranches && <option value="">All Cindyrella Branches</option>}
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-pale/30 border border-line p-3">
            <div>
              <label className="block font-semibold text-ink mb-1">Cutoff Period Start</label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                required
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-ink font-mono font-medium"
              />
            </div>
            <div>
              <label className="block font-semibold text-ink mb-1">Cutoff Period End</label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                required
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-ink font-mono font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-ink mb-1">Scheduled Payout Date</label>
            <input
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              required
              className="w-full rounded-xl border border-line px-3 py-2 text-ink font-mono font-semibold"
            />
            <p className="text-[10px] text-ink-soft mt-1">
              Date when bank transfers, e-wallet, or cash releases will be disbursed.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-line px-4 py-2 text-ink-soft hover:bg-pale font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl bg-royal px-5 py-2 font-semibold text-white hover:bg-royal/90 shadow-sm"
            >
              <Play size={14} />
              {loading ? "Creating..." : "Create & Open Run"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
