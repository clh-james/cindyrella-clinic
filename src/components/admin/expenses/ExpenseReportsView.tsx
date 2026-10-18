"use client";

import { useState, useMemo } from "react";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Building2,
  PieChart,
  TrendingDown,
  Layers,
  Users,
  AlertCircle,
  FileText,
  DollarSign,
} from "lucide-react";
import { ExpenseItem, ExpenseCategory, PettyCashFund } from "@/app/admin/(dashboard)/expenses/types";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";

interface ExpenseReportsViewProps {
  expenses: ExpenseItem[];
  categories: ExpenseCategory[];
  branches: { id: string; name: string }[];
  pettyCashFunds: PettyCashFund[];
  selectedBranchId: string;
}

type ReportType =
  | "monthly_summary"
  | "daily_breakdown"
  | "by_category"
  | "by_branch"
  | "by_vendor"
  | "approved_unpaid"
  | "reimbursements"
  | "petty_cash"
  | "payment_history"
  | "rejected_expenses";

export function ExpenseReportsView({
  expenses,
  categories,
  branches,
  pettyCashFunds,
  selectedBranchId,
}: ExpenseReportsViewProps) {
  const [reportType, setReportType] = useState<ReportType>("monthly_summary");
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  const formatPHP = (val?: number | null) =>
    `₱${(val || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  // Filter expenses by date range and branch
  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (selectedBranchId !== "all" && e.branch_id && e.branch_id !== selectedBranchId) {
        return false;
      }
      if (startDate && e.expense_date < startDate) return false;
      if (endDate && e.expense_date > endDate) return false;
      return true;
    });
  }, [expenses, selectedBranchId, startDate, endDate]);

  // Aggregate Category Breakdown
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; color: string; total: number; count: number }>();
    categories.forEach((c) => {
      map.set(c.id, { name: c.name, color: c.color, total: 0, count: 0 });
    });

    filtered.forEach((e) => {
      const cat = map.get(e.category_id);
      if (cat) {
        cat.total += Number(e.total_amount);
        cat.count += 1;
      } else {
        const other = map.get("other") || { name: "Other", color: "#6B7280", total: 0, count: 0 };
        other.total += Number(e.total_amount);
        other.count += 1;
        map.set("other", other);
      }
    });

    return Array.from(map.values())
      .filter((c) => c.count > 0)
      .sort((a, b) => b.total - a.total);
  }, [filtered, categories]);

  // Aggregate Branch Breakdown
  const branchBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>();
    branches.forEach((b) => {
      map.set(b.id, { name: b.name, total: 0, count: 0 });
    });

    filtered.forEach((e) => {
      const b = map.get(e.branch_id || "") || { name: "Unassigned", total: 0, count: 0 };
      b.total += Number(e.total_amount);
      b.count += 1;
      if (e.branch_id) map.set(e.branch_id, b);
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filtered, branches]);

  // Aggregate Vendor Breakdown
  const vendorBreakdown = useMemo(() => {
    const map = new Map<string, { vendor: string; total: number; count: number }>();
    filtered.forEach((e) => {
      const key = e.vendor_or_payee.trim().toLowerCase();
      const current = map.get(key) || { vendor: e.vendor_or_payee, total: 0, count: 0 };
      current.total += Number(e.total_amount);
      current.count += 1;
      map.set(key, current);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filtered]);

  // Aggregate Specific Subsets
  const approvedUnpaid = useMemo(
    () => filtered.filter((e) => (e.approval_status === "approved" || e.approval_status === "payment_pending") && e.payment_status !== "paid"),
    [filtered]
  );

  const reimbursements = useMemo(() => filtered.filter((e) => e.is_reimbursement), [filtered]);
  const rejectedExpenses = useMemo(() => filtered.filter((e) => e.approval_status === "rejected"), [filtered]);

  const allPayments = useMemo(() => {
    return filtered.flatMap((e) =>
      (e.payments || []).map((p) => ({
        ...p,
        expense_number: e.expense_number,
        expense_title: e.title,
        payee: e.vendor_or_payee,
        branch_name: e.branch_name,
      }))
    );
  }, [filtered]);

  const totalDisbursed = filtered.reduce((sum, e) => sum + Number(e.total_amount), 0);
  const totalTax = filtered.reduce((sum, e) => sum + Number(e.tax_amount || 0), 0);

  // Excel (.xlsx) Exporter
  const exportToExcel = () => {
    try {
      const branchName =
        selectedBranchId === "all"
          ? "All Branches"
          : branches.find((b) => b.id === selectedBranchId)?.name || "Branch";

      const wb = XLSX.utils.book_new();

      // Sheet 1: Expenses List
      const rows = filtered.map((e) => ({
        "Reference #": e.expense_number,
        Date: e.expense_date,
        Branch: e.branch_name || "Main",
        Category: e.category?.name || "General",
        Payee: e.vendor_or_payee,
        Title: e.title,
        "Amount Before Tax (₱)": Number(e.amount_before_tax),
        "Tax (₱)": Number(e.tax_amount),
        "Total (₱)": Number(e.total_amount),
        "Approved Amount (₱)": Number(e.approved_amount || e.total_amount),
        "Payment Method": e.payment_method.toUpperCase(),
        "Payment Status": e.payment_status.toUpperCase(),
        "Approval Status": e.approval_status.toUpperCase(),
        "OR/Invoice #": e.reference_number || "",
        "Requested By": e.requested_by_name || "",
        "Approved By": e.approved_by_name || "",
        Reimbursement: e.is_reimbursement ? "YES" : "NO",
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Operating Expenses");

      // Sheet 2: Category Breakdown
      const catRows = categoryBreakdown.map((c) => ({
        Category: c.name,
        "Total Expenses (₱)": c.total,
        Transactions: c.count,
        "Share (%)": totalDisbursed > 0 ? ((c.total / totalDisbursed) * 100).toFixed(1) + "%" : "0%",
      }));
      const wsCat = XLSX.utils.json_to_sheet(catRows);
      XLSX.utils.book_append_sheet(wb, wsCat, "By Category");

      // Sheet 3: Vendor Breakdown
      const venRows = vendorBreakdown.map((v) => ({
        "Vendor / Payee": v.vendor,
        "Total Paid (₱)": v.total,
        Invoices: v.count,
      }));
      const wsVen = XLSX.utils.json_to_sheet(venRows);
      XLSX.utils.book_append_sheet(wb, wsVen, "By Vendor");

      const fileName = `Cindyrella_Expenses_${startDate}_to_${endDate}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(`Exported ${filtered.length} expenses to Excel!`);
    } catch {
      toast.error("Failed to generate Excel report");
    }
  };

  // CSV Exporter
  const exportToCSV = () => {
    try {
      const headers = [
        "Expense_Number",
        "Date",
        "Branch",
        "Category",
        "Vendor_Payee",
        "Title",
        "Amount_Before_Tax",
        "Tax_Amount",
        "Total_Amount",
        "Payment_Method",
        "Payment_Status",
        "Approval_Status",
        "OR_Number",
      ];

      const csvRows = [headers.join(",")];

      filtered.forEach((e) => {
        const row = [
          `"${e.expense_number}"`,
          `"${e.expense_date}"`,
          `"${e.branch_name || ""}"`,
          `"${e.category?.name || ""}"`,
          `"${e.vendor_or_payee.replace(/"/g, '""')}"`,
          `"${e.title.replace(/"/g, '""')}"`,
          e.amount_before_tax,
          e.tax_amount,
          e.total_amount,
          `"${e.payment_method}"`,
          `"${e.payment_status}"`,
          `"${e.approval_status}"`,
          `"${e.reference_number || ""}"`,
        ];
        csvRows.push(row.join(","));
      });

      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Cindyrella_Expenses_${startDate}_to_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("CSV export downloaded!");
    } catch {
      toast.error("Failed to export CSV");
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters & Export Actions Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Date Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-stone-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            />
            <span className="text-xs text-stone-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                const now = new Date();
                setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
                setEndDate(now.toISOString().slice(0, 10));
              }}
              className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200"
            >
              This Month
            </button>
            <button
              onClick={() => {
                const now = new Date();
                setStartDate(new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10));
                setEndDate(new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10));
              }}
              className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200"
            >
              Last Month
            </button>
            <button
              onClick={() => {
                const now = new Date();
                setStartDate(new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10));
                setEndDate(now.toISOString().slice(0, 10));
              }}
              className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200"
            >
              This Year
            </button>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportToExcel}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel (.xlsx)
          </button>
          <button
            onClick={exportToCSV}
            className="px-3.5 py-1.5 text-xs font-medium rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Report Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: "monthly_summary", label: "Monthly Summary", icon: DollarSign },
          { id: "by_category", label: "By Category", icon: Layers },
          { id: "by_branch", label: "By Branch", icon: Building2 },
          { id: "by_vendor", label: "By Vendor", icon: Users },
          { id: "approved_unpaid", label: "Approved but Unpaid", icon: AlertCircle, count: approvedUnpaid.length },
          { id: "reimbursements", label: "Reimbursements", icon: FileText, count: reimbursements.length },
          { id: "rejected_expenses", label: "Rejected Records", icon: TrendingDown, count: rejectedExpenses.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = reportType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setReportType(tab.id as ReportType)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 whitespace-nowrap transition-all ${
                active
                  ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-sm"
                  : "bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-50"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    active ? "bg-stone-700 text-white" : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
          <span className="text-xs text-stone-400 block mb-1">Total Filtered Disbursements</span>
          <span className="text-xl font-black text-stone-900 dark:text-stone-100 font-mono">
            {formatPHP(totalDisbursed)}
          </span>
          <span className="text-[11px] text-stone-400 block mt-0.5">{filtered.length} transactions</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
          <span className="text-xs text-stone-400 block mb-1">Total Tax / VAT Component</span>
          <span className="text-xl font-black text-stone-900 dark:text-stone-100 font-mono">
            {formatPHP(totalTax)}
          </span>
          <span className="text-[11px] text-stone-400 block mt-0.5">Creditable input tax</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
          <span className="text-xs text-stone-400 block mb-1">Approved but Unpaid</span>
          <span className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {formatPHP(approvedUnpaid.reduce((s, e) => s + Number(e.total_amount), 0))}
          </span>
          <span className="text-[11px] text-stone-400 block mt-0.5">{approvedUnpaid.length} invoices pending</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
          <span className="text-xs text-stone-400 block mb-1">Staff Reimbursements</span>
          <span className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
            {formatPHP(reimbursements.reduce((s, e) => s + Number(e.total_amount), 0))}
          </span>
          <span className="text-[11px] text-stone-400 block mt-0.5">{reimbursements.length} claims submitted</span>
        </div>
      </div>

      {/* Main Report Table Container */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
        {/* REPORT: CATEGORY BREAKDOWN */}
        {reportType === "by_category" && (
          <div className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">Disbursements by Category</h3>
            <div className="space-y-3">
              {categoryBreakdown.map((cat) => {
                const pct = totalDisbursed > 0 ? (cat.total / totalDisbursed) * 100 : 0;
                return (
                  <div key={cat.name} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                        {cat.name} ({cat.count})
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-stone-900 dark:text-stone-100">{formatPHP(cat.total)}</span>
                        <span className="text-stone-400 w-12 text-right">{pct.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* REPORT: VENDOR BREAKDOWN */}
        {reportType === "by_vendor" && (
          <div className="p-5">
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 mb-4">Expenditure by Vendor / Payee</h3>
            <div className="divide-y divide-stone-200 dark:divide-stone-800 text-xs">
              {vendorBreakdown.map((v) => (
                <div key={v.vendor} className="py-2.5 flex items-center justify-between">
                  <span className="font-semibold text-stone-800 dark:text-stone-200">{v.vendor}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-stone-400">{v.count} transactions</span>
                    <span className="font-bold text-stone-900 dark:text-stone-100">{formatPHP(v.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REPORT: MONTHLY SUMMARY & DEFAULT TABLE */}
        {(reportType === "monthly_summary" ||
          reportType === "approved_unpaid" ||
          reportType === "reimbursements" ||
          reportType === "rejected_expenses") && (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500 font-semibold border-b border-stone-200 dark:border-stone-800">
                <tr>
                  <th className="p-3.5">Ref #</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Branch</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Payee / Description</th>
                  <th className="p-3.5 text-right">Amount (₱)</th>
                  <th className="p-3.5 text-center">Approval</th>
                  <th className="p-3.5 text-center">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                {(reportType === "approved_unpaid"
                  ? approvedUnpaid
                  : reportType === "reimbursements"
                  ? reimbursements
                  : reportType === "rejected_expenses"
                  ? rejectedExpenses
                  : filtered
                ).map((e) => (
                  <tr key={e.id} className="hover:bg-stone-50/60 dark:hover:bg-stone-800/40">
                    <td className="p-3.5 font-mono font-medium">{e.expense_number}</td>
                    <td className="p-3.5">{e.expense_date}</td>
                    <td className="p-3.5 font-medium">{e.branch_name || "Main"}</td>
                    <td className="p-3.5">
                      {e.category && (
                        <span
                          className="px-2 py-0.5 rounded text-[11px] font-semibold text-white"
                          style={{ backgroundColor: e.category.color }}
                        >
                          {e.category.name}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <p className="font-semibold text-stone-900 dark:text-stone-100">{e.vendor_or_payee}</p>
                      <p className="text-[11px] text-stone-400 truncate max-w-xs">{e.title}</p>
                    </td>
                    <td className="p-3.5 text-right font-bold text-stone-900 dark:text-stone-100">
                      {formatPHP(e.total_amount)}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="capitalize px-2 py-0.5 rounded text-[10px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                        {e.approval_status}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`capitalize px-2 py-0.5 rounded text-[10px] font-semibold ${
                          e.payment_status === "paid"
                            ? "bg-emerald-100 text-emerald-700"
                            : e.payment_status === "partially_paid"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {e.payment_status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
