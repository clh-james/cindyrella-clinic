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
} from "lucide-react";
import {
  ExpenseItem,
  ExpenseCategory,
  PettyCashFund,
  BranchInfo,
} from "./types";
import { formatPHP } from "@/lib/payroll/philippine-tax";
import { RecordExpenseModal } from "@/components/admin/expenses/RecordExpenseModal";
import { ExpenseDetailModal } from "@/components/admin/expenses/ExpenseDetailModal";
import { CategoryManagerModal } from "@/components/admin/expenses/CategoryManagerModal";
import { PettyCashModal } from "@/components/admin/expenses/PettyCashModal";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";

interface ExpensesClientProps {
  initialExpenses: ExpenseItem[];
  categories: ExpenseCategory[];
  pettyCashFunds: PettyCashFund[];
  branches: BranchInfo[];
  currentStaffBranchId?: string | null;
  canApprove: boolean;
  canManageCategories: boolean;
}

export function ExpensesClient({
  initialExpenses,
  categories,
  pettyCashFunds,
  branches,
  currentStaffBranchId,
  canApprove,
  canManageCategories,
}: ExpensesClientProps) {
  const expenses = initialExpenses;
  const [searchTerm, setSearchTerm] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>(currentStaffBranchId || "all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");

  // Active Modals
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [isPettyCashOpen, setIsPettyCashOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);

  // Month selector (defaults to current month)
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);

  // Date filtering
  const filteredExpenses = expenses.filter((e) => {
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
    if (branchFilter !== "all" && e.branch_id !== branchFilter) return false;

    // Category
    if (categoryFilter !== "all" && e.category_id !== categoryFilter) return false;

    // Status
    if (statusFilter !== "all") {
      if (statusFilter === "petty_cash" && !e.is_petty_cash) return false;
      if (statusFilter !== "petty_cash" && e.status !== statusFilter) return false;
    }

    // Payment method
    if (paymentFilter !== "all" && e.payment_method !== paymentFilter) return false;

    return true;
  });

  // KPI Calculations
  const todayDateStr = new Date().toISOString().slice(0, 10);
  const totalMonthExpenses = filteredExpenses
    .filter((e) => e.status !== "rejected")
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const todayExpenses = filteredExpenses
    .filter((e) => e.expense_date === todayDateStr && e.status !== "rejected")
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const pendingExpenses = filteredExpenses.filter((e) => e.status === "pending");
  const pendingAmount = pendingExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const totalPettyCashBalance = pettyCashFunds
    .filter((f) => branchFilter === "all" || f.branch_id === branchFilter)
    .reduce((sum, f) => sum + Number(f.current_balance || 0), 0);

  // Excel Export
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const exportRows = filteredExpenses.map((e) => ({
        "Expense #": e.expense_number,
        "Date": e.expense_date,
        "Title": e.title,
        "Vendor / Payee": e.vendor_or_payee,
        "Category": e.category?.name || "General",
        "Branch": e.branch?.name || "All",
        "Amount (PHP)": Number(e.amount),
        "Payment Method": e.payment_method.toUpperCase(),
        "Reference #": e.reference_number || "",
        "Petty Cash?": e.is_petty_cash ? "YES" : "NO",
        "Status": e.status.toUpperCase(),
        "Recorded By": e.creator?.full_name || "Staff",
        "Approved By": e.approver?.full_name || "",
        "Receipt Attached": e.receipt_url ? "YES" : "NO",
      }));

      const ws = XLSX.utils.json_to_sheet(exportRows);
      XLSX.utils.book_append_sheet(wb, ws, "Operating Expenses");
      XLSX.writeFile(wb, `Cindyrella_Expenses_${selectedMonth}.xlsx`);
      toast.success("Expense ledger exported to Excel!");
    } catch {
      toast.error("Failed to export Excel file");
    }
  };

  const handleRefresh = () => {
    // Force soft refresh by reloading router
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-ink">Clinic Operating Expenses</h1>
          <p className="text-xs text-ink-soft">
            Petty cash disbursements, medical & clinical consumables, utility bills, and facility overheads
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsPettyCashOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-semibold text-ink hover:bg-pale shadow-2xs transition-colors"
          >
            <Wallet size={14} className="text-emerald-600" />
            <span>Petty Cash Drawer</span>
          </button>

          {canManageCategories && (
            <button
              onClick={() => setIsCategoriesOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-semibold text-ink hover:bg-pale shadow-2xs transition-colors"
            >
              <Tag size={14} className="text-royal" />
              <span>Categories</span>
            </button>
          )}

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-semibold text-ink hover:bg-pale shadow-2xs transition-colors"
          >
            <Download size={14} />
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => setIsRecordOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-royal px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-royal/90 transition-colors"
          >
            <Plus size={15} />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* 4 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Monthly Expenses */}
        <div className="rounded-3xl border border-line bg-white p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-ink-soft">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {selectedMonth} Total Disbursements
            </span>
            <div className="rounded-xl bg-royal/10 p-2 text-royal">
              <Receipt size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-ink">
            {formatPHP(totalMonthExpenses)}
          </p>
          <p className="text-[11px] text-ink-soft font-medium">
            {filteredExpenses.filter((e) => e.status !== "rejected").length} transactions recorded
          </p>
        </div>

        {/* Today's Expenses */}
        <div className="rounded-3xl border border-line bg-white p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-ink-soft">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Today&apos;s Disbursements
            </span>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-700">
              <Calendar size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-ink">
            {formatPHP(todayExpenses)}
          </p>
          <p className="text-[11px] text-ink-soft font-medium">
            Logged today: {todayDateStr}
          </p>
        </div>

        {/* Pending Approvals */}
        <div className="rounded-3xl border border-line bg-white p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-ink-soft">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Pending Approvals
            </span>
            <div className="rounded-xl bg-purple-50 p-2 text-purple-700">
              <Clock size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-amber-800">
            {formatPHP(pendingAmount)}
          </p>
          <p className="text-[11px] text-ink-soft font-medium">
            {pendingExpenses.length} awaiting manager review
          </p>
        </div>

        {/* Active Petty Cash Balance */}
        <div className="rounded-3xl border border-line bg-white p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-ink-soft">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Petty Cash Float
            </span>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
              <Wallet size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-800">
            {formatPHP(totalPettyCashBalance)}
          </p>
          <p className="text-[11px] text-ink-soft font-medium">
            Active clinic cash in drawer
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-line bg-white p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search purpose, payee, or receipt ref..."
              className="w-full rounded-xl border border-line pl-9 pr-3 py-2 text-xs text-ink focus:border-royal focus:outline-hidden"
            />
          </div>

          {/* Month Selector */}
          <div>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full rounded-xl border border-line px-3 py-2 text-xs font-semibold text-ink focus:border-royal focus:outline-hidden"
            />
          </div>

          {/* Branch Filter */}
          <div>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs font-medium text-ink focus:border-royal focus:outline-hidden"
            >
              <option value="all">All Clinic Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs font-medium text-ink focus:border-royal focus:outline-hidden"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method Filter */}
          <div>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs font-medium text-ink focus:border-royal focus:outline-hidden"
            >
              <option value="all">All Payment Methods</option>
              <option value="cash">Cash on Hand</option>
              <option value="petty_cash">Petty Cash Drawer</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="gcash">GCash / Maya</option>
              <option value="credit_card">Corporate Card</option>
              <option value="check">Bank Check</option>
            </select>
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-line/60 pt-3 text-xs">
          {[
            { id: "all", label: "All Disbursements" },
            { id: "pending", label: "Pending Approval" },
            { id: "approved", label: "Approved" },
            { id: "petty_cash", label: "Petty Cash" },
            { id: "rejected", label: "Rejected" },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`rounded-full px-3 py-1 font-semibold transition-all ${
                statusFilter === st.id
                  ? "bg-royal text-white shadow-xs"
                  : "bg-pale/50 text-ink-soft hover:bg-pale"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="rounded-3xl border border-line bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-pale/50 border-b border-line text-ink-soft uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="py-3 px-4">Ref # & Date</th>
                <th className="py-3 px-3">Expense Title / Purpose</th>
                <th className="py-3 px-3">Vendor / Payee</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Branch</th>
                <th className="py-3 px-3">Method</th>
                <th className="py-3 px-3 font-mono">Amount</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-center">Receipt</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-pale/30 transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="font-mono font-bold text-xs text-royal block">
                      {exp.expense_number}
                    </span>
                    <span className="text-[10px] text-ink-soft font-mono">
                      {exp.expense_date}
                    </span>
                  </td>

                  <td className="py-3.5 px-3">
                    <span className="font-bold text-ink block max-w-xs truncate">
                      {exp.title}
                    </span>
                    {exp.reference_number && (
                      <span className="text-[10px] font-mono text-ink-soft">
                        OR/Ref: {exp.reference_number}
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-3 font-medium text-ink">
                    {exp.vendor_or_payee}
                  </td>

                  <td className="py-3.5 px-3">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-white text-[10px]"
                      style={{ backgroundColor: exp.category?.color || "#4F46E5" }}
                    >
                      {exp.category?.name || "General"}
                    </span>
                  </td>

                  <td className="py-3.5 px-3 text-ink-soft text-[11px]">
                    {exp.branch?.name || "All Branches"}
                  </td>

                  <td className="py-3.5 px-3">
                    <span className="text-[11px] font-medium text-ink capitalize block">
                      {exp.payment_method.replace("_", " ")}
                    </span>
                    {exp.is_petty_cash && (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 rounded px-1.5 py-0.2">
                        Petty Drawer
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-3 font-mono font-bold text-ink text-sm">
                    {formatPHP(exp.amount)}
                  </td>

                  <td className="py-3.5 px-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        exp.status === "approved"
                          ? "bg-emerald-100 text-emerald-800"
                          : exp.status === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {exp.status}
                    </span>
                  </td>

                  <td className="py-3.5 px-3 text-center">
                    {exp.receipt_url ? (
                      <a
                        href={exp.receipt_url}
                        target="_blank"
                        rel="noreferrer"
                        title="View Receipt Attachment"
                        className="inline-flex items-center justify-center p-1.5 text-royal hover:bg-pale rounded-lg transition-colors"
                      >
                        <Paperclip size={14} />
                      </a>
                    ) : (
                      <span className="text-ink-soft/40 text-[11px]">—</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => setSelectedExpense(exp)}
                      className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-royal hover:bg-pale shadow-2xs transition-colors"
                    >
                      <Eye size={12} /> Inspect
                    </button>
                  </td>
                </tr>
              ))}

              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-14 text-center text-xs text-ink-soft">
                    <Receipt size={32} className="mx-auto mb-2 text-ink-soft/40" />
                    <p className="font-semibold text-ink mb-1">No operating expenses found</p>
                    <p className="text-[11px]">
                      Click &quot;Record Expense&quot; above to log petty cash vouchers, clinical supplies, or utility bills.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {isRecordOpen && (
        <RecordExpenseModal
          categories={categories}
          branches={branches}
          defaultBranchId={currentStaffBranchId || undefined}
          onClose={() => setIsRecordOpen(false)}
          onSaved={handleRefresh}
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
          onClose={() => setSelectedExpense(null)}
          onUpdated={handleRefresh}
        />
      )}

      {isCategoriesOpen && (
        <CategoryManagerModal
          categories={categories}
          onClose={() => setIsCategoriesOpen(false)}
          onUpdated={handleRefresh}
        />
      )}

      {isPettyCashOpen && (
        <PettyCashModal
          funds={pettyCashFunds}
          branches={branches}
          defaultBranchId={currentStaffBranchId || undefined}
          onClose={() => setIsPettyCashOpen(false)}
          onUpdated={handleRefresh}
        />
      )}
    </div>
  );
}
