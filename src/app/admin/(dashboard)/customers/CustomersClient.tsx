// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Customers Management Client with Multi-Facet Search & Complete Client File Actions
// ==============================================================================

"use client";

import { useState, useMemo } from "react";
import {
  Search,
  User,
  Phone,
  Mail,
  FileSpreadsheet,
  Printer,
  History,
  Eye,
  CreditCard,
  Building2,
  RefreshCw,
  MoreVertical,
  X,
} from "lucide-react";
import type { CompleteClientFile } from "./types";
import { getCompleteClientFile, logClientFileExport } from "./actions";
import { generateClientFileExcel } from "@/lib/customers/client-file-excel";
import { ClientHistoryModal } from "@/components/admin/customers/ClientHistoryModal";
import toast from "react-hot-toast";

interface CustomerListItem {
  id: string;
  customer_code?: string | null;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  address?: string | null;
  medical_conditions?: string | null;
  allergies?: string | null;
  branch_id?: string | null;
  branch_name?: string | null;
  account_status?: string | null;
  loyalty_points?: number;
  created_at: string;
  appointments_count: number;
}

interface CustomersClientProps {
  initialCustomers: CustomerListItem[];
  branches: { id: string; name: string }[];
  canExport: boolean;
  canViewHistory: boolean;
  canPay: boolean;
  isSuperAdmin: boolean;
}

