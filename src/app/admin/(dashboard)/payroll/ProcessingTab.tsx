"use client";

import { useState } from "react";
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Send,
  Lock,
  Download,
  Eye,
  RefreshCw,
  XCircle,
} from "lucide-react";
import {
  PayrollRun,
  PayrollItem,
  EmployeeCompensation,
  AttendanceRecord,
  CommissionRecord,
  BranchInfo,
} from "./types";
import {
  calculatePayrollRun,
  submitForApproval,
  approvePayrollRun,
  releasePayrollRun,
  rejectPayrollRun,
} from "./actions";
import { formatPHP } from "@/lib/payroll/philippine-tax";
import { exportPayrollRegisterExcel } from "@/lib/payroll/export-helpers";
import toast from "react-hot-toast";

interface ProcessingTabProps {
  activeRun: PayrollRun | null;
  runs: PayrollRun[];
  compensations: EmployeeCompensation[];
  attendance: AttendanceRecord[];
  commissions: CommissionRecord[];
  branches?: BranchInfo[];
  currentStaffId: string;
  isSuperAdmin: boolean;
  onSelectRun: (run: PayrollRun) => void;
  onViewPayslip: (item: PayrollItem) => void;
  onRefresh: () => void;
}

export function ProcessingTab({
  activeRun,
  runs,
  compensations,
  attendance,
  commissions,
  currentStaffId,
  isSuperAdmin,
  onSelectRun,
  onViewPayslip,
  onRefresh,
}: ProcessingTabProps) {
  const [loading, setLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejectOpen, setIsRejectOpen] = useState(false);

  const run = activeRun || runs[0] || null;
  const items = run?.items || [];

  // Validation Checks
  const activeComps = compensations.filter((c) => c.employment_status === "active");
  const unconfiguredStaff = activeComps.filter(
    (c) => c.basic_salary === 0 && c.daily_rate === 0 && c.salary_type !== "commission_based"
  );
  const pendingOT = attendance.filter((a) => a.overtime_status === "pending");
  const pendingComms = commissions.filter((c) => c.status === "pending");
  const negativeNetItems = items.filter((i) => i.net_pay <= 0);

  // Separation of duties check
  const isPreparer = run?.created_by === currentStaffId;
  const canSelfApprove = isSuperAdmin; // only super admin can bypass separation of duties

  // 1. Calculate
  const handleCalculate = async () => {
    if (!run) return;
    setLoading(true);
    try {
      const res = await calculatePayrollRun(run.id);
      if (!res.success) {
        toast.error(res.error || "Calculation failed.");
      } else {
        toast.success(`Calculated payroll for ${res.count} employees!`);
        onRefresh();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to calculate payroll");
    } finally {
      setLoading(false);
    }
  };

  // 2. Submit for review
  const handleSubmitReview = async () => {
    if (!run) return;
    setLoading(true);
    try {
      const res = await submitForApproval(run.id);
      if (!res.success) {
        toast.error(res.error || "Submission failed.");
      } else {
        toast.success("Payroll batch submitted for approval!");
        onRefresh();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit payroll");
    } finally {
      setLoading(false);
    }
  };

  // 3. Approve
  const handleApprove = async () => {
    if (!run) return;
    setLoading(true);
    try {
      const res = await approvePayrollRun(run.id, "");
      if (!res.success) {
        toast.error(res.error || "Approval failed.");
      } else {
        toast.success("Payroll run approved! Ready for disbursement.");
        onRefresh();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to approve payroll");
    } finally {
      setLoading(false);
    }
  };

  // 4. Release
  const handleRelease = async () => {
    if (!run) return;
    setLoading(true);
    try {
      const res = await releasePayrollRun(run.id);
      if (!res.success) {
        toast.error(res.error || "Release failed.");
      } else {
        toast.success("Payroll released! All employee payslips are generated and unlocked.");
        onRefresh();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to release payroll");
    } finally {
      setLoading(false);
    }
  };

  // 5. Reject
  const handleReject = async () => {
    if (!run || !rejectionReason.trim()) {
      toast.error("Please provide a reason for returning the payroll.");
      return;
    }
    setLoading(true);
    try {
      const res = await rejectPayrollRun(run.id, rejectionReason);
      if (!res.success) {
        toast.error(res.error || "Rejection failed.");
      } else {
        toast.success("Payroll returned to draft for revision.");
        setIsRejectOpen(false);
        onRefresh();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to reject payroll");
    } finally {
      setLoading(false);
    }
  };

  if (!run) {
    return (
      <div className="rounded-3xl border border-line bg-white p-12 text-center text-xs text-ink-soft">
        <AlertTriangle size={32} className="mx-auto mb-2 text-ink-soft/40" />
        <h3 className="font-bold text-sm text-ink">No Active Payroll Run Selected</h3>
        <p className="mt-1">Initiate a new payroll run from the Dashboard to start processing.</p>
      </div>
    );
  }

  // Workflow steps
  const steps = [
    { key: "draft", label: "1. Draft & Setup", done: true },
    { key: "calculated", label: "2. Calculation", done: items.length > 0 },
    { key: "for_approval", label: "3. For Approval", done: run.status === "for_approval" || run.status === "approved" || run.status === "released" },
    { key: "approved", label: "4. Approved", done: run.status === "approved" || run.status === "released" },
    { key: "released", label: "5. Disbursed & Payslips", done: run.status === "released" },
  ];

  return (
    <div className="space-y-6">
      {/* Run Selector & Status Topbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-line bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-royal/10 p-2.5 text-royal">
            <FileCheck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm text-ink">{run.run_number}</span>
              <span className="rounded-full bg-royal/10 px-2 py-0.5 text-[10px] font-bold text-royal uppercase">
                {run.status.replace("_", " ")}
              </span>
            </div>
            <h2 className="text-sm font-bold text-ink mt-0.5">{run.title}</h2>
            <p className="text-[11px] text-ink-soft">
              Cutoff: {run.period_start} to {run.period_end} • Payout: {run.pay_date} • Branch: {run.branch?.name || "All Branches"}
            </p>
          </div>
        </div>

        {/* Change Run dropdown */}
        <div className="flex items-center gap-2">
          <select
            value={run.id}
            onChange={(e) => {
              const selected = runs.find((r) => r.id === e.target.value);
              if (selected) onSelectRun(selected);
            }}
            className="rounded-xl border border-line bg-pale/30 px-3 py-2 text-xs font-semibold text-ink"
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.run_number} — {r.title} ({r.status.toUpperCase()})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 5-Step Visual Workflow Progress Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {steps.map((st) => (
          <div
            key={st.key}
            className={`rounded-xl p-3 border text-xs text-center transition-all ${
              st.done
                ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-bold"
                : "bg-white border-line text-ink-soft font-medium"
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              {st.done ? <CheckCircle2 size={14} className="text-emerald-600" /> : <div className="h-2 w-2 rounded-full bg-line" />}
              <span>{st.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Validation & Compliance Health Check */}
      <div className="rounded-2xl border border-line bg-white p-4 shadow-sm space-y-2 text-xs">
        <h4 className="font-bold uppercase tracking-wider text-[10px] text-ink-soft">
          Pre-Disbursement Validation & Quality Checks
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
          <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
            unconfiguredStaff.length === 0 ? "bg-emerald-50/60 border-emerald-200 text-emerald-800" : "bg-amber-50 border-amber-200 text-amber-800"
          }`}>
            <span>Salary Config Health</span>
            <span className="font-bold">{unconfiguredStaff.length === 0 ? "✓ Ready" : `${unconfiguredStaff.length} Unconfigured`}</span>
          </div>

          <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
            pendingOT.length === 0 ? "bg-emerald-50/60 border-emerald-200 text-emerald-800" : "bg-amber-50 border-amber-200 text-amber-800"
          }`}>
            <span>Overtime Approvals</span>
            <span className="font-bold">{pendingOT.length === 0 ? "✓ All Verified" : `${pendingOT.length} Pending`}</span>
          </div>

          <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
            pendingComms.length === 0 ? "bg-emerald-50/60 border-emerald-200 text-emerald-800" : "bg-amber-50 border-amber-200 text-amber-800"
          }`}>
            <span>Commissions Attribution</span>
            <span className="font-bold">{pendingComms.length === 0 ? "✓ Attributed" : `${pendingComms.length} Pending`}</span>
          </div>

          <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
            negativeNetItems.length === 0 ? "bg-emerald-50/60 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
          }`}>
            <span>Net Pay Solvency</span>
            <span className="font-bold">{negativeNetItems.length === 0 ? "✓ Validated" : `${negativeNetItems.length} Negative Net`}</span>
          </div>
        </div>
      </div>

      {/* Interactive Workflow Action Controls */}
      <div className="rounded-2xl border-2 border-royal/20 bg-royal/5 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-royal">
            Current Action Step: {run.status.toUpperCase()}
          </span>
          <p className="text-xs text-ink font-medium mt-0.5">
            {run.status === "draft" && "Run authoritative calculation to compute gross, statutory shares, and net."}
            {run.status === "for_review" && "Review calculated figures. Submit for management sign-off."}
            {run.status === "for_approval" && "Management approval required before disbursal."}
            {run.status === "approved" && "Approved! Ready to release funds and unlock employee payslips."}
            {run.status === "released" && "Finalized and disbursed. Payslips generated and locked."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {run.status !== "approved" && run.status !== "released" && (
            <button
              onClick={handleCalculate}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl bg-royal px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-royal/90 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              {items.length === 0 ? "Run Calculation" : "Recalculate Batch"}
            </button>
          )}

          {run.status === "for_review" && (
            <button
              onClick={handleSubmitReview}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              <Send size={14} /> Submit for Approval
            </button>
          )}

          {run.status === "for_approval" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRejectOpen(true)}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-xl border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                <XCircle size={14} /> Reject / Return
              </button>
              <button
                onClick={handleApprove}
                disabled={loading || (isPreparer && !canSelfApprove)}
                title={isPreparer && !canSelfApprove ? "Separation of duties required: cannot approve own run" : ""}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle2 size={14} /> Approve Payroll
              </button>
            </div>
          )}

          {run.status === "approved" && (
            <button
              onClick={handleRelease}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl bg-purple-700 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-purple-800 disabled:opacity-50"
            >
              <Lock size={14} /> Release & Generate Payslips
            </button>
          )}

          <button
            onClick={() => exportPayrollRegisterExcel(run, items)}
            className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink-soft hover:bg-pale shadow-2xs"
          >
            <Download size={14} /> Export Register
          </button>
        </div>
      </div>

      {/* Separation of Duties Warning */}
      {run.status === "for_approval" && isPreparer && !canSelfApprove && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-600 shrink-0" />
          <span>
            <strong>Separation of Duties Notice:</strong> You prepared this payroll batch. Another authorized administrator or branch head must review and approve it.
          </span>
        </div>
      )}

      {/* Rejection Modal / Prompt */}
      {isRejectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-sm text-ink">Return Payroll for Revision</h3>
            <p className="text-xs text-ink-soft">
              Provide specific feedback or discrepancies for the payroll administrator to correct.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Please verify overtime hours for Davao nurse and recalculate."
              className="w-full rounded-xl border border-line p-3 text-xs text-ink focus:border-royal focus:outline-hidden"
              rows={3}
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setIsRejectOpen(false)}
                className="rounded-xl border border-line px-3 py-1.5 text-xs font-medium text-ink-soft"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={loading}
                className="rounded-xl bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-700"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Itemized Calculation Summary Table */}
      <div className="rounded-2xl border border-line bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-line flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm text-ink">Employee Calculation Grid</h3>
            <p className="text-xs text-ink-soft">
              Itemized snapshot of {items.length} employee compensation records
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-ink-soft uppercase font-bold">Total Batch Net</span>
            <div className="text-base font-bold font-mono text-royal">
              {formatPHP(run.total_net_pay)}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-pale/50 border-b border-line text-ink-soft uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-3 font-mono">Basic Pay</th>
                <th className="py-3 px-3 font-mono">OT Pay</th>
                <th className="py-3 px-3 font-mono">Commissions</th>
                <th className="py-3 px-3 font-mono">Gross Pay</th>
                <th className="py-3 px-3 font-mono">SSS (EE)</th>
                <th className="py-3 px-3 font-mono">PH / HDMF</th>
                <th className="py-3 px-3 font-mono">Tax</th>
                <th className="py-3 px-3 font-mono">Total Ded.</th>
                <th className="py-3 px-3 font-mono font-bold text-royal">Net Pay</th>
                <th className="py-3 px-4 text-right">Payslip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-pale/30 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-bold text-ink block">{item.employee_name}</span>
                    <span className="text-[10px] text-ink-soft">{item.position} • {item.branch_name}</span>
                  </td>

                  <td className="py-3 px-3 font-mono font-medium text-ink">
                    {formatPHP(item.basic_pay)}
                  </td>

                  <td className="py-3 px-3 font-mono text-ink-soft">
                    {item.overtime_pay > 0 ? (
                      <span className="text-royal font-semibold">+{formatPHP(item.overtime_pay)}</span>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td className="py-3 px-3 font-mono text-ink-soft">
                    {item.commission_pay > 0 ? (
                      <span className="text-emerald-700 font-semibold">+{formatPHP(item.commission_pay)}</span>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td className="py-3 px-3 font-mono font-bold text-ink">
                    {formatPHP(item.gross_pay)}
                  </td>

                  <td className="py-3 px-3 font-mono text-red-600">
                    -{formatPHP(item.sss_employee)}
                  </td>

                  <td className="py-3 px-3 font-mono text-red-600 text-[11px]">
                    <div>PH: -{item.philhealth_employee.toFixed(2)}</div>
                    <div>PI: -{item.pagibig_employee.toFixed(2)}</div>
                  </td>

                  <td className="py-3 px-3 font-mono text-red-600">
                    {item.withholding_tax > 0 ? `-${formatPHP(item.withholding_tax)}` : "₱0.00"}
                  </td>

                  <td className="py-3 px-3 font-mono font-semibold text-red-700">
                    -{formatPHP(item.total_deductions)}
                  </td>

                  <td className="py-3 px-3 font-mono font-black text-royal text-sm">
                    {formatPHP(item.net_pay)}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onViewPayslip(item)}
                      className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-royal hover:bg-pale shadow-2xs transition-colors"
                    >
                      <Eye size={12} /> View
                    </button>
                  </td>
                </tr>
              ))}

              {items.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-xs text-ink-soft">
                    <Play size={28} className="mx-auto mb-2 text-ink-soft/40" />
                    Click &quot;Run Calculation&quot; above to compute earnings and deductions for this payroll batch.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
