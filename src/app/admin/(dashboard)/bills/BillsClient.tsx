// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Bills Due, Recurring Schedules & Automated Payment Reminders Client
// ==============================================================================

"use client";

import { useState, useMemo } from "react";
import {
  Receipt,
  Plus,
  Search,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Repeat,
  Settings,
  TrendingDown,
  Building2,
  RotateCcw,
  Send,
  Eye,
  Edit,
  RefreshCw,
} from "lucide-react";
import {
  BillItem,
  RecurringBillTemplate,
  BillReminderLog,
  BillReminderSettings,
} from "./types";
import { ExpenseCategory } from "@/app/admin/(dashboard)/expenses/types";
import {
  formatPHP,
  getLocalDateString,
  getCalendarDayDiff,
  computeBillSummaryKPIs,
} from "@/lib/bills/bill-calculator";
import { AddBillModal } from "@/components/admin/bills/AddBillModal";
import { RecordPaymentModal } from "@/components/admin/bills/RecordPaymentModal";
import { BillDetailModal } from "@/components/admin/bills/BillDetailModal";
import { RecurringTemplateModal } from "@/components/admin/bills/RecurringTemplateModal";
import { BillReminderSettingsModal } from "@/components/admin/bills/BillReminderSettingsModal";
import { BillReportsView } from "@/components/admin/bills/BillReportsView";
import { triggerReminderRun, triggerRecurringGeneration } from "./actions";
import toast from "react-hot-toast";

interface BillsClientProps {
  initialBills: BillItem[];
  categories: ExpenseCategory[];
  branches: { id: string; name: string }[];
  recurringTemplates: RecurringBillTemplate[];
  reminderLogs: BillReminderLog[];
  reminderSettings?: BillReminderSettings | null;
  staffList: { id: string; full_name: string }[];
  currentStaffBranchId?: string | null;
  currentStaffId?: string;
  isSuperAdmin?: boolean;
  canApprove: boolean;
  canPay: boolean;
  canEdit: boolean;
  initialTab?: string;
  initialSelectedBillId?: string | null;
}

