"use client";

import { useState } from "react";
import {
  X,
  Calendar,
  Building2,
  DollarSign,
  User,
  CheckCircle,
  XCircle,
  FileText,
  Clock,
  ExternalLink,
  Loader2,
  Trash2,
  AlertTriangle,
  Receipt,
  PlusCircle,
  RotateCcw,
} from "lucide-react";
import { ExpenseItem, ExpensePaymentMethod } from "@/app/admin/(dashboard)/expenses/types";
import {
  approveExpense,
  rejectExpense,
  deleteExpense,
  recordPayment,
  reversePayment,
} from "@/app/admin/(dashboard)/expenses/actions";
import toast from "react-hot-toast";

interface ExpenseDetailModalProps {
  expense: ExpenseItem;
  canApprove: boolean;
  currentStaffId?: string;
  isSuperAdmin?: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function ExpenseDetailModal({
  expense,
  canApprove,
  currentStaffId,
  isSuperAdmin = false,
  onClose,
  onRefresh,
}: ExpenseDetailModalProps) {
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);

  // Partial Payment State
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<ExpensePaymentMethod>("cash");
  const [payAccount, setPayAccount] = useState("");
  const [payRef, setPayRef] = useState("");
  const [payNotes, setPayNotes] = useState("");

  // Reversal State
  const [reversingPaymentId, setReversingPaymentId] = useState<string | null>(null);
  const [reversalReason, setReversalReason] = useState("");

