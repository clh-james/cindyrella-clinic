// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Client History Modal — Comprehensive Records, Installments, Payments & Exports
// ==============================================================================

"use client";

import { useState } from "react";
import {
  X,
  User,
  CreditCard,
  Calendar,
  Receipt,
  FileSpreadsheet,
  Printer,
  Sparkles,
  Clock,
  RotateCcw,
  RefreshCw,
  Plus,
} from "lucide-react";
import type {
  CompleteClientFile,
  InstallmentApplication,
} from "@/app/admin/(dashboard)/customers/types";
import { formatPHP } from "@/lib/customers/customer-history-engine";
import { generateClientFileExcel } from "@/lib/customers/client-file-excel";
import {
  createInstallmentApplication,
  recordInstallmentPayment,
  reverseInstallmentPayment,
  logClientFileExport,
} from "@/app/admin/(dashboard)/customers/actions";
import toast from "react-hot-toast";

interface ClientHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientFile: CompleteClientFile;
  canApprove?: boolean;
  canPay?: boolean;
  onRefresh?: () => void;
}

export function ClientHistoryModal({
  isOpen,
  onClose,
  clientFile,
  canPay = true,
  onRefresh,
}: ClientHistoryModalProps) {
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "installments"
    | "payments"
    | "appointments"
    | "packages"
    | "timeline"
    | "documents"
  >("overview");

  const [selectedApp, setSelectedApp] = useState<InstallmentApplication | null>(null);
  const [showNewAppModal, setShowNewAppModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [targetScheduleId, setTargetScheduleId] = useState<string | null>(null);

  // New Application Form State
  const [serviceName, setServiceName] = useState("");
  const [contractAmount, setContractAmount] = useState("");
  const [downPayment, setDownPayment] = useState("");
  const [frequency, setFrequency] = useState<"weekly" | "bi_weekly" | "monthly" | "quarterly">("monthly");
  const [installmentsCount, setInstallmentsCount] = useState("3");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [appNotes, setAppNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payment Form State
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payReceipt, setPayReceipt] = useState("");
  const [payTxnRef, setPayTxnRef] = useState("");
  const [payNotes, setPayNotes] = useState("");

  if (!isOpen) return null;

  const client = clientFile.client;
  const summary = clientFile.summary;

  // Handle Excel Export
  const handleExportExcel = async () => {
    try {
      const blob = generateClientFileExcel(clientFile);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Cindyrella_Client_${client.customer_code || client.id}_History.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await logClientFileExport(client.id, "EXCEL");
      toast.success("Excel client file extracted successfully!");
    } catch {
      toast.error("Failed to export Excel file.");
    }
  };

  // Handle Open Statement (Printable PDF)
  const handleOpenStatement = async () => {
    await logClientFileExport(client.id, "STATEMENT");
    window.open(`/admin/customers/${client.id}/statement`, "_blank");
  };

  // Handle New Application Submission
  const handleCreateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim() || !contractAmount || Number(contractAmount) <= 0) {
      toast.error("Please enter a valid service name and contract amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createInstallmentApplication({
        customer_id: client.id,
        service_package_name: serviceName.trim(),
        original_contract_amount: Number(contractAmount),
        down_payment_received: Number(downPayment || 0),
        frequency,
        number_of_installments: Number(installmentsCount),
        contract_start_date: startDate,
        notes: appNotes.trim(),
      });

      if (res.success) {
        toast.success("Installment contract created successfully!");
        setShowNewAppModal(false);
        setServiceName("");
        setContractAmount("");
        setDownPayment("");
        if (onRefresh) onRefresh();
      } else {
        toast.error(res.error || "Failed to create application.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Record Payment Submission
  const handleRecordPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    if (!payAmount || Number(payAmount) <= 0) {
      toast.error("Please enter a valid payment amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await recordInstallmentPayment({
        application_id: selectedApp.id,
        customer_id: client.id,
        schedule_id: targetScheduleId,
        amount_paid: Number(payAmount),
        payment_method: payMethod,
        receipt_number: payReceipt.trim() || undefined,
        transaction_reference: payTxnRef.trim() || undefined,
        notes: payNotes.trim() || undefined,
      });

      if (res.success) {
        toast.success("Installment payment recorded!");
        setShowPayModal(false);
        setPayAmount("");
        setPayReceipt("");
        setPayTxnRef("");
        setPayNotes("");
        setTargetScheduleId(null);
        if (onRefresh) onRefresh();
      } else {
        toast.error(res.error || "Failed to record payment.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Reversal
  const handleReversePay = async (paymentId: string) => {
    const reason = window.prompt("Reason for reversing this installment payment:");
    if (!reason || !reason.trim()) return;

    try {
      const res = await reverseInstallmentPayment(paymentId, reason.trim());
      if (res.success) {
        toast.success("Payment reversed successfully.");
        if (onRefresh) onRefresh();
      } else {
        toast.error(res.error || "Reversal failed.");
      }
    } catch {
      toast.error("Failed to reverse payment.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-auto flex flex-col max-h-[92vh] overflow-hidden border border-slate-200">
        {/* MODAL HEADER */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-rose-700 flex items-center justify-center font-bold text-white shadow-md">
              <User size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">
                  {client.full_name || `${client.first_name} ${client.last_name}`}
                </h2>
                <span className="text-[11px] font-mono bg-slate-800 text-amber-300 px-2 py-0.5 rounded-full border border-slate-700">
                  {client.customer_code || client.id.slice(0, 8)}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                  {client.account_status || "Active"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {client.phone} {client.email ? `• ${client.email}` : ""} • Registered {new Date(client.created_at).toLocaleDateString("en-PH")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white flex items-center gap-1.5 transition-colors shadow-xs"
              title="Export 9-Sheet Excel Workbook"
            >
              <FileSpreadsheet size={14} />
              Excel File
            </button>
            <button
              onClick={handleOpenStatement}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-700 hover:bg-rose-600 text-white flex items-center gap-1.5 transition-colors shadow-xs"
              title="Printable Statement / PDF"
            >
              <Printer size={14} />
              Statement / PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* TOP FINANCIAL KPI SUMMARY CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-slate-50 border-b border-slate-200">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Contract Value</span>
            <p className="font-mono text-base sm:text-lg font-bold text-slate-900 mt-0.5">
              {formatPHP(summary.total_contract_value)}
            </p>
            <span className="text-[10px] text-slate-500">{summary.active_applications_count} Active Contracts</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Total Paid</span>
            <p className="font-mono text-base sm:text-lg font-bold text-emerald-700 mt-0.5">
              {formatPHP(summary.total_valid_payments)}
            </p>
            <span className="text-[10px] text-emerald-600">{summary.paid_installments_count} Paid Installments</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-rose-600 tracking-wider">Outstanding Balance</span>
            <p className="font-mono text-base sm:text-lg font-bold text-rose-700 mt-0.5">
              {formatPHP(summary.total_outstanding_balance)}
            </p>
            <span className="text-[10px] text-rose-600">{summary.remaining_installments_count} Installments Due</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">Overdue Balance</span>
            <p className="font-mono text-base sm:text-lg font-bold text-amber-700 mt-0.5">
              {formatPHP(summary.overdue_balance)}
            </p>
            <span className="text-[10px] text-amber-600">Past Due Date</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider">Next Due Date</span>
            <p className="font-mono text-sm sm:text-base font-bold text-indigo-900 mt-0.5 truncate">
              {summary.next_due_date || "None Pending"}
            </p>
            <span className="text-[10px] text-indigo-600 font-mono">
              {summary.next_scheduled_amount ? formatPHP(summary.next_scheduled_amount) : "-"}
            </span>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex border-b border-slate-200 px-6 bg-white overflow-x-auto gap-1">
          {[
            { id: "overview", label: "Overview", icon: User },
            { id: "installments", label: `Installments (${clientFile.applications.length})`, icon: CreditCard },
            { id: "payments", label: `Payments (${clientFile.payments.length})`, icon: Receipt },
            { id: "appointments", label: `Appointments (${clientFile.appointments.length})`, icon: Calendar },
            { id: "packages", label: `Packages (${clientFile.packages.length})`, icon: Sparkles },
            { id: "timeline", label: `Activity (${clientFile.timeline.length})`, icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSelectedApp(null);
                }}
                className={`py-3 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? "border-rose-700 text-rose-700"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB CONTENTS */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <h3 className="font-serif font-bold text-sm text-slate-800 border-b border-slate-100 pb-2">
                    Client Details
                  </h3>
                  <div className="grid grid-cols-2 gap-y-2 text-xs">
                    <span className="text-slate-500 font-medium">Full Name:</span>
                    <span className="text-slate-900 font-semibold">{client.full_name}</span>
                    <span className="text-slate-500 font-medium">Contact Phone:</span>
                    <span className="text-slate-900">{client.phone}</span>
                    <span className="text-slate-500 font-medium">Email Address:</span>
                    <span className="text-slate-900">{client.email || "None"}</span>
                    <span className="text-slate-500 font-medium">Address:</span>
                    <span className="text-slate-900">{client.address || "None"}</span>
                    <span className="text-slate-500 font-medium">Assigned Branch:</span>
                    <span className="text-slate-900">{client.branch_name || "Main Clinic"}</span>
                    <span className="text-slate-500 font-medium">Loyalty Balance:</span>
                    <span className="text-amber-700 font-bold">{client.loyalty_points || 0} Points</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <h3 className="font-serif font-bold text-sm text-slate-800 border-b border-slate-100 pb-2">
                    Clinical & Safety Info
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium">Medical Conditions:</span>
                      <p className="text-slate-900 mt-0.5 bg-slate-50 p-2 rounded-lg border border-slate-200">
                        {client.medical_conditions || "None reported"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Known Allergies:</span>
                      <p className="text-slate-900 mt-0.5 bg-slate-50 p-2 rounded-lg border border-slate-200">
                        {client.allergies || "None reported"}
                      </p>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-slate-500 font-medium">Emergency Contact:</span>
                      <span className="text-slate-900">{client.emergency_contact || "N/A"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* QUICK RECENT ACTIVITY */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
                <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
                  <h3 className="font-serif font-bold text-sm text-slate-800">Recent Timeline Events</h3>
                  <button
                    onClick={() => setActiveTab("timeline")}
                    className="text-xs text-rose-700 font-semibold hover:underline"
                  >
                    View All ({clientFile.timeline.length})
                  </button>
                </div>
                <div className="space-y-3">
                  {clientFile.timeline.slice(0, 5).map((t) => (
                    <div key={t.id} className="flex items-start gap-3 text-xs border-b border-slate-100 pb-2 last:border-0">
                      <div className="w-2 h-2 rounded-full bg-rose-600 mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span className="font-bold text-slate-900">{t.title}</span>
                          <span className="text-[10px] text-slate-500">{t.date_formatted}</span>
                        </div>
                        <p className="text-slate-600 mt-0.5">{t.description}</p>
                      </div>
                      {t.amount !== null && t.amount !== undefined && (
                        <span className="font-mono font-bold text-slate-900">
                          {formatPHP(t.amount)}
                        </span>
                      )}
                    </div>
                  ))}
                  {clientFile.timeline.length === 0 && (
                    <p className="text-xs text-slate-400 py-3 text-center">No timeline records found.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INSTALLMENT APPLICATIONS */}
          {activeTab === "installments" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-800 font-serif">
                  Installment Contracts &amp; Packages
                </h3>
                {canPay && (
                  <button
                    onClick={() => setShowNewAppModal(true)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs"
                  >
                    <Plus size={14} /> New Contract
                  </button>
                )}
              </div>

              {clientFile.applications.map((app) => (
                <div
                  key={app.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden"
                >
                  <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{app.service_package_name}</span>
                        <span className="font-mono text-xs text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {app.application_number}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            app.status === "completed"
                              ? "bg-emerald-100 text-emerald-800"
                              : app.status === "active"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-slate-200 text-slate-800"
                          }`}
                        >
                          {app.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Contract Date: {app.contract_start_date} • {app.number_of_installments} Installments ({app.frequency}) • {app.branch_name}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Balance</span>
                        <p className="font-mono text-sm font-bold text-rose-700">
                          {formatPHP(app.outstanding_balance)}
                        </p>
                      </div>

                      {canPay && app.outstanding_balance && app.outstanding_balance > 0 ? (
                        <button
                          onClick={() => {
                            setSelectedApp(app);
                            setPayAmount(String(app.installment_amount));
                            setShowPayModal(true);
                          }}
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          Record Payment
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* SCHEDULES ACCORDION */}
                  <div className="p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Payment Schedule &amp; Allocations
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border border-slate-200 rounded-lg">
                        <thead className="bg-slate-100 text-slate-700 font-semibold">
                          <tr>
                            <th className="py-2 px-3">Inst #</th>
                            <th className="py-2 px-3">Due Date</th>
                            <th className="py-2 px-3 text-right">Scheduled</th>
                            <th className="py-2 px-3 text-right">Paid</th>
                            <th className="py-2 px-3 text-right">Remaining</th>
                            <th className="py-2 px-3">Paid Date</th>
                            <th className="py-2 px-3 text-center">Status</th>
                            {canPay && <th className="py-2 px-3 text-center">Action</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(app.schedules || []).map((s) => (
                            <tr key={s.id} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-bold">#{s.installment_number}</td>
                              <td className="py-2 px-3 font-mono">{s.due_date}</td>
                              <td className="py-2 px-3 text-right font-mono">{formatPHP(s.scheduled_amount)}</td>
                              <td className="py-2 px-3 text-right font-mono text-emerald-700">{formatPHP(s.amount_paid)}</td>
                              <td className="py-2 px-3 text-right font-mono text-rose-700 font-semibold">{formatPHP(s.remaining_amount)}</td>
                              <td className="py-2 px-3 text-slate-500">{s.payment_date || "-"}</td>
                              <td className="py-2 px-3 text-center">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                    s.status === "paid"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : s.status === "overdue"
                                      ? "bg-rose-100 text-rose-800 font-extrabold"
                                      : s.status === "due_today"
                                      ? "bg-amber-100 text-amber-800 font-bold"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {s.status.replace(/_/g, " ")}
                                </span>
                              </td>
                              {canPay && (
                                <td className="py-2 px-3 text-center">
                                  {s.status !== "paid" && (
                                    <button
                                      onClick={() => {
                                        setSelectedApp(app);
                                        setTargetScheduleId(s.id);
                                        setPayAmount(String(s.remaining_amount));
                                        setShowPayModal(true);
                                      }}
                                      className="text-[11px] text-emerald-700 font-bold hover:underline"
                                    >
                                      Pay Inst #{s.installment_number}
                                    </button>
                                  )}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}

              {clientFile.applications.length === 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
                  <CreditCard size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-semibold">No installment applications registered.</p>
                  <p className="text-xs mt-1">Create an installment agreement using the &ldquo;New Contract&rdquo; button.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PAYMENTS */}
          {activeTab === "payments" && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 font-serif">
                Unified Payment History &amp; Receipts
              </h3>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Date &amp; Time</th>
                      <th className="py-3 px-4">Payment Ref</th>
                      <th className="py-3 px-4">Txn / App Ref</th>
                      <th className="py-3 px-4">Source</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4 text-right">Amount Paid</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {clientFile.payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-600">
                          {new Date(p.payment_date).toLocaleString("en-PH")}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {p.payment_reference}
                          {p.receipt_number && (
                            <span className="block text-[10px] text-slate-400">OR# {p.receipt_number}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {p.application_reference || p.transaction_reference || "-"}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {p.source.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 uppercase font-medium">{p.payment_method}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {formatPHP(p.amount_paid)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                              p.status === "completed"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {p.source === "installment" && p.status === "completed" && (
                            <button
                              onClick={() => handleReversePay(p.id.replace("inst_", ""))}
                              className="text-[11px] text-rose-600 hover:text-rose-800 flex items-center justify-center gap-1 mx-auto font-medium"
                              title="Reverse payment with audit log"
                            >
                              <RotateCcw size={12} /> Reverse
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {clientFile.payments.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                          No payment transactions recorded for this client.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: APPOINTMENTS */}
          {activeTab === "appointments" && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 font-serif">
                Appointments &amp; Treatments Rendered
              </h3>
              <div className="grid gap-3">
                {clientFile.appointments.map((a) => (
                  <div key={a.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex justify-between items-center text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{a.treatment_name}</span>
                        <span className="font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {a.reference_number}
                        </span>
                      </div>
                      <p className="text-slate-500 mt-1">
                        {a.appointment_date} at {a.appointment_time} • {a.branch_name}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Fee</span>
                        <p className="font-mono font-bold text-slate-900">{formatPHP(a.amount_due)}</p>
                      </div>
                      <span className="px-2 py-1 bg-slate-100 rounded text-[11px] font-bold uppercase text-slate-700">
                        {a.status}
                      </span>
                    </div>
                  </div>
                ))}
                {clientFile.appointments.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
                    No clinic appointments recorded for this client.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: PACKAGES */}
          {activeTab === "packages" && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 font-serif">
                Packages &amp; Treatment Memberships
              </h3>
              <div className="grid gap-3">
                {clientFile.packages.map((pkg) => (
                  <div key={pkg.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-slate-900 text-sm">{pkg.package_name}</span>
                      <p className="text-slate-500 mt-1">
                        Sessions: {pkg.sessions_remaining} remaining of {pkg.total_sessions} • {pkg.branch_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Paid</span>
                      <p className="font-mono font-bold text-emerald-700">{formatPHP(pkg.price_paid)}</p>
                    </div>
                  </div>
                ))}
                {clientFile.packages.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
                    No prepaid packages on record.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: TIMELINE */}
          {activeTab === "timeline" && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 font-serif">
                Complete Chronological Audit Timeline
              </h3>
              <div className="relative pl-6 space-y-4 border-l-2 border-slate-200 ml-2">
                {clientFile.timeline.map((t) => (
                  <div key={t.id} className="relative group">
                    <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-rose-700 border-2 border-white ring-2 ring-slate-200" />
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs text-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-slate-900">{t.title}</span>
                          {t.reference_number && (
                            <span className="ml-2 font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              {t.reference_number}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">{t.date_formatted}</span>
                      </div>
                      <p className="text-slate-600 mt-1">{t.description}</p>
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-50 text-[11px] text-slate-500">
                        <span>{t.branch_name} • By {t.actor_name || "System"}</span>
                        {t.amount !== null && t.amount !== undefined && (
                          <span className="font-mono font-bold text-slate-900">{formatPHP(t.amount)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>Authorized client file for {client.full_name} &bull; Confidential Clinic Record</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors"
          >
            Close Viewer
          </button>
        </div>
      </div>

      {/* SUB-MODAL 1: NEW INSTALLMENT APPLICATION */}
      {showNewAppModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 border border-slate-200">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
              <h3 className="font-serif font-bold text-slate-900 text-base">New Installment Agreement</h3>
              <button onClick={() => setShowNewAppModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateApp} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Service / Treatment Package</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diode Laser Hair Removal - 6 Sessions"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Total Contract (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="15000.00"
                    value={contractAmount}
                    onChange={(e) => setContractAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Down Payment (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="3000.00"
                    value={downPayment}
                    onChange={(e) => setDownPayment(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="bi_weekly">Bi-Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1"># Installments</label>
                  <input
                    type="number"
                    min="1"
                    max="36"
                    value={installmentsCount}
                    onChange={(e) => setInstallmentsCount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Agreement Notes</label>
                <textarea
                  rows={2}
                  placeholder="Terms, promos, special notes..."
                  value={appNotes}
                  onChange={(e) => setAppNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewAppModal(false)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-rose-700 hover:bg-rose-600 text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5"
                >
                  {isSubmitting && <RefreshCw size={12} className="animate-spin" />}
                  Register Contract
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL 2: RECORD PAYMENT */}
      {showPayModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 border border-slate-200">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
              <div>
                <h3 className="font-serif font-bold text-slate-900 text-base">Record Installment Payment</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Contract: {selectedApp?.application_number}
                </p>
              </div>
              <button onClick={() => setShowPayModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleRecordPay} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Amount to Pay (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium"
                >
                  <option value="cash">Cash (Register Drawer)</option>
                  <option value="gcash">GCash</option>
                  <option value="maya">Maya</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="debit_card">Debit Card</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Official Receipt #</label>
                  <input
                    type="text"
                    placeholder="OR-00912"
                    value={payReceipt}
                    onChange={(e) => setPayReceipt(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Txn / Approval Ref</label>
                  <input
                    type="text"
                    placeholder="GCASH-Ref..."
                    value={payTxnRef}
                    onChange={(e) => setPayTxnRef(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Payment Notes</label>
                <textarea
                  rows={2}
                  placeholder="Notes, branch shift references..."
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5"
                >
                  {isSubmitting && <RefreshCw size={12} className="animate-spin" />}
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
