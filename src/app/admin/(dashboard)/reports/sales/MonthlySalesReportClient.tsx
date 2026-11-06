"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  FileSpreadsheet, FileText, Printer, Search, Building2, 
  Calendar, CheckCircle2, AlertTriangle, ArrowUpDown, ChevronDown
} from "lucide-react";
import { MonthlySalesReportData } from "@/lib/reports/monthly-sales-engine";
import { generateMonthlySalesExcel } from "@/lib/reports/monthly-sales-excel";
import toast from "react-hot-toast";

interface MonthlySalesReportClientProps {
  initialData: MonthlySalesReportData;
  branches: { id: string; name: string }[];
  currentBranchId?: string | null;
  selectedYear: number;
  selectedMonth: number;
  selectedBranchId: string;
}

const peso = (n: number) => {
  return n > 0 ? `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-";
};

const pesoBold = (n: number) => {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function MonthlySalesReportClient({
  initialData,
  branches,
  currentBranchId,
  selectedYear,
  selectedMonth,
  selectedBranchId,
}: MonthlySalesReportClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [year, setYear] = useState<number>(selectedYear);
  const [month, setMonth] = useState<number>(selectedMonth);
  const [branchId, setBranchId] = useState<string>(selectedBranchId || "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Filter rows locally if search term is typed
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return initialData.rows;
    const q = searchQuery.toLowerCase();
    return initialData.rows.filter(
      (r) =>
        r.clientName.toLowerCase().includes(q) ||
        r.servicesAvailed.toLowerCase().includes(q) ||
        r.referenceNumber.toLowerCase().includes(q) ||
        r.dateFormatted.toLowerCase().includes(q)
    );
  }, [initialData.rows, searchQuery]);

  // Recalculate summary if filtered by search
  const summary = useMemo(() => {
    if (!searchQuery.trim()) return initialData.summary;

    const totalDeposits = filteredRows.reduce((sum, r) => sum + r.depositAmount, 0);
    const totalPenileMain = filteredRows.reduce((sum, r) => sum + r.penileMainAmount, 0);
    const totalPenileWalkin = filteredRows.reduce((sum, r) => sum + r.penileWalkinAmount, 0);
    const totalOthers = filteredRows.reduce((sum, r) => sum + r.othersAmount, 0);
    const grandTotalSales = filteredRows.reduce((sum, r) => sum + r.totalSales, 0);

    return {
      ...initialData.summary,
      totalDeposits,
      totalPenileMain,
      totalPenileWalkin,
      totalOthers,
      grandTotalSales,
      transactionCount: filteredRows.length,
    };
  }, [initialData.summary, filteredRows, searchQuery]);

  const handleApplyFilter = (newMonth: number, newYear: number, newBranch: string) => {
    startTransition(() => {
      router.push(`/admin/reports/sales?month=${newMonth}&year=${newYear}&branch=${newBranch}`);
    });
  };

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      const blob = await generateMonthlySalesExcel({
        summary,
        rows: filteredRows,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Cindyrella_${summary.monthName}_${summary.year}_Detailed_Sales_Report.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Excel report exported successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate Excel report.");
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const monthOptions = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto print:p-0 print:space-y-4">
      {/* SCREEN / PRINT HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-extrabold uppercase tracking-widest text-royal font-mono">
              Cindyrella Clinic
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Sales Reports
            </span>
            {summary.reconciliationStatus === "discrepancy" && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                <AlertTriangle size={11} /> Discrepancy Flagged
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink font-serif">
            Monthly Sales Report
          </h1>
          <p className="text-xs sm:text-sm text-ink-soft mt-0.5">
            Detailed breakdown of client transactions, service categories, deposits, and monthly totals.
          </p>
        </div>

        {/* Action Buttons (Excel, PDF, Print) */}
        <div className="flex items-center gap-2 flex-wrap print:hidden">
          <button
            onClick={handleExportExcel}
            disabled={isExportingExcel}
            className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            title="Download formatted Excel (.xlsx) file"
          >
            <FileSpreadsheet size={15} />
            {isExportingExcel ? "Generating..." : "Excel Export"}
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
            title="Save or Export as PDF"
          >
            <FileText size={15} />
            PDF Export
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
            title="Print this report"
          >
            <Printer size={15} />
            Print
          </button>
        </div>
      </div>

      {/* FILTER CONTROLS BAR (Hidden during Print) */}
      <div className="bg-white border border-line rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 print:hidden">
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Month Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-soft mb-1">
              Month
            </label>
            <div className="relative">
              <select
                value={month}
                onChange={(e) => {
                  const m = Number(e.target.value);
                  setMonth(m);
                  handleApplyFilter(m, year, branchId);
                }}
                className="w-full bg-pale/40 border border-line rounded-xl px-3 py-2 text-xs font-semibold text-ink appearance-none focus:outline-none focus:ring-2 focus:ring-royal/30"
              >
                {monthOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-2.5 text-ink-soft pointer-events-none" />
            </div>
          </div>

          {/* Year Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-soft mb-1">
              Year
            </label>
            <div className="relative">
              <select
                value={year}
                onChange={(e) => {
                  const y = Number(e.target.value);
                  setYear(y);
                  handleApplyFilter(month, y, branchId);
                }}
                className="w-full bg-pale/40 border border-line rounded-xl px-3 py-2 text-xs font-semibold text-ink appearance-none focus:outline-none focus:ring-2 focus:ring-royal/30"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-2.5 text-ink-soft pointer-events-none" />
            </div>
          </div>

          {/* Branch Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-soft mb-1">
              Branch Scope
            </label>
            <div className="relative">
              <select
                value={branchId}
                onChange={(e) => {
                  const b = e.target.value;
                  setBranchId(b);
                  handleApplyFilter(month, year, b);
                }}
                className="w-full bg-pale/40 border border-line rounded-xl px-3 py-2 text-xs font-semibold text-ink appearance-none focus:outline-none focus:ring-2 focus:ring-royal/30"
              >
                <option value="all">All Authorized Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-2.5 text-ink-soft pointer-events-none" />
            </div>
          </div>

          {/* Search Client Name */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-soft mb-1">
              Search Client / Ref
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-ink-soft" />
              <input
                type="text"
                placeholder="Search name, treatment, ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-pale/40 border border-line rounded-xl pl-8 pr-3 py-2 text-xs text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-royal/30"
              />
            </div>
          </div>
        </div>

        {isPending && (
          <div className="text-xs text-royal font-semibold flex items-center gap-1.5 animate-pulse">
            Loading monthly sales data for {monthOptions.find((m) => m.value === month)?.label} {year}...
          </div>
        )}
      </div>

      {/* SALES SUMMARY CARDS (Matching Reference UI) */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Total Deposits Card */}
          <div className="bg-white border border-line rounded-2xl p-4 sm:p-5 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
              Total Deposits
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono mt-1 text-emerald-700">
              {pesoBold(summary.totalDeposits)}
            </div>
            <span className="text-[10px] text-ink-soft">Advance payments received</span>
          </div>

          {/* Penile Main Card */}
          <div className="bg-white border border-line rounded-2xl p-4 sm:p-5 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
              Penile Main
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono mt-1 text-ink">
              {pesoBold(summary.totalPenileMain)}
            </div>
            <span className="text-[10px] text-ink-soft">Booked clinical procedures</span>
          </div>

          {/* Penile Walk-in Card */}
          <div className="bg-white border border-line rounded-2xl p-4 sm:p-5 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
              Penile Walk-in
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono mt-1 text-purple-700">
              {pesoBold(summary.totalPenileWalkin)}
            </div>
            <span className="text-[10px] text-ink-soft">Direct walk-in procedures</span>
          </div>

          {/* Others Card */}
          <div className="bg-white border border-line rounded-2xl p-4 sm:p-5 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
              Others
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono mt-1 text-ink">
              {pesoBold(summary.totalOthers)}
            </div>
            <span className="text-[10px] text-ink-soft">Facial, Aesthetics, Meds & Lashes</span>
          </div>
        </div>

        {/* Grand Total Sales Card */}
        <div className="bg-white border border-line rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              GRAND TOTAL SALES
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-700 mt-0.5">
              {pesoBold(summary.grandTotalSales)}
            </div>
            <p className="text-[11px] text-ink-soft mt-0.5">
              Accurate dynamic calculation using category totals and deposits across {summary.transactionCount} transactions.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-xl bg-pale border border-line font-bold text-ink">
              Period: {summary.monthName} {summary.year}
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-royal/10 text-royal font-bold">
              {summary.branchName}
            </span>
          </div>
        </div>
      </div>

      {/* DETAILED SALES TABLE (Exact Excel Grouped Headers Layout) */}
      <div className="bg-white border border-line rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-line flex items-center justify-between bg-pale/20 print:p-2">
          <div>
            <h3 className="font-bold text-ink text-sm sm:text-base font-serif">
              Transaction Details
            </h3>
            <span className="text-[11px] text-ink-soft">
              {summary.monthName} {summary.year} • {filteredRows.length} Records Rendered
            </span>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-royal/10 text-royal border border-royal/20">
            {summary.monthName} {summary.year}
          </span>
        </div>

        {/* Responsive Table Wrapper with Momentum Scroll */}
        <div className="overflow-x-auto touch-scroll">
          <table className="w-full text-xs border-collapse">
            {/* GROUPED COLUMN HEADERS (Matching Reference Spreadsheet) */}
            <thead>
              {/* Row 1: Merged Headers */}
              <tr className="bg-[#dce6f1] text-slate-900 border-b border-slate-300">
                <th
                  rowSpan={2}
                  className="py-3 px-3 text-center font-bold border-r border-slate-300 uppercase tracking-wider min-w-[75px]"
                >
                  Date
                </th>
                <th
                  rowSpan={2}
                  className="py-3 px-3 text-left font-bold border-r border-slate-300 uppercase tracking-wider min-w-[150px]"
                >
                  Client Name
                </th>
                <th
                  rowSpan={2}
                  className="py-3 px-3 text-left font-bold border-r border-slate-300 uppercase tracking-wider min-w-[180px]"
                >
                  Services Availed
                </th>
                <th
                  rowSpan={2}
                  className="py-3 px-3 text-right font-bold border-r border-slate-300 uppercase tracking-wider min-w-[120px] text-emerald-800"
                >
                  Deposit/adv pyt
                </th>
                <th
                  colSpan={4}
                  className="py-2 px-3 text-center font-bold border-b border-slate-300 uppercase tracking-wider"
                >
                  Amount
                </th>
              </tr>

              {/* Row 2: Sub-headers */}
              <tr className="bg-[#dce6f1] text-slate-900 border-b border-slate-300">
                <th className="py-2 px-3 text-right font-bold border-r border-slate-300 min-w-[110px]">
                  Penile Main
                </th>
                <th className="py-2 px-3 text-right font-bold border-r border-slate-300 min-w-[110px] text-purple-900">
                  Penile walk-in
                </th>
                <th className="py-2 px-3 text-right font-bold border-r border-slate-300 min-w-[100px]">
                  Others
                </th>
                <th className="py-2 px-3 text-right font-bold min-w-[110px] text-slate-950 font-black">
                  Total Sales
                </th>
              </tr>
            </thead>

            {/* TABLE BODY (Data Rows) */}
            <tbody className="divide-y divide-slate-200">
              {filteredRows.length > 0 ? (
                filteredRows.map((r, idx) => (
                  <tr
                    key={r.id || idx}
                    className="hover:bg-pale/30 transition-colors odd:bg-white even:bg-slate-50/40"
                  >
                    {/* Date */}
                    <td className="py-2.5 px-3 text-center font-medium text-slate-700 border-r border-slate-200 whitespace-nowrap">
                      {r.dateFormatted}
                    </td>

                    {/* Client Name */}
                    <td className="py-2.5 px-3 text-left font-semibold text-slate-900 border-r border-slate-200">
                      <div>{r.clientName}</div>
                      <div className="text-[10px] text-slate-400 font-mono print:hidden">
                        {r.referenceNumber}
                      </div>
                    </td>

                    {/* Services Availed */}
                    <td className="py-2.5 px-3 text-left text-slate-800 border-r border-slate-200">
                      {r.servicesAvailed}
                    </td>

                    {/* Deposit / Advance Payment */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 border-r border-slate-200">
                      {r.depositAmount > 0 ? peso(r.depositAmount) : ""}
                    </td>

                    {/* Penile Main */}
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-900 border-r border-slate-200">
                      {r.penileMainAmount > 0 ? peso(r.penileMainAmount) : ""}
                    </td>

                    {/* Penile Walk-in */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-700 border-r border-slate-200">
                      {r.penileWalkinAmount > 0 ? peso(r.penileWalkinAmount) : ""}
                    </td>

                    {/* Others */}
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-900 border-r border-slate-200">
                      {r.othersAmount > 0 ? peso(r.othersAmount) : ""}
                    </td>

                    {/* Total Sales */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-950">
                      {pesoBold(r.totalSales)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    No sales records found for {summary.monthName} {summary.year}.
                  </td>
                </tr>
              )}
            </tbody>

            {/* MONTHLY TOTALS ROW (Yellow Highlight for Grand Total, Green for Deposits) */}
            <tfoot>
              <tr className="border-t-2 border-slate-900 font-bold bg-white">
                <td colSpan={3} className="py-3 px-3 text-right font-extrabold uppercase text-slate-900 border-r border-slate-300">
                  Monthly Total
                </td>

                {/* Total Deposits (Green Font) */}
                <td className="py-3 px-3 text-right font-mono text-sm font-extrabold text-emerald-700 border-r border-slate-300">
                  {summary.totalDeposits > 0 ? pesoBold(summary.totalDeposits) : "-"}
                </td>

                {/* Total Penile Main */}
                <td className="py-3 px-3 text-right font-mono text-sm font-extrabold text-emerald-700 border-r border-slate-300">
                  {summary.totalPenileMain > 0 ? pesoBold(summary.totalPenileMain) : "-"}
                </td>

                {/* Total Penile Walk-in */}
                <td className="py-3 px-3 text-right font-mono text-sm font-extrabold text-purple-700 border-r border-slate-300">
                  {summary.totalPenileWalkin > 0 ? pesoBold(summary.totalPenileWalkin) : "-"}
                </td>

                {/* Total Others */}
                <td className="py-3 px-3 text-right font-mono text-sm font-extrabold text-slate-900 border-r border-slate-300">
                  {pesoBold(summary.totalOthers)}
                </td>

                {/* Grand Total Sales (Yellow Highlight Fill, Black Bold) */}
                <td className="py-3 px-3 text-right font-mono text-sm font-black bg-[#ffff00] text-slate-950 border-r border-slate-900 shadow-inner">
                  {pesoBold(summary.grandTotalSales)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
