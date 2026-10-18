"use client";

import { useState } from "react";
import {
  Download,
  Calendar,
  Gift,
  FileSpreadsheet,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import {
  PayrollRun,
  CommissionRecord,
  AttendanceRecord,
  ThirteenthMonthRecord,
  BranchInfo,
} from "./types";
import {
  exportPayrollRegisterExcel,
  exportStatutoryReportExcel,
  exportCommissionsExcel,
  exportAttendanceReportExcel,
  exportThirteenthMonthExcel,
} from "@/lib/payroll/export-helpers";
import { calculate13thMonthYearly, update13thMonthAdjustment } from "./actions";
import { formatPHP } from "@/lib/payroll/philippine-tax";
import toast from "react-hot-toast";

interface ReportsTabProps {
  runs: PayrollRun[];
  commissions: CommissionRecord[];
  attendance: AttendanceRecord[];
  thirteenthMonth: ThirteenthMonthRecord[];
  branches?: BranchInfo[];
  onRefresh: () => void;
}

export function ReportsTab({
  runs,
  commissions,
  attendance,
  thirteenthMonth,
  onRefresh,
}: ReportsTabProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedRunId, setSelectedRunId] = useState<string>(runs[0]?.id || "");
  const [calcLoading, setCalcLoading] = useState(false);

  // Adjustment state for 13th month
  const [adjRecordId, setAdjRecordId] = useState<string | null>(null);
  const [adjAmount, setAdjAmount] = useState<string>("0");
  const [adjReason, setAdjReason] = useState<string>("");

  const activeRun = runs.find((r) => r.id === selectedRunId) || runs[0] || null;
  const items = activeRun?.items || [];

  const handleCompute13th = async () => {
    setCalcLoading(true);
    try {
      const res = await calculate13thMonthYearly(selectedYear);
      if (!res.success) {
        toast.error(res.error || "13th month calculation failed");
      } else {
        toast.success(`13th-month pay calculated for ${res.count} employees!`);
        onRefresh();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to calculate 13th month");
    } finally {
      setCalcLoading(false);
    }
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjRecordId) return;

    try {
      const res = await update13thMonthAdjustment(
        adjRecordId,
        parseFloat(adjAmount) || 0,
        adjReason
      );
      if (!res.success) {
        toast.error(res.error || "Failed to update adjustment");
      } else {
        toast.success("13th-month adjustment updated!");
        setAdjRecordId(null);
        onRefresh();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Adjustment failed");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold font-serif text-ink">Payroll & Statutory Reports</h2>
        <p className="text-xs text-ink-soft">
          Official exportable accounting reports, BIR tax withholding, SSS/PH/HDMF remittances, and 13th-month pay
        </p>
      </div>

      {/* Available One-Click Exports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Payroll Register */}
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-royal">
              Primary Ledger
            </span>
            <FileSpreadsheet size={18} className="text-royal" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-ink">Payroll Register (Excel)</h3>
            <p className="text-xs text-ink-soft mt-0.5">
              Comprehensive report with basic pay, allowances, commissions, all statutory deductions, and net pay.
            </p>
          </div>
          {runs.length > 0 && (
            <div className="pt-2 space-y-2">
              <select
                value={selectedRunId}
                onChange={(e) => setSelectedRunId(e.target.value)}
                className="w-full rounded-xl border border-line bg-pale/30 px-2 py-1 text-xs text-ink font-medium"
              >
                {runs.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.run_number}
                  </option>
                ))}
              </select>
              {activeRun && (
                <button
                  onClick={() => exportPayrollRegisterExcel(activeRun, items)}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-royal px-4 py-2 text-xs font-semibold text-white hover:bg-royal/90 shadow-sm transition-colors"
                >
                  <Download size={14} /> Download Register
                </button>
              )}
            </div>
          )}
        </div>

        {/* Government Contributions Remittance */}
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              Statutory Compliance
            </span>
            <ShieldCheck size={18} className="text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-ink">Government Remittance</h3>
            <p className="text-xs text-ink-soft mt-0.5">
              Clear itemization of SSS, PhilHealth, Pag-IBIG employee & employer shares + BIR withholding tax.
            </p>
          </div>
          {activeRun && (
            <div className="pt-2">
              <button
                onClick={() => exportStatutoryReportExcel(activeRun, items)}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 shadow-2xs transition-colors"
              >
                <Download size={14} /> Export Remittance Summary
              </button>
            </div>
          )}
        </div>

        {/* Attendance Summary */}
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
              Timekeeping
            </span>
            <Calendar size={18} className="text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-ink">Attendance & Overtime</h3>
            <p className="text-xs text-ink-soft mt-0.5">
              Summary of employee days worked, late arrivals, undertime, approved leaves and overtime hours.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => exportAttendanceReportExcel(attendance)}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 shadow-2xs transition-colors"
            >
              <Download size={14} /> Export Attendance
            </button>
          </div>
        </div>

        {/* Commissions Report */}
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
              Staff Incentives
            </span>
            <TrendingUp size={18} className="text-purple-600" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-ink">Commissions Audit Report</h3>
            <p className="text-xs text-ink-soft mt-0.5">
              Treatment breakdown, IV drip infusions, retail consumable sales, and therapist split ratios.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => exportCommissionsExcel(commissions)}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-line bg-pale/40 px-4 py-2 text-xs font-semibold text-ink hover:bg-pale shadow-2xs transition-colors"
            >
              <Download size={14} /> Export All Commissions
            </button>
          </div>
        </div>
      </div>

      {/* 13th-MONTH PAY CALCULATION & REPORTING SECTION */}
      <div className="rounded-3xl border border-line bg-white p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-50 p-2.5 text-amber-700">
              <Gift size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-ink">13th-Month Pay Module</h3>
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 uppercase">
                  P.D. 851 Legal Standard
                </span>
              </div>
              <p className="text-xs text-ink-soft mt-0.5">
                Formula: Qualifying Basic Salary earned in calendar year ÷ 12 months (excluding commissions/OT)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="rounded-xl border border-line bg-white px-3 py-2 text-xs font-bold text-ink"
            >
              {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                <option key={y} value={y}>
                  Calendar Year {y}
                </option>
              ))}
            </select>

            <button
              onClick={handleCompute13th}
              disabled={calcLoading}
              className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 shadow-sm disabled:opacity-50 transition-colors"
            >
              <Calendar size={14} />
              {calcLoading ? "Computing..." : `Calculate ${selectedYear} Payout`}
            </button>

            {thirteenthMonth.length > 0 && (
              <button
                onClick={() => exportThirteenthMonthExcel(thirteenthMonth, selectedYear)}
                className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink-soft hover:bg-pale shadow-2xs"
              >
                <Download size={14} /> Export Report
              </button>
            )}
          </div>
        </div>

        {/* 13th Month Records Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-pale/50 border-b border-line text-ink-soft uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-3">Branch</th>
                <th className="py-3 px-3 text-center">Tenure (Mos)</th>
                <th className="py-3 px-3 font-mono">Total Basic Earned</th>
                <th className="py-3 px-3 font-mono">13th Month Base</th>
                <th className="py-3 px-3 font-mono">Adjustments</th>
                <th className="py-3 px-3 font-mono font-bold text-amber-800">Final Payout</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Adjustment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {thirteenthMonth.map((r) => (
                <tr key={r.id} className="hover:bg-pale/30 transition-colors">
                  <td className="py-3 px-4 font-bold text-ink">
                    {r.staff?.full_name || "Employee"}
                  </td>
                  <td className="py-3 px-3 text-ink-soft">
                    {r.staff?.branches?.name || "Main Branch"}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-ink">
                    {r.months_worked}
                  </td>
                  <td className="py-3 px-3 font-mono text-ink">
                    {formatPHP(r.total_basic_earned)}
                  </td>
                  <td className="py-3 px-3 font-mono text-ink">
                    {formatPHP(r.thirteenth_month_pay)}
                  </td>
                  <td className="py-3 px-3 font-mono text-ink-soft">
                    {r.adjustments !== 0 ? (
                      <span className={r.adjustments > 0 ? "text-emerald-700" : "text-red-600"}>
                        {formatPHP(r.adjustments)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono font-black text-amber-800 text-sm">
                    {formatPHP(r.final_payout)}
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200 uppercase">
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => {
                        setAdjRecordId(r.id);
                        setAdjAmount(r.adjustments.toString());
                        setAdjReason(r.adjustment_reason || "");
                      }}
                      className="rounded-lg border border-line bg-white px-2 py-1 text-[11px] font-semibold text-royal hover:bg-pale"
                    >
                      Adjust
                    </button>
                  </td>
                </tr>
              ))}

              {thirteenthMonth.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-xs text-ink-soft">
                    Click &quot;Calculate {selectedYear} Payout&quot; above to generate the annual 13th-month schedule.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 13th Month Adjustment Modal */}
      {adjRecordId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleSaveAdjustment}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4 text-xs"
          >
            <h3 className="font-bold text-sm text-ink">Adjust 13th-Month Payout</h3>
            <div>
              <label className="block font-semibold text-ink mb-1">Adjustment Amount (₱)</label>
              <input
                type="number"
                step="0.01"
                value={adjAmount}
                onChange={(e) => setAdjAmount(e.target.value)}
                required
                className="w-full rounded-xl border border-line px-3 py-2 font-mono font-bold text-ink"
              />
              <p className="text-[10px] text-ink-soft mt-0.5">Use negative values for deductions.</p>
            </div>
            <div>
              <label className="block font-semibold text-ink mb-1">Documented Reason</label>
              <input
                type="text"
                value={adjReason}
                onChange={(e) => setAdjReason(e.target.value)}
                required
                placeholder="e.g. Pro-rated tenure adjustment"
                className="w-full rounded-xl border border-line px-3 py-2 text-ink"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdjRecordId(null)}
                className="rounded-xl border border-line px-3 py-1.5 font-medium text-ink-soft"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-royal px-4 py-1.5 font-bold text-white hover:bg-royal/90 shadow-sm"
              >
                Save Adjustment
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
