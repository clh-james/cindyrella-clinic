"use client";

import { useState } from "react";
import {
  X,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Trash2,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { ExpenseItem } from "@/app/admin/(dashboard)/expenses/types";
import { approveExpense, rejectExpense, deleteExpense } from "@/app/admin/(dashboard)/expenses/actions";
import { formatPHP } from "@/lib/payroll/philippine-tax";
import toast from "react-hot-toast";

interface ExpenseDetailModalProps {
  expense: ExpenseItem;
  canApprove: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export function ExpenseDetailModal({
  expense,
  canApprove,
  onClose,
  onUpdated,
}: ExpenseDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const handleApprove = async () => {
    setLoading(true);
    try {
      const res = await approveExpense(expense.id);
      if (res.success) {
        toast.success("Expense approved for clinic ledger!");
        onUpdated();
        onClose();
      } else {
        toast.error(res.error || "Approval failed");
      }
    } catch {
      toast.error("Failed to approve expense");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      toast.error("Please enter a reason for rejecting this disbursement");
      return;
    }
    setLoading(true);
    try {
      const res = await rejectExpense(expense.id, rejectionReason);
      if (res.success) {
        toast.success("Expense rejected");
        onUpdated();
        onClose();
      } else {
        toast.error(res.error || "Failed to reject expense");
      }
    } catch {
      toast.error("Failed to reject expense");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to permanently delete this expense record?")) return;
    setLoading(true);
    try {
      const res = await deleteExpense(expense.id);
      if (res.success) {
        toast.success("Expense deleted");
        onUpdated();
        onClose();
      } else {
        toast.error(res.error || "Failed to delete expense");
      }
    } catch {
      toast.error("Failed to delete expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-royal">
                {expense.expense_number}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  expense.status === "approved"
                    ? "bg-emerald-100 text-emerald-800"
                    : expense.status === "rejected"
                    ? "bg-red-100 text-red-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {expense.status}
              </span>
              {expense.is_petty_cash && (
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  Petty Cash
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold font-serif text-ink mt-1">{expense.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-line p-2 text-ink-soft hover:bg-pale transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Amount Display */}
        <div className="rounded-2xl bg-pale/40 border border-line p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft block">
              Disbursed Amount
            </span>
            <span className="text-2xl font-bold font-mono text-ink">
              {formatPHP(expense.amount)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft block">
              Payment Method
            </span>
            <span className="text-xs font-bold text-ink capitalize">
              {expense.payment_method.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-ink-soft block text-[11px]">Vendor / Payee:</span>
            <span className="font-semibold text-ink block">{expense.vendor_or_payee}</span>
          </div>

          <div className="space-y-1">
            <span className="text-ink-soft block text-[11px]">Category:</span>
            <span
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-semibold text-white text-[11px]"
              style={{ backgroundColor: expense.category?.color || "#4F46E5" }}
            >
              {expense.category?.name || "General"}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-ink-soft block text-[11px]">Branch:</span>
            <span className="font-medium text-ink">{expense.branch?.name || "Main Branch"}</span>
          </div>

          <div className="space-y-1">
            <span className="text-ink-soft block text-[11px]">Expense Date:</span>
            <span className="font-medium text-ink">{expense.expense_date}</span>
          </div>

          <div className="space-y-1">
            <span className="text-ink-soft block text-[11px]">Official Receipt / Ref:</span>
            <span className="font-mono text-ink">{expense.reference_number || "None"}</span>
          </div>

          <div className="space-y-1">
            <span className="text-ink-soft block text-[11px]">Recorded By:</span>
            <span className="font-medium text-ink">{expense.creator?.full_name || "Staff"}</span>
          </div>
        </div>

        {/* Description */}
        {expense.description && (
          <div className="rounded-xl border border-line bg-white p-3 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft block mb-1">
              Itemization & Notes
            </span>
            <p className="text-ink leading-relaxed">{expense.description}</p>
          </div>
        )}

        {/* Rejection notice */}
        {expense.status === "rejected" && expense.rejection_reason && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertCircle size={14} /> Rejection Reason
            </div>
            <p>{expense.rejection_reason}</p>
          </div>
        )}

        {/* Approval info */}
        {expense.status === "approved" && expense.approved_at && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-semibold">
              <ShieldCheck size={16} className="text-emerald-600" />
              <span>Approved by {expense.approver?.full_name || "Manager"}</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-700">
              {new Date(expense.approved_at).toLocaleDateString()}
            </span>
          </div>
        )}

        {/* Receipt Attachment View */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft block mb-2">
            Official Receipt Attachment
          </span>
          {expense.receipt_url ? (
            <div className="rounded-2xl border border-line p-3 bg-pale/20 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-ink">Attached Document</span>
                <a
                  href={expense.receipt_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-royal font-semibold hover:underline"
                >
                  Open in New Tab <ExternalLink size={12} />
                </a>
              </div>
              <div className="overflow-hidden rounded-xl border border-line bg-white max-h-56 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={expense.receipt_url}
                  alt="Receipt Scan"
                  className="max-h-56 w-auto object-contain"
                  onError={(e) => {
                    // Fallback if PDF or not direct image
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-line p-4 text-center text-xs text-ink-soft">
              No receipt document uploaded for this expense.
            </div>
          )}
        </div>

        {/* Reject Dialog Form */}
        {isRejectOpen ? (
          <form onSubmit={handleReject} className="rounded-2xl border border-red-200 bg-red-50/50 p-4 space-y-3 text-xs">
            <h4 className="font-bold text-red-900">Return / Reject Expense</h4>
            <p className="text-[11px] text-red-800">
              State the reason for rejecting this disbursement (e.g. invalid receipt, missing OR, unapproved purchase).
            </p>
            <input
              type="text"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Documented rejection reason..."
              required
              className="w-full rounded-xl border border-line bg-white p-2.5 text-xs text-ink"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsRejectOpen(false)}
                className="rounded-xl border border-line bg-white px-3 py-1.5 font-medium text-ink-soft"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-red-600 px-4 py-1.5 font-bold text-white hover:bg-red-700 shadow-sm"
              >
                Confirm Rejection
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between border-t border-line pt-4">
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
            >
              <Trash2 size={14} /> Delete
            </button>

            <div className="flex items-center gap-2">
              {expense.status === "pending" && canApprove && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsRejectOpen(true)}
                    disabled={loading}
                    className="flex items-center gap-1.5 rounded-xl border border-line px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={loading}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                  >
                    <CheckCircle2 size={14} /> Approve Expense
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-line bg-pale/40 px-4 py-2 text-xs font-semibold text-ink hover:bg-pale transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
