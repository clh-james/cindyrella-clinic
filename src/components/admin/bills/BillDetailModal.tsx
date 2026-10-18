// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Bill Detail Modal — Payments, Approvals, Reminder History & Full Audit Trail
// ==============================================================================

"use client";

import { useState } from "react";
import {
  X,
  Receipt,
  RotateCcw,
  Paperclip,
  ExternalLink,
  Bell,
  ScrollText,
  CreditCard,
  Ban,
  Check,
  Send,
} from "lucide-react";
import type { BillItem } from "@/app/admin/(dashboard)/bills/types";
import {
  approveBill,
  cancelBill,
  reverseBillPayment,
  triggerReminderRun,
} from "@/app/admin/(dashboard)/bills/actions";
import { formatPHP } from "@/lib/bills/bill-calculator";
import toast from "react-hot-toast";

interface BillDetailModalProps {
  bill: BillItem;
  isOpen: boolean;
  onClose: () => void;
  canApprove: boolean;
  canPay: boolean;
  onRecordPayment: (bill: BillItem) => void;
  onEditBill?: (bill: BillItem) => void;
  onRefresh?: () => void;
}

export function BillDetailModal({
  bill,
  isOpen,
  onClose,
  canApprove,
  canPay,
  onRecordPayment,
  onRefresh,
}: BillDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "payments" | "reminders" | "audit">("overview");
  const [reversalPaymentId, setReversalPaymentId] = useState<string | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [isReversing, setIsReversing] = useState(false);

  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);

  if (!isOpen) return null;

  const payments = bill.payments || [];
  const reminderLogs = bill.reminder_logs || [];
  const auditLogs = bill.audit_logs || [];
  const balance = Math.max(0, Number(bill.outstanding_balance || 0));

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const res = await approveBill(bill.id);
      if (res.success) {
        toast.success("Bill approved successfully!");
        if (onRefresh) onRefresh();
      } else {
        toast.error(res.error || "Failed to approve bill");
      }
    } finally {
      setIsApproving(false);
    }
  };

  const handleCancelBill = async () => {
    if (!cancelReason.trim()) {
      toast.error("Please enter a cancellation reason");
      return;
    }
    try {
      const res = await cancelBill(bill.id, cancelReason);
      if (res.success) {
        toast.success("Bill cancelled. Automated reminders stopped.");
        setIsCancelling(false);
        if (onRefresh) onRefresh();
      } else {
        toast.error(res.error || "Failed to cancel bill");
      }
    } catch {
      toast.error("Error cancelling bill");
    }
  };

  const handleReversePayment = async (paymentId: string) => {
    if (!reversalReason.trim()) {
      toast.error("Please provide a reason for reversal");
      return;
    }
    setIsReversing(true);
    try {
      const res = await reverseBillPayment(paymentId, reversalReason);
      if (res.success) {
        toast.success("Payment reversed. Balance updated.");
        setReversalPaymentId(null);
        setReversalReason("");
        if (onRefresh) onRefresh();
      } else {
        toast.error(res.error || "Failed to reverse payment");
      }
    } finally {
      setIsReversing(false);
    }
  };

  const handleDispatchReminderNow = async () => {
    setIsSendingReminder(true);
    try {
      const res = await triggerReminderRun();
      if (res.success) {
        toast.success("Reminder automation processed for eligible bills!");
        if (onRefresh) onRefresh();
      } else {
        toast.error("Reminder processing failed");
      }
    } finally {
      setIsSendingReminder(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200/60 text-rose-600">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-700">{bill.bill_number}</span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                    bill.status === "paid"
                      ? "bg-emerald-100 text-emerald-800"
                      : bill.status === "overdue"
                      ? "bg-red-100 text-red-800"
                      : bill.status === "due_today"
                      ? "bg-amber-100 text-amber-800"
                      : bill.status === "partially_paid"
                      ? "bg-blue-100 text-blue-800"
                      : bill.status === "cancelled"
                      ? "bg-slate-200 text-slate-700"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {bill.status.replace("_", " ")}
                </span>
                {bill.is_recurring && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-700">
                    Recurring
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 font-serif line-clamp-1 mt-0.5">
                {bill.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canPay && bill.status !== "paid" && bill.status !== "cancelled" && (
              <button
                onClick={() => {
                  onClose();
                  onRecordPayment(bill);
                }}
                className="h-9 px-3.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <CreditCard className="w-3.5 h-3.5" />
                Record Payment
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-5 border-b border-slate-200 bg-slate-50/50 overflow-x-auto scrollbar-none">
          {[
            { id: "overview", label: "Bill Overview", icon: Receipt },
            { id: "payments", label: "Payment History", icon: CreditCard, count: payments.length },
            { id: "reminders", label: "Reminder Delivery Logs", icon: Bell, count: reminderLogs.length },
            { id: "audit", label: "Audit Trail", icon: ScrollText, count: auditLogs.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`h-10 px-3.5 text-xs font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
                  active
                    ? "border-rose-600 text-rose-600 bg-rose-50/40"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === "overview" && (
            <>
              {/* Financial Highlight Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Bill Amount</span>
                  <div className="mt-1 font-mono font-bold text-lg text-slate-900">
                    {formatPHP(bill.total_amount)}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Amount before tax: {formatPHP(bill.amount_before_tax)} | Tax: {formatPHP(bill.tax_amount)}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50">
                  <span className="text-[11px] font-semibold text-emerald-700 uppercase">Amount Paid</span>
                  <div className="mt-1 font-mono font-bold text-lg text-emerald-700">
                    {formatPHP(bill.amount_paid)}
                  </div>
                  <span className="text-[10px] text-emerald-600">
                    {payments.filter((p) => !p.is_reversed).length} valid payments recorded
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50">
                  <span className="text-[11px] font-semibold text-rose-700 uppercase">Outstanding Balance</span>
                  <div className="mt-1 font-mono font-bold text-lg text-rose-700">
                    {formatPHP(balance)}
                  </div>
                  <span className="text-[10px] text-rose-600">
                    Due date: <strong>{bill.due_date}</strong>
                  </span>
                </div>
              </div>

              {/* Detailed Specs Grid */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block uppercase font-semibold text-[10px]">Vendor / Provider</span>
                  <span className="text-slate-900 font-bold text-sm">{bill.vendor_or_payee}</span>
                </div>

                <div>
                  <span className="text-slate-400 block uppercase font-semibold text-[10px]">Clinic Branch</span>
                  <span className="text-slate-900 font-semibold">{bill.branch_name || "Main Clinic"}</span>
                </div>

                <div>
                  <span className="text-slate-400 block uppercase font-semibold text-[10px]">Invoice / Reference #</span>
                  <span className="text-slate-900 font-mono">{bill.invoice_number || "—"}</span>
                </div>

                <div>
                  <span className="text-slate-400 block uppercase font-semibold text-[10px]">Billing Period</span>
                  <span className="text-slate-900">{bill.billing_period || "—"}</span>
                </div>

                <div>
                  <span className="text-slate-400 block uppercase font-semibold text-[10px]">Issue Date</span>
                  <span className="text-slate-900">{bill.issue_date}</span>
                </div>

                <div>
                  <span className="text-slate-400 block uppercase font-semibold text-[10px]">Due Date</span>
                  <span className="text-rose-700 font-bold">{bill.due_date}</span>
                </div>

                <div>
                  <span className="text-slate-400 block uppercase font-semibold text-[10px]">Default Payment Method</span>
                  <span className="text-slate-900 capitalize">{bill.payment_method.replace("_", " ")}</span>
                </div>

                <div>
                  <span className="text-slate-400 block uppercase font-semibold text-[10px]">Responsible Employee</span>
                  <span className="text-slate-900">{bill.responsible_employee_name || "Branch Manager"}</span>
                </div>

                {bill.expense_id && (
                  <div className="sm:col-span-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Linked Clinic Operating Expense:</span>
                    <span className="font-mono font-bold text-slate-800">EXP-{bill.bill_number.replace("BILL-", "B-")}</span>
                  </div>
                )}
              </div>

              {/* Receipt Attachment URL */}
              {bill.receipt_url && (
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-slate-500" />
                    <span className="font-semibold text-slate-800">Invoice / Receipt Attachment</span>
                  </div>
                  <a
                    href={bill.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1"
                  >
                    View Document <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* Notes */}
              {bill.notes && (
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white text-xs">
                  <span className="text-slate-400 block uppercase font-semibold text-[10px] mb-1">
                    Internal Accounting Notes
                  </span>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-line">{bill.notes}</p>
                </div>
              )}

              {/* Approval & Cancellation Actions */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    Approval Status: <strong>{bill.approval_status.toUpperCase()}</strong>
                  </span>
                  {bill.approved_by_name && (
                    <span className="text-[11px] text-slate-400">
                      (by {bill.approved_by_name} on {bill.approved_at?.slice(0, 10)})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {canApprove && bill.approval_status !== "approved" && (
                    <button
                      onClick={handleApprove}
                      disabled={isApproving}
                      className="h-8 px-3 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve Bill
                    </button>
                  )}

                  {bill.status !== "cancelled" && (
                    <button
                      onClick={() => setIsCancelling(!isCancelling)}
                      className="h-8 px-3 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      Cancel Bill
                    </button>
                  )}
                </div>
              </div>

              {/* Cancellation Reason Prompt */}
              {isCancelling && (
                <div className="p-4 rounded-xl border border-red-200 bg-red-50/50 space-y-3">
                  <span className="text-xs font-bold text-red-800 block">
                    Confirm Bill Cancellation
                  </span>
                  <p className="text-xs text-red-600">
                    Cancelling stops all automated reminders while preserving payment and audit history.
                  </p>
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Enter reason for cancellation (e.g., duplicated entry, provider refunded)"
                    className="w-full h-9 px-3 text-xs rounded-lg border border-red-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setIsCancelling(false)}
                      className="h-8 px-3 text-xs rounded-lg border border-slate-200 bg-white text-slate-700"
                    >
                      Abort
                    </button>
                    <button
                      onClick={handleCancelBill}
                      className="h-8 px-3 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700"
                    >
                      Confirm Cancellation
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "payments" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                    Recorded Payments & Cashier Disbursements
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Total Valid Payments: <strong>{formatPHP(bill.amount_paid)}</strong>
                  </p>
                </div>

                {canPay && balance > 0 && bill.status !== "cancelled" && (
                  <button
                    onClick={() => {
                      onClose();
                      onRecordPayment(bill);
                    }}
                    className="h-8 px-3 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    + New Payment
                  </button>
                )}
              </div>

              {payments.length === 0 ? (
                <div className="p-8 text-center text-slate-400 border border-dashed rounded-xl">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-semibold text-slate-600">No payments recorded yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Click &quot;Record Payment&quot; to disburse funds.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className={`p-3.5 rounded-xl border text-xs transition-colors ${
                        p.is_reversed
                          ? "bg-slate-50 border-slate-200 opacity-60"
                          : "bg-white border-slate-200/90 shadow-sm"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-800">{p.payment_number}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                            {p.payment_method.replace("_", " ")}
                          </span>
                          {p.is_reversed && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
                              REVERSED
                            </span>
                          )}
                        </div>
                        <span className="font-mono font-extrabold text-sm text-emerald-700">
                          {formatPHP(p.amount)}
                        </span>
                      </div>

                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600">
                        <div>Date: <strong>{p.payment_date}</strong></div>
                        <div>Account: <strong>{p.payment_account || "—"}</strong></div>
                        <div>Ref #: <strong>{p.reference_number || "—"}</strong></div>
                        <div>Recorded By: <strong>{p.paid_by_name || "Staff"}</strong></div>
                      </div>

                      {p.notes && (
                        <p className="mt-2 text-[11px] text-slate-500 italic">Notes: {p.notes}</p>
                      )}

                      {/* Reversal Detail or Button */}
                      {p.is_reversed ? (
                        <div className="mt-2 p-2 rounded bg-red-50 text-[11px] text-red-700">
                          Reversed on {p.reversed_at?.slice(0, 10)}. Reason: {p.reversal_reason || "None specified"}
                        </div>
                      ) : (
                        canApprove && (
                          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-end">
                            {reversalPaymentId === p.id ? (
                              <div className="w-full space-y-2 pt-1">
                                <input
                                  type="text"
                                  value={reversalReason}
                                  onChange={(e) => setReversalReason(e.target.value)}
                                  placeholder="Enter reason for reversing this payment"
                                  className="w-full h-8 px-2.5 text-xs rounded border border-red-200 focus:outline-none focus:ring-1 focus:ring-red-400"
                                />
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => setReversalPaymentId(null)}
                                    className="px-2.5 py-1 text-xs rounded border border-slate-200 text-slate-600"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleReversePayment(p.id)}
                                    disabled={isReversing}
                                    className="px-3 py-1 text-xs font-bold rounded bg-red-600 text-white hover:bg-red-700"
                                  >
                                    Confirm Reversal
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setReversalPaymentId(p.id);
                                  setReversalReason("");
                                }}
                                className="text-[11px] font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
                              >
                                <RotateCcw className="w-3 h-3" />
                                Reverse Payment
                              </button>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "reminders" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                    Automated Reminder History & Delivery Logs
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Idempotent multi-channel delivery audit logs.
                  </p>
                </div>

                {balance > 0 && bill.status !== "cancelled" && (
                  <button
                    onClick={handleDispatchReminderNow}
                    disabled={isSendingReminder}
                    className="h-8 px-3 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5 text-rose-600" />
                    Run Reminder Now
                  </button>
                )}
              </div>

              {reminderLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 border border-dashed rounded-xl">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-semibold text-slate-600">No reminder logs recorded yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Reminders are scheduled for: 7 days, 3 days, 1 day, due date, and overdue.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  {reminderLogs.map((log) => (
                    <div key={log.id} className="p-3.5 flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 capitalize">
                            [{log.reminder_stage.replace("_", " ").toUpperCase()}]
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              log.delivery_status === "sent"
                                ? "bg-emerald-100 text-emerald-800"
                                : log.delivery_status === "skipped"
                                ? "bg-slate-100 text-slate-600"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {log.delivery_status}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500 uppercase">
                            via {log.channel.toUpperCase()}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-600">
                          Recipient: <strong>{log.recipient_name || "Responsible Officer"}</strong>{" "}
                          {log.recipient_email && `(${log.recipient_email})`}
                        </div>

                        <div className="text-[10px] text-slate-400">
                          Balance at send: <strong>{formatPHP(log.outstanding_balance_at_send)}</strong> | Key:{" "}
                          <span className="font-mono">{log.idempotency_key}</span>
                        </div>

                        {log.delivery_error && (
                          <div className="text-[10px] text-red-600 mt-1">
                            Error: {log.delivery_error}
                          </div>
                        )}
                      </div>

                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "audit" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  Bill Audit Log & Event History
                </h3>
                <p className="text-[11px] text-slate-500">
                  Immutable record of creation, updates, payments, approvals, and cancellations.
                </p>
              </div>

              {auditLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 border border-dashed rounded-xl">
                  <ScrollText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-semibold text-slate-600">No audit logs recorded</p>
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-200 ml-3 pl-4 space-y-4 text-xs">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="relative">
                      <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-rose-500 border-2 border-white ring-2 ring-rose-100" />
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900">{log.action}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(log.created_at).toLocaleDateString("en-PH", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">{log.notes || "Action performed"}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">
            ID: {bill.id}
          </span>
          <button
            onClick={onClose}
            className="h-9 px-4 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
