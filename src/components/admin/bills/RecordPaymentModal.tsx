// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Record Payment Modal (Full, Partial & Multiple Installment Payments)
// ==============================================================================

"use client";

import { useState } from "react";
import {
  X,
  CreditCard,
  CheckCircle2,
  RefreshCw,
  Coins,
} from "lucide-react";
import {
  BillItem,
  BillPaymentFormData,
  PaymentMethod,
} from "@/app/admin/(dashboard)/bills/types";
import { recordBillPayment } from "@/app/admin/(dashboard)/bills/actions";
import { roundCurrency, formatPHP } from "@/lib/bills/bill-calculator";
import toast from "react-hot-toast";

interface RecordPaymentModalProps {
  bill: BillItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RecordPaymentModal({
  bill,
  isOpen,
  onClose,
  onSuccess,
}: RecordPaymentModalProps) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const remainingBalance = Math.max(0, Number(bill.outstanding_balance || 0));

  const [paymentDate, setPaymentDate] = useState(todayStr);
  const [amount, setAmount] = useState<number | "">(remainingBalance);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    (bill.payment_method as PaymentMethod) || "bank_transfer"
  );
  const [paymentAccount, setPaymentAccount] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const numAmount = roundCurrency(Number(amount) || 0);
  const newBalanceAfterPayment = Math.max(0, roundCurrency(remainingBalance - numAmount));
  const isFullPayment = numAmount >= remainingBalance && remainingBalance > 0;

  const handlePayFull = () => {
    setAmount(remainingBalance);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (numAmount <= 0) {
      toast.error("Payment amount must be greater than ₱0.00");
      return;
    }

    if (numAmount > remainingBalance) {
      toast.error(
        `Payment amount (${formatPHP(numAmount)}) exceeds the outstanding balance (${formatPHP(remainingBalance)}).`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: BillPaymentFormData = {
        bill_id: bill.id,
        payment_date: paymentDate,
        amount: numAmount,
        payment_method: paymentMethod,
        payment_account: paymentAccount.trim() || undefined,
        reference_number: referenceNumber.trim() || undefined,
        receipt_url: receiptUrl.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      const res = await recordBillPayment(payload);
      if (res.success) {
        toast.success(
          res.isFullyPaid
            ? `Payment of ${formatPHP(numAmount)} recorded! Bill is now fully paid.`
            : `Partial payment of ${formatPHP(numAmount)} recorded. Remaining: ${formatPHP(res.newBalance)}`
        );
        onClose();
        if (onSuccess) onSuccess();
      } else {
        toast.error(res.error || "Failed to record payment");
      }
    } catch {
      toast.error("An error occurred while recording payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-emerald-50/50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200/60 text-emerald-600">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-serif">Record Bill Payment</h2>
              <p className="text-xs text-slate-500">Record cash, bank transfer, check or cashier drawer disbursement.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {/* Bill Reference Card */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-slate-700">{bill.bill_number}</span>
              <span className="text-[11px] font-semibold text-slate-500">{bill.branch_name || "Main Clinic"}</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 leading-snug">{bill.title}</h3>
            <div className="text-xs text-slate-500 flex items-center justify-between pt-1">
              <span>Vendor: <strong>{bill.vendor_or_payee}</strong></span>
              <span>Due: <strong>{bill.due_date}</strong></span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500">Total: {formatPHP(bill.total_amount)}</span>
              <span className="font-bold text-rose-700">
                Outstanding: {formatPHP(remainingBalance)}
              </span>
            </div>
          </div>

          {/* Amount Field + Quick Full Pay */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Payment Amount (PHP ₱) <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handlePayFull}
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                <Coins className="w-3.5 h-3.5" />
                Pay Full Amount ({formatPHP(remainingBalance)})
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-sm text-slate-400 font-mono">₱</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={remainingBalance}
                value={amount}
                onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="0.00"
                required
                className="w-full h-11 pl-8 pr-3 text-base font-mono font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Live Balance Impact Preview */}
            <div className="mt-2 p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-200/50 flex items-center justify-between text-xs">
              <span className="text-emerald-800">
                {isFullPayment ? "✓ This will fully settle this bill." : "Partial payment."}
              </span>
              <span className="font-mono font-bold text-emerald-900">
                Balance after payment: {formatPHP(newBalanceAfterPayment)}
              </span>
            </div>
          </div>

          {/* Payment Date & Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Payment Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Payment Method <span className="text-rose-500">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="bank_transfer">Bank Transfer / Online Wire</option>
                <option value="check">Company Check</option>
                <option value="cashier_drawer">Cashier Drawer Float</option>
                <option value="petty_cash">Petty Cash Fund</option>
                <option value="cash">Cash on Hand</option>
                <option value="gcash">GCash Enterprise</option>
                <option value="maya">Maya / PayMaya</option>
                <option value="credit_card">Corporate Credit Card</option>
                <option value="other">Other Payment Method</option>
              </select>
            </div>
          </div>

          {/* Paid From Account & Payment Reference Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Paid From Account
              </label>
              <input
                type="text"
                value={paymentAccount}
                onChange={(e) => setPaymentAccount(e.target.value)}
                placeholder="e.g. BDO Operating 1029 / Cash Drawer"
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Payment / Check / Ref #
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. TR-994821 or Check #44102"
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Receipt URL & Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Official Receipt (OR) / Bank Slip URL
            </label>
            <input
              type="text"
              value={receiptUrl}
              onChange={(e) => setReceiptUrl(e.target.value)}
              placeholder="https://... or attachment URL"
              className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Disbursement Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Paid online via BDO Online Banking"
              className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-10 px-4 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-10 px-5 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all hover:scale-[1.01]"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm Payment of {formatPHP(numAmount)}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
