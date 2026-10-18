"use client";

import { useState } from "react";
import {
  Sparkles,
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  Download,
} from "lucide-react";
import { CommissionRecord, BranchInfo, StaffBasic } from "./types";
import { approveCommission } from "./actions";
import { formatPHP } from "@/lib/payroll/philippine-tax";
import { exportCommissionsExcel } from "@/lib/payroll/export-helpers";
import toast from "react-hot-toast";

interface CommissionsTabProps {
  commissions: CommissionRecord[];
  branches: BranchInfo[];
  staffList?: StaffBasic[];
  onOpenCommissionModal: () => void;
  onRefresh: () => void;
}

export function CommissionsTab({
  commissions,
  branches,
  onOpenCommissionModal,
  onRefresh,
}: CommissionsTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");

  const filteredCommissions = commissions.filter((c) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const staffMatch = c.staff?.full_name?.toLowerCase().includes(q);
      const itemMatch = c.item_name?.toLowerCase().includes(q);
      const refMatch = c.reference_number?.toLowerCase().includes(q);
      if (!staffMatch && !itemMatch && !refMatch) return false;
    }

    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (sourceFilter !== "all" && c.source_type !== sourceFilter) return false;
    if (branchFilter !== "all" && c.branch_id !== branchFilter) return false;

    return true;
  });

  const totalCommissionEarned = filteredCommissions
    .filter((c) => c.status === "approved" || c.status === "paid")
    .reduce((sum, c) => sum + Number(c.commission_amount || 0), 0);

  const pendingClaims = commissions.filter((c) => c.status === "pending");

  const handleApprove = async (id: string, isApproved: boolean) => {
    try {
      const res = await approveCommission(id, isApproved);
      if (!res.success) {
        toast.error(res.error || "Failed to update commission claim");
      } else {
        toast.success(isApproved ? "Commission approved!" : "Commission rejected.");
        onRefresh();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to process commission claim");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold font-serif text-ink">Treatment & Product Commissions</h2>
          <p className="text-xs text-ink-soft">
            Service performance incentives, IV drip infusions, retail sales splits, and therapist attribution
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportCommissionsExcel(filteredCommissions)}
            className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-ink-soft hover:bg-pale shadow-2xs"
          >
            <Download size={14} /> Export Report
          </button>
          <button
            onClick={onOpenCommissionModal}
            className="flex items-center gap-1.5 rounded-xl bg-royal px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-royal/90 transition-colors"
          >
            <Plus size={14} /> Attribute Commission
          </button>
        </div>
      </div>

      {/* Summary KPI Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
            Total Approved Commissions
          </span>
          <p className="mt-1 text-2xl font-bold font-mono text-emerald-700">
            {formatPHP(totalCommissionEarned)}
          </p>
          <p className="text-[11px] text-ink-soft mt-0.5">Disbursed or payable to staff</p>
        </div>

        <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
            Pending Approval Claims
          </span>
          <p className="mt-1 text-2xl font-bold font-mono text-amber-600">
            {pendingClaims.length}
          </p>
          <p className="text-[11px] text-ink-soft mt-0.5">Claims needing supervisor verification</p>
        </div>

        <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
            Total Transactions Logged
          </span>
          <p className="mt-1 text-2xl font-bold font-mono text-ink">
            {commissions.length}
          </p>
          <p className="text-[11px] text-ink-soft mt-0.5">Attributed treatments & sales</p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search staff, item or ref..."
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
            <option value="all">All Claim Statuses</option>
            <option value="pending">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid on Payroll</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink focus:border-royal focus:outline-hidden"
          >
            <option value="all">All Sources</option>
            <option value="appointment">Clinical Service</option>
            <option value="pos_sale">POS Retail</option>
            <option value="manual_service">Special Procedure</option>
          </select>
        </div>
      </div>

      {/* Commissions Table */}
      <div className="rounded-2xl border border-line bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-pale/50 border-b border-line text-ink-soft uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="py-3 px-4">Ref # & Date</th>
                <th className="py-3 px-3">Therapist / Staff</th>
                <th className="py-3 px-3">Treatment / Item</th>
                <th className="py-3 px-3 font-mono">Base Price</th>
                <th className="py-3 px-3">Rate / Split</th>
                <th className="py-3 px-3 font-mono">Commission</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredCommissions.map((c) => {
                const statusBadges: Record<string, string> = {
                  pending: "bg-amber-50 text-amber-700 border-amber-200",
                  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
                  paid: "bg-purple-50 text-purple-700 border-purple-200",
                  rejected: "bg-red-50 text-red-700 border-red-200",
                };

                return (
                  <tr key={c.id} className="hover:bg-pale/30 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-ink">
                      <span className="font-mono font-bold text-xs text-ink block">
                        {c.reference_number || "COMM-LOG"}
                      </span>
                      <span className="text-[11px] text-ink-soft">{c.date_earned}</span>
                    </td>

                    <td className="py-3.5 px-3 font-medium text-ink">
                      {c.staff?.full_name || "Staff Member"}
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="font-semibold text-ink block">{c.item_name}</span>
                      <span className="text-[10px] uppercase text-ink-soft">
                        {c.source_type.replace("_", " ")}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 font-mono font-medium text-ink">
                      {formatPHP(c.base_amount)}
                    </td>

                    <td className="py-3.5 px-3 font-mono text-[11px]">
                      <div>{c.commission_rate}{c.is_percentage ? "%" : " PHP"}</div>
                      <div className="text-[10px] text-ink-soft">
                        {(c.split_ratio * 100).toFixed(0)}% attribution
                      </div>
                    </td>

                    <td className="py-3.5 px-3 font-mono font-bold text-emerald-700 text-sm">
                      {formatPHP(c.commission_amount)}
                    </td>

                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold border uppercase ${
                          statusBadges[c.status] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {c.status === "pending" && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleApprove(c.id, true)}
                            title="Approve Commission"
                            className="rounded-lg bg-emerald-50 p-1.5 text-emerald-700 hover:bg-emerald-100 transition-colors"
                          >
                            <CheckCircle2 size={15} />
                          </button>
                          <button
                            onClick={() => handleApprove(c.id, false)}
                            title="Reject Commission"
                            className="rounded-lg bg-red-50 p-1.5 text-red-700 hover:bg-red-100 transition-colors"
                          >
                            <XCircle size={15} />
                          </button>
                        </div>
                      )}
                      {c.status !== "pending" && (
                        <span className="text-[10px] text-ink-soft italic">
                          {c.status === "approved" ? "Ready for Payroll" : "Logged"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredCommissions.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-ink-soft">
                    <Sparkles size={28} className="mx-auto mb-2 text-ink-soft/40" />
                    No commission claims found matching your filters.
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
