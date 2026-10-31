"use client";

import { Printer, X } from "lucide-react";
import { PayrollItem, PayrollRun } from "@/app/admin/(dashboard)/payroll/types";
import { formatPHP } from "@/lib/payroll/philippine-tax";

interface PayslipPrintViewProps {
  item: PayrollItem;
  run?: PayrollRun | null;
  onClose: () => void;
}

export function PayslipPrintView({ item, run, onClose }: PayslipPrintViewProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs print:p-0 print:bg-white print:fixed print:inset-0">
      {/* Container */}
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl print:max-h-none print:w-full print:p-8 print:shadow-none print:rounded-none">
        
        {/* Action Header - Hidden on Print */}
        <div className="mb-6 flex items-center justify-between border-b border-line pb-4 print:hidden">
          <div>
            <h2 className="text-lg font-bold font-serif text-ink">Employee Payslip Preview</h2>
            <p className="text-xs text-ink-soft">Official confidential remuneration statement</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl bg-royal px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-royal/90 transition-colors"
            >
              <Printer size={15} />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="rounded-xl border border-line p-2 text-ink-soft hover:bg-pale transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Payslip Body */}
        <div id="payslip-document" className="space-y-6 text-ink print:text-black">
          {/* Header */}
          <div className="text-center border-b border-line pb-4">
            <p className="text-[11px] font-bold tracking-widest text-royal uppercase">Cindyrella Aesthetic & Wellness</p>
            <h1 className="text-xl sm:text-2xl font-serif font-black tracking-tight text-ink mt-0.5">EMPLOYEE PAYSLIP</h1>
            <p className="text-xs text-ink-soft mt-1">Medical Group • Dermatology & Wellness Clinic</p>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-pale px-3 py-1 font-mono text-[11px] font-semibold text-ink">
              <span>REF: {item.payslip_number}</span>
              <span>•</span>
              <span>Pay Date: {run?.pay_date || new Date().toISOString().slice(0, 10)}</span>
            </div>
          </div>

          {/* Employee & Period Details Grid */}
          <div className="grid grid-cols-2 gap-4 rounded-2xl bg-pale/40 p-4 border border-line text-xs">
            <div>
              <p className="text-[10px] uppercase font-semibold text-ink-soft">Employee Name</p>
              <p className="font-bold text-sm text-ink">{item.employee_name}</p>
              <p className="text-ink-soft mt-0.5">{item.position} • {item.salary_type.toUpperCase()}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold text-ink-soft">Branch & Assignment</p>
              <p className="font-bold text-sm text-ink">{item.branch_name}</p>
              <p className="text-ink-soft mt-0.5">ID: {item.employee_id.slice(0, 8).toUpperCase()}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold text-ink-soft">Payroll Period</p>
              <p className="font-semibold text-ink">
                {run ? `${run.period_start} to ${run.period_end}` : "Current Cutoff"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold text-ink-soft">Days & Hours Rendered</p>
              <p className="font-semibold text-ink font-mono">
                {item.days_worked} days • {item.hours_worked.toFixed(1)} hrs
              </p>
            </div>
          </div>

          {/* Earnings & Deductions Tables (Two Columns on large, stacked on small) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* EARNINGS */}
            <div className="rounded-2xl border border-line p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-line pb-2">
                <span className="font-bold text-xs uppercase tracking-wider text-emerald-700">Gross Earnings</span>
                <span className="text-[10px] text-ink-soft font-semibold">AMOUNT</span>
              </div>
              <div className="space-y-2 text-xs divide-y divide-line/40">
                <div className="flex justify-between pt-1.5">
                  <span className="text-ink-soft">Basic Pay</span>
                  <span className="font-mono font-medium">{formatPHP(item.basic_pay)}</span>
                </div>
                {item.overtime_pay > 0 && (
                  <div className="flex justify-between pt-1.5">
                    <span className="text-ink-soft">Overtime Pay</span>
                    <span className="font-mono font-medium">{formatPHP(item.overtime_pay)}</span>
                  </div>
                )}
                {item.commission_pay > 0 && (
                  <div className="flex justify-between pt-1.5">
                    <span className="text-ink-soft">Service & Sales Commission</span>
                    <span className="font-mono font-medium text-emerald-600">{formatPHP(item.commission_pay)}</span>
                  </div>
                )}
                {item.allowance_pay > 0 && (
                  <div className="flex justify-between pt-1.5">
                    <span className="text-ink-soft">Allowances (De Minimis & Other)</span>
                    <span className="font-mono font-medium">{formatPHP(item.allowance_pay)}</span>
                  </div>
                )}
                {item.holiday_pay > 0 && (
                  <div className="flex justify-between pt-1.5">
                    <span className="text-ink-soft">Holiday Premium</span>
                    <span className="font-mono font-medium">{formatPHP(item.holiday_pay)}</span>
                  </div>
                )}
              </div>
              <div className="border-t border-line pt-2 flex justify-between font-bold text-sm text-emerald-800">
                <span>GROSS PAY</span>
                <span className="font-mono">{formatPHP(item.gross_pay)}</span>
              </div>
            </div>

            {/* DEDUCTIONS */}
            <div className="rounded-2xl border border-line p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-line pb-2">
                <span className="font-bold text-xs uppercase tracking-wider text-red-700">Authorized Deductions</span>
                <span className="text-[10px] text-ink-soft font-semibold">AMOUNT</span>
              </div>
              <div className="space-y-2 text-xs divide-y divide-line/40">
                {item.sss_employee > 0 && (
                  <div className="flex justify-between pt-1.5">
                    <span className="text-ink-soft">SSS Contribution (EE)</span>
                    <span className="font-mono text-red-600">-{formatPHP(item.sss_employee)}</span>
                  </div>
                )}
                {item.philhealth_employee > 0 && (
                  <div className="flex justify-between pt-1.5">
                    <span className="text-ink-soft">PhilHealth Premium (EE)</span>
                    <span className="font-mono text-red-600">-{formatPHP(item.philhealth_employee)}</span>
                  </div>
                )}
                {item.pagibig_employee > 0 && (
                  <div className="flex justify-between pt-1.5">
                    <span className="text-ink-soft">Pag-IBIG / HDMF (EE)</span>
                    <span className="font-mono text-red-600">-{formatPHP(item.pagibig_employee)}</span>
                  </div>
                )}
                {item.withholding_tax > 0 && (
                  <div className="flex justify-between pt-1.5">
                    <span className="text-ink-soft">BIR Withholding Tax</span>
                    <span className="font-mono text-red-600">-{formatPHP(item.withholding_tax)}</span>
                  </div>
                )}
                {item.late_undertime_deduction > 0 && (
                  <div className="flex justify-between pt-1.5">
                    <span className="text-ink-soft">
                      {item.attendance_summary?.late_minutes && !item.attendance_summary?.undertime_minutes
                        ? `Late Penalty (${item.attendance_summary.late_minutes}m @ ₱10/min)`
                        : item.attendance_summary?.late_minutes
                        ? `Tardiness (${item.attendance_summary.late_minutes}m @ ₱10/min) & Undertime`
                        : "Tardiness & Undertime"}
                    </span>
                    <span className="font-mono text-red-600">-{formatPHP(item.late_undertime_deduction)}</span>
                  </div>
                )}
                {item.absence_deduction > 0 && (
                  <div className="flex justify-between pt-1.5">
                    <span className="text-ink-soft">Unexcused Absences</span>
                    <span className="font-mono text-red-600">-{formatPHP(item.absence_deduction)}</span>
                  </div>
                )}
                {item.loan_advance_deduction > 0 && (
                  <div className="flex justify-between pt-1.5">
                    <span className="text-ink-soft">Cash Advance / Vale</span>
                    <span className="font-mono text-red-600">-{formatPHP(item.loan_advance_deduction)}</span>
                  </div>
                )}
                {item.other_deductions > 0 && (
                  <div className="flex justify-between pt-1.5">
                    <span className="text-ink-soft">Uniform / Other Deductions</span>
                    <span className="font-mono text-red-600">-{formatPHP(item.other_deductions)}</span>
                  </div>
                )}
                {item.total_deductions === 0 && (
                  <div className="py-2 text-center text-xs text-ink-soft italic">No deductions applied.</div>
                )}
              </div>
              <div className="border-t border-line pt-2 flex justify-between font-bold text-sm text-red-800">
                <span>TOTAL DEDUCTIONS</span>
                <span className="font-mono">-{formatPHP(item.total_deductions)}</span>
              </div>
            </div>

          </div>

          {/* NET TAKE-HOME PAY HIGHLIGHT BANNER */}
          <div className="rounded-2xl bg-royal/10 border-2 border-royal/30 p-5 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-royal">NET TAKE-HOME PAY</span>
              <p className="text-xs text-ink-soft mt-0.5">Credited to registered payment account</p>
            </div>
            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-black font-mono text-royal">
                {formatPHP(item.net_pay)}
              </span>
            </div>
          </div>

          {/* Statutory Employer Contributions (Transparency Note) */}
          <div className="rounded-xl border border-line bg-pale/20 p-3 text-[11px] text-ink-soft flex items-center justify-between">
            <span>Employer Contributions (Not deducted from pay):</span>
            <span className="font-mono font-medium text-ink">
              SSS: {formatPHP(item.sss_employer)} • PhilHealth: {formatPHP(item.philhealth_employer)} • Pag-IBIG: {formatPHP(item.pagibig_employer)}
            </span>
          </div>

          {/* Signatures & Certification */}
          <div className="pt-6 grid grid-cols-2 gap-12 text-center text-xs">
            <div className="border-t border-line pt-2">
              <p className="font-semibold text-ink">Prepared & Certified by</p>
              <p className="text-[10px] text-ink-soft mt-0.5">Cindyrella Payroll Admin / HR</p>
            </div>
            <div className="border-t border-line pt-2">
              <p className="font-semibold text-ink">Employee Acknowledgement</p>
              <p className="text-[10px] text-ink-soft mt-0.5">Signature over printed name</p>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="text-center text-[10px] text-ink-soft/80 border-t border-line/60 pt-3">
            <p>This is an official computer-generated payslip from Cindyrella Aesthetic & Wellness Management System.</p>
            <p>Generated: {new Date().toLocaleString("en-PH")} • All calculations are protected by clinic data privacy.</p>
          </div>

        </div>

      </div>
    </div>
  );
}
