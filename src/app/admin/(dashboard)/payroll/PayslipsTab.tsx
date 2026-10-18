"use client";

import { useState } from "react";
import {
  FileText,
  Search,
  Printer,
  Lock,
} from "lucide-react";
import { PayrollItem, PayrollRun, BranchInfo } from "./types";
import { formatPHP } from "@/lib/payroll/philippine-tax";

interface PayslipsTabProps {
  runs: PayrollRun[];
  branches: BranchInfo[];
  currentStaffId?: string;
  isSuperAdmin?: boolean;
  onViewPayslip: (item: PayrollItem, run?: PayrollRun) => void;
}

export function PayslipsTab({
  runs,
  branches,
  onViewPayslip,
}: PayslipsTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRunId, setSelectedRunId] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");

  // Collect all items from runs
  const allItems: { item: PayrollItem; run: PayrollRun }[] = [];
  runs.forEach((r) => {
    (r.items || []).forEach((item) => {
      allItems.push({ item, run: r });
    });
  });

  const filtered = allItems.filter(({ item, run }) => {
    if (selectedRunId !== "all" && run.id !== selectedRunId) return false;
    if (branchFilter !== "all" && item.branch_id !== branchFilter) return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const nameMatch = item.employee_name?.toLowerCase().includes(q);
      const psMatch = item.payslip_number?.toLowerCase().includes(q);
      const posMatch = item.position?.toLowerCase().includes(q);
      if (!nameMatch && !psMatch && !posMatch) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold font-serif text-ink">Employee Payslips</h2>
          <p className="text-xs text-ink-soft">
            Official printable confidential salary vouchers and compensation statements
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search employee or payslip #..."
            className="w-full rounded-xl border border-line bg-white pl-9 pr-3 py-2 text-xs text-ink focus:border-royal focus:outline-hidden"
          />
        </div>

        <div>
          <select
            value={selectedRunId}
            onChange={(e) => setSelectedRunId(e.target.value)}
            className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink focus:border-royal focus:outline-hidden"
          >
            <option value="all">All Payroll Runs ({runs.length})</option>
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.run_number} — {r.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink focus:border-royal focus:outline-hidden"
          >
            <option value="all">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Payslips Grid / Table */}
      <div className="rounded-2xl border border-line bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-pale/50 border-b border-line text-ink-soft uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="py-3 px-4">Payslip # & Date</th>
                <th className="py-3 px-3">Employee</th>
                <th className="py-3 px-3">Branch</th>
                <th className="py-3 px-3">Run & Cutoff</th>
                <th className="py-3 px-3 font-mono">Gross Pay</th>
                <th className="py-3 px-3 font-mono">Deductions</th>
                <th className="py-3 px-3 font-mono font-bold text-royal">Net Pay</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map(({ item, run }) => {
                const isLocked = run.status === "released";

                return (
                  <tr key={item.id} className="hover:bg-pale/30 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-ink">
                      <span className="font-mono font-bold text-xs text-royal block">
                        {item.payslip_number}
                      </span>
                      <span className="text-[10px] text-ink-soft">Pay Date: {run.pay_date}</span>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="font-bold text-ink block">{item.employee_name}</span>
                      <span className="text-[10px] text-ink-soft capitalize">
                        {item.position} • {item.salary_type}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-ink-soft text-[11px]">
                      {item.branch_name}
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="font-semibold text-ink block">{run.title}</span>
                      <span className="text-[10px] text-ink-soft font-mono">
                        {run.period_start} &rarr; {run.period_end}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 font-mono font-medium text-ink">
                      {formatPHP(item.gross_pay)}
                    </td>

                    <td className="py-3.5 px-3 font-mono text-red-600">
                      -{formatPHP(item.total_deductions)}
                    </td>

                    <td className="py-3.5 px-3 font-mono font-bold text-royal text-sm">
                      {formatPHP(item.net_pay)}
                    </td>

                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border uppercase ${
                          isLocked
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {isLocked ? <Lock size={10} /> : null}
                        {isLocked ? "Released" : "Pending Release"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onViewPayslip(item, run)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-royal/10 px-3 py-1.5 text-xs font-semibold text-royal hover:bg-royal/20 transition-colors"
                      >
                        <Printer size={13} /> View & Print
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-ink-soft">
                    <FileText size={28} className="mx-auto mb-2 text-ink-soft/40" />
                    No payslips found matching your filters.
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
