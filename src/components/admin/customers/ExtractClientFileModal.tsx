// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Extract Client File Modal with Multi-Format Options (PDF, Excel, Both)
// ==============================================================================

"use client";

import { useState } from "react";
import {
  X,
  FileSpreadsheet,
  Printer,
  Files,
  Calendar,
  Building2,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { getCompleteClientFile, logClientFileExport } from "@/app/admin/(dashboard)/customers/actions";
import { generateClientFileExcel } from "@/lib/customers/client-file-excel";
import toast from "react-hot-toast";

interface ExtractClientFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: {
    id: string;
    first_name: string;
    last_name: string;
    customer_code?: string | null;
    branch_name?: string | null;
    branch_id?: string | null;
  };
  branches: { id: string; name: string }[];
  isSuperAdmin: boolean;
}

export function ExtractClientFileModal({
  isOpen,
  onClose,
  customer,
  branches,
  isSuperAdmin,
}: ExtractClientFileModalProps) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [progressStage, setProgressStage] = useState<string>("");

  if (!isOpen) return null;

  const clientName = `${customer.first_name} ${customer.last_name}`;
  const clientCode = customer.customer_code || `CUST-${customer.id.slice(0, 6).toUpperCase()}`;

  const handleDownload = async (format: "PDF" | "EXCEL" | "BOTH") => {
    setIsExporting(true);
    setExportProgress(15);
    setProgressStage("Retrieving authorized client records across database...");

    try {
      const filters = {
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        branchId: selectedBranch !== "all" ? selectedBranch : undefined,
      };

      const res = await getCompleteClientFile(customer.id, filters);
      if (!res.success || !res.data) {
        throw new Error(res.error || "Failed to retrieve records.");
      }

      setExportProgress(50);
      setProgressStage("Reconciling financial ledgers & schedules...");
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Handle Excel Download
      if (format === "EXCEL" || format === "BOTH") {
        setExportProgress(75);
        setProgressStage("Generating 15 structured Excel worksheets...");
        const blob = generateClientFileExcel(res.data);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Cindyrella_${clientCode}_Complete_Client_History.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      // Handle PDF Statement
      if (format === "PDF" || format === "BOTH") {
        setExportProgress(90);
        setProgressStage("Preparing certified printable statement...");
        const statementUrl = `/admin/customers/${customer.id}/statement${
          fromDate || toDate ? `?from=${fromDate}&to=${toDate}` : ""
        }`;
        window.open(statementUrl, "_blank");
      }

      setExportProgress(100);
      setProgressStage("Export completed successfully!");

      // Log server audit
      await logClientFileExport(customer.id, format, {
        dateRange: filters,
        branchScope: selectedBranch,
      });

      toast.success(
        format === "BOTH"
          ? "Client File exported in both PDF and Excel formats!"
          : `${format} Client File generated successfully!`
      );

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      toast.error(err.message || "Export failed.");
      setExportProgress(null);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* HEADER */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-700 flex items-center justify-center text-white">
              <Files size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base">Extract Complete Client File</h3>
              <p className="text-xs text-slate-400">
                {clientName} • <span className="font-mono text-amber-300">{clientCode}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-5">
          <p className="text-xs text-slate-600 leading-relaxed">
            Generate an official consolidated dossier containing this client&apos;s complete history across all 15
            operational modules, including Installment Contracts, POS Sales, Payments, Appointments, Packages, Refunds,
            and Receipts.
          </p>

          {/* FILTERS SECTION */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Calendar size={14} className="text-slate-500" />
              <span>Optional Date Filter (Default: Entire Available History)</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  disabled={isExporting}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs focus:ring-1 focus:ring-rose-700 outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  disabled={isExporting}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs focus:ring-1 focus:ring-rose-700 outline-hidden"
                />
              </div>
            </div>

            {/* BRANCH SCOPE */}
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Authorized Branch Scope</label>
              <div className="relative">
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  disabled={isExporting || (!isSuperAdmin && !!customer.branch_id)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-xs focus:ring-1 focus:ring-rose-700 outline-hidden"
                >
                  <option value="all">Company-Wide (All Authorized Branches)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <Building2 size={13} className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* PROGRESS INDICATOR */}
          {isExporting && exportProgress !== null && (
            <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-2 animate-in fade-in duration-200">
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-rose-300">
                  <Loader2 size={13} className="animate-spin" />
                  {progressStage}
                </span>
                <span className="font-mono text-amber-300 font-bold">{exportProgress}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-rose-500 to-amber-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* EXPORT ACTION BUTTONS */}
          <div className="space-y-2.5 pt-1">
            <button
              onClick={() => handleDownload("BOTH")}
              disabled={isExporting}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
            >
              <Files size={15} className="text-amber-400" />
              Download Both PDF and Excel (Consolidated Bundle)
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => handleDownload("PDF")}
                disabled={isExporting}
                className="py-2.5 px-3 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
              >
                <Printer size={15} />
                Download PDF File
              </button>

              <button
                onClick={() => handleDownload("EXCEL")}
                disabled={isExporting}
                className="py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
              >
                <FileSpreadsheet size={15} />
                Download Excel (15 Sheets)
              </button>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1">
            <CheckCircle2 size={13} className="text-emerald-600" />
            <span>Authoritative record verification</span>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="font-medium text-slate-600 hover:text-slate-900 underline"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