export function BillsClient({
  initialBills,
  categories,
  branches,
  recurringTemplates,
  reminderLogs,
  reminderSettings,
  staffList,
  currentStaffBranchId,
  currentStaffId,
  isSuperAdmin = false,
  canApprove,
  canPay,
  canEdit: _canEdit,
  initialTab = "bills",
  initialSelectedBillId,
}: BillsClientProps) {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const todayStr = getLocalDateString();

  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const defaultBranch = !isSuperAdmin && currentStaffBranchId ? currentStaffBranchId : "all";
  const [branchFilter, setBranchFilter] = useState<string>(defaultBranch);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Date Range (default: 1st day of month to +30 days)
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const defaultFutureDate = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(defaultFutureDate);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Modals
  const [isAddBillOpen, setIsAddBillOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedBillForDetail, setSelectedBillForDetail] = useState<BillItem | null>(() => {
    if (initialSelectedBillId) {
      return initialBills.find((b) => b.id === initialSelectedBillId) || null;
    }
    return null;
  });
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<BillItem | null>(null);
  const [selectedTemplateToEdit, setSelectedTemplateToEdit] = useState<RecurringBillTemplate | null>(null);

  // Running manual triggers
  const [isRunningReminders, setIsRunningReminders] = useState(false);
  const [isRunningRecurring, setIsRunningRecurring] = useState(false);

  // Extract unique vendors for filtering
  const vendorOptions = useMemo(() => {
    const set = new Set<string>();
    initialBills.forEach((b) => {
      if (b.vendor_or_payee) set.add(b.vendor_or_payee);
    });
    return Array.from(set).sort();
  }, [initialBills]);

  // Reset Filters Handler
  const handleResetFilters = () => {
    setSearchTerm("");
    setBranchFilter(defaultBranch);
    setCategoryFilter("all");
    setVendorFilter("all");
    setStatusFilter("all");
    setStartDate(firstDayOfMonth);
    setEndDate(defaultFutureDate);
    setCurrentPage(1);
    toast.success("Filters reset to default");
  };

  const isFiltered = useMemo(() => {
    return (
      searchTerm !== "" ||
      branchFilter !== defaultBranch ||
      categoryFilter !== "all" ||
      vendorFilter !== "all" ||
      statusFilter !== "all" ||
      startDate !== firstDayOfMonth ||
      endDate !== defaultFutureDate
    );
  }, [
    searchTerm,
    branchFilter,
    defaultBranch,
    categoryFilter,
    vendorFilter,
    statusFilter,
    startDate,
    endDate,
    firstDayOfMonth,
    defaultFutureDate,
  ]);

  // Filtered Bills for the table
  const filteredBills = useMemo(() => {
    return initialBills.filter((b) => {
      // Branch filter
      if (branchFilter !== "all" && b.branch_id && b.branch_id !== branchFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== "all" && b.category_id !== categoryFilter) {
        return false;
      }

      // Vendor filter
      if (vendorFilter !== "all" && b.vendor_or_payee !== vendorFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all" && b.status !== statusFilter) {
        return false;
      }

      // Due Date Range
      if (startDate && b.due_date < startDate) return false;
      if (endDate && b.due_date > endDate) return false;

      // Search term
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const numMatch = b.bill_number.toLowerCase().includes(q);
        const titleMatch = b.title.toLowerCase().includes(q);
        const vendorMatch = b.vendor_or_payee.toLowerCase().includes(q);
        const invMatch = b.invoice_number?.toLowerCase().includes(q);
        if (!numMatch && !titleMatch && !vendorMatch && !invMatch) return false;
      }

      return true;
    });
  }, [
    initialBills,
    branchFilter,
    categoryFilter,
    vendorFilter,
    statusFilter,
    startDate,
    endDate,
    searchTerm,
  ]);

  // Dashboard KPI summary cards calculation
  const summaryKPIs = useMemo(() => {
    // Only calculate KPIs for the authorized branch scope
    const scopedBills =
      branchFilter === "all"
        ? initialBills
        : initialBills.filter((b) => b.branch_id === branchFilter);
    return computeBillSummaryKPIs(scopedBills, todayStr);
  }, [initialBills, branchFilter, todayStr]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredBills.length / itemsPerPage) || 1;
  const paginatedBills = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredBills.slice(start, start + itemsPerPage);
  }, [filteredBills, currentPage]);

  const handleRunRemindersNow = async () => {
    setIsRunningReminders(true);
    try {
      const res = await triggerReminderRun();
      if (res.success) {
        toast.success(
          `Reminders processed! Created: ${res.remindersCreated}, Skipped: ${res.remindersSkipped}, Failed: ${res.remindersFailed}`
        );
      } else {
        toast.error("Failed to run reminders");
      }
    } catch {
      toast.error("Reminder execution error");
    } finally {
      setIsRunningReminders(false);
    }
  };

  const handleRunRecurringNow = async () => {
    setIsRunningRecurring(true);
    try {
      const res = await triggerRecurringGeneration();
      if (res.generatedCount > 0) {
        toast.success(`Generated ${res.generatedCount} new recurring bill(s)!`);
      } else {
        toast.success("No new recurring bills were due for generation.");
      }
    } catch {
      toast.error("Recurring generation error");
    } finally {
      setIsRunningRecurring(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-serif">
              Bills Due & Payment Reminders
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
              Operations
            </span>
          </div>
          <p className="text-sm text-slate-500 max-w-2xl">
            Track utility bills, vendor invoices, lease contracts, and automated payment reminders across all clinic branches.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleRunRemindersNow}
            disabled={isRunningReminders}
            className="h-10 px-3.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm flex items-center gap-2 transition-colors"
            title="Force immediate execution of automated payment reminder checks"
          >
            <Send className={`w-4 h-4 text-rose-600 ${isRunningReminders ? "animate-pulse" : ""}`} />
            {isRunningReminders ? "Checking Reminders..." : "Run Reminders Now"}
          </button>

          {canApprove && (
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="h-10 px-3.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm flex items-center gap-2 transition-colors"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              Settings
            </button>
          )}

          <button
            onClick={() => setActiveTab(activeTab === "reports" ? "bills" : "reports")}
            className={`h-10 px-3.5 text-xs font-semibold rounded-xl border shadow-sm flex items-center gap-2 transition-colors ${
              activeTab === "reports"
                ? "border-rose-300 bg-rose-50/80 text-rose-700 font-bold"
                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            }`}
          >
            <TrendingDown className="w-4 h-4 text-slate-500" />
            Financial Reports
          </button>

          {/* Primary Action Button: + Add Bill */}
          <button
            onClick={() => setIsAddBillOpen(true)}
            className="h-10 px-4 text-xs font-bold rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-md shadow-rose-500/20 flex items-center gap-2 transition-all hover:scale-[1.02] focus:ring-2 focus:ring-rose-400"
          >
            <Plus className="w-4 h-4" />
            + Add Bill
          </button>
        </div>
      </div>

      {/* 2. DASHBOARD SUMMARY CARDS (Actual Monetary Amounts & Counts) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Due Today */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between hover:border-amber-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Due Today</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-200/60">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold text-amber-700 font-mono tracking-tight block">
              {formatPHP(summaryKPIs.dueTodayAmount)}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {summaryKPIs.dueTodayCount} {summaryKPIs.dueTodayCount === 1 ? "bill" : "bills"} due today
            </p>
          </div>
        </div>

        {/* Card 2: Due Within 7 Days */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between hover:border-blue-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Due Within 7 Days</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200/60">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold text-blue-700 font-mono tracking-tight block">
              {formatPHP(summaryKPIs.dueWithin7DaysAmount)}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {summaryKPIs.dueWithin7DaysCount} {summaryKPIs.dueWithin7DaysCount === 1 ? "bill" : "bills"} in 7-day window
            </p>
          </div>
        </div>

        {/* Card 3: Overdue Bills */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between hover:border-red-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-red-600 font-bold">Overdue Bills</span>
            <div className="p-2 rounded-lg bg-red-50 text-red-600 border border-red-200/60">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold text-red-700 font-mono tracking-tight block">
              {formatPHP(summaryKPIs.overdueAmount)}
            </span>
            <p className="text-[11px] text-red-600 font-semibold mt-0.5">
              {summaryKPIs.overdueCount} {summaryKPIs.overdueCount === 1 ? "bill" : "bills"} past due
            </p>
          </div>
        </div>

        {/* Card 4: Outstanding Bills (Excluding Paid) */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between hover:border-purple-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Outstanding Bills</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600 border border-purple-200/60">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold text-purple-700 font-mono tracking-tight block">
              {formatPHP(summaryKPIs.outstandingAmount)}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {summaryKPIs.outstandingCount} active payables
            </p>
          </div>
        </div>

        {/* Card 5: Paid This Month */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Paid This Month</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200/60">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold text-emerald-700 font-mono tracking-tight block">
              {formatPHP(summaryKPIs.paidThisMonthAmount)}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {summaryKPIs.paidThisMonthCount} settled payouts
            </p>
          </div>
        </div>
      </div>

      {/* 3. TABS NAVIGATION */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto scrollbar-none">
        {[
          { id: "bills", label: "All Bills Due", icon: Receipt, count: filteredBills.length },
          { id: "recurring", label: "Recurring Schedules", icon: Repeat, count: recurringTemplates.length },
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
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    active ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4. TAB CONTENTS */}
      {activeTab === "reports" ? (
        <BillReportsView
          bills={initialBills}
          categories={categories}
          branches={branches}
          recurringTemplates={recurringTemplates}
          reminderLogs={reminderLogs}
          selectedBranchId={branchFilter}
        />
      ) : activeTab === "recurring" ? (
        /* RECURRING SCHEDULES VIEW */
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-serif">
                Recurring Bill Templates & Billing Cycles
              </h3>
              <p className="text-xs text-slate-500">
                Automate recurring electricity, internet, rent, and software bills safely without duplication.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRunRecurringNow}
                disabled={isRunningRecurring}
                className="h-9 px-3 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRunningRecurring ? "animate-spin" : ""}`} />
                Generate Due Bills
              </button>
              <button
                onClick={() => {
                  setSelectedTemplateToEdit(null);
                  setIsRecurringModalOpen(true);
                }}
                className="h-9 px-3.5 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                + Add Recurring Template
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-extrabold uppercase text-slate-500">
                    <th className="py-3 px-4">Schedule Name</th>
                    <th className="py-3 px-4">Vendor / Payee</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4">Frequency</th>
                    <th className="py-3 px-4">Next Billing Date</th>
                    <th className="py-3 px-4 text-right">Default Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recurringTemplates.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Repeat className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-xs font-semibold text-slate-600">No recurring bill schedules configured</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Set up recurring templates to generate upcoming rent, utility, and subscription payables automatically.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    recurringTemplates.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{t.template_name}</td>
                        <td className="py-3 px-4 text-slate-700">{t.vendor_or_payee}</td>
                        <td className="py-3 px-4 text-slate-600">{t.branch_name || "Main Clinic"}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-purple-50 text-purple-700">
                            {t.frequency}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">{t.next_billing_date}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {formatPHP(t.default_amount)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              t.status === "active"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedTemplateToEdit(t);
                              setIsRecurringModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-purple-600 rounded-lg hover:bg-purple-50"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* MAIN BILLS MASTER VIEW */
        <div className="space-y-4">
          {/* SEARCH & FILTERS TOOLBAR */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by bill #, vendor, description, or invoice..."
                  className="w-full h-10 pl-9 pr-3 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                />
              </div>

              {/* Due Date Range */}
              <div className="flex items-center gap-2 text-xs">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10 px-2.5 text-xs rounded-xl border border-slate-200 bg-white"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-10 px-2.5 text-xs rounded-xl border border-slate-200 bg-white"
                />
              </div>
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {/* Branch Filter */}
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  disabled={!isSuperAdmin && !!currentStaffBranchId}
                  className="h-9 px-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="all">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9 px-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-700"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Vendor Filter */}
              <select
                value={vendorFilter}
                onChange={(e) => setVendorFilter(e.target.value)}
                className="h-9 px-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-700"
              >
                <option value="all">All Vendors</option>
                {vendorOptions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 px-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold"
              >
                <option value="all">All Statuses</option>
                <option value="due_today">Due Today</option>
                <option value="overdue">Overdue Bills</option>
                <option value="upcoming">Upcoming</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="paid">Fully Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>

              {isFiltered && (
                <button
                  onClick={handleResetFilters}
                  className="h-9 px-3 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* DESKTOP BILLS TABLE */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-extrabold uppercase text-slate-500">
                    <th className="py-3 px-4">Bill Reference</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Vendor</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                    <th className="py-3 px-4 text-right">Paid</th>
                    <th className="py-3 px-4 text-right">Outstanding</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Next Reminder</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedBills.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400">
                        <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-xs font-semibold text-slate-600">No matching bills found</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Try adjusting your filters or click &quot;+ Add Bill&quot; to register a new payable.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedBills.map((b) => {
                      const dayDiff = getCalendarDayDiff(b.due_date, todayStr);
                      const isOverdue = b.status === "overdue" || (dayDiff < 0 && b.status !== "paid" && b.status !== "cancelled");
                      const isDueToday = b.status === "due_today" || (dayDiff === 0 && b.status !== "paid" && b.status !== "cancelled");

                      return (
                        <tr
                          key={b.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isOverdue
                              ? "bg-red-50/20"
                              : isDueToday
                              ? "bg-amber-50/20"
                              : ""
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                            {b.bill_number}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900 max-w-[200px] truncate">
                            {b.title}
                          </td>
                          <td className="py-3 px-4 text-slate-700 truncate max-w-[150px]">
                            {b.vendor_or_payee}
                          </td>
                          <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                            {b.branch_name || "Main Clinic"}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`font-semibold ${
                                isOverdue
                                  ? "text-red-700 font-bold"
                                  : isDueToday
                                  ? "text-amber-700 font-bold"
                                  : "text-slate-800"
                              }`}
                            >
                              {b.due_date}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-700">
                            {formatPHP(b.total_amount)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-700 font-semibold">
                            {formatPHP(b.amount_paid)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-extrabold text-sm whitespace-nowrap">
                            <span
                              className={
                                b.status === "paid"
                                  ? "text-slate-400 font-normal"
                                  : isOverdue
                                  ? "text-red-700"
                                  : "text-slate-900"
                              }
                            >
                              {formatPHP(b.outstanding_balance)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1 ${
                                b.status === "paid"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : b.status === "overdue"
                                  ? "bg-red-100 text-red-800 border border-red-200"
                                  : b.status === "due_today"
                                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                                  : b.status === "partially_paid"
                                  ? "bg-blue-100 text-blue-800"
                                  : b.status === "cancelled"
                                  ? "bg-slate-200 text-slate-600 line-through"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {b.status === "overdue" && <AlertTriangle className="w-3 h-3" />}
                              {b.status === "due_today" && <Clock className="w-3 h-3" />}
                              {b.status === "paid" && <CheckCircle2 className="w-3 h-3" />}
                              {b.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap text-[11px] text-slate-500">
                            {b.status === "paid" ? (
                              <span className="text-slate-400">Paid in Full</span>
                            ) : b.status === "cancelled" ? (
                              <span className="text-slate-400">Cancelled</span>
                            ) : b.next_reminder_stage ? (
                              <span className="font-semibold text-rose-700">
                                {b.next_reminder_stage.replace("_", " ").toUpperCase()} ({b.next_reminder_date})
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Record Payment Button */}
                              {canPay && b.status !== "paid" && b.status !== "cancelled" && (
                                <button
                                  onClick={() => setSelectedBillForPayment(b)}
                                  className="h-8 px-2.5 text-xs font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 transition-colors"
                                  title="Record Payment"
                                >
                                  Pay
                                </button>
                              )}

                              {/* View Details */}
                              <button
                                onClick={() => setSelectedBillForDetail(b)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                                title="View Bill Details & Reminders"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE RESPONSIVE BILL CARDS (Section 9 Requirement) */}
          <div className="md:hidden space-y-3">
            {paginatedBills.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-white border border-slate-200 rounded-2xl">
                <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-semibold text-slate-600">No matching bills</p>
              </div>
            ) : (
              paginatedBills.map((b) => {
                const dayDiff = getCalendarDayDiff(b.due_date, todayStr);
                const isOverdue = b.status === "overdue" || (dayDiff < 0 && b.status !== "paid" && b.status !== "cancelled");

                return (
                  <div
                    key={b.id}
                    className={`p-4 rounded-xl border bg-white shadow-sm space-y-3 ${
                      isOverdue ? "border-red-300 bg-red-50/10" : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-slate-700">{b.bill_number}</span>
                        <h4 className="text-sm font-bold text-slate-900 mt-0.5">{b.title}</h4>
                        <span className="text-xs text-slate-500">
                          {b.vendor_or_payee} • {b.branch_name || "Main Clinic"}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase shrink-0 ${
                          b.status === "paid"
                            ? "bg-emerald-100 text-emerald-800"
                            : b.status === "overdue"
                            ? "bg-red-100 text-red-800"
                            : b.status === "due_today"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {b.status.replace("_", " ")}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Due Date</span>
                        <span className={`font-bold ${isOverdue ? "text-red-700" : "text-slate-800"}`}>
                          {b.due_date}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block uppercase">Outstanding</span>
                        <span className="font-mono font-extrabold text-sm text-slate-900">
                          {formatPHP(b.outstanding_balance)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-[11px] text-slate-400">Total: {formatPHP(b.total_amount)}</span>
                      <div className="flex items-center gap-2">
                        {canPay && b.status !== "paid" && b.status !== "cancelled" && (
                          <button
                            onClick={() => setSelectedBillForPayment(b)}
                            className="h-8 px-3 text-xs font-bold rounded-lg bg-emerald-600 text-white"
                          >
                            Pay
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedBillForDetail(b)}
                          className="h-8 px-3 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* PAGINATION TOOLBAR */}
          {totalPages > 1 && (
            <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Showing {paginatedBills.length} of {filteredBills.length} bills
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="px-2 text-slate-700 font-semibold">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODALS */}
      {/* 1. Register Bill Modal */}
      {isAddBillOpen && (
        <AddBillModal
          isOpen={isAddBillOpen}
          onClose={() => setIsAddBillOpen(false)}
          categories={categories}
          branches={branches}
          staffList={staffList}
          currentStaffBranchId={currentStaffBranchId}
          currentStaffId={currentStaffId}
          isSuperAdmin={isSuperAdmin}
          onSuccess={() => {
            window.location.reload();
          }}
        />
      )}

      {/* 2. Record Payment Modal */}
      {selectedBillForPayment && (
        <RecordPaymentModal
          bill={selectedBillForPayment}
          isOpen={!!selectedBillForPayment}
          onClose={() => setSelectedBillForPayment(null)}
          onSuccess={() => {
            window.location.reload();
          }}
        />
      )}

      {/* 3. Bill Detail & Reminder History Modal */}
      {selectedBillForDetail && (
        <BillDetailModal
          bill={selectedBillForDetail}
          isOpen={!!selectedBillForDetail}
          onClose={() => setSelectedBillForDetail(null)}
          canApprove={canApprove}
          canPay={canPay}
          onRecordPayment={(bill) => {
            setSelectedBillForDetail(null);
            setSelectedBillForPayment(bill);
          }}
          onRefresh={() => {
            window.location.reload();
          }}
        />
      )}

      {/* 4. Recurring Template Modal */}
      {isRecurringModalOpen && (
        <RecurringTemplateModal
          isOpen={isRecurringModalOpen}
          onClose={() => {
            setIsRecurringModalOpen(false);
            setSelectedTemplateToEdit(null);
          }}
          categories={categories}
          branches={branches}
          staffList={staffList}
          currentStaffBranchId={currentStaffBranchId}
          currentStaffId={currentStaffId}
          isSuperAdmin={isSuperAdmin}
          templateToEdit={selectedTemplateToEdit}
          onSuccess={() => {
            window.location.reload();
          }}
        />
      )}

      {/* 5. Reminder Settings Modal */}
      {isSettingsModalOpen && (
        <BillReminderSettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          currentSettings={reminderSettings}
          branches={branches}
          isSuperAdmin={isSuperAdmin}
          onSuccess={() => {
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
