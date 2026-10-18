"use client";

import { useState } from "react";
import {
  Receipt,
  Plus,
  Search,
  Download,
  Wallet,
  Tag,
  Calendar,
  Clock,
  Eye,
  Paperclip,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Building2,
  Coins,
  Layers,
  ArrowUpRight,
  TrendingDown,
  Filter,
  DollarSign,
  UserCheck,
} from "lucide-react";
import {
  ExpenseItem,
  ExpenseCategory,
  PettyCashFund,
  BranchInfo,
} from "./types";
import { RecordExpenseModal } from "@/components/admin/expenses/RecordExpenseModal";
import { ExpenseDetailModal } from "@/components/admin/expenses/ExpenseDetailModal";
import { CategoryManagerModal } from "@/components/admin/expenses/CategoryManagerModal";
import { PettyCashModal } from "@/components/admin/expenses/PettyCashModal";
import { ExpenseReportsView } from "@/components/admin/expenses/ExpenseReportsView";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";

interface ExpensesClientProps {
  initialExpenses: ExpenseItem[];
  categories: ExpenseCategory[];
  pettyCashFunds: PettyCashFund[];
  branches: { id: string; name: string }[];
  staffList?: { id: string; full_name: string }[];
  currentStaffBranchId?: string | null;
  currentStaffId?: string;
  isSuperAdmin?: boolean;
  canApprove: boolean;
  canManageCategories: boolean;
  initialTab?: string;
}

