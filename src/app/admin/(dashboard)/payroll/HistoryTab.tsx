"use client";

import { useState } from "react";
import {
  History,
  Search,
  Eye,
  FileSpreadsheet,
} from "lucide-react";
import { PayrollRun, BranchInfo } from "./types";
import { formatPHP } from "@/lib/payroll/philippine-tax";
import { exportPayrollRegisterExcel } from "@/lib/payroll/export-helpers";

interface HistoryTabProps {
  runs: PayrollRun[];
  branches: BranchInfo[];
  onSelectRun: (run: PayrollRun) => void;
}

export function HistoryTab({ runs, branches, onSelectRun }: HistoryTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredRuns = runs.filter((r) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const numMatch = r.run_number?.toLowerCase().includes(q);
      const titleMatch = r.title?.toLowerCase().includes(q);
      if (!numMatch && !titleMatch) return false;
    }

    if (branchFilter !== "all" && r.branch_id !== branchFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold font-serif text-ink">Payroll History & Audit Archive</h2>
          <p className="text-xs text-ink-soft">
            Historical records of completed payroll disbursements, approval logs, and statutory snapshots
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
            placeholder="Search run # or title..."
            className="w-full rounded-xl border border-line bg-white pl-9 pr-3 py-2 text-xs text-ink focus:border-royal focus:outline-hidden"
          />
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

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink focus:border-royal focus:outline-hidden"
          >
            <option value="all">All Statuses</option>
            <option value="released">Released & Disbursed</option>
            <option value="approved">Approved</option>
            <option value="for_approval">For Approval</option>
            <option value="for_review">For Review</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* History Table */}
      <div className="rounded-2xl border border-line bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-pale/50 border-b border-line text-ink-soft uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="py-3 px-4">Run # & Cycle</th>
                <th className="py-3 px-3">Period</th>
                <th className="py-3 px-3">Branch</th>
                <th className="py-3 px-3 text-center">Staff Count</th>
                <th className="py-3 px-3 font-mono">Gross Pay</th>
                <th className="py-3 px-3 font-mono">Deductions</th>
                <th className="py-3 px-3 font-mono font-bold text-royal">Net Pay</th>
                <th className="py-3 px-3">Pay Date</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredRuns.map((r) => {
                const statusBadges: Record<string, string> = {
                  draft: "bg-gray-100 text-gray-700 border-gray-200",
                  for_review: "bg-blue-50 text-blue-700 border-blue-200",
                  for_approval: "bg-amber-50 text-amber-700 border-amber-200",
                  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
                  released: "bg-purple-50 text-purple-700 border-purple-200",
                };

                return (
                  <tr key={r.id} className="hover:bg-pale/30 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-ink">
                      <span className="font-mono font-bold text-xs text-ink block">
                        {r.run_number}
                      </span>
                      <span className="text-[11px] font-semibold text-ink-soft">{r.title}</span>
                    </td>

                    <td className="py-3.5 px-3 font-mono text-[11px] text-ink-soft">
                      {r.period_start} &rarr; {r.period_end}
                    </td>

                    <td className="py-3.5 px-3 text-xs text-ink-soft">
                      {r.branch?.name || "All Branches"}
                    </td>

                    <td className="py-3.5 px-3 text-center font-mono font-bold text-ink">
                      {r.total_employees}
                    </td>

                    <td className="py-3.5 px-3 font-mono font-medium text-ink">
                      {formatPHP(r.total_gross_pay)}
                    </td>

                    <td className="py-3.5 px-3 font-mono text-red-600">
                      -{formatPHP(r.total_deductions)}
                    </td>

                    <td className="py-3.5 px-3 font-mono font-black text-royal text-sm">
                      {formatPHP(r.total_net_pay)}
                    </td>

                    <td className="py-3.5 px-3 font-mono text-[11px] text-ink">
                      {r.pay_date}
                    </td>

                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold border uppercase ${
                          statusBadges[r.status] || "bg-gray-50 text-gray-600"
                        }`}
                      >
                        {r.status.replace("_", " ")}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectRun(r)}
                          className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-royal hover:bg-pale transition-colors"
                        >
                          <Eye size={12} /> View
                        </button>
                        <button
                          onClick={() => exportPayrollRegisterExcel(r, r.items || [])}
                          title="Export Excel"
                          className="rounded-lg border border-line bg-white p-1 text-ink-soft hover:bg-pale transition-colors"
                        >
                          <FileSpreadsheet size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredRuns.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-xs text-ink-soft">
                    <History size={28} className="mx-auto mb-2 text-ink-soft/40" />
                    No historical payroll runs found.
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
