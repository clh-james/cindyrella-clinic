"use client";

import { useState, useMemo } from "react";
import {
  Receipt,
  Plus,
  Search,
  Download,
  Calendar,
  Clock,
  Paperclip,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Coins,
  Layers,
  TrendingDown,
  RotateCcw,
  UserCheck,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Building2,
  X,
} from "lucide-react";
import {
  ExpenseItem,
  ExpenseCategory,
  PettyCashFund,
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

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const defaultBranch = !isSuperAdmin && currentStaffBranchId ? currentStaffBranchId : "all";
  const [branchFilter, setBranchFilter] = useState<string>(defaultBranch);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<string>("all");

  // Date Range (default: 1st day of current month to today)
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(todayStr);

  // Active Modals
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [isPettyCashOpen, setIsPettyCashOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);

  const formatPHP = (val?: number | null) =>
    `₱${(val || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  // Reset Filters Handler
  const handleResetFilters = () => {
    setSearchTerm("");
    setBranchFilter(defaultBranch);
    setCategoryFilter("all");
    setPaymentStatusFilter("all");
    setApprovalStatusFilter("all");
    setStartDate(firstDayOfMonth);
    setEndDate(todayStr);
    toast.success("Filters reset to defaults");
  };

  // Check if any filter is active
  const isFiltered = useMemo(() => {
    return (
      searchTerm !== "" ||
      branchFilter !== defaultBranch ||
      categoryFilter !== "all" ||
      paymentStatusFilter !== "all" ||
      approvalStatusFilter !== "all" ||
      startDate !== firstDayOfMonth ||
      endDate !== todayStr
    );
  }, [searchTerm, branchFilter, defaultBranch, categoryFilter, paymentStatusFilter, approvalStatusFilter, startDate, endDate, firstDayOfMonth, todayStr]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return initialExpenses.filter((e) => {
      // Tab filtering
      if (activeTab === "approvals" && e.approval_status !== "pending") return false;
      if (activeTab === "reimbursements" && !e.is_reimbursement) return false;

      // Date Range
      if (startDate && e.expense_date < startDate) return false;
      if (endDate && e.expense_date > endDate) return false;

      // Search Query
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
  }, [initialExpenses, activeTab, startDate, endDate, searchTerm, branchFilter, categoryFilter, paymentStatusFilter, approvalStatusFilter]);

  // KPI Calculations based on active month / authorized branch
  const monthlyExpenses = useMemo(() => {
    const currentMonthPrefix = now.toISOString().slice(0, 7);
    return initialExpenses.filter((e) => {
      if (!e.expense_date.startsWith(currentMonthPrefix)) return false;
      if (branchFilter !== "all" && e.branch_id && e.branch_id !== branchFilter) return false;
      return true;
    });
  }, [initialExpenses, branchFilter, now]);

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
        "Approved Amount (₱)": Number(e.approved_amount || e.total_amount),
        "Payment Method": e.payment_method.toUpperCase(),
        "Payment Status": e.payment_status.toUpperCase(),
        "Approval Status": e.approval_status.toUpperCase(),
        "OR / Invoice #": e.reference_number || "—",
        "Requested By": e.requested_by_name || "—",
        Reimbursement: e.is_reimbursement ? "YES" : "NO",
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Operating Expenses");
      XLSX.writeFile(wb, `Cindyrella_Expenses_${startDate}_to_${endDate}.xlsx`);
      toast.success("Excel report downloaded!");
    } catch {
      toast.error("Failed to export Excel");
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. HEADER SECTION (Section 2: High contrast dark navy heading + right action buttons) */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-serif">
            Clinic Operating Expenses
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed max-w-2xl">
            Manage vendor invoices, clinical supplies, utility bills, cashier drawer disbursements, and petty cash floats.
          </p>
        </div>

        {/* Action Buttons with consistent heights and clear primary button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setActiveTab(activeTab === "reports" ? "all" : "reports")}
            className={`h-10 px-3.5 text-xs font-semibold rounded-xl border shadow-sm flex items-center gap-2 transition-colors focus:ring-2 focus:ring-slate-300 ${
              activeTab === "reports"
                ? "border-rose-300 bg-rose-50/80 text-rose-700"
                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            }`}
          >
            <Building2 className="w-4 h-4 text-slate-500" />
            Operations & Overheads
          </button>

          {canManageCategories && (
            <button
              onClick={() => setIsCategoriesOpen(true)}
              className="h-10 px-3.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm flex items-center gap-2 transition-colors focus:ring-2 focus:ring-slate-300"
            >
              <Layers className="w-4 h-4 text-slate-500" />
              Categories
            </button>
          )}

          <button
            onClick={() => setIsPettyCashOpen(true)}
            className="h-10 px-3.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm flex items-center gap-2 transition-colors focus:ring-2 focus:ring-slate-300"
          >
            <Coins className="w-4 h-4 text-emerald-600" />
            Petty Cash Float
          </button>

          <button
            onClick={handleExportExcel}
            className="h-10 px-3.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm flex items-center gap-2 transition-colors focus:ring-2 focus:ring-slate-300"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Export Excel
          </button>

          {/* Primary Action Button */}
          <button
            onClick={() => setIsRecordOpen(true)}
            className="h-10 px-4 text-xs font-bold rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-md shadow-rose-500/20 flex items-center gap-2 transition-all hover:scale-[1.02] focus:ring-2 focus:ring-rose-400"
          >
            <Plus className="w-4 h-4" />
            + Add Expense
          </button>
        </div>
      </div>

      {/* 2. SUMMARY CARDS (Section 4: Light business dashboard, readable values, item counts clearly separated) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Expenses This Month */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Expenses This Month</span>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold text-slate-900 font-mono tracking-tight block">
              {formatPHP(totalThisMonth)}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">{totalCountThisMonth} transactions recorded</p>
          </div>
        </div>

        {/* Card 2: Pending Approval */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between hover:border-amber-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending Approval</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-200/60">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold text-amber-700 font-mono tracking-tight block">
              {pendingApprovals.length} {pendingApprovals.length === 1 ? "request" : "requests"}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">{formatPHP(pendingApprovalsAmount)} awaiting review</p>
          </div>
        </div>

        {/* Card 3: Approved but Unpaid */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Approved but Unpaid</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200/60">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold text-blue-700 font-mono tracking-tight block">
              {formatPHP(approvedUnpaidAmount)}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">{approvedUnpaid.length} invoices to disburse</p>
          </div>
        </div>

        {/* Card 4: Paid Expenses */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Paid Expenses</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200/60">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold text-emerald-700 font-mono tracking-tight block">
              {formatPHP(paidExpensesAmount)}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">{paidExpenses.length} completed payouts</p>
          </div>
        </div>

        {/* Card 5: Reimbursements Pending */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between hover:border-purple-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Reimbursements Pending</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600 border border-purple-200/60">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold text-purple-700 font-mono tracking-tight block">
              {pendingReimbursements.length} {pendingReimbursements.length === 1 ? "claim" : "claims"}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">{formatPHP(pendingReimbursementsAmount)} staff claims</p>
          </div>
        </div>
      </div>

      {/* 3. TABS (Section 5: Consistent height, clear active-tab contrast, no awkward wrapping) */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto scrollbar-none">
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
              className={`h-11 px-4 text-xs font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
                active
                  ? "border-rose-600 text-rose-600 bg-rose-50/30"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4. TAB CONTENT */}
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
          {/* SEARCH AND FILTER TOOLBAR (Section 6: Clean light container, consistent control heights, Reset button) */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
            {/* Row 1: Search & Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              {/* Search */}
              <div className="md:col-span-7 relative min-w-0">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search reference, vendor, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-10 pl-9 pr-8 text-xs rounded-xl border border-slate-200 bg-slate-50/60 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all min-w-0"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Date Range: From / To */}
              <div className="md:col-span-5 min-w-0">
                <div className="flex items-center gap-2 h-10 px-3 rounded-xl border border-slate-200 bg-slate-50/60 focus-within:border-rose-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-rose-500/20 transition-all">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="date"
                    aria-label="Filter start date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full min-w-0 bg-transparent text-xs text-slate-800 focus:outline-none"
                    title="Start Date"
                  />
                  <span className="text-xs text-slate-400 font-medium shrink-0 px-1">to</span>
                  <input
                    type="date"
                    aria-label="Filter end date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full min-w-0 bg-transparent text-xs text-slate-800 focus:outline-none"
                    title="End Date"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Branch, Category, Payment Status, Approval Status, Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center pt-1 border-t border-slate-100">
              {/* Branch */}
              <div className="min-w-0">
                <select
                  disabled={!isSuperAdmin && branches.length <= 1}
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-slate-50/60 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white disabled:opacity-60 truncate"
                >
                  <option value="all">All Authorized Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div className="min-w-0">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-slate-50/60 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white truncate"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Status */}
              <div className="min-w-0">
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => setPaymentStatusFilter(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-slate-50/60 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white truncate"
                >
                  <option value="all">All Payment Statuses</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="partially_paid">Partially Paid</option>
                  <option value="paid">Paid</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Approval Status */}
              <div className="min-w-0">
                <select
                  value={approvalStatusFilter}
                  onChange={(e) => setApprovalStatusFilter(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-slate-50/60 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white truncate"
                >
                  <option value="all">All Approval Statuses</option>
                  <option value="pending">Pending Approval</option>
                  <option value="approved">Approved</option>
                  <option value="payment_pending">Payment Pending</option>
                  <option value="rejected">Rejected</option>
                  <option value="draft">Draft</option>
                </select>
              </div>

              {/* Reset Action */}
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  disabled={!isFiltered}
                  className={`w-full h-10 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition-colors ${
                    isFiltered
                      ? "border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 shadow-xs cursor-pointer"
                      : "border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed opacity-60"
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {isFiltered ? "Reset Filters" : "Reset"}
                </button>
              </div>
            </div>
          </div>

          {/* 5. EXPENSES TABLE & MOBILE CARDS (Section 7: Overflow contained, clean table, Section 8: Informative empty states) */}
          <div className="bg-white border border-slate-200/90 rounded-xl shadow-sm overflow-hidden">
            {/* Empty State A: No records exist in database */}
            {initialExpenses.length === 0 ? (
              <div className="py-16 px-4 text-center max-w-sm mx-auto">
                <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3 border border-rose-100">
                  <Receipt className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">No expenses recorded yet</h3>
                <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
                  Create an expense to begin tracking branch operating costs, vendor disbursements, and supplies.
                </p>
                <button
                  onClick={() => setIsRecordOpen(true)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-sm inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add First Expense
                </button>
              </div>
            ) : filteredExpenses.length === 0 ? (
              /* Empty State B: Filters returned no results */
              <div className="py-16 px-4 text-center max-w-sm mx-auto">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">No matching expenses</h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  No records match your active search and filter settings. Try clearing or relaxing your filters.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm inline-flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset Filters
                </button>
              </div>
            ) : (
              <>
                {/* Desktop & Tablet Table (contained scroll within card) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-4">Reference No.</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Branch</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Vendor / Payee</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4 text-right">Total Amount</th>
                        <th className="py-3 px-4 text-center">Approval Status</th>
                        <th className="py-3 px-4 text-center">Payment Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {filteredExpenses.map((expense) => (
                        <tr
                          key={expense.id}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          <td className="py-3 px-4 font-mono font-semibold text-slate-900 whitespace-nowrap">
                            {expense.expense_number}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                            {expense.expense_date}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                            {expense.branch_name || "Main Clinic"}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {expense.category ? (
                              <span
                                className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold text-white shadow-xs"
                                style={{ backgroundColor: expense.category.color }}
                              >
                                {expense.category.name}
                              </span>
                            ) : (
                              <span className="text-slate-400">General</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                            {expense.vendor_or_payee}
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate text-slate-500" title={expense.title}>
                            {expense.title}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono whitespace-nowrap">
                            {formatPHP(expense.total_amount)}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {expense.approval_status === "approved" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                <CheckCircle2 className="w-3 h-3" /> Approved
                              </span>
                            ) : expense.approval_status === "rejected" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
                                <XCircle className="w-3 h-3" /> Rejected
                              </span>
                            ) : expense.approval_status === "payment_pending" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                                <Clock className="w-3 h-3" /> Payment Pending
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                                <Clock className="w-3 h-3" /> Pending Review
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                                expense.payment_status === "paid"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                  : expense.payment_status === "partially_paid"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200/60"
                                  : "bg-amber-50 text-amber-700 border border-amber-200/60"
                              }`}
                            >
                              {expense.payment_status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {(expense.receipt_url || (expense.attachments && expense.attachments.length > 0)) && (
                                <a
                                  href={expense.receipt_url || expense.attachments[0]?.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100 transition-colors"
                                  title="View Receipt File"
                                >
                                  <Paperclip className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <button
                                onClick={() => setSelectedExpense(expense)}
                                className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                              >
                                Details
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Responsive Cards (visible only on small screens) */}
                <div className="md:hidden divide-y divide-slate-100">
                  {filteredExpenses.map((expense) => (
                    <div
                      key={expense.id}
                      onClick={() => setSelectedExpense(expense)}
                      className="p-4 space-y-2.5 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {expense.expense_number}
                        </span>
                        <span className="font-mono text-sm font-bold text-slate-900">
                          {formatPHP(expense.total_amount)}
                        </span>
                      </div>

                      <div>
                        <p className="text-xs font-bold text-slate-800">{expense.vendor_or_payee}</p>
                        <p className="text-xs text-slate-500 line-clamp-1">{expense.title}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {expense.category && (
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-semibold text-white"
                            style={{ backgroundColor: expense.category.color }}
                          >
                            {expense.category.name}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500">{expense.expense_date}</span>
                        <span className="text-[11px] text-slate-400">•</span>
                        <span className="text-[11px] text-slate-500">{expense.branch_name || "Main"}</span>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="capitalize font-semibold text-slate-700">
                            {expense.approval_status}
                          </span>
                          <span className="text-slate-300">/</span>
                          <span className="capitalize text-slate-500">
                            {expense.payment_status.replace("_", " ")}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-rose-600 flex items-center gap-1">
                          View <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* 6. MODALS */}
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