export function ExpensesClient({
  initialExpenses,
  categories,
  pettyCashFunds,
  branches,
  staffList = [],
  currentStaffBranchId,
  currentStaffId,
  isSuperAdmin = false,
  canApprove,
  canManageCategories,
  initialTab = "all",
}: ExpensesClientProps) {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [searchTerm, setSearchTerm] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>(
    !isSuperAdmin && currentStaffBranchId ? currentStaffBranchId : "all"
  );
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<string>("all");

  // Active Modals
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [isPettyCashOpen, setIsPettyCashOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);

  // Month selector (defaults to current month)
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);

  const formatPHP = (val?: number | null) =>
    `₱${(val || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  // Filter expenses
  const filteredExpenses = initialExpenses.filter((e) => {
    // Tab filtering
    if (activeTab === "approvals" && e.approval_status !== "pending") return false;
    if (activeTab === "reimbursements" && !e.is_reimbursement) return false;

    // Month
    if (selectedMonth && !e.expense_date.startsWith(selectedMonth)) return false;

    // Search
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const titleMatch = e.title.toLowerCase().includes(q);
      const vendorMatch = e.vendor_or_payee.toLowerCase().includes(q);
      const refMatch = e.reference_number?.toLowerCase().includes(q);
      const expNumMatch = e.expense_number.toLowerCase().includes(q);
      if (!titleMatch && !vendorMatch && !refMatch && !expNumMatch) return false;
    }

    // Branch
    if (branchFilter !== "all" && e.branch_id && e.branch_id !== branchFilter) return false;

    // Category
    if (categoryFilter !== "all" && e.category_id !== categoryFilter) return false;

    // Payment status
    if (paymentStatusFilter !== "all" && e.payment_status !== paymentStatusFilter) return false;

    // Approval status
    if (approvalStatusFilter !== "all" && e.approval_status !== approvalStatusFilter) return false;

    return true;
  });

  // KPI Calculations based on month & branch
  const monthlyExpenses = initialExpenses.filter((e) => {
    if (selectedMonth && !e.expense_date.startsWith(selectedMonth)) return false;
    if (branchFilter !== "all" && e.branch_id && e.branch_id !== branchFilter) return false;
    return true;
  });

  const totalThisMonth = monthlyExpenses.reduce((sum, e) => sum + Number(e.total_amount), 0);
  const totalCountThisMonth = monthlyExpenses.length;

  const pendingApprovals = monthlyExpenses.filter((e) => e.approval_status === "pending");
  const pendingApprovalsAmount = pendingApprovals.reduce((sum, e) => sum + Number(e.total_amount), 0);

  const approvedUnpaid = monthlyExpenses.filter(
    (e) => (e.approval_status === "approved" || e.approval_status === "payment_pending") && e.payment_status !== "paid"
  );
  const approvedUnpaidAmount = approvedUnpaid.reduce((sum, e) => sum + Number(e.total_amount), 0);

  const paidExpenses = monthlyExpenses.filter((e) => e.payment_status === "paid");
  const paidExpensesAmount = paidExpenses.reduce((sum, e) => sum + Number(e.total_amount), 0);

  const pendingReimbursements = monthlyExpenses.filter(
    (e) => e.is_reimbursement && e.payment_status !== "paid"
  );
  const pendingReimbursementsAmount = pendingReimbursements.reduce((sum, e) => sum + Number(e.total_amount), 0);

  // Branch Petty Cash Fund
  const activeBranchFund =
    pettyCashFunds.find((f) => branchFilter !== "all" && f.branch_id === branchFilter) ||
    pettyCashFunds[0];

  // Excel Export
  const handleExportExcel = () => {
    try {
      const rows = filteredExpenses.map((e) => ({
        "Expense Ref #": e.expense_number,
        Date: e.expense_date,
        Branch: e.branch_name || "Main Clinic",
        Category: e.category?.name || "General",
        Payee: e.vendor_or_payee,
        Title: e.title,
        "Amount Before Tax (₱)": Number(e.amount_before_tax),
        "Tax Amount (₱)": Number(e.tax_amount),
        "Total Amount (₱)": Number(e.total_amount),
        "Payment Method": e.payment_method.toUpperCase(),
        "Payment Status": e.payment_status.toUpperCase(),
        "Approval Status": e.approval_status.toUpperCase(),
        "OR / Invoice #": e.reference_number || "—",
        "Requested By": e.requested_by_name || "—",
        Reimbursement: e.is_reimbursement ? "YES" : "NO",
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Expenses");
      XLSX.writeFile(wb, `Cindyrella_Expenses_${selectedMonth || "All"}.xlsx`);
      toast.success("Excel report downloaded!");
    } catch {
      toast.error("Failed to export Excel");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Clinic Operating Expenses
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              Operations & Overheads
            </span>
          </div>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            Vendor invoices, clinical supplies, utility bills, cashier drawer disbursements & petty cash floats.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {canManageCategories && (
            <button
              onClick={() => setIsCategoriesOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center gap-2 transition-colors"
            >
              <Layers className="w-4 h-4 text-stone-500" />
              Categories
            </button>
          )}

          <button
            onClick={() => setIsPettyCashOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center gap-2 transition-colors"
          >
            <Coins className="w-4 h-4 text-emerald-600" />
            Petty Cash Float
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4 text-stone-500" />
            Export Excel
          </button>

          <button
            onClick={() => setIsRecordOpen(true)}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-md shadow-rose-500/25 flex items-center gap-2 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-stone-200 dark:border-stone-800 overflow-x-auto scrollbar-none">
        {[
          { id: "all", label: "All Expenses", icon: Receipt },
          { id: "approvals", label: "Approvals Queue", icon: Clock, count: pendingApprovals.length },
          { id: "reimbursements", label: "Reimbursements", icon: UserCheck, count: pendingReimbursements.length },
          { id: "reports", label: "Financial Reports & Exports", icon: TrendingDown },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-xs font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
                active
                  ? "border-rose-600 text-rose-600 dark:text-rose-400"
                  : "border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* DASHBOARD CARDS (Compact summary cards - Requirement 3) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Expenses This Month */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Total Expenses This Month</span>
            <div className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black text-stone-900 dark:text-stone-100 font-mono">
              {formatPHP(totalThisMonth)}
            </span>
            <p className="text-[11px] text-stone-400 mt-0.5">{totalCountThisMonth} transactions recorded</p>
          </div>
        </div>

        {/* Card 2: Pending Approval */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Pending Approval</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {pendingApprovals.length}
            </span>
            <p className="text-[11px] text-stone-400 mt-0.5">{formatPHP(pendingApprovalsAmount)} awaiting review</p>
          </div>
        </div>

        {/* Card 3: Approved but Unpaid */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Approved but Unpaid</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black text-blue-600 dark:text-blue-400 font-mono">
              {formatPHP(approvedUnpaidAmount)}
            </span>
            <p className="text-[11px] text-stone-400 mt-0.5">{approvedUnpaid.length} invoices to disburse</p>
          </div>
        </div>

        {/* Card 4: Paid Expenses */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Paid Expenses</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {formatPHP(paidExpensesAmount)}
            </span>
            <p className="text-[11px] text-stone-400 mt-0.5">{paidExpenses.length} completed payouts</p>
          </div>
        </div>

        {/* Card 5: Reimbursements Pending */}
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">Reimbursements Pending</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black text-purple-600 dark:text-purple-400 font-mono">
              {pendingReimbursements.length}
            </span>
            <p className="text-[11px] text-stone-400 mt-0.5">{formatPHP(pendingReimbursementsAmount)} staff claims</p>
          </div>
        </div>
      </div>

      {/* TAB CONTENT: Financial Reports & Exports View */}
      {activeTab === "reports" ? (
        <ExpenseReportsView
          expenses={initialExpenses}
          categories={categories}
          branches={branches}
          pettyCashFunds={pettyCashFunds}
          selectedBranchId={branchFilter}
        />
      ) : (
        <>
          {/* Filters Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              {/* Search */}
              <div className="lg:col-span-2 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search reference, vendor, title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Month */}
              <div>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Branch */}
              <div>
                <select
                  disabled={!isSuperAdmin && branches.length <= 1}
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-75"
                >
                  <option value="all">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Status Filter */}
              <div>
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => setPaymentStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="all">All Payment Statuses</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="partially_paid">Partially Paid</option>
                  <option value="paid">Paid</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* EXPENSES TABLE (Requirement 12) */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50/80 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Ref No.</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Vendor / Payee</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                    <th className="py-3 px-4 text-center">Approval</th>
                    <th className="py-3 px-4 text-center">Payment</th>
                    <th className="py-3 px-4">Requested By</th>
                    <th className="py-3 px-4 text-center">Receipt</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800 text-stone-800 dark:text-stone-200">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-stone-400 italic">
                        No expenses match your active filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((expense) => {
                      return (
                        <tr
                          key={expense.id}
                          className="hover:bg-stone-50/70 dark:hover:bg-stone-800/40 transition-colors"
                        >
                          <td className="py-3 px-4 font-mono font-medium text-stone-900 dark:text-stone-100">
                            {expense.expense_number}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-stone-600 dark:text-stone-300">
                            {expense.expense_date}
                          </td>
                          <td className="py-3 px-4 font-medium whitespace-nowrap">
                            {expense.branch_name || "Main Clinic"}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {expense.category ? (
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold text-white shadow-sm"
                                style={{ backgroundColor: expense.category.color }}
                              >
                                {expense.category.name}
                              </span>
                            ) : (
                              <span className="text-stone-400">General</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-semibold text-stone-900 dark:text-stone-100 whitespace-nowrap">
                            {expense.vendor_or_payee}
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate text-stone-500 dark:text-stone-400">
                            {expense.title}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-stone-900 dark:text-stone-100 whitespace-nowrap">
                            {formatPHP(expense.total_amount)}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {expense.approval_status === "approved" ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                Approved
                              </span>
                            ) : expense.approval_status === "rejected" ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                                Rejected
                              </span>
                            ) : expense.approval_status === "payment_pending" ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                                Payment Pending
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                                expense.payment_status === "paid"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                  : expense.payment_status === "partially_paid"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                              }`}
                            >
                              {expense.payment_status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-stone-500 whitespace-nowrap text-[11px]">
                            {expense.requested_by_name || "Staff"}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {expense.receipt_url || (expense.attachments && expense.attachments.length > 0) ? (
                              <a
                                href={expense.receipt_url || expense.attachments[0]?.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex p-1 text-emerald-600 hover:text-emerald-700 rounded hover:bg-emerald-50"
                                title="View Receipt"
                              >
                                <Paperclip className="w-4 h-4" />
                              </a>
                            ) : (
                              <span className="text-stone-300">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => setSelectedExpense(expense)}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* MODALS */}
      {isRecordOpen && (
        <RecordExpenseModal
          categories={categories}
          branches={branches}
          defaultBranchId={currentStaffBranchId || undefined}
          isSuperAdmin={isSuperAdmin}
          staffList={staffList}
          onClose={() => setIsRecordOpen(false)}
          onSaved={() => {
            window.location.reload();
          }}
          onOpenNewCategory={() => {
            setIsRecordOpen(false);
            setIsCategoriesOpen(true);
          }}
        />
      )}

      {selectedExpense && (
        <ExpenseDetailModal
          expense={selectedExpense}
          canApprove={canApprove}
          currentStaffId={currentStaffId}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setSelectedExpense(null)}
          onRefresh={() => {
            window.location.reload();
          }}
        />
      )}

      {isCategoriesOpen && (
        <CategoryManagerModal
          categories={categories}
          onClose={() => setIsCategoriesOpen(false)}
          onRefresh={() => {
            window.location.reload();
          }}
        />
      )}

      {isPettyCashOpen && (
        <PettyCashModal
          funds={pettyCashFunds}
          branches={branches}
          defaultBranchId={currentStaffBranchId || undefined}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setIsPettyCashOpen(false)}
          onRefresh={() => {
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
