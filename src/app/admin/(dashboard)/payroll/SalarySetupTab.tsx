"use client";

import { useState } from "react";
import {
  Search,
  Plus,
  Edit2,
  Briefcase,
} from "lucide-react";
import {
  EmployeeCompensation,
  BranchInfo,
} from "./types";
import { formatPHP } from "@/lib/payroll/philippine-tax";

interface SalarySetupTabProps {
  compensations: EmployeeCompensation[];
  staffList?: unknown;
  branches: BranchInfo[];
  canManageSettings: boolean;
  onEditCompensation: (comp: EmployeeCompensation | null) => void;
}

export function SalarySetupTab({
  compensations,
  branches,
  canManageSettings,
  onEditCompensation,
}: SalarySetupTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [salaryTypeFilter, setSalaryTypeFilter] = useState("all");
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState("all");

  const filteredCompensations = compensations.filter((c) => {
    // Search
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const nameMatch = c.staff?.full_name?.toLowerCase().includes(q);
      const posMatch = c.position?.toLowerCase().includes(q);
      if (!nameMatch && !posMatch) return false;
    }

    // Branch
    if (branchFilter !== "all" && c.branch_id !== branchFilter) return false;

    // Salary Type
    if (salaryTypeFilter !== "all" && c.salary_type !== salaryTypeFilter) return false;

    // Employment Type
    if (employmentTypeFilter !== "all" && c.employment_type !== employmentTypeFilter) return false;

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold font-serif text-ink">Employee Salary Setup</h2>
          <p className="text-xs text-ink-soft">
            Configure effective-dated base salaries, allowances, and statutory contribution rules
          </p>
        </div>

        {canManageSettings && (
          <button
            onClick={() => onEditCompensation(null)}
            className="flex items-center gap-1.5 rounded-xl bg-royal px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-royal/90 transition-colors"
          >
            <Plus size={14} />
            Configure Employee Salary
          </button>
        )}
      </div>

      {/* Filter Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search employee or position..."
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
            value={salaryTypeFilter}
            onChange={(e) => setSalaryTypeFilter(e.target.value)}
            className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink focus:border-royal focus:outline-hidden"
          >
            <option value="all">All Salary Types</option>
            <option value="monthly">Monthly Salaried</option>
            <option value="daily">Daily Paid</option>
            <option value="hourly">Hourly Paid</option>
            <option value="commission_based">Commission Only</option>
            <option value="mixed">Mixed Compensation</option>
          </select>
        </div>

        <div>
          <select
            value={employmentTypeFilter}
            onChange={(e) => setEmploymentTypeFilter(e.target.value)}
            className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink focus:border-royal focus:outline-hidden"
          >
            <option value="all">All Employment Types</option>
            <option value="regular">Regular</option>
            <option value="probationary">Probationary</option>
            <option value="part_time">Part-Time</option>
            <option value="contractual">Contractual</option>
            <option value="commission_based">Commission Based</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-line bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-pale/50 border-b border-line text-ink-soft uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="py-3 px-4">Employee & Position</th>
                <th className="py-3 px-3">Branch</th>
                <th className="py-3 px-3">Pay Structure</th>
                <th className="py-3 px-3 font-mono">Basic Salary</th>
                <th className="py-3 px-3 font-mono">Daily / Hourly</th>
                <th className="py-3 px-3">Statutory (SSS/PH/PI)</th>
                <th className="py-3 px-3">Allowances</th>
                <th className="py-3 px-3">Disbursal Account</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredCompensations.map((c) => {
                const totalAllowances = (c.allowances || []).reduce(
                  (sum, a) => sum + Number(a.amount || 0),
                  0
                );

                return (
                  <tr key={c.id} className="hover:bg-pale/30 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-ink">
                      <div className="font-bold text-xs text-ink">
                        {c.staff?.full_name || "Employee"}
                      </div>
                      <div className="text-[11px] text-ink-soft flex items-center gap-1.5 mt-0.5">
                        <span className="capitalize">{c.position}</span>
                        <span>•</span>
                        <span className="capitalize font-mono text-[10px]">
                          {c.employment_type}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-xs text-ink-soft">
                      {c.staff?.branches?.name || "Main Branch"}
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="inline-flex rounded-md bg-pale px-2 py-0.5 text-[10px] font-semibold text-ink uppercase">
                        {c.salary_type.replace("_", " ")}
                      </span>
                      <span className="block text-[10px] text-ink-soft mt-0.5 capitalize">
                        {c.payroll_frequency.replace("_", "-")}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 font-mono font-bold text-ink">
                      {formatPHP(c.basic_salary)}
                    </td>

                    <td className="py-3.5 px-3 font-mono text-ink-soft text-[11px]">
                      <div>₱{c.daily_rate.toFixed(2)} / d</div>
                      <div>₱{c.hourly_rate.toFixed(2)} / hr</div>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1 font-mono text-[10px]">
                        <span
                          className={`rounded px-1.5 py-0.5 font-bold ${
                            c.sss_enabled
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          SSS
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 font-bold ${
                            c.philhealth_enabled
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          PH
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 font-bold ${
                            c.pagibig_enabled
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          PI
                        </span>
                      </div>
                      {c.is_minimum_wage_earner && (
                        <span className="block text-[9px] text-royal font-bold mt-0.5">
                          MWE Exempt
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 font-mono text-xs">
                      {totalAllowances > 0 ? (
                        <span className="text-emerald-700 font-semibold">
                          +{formatPHP(totalAllowances)}
                        </span>
                      ) : (
                        <span className="text-ink-soft">—</span>
                      )}
                      {c.notes && (
                        <div className="text-[10px] text-amber-700 font-sans mt-0.5 space-y-0.5">
                          {c.notes.match(/(\d+(?:\.\d+)?)\s*(?:pesos|php)?\s*uniform/i) && (
                            <span className="inline-block bg-amber-50 text-amber-800 px-1 py-0.2 rounded border border-amber-200">
                              -₱{c.notes.match(/(\d+(?:\.\d+)?)\s*(?:pesos|php)?\s*uniform/i)![1]} Uniform
                            </span>
                          )}
                          {c.notes.match(/(\d+(?:\.\d+)?)\s*(?:pesos|php)?\s*(?:cash\s*advance|ca\b|loan\s*advance|advance|vale)/i) && (
                            <span className="inline-block bg-rose-50 text-rose-800 px-1 py-0.2 rounded border border-rose-200 ml-1">
                              -₱{c.notes.match(/(\d+(?:\.\d+)?)\s*(?:pesos|php)?\s*(?:cash\s*advance|ca\b|loan\s*advance|advance|vale)/i)![1]} CA
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-[11px] text-ink-soft">
                      {c.bank_name ? (
                        <div>
                          <span className="font-semibold text-ink">{c.bank_name}</span>
                          <span className="block font-mono text-[10px]">
                            {c.bank_account_number || "No account #"}
                          </span>
                        </div>
                      ) : (
                        <span>Cash Release</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {canManageSettings && (
                        <button
                          onClick={() => onEditCompensation(c)}
                          className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-royal hover:bg-pale transition-colors"
                        >
                          <Edit2 size={12} /> Edit Setup
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredCompensations.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-ink-soft">
                    <Briefcase size={28} className="mx-auto mb-2 text-ink-soft/40" />
                    No employee compensation records found matching your filters.
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