  const formatPHP = (val?: number | null) =>
    `₱${(val || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const isRequester =
    currentStaffId &&
    (expense.requested_by === currentStaffId || expense.employee_id === currentStaffId);
  const canPerformApproval = canApprove && (isSuperAdmin || !isRequester);

  // Outstanding Balance
  const totalPayable = expense.approved_amount || expense.total_amount;
  const totalPaid = (expense.payments || [])
    .filter((p) => !p.is_reversed)
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const outstandingBalance = Math.max(0, Math.round((totalPayable - totalPaid) * 100) / 100);

  const handleApprove = async () => {
    setLoadingAction(true);
    try {
      const res = await approveExpense(expense.id, expense.total_amount);
      if (res.success) {
        toast.success("Expense successfully approved!");
        onRefresh();
        onClose();
      } else {
        toast.error(res.error || "Approval failed");
      }
    } catch {
      toast.error("Failed to approve expense");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    setLoadingAction(true);
    try {
      const res = await rejectExpense(expense.id, rejectReason.trim());
      if (res.success) {
        toast.success("Expense rejected");
        onRefresh();
        onClose();
      } else {
        toast.error(res.error || "Rejection failed");
      }
    } catch {
      toast.error("Failed to reject");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this expense record?")) return;
    setLoadingAction(true);
    try {
      const res = await deleteExpense(expense.id);
      if (res.success) {
        toast.success("Expense deleted");
        onRefresh();
        onClose();
      } else {
        toast.error(res.error || "Failed to delete");
      }
    } catch {
      toast.error("Failed to delete");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(payAmount);
    if (!amountNum || amountNum <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }
    if (amountNum > outstandingBalance + 0.01) {
      toast.error(`Cannot exceed remaining balance of ${formatPHP(outstandingBalance)}`);
      return;
    }

    setLoadingAction(true);
    try {
      const res = await recordPayment({
        expenseId: expense.id,
        amount: amountNum,
        paymentMethod: payMethod,
        paymentAccount: payAccount,
        referenceNumber: payRef,
        notes: payNotes,
      });

      if (res.success) {
        toast.success("Payment recorded successfully!");
        setShowPaymentForm(false);
        setPayAmount("");
        onRefresh();
      } else {
        toast.error(res.error || "Payment recording failed");
      }
    } catch {
      toast.error("Failed to record payment");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleReversePayment = async (paymentId: string) => {
    if (!reversalReason.trim()) {
      toast.error("Please provide a reason for payment reversal");
      return;
    }
    setLoadingAction(true);
    try {
      const res = await reversePayment(paymentId, reversalReason.trim());
      if (res.success) {
        toast.success("Payment successfully reversed");
        setReversingPaymentId(null);
        setReversalReason("");
        onRefresh();
      } else {
        toast.error(res.error || "Reversal failed");
      }
    } catch {
      toast.error("Failed to reverse payment");
    } finally {
      setLoadingAction(false);
    }
  };

  const getStatusBadge = () => {
    switch (expense.approval_status) {
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      case "payment_pending":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3.5 h-3.5" /> Payment Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" /> Pending Review
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 font-mono">
                  {expense.expense_number}
                </h2>
                {getStatusBadge()}
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                  {expense.payment_status.replace("_", " ")}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Recorded on {expense.expense_date} {expense.branch_name ? `• ${expense.branch_name}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* SECTION 1: EXPENSE DETAILS */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">Expense Details</h3>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{expense.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{expense.description || "No detailed description provided."}</p>
                </div>
                {expense.category && (
                  <span
                    className="px-2.5 py-1 rounded-md text-xs font-semibold text-white shadow-xs"
                    style={{ backgroundColor: expense.category.color }}
                  >
                    {expense.category.name}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs border-t border-slate-200/60">
                <div>
                  <span className="text-slate-400 block mb-0.5">Payee / Vendor</span>
                  <span className="font-semibold text-slate-800">{expense.vendor_or_payee}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">OR / Invoice #</span>
                  <span className="font-semibold text-slate-800">
                    {expense.reference_number || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Branch</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    {expense.branch_name || "Main Clinic"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Expense Date</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {expense.expense_date}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: FINANCIAL DETAILS */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">Financial Details</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-400 block mb-1">Amount Before Tax</span>
                <span className="text-sm font-semibold text-slate-800 font-mono">
                  {formatPHP(expense.amount_before_tax)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-400 block mb-1">Tax / VAT Amount</span>
                <span className="text-sm font-semibold text-slate-800 font-mono">
                  {formatPHP(expense.tax_amount)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-400 block mb-1">Total Amount</span>
                <span className="text-base font-bold text-slate-900 font-mono">
                  {formatPHP(expense.total_amount)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-400 block mb-1">Approved Amount</span>
                <span className="text-sm font-semibold text-blue-700 font-mono">
                  {formatPHP(expense.approved_amount || expense.total_amount)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[11px] text-emerald-700 block mb-1 font-semibold">Total Paid</span>
                <span className="text-sm font-bold text-emerald-800 font-mono">
                  {formatPHP(totalPaid)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
                <span className="text-[11px] text-rose-700 block mb-1 font-semibold">Outstanding Balance</span>
                <span className="text-sm font-bold text-rose-800 font-mono">
                  {formatPHP(outstandingBalance)}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 3: APPROVAL HISTORY & WORKFLOW */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">Approval History</h3>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Requested By</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    {expense.requested_by_name || "Staff Member"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Approved By</span>
                  <span className="font-semibold text-slate-800">
                    {expense.approved_by_name || (expense.approval_status === "approved" ? "System / Admin" : "—")}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Approval Date</span>
                  <span className="font-semibold text-slate-800">
                    {expense.approved_at ? new Date(expense.approved_at).toLocaleDateString() : "—"}
                  </span>
                </div>
              </div>

              {expense.rejection_reason && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                  <span className="font-bold">Rejection Reason:</span> {expense.rejection_reason}
                </div>
              )}

              {/* Action Buttons for Pending Approval */}
              {expense.approval_status === "pending" && (
                <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  {canPerformApproval ? (
                    rejecting ? (
                      <div className="w-full space-y-2">
                        <input
                          type="text"
                          required
                          placeholder="Provide detailed rejection reason..."
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-rose-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={loadingAction}
                            onClick={handleReject}
                            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 flex items-center gap-1.5"
                          >
                            {loadingAction && <Loader2 className="w-3 h-3 animate-spin" />}
                            Confirm Rejection
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejecting(false)}
                            className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          disabled={loadingAction}
                          onClick={handleApprove}
                          className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 transition-colors"
                        >
                          {loadingAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          <CheckCircle className="w-4 h-4" /> Approve Expense
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejecting(true)}
                          className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 flex items-center gap-1.5 transition-colors"
                        >
                          <XCircle className="w-4 h-4" /> Reject with Reason
                        </button>
                      </div>
                    )
                  ) : (
                    <p className="text-xs text-slate-500 italic flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      {isRequester
                        ? "Separation of duties: You cannot approve your own expense request."
                        : "Manager or Admin approval required."}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 4: PAYMENT HISTORY & RECORDING */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Payment History</h3>
              {outstandingBalance > 0 && !showPaymentForm && (
                <button
                  type="button"
                  onClick={() => {
                    setPayAmount(outstandingBalance.toString());
                    setShowPaymentForm(true);
                  }}
                  className="px-3 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 flex items-center gap-1.5 transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> Record Payment
                </button>
              )}
            </div>

            {/* Record Payment Form */}
            {showPaymentForm && (
              <form
                onSubmit={handleRecordPayment}
                className="mb-4 p-4 rounded-xl border border-rose-200 bg-rose-50/40 space-y-3 animate-in fade-in duration-150"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-800">
                    Record Disbursement (Remaining Balance: {formatPHP(outstandingBalance)})
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPaymentForm(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Payment Amount (₱) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={outstandingBalance + 0.01}
                      required
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Payment Method *
                    </label>
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value as ExpensePaymentMethod)}
                      className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 bg-white text-slate-900"
                    >
                      <option value="cash">Cash (Direct)</option>
                      <option value="petty_cash">Petty Cash Float</option>
                      <option value="cashier_drawer">Cashier Shift Drawer</option>
                      <option value="gcash">GCash</option>
                      <option value="maya">Maya</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="credit_card">Company Card</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Account / Cash Source
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Petty Cash Box, BDO"
                      value={payAccount}
                      onChange={(e) => setPayAccount(e.target.value)}
                      className="w-full h-9 px-3 text-xs rounded-lg border border-slate-300 bg-white text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={loadingAction}
                    className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 shadow-sm flex items-center gap-1.5"
                  >
                    {loadingAction && <Loader2 className="w-3 h-3 animate-spin" />}
                    Confirm Payment
                  </button>
                </div>
              </form>
            )}

            {/* Payments Table */}
            {expense.payments && expense.payments.length > 0 ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs bg-white">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Payment #</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Method</th>
                      <th className="p-3">Account</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3 text-center">Status</th>
                      {isSuperAdmin && <th className="p-3 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expense.payments.map((p) => (
                      <tr key={p.id} className={p.is_reversed ? "opacity-50 line-through bg-slate-50/50" : ""}>
                        <td className="p-3 font-mono font-medium">{p.payment_number}</td>
                        <td className="p-3 text-slate-600">{p.payment_date}</td>
                        <td className="p-3 font-medium capitalize">{p.payment_method.replace("_", " ")}</td>
                        <td className="p-3 text-slate-500">{p.payment_account || "—"}</td>
                        <td className="p-3 text-right font-bold font-mono">{formatPHP(p.amount)}</td>
                        <td className="p-3 text-center">
                          {p.is_reversed ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-rose-100 text-rose-700">Reversed</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-700">Valid</span>
                          )}
                        </td>
                        {isSuperAdmin && (
                          <td className="p-3 text-right">
                            {!p.is_reversed && (
                              <button
                                type="button"
                                onClick={() => {
                                  const reason = prompt("Enter payment reversal reason:");
                                  if (reason) {
                                    setReversalReason(reason);
                                    handleReversePayment(p.id);
                                  }
                                }}
                                className="text-rose-600 hover:underline text-[11px]"
                              >
                                Reverse
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic p-3 rounded-lg border border-slate-200 text-center bg-slate-50">
                No payment transactions recorded yet.
              </p>
            )}
          </div>

          {/* SECTION 5: ATTACHMENTS */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">Receipts & Invoices</h3>
            {expense.receipt_url || (expense.attachments && expense.attachments.length > 0) ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {expense.receipt_url && (
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 truncate">
                      <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                      <span className="text-xs font-semibold text-slate-800 truncate">
                        Primary Receipt Voucher
                      </span>
                    </div>
                    <a
                      href={expense.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 flex items-center gap-1 shrink-0"
                    >
                      View <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                {expense.attachments?.map((att) => (
                  <div
                    key={att.id}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-xs font-semibold text-slate-800 truncate">
                        {att.file_name}
                      </span>
                    </div>
                    <a
                      href={att.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 flex items-center gap-1 shrink-0"
                    >
                      View <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic p-3 rounded-lg border border-slate-200 text-center bg-slate-50">
                No receipt attachments uploaded for this expense.
              </p>
            )}
          </div>

          {/* SECTION 6: AUDIT TIMELINE */}
          {expense.audit_logs && expense.audit_logs.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">Audit Timeline</h3>
              <div className="space-y-2 border-l-2 border-slate-200 ml-3 pl-4 text-xs">
                {expense.audit_logs.map((log) => (
                  <div key={log.id} className="relative">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white" />
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{log.action}</span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-500 mt-0.5">{log.notes || "Recorded in system"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div>
            {(expense.approval_status === "draft" || expense.approval_status === "rejected") &&
              expense.payment_status === "unpaid" && (
                <button
                  type="button"
                  disabled={loadingAction}
                  onClick={handleDelete}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Record
                </button>
              )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
