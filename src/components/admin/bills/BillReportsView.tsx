// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Financial Reports & Exports View for Bills Due, Payments & Reminder Audits
// ==============================================================================

"use client";

import { useState, useMemo } from "react";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Building2,
  AlertTriangle,
} from "lucide-react";
import {
  BillItem,
  BillPayment,
  BillReminderLog,
  RecurringBillTemplate,
} from "@/app/admin/(dashboard)/bills/types";
import { ExpenseCategory } from "@/app/admin/(dashboard)/expenses/types";
import {
  formatPHP,
  getLocalDateString,
  getCalendarDayDiff,
  calculateOutstandingBalance,
} from "@/lib/bills/bill-calculator";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";

interface BillReportsViewProps {
  bills: BillItem[];
  categories: ExpenseCategory[];
  branches: { id: string; name: string }[];
  recurringTemplates: RecurringBillTemplate[];
  reminderLogs: BillReminderLog[];
  selectedBranchId: string;
}

type BillReportType =
  | "due_today"
  | "due_this_week"
  | "overdue_bills"
  | "by_branch"
  | "by_vendor"
  | "recurring_calendar"
  | "payments_made"
  | "reminder_history";

export function BillReportsView({
  bills,
  categories: _categories,
  branches,
  recurringTemplates,
  reminderLogs,
  selectedBranchId,
}: BillReportsViewProps) {
  const todayStr = getLocalDateString();
  const [reportType, setReportType] = useState<BillReportType>("due_today");
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  );
  const [vendorFilter, setVendorFilter] = useState("all");

  // 1. Branch and general filtering
  const branchFilteredBills = useMemo(() => {
    return bills.filter((b) => {
      if (selectedBranchId !== "all" && b.branch_id && b.branch_id !== selectedBranchId) {
        return false;
      }
      if (vendorFilter !== "all" && b.vendor_or_payee !== vendorFilter) {
        return false;
      }
      return true;
    });
  }, [bills, selectedBranchId, vendorFilter]);

  // Unique vendors list
  const vendorsList = useMemo(() => {
    const set = new Set<string>();
    bills.forEach((b) => {
      if (b.vendor_or_payee) set.add(b.vendor_or_payee);
    });
    return Array.from(set).sort();
  }, [bills]);

  // Report 1: Bills Due Today
  const billsDueToday = useMemo(() => {
    return branchFilteredBills.filter((b) => {
      if (b.status === "paid" || b.status === "cancelled") return false;
      return getCalendarDayDiff(b.due_date, todayStr) === 0;
    });
  }, [branchFilteredBills, todayStr]);

  // Report 2: Bills Due This Week (next 7 days)
  const billsDueThisWeek = useMemo(() => {
    return branchFilteredBills.filter((b) => {
      if (b.status === "paid" || b.status === "cancelled") return false;
      const diff = getCalendarDayDiff(b.due_date, todayStr);
      return diff >= 0 && diff <= 7;
    });
  }, [branchFilteredBills, todayStr]);

  // Report 3: Overdue Bills
  const overdueBills = useMemo(() => {
    return branchFilteredBills.filter((b) => {
      if (b.status === "paid" || b.status === "cancelled") return false;
      return getCalendarDayDiff(b.due_date, todayStr) < 0;
    });
  }, [branchFilteredBills, todayStr]);

  // Report 4: Outstanding Bills by Branch
  const byBranchSummary = useMemo(() => {
    const map = new Map<string, { branchName: string; count: number; totalAmount: number; outstanding: number }>();
    branches.forEach((br) => {
      map.set(br.id, { branchName: br.name, count: 0, totalAmount: 0, outstanding: 0 });
    });

    branchFilteredBills.forEach((b) => {
      if (b.status === "cancelled" || b.status === "paid") return;
      const balance = calculateOutstandingBalance(b.total_amount, b.amount_paid);
      if (balance <= 0) return;

      const key = b.branch_id || "unassigned";
      const current = map.get(key) || {
        branchName: b.branch_name || "Unassigned",
        count: 0,
        totalAmount: 0,
        outstanding: 0,
      };

      current.count += 1;
      current.totalAmount += Number(b.total_amount);
      current.outstanding += balance;
      map.set(key, current);
    });

    return Array.from(map.values()).filter((item) => item.count > 0 || selectedBranchId === "all");
  }, [branchFilteredBills, branches, selectedBranchId]);

  // Report 5: Outstanding Bills by Vendor
  const byVendorSummary = useMemo(() => {
    const map = new Map<string, { vendor: string; count: number; totalAmount: number; outstanding: number }>();

    branchFilteredBills.forEach((b) => {
      if (b.status === "cancelled" || b.status === "paid") return;
      const balance = calculateOutstandingBalance(b.total_amount, b.amount_paid);
      if (balance <= 0) return;

      const v = b.vendor_or_payee || "Unknown Vendor";
      const cur = map.get(v) || { vendor: v, count: 0, totalAmount: 0, outstanding: 0 };
      cur.count += 1;
      cur.totalAmount += Number(b.total_amount);
      cur.outstanding += balance;
      map.set(v, cur);
    });

    return Array.from(map.values()).sort((a, b) => b.outstanding - a.outstanding);
  }, [branchFilteredBills]);

  // Report 6: Recurring Bills Calendar
  const recurringSchedules = useMemo(() => {
    return recurringTemplates.filter((t) => {
      if (selectedBranchId !== "all" && t.branch_id && t.branch_id !== selectedBranchId) return false;
      return true;
    });
  }, [recurringTemplates, selectedBranchId]);

  // Report 7: Payments Made
  const paymentsMadeList = useMemo(() => {
    const list: Array<BillPayment & { billNumber: string; billTitle: string; vendor: string; branch: string }> = [];
    branchFilteredBills.forEach((b) => {
      (b.payments || []).forEach((p) => {
        if (startDate && p.payment_date < startDate) return;
        if (endDate && p.payment_date > endDate) return;
        list.push({
          ...p,
          billNumber: b.bill_number,
          billTitle: b.title,
          vendor: b.vendor_or_payee,
          branch: b.branch_name || "Main Clinic",
        });
      });
    });
    return list.sort((a, b) => (b.payment_date > a.payment_date ? 1 : -1));
  }, [branchFilteredBills, startDate, endDate]);

  // Report 8: Reminder Delivery History
  const filteredReminders = useMemo(() => {
    return reminderLogs.filter((r) => {
      if (startDate && r.scheduled_for < startDate) return false;
      if (endDate && r.scheduled_for > endDate) return false;
      return true;
    });
  }, [reminderLogs, startDate, endDate]);

  // Excel Export Handler
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      if (reportType === "due_today" || reportType === "due_this_week" || reportType === "overdue_bills") {
        const sourceBills =
          reportType === "due_today"
            ? billsDueToday
            : reportType === "due_this_week"
            ? billsDueThisWeek
            : overdueBills;

        const rows = sourceBills.map((b) => ({
          "Bill #": b.bill_number,
          Description: b.title,
          Vendor: b.vendor_or_payee,
          Branch: b.branch_name || "Main Clinic",
          Category: b.category?.name || "General",
          "Issue Date": b.issue_date,
          "Due Date": b.due_date,
          "Total Amount (₱)": Number(b.total_amount),
          "Amount Paid (₱)": Number(b.amount_paid),
          "Outstanding Balance (₱)": Number(b.outstanding_balance),
          Status: b.status.toUpperCase(),
          "Invoice #": b.invoice_number || "—",
          "Billing Period": b.billing_period || "—",
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Bills Schedule");
      } else if (reportType === "by_branch") {
        const rows = byBranchSummary.map((item) => ({
          Branch: item.branchName,
          "Active Bills Count": item.count,
          "Total Invoiced (₱)": item.totalAmount,
          "Outstanding Payable (₱)": item.outstanding,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Payables by Branch");
      } else if (reportType === "by_vendor") {
        const rows = byVendorSummary.map((item) => ({
          "Vendor / Provider": item.vendor,
          "Active Bills Count": item.count,
          "Total Invoiced (₱)": item.totalAmount,
          "Outstanding Balance (₱)": item.outstanding,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Payables by Vendor");
      } else if (reportType === "recurring_calendar") {
        const rows = recurringSchedules.map((t) => ({
          Schedule: t.template_name,
          Vendor: t.vendor_or_payee,
          Frequency: t.frequency.toUpperCase(),
          "Default Amount (₱)": Number(t.default_amount),
          "Next Billing Date": t.next_billing_date,
          "Due Date Rule": t.due_date_rule,
          Status: t.status.toUpperCase(),
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Recurring Schedules");
      } else if (reportType === "payments_made") {
        const rows = paymentsMadeList.map((p) => ({
          "Payment #": p.payment_number,
          "Bill #": p.billNumber,
          Title: p.billTitle,
          Vendor: p.vendor,
          Branch: p.branch,
          "Payment Date": p.payment_date,
          "Amount (₱)": Number(p.amount),
          Method: p.payment_method.toUpperCase(),
          Account: p.payment_account || "—",
          "Ref #": p.reference_number || "—",
          Status: p.is_reversed ? "REVERSED" : "VALID",
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Disbursements");
      } else if (reportType === "reminder_history") {
        const rows = filteredReminders.map((r) => ({
          "Log ID": r.id,
          "Bill ID": r.bill_id,
          Stage: r.reminder_stage.toUpperCase(),
          "Scheduled Date": r.scheduled_for,
          Channel: r.channel.toUpperCase(),
          Recipient: r.recipient_name || "—",
          Status: r.delivery_status.toUpperCase(),
          "Balance at Send (₱)": Number(r.outstanding_balance_at_send),
          "Key": r.idempotency_key,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "Reminder Audit Logs");
      }

      XLSX.writeFile(wb, `Cindyrella_Bills_Report_${reportType}_${todayStr}.xlsx`);
      toast.success("Excel report exported successfully!");
    } catch {
      toast.error("Failed to export Excel report");
    }
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    try {
      const sourceBills =
        reportType === "due_today"
          ? billsDueToday
          : reportType === "due_this_week"
          ? billsDueThisWeek
          : overdueBills;

      const rows = sourceBills.map((b) => ({
        "Bill #": b.bill_number,
        Description: b.title,
        Vendor: b.vendor_or_payee,
        Branch: b.branch_name || "Main Clinic",
        "Due Date": b.due_date,
        "Total (₱)": Number(b.total_amount),
        "Balance (₱)": Number(b.outstanding_balance),
        Status: b.status,
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Cindyrella_${reportType}_${todayStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("CSV file downloaded!");
    } catch {
      toast.error("Failed to export CSV");
    }
  };

  return (
    <div className="space-y-6">
      {/* Report Type Selector & Export Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left: Report Categories */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "due_today" as BillReportType, label: "Due Today", count: billsDueToday.length },
            { id: "due_this_week" as BillReportType, label: "Due This Week", count: billsDueThisWeek.length },
            { id: "overdue_bills" as BillReportType, label: "Overdue Bills", count: overdueBills.length },
            { id: "by_branch" as BillReportType, label: "By Branch" },
            { id: "by_vendor" as BillReportType, label: "By Vendor" },
            { id: "recurring_calendar" as BillReportType, label: "Recurring Schedules", count: recurringSchedules.length },
            { id: "payments_made" as BillReportType, label: "Disbursements Made", count: paymentsMadeList.length },
            { id: "reminder_history" as BillReportType, label: "Reminder Logs", count: filteredReminders.length },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setReportType(item.id)}
              className={`h-9 px-3 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 ${
                reportType === item.id
                  ? "bg-rose-600 text-white shadow-sm shadow-rose-600/20"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              {item.label}
              {item.count !== undefined && item.count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    reportType === item.id
                      ? "bg-white text-rose-700 font-extrabold"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Right: Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="h-9 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={handleExportExcel}
            className="h-9 px-3.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm shadow-emerald-600/20"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* Date & Vendor Filters */}
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-600">Period:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-8 px-2 text-xs rounded-lg border border-slate-200 bg-white"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-8 px-2 text-xs rounded-lg border border-slate-200 bg-white"
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <span className="font-semibold text-slate-600">Vendor:</span>
          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700"
          >
            <option value="all">All Vendors / Payees</option>
            {vendorsList.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Report Renderings */}
      {/* 1. DUE TODAY */}
      {reportType === "due_today" && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-serif">
                Bills Due Today ({todayStr})
              </h3>
              <p className="text-xs text-slate-500">
                Invoices and utility disbursements requiring payment today.
              </p>
            </div>
            <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200">
              Total Due: {formatPHP(billsDueToday.reduce((sum, b) => sum + Number(b.outstanding_balance), 0))}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-extrabold uppercase text-slate-500">
                  <th className="py-2.5 px-3">Bill Reference</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Vendor</th>
                  <th className="py-2.5 px-3">Branch</th>
                  <th className="py-2.5 px-3 text-right">Total Amount</th>
                  <th className="py-2.5 px-3 text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {billsDueToday.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No bills due today! All accounts are in good standing.
                    </td>
                  </tr>
                ) : (
                  billsDueToday.map((b) => (
                    <tr key={b.id} className="hover:bg-amber-50/20">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{b.bill_number}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{b.title}</td>
                      <td className="py-2.5 px-3 text-slate-700">{b.vendor_or_payee}</td>
                      <td className="py-2.5 px-3 text-slate-500">{b.branch_name || "Main Clinic"}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">{formatPHP(b.total_amount)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-extrabold text-amber-700">
                        {formatPHP(b.outstanding_balance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. DUE THIS WEEK */}
      {reportType === "due_this_week" && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-serif">
                Bills Due Within 7 Days
              </h3>
              <p className="text-xs text-slate-500">
                Short-term cash outflow obligations scheduled for the next 7 calendar days.
              </p>
            </div>
            <span className="text-xs font-bold text-blue-800 bg-blue-50 px-3 py-1 rounded-xl border border-blue-200">
              Total Due: {formatPHP(billsDueThisWeek.reduce((sum, b) => sum + Number(b.outstanding_balance), 0))}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-extrabold uppercase text-slate-500">
                  <th className="py-2.5 px-3">Bill Reference</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Vendor</th>
                  <th className="py-2.5 px-3">Branch</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3 text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {billsDueThisWeek.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No bills due within the next 7 days.
                    </td>
                  </tr>
                ) : (
                  billsDueThisWeek.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{b.bill_number}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{b.title}</td>
                      <td className="py-2.5 px-3 text-slate-700">{b.vendor_or_payee}</td>
                      <td className="py-2.5 px-3 text-slate-500">{b.branch_name || "Main Clinic"}</td>
                      <td className="py-2.5 px-3 font-bold text-blue-700">{b.due_date}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatPHP(b.outstanding_balance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. OVERDUE BILLS */}
      {reportType === "overdue_bills" && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-serif flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                Overdue Unpaid Bills
              </h3>
              <p className="text-xs text-slate-500">
                Past due accounts requiring immediate payment or administrative follow-up.
              </p>
            </div>
            <span className="text-xs font-bold text-red-800 bg-red-50 px-3 py-1 rounded-xl border border-red-200">
              Total Overdue: {formatPHP(overdueBills.reduce((sum, b) => sum + Number(b.outstanding_balance), 0))}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-red-50/30 text-[11px] font-extrabold uppercase text-red-900">
                  <th className="py-2.5 px-3">Bill Reference</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Vendor</th>
                  <th className="py-2.5 px-3">Branch</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3 text-center">Days Overdue</th>
                  <th className="py-2.5 px-3 text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overdueBills.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Great news! There are zero overdue bills.
                    </td>
                  </tr>
                ) : (
                  overdueBills.map((b) => {
                    const daysPast = Math.abs(getCalendarDayDiff(b.due_date, todayStr));
                    return (
                      <tr key={b.id} className="hover:bg-red-50/30">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{b.bill_number}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{b.title}</td>
                        <td className="py-2.5 px-3 text-slate-700">{b.vendor_or_payee}</td>
                        <td className="py-2.5 px-3 text-slate-500">{b.branch_name || "Main Clinic"}</td>
                        <td className="py-2.5 px-3 font-bold text-red-700">{b.due_date}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-100 text-red-800">
                            {daysPast} {daysPast === 1 ? "day" : "days"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-extrabold text-red-700">
                          {formatPHP(b.outstanding_balance)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. BY BRANCH */}
      {reportType === "by_branch" && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-serif">
              Outstanding Bills & Payables by Clinic Branch
            </h3>
            <p className="text-xs text-slate-500">
              Aggregated operating liabilities and outstanding balances per facility.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-extrabold uppercase text-slate-500">
                  <th className="py-2.5 px-3">Clinic Branch</th>
                  <th className="py-2.5 px-3 text-center">Active Bills Count</th>
                  <th className="py-2.5 px-3 text-right">Total Invoiced (₱)</th>
                  <th className="py-2.5 px-3 text-right">Outstanding Payable (₱)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {byBranchSummary.map((item) => (
                  <tr key={item.branchName} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      {item.branchName}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                        {item.count}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700">
                      {formatPHP(item.totalAmount)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-extrabold text-rose-700 text-sm">
                      {formatPHP(item.outstanding)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. BY VENDOR */}
      {reportType === "by_vendor" && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-serif">
              Outstanding Bills by Vendor & Service Provider
            </h3>
            <p className="text-xs text-slate-500">
              Payables breakdown ranked by total outstanding balance.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-extrabold uppercase text-slate-500">
                  <th className="py-2.5 px-3">Vendor / Service Provider</th>
                  <th className="py-2.5 px-3 text-center">Bills Count</th>
                  <th className="py-2.5 px-3 text-right">Total Invoiced (₱)</th>
                  <th className="py-2.5 px-3 text-right">Outstanding Balance (₱)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {byVendorSummary.map((item) => (
                  <tr key={item.vendor} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-bold text-slate-900">{item.vendor}</td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-700">{item.count}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600">{formatPHP(item.totalAmount)}</td>
                    <td className="py-3 px-3 text-right font-mono font-extrabold text-rose-700 text-sm">
                      {formatPHP(item.outstanding)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. RECURRING SCHEDULES */}
      {reportType === "recurring_calendar" && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-serif">
              Recurring Bills Calendar & Expected Billing Cycles
            </h3>
            <p className="text-xs text-slate-500">
              Automated recurring subscriptions, rent, utilities, and vendor retainers.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-extrabold uppercase text-slate-500">
                  <th className="py-2.5 px-3">Schedule Name</th>
                  <th className="py-2.5 px-3">Vendor</th>
                  <th className="py-2.5 px-3">Frequency</th>
                  <th className="py-2.5 px-3">Next Billing Date</th>
                  <th className="py-2.5 px-3 text-right">Default Amount (₱)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recurringSchedules.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-bold text-slate-900">{t.template_name}</td>
                    <td className="py-3 px-3 text-slate-700">{t.vendor_or_payee}</td>
                    <td className="py-3 px-3 font-semibold uppercase text-purple-700">{t.frequency}</td>
                    <td className="py-3 px-3 font-bold text-slate-800">{t.next_billing_date}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {formatPHP(t.default_amount)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. DISBURSEMENTS MADE */}
      {reportType === "payments_made" && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-serif">
                Cash Disbursements & Bill Payments Made
              </h3>
              <p className="text-xs text-slate-500">
                Actual cash outflows recorded across clinic branches.
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
              Total Payouts: {formatPHP(paymentsMadeList.filter((p) => !p.is_reversed).reduce((sum, p) => sum + Number(p.amount), 0))}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-extrabold uppercase text-slate-500">
                  <th className="py-2.5 px-3">Payment #</th>
                  <th className="py-2.5 px-3">Bill Title</th>
                  <th className="py-2.5 px-3">Vendor</th>
                  <th className="py-2.5 px-3">Branch</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3 text-right">Amount (₱)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paymentsMadeList.map((p) => (
                  <tr key={p.id} className={`hover:bg-slate-50 ${p.is_reversed ? "opacity-50 line-through" : ""}`}>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{p.payment_number}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{p.billTitle}</td>
                    <td className="py-2.5 px-3 text-slate-700">{p.vendor}</td>
                    <td className="py-2.5 px-3 text-slate-500">{p.branch}</td>
                    <td className="py-2.5 px-3 text-slate-600">{p.payment_date}</td>
                    <td className="py-2.5 px-3 capitalize">{p.payment_method.replace("_", " ")}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                      {formatPHP(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 8. REMINDER HISTORY */}
      {reportType === "reminder_history" && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-serif">
              Automated Reminder Audit & Delivery Log
            </h3>
            <p className="text-xs text-slate-500">
              Audit trail of every reminder generated by the automated scheduler.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-extrabold uppercase text-slate-500">
                  <th className="py-2.5 px-3">Stage</th>
                  <th className="py-2.5 px-3">Scheduled For</th>
                  <th className="py-2.5 px-3">Recipient</th>
                  <th className="py-2.5 px-3">Channel</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Balance at Send</th>
                  <th className="py-2.5 px-3">Idempotency Key</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReminders.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold uppercase text-slate-900">{r.reminder_stage.replace("_", " ")}</td>
                    <td className="py-2.5 px-3 text-slate-600">{r.scheduled_for}</td>
                    <td className="py-2.5 px-3 text-slate-800">{r.recipient_name || "—"}</td>
                    <td className="py-2.5 px-3 uppercase text-slate-500">{r.channel}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          r.delivery_status === "sent"
                            ? "bg-emerald-100 text-emerald-800"
                            : r.delivery_status === "skipped"
                            ? "bg-slate-100 text-slate-600"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {r.delivery_status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatPHP(r.outstanding_balance_at_send)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-400 truncate max-w-[200px]">
                      {r.idempotency_key}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
