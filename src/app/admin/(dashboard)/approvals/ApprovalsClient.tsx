// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Operations Approvals Queue Client
// ==============================================================================

"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Building2,
  Check,
  X,
  RefreshCw,
} from "lucide-react";
import { BillItem } from "@/app/admin/(dashboard)/bills/types";
import { ExpenseItem } from "@/app/admin/(dashboard)/expenses/types";
import { approveBill } from "@/app/admin/(dashboard)/bills/actions";
import { approveExpense, rejectExpense } from "@/app/admin/(dashboard)/expenses/actions";
import { formatPHP } from "@/lib/bills/bill-calculator";
import Link from "next/link";
import toast from "react-hot-toast";

interface ApprovalsClientProps {
  pendingBills: BillItem[];
  pendingExpenses: ExpenseItem[];
  branches: { id: string; name: string }[];
  currentStaffId?: string;
  isSuperAdmin?: boolean;
}

export function ApprovalsClient({
  pendingBills,
  pendingExpenses,
  branches,
  currentStaffId: _currentStaffId,
  isSuperAdmin: _isSuperAdmin = false,
}: ApprovalsClientProps) {
  const [activeTab, setActiveTab] = useState<"bills" | "expenses" | "reimbursements">("bills");
  const [branchFilter, setBranchFilter] = useState("all");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const reimbursements = pendingExpenses.filter((e) => e.is_reimbursement);
  const operatingExpenses = pendingExpenses.filter((e) => !e.is_reimbursement);

  const filteredBills = pendingBills.filter((b) => {
    if (branchFilter !== "all" && b.branch_id && b.branch_id !== branchFilter) return false;
    return true;
  });

  const filteredExpenses = operatingExpenses.filter((e) => {
    if (branchFilter !== "all" && e.branch_id && e.branch_id !== branchFilter) return false;
    return true;
  });

  const filteredReimbursements = reimbursements.filter((e) => {
    if (branchFilter !== "all" && e.branch_id && e.branch_id !== branchFilter) return false;
    return true;
  });

  const handleApproveBill = async (billId: string) => {
    setLoadingId(billId);
    try {
      const res = await approveBill(billId);
      if (res.success) {
        toast.success("Bill approved!");
        window.location.reload();
      } else {
        toast.error(res.error || "Approval failed");
      }
    } finally {
      setLoadingId(null);
    }
  };

  const handleApproveExpense = async (expId: string) => {
    setLoadingId(expId);
    try {
      const res = await approveExpense(expId);
      if (res.success) {
        toast.success("Expense approved!");
        window.location.reload();
      } else {
        toast.error(res.error || "Approval failed");
      }
    } finally {
      setLoadingId(null);
    }
  };

  const handleRejectExpense = async (expId: string) => {
    const reason = window.prompt("Please state the reason for rejecting this request:");
    if (!reason || !reason.trim()) return;

    setLoadingId(expId);
    try {
      const res = await rejectExpense(expId, reason.trim());
      if (res.success) {
        toast.success("Expense rejected.");
        window.location.reload();
      } else {
        toast.error(res.error || "Failed to reject expense");
      }
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-serif">
            Approvals Queue
          </h1>
          <p className="text-sm text-slate-500">
            Authorized management review for vendor bills due, operational disbursements, and staff reimbursement claims.
          </p>
        </div>

        {branches.length > 0 && (
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="h-10 px-3 text-xs rounded-xl border border-slate-200 bg-white"
            >
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {[
          { id: "bills" as const, label: "Vendor Bills Due", count: filteredBills.length },
          { id: "expenses" as const, label: "Operating Expenses", count: filteredExpenses.length },
          { id: "reimbursements" as const, label: "Staff Reimbursements", count: filteredReimbursements.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`h-11 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === tab.id
                ? "border-rose-600 text-rose-600 bg-rose-50/30"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab 1: Vendor Bills Pending Approval */}
      {activeTab === "bills" && (
        <div className="space-y-3">
          {filteredBills.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-white border border-slate-200 rounded-2xl">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
              <p className="text-sm font-bold text-slate-700">All Bills Approved!</p>
              <p className="text-xs text-slate-400 mt-0.5">
                There are currently no vendor bills awaiting administrative approval.
              </p>
            </div>
          ) : (
            filteredBills.map((b) => (
              <div
                key={b.id}
                className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:border-slate-300 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-700">{b.bill_number}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                      PENDING APPROVAL
                    </span>
                    <span className="text-xs text-slate-500">• {b.branch_name}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{b.title}</h3>
                  <div className="text-xs text-slate-500 flex flex-wrap gap-4 pt-1">
                    <span>Vendor: <strong>{b.vendor_or_payee}</strong></span>
                    <span>Due Date: <strong>{b.due_date}</strong></span>
                    <span>Created by: <strong>{b.created_by_name || "Staff"}</strong></span>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-slate-400 block font-bold">Total Bill</span>
                    <span className="text-base font-mono font-extrabold text-slate-900">{formatPHP(b.total_amount)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/bills?id=${b.id}`}
                      className="h-9 px-3 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleApproveBill(b.id)}
                      disabled={loadingId === b.id}
                      className="h-9 px-4 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
                    >
                      {loadingId === b.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      Approve
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Operating Expenses Pending Approval */}
      {activeTab === "expenses" && (
        <div className="space-y-3">
          {filteredExpenses.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-white border border-slate-200 rounded-2xl">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
              <p className="text-sm font-bold text-slate-700">No Operating Expenses Pending</p>
              <p className="text-xs text-slate-400 mt-0.5">All operating expense requests have been reviewed.</p>
            </div>
          ) : (
            filteredExpenses.map((e) => (
              <div
                key={e.id}
                className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:border-slate-300 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-700">{e.expense_number}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                      PENDING REVIEW
                    </span>
                    <span className="text-xs text-slate-500">• {e.branch_name}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{e.title}</h3>
                  <div className="text-xs text-slate-500 flex flex-wrap gap-4 pt-1">
                    <span>Payee: <strong>{e.vendor_or_payee}</strong></span>
                    <span>Date: <strong>{e.expense_date}</strong></span>
                    <span>Category: <strong>{e.category?.name || "General"}</strong></span>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-slate-400 block font-bold">Amount</span>
                    <span className="text-base font-mono font-extrabold text-slate-900">{formatPHP(e.total_amount)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRejectExpense(e.id)}
                      disabled={loadingId === e.id}
                      className="h-9 px-3 text-xs font-semibold rounded-xl border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleApproveExpense(e.id)}
                      disabled={loadingId === e.id}
                      className="h-9 px-4 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
                    >
                      {loadingId === e.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      Approve
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Staff Reimbursements Pending Review */}
      {activeTab === "reimbursements" && (
        <div className="space-y-3">
          {filteredReimbursements.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-white border border-slate-200 rounded-2xl">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
              <p className="text-sm font-bold text-slate-700">No Reimbursements Pending</p>
              <p className="text-xs text-slate-400 mt-0.5">All staff reimbursement claims have been settled.</p>
            </div>
          ) : (
            filteredReimbursements.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:border-slate-300 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-700">{r.expense_number}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                      REIMBURSEMENT CLAIM
                    </span>
                    <span className="text-xs text-slate-500">• {r.branch_name}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{r.title}</h3>
                  <div className="text-xs text-slate-500 flex flex-wrap gap-4 pt-1">
                    <span>Claimant: <strong>{r.requested_by_name || "Staff"}</strong></span>
                    <span>Date: <strong>{r.expense_date}</strong></span>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-slate-400 block font-bold">Claim Amount</span>
                    <span className="text-base font-mono font-extrabold text-purple-700">{formatPHP(r.total_amount)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRejectExpense(r.id)}
                      disabled={loadingId === r.id}
                      className="h-9 px-3 text-xs font-semibold rounded-xl border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleApproveExpense(r.id)}
                      disabled={loadingId === r.id}
                      className="h-9 px-4 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
                    >
                      {loadingId === r.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      Approve Claim
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