export function CustomersClient({
  initialCustomers,
  branches,
  canExport,
  canViewHistory,
  canPay,
  isSuperAdmin,
}: CustomersClientProps) {
  const [customers] = useState<CustomerListItem[]>(initialCustomers);
  const [searchTerm, setSearchTerm] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Selected client for history modal
  const [selectedClientFile, setSelectedClientFile] = useState<CompleteClientFile | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [activeMenuCustomerId, setActiveMenuCustomerId] = useState<string | null>(null);

  // Multi-facet search: Client ID, Full Name, Phone, Email, Code
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      // Branch filter
      if (branchFilter !== "all" && c.branch_id && c.branch_id !== branchFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all") {
        const cStatus = (c.account_status || "active").toLowerCase();
        if (cStatus !== statusFilter.toLowerCase()) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
        const code = (c.customer_code || "").toLowerCase();
        const id = c.id.toLowerCase();
        const phone = (c.phone || "").toLowerCase();
        const email = (c.email || "").toLowerCase();

        return (
          fullName.includes(query) ||
          code.includes(query) ||
          id.includes(query) ||
          phone.includes(query) ||
          email.includes(query)
        );
      }

      return true;
    });
  }, [customers, searchTerm, branchFilter, statusFilter]);

  // View Complete History action
  const handleOpenHistory = async (customerId: string) => {
    setIsLoadingHistory(true);
    setActiveMenuCustomerId(null);
    try {
      const res = await getCompleteClientFile(customerId);
      if (res.success && res.data) {
        setSelectedClientFile(res.data);
      } else {
        toast.error(res.error || "Failed to load client history.");
      }
    } catch {
      toast.error("Error loading client file.");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Direct Excel Extraction
  const handleExtractExcel = async (customerId: string, clientName: string) => {
    setActiveMenuCustomerId(null);
    const toastId = toast.loading(`Extracting complete file for ${clientName}...`);
    try {
      const res = await getCompleteClientFile(customerId);
      if (res.success && res.data) {
        const blob = generateClientFileExcel(res.data);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Cindyrella_Client_${res.data.client.customer_code || customerId}_History.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        await logClientFileExport(customerId, "EXCEL");
        toast.success("Excel client file extracted successfully!", { id: toastId });
      } else {
        toast.error(res.error || "Could not retrieve client records.", { id: toastId });
      }
    } catch {
      toast.error("Extraction error.", { id: toastId });
    }
  };

  // Direct Print Statement
  const handlePrintStatement = async (customerId: string) => {
    setActiveMenuCustomerId(null);
    await logClientFileExport(customerId, "STATEMENT");
    window.open(`/admin/customers/${customerId}/statement`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="font-serif text-2xl font-bold text-slate-900">
            Customers &amp; Client Files
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Client directory, installment payment tracking, treatment history &amp; audit-grade file extractions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isLoadingHistory && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200">
              <RefreshCw size={14} className="animate-spin text-amber-600" />
              Retrieving Client File...
            </div>
          )}
        </div>
      </div>

      {/* SEARCH AND FILTERS TOOLBAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by client ID, name, phone, email, application ref, or receipt..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-700"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {isSuperAdmin && (
            <div className="flex items-center gap-1.5">
              <Building2 size={14} className="text-slate-400" />
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium"
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

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium"
          >
            <option value="all">All Account Statuses</option>
            <option value="active">Active Accounts</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* CUSTOMERS TABLE (DESKTOP) */}
      <div className="hidden lg:block bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Client ID / Code</th>
              <th className="py-3 px-4">Client Name</th>
              <th className="py-3 px-4">Contact Info</th>
              <th className="py-3 px-4">Branch</th>
              <th className="py-3 px-4 text-center">Bookings</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredCustomers.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 font-mono font-bold text-slate-800">
                  {c.customer_code || `CUST-${c.id.slice(0, 6).toUpperCase()}`}
                </td>
                <td className="py-3 px-4">
                  <span className="font-bold text-slate-900 block">
                    {c.first_name} {c.last_name}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Registered {new Date(c.created_at).toLocaleDateString("en-PH")}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Phone size={12} className="text-slate-400" />
                    <span>{c.phone}</span>
                  </div>
                  {c.email && (
                    <div className="flex items-center gap-1.5 text-slate-500 mt-0.5">
                      <Mail size={12} className="text-slate-400" />
                      <span>{c.email}</span>
                    </div>
                  )}
                </td>
                <td className="py-3 px-4 font-medium text-slate-700">
                  {c.branch_name || "Main Clinic"}
                </td>
                <td className="py-3 px-4 text-center font-mono font-bold text-rose-700">
                  {c.appointments_count || 0}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {c.account_status || "Active"}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => handleOpenHistory(c.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-[11px] flex items-center gap-1 transition-colors"
                      title="View Complete History"
                    >
                      <History size={13} className="text-rose-700" />
                      History
                    </button>

                    {canExport && (
                      <>
                        <button
                          onClick={() => handleExtractExcel(c.id, `${c.first_name} ${c.last_name}`)}
                          className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors"
                          title="Extract Client File (Excel)"
                        >
                          <FileSpreadsheet size={15} />
                        </button>
                        <button
                          onClick={() => handlePrintStatement(c.id)}
                          className="p-1.5 rounded-lg text-rose-700 hover:bg-rose-50 transition-colors"
                          title="Print Client Statement (PDF)"
                        >
                          <Printer size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredCustomers.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                  No customers found matching the search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MOBILE VIEW (CARDS) */}
      <div className="grid gap-3 lg:hidden">
        {filteredCustomers.map((c) => (
          <div key={c.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  {c.customer_code || `CUST-${c.id.slice(0, 6).toUpperCase()}`}
                </span>
                <h3 className="font-bold text-slate-900 text-sm mt-1">
                  {c.first_name} {c.last_name}
                </h3>
                <p className="text-xs text-slate-500">{c.phone}</p>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400">Bookings</span>
                <p className="font-mono font-bold text-rose-700 text-sm">{c.appointments_count || 0}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500">{c.branch_name || "Main Clinic"}</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleOpenHistory(c.id)}
                  className="px-2.5 py-1 bg-slate-900 text-white rounded font-semibold text-[11px]"
                >
                  View File
                </button>
                {canExport && (
                  <button
                    onClick={() => handleExtractExcel(c.id, `${c.first_name} ${c.last_name}`)}
                    className="p-1 text-emerald-700 bg-emerald-50 rounded"
                    title="Excel"
                  >
                    <FileSpreadsheet size={15} />
                  </button>
                )}
                {canExport && (
                  <button
                    onClick={() => handlePrintStatement(c.id)}
                    className="p-1 text-rose-700 bg-rose-50 rounded"
                    title="Print Statement"
                  >
                    <Printer size={15} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {filteredCustomers.length === 0 && (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-xs text-slate-400">
            No customers found.
          </div>
        )}
      </div>

      {/* CLIENT COMPLETE HISTORY MODAL */}
      {selectedClientFile && (
        <ClientHistoryModal
          isOpen={true}
          onClose={() => setSelectedClientFile(null)}
          clientFile={selectedClientFile}
          canPay={canPay}
          onRefresh={() => handleOpenHistory(selectedClientFile.client.id)}
        />
      )}
    </div>
  );
}
