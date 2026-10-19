"use client";

import { useState, useTransition } from "react";
import {
  Scale,
  FileSpreadsheet,
  Printer,
  TrendingUp,
  TrendingDown,
  Building2,
  CreditCard,
  Wallet,
  CheckCircle2,
  AlertCircle,
  FileText,
  Boxes,
  BriefcaseMedical,
  ShieldCheck,
  RefreshCw,
  ShoppingBag,
  Activity,
  PieChart,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import type { IncomeStatementData, BalanceSheetData } from "@/lib/finance/types";
import { generateFinancialStatementsExcel } from "@/lib/finance/financial-export";
import { getFinancialStatementsAction } from "./actions";

interface FinancialStatementsClientProps {
  initialIncomeStatement: IncomeStatementData;
  initialBalanceSheet: BalanceSheetData;
  branches: { id: string; name: string }[];
}

type TabType = "income_statement" | "balance_sheet" | "ratios";

const peso = (n?: number | null) =>
  `₱${(n || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export function FinancialStatementsClient({
  initialIncomeStatement,
  initialBalanceSheet,
  branches,
}: FinancialStatementsClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>("income_statement");
  const [income, setIncome] = useState<IncomeStatementData>(initialIncomeStatement);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetData>(initialBalanceSheet);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");

  // Date range states
  const [startDate, setStartDate] = useState(initialIncomeStatement.period.startDate);
  const [endDate, setEndDate] = useState(initialIncomeStatement.period.endDate);
  const [asOfDate, setAsOfDate] = useState(initialBalanceSheet.asOfDate);
  const [isCustomDate, setIsCustomDate] = useState(false);

  const [isPending, startTransition] = useTransition();

  // Presets
  const applyPreset = (preset: "this_month" | "last_month" | "q4" | "ytd") => {
    setIsCustomDate(false);
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth(); // 0-indexed

    let s = "";
    let e = "";
    let asOf = "";

    if (preset === "this_month") {
      s = new Date(y, m, 1).toISOString().slice(0, 10);
      e = new Date(y, m + 1, 0).toISOString().slice(0, 10);
      asOf = e;
    } else if (preset === "last_month") {
      s = new Date(y, m - 1, 1).toISOString().slice(0, 10);
      e = new Date(y, m, 0).toISOString().slice(0, 10);
      asOf = e;
    } else if (preset === "q4") {
      s = `${y}-10-01`;
      e = `${y}-12-31`;
      asOf = e;
    } else if (preset === "ytd") {
      s = `${y}-01-01`;
      e = now.toISOString().slice(0, 10);
      asOf = e;
    }

    setStartDate(s);
    setEndDate(e);
    setAsOfDate(asOf);

    fetchData(s, e, asOf, selectedBranchId);
  };

  const fetchData = (s: string, e: string, asOf: string, bId: string) => {
    startTransition(async () => {
      const res = await getFinancialStatementsAction({
        startDate: s,
        endDate: e,
        asOfDate: asOf,
        branchId: bId === "all" ? null : bId,
      });

      if (res.success && res.data) {
        setIncome(res.data.incomeStatement);
        setBalanceSheet(res.data.balanceSheet);
        toast.success("Financial statements updated");
      } else {
        toast.error(res.error || "Failed to update financial statements");
      }
    });
  };

  const handleBranchChange = (newBranchId: string) => {
    setSelectedBranchId(newBranchId);
    fetchData(startDate, endDate, asOfDate, newBranchId);
  };

  const handleApplyCustomDates = () => {
    fetchData(startDate, endDate, asOfDate, selectedBranchId);
  };

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const blob = generateFinancialStatementsExcel(income, balanceSheet);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const branchTag = selectedBranchId === "all" ? "Consolidated" : income.branch.name.replace(/\s+/g, "_");
      a.href = url;
      a.download = `Cindyrella_Financial_Statements_${branchTag}_${income.period.startDate}_to_${income.period.endDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Excel financial statements downloaded successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export Excel workbook");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Print View Styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            font-size: 11pt !important;
          }
          nav, aside, header, .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .print-break-inside-avoid {
            break-inside: avoid;
          }
          .print-card {
            border: 1px solid #ccc !important;
            box-shadow: none !important;
            background: white !important;
          }
        }
        @media screen {
          .print-only {
            display: none;
          }
        }
      `}</style>

      {/* Header & Clinic Branding */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-line">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-br from-amber-500/20 to-amber-600/30 text-amber-700 rounded-xl border border-amber-300/40">
              <Scale size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-2xl font-bold text-ink">Financial Statements</h1>
                <span className="text-[10px] font-bold tracking-widest uppercase bg-royal/10 text-royal px-2.5 py-0.5 rounded-full border border-royal/20">
                  Accrual & Cash Reporting
                </span>
              </div>
              <p className="text-xs text-ink-soft mt-0.5">
                Consolidated Income Statement (P&L) & Statement of Financial Position (Balance Sheet)
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 no-print">
          <Link
            href="/admin/pos"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-ink-soft hover:text-ink bg-white border border-line rounded-xl hover:bg-pale transition-all shadow-sm"
          >
            <ShoppingBag size={14} /> Back to POS
          </Link>
          <Link
            href="/admin/reports"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-ink-soft hover:text-ink bg-white border border-line rounded-xl hover:bg-pale transition-all shadow-sm"
          >
            <FileText size={14} /> Operational Reports
          </Link>
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-xl hover:bg-emerald-100 transition-all shadow-sm"
          >
            <FileSpreadsheet size={15} /> Export to Excel (.xlsx)
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-all shadow-sm"
          >
            <Printer size={15} /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* FILTER & CONTROL BAR (No-print) */}
      <div className="bg-white p-4 rounded-2xl border border-line shadow-sm space-y-4 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Branch Selector */}
          <div className="flex items-center gap-2.5">
            <Building2 size={16} className="text-ink-soft shrink-0" />
            <span className="text-xs font-semibold text-ink-soft uppercase tracking-wider">Branch Scope:</span>
            <select
              value={selectedBranchId}
              onChange={(e) => handleBranchChange(e.target.value)}
              disabled={isPending}
              className="text-xs font-medium bg-pale border border-line rounded-lg px-3 py-1.5 text-ink focus:outline-none focus:ring-2 focus:ring-royal/20"
            >
              <option value="all">All Branches (Consolidated Financials)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} Branch
                </option>
              ))}
            </select>
          </div>

          {/* Quick Period Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-ink-soft uppercase tracking-wider mr-1">Period:</span>
            <button
              onClick={() => applyPreset("this_month")}
              disabled={isPending}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                !isCustomDate && startDate.endsWith("-01") && endDate.slice(5, 7) === new Date().toISOString().slice(5, 7)
                  ? "bg-royal text-white shadow-sm"
                  : "bg-pale hover:bg-line/40 text-ink"
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => applyPreset("last_month")}
              disabled={isPending}
              className="text-xs px-3 py-1.5 rounded-lg font-medium bg-pale hover:bg-line/40 text-ink transition-all"
            >
              Last Month
            </button>
            <button
              onClick={() => applyPreset("q4")}
              disabled={isPending}
              className="text-xs px-3 py-1.5 rounded-lg font-medium bg-pale hover:bg-line/40 text-ink transition-all"
            >
              Q4 (Quarterly)
            </button>
            <button
              onClick={() => applyPreset("ytd")}
              disabled={isPending}
              className="text-xs px-3 py-1.5 rounded-lg font-medium bg-pale hover:bg-line/40 text-ink transition-all"
            >
              Year-to-Date
            </button>
            <button
              onClick={() => setIsCustomDate(!isCustomDate)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                isCustomDate ? "bg-royal text-white" : "bg-pale hover:bg-line/40 text-ink"
              }`}
            >
              Custom Range...
            </button>
          </div>
        </div>

        {/* Custom Date Range Picker */}
        {isCustomDate && (
          <div className="pt-3 border-t border-line/60 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-soft">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs bg-pale border border-line rounded-lg px-2.5 py-1 text-ink focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-soft">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setAsOfDate(e.target.value);
                }}
                className="text-xs bg-pale border border-line rounded-lg px-2.5 py-1 text-ink focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-soft">Balance Sheet As-of:</span>
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="text-xs bg-pale border border-line rounded-lg px-2.5 py-1 text-ink focus:outline-none"
              />
            </div>
            <button
              onClick={handleApplyCustomDates}
              disabled={isPending}
              className="text-xs px-4 py-1.5 bg-royal text-white rounded-lg font-semibold hover:bg-royal/90 transition-all flex items-center gap-1.5"
            >
              {isPending ? <RefreshCw size={13} className="animate-spin" /> : "Apply Filter"}
            </button>
          </div>
        )}
      </div>

      {/* TOP FINANCIAL KPIS SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-line shadow-sm hover:border-royal/30 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-ink-soft uppercase tracking-wider">Gross Revenue</p>
              <h3 className="text-2xl font-bold text-ink mt-1.5">{peso(income.revenue.grossRevenue)}</h3>
              <p className="text-[11px] text-ink-soft mt-1">
                Net Revenue: <span className="font-semibold text-ink">{peso(income.revenue.netRevenue)}</span>
              </p>
            </div>
            <div className="p-2.5 bg-royal/10 text-royal rounded-xl">
              <TrendingUp size={20} />
            </div>
          </div>
        </div>

        {/* Gross Profit & Margin */}
        <div className="bg-white p-5 rounded-2xl border border-line shadow-sm hover:border-emerald-300 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-ink-soft uppercase tracking-wider">Gross Profit</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1.5">{peso(income.grossProfit)}</h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  {income.grossProfitMargin.toFixed(1)}% Margin
                </span>
                <span className="text-[10px] text-ink-soft">COGS: {peso(income.cogs.totalCogs)}</span>
              </div>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <BriefcaseMedical size={20} />
            </div>
          </div>
        </div>

        {/* Net Profit / (Loss) */}
        <div
          className={`bg-white p-5 rounded-2xl border shadow-sm transition-all ${
            income.netProfit >= 0 ? "border-emerald-200 hover:border-emerald-400" : "border-rose-200 hover:border-rose-400"
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-ink-soft uppercase tracking-wider">Net Profit / (Loss)</p>
              <h3
                className={`text-2xl font-bold mt-1.5 ${
                  income.netProfit >= 0 ? "text-emerald-700" : "text-rose-600"
                }`}
              >
                {peso(income.netProfit)}
              </h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    income.netProfit >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {income.netProfitMargin.toFixed(1)}% Net Margin
                </span>
              </div>
            </div>
            <div
              className={`p-2.5 rounded-xl ${
                income.netProfit >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
              }`}
            >
              {income.netProfit >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            </div>
          </div>
        </div>

        {/* Total Assets & Balance Check */}
        <div className="bg-white p-5 rounded-2xl border border-line shadow-sm hover:border-royal/30 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-ink-soft uppercase tracking-wider">Total Assets</p>
              <h3 className="text-2xl font-bold text-ink mt-1.5">{peso(balanceSheet.assets.totalAssets)}</h3>
              <div className="flex items-center gap-1.5 mt-1">
                {balanceSheet.isBalanced ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <CheckCircle2 size={11} /> Balanced Position
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    <AlertCircle size={11} /> Variance: {peso(balanceSheet.balanceVariance)}
                  </span>
                )}
              </div>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl">
              <Scale size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* PRINT-ONLY FORMAL CLINIC HEADER */}
      <div className="print-only text-center pb-6 border-b-2 border-slate-900">
        <h1 className="font-serif text-3xl font-bold text-black uppercase tracking-wider">
          Cindyrella Aesthetic & Wellness Clinic & Spa
        </h1>
        <p className="text-sm text-slate-600 mt-1">Official Executive Financial Management Report</p>
        <div className="mt-3 flex justify-center items-center gap-6 text-xs text-slate-700 font-medium">
          <span>Branch Scope: <strong>{income.branch.name}</strong></span>
          <span>Period: <strong>{income.period.label}</strong></span>
          <span>Generated On: <strong>{new Date().toLocaleString("en-PH")}</strong></span>
        </div>
      </div>

      {/* TAB NAVIGATION (No-print) */}
      <div className="border-b border-line flex items-center justify-between no-print">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab("income_statement")}
            className={`flex items-center gap-2 py-3 px-4 font-semibold text-sm border-b-2 transition-all ${
              activeTab === "income_statement"
                ? "border-royal text-royal font-bold"
                : "border-transparent text-ink-soft hover:text-ink hover:border-line"
            }`}
          >
            <TrendingUp size={16} /> Income Statement (Profit & Loss)
          </button>
          <button
            onClick={() => setActiveTab("balance_sheet")}
            className={`flex items-center gap-2 py-3 px-4 font-semibold text-sm border-b-2 transition-all ${
              activeTab === "balance_sheet"
                ? "border-royal text-royal font-bold"
                : "border-transparent text-ink-soft hover:text-ink hover:border-line"
            }`}
          >
            <Scale size={16} /> Statement of Financial Position (Balance Sheet)
          </button>
          <button
            onClick={() => setActiveTab("ratios")}
            className={`flex items-center gap-2 py-3 px-4 font-semibold text-sm border-b-2 transition-all ${
              activeTab === "ratios"
                ? "border-royal text-royal font-bold"
                : "border-transparent text-ink-soft hover:text-ink hover:border-line"
            }`}
          >
            <ShieldCheck size={16} /> Financial Health & Key Ratios
          </button>
        </div>

        <div className="text-xs text-ink-soft">
          Scope: <strong className="text-ink">{income.branch.name}</strong>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: INCOME STATEMENT (STATEMENT OF PROFIT OR LOSS) */}
      {/* ==================================================================== */}
      {(activeTab === "income_statement" || false) && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-line shadow-sm overflow-hidden print-card">
            {/* Table Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-serif text-lg font-bold tracking-wide">
                  STATEMENT OF PROFIT OR LOSS (INCOME STATEMENT)
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  For the Period {income.period.label} ({income.period.startDate} to {income.period.endDate})
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-300">All Figures in Philippine Peso (PHP ₱)</span>
              </div>
            </div>

            <div className="p-6 divide-y divide-line/60">
              {/* SECTION I: REVENUE */}
              <div className="py-4 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-royal uppercase tracking-wider">
                  <span>I. Operating Revenue (Gross Sales)</span>
                  <span>Amount (₱)</span>
                </div>

                <div className="space-y-1.5 pl-3 text-sm">
                  <div className="flex justify-between text-ink-soft hover:text-ink py-1">
                    <span>Clinic Service & Treatment Revenue (Completed Appointments)</span>
                    <span className="font-medium text-ink">{peso(income.revenue.serviceRevenue)}</span>
                  </div>
                  <div className="flex justify-between text-ink-soft hover:text-ink py-1">
                    <span>Retail Product Sales (POS Merchandise & Beauty Care)</span>
                    <span className="font-medium text-ink">{peso(income.revenue.retailProductRevenue)}</span>
                  </div>
                  <div className="flex justify-between text-ink-soft hover:text-ink py-1">
                    <span>Package & Promo Subscriptions</span>
                    <span className="font-medium text-ink">{peso(income.revenue.packageRevenue)}</span>
                  </div>
                  <div className="flex justify-between text-ink-soft hover:text-ink py-1">
                    <span>Client Financing & Installment Collections</span>
                    <span className="font-medium text-ink">{peso(income.revenue.installmentCollections)}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-line/40 flex justify-between text-sm font-semibold text-ink">
                  <span>Gross Operating Inflow</span>
                  <span>{peso(income.revenue.grossRevenue)}</span>
                </div>

                {/* Deductions / Discounts */}
                <div className="space-y-1 pl-3 text-xs text-rose-600">
                  <div className="flex justify-between py-0.5">
                    <span>Less: Approved Promotional Discounts & Vouchers</span>
                    <span>-{peso(income.revenue.discountsAndPromos)}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span>Less: Customer Refunds & Voids</span>
                    <span>-{peso(income.revenue.refundsAndReversals)}</span>
                  </div>
                </div>

                <div className="pt-2 border-t-2 border-slate-900 flex justify-between text-base font-bold text-ink bg-pale/50 px-3 py-2 rounded-xl">
                  <span>NET OPERATING REVENUE</span>
                  <span className="text-royal font-mono font-bold">{peso(income.revenue.netRevenue)}</span>
                </div>
              </div>

              {/* SECTION II: COST OF GOODS SOLD */}
              <div className="py-4 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-royal uppercase tracking-wider">
                  <span>II. Cost of Goods Sold (COGS) & Cost of Services</span>
                  <span>Amount (₱)</span>
                </div>

                <div className="space-y-1.5 pl-3 text-sm">
                  <div className="flex justify-between text-ink-soft hover:text-ink py-1">
                    <span>Medical Supplies & Treatment Consumables (Recipe Materials BOM)</span>
                    <span className="font-medium text-ink">{peso(income.cogs.treatmentMaterialsCost)}</span>
                  </div>
                  <div className="flex justify-between text-ink-soft hover:text-ink py-1">
                    <span>Retail Products Wholesale Inventory Cost</span>
                    <span className="font-medium text-ink">{peso(income.cogs.retailProductsWholesaleCost)}</span>
                  </div>
                  <div className="flex justify-between text-ink-soft hover:text-ink py-1">
                    <span>Direct Practitioner Service Commissions</span>
                    <span className="font-medium text-ink">{peso(income.cogs.directPractitionerCommissions)}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-line/40 flex justify-between text-sm font-semibold text-rose-700">
                  <span>Total Cost of Goods Sold</span>
                  <span>-{peso(income.cogs.totalCogs)}</span>
                </div>

                <div className="pt-2 border-t-2 border-emerald-600 flex justify-between text-base font-bold text-ink bg-emerald-50/50 px-3 py-2 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span>GROSS PROFIT</span>
                    <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                      {income.grossProfitMargin.toFixed(1)}% Gross Margin
                    </span>
                  </div>
                  <span className="text-emerald-700 font-mono font-bold">{peso(income.grossProfit)}</span>
                </div>
              </div>

              {/* SECTION III: OPERATING EXPENSES (OPEX) */}
              <div className="py-4 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-royal uppercase tracking-wider">
                  <span>III. Operating Overhead & Administrative Expenses (OPEX)</span>
                  <span>Amount (₱)</span>
                </div>

                <div className="space-y-1.5 pl-3 text-sm">
                  {income.operatingExpenses.byCategory.length === 0 ? (
                    <div className="text-xs text-ink-soft py-1 italic">
                      No categorized expense vouchers recorded in this period.
                    </div>
                  ) : (
                    income.operatingExpenses.byCategory.map((cat) => (
                      <div key={cat.categoryId} className="flex justify-between items-center text-ink-soft hover:text-ink py-1">
                        <div className="flex items-center gap-2">
                          <span>{cat.categoryName}</span>
                          <span className="text-[10px] text-ink-soft bg-pale px-2 py-0.5 rounded-full">
                            {cat.count} vouchers ({cat.percentageOfOpex.toFixed(1)}%)
                          </span>
                        </div>
                        <span className="font-medium text-ink">{peso(cat.amount)}</span>
                      </div>
                    ))
                  )}

                  <div className="flex justify-between text-ink-soft hover:text-ink py-1">
                    <span>Staff Payroll, Regular Salaries & Overtime</span>
                    <span className="font-medium text-ink">{peso(income.operatingExpenses.payrollSalaries)}</span>
                  </div>

                  <div className="flex justify-between text-ink-soft hover:text-ink py-1">
                    <span>Petty Cash Drawer Drops & Sundry Operational Disbursements</span>
                    <span className="font-medium text-ink">{peso(income.operatingExpenses.pettyCashDisbursements)}</span>
                  </div>
                </div>

                <div className="pt-2 border-t-2 border-slate-900 flex justify-between text-base font-bold text-rose-700 bg-rose-50/50 px-3 py-2 rounded-xl">
                  <span>TOTAL OPERATING EXPENSES</span>
                  <span className="font-mono font-bold">-{peso(income.operatingExpenses.totalOperatingExpenses)}</span>
                </div>
              </div>

              {/* SECTION IV: OPERATING PROFIT & BOTTOM-LINE NET PROFIT */}
              <div className="py-4 space-y-3">
                <div className="flex justify-between text-sm font-semibold text-ink">
                  <span>OPERATING INCOME (EBITDA)</span>
                  <span className="font-mono">{peso(income.operatingIncome)}</span>
                </div>

                <div className="flex justify-between text-xs text-ink-soft">
                  <span>Less: Taxes, Permits & Bank Gateway Processing Fees</span>
                  <span>-{peso(income.taxesAndOther)}</span>
                </div>

                <div
                  className={`pt-3 border-t-4 border-double flex justify-between items-center text-lg font-bold px-4 py-3 rounded-2xl ${
                    income.netProfit >= 0
                      ? "border-emerald-600 bg-emerald-100/70 text-emerald-900"
                      : "border-rose-600 bg-rose-100/70 text-rose-900"
                  }`}
                >
                  <div>
                    <span className="uppercase tracking-wider">NET PROFIT / (NET LOSS) BEFORE TAX</span>
                    <p className="text-xs font-normal text-ink-soft mt-0.5">
                      Net Profit Margin: <strong className="font-semibold text-ink">{income.netProfitMargin.toFixed(2)}%</strong>
                    </p>
                  </div>
                  <span className="font-mono text-2xl font-black">{peso(income.netProfit)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue By Payment Method Breakdown Grid */}
          <div className="bg-white p-6 rounded-2xl border border-line shadow-sm print-break-inside-avoid">
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider mb-4 flex items-center gap-2">
              <CreditCard size={16} className="text-royal" /> Collections by Payment Method
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3 bg-pale rounded-xl border border-line/60">
                <span className="text-[11px] text-ink-soft block font-medium">Cash Collections</span>
                <span className="text-sm font-bold text-ink mt-1 block font-mono">
                  {peso(income.revenue.byPaymentMethod.cash)}
                </span>
              </div>
              <div className="p-3 bg-pale rounded-xl border border-line/60">
                <span className="text-[11px] text-ink-soft block font-medium">GCash / E-Wallet</span>
                <span className="text-sm font-bold text-ink mt-1 block font-mono">
                  {peso(income.revenue.byPaymentMethod.gcash)}
                </span>
              </div>
              <div className="p-3 bg-pale rounded-xl border border-line/60">
                <span className="text-[11px] text-ink-soft block font-medium">Maya</span>
                <span className="text-sm font-bold text-ink mt-1 block font-mono">
                  {peso(income.revenue.byPaymentMethod.maya)}
                </span>
              </div>
              <div className="p-3 bg-pale rounded-xl border border-line/60">
                <span className="text-[11px] text-ink-soft block font-medium">Credit / Debit Card</span>
                <span className="text-sm font-bold text-ink mt-1 block font-mono">
                  {peso(income.revenue.byPaymentMethod.card)}
                </span>
              </div>
              <div className="p-3 bg-pale rounded-xl border border-line/60">
                <span className="text-[11px] text-ink-soft block font-medium">Bank Transfers</span>
                <span className="text-sm font-bold text-ink mt-1 block font-mono">
                  {peso(income.revenue.byPaymentMethod.bankTransfer)}
                </span>
              </div>
              <div className="p-3 bg-pale rounded-xl border border-line/60">
                <span className="text-[11px] text-ink-soft block font-medium">Client Financing</span>
                <span className="text-sm font-bold text-ink mt-1 block font-mono">
                  {peso(income.revenue.byPaymentMethod.installment)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: BALANCE SHEET (STATEMENT OF FINANCIAL POSITION) */}
      {/* ==================================================================== */}
      {(activeTab === "balance_sheet" || false) && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-line shadow-sm overflow-hidden print-card">
            {/* Table Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-serif text-lg font-bold tracking-wide">
                  STATEMENT OF FINANCIAL POSITION (BALANCE SHEET)
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  As of {balanceSheet.asOfDate} — {balanceSheet.branch.name}
                </p>
              </div>
              <div className="text-right flex items-center gap-2">
                {balanceSheet.isBalanced ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1 rounded-full">
                    <CheckCircle2 size={13} /> Assets = Liabilities + Equity
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-amber-950/60 border border-amber-500/40 px-3 py-1 rounded-full">
                    <AlertCircle size={13} /> Variance: {peso(balanceSheet.balanceVariance)}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-line">
              {/* LEFT COLUMN: ASSETS */}
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-royal uppercase tracking-wider flex items-center gap-2 mb-3">
                    <Wallet size={16} /> Assets
                  </h3>

                  {/* CURRENT ASSETS */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-ink uppercase tracking-wide border-b border-line pb-1.5">
                      Current Assets
                    </h4>

                    <div className="space-y-2 text-sm pl-2">
                      <div className="flex justify-between text-ink-soft">
                        <span>Cash in Drawers (Active Cashier Shifts)</span>
                        <span className="font-medium text-ink">{peso(balanceSheet.assets.current.cashInDrawers)}</span>
                      </div>
                      <div className="flex justify-between text-ink-soft">
                        <span>Petty Cash Vault Reserves</span>
                        <span className="font-medium text-ink">{peso(balanceSheet.assets.current.pettyCashOnHand)}</span>
                      </div>
                      <div className="flex justify-between text-ink-soft">
                        <span>Cash in Bank & Digital Wallets (GCash/Maya/Card settlements)</span>
                        <span className="font-medium text-ink">{peso(balanceSheet.assets.current.cashInBankAndEWallets)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-semibold text-royal bg-royal/5 p-2 rounded-lg">
                        <span>Total Cash & Cash Equivalents</span>
                        <span>{peso(balanceSheet.assets.current.totalCashAndEquivalents)}</span>
                      </div>

                      <div className="flex justify-between text-ink-soft pt-1">
                        <span>Accounts Receivable: Client Installments</span>
                        <span className="font-medium text-ink">
                          {peso(balanceSheet.assets.current.accountsReceivable.clientInstallmentsReceivable)}
                        </span>
                      </div>
                      <div className="flex justify-between text-ink-soft">
                        <span>Accounts Receivable: Invoiced Client Treatments</span>
                        <span className="font-medium text-ink">
                          {peso(balanceSheet.assets.current.accountsReceivable.unpaidAppointmentsReceivable)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-semibold text-royal bg-royal/5 p-2 rounded-lg">
                        <span>Total Accounts Receivable</span>
                        <span>{peso(balanceSheet.assets.current.accountsReceivable.totalAccountsReceivable)}</span>
                      </div>

                      <div className="flex justify-between text-ink-soft pt-1">
                        <span>Medical Supplies & Aesthetic Consumables (Valued at Cost)</span>
                        <span className="font-medium text-ink">
                          {peso(balanceSheet.assets.current.inventoryAsset.medicalSuppliesValuation)}
                        </span>
                      </div>
                      <div className="flex justify-between text-ink-soft">
                        <span>Retail Skin Care & Merchandise Inventory</span>
                        <span className="font-medium text-ink">
                          {peso(balanceSheet.assets.current.inventoryAsset.retailProductsValuation)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-semibold text-royal bg-royal/5 p-2 rounded-lg">
                        <span>Total Inventory Asset Value ({balanceSheet.assets.current.inventoryAsset.totalSKUCount} active SKUs)</span>
                        <span>{peso(balanceSheet.assets.current.inventoryAsset.totalInventoryValuation)}</span>
                      </div>

                      <div className="flex justify-between text-ink-soft pt-1">
                        <span>Prepaid Expenses & Supplier Advances</span>
                        <span className="font-medium text-ink">{peso(balanceSheet.assets.current.prepaidExpenses)}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-pale rounded-xl border border-line flex justify-between text-sm font-bold text-ink">
                      <span>TOTAL CURRENT ASSETS</span>
                      <span className="font-mono text-royal">{peso(balanceSheet.assets.current.totalCurrentAssets)}</span>
                    </div>
                  </div>

                  {/* NON-CURRENT ASSETS */}
                  <div className="space-y-3 mt-6">
                    <h4 className="text-xs font-bold text-ink uppercase tracking-wide border-b border-line pb-1.5">
                      Non-Current Assets (Property, Plant & Equipment)
                    </h4>

                    <div className="space-y-2 text-sm pl-2">
                      <div className="flex justify-between text-ink-soft">
                        <span>Clinical Machinery, Lasers & Aesthetic Devices</span>
                        <span className="font-medium text-ink">
                          {peso(balanceSheet.assets.nonCurrent.clinicEquipmentAndMachinery)}
                        </span>
                      </div>
                      <div className="flex justify-between text-ink-soft">
                        <span>Leasehold Improvements & Clinic Furnishings</span>
                        <span className="font-medium text-ink">
                          {peso(balanceSheet.assets.nonCurrent.leaseholdImprovements)}
                        </span>
                      </div>
                      <div className="flex justify-between text-rose-600 text-xs">
                        <span>Less: Accumulated Depreciation</span>
                        <span>-{peso(balanceSheet.assets.nonCurrent.accumulatedDepreciation)}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-pale rounded-xl border border-line flex justify-between text-sm font-bold text-ink">
                      <span>TOTAL NON-CURRENT ASSETS (NET PPE)</span>
                      <span className="font-mono">{peso(balanceSheet.assets.nonCurrent.netNonCurrentAssets)}</span>
                    </div>
                  </div>
                </div>

                {/* BOTTOM TOTAL ASSETS */}
                <div className="p-4 bg-royal/10 border-2 border-royal rounded-2xl flex justify-between items-center text-lg font-bold text-royal">
                  <span>TOTAL ASSETS</span>
                  <span className="font-mono text-2xl font-black">{peso(balanceSheet.assets.totalAssets)}</span>
                </div>
              </div>

              {/* RIGHT COLUMN: LIABILITIES & EQUITY */}
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-royal uppercase tracking-wider flex items-center gap-2 mb-3">
                    <CreditCard size={16} /> Liabilities & Owner&apos;s Equity
                  </h3>

                  {/* CURRENT LIABILITIES */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-ink uppercase tracking-wide border-b border-line pb-1.5">
                      Current Liabilities
                    </h4>

                    <div className="space-y-2 text-sm pl-2">
                      <div className="flex justify-between text-ink-soft">
                        <span>Accounts Payable: Unpaid Supplier Bills</span>
                        <span className="font-medium text-ink">
                          {peso(balanceSheet.liabilities.current.accountsPayable.unpaidVendorBills)}
                        </span>
                      </div>
                      <div className="flex justify-between text-ink-soft">
                        <span>Accounts Payable: Approved Operational Vouchers</span>
                        <span className="font-medium text-ink">
                          {peso(balanceSheet.liabilities.current.accountsPayable.unpaidApprovedExpenses)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-semibold text-rose-700 bg-rose-50 p-2 rounded-lg">
                        <span>Total Accounts Payable</span>
                        <span>{peso(balanceSheet.liabilities.current.accountsPayable.totalAccountsPayable)}</span>
                      </div>

                      <div className="flex justify-between text-ink-soft pt-1">
                        <span>Accrued Payroll & Staff Salary Payable</span>
                        <span className="font-medium text-ink">
                          {peso(balanceSheet.liabilities.current.accruedPayrollPayable)}
                        </span>
                      </div>
                      <div className="flex justify-between text-ink-soft">
                        <span>Unearned Customer Deposits (Active Prepaid Packages)</span>
                        <span className="font-medium text-ink">
                          {peso(balanceSheet.liabilities.current.unearnedCustomerDeposits)}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-pale rounded-xl border border-line flex justify-between text-sm font-bold text-ink">
                      <span>TOTAL CURRENT LIABILITIES</span>
                      <span className="font-mono text-rose-700">{peso(balanceSheet.liabilities.current.totalCurrentLiabilities)}</span>
                    </div>
                  </div>

                  {/* NON-CURRENT LIABILITIES */}
                  <div className="space-y-3 mt-6">
                    <h4 className="text-xs font-bold text-ink uppercase tracking-wide border-b border-line pb-1.5">
                      Non-Current Liabilities
                    </h4>

                    <div className="space-y-2 text-sm pl-2">
                      <div className="flex justify-between text-ink-soft">
                        <span>Long Term Clinic Debt & Equipment Notes Payable</span>
                        <span className="font-medium text-ink">
                          {peso(balanceSheet.liabilities.nonCurrent.longTermClinicLoans)}
                        </span>
                      </div>
                      <div className="flex justify-between text-ink-soft">
                        <span>Long Term Lease Obligations</span>
                        <span className="font-medium text-ink">
                          {peso(balanceSheet.liabilities.nonCurrent.leaseObligations)}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-pale rounded-xl border border-line flex justify-between text-sm font-bold text-ink">
                      <span>TOTAL LIABILITIES</span>
                      <span className="font-mono text-rose-700">{peso(balanceSheet.liabilities.totalLiabilities)}</span>
                    </div>
                  </div>

                  {/* OWNER'S EQUITY */}
                  <div className="space-y-3 mt-6">
                    <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wide border-b border-line pb-1.5">
                      Owner&apos;s Equity
                    </h4>

                    <div className="space-y-2 text-sm pl-2">
                      <div className="flex justify-between text-ink-soft">
                        <span>Owner&apos;s Contributed Capital & Retained Investments</span>
                        <span className="font-medium text-ink">{peso(balanceSheet.equity.ownersCapital)}</span>
                      </div>
                      <div className="flex justify-between text-ink-soft">
                        <span>Retained Earnings (Prior Years)</span>
                        <span className="font-medium text-ink">{peso(balanceSheet.equity.retainedEarningsPrior)}</span>
                      </div>
                      <div className="flex justify-between text-ink-soft">
                        <span>Current Period Net Income (from Income Statement)</span>
                        <span
                          className={`font-semibold ${
                            balanceSheet.equity.currentPeriodNetIncome >= 0 ? "text-emerald-700" : "text-rose-600"
                          }`}
                        >
                          {peso(balanceSheet.equity.currentPeriodNetIncome)}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between text-sm font-bold text-emerald-900">
                      <span>TOTAL OWNER&apos;S EQUITY</span>
                      <span className="font-mono">{peso(balanceSheet.equity.totalEquity)}</span>
                    </div>
                  </div>
                </div>

                {/* BOTTOM TOTAL LIABILITIES & EQUITY */}
                <div className="p-4 bg-slate-900 border-2 border-slate-900 rounded-2xl flex justify-between items-center text-lg font-bold text-white">
                  <span>TOTAL LIABILITIES & EQUITY</span>
                  <span className="font-mono text-2xl font-black">{peso(balanceSheet.totalLiabilitiesAndEquity)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: FINANCIAL HEALTH & RATIOS */}
      {/* ==================================================================== */}
      {(activeTab === "ratios" || false) && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Current Ratio Card */}
            <div className="bg-white p-6 rounded-2xl border border-line shadow-sm space-y-3 print-card">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider">Current Ratio (Liquidity)</h4>
                  <div className="text-3xl font-extrabold text-ink mt-2 font-mono">
                    {balanceSheet.ratios.currentRatio > 50 ? "> 50x" : `${balanceSheet.ratios.currentRatio}x`}
                  </div>
                </div>
                <div className="p-2.5 bg-royal/10 text-royal rounded-xl">
                  <Activity size={20} />
                </div>
              </div>
              <p className="text-xs text-ink-soft">
                Measures the clinic&apos;s ability to cover short-term debts with current assets. Benchmark: ≥ 1.5x.
              </p>
              <div className="pt-2 border-t border-line text-xs flex justify-between text-ink-soft">
                <span>Working Capital:</span>
                <span className="font-semibold text-ink font-mono">{peso(balanceSheet.ratios.workingCapital)}</span>
              </div>
            </div>

            {/* Quick Ratio Card */}
            <div className="bg-white p-6 rounded-2xl border border-line shadow-sm space-y-3 print-card">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider">Quick Ratio (Acid-Test)</h4>
                  <div className="text-3xl font-extrabold text-ink mt-2 font-mono">
                    {balanceSheet.ratios.quickRatio > 50 ? "> 50x" : `${balanceSheet.ratios.quickRatio}x`}
                  </div>
                </div>
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                  <ShieldCheck size={20} />
                </div>
              </div>
              <p className="text-xs text-ink-soft">
                Strict liquidity test excluding inventory. Tests capacity to settle obligations instantly with liquid cash & receivables.
              </p>
              <div className="pt-2 border-t border-line text-xs flex justify-between text-ink-soft">
                <span>Total Liquid Cash:</span>
                <span className="font-semibold text-emerald-700 font-mono">
                  {peso(balanceSheet.assets.current.totalCashAndEquivalents)}
                </span>
              </div>
            </div>

            {/* Gross Profit Margin */}
            <div className="bg-white p-6 rounded-2xl border border-line shadow-sm space-y-3 print-card">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider">Gross Profit Margin</h4>
                  <div className="text-3xl font-extrabold text-emerald-600 mt-2 font-mono">
                    {balanceSheet.ratios.grossMarginPercentage.toFixed(1)}%
                  </div>
                </div>
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                  <TrendingUp size={20} />
                </div>
              </div>
              <p className="text-xs text-ink-soft">
                Percentage of clinic revenue retained after subtracting direct consumables, recipe supplies, and retail product costs.
              </p>
              <div className="pt-2 border-t border-line text-xs flex justify-between text-ink-soft">
                <span>Total COGS Deducted:</span>
                <span className="font-semibold text-rose-600 font-mono">{peso(income.cogs.totalCogs)}</span>
              </div>
            </div>

            {/* Net Profit Margin */}
            <div className="bg-white p-6 rounded-2xl border border-line shadow-sm space-y-3 print-card">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider">Net Profit Margin</h4>
                  <div
                    className={`text-3xl font-extrabold mt-2 font-mono ${
                      balanceSheet.ratios.netMarginPercentage >= 0 ? "text-emerald-700" : "text-rose-600"
                    }`}
                  >
                    {balanceSheet.ratios.netMarginPercentage.toFixed(1)}%
                  </div>
                </div>
                <div className="p-2.5 bg-royal/10 text-royal rounded-xl">
                  <PieChart size={20} />
                </div>
              </div>
              <p className="text-xs text-ink-soft">
                Final bottom-line net return after all operational overhead, staff payroll, rent, and utility expenses.
              </p>
              <div className="pt-2 border-t border-line text-xs flex justify-between text-ink-soft">
                <span>Net Earnings:</span>
                <span className="font-semibold text-ink font-mono">{peso(income.netProfit)}</span>
              </div>
            </div>

            {/* Debt-to-Equity */}
            <div className="bg-white p-6 rounded-2xl border border-line shadow-sm space-y-3 print-card">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider">Debt to Equity Ratio</h4>
                  <div className="text-3xl font-extrabold text-ink mt-2 font-mono">
                    {balanceSheet.ratios.debtToEquityRatio}x
                  </div>
                </div>
                <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl">
                  <Scale size={20} />
                </div>
              </div>
              <p className="text-xs text-ink-soft">
                Total clinic obligations relative to owner&apos;s equity. Measures long term solvency and conservative financial structure.
              </p>
              <div className="pt-2 border-t border-line text-xs flex justify-between text-ink-soft">
                <span>Total Liabilities:</span>
                <span className="font-semibold text-ink font-mono">{peso(balanceSheet.liabilities.totalLiabilities)}</span>
              </div>
            </div>

            {/* Inventory to Asset Share */}
            <div className="bg-white p-6 rounded-2xl border border-line shadow-sm space-y-3 print-card">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider">Inventory Asset Valuation</h4>
                  <div className="text-3xl font-extrabold text-ink mt-2 font-mono">
                    {peso(balanceSheet.assets.current.inventoryAsset.totalInventoryValuation)}
                  </div>
                </div>
                <div className="p-2.5 bg-purple-50 text-purple-700 rounded-xl">
                  <Boxes size={20} />
                </div>
              </div>
              <p className="text-xs text-ink-soft">
                Active clinic medical supplies and retail beauty products held on hand across treatment rooms and pharmacy storage.
              </p>
              <div className="pt-2 border-t border-line text-xs flex justify-between text-ink-soft">
                <span>Active Tracked SKUs:</span>
                <span className="font-semibold text-ink font-mono">{balanceSheet.assets.current.inventoryAsset.totalSKUCount} items</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FORMAL PRINT SIGNATURE BLOCK */}
      <div className="print-only pt-12 mt-12 border-t border-slate-300 print-break-inside-avoid">
        <p className="text-xs text-slate-500 mb-8 italic text-center">
          I hereby certify that this Financial Statement has been compiled in accordance with standard management accounting principles based on authentic records from Cindyrella Clinic Management System.
        </p>
        <div className="grid grid-cols-3 gap-8 text-center text-xs">
          <div>
            <div className="border-b border-black pb-1 mb-1 font-semibold">{income.generatedBy}</div>
            <p className="text-slate-600">Prepared By (Staff / Cashier)</p>
          </div>
          <div>
            <div className="border-b border-black pb-1 mb-1 font-semibold">Certified Clinic Accountant</div>
            <p className="text-slate-600">Reviewed & Verified By</p>
          </div>
          <div>
            <div className="border-b border-black pb-1 mb-1 font-semibold">Clinic Managing Director</div>
            <p className="text-slate-600">Approved By</p>
          </div>
        </div>
      </div>
    </div>
  );
}
