// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Register a Bill Modal (+ Add Bill)
// ==============================================================================

"use client";

import { useState } from "react";
import {
  X,
  Plus,
  Receipt,
  RefreshCw,
} from "lucide-react";
import {
  BillFormData,
  PaymentMethod,
  RecurrenceFrequency,
  ReminderStage,
} from "@/app/admin/(dashboard)/bills/types";
import { ExpenseCategory } from "@/app/admin/(dashboard)/expenses/types";
import { registerBill } from "@/app/admin/(dashboard)/bills/actions";
import { roundCurrency, formatPHP } from "@/lib/bills/bill-calculator";
import toast from "react-hot-toast";

interface AddBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: ExpenseCategory[];
  branches: { id: string; name: string }[];
  staffList: { id: string; full_name: string }[];
  currentStaffBranchId?: string | null;
  currentStaffId?: string;
  isSuperAdmin?: boolean;
  onSuccess?: () => void;
}

const DEFAULT_STAGES: ReminderStage[] = [
  "7_days",
  "3_days",
  "1_day",
  "due_date",
  "overdue",
];

export function AddBillModal({
  isOpen,
  onClose,
  categories,
  branches,
  staffList,
  currentStaffBranchId,
  currentStaffId,
  isSuperAdmin = false,
  onSuccess,
}: AddBillModalProps) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const defaultDueDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  // Form states
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [vendorOrPayee, setVendorOrPayee] = useState("");
  const defaultBranch = !isSuperAdmin && currentStaffBranchId ? currentStaffBranchId : branches[0]?.id || "";
  const [branchId, setBranchId] = useState(defaultBranch);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [billingPeriod, setBillingPeriod] = useState("");
  const [issueDate, setIssueDate] = useState(todayStr);
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [amountBeforeTax, setAmountBeforeTax] = useState<number | "">("");
  const [taxAmount, setTaxAmount] = useState<number | "">("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank_transfer");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>("monthly");
  const [responsibleEmployeeId, setResponsibleEmployeeId] = useState(currentStaffId || "");
  const [reminderStages, setReminderStages] = useState<ReminderStage[]>(DEFAULT_STAGES);
  const [receiptUrl, setReceiptUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [createLinkedExpense, setCreateLinkedExpense] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Decimal calculations
  const numBeforeTax = Math.max(0, Number(amountBeforeTax) || 0);
  const numTax = Math.max(0, Number(taxAmount) || 0);
  const totalAmount = roundCurrency(numBeforeTax + numTax);

  const toggleStage = (stage: ReminderStage) => {
    if (reminderStages.includes(stage)) {
      setReminderStages(reminderStages.filter((s) => s !== stage));
    } else {
      setReminderStages([...reminderStages, stage]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter bill description / name");
      return;
    }
    if (!vendorOrPayee.trim()) {
      toast.error("Please enter vendor / provider name");
      return;
    }
    if (!categoryId) {
      toast.error("Please select a category");
      return;
    }
    if (!dueDate) {
      toast.error("Please enter due date");
      return;
    }
    if (totalAmount <= 0) {
      toast.error("Total amount must be greater than ₱0.00");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: BillFormData = {
        title: title.trim(),
        category_id: categoryId,
        vendor_or_payee: vendorOrPayee.trim(),
        branch_id: branchId || null,
        invoice_number: invoiceNumber.trim() || undefined,
        billing_period: billingPeriod.trim() || undefined,
        issue_date: issueDate,
        due_date: dueDate,
        amount_before_tax: numBeforeTax,
        tax_amount: numTax,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        is_recurring: isRecurring,
        recurrence_frequency: isRecurring ? recurrenceFrequency : undefined,
        responsible_employee_id: responsibleEmployeeId || null,
        reminder_stages: reminderStages,
        receipt_url: receiptUrl.trim() || undefined,
        notes: notes.trim() || undefined,
        create_linked_expense: createLinkedExpense,
      };

      const res = await registerBill(payload);
      if (res.success) {
        toast.success(`Bill ${res.billNumber} registered successfully!`);
        onClose();
        if (onSuccess) onSuccess();
      } else {
        toast.error(res.error || "Failed to register bill");
      }
    } catch {
      toast.error("An error occurred while creating the bill");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-50 border border-rose-200/60 text-rose-600">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-serif">Register New Bill</h2>
              <p className="text-xs text-slate-500">Record an authorized vendor invoice or utility bill with automated reminders.</p>
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
          {/* Row 1: Bill Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Bill Name / Description <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Meralco Clinic Power - October"
                required
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Bill Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Vendor & Branch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Vendor / Provider <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={vendorOrPayee}
                onChange={(e) => setVendorOrPayee(e.target.value)}
                placeholder="e.g. Meralco, PLDT, Manila Water, Landlord"
                required
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Branch <span className="text-rose-500">*</span>
              </label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                disabled={!isSuperAdmin && !!currentStaffBranchId}
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 disabled:bg-slate-100 disabled:text-slate-500"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Invoice # & Billing Period */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Vendor Invoice / Account #
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-2026-99214 or Account 0102938"
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Billing Period
              </label>
              <input
                type="text"
                value={billingPeriod}
                onChange={(e) => setBillingPeriod(e.target.value)}
                placeholder="e.g. October 2026 or Sept 15 - Oct 15"
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
          </div>

          {/* Row 4: Issue Date & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Issue Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                required
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Due Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-semibold text-rose-700"
              />
            </div>
          </div>

          {/* Row 5: Financials (Original Amount + Tax = Total Amount) */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 block">
              Financial Breakdown (PHP ₱)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Original Amount (excl. Tax)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">₱</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amountBeforeTax}
                    onChange={(e) => setAmountBeforeTax(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="0.00"
                    required
                    className="w-full h-10 pl-7 pr-3 text-xs font-mono rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Tax / VAT Amount (if any)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">₱</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={taxAmount}
                    onChange={(e) => setTaxAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full h-10 pl-7 pr-3 text-xs font-mono rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-900 mb-1">
                  Total Bill Amount
                </label>
                <div className="h-10 px-3 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/50 text-rose-800 font-mono font-extrabold text-sm">
                  <span>₱</span>
                  <span>{totalAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 6: Payment Method & Responsible Employee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Default Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              >
                <option value="bank_transfer">Bank Transfer / Online Wire</option>
                <option value="check">Company Check</option>
                <option value="cashier_drawer">Cashier Drawer Float</option>
                <option value="petty_cash">Petty Cash Fund</option>
                <option value="gcash">GCash Enterprise</option>
                <option value="maya">Maya / PayMaya</option>
                <option value="credit_card">Corporate Credit Card</option>
                <option value="other">Other Payment Mode</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Responsible Employee
              </label>
              <select
                value={responsibleEmployeeId}
                onChange={(e) => setResponsibleEmployeeId(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              >
                <option value="">Unassigned (Branch Manager/Admin)</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 7: Recurring Schedule Checkbox */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
              />
              <span className="text-xs font-bold text-slate-800">
                This is a Recurring Bill (e.g., Monthly Internet, Rent, Electricity)
              </span>
            </label>

            {isRecurring && (
              <div className="pl-6 pt-1 flex items-center gap-3">
                <span className="text-[11px] text-slate-500">Recurrence Frequency:</span>
                <select
                  value={recurrenceFrequency}
                  onChange={(e) => setRecurrenceFrequency(e.target.value as RecurrenceFrequency)}
                  className="h-8 px-2.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="semi_annually">Semi-Annually</option>
                  <option value="annually">Annually</option>
                </select>
              </div>
            )}
          </div>

          {/* Row 8: Reminder Schedule Selection */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Automated Payment Reminders Schedule
            </span>
            <p className="text-[11px] text-slate-500">
              Select which stages will automatically trigger in-app & email payment reminders:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {[
                { stage: "7_days" as ReminderStage, label: "7 days before due date" },
                { stage: "3_days" as ReminderStage, label: "3 days before due date" },
                { stage: "1_day" as ReminderStage, label: "1 day before due date" },
                { stage: "due_date" as ReminderStage, label: "On the due date" },
                { stage: "overdue" as ReminderStage, label: "Overdue follow-up" },
              ].map((item) => {
                const checked = reminderStages.includes(item.stage);
                return (
                  <label
                    key={item.stage}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                      checked
                        ? "border-rose-300 bg-rose-50/50 text-rose-800 font-semibold"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleStage(item.stage)}
                      className="w-3.5 h-3.5 rounded text-rose-600 focus:ring-rose-500"
                    />
                    {item.label}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Row 9: Receipt / Invoice Attachment URL & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Receipt / Invoice Attachment URL
              </label>
              <input
                type="text"
                value={receiptUrl}
                onChange={(e) => setReceiptUrl(e.target.value)}
                placeholder="https://... or invoice image URL"
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Internal Accounting Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Disbursement instructions or reference notes"
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
          </div>

          {/* Synchronize to Expenses toggle */}
          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
              <input
                type="checkbox"
                checked={createLinkedExpense}
                onChange={(e) => setCreateLinkedExpense(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-rose-600 focus:ring-rose-500"
              />
              <span>
                Link this bill to Clinic Expenses as an accrued payable (avoids double-counting in financial reports).
              </span>
            </label>
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
              className="h-10 px-5 text-xs font-bold rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-md shadow-rose-500/20 flex items-center gap-2 transition-all hover:scale-[1.01]"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving Bill...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Register Bill ({formatPHP(totalAmount)})
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
