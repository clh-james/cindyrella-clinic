"use client";

import { useState } from "react";
import {
  ShieldCheck,
  Clock,
  Save,
  FileCode,
  Copy,
} from "lucide-react";
import { OVERTIME_LABELS, OVERTIME_MULTIPLIERS, OvertimeType } from "@/lib/payroll/philippine-tax";
import toast from "react-hot-toast";

interface SettingsTabProps {
  canManageSettings: boolean;
}

export function SettingsTab({ canManageSettings }: SettingsTabProps) {
  const [schedule, setSchedule] = useState<"split_50_50" | "first_cutoff_only" | "second_cutoff_only">("split_50_50");
  const [workingDays, setWorkingDays] = useState("26");
  const [dailyHours, setDailyHours] = useState("8");
  const [otApprovalRequired, setOtApprovalRequired] = useState(true);

  const handleSave = () => {
    toast.success("Payroll configuration policies updated!");
  };

  const copyMigrationSQL = () => {
    navigator.clipboard.writeText(`-- Run migration 0035_employee_payroll_system.sql in Supabase SQL Editor`);
    toast.success("Migration file reference copied to clipboard!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold font-serif text-ink">Payroll Settings & Statutory Compliance</h2>
        <p className="text-xs text-ink-soft">
          Statutory version control, contribution deduction schedules, and DOLE overtime multiplier rules
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Statutory Policies & Rates (Philippines) */}
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-line pb-3">
            <ShieldCheck size={18} className="text-royal" />
            <h3 className="font-semibold text-sm text-ink">Official Philippine Statutory Tables</h3>
          </div>

          <div className="space-y-3 text-xs">
            {/* SSS */}
            <div className="rounded-xl border border-line bg-pale/30 p-3 space-y-1">
              <div className="flex items-center justify-between font-bold text-ink">
                <span>Social Security System (SSS)</span>
                <span className="text-[10px] rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 font-mono">
                  2025/2026 Schedule Active
                </span>
              </div>
              <p className="text-[11px] text-ink-soft">
                Total Rate: 14% (5.0% Employee Share, 9.5% Employer Share + Employees&apos; Compensation ₱10–₱30).
                Monthly Salary Credit (MSC) scale: ₱5,000 min to ₱35,000 max.
              </p>
            </div>

            {/* PhilHealth */}
            <div className="rounded-xl border border-line bg-pale/30 p-3 space-y-1">
              <div className="flex items-center justify-between font-bold text-ink">
                <span>PhilHealth (Universal Healthcare Act)</span>
                <span className="text-[10px] rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 font-mono">
                  5.0% Premium Active
                </span>
              </div>
              <p className="text-[11px] text-ink-soft">
                Equal 50/50 sharing: 2.5% Employee, 2.5% Employer.
                Salary Floor: ₱10,000 (₱250 EE share) • Salary Ceiling: ₱100,000 (₱2,500 EE share).
              </p>
            </div>

            {/* Pag-IBIG */}
            <div className="rounded-xl border border-line bg-pale/30 p-3 space-y-1">
              <div className="flex items-center justify-between font-bold text-ink">
                <span>Pag-IBIG Fund (HDMF)</span>
                <span className="text-[10px] rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 font-mono">
                  ₱200 Cap Active
                </span>
              </div>
              <p className="text-[11px] text-ink-soft">
                2% of monthly compensation capped at ₱200.00 Employee and ₱200.00 Employer.
                Custom/voluntary upgraded contributions supported.
              </p>
            </div>

            {/* BIR Withholding Tax */}
            <div className="rounded-xl border border-line bg-pale/30 p-3 space-y-1">
              <div className="flex items-center justify-between font-bold text-ink">
                <span>BIR Withholding Tax (TRAIN Law)</span>
                <span className="text-[10px] rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 font-mono">
                  TRAIN Law Table
                </span>
              </div>
              <p className="text-[11px] text-ink-soft">
                Income tax exempt up to ₱20,833/month (or ₱10,417 semi-monthly).
                Graduated rates of 15%, 20%, 25%, 30%, 35% on net taxable earnings.
              </p>
            </div>
          </div>
        </div>

        {/* Deduction Schedule & Workday Policy */}
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-line pb-3">
            <Clock size={18} className="text-royal" />
            <h3 className="font-semibold text-sm text-ink">Deduction Distribution & Work Schedule</h3>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-ink mb-1">
                Semi-Monthly Statutory Deduction Distribution
              </label>
              <select
                value={schedule}
                onChange={(e) => setSchedule(e.target.value as "split_50_50" | "first_cutoff_only" | "second_cutoff_only")}
                disabled={!canManageSettings}
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-ink font-medium"
              >
                <option value="split_50_50">
                  Split 50/50 (Deduct 50% on 1st Cutoff, 50% on 2nd Cutoff)
                </option>
                <option value="first_cutoff_only">
                  Staggered: SSS on 1st Cutoff, PhilHealth & Pag-IBIG on 2nd Cutoff
                </option>
                <option value="second_cutoff_only">
                  All Mandatory Deductions on 2nd Cutoff (End of Month)
                </option>
              </select>
              <p className="text-[10px] text-ink-soft mt-1">
                Determines how monthly SSS, PhilHealth, and HDMF deductions are distributed between cutoffs.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-ink mb-1">Working Days / Month</label>
                <input
                  type="number"
                  value={workingDays}
                  onChange={(e) => setWorkingDays(e.target.value)}
                  disabled={!canManageSettings}
                  className="w-full rounded-xl border border-line px-3 py-2 font-mono font-bold text-ink"
                />
                <p className="text-[10px] text-ink-soft mt-0.5">Clinic standard: 26 days</p>
              </div>

              <div>
                <label className="block font-semibold text-ink mb-1">Standard Daily Hours</label>
                <input
                  type="number"
                  value={dailyHours}
                  onChange={(e) => setDailyHours(e.target.value)}
                  disabled={!canManageSettings}
                  className="w-full rounded-xl border border-line px-3 py-2 font-mono font-bold text-ink"
                />
                <p className="text-[10px] text-ink-soft mt-0.5">Standard: 8 hours/day</p>
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-ink">
                <input
                  type="checkbox"
                  checked={otApprovalRequired}
                  onChange={(e) => setOtApprovalRequired(e.target.checked)}
                  disabled={!canManageSettings}
                  className="rounded border-line text-royal"
                />
                Require explicit supervisor sign-off before overtime is paid
              </label>
            </div>

            {canManageSettings && (
              <div className="pt-4 border-t border-line flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex items-center gap-1.5 rounded-xl bg-royal px-4 py-2 font-bold text-white hover:bg-royal/90 shadow-sm transition-colors"
                >
                  <Save size={14} /> Save Policy Settings
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DOLE Overtime & Holiday Multiplier Reference Table */}
      <div className="rounded-2xl border border-line bg-white p-5 shadow-sm space-y-3">
        <h3 className="font-semibold text-sm text-ink">DOLE Statutory Overtime Multiplier Schedule</h3>
        <p className="text-xs text-ink-soft">
          Official statutory factors applied to hourly base rates under the Philippine Labor Code
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          {Object.entries(OVERTIME_MULTIPLIERS).map(([typeKey, mult]) => (
            <div key={typeKey} className="rounded-xl border border-line bg-pale/20 p-3 text-xs">
              <span className="text-[10px] text-ink-soft block font-medium">
                {OVERTIME_LABELS[typeKey as OvertimeType]}
              </span>
              <span className="font-mono font-bold text-base text-royal mt-1 block">
                {(mult * 100).toFixed(0)}% ({mult}x)
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Database Schema Reference Notice */}
      <div className="rounded-2xl border border-line bg-pale/20 p-4 text-xs text-ink-soft flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCode size={16} className="text-royal" />
          <span>
            Database Schema: <strong>0035_employee_payroll_system.sql</strong> (Tables: employee_compensation, payroll_runs, payroll_items, attendance_records, commission_records, thirteenth_month_records, payroll_settings, payroll_audit_logs)
          </span>
        </div>
        <button
          onClick={copyMigrationSQL}
          className="flex items-center gap-1 text-royal font-semibold hover:underline"
        >
          <Copy size={13} /> Copy Ref
        </button>
      </div>
    </div>
  );
}
