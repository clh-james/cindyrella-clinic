"use client";

import { useState } from "react";
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Play,
  FileText,
  Building2,
} from "lucide-react";
import {
  PayrollRun,
  EmployeeCompensation,
  AttendanceRecord,
  BranchInfo,
} from "./types";
import { formatPHP } from "@/lib/payroll/philippine-tax";

interface PayrollDashboardTabProps {
  runs: PayrollRun[];
  compensations: EmployeeCompensation[];
  attendance: AttendanceRecord[];
  branches: BranchInfo[];
  canViewAllBranches: boolean;
  onNavigateToTab: (tabId: string) => void;
  onSelectRun: (run: PayrollRun) => void;
  onNewRun: () => void;
}

export function PayrollDashboardTab({
  runs,
  compensations,
  attendance,
  branches,
  canViewAllBranches,
  onNavigateToTab,
  onSelectRun,
  onNewRun,
}: PayrollDashboardTabProps) {
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");

  // Filtered runs based on branch
  const filteredRuns = runs.filter((r) => {
    if (selectedBranchId !== "all" && r.branch_id && r.branch_id !== selectedBranchId) {
      return false;
    }
    return true;
  });

  const latestRun = filteredRuns[0] || null;

  // Active employees count
  const activeEmployees = compensations.filter((c) => {
    if (selectedBranchId !== "all" && c.branch_id !== selectedBranchId) return false;
    return c.employment_status === "active";
  });

  // Calculate totals from latest run or all runs in current month
  const totalGross = latestRun ? latestRun.total_gross_pay : 0;
  const totalDeductions = latestRun ? latestRun.total_deductions : 0;
  const totalNet = latestRun ? latestRun.total_net_pay : 0;
  const pendingApprovalsCount = filteredRuns.filter(
    (r) => r.status === "for_approval" || r.status === "for_review"
  ).length;

  // Find incomplete attendance
  const incompleteAttendance = attendance.filter(
    (a) => a.status === "present" && (a.hours_worked === 0 || a.hours_worked < 4)
  );

  return (
    <div className="space-y-6">
      {/* Top Filter and Actions Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold font-serif text-ink">Payroll Overview</h2>
          <p className="text-xs text-ink-soft">
            Clinic employee compensation status, disbursement runs, and compliance monitoring
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {canViewAllBranches && (
            <div className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 shadow-2xs">
              <Building2 size={14} className="text-ink-soft" />
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-ink focus:outline-hidden"
              >
                <option value="all">All Cindyrella Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={onNewRun}
            className="flex items-center gap-1.5 rounded-xl bg-royal px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-royal/90 transition-colors"
          >
            <Play size={14} />
            Start Payroll Run
          </button>
        </div>
      </div>

      {/* 6 Primary KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Active Employees */}
        <div
          onClick={() => onNavigateToTab("salary_setup")}
          className="rounded-2xl border border-line bg-white p-4 shadow-sm cursor-pointer hover:border-royal/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
              Active Staff
            </span>
            <div className="rounded-xl bg-royal/10 p-1.5 text-royal">
              <Users size={16} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-ink">
            {activeEmployees.length}
          </p>
          <p className="mt-0.5 text-[10px] text-ink-soft">Enrolled on payroll</p>
        </div>

        {/* Current Payroll Period */}
        <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
              Current Cycle
            </span>
            <div className="rounded-xl bg-blue-50 p-1.5 text-blue-600">
              <Calendar size={16} />
            </div>
          </div>
          <p className="mt-2 text-sm font-bold text-ink truncate">
            {latestRun ? latestRun.title : "No Active Run"}
          </p>
          <p className="mt-0.5 text-[10px] text-ink-soft">
            {latestRun ? `Pay: ${latestRun.pay_date}` : "Ready to create"}
          </p>
        </div>

        {/* Total Gross Pay */}
        <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
              Gross Earnings
            </span>
            <div className="rounded-xl bg-emerald-50 p-1.5 text-emerald-600">
              <TrendingUp size={16} />
            </div>
          </div>
          <p className="mt-2 text-xl font-bold font-mono text-ink truncate">
            {formatPHP(totalGross)}
          </p>
          <p className="mt-0.5 text-[10px] text-ink-soft">Base + OT + Commissions</p>
        </div>

        {/* Total Deductions */}
        <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
              Deductions
            </span>
            <div className="rounded-xl bg-red-50 p-1.5 text-red-600">
              <DollarSign size={16} />
            </div>
          </div>
          <p className="mt-2 text-xl font-bold font-mono text-red-600 truncate">
            -{formatPHP(totalDeductions)}
          </p>
          <p className="mt-0.5 text-[10px] text-ink-soft">SSS, PH, HDMF & Tax</p>
        </div>

        {/* Total Net Pay */}
        <div className="rounded-2xl border-2 border-royal/30 bg-royal/5 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-royal">
              Net Disbursement
            </span>
            <div className="rounded-xl bg-royal/10 p-1.5 text-royal">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="mt-2 text-xl font-bold font-mono text-royal truncate">
            {formatPHP(totalNet)}
          </p>
          <p className="mt-0.5 text-[10px] text-ink-soft">Net take-home pay</p>
        </div>

        {/* Pending Approvals */}
        <div
          onClick={() => onNavigateToTab("processing")}
          className="rounded-2xl border border-line bg-white p-4 shadow-sm cursor-pointer hover:border-amber-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
              For Approval
            </span>
            <div className="rounded-xl bg-amber-50 p-1.5 text-amber-600">
              <AlertTriangle size={16} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-amber-600">
            {pendingApprovalsCount}
          </p>
          <p className="mt-0.5 text-[10px] text-ink-soft">Awaiting sign-off</p>
        </div>
      </div>

      {/* Main Section: Recent Runs + Alerts Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Payroll Runs (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-line bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h3 className="font-semibold text-sm text-ink">Recent Payroll Batches</h3>
              <p className="text-xs text-ink-soft">Disbursement status and audit history</p>
            </div>
            <button
              onClick={() => onNavigateToTab("history")}
              className="text-xs text-royal font-medium hover:underline flex items-center gap-1"
            >
              Full History <ArrowRight size={13} />
            </button>
          </div>

          <div className="space-y-3">
            {filteredRuns.slice(0, 5).map((run) => {
              const statusColors: Record<string, string> = {
                draft: "bg-gray-100 text-gray-700 border-gray-200",
                for_review: "bg-blue-50 text-blue-700 border-blue-200",
                for_approval: "bg-amber-50 text-amber-700 border-amber-200",
                approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
                released: "bg-purple-50 text-purple-700 border-purple-200",
                cancelled: "bg-red-50 text-red-700 border-red-200",
              };

              return (
                <div
                  key={run.id}
                  onClick={() => onSelectRun(run)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-line bg-pale/20 hover:bg-pale/60 cursor-pointer transition-colors gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-ink">
                        {run.run_number}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold border uppercase ${
                          statusColors[run.status] || "bg-gray-50 text-gray-600"
                        }`}
                      >
                        {run.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-ink">{run.title}</p>
                    <p className="text-[11px] text-ink-soft">
                      Period: {run.period_start} to {run.period_end} • Pay: {run.pay_date}
                    </p>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-line/40 pt-2 sm:pt-0">
                    <span className="font-mono font-bold text-sm text-royal">
                      {formatPHP(run.total_net_pay)}
                    </span>
                    <span className="text-[10px] text-ink-soft">
                      {run.total_employees} Employees • {run.branch?.name || "All Branches"}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredRuns.length === 0 && (
              <div className="py-12 text-center text-xs text-ink-soft flex flex-col items-center gap-2">
                <FileText size={28} className="text-ink-soft/40" />
                <p>No payroll runs recorded yet.</p>
                <button
                  onClick={onNewRun}
                  className="text-xs text-royal font-semibold hover:underline"
                >
                  Create your first payroll run &rarr;
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Alerts & Quick Status (1 col) */}
        <div className="space-y-6">
          {/* Incomplete Attendance Alert */}
          <div className="rounded-2xl border border-line bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-amber-700">
              <Clock size={16} />
              <h4 className="font-semibold text-xs uppercase tracking-wider">
                Attendance Verification
              </h4>
            </div>
            <p className="text-xs text-ink-soft">
              {incompleteAttendance.length > 0
                ? `${incompleteAttendance.length} attendance records require verification before payroll calculation.`
                : "All attendance records for this period are complete and verified."}
            </p>
            {incompleteAttendance.length > 0 && (
              <button
                onClick={() => onNavigateToTab("attendance")}
                className="w-full rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
              >
                Review Incomplete Logs &rarr;
              </button>
            )}
          </div>

          {/* Quick Regulatory Reminder Card */}
          <div className="rounded-2xl border border-line bg-gradient-to-br from-pale/40 to-white p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-royal">
              <ShieldAlert size={16} />
              <h4 className="font-semibold text-xs uppercase tracking-wider">
                Philippine Payroll Compliance
              </h4>
            </div>
            <div className="space-y-1.5 text-xs text-ink-soft">
              <p>• SSS 14% scale (5% EE, 9.5% ER + EC)</p>
              <p>• PhilHealth 5% rate (2.5% EE, 2.5% ER)</p>
              <p>• Pag-IBIG ₱200 EE / ₱200 ER ceiling</p>
              <p>• BIR TRAIN Law withholding tax tables</p>
              <p>• Employer shares excluded from employee net</p>
            </div>
            <button
              onClick={() => onNavigateToTab("settings")}
              className="text-[11px] text-royal font-semibold hover:underline"
            >
              View Statutory Tables &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
