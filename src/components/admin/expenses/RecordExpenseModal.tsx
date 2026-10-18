"use client";

import { useState } from "react";
import {
  X,
  UploadCloud,
  Loader2,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import {
  ExpenseCategory,
  BranchInfo,
  ExpensePaymentMethod,
  ExpenseFormData,
} from "@/app/admin/(dashboard)/expenses/types";
import { recordExpense, uploadReceiptFile } from "@/app/admin/(dashboard)/expenses/actions";
import toast from "react-hot-toast";

interface RecordExpenseModalProps {
  categories: ExpenseCategory[];
  branches: BranchInfo[];
  defaultBranchId?: string;
  onClose: () => void;
  onSaved: () => void;
  onOpenNewCategory: () => void;
}

export function RecordExpenseModal({
  categories,
  branches,
  defaultBranchId,
  onClose,
  onSaved,
  onOpenNewCategory,
}: RecordExpenseModalProps) {
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [branchId, setBranchId] = useState(defaultBranchId || branches[0]?.id || "");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod>("cash");
  const [vendorOrPayee, setVendorOrPayee] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [description, setDescription] = useState("");
  const [isPettyCash, setIsPettyCash] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadReceiptFile(fd);
      if (res.success && res.url) {
        setReceiptUrl(res.url);
        toast.success("Receipt voucher uploaded!");
      } else {
        toast.error(res.error || "Failed to upload receipt");
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid expense amount");
      return;
    }
    if (!vendorOrPayee.trim()) {
      toast.error("Please provide the vendor or payee name");
      return;
    }

    setLoading(true);
    try {
      const payload: ExpenseFormData = {
        title,
        category_id: categoryId,
        branch_id: branchId,
        amount: parseFloat(amount),
        expense_date: expenseDate,
        payment_method: paymentMethod,
        vendor_or_payee: vendorOrPayee,
        reference_number: referenceNumber,
        description,
        is_petty_cash: isPettyCash || paymentMethod === "petty_cash",
        receipt_url: receiptUrl,
      };

      const res = await recordExpense(payload);
      if (res.success) {
        toast.success(`Expense ${res.expenseNumber} recorded!`);
        onSaved();
        onClose();
      } else {
        toast.error(res.error || "Failed to record expense");
      }
    } catch {
      toast.error("An error occurred while saving expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <h2 className="text-lg font-bold font-serif text-ink">Record Clinic Expense</h2>
            <p className="text-xs text-ink-soft">
              Log operational disbursements, petty cash vouchers, utilities, and clinic consumables
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-line p-2 text-ink-soft hover:bg-pale transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5 text-xs">
          {/* Title & Payee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-ink mb-1.5">
                Expense Title / Purpose *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Syringes & Cannula Disposables Restock"
                required
                className="w-full rounded-xl border border-line px-3.5 py-2.5 text-xs text-ink font-medium focus:border-royal focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink mb-1.5">
                Vendor / Payee / Supplier *
              </label>
              <input
                type="text"
                value={vendorOrPayee}
                onChange={(e) => setVendorOrPayee(e.target.value)}
                placeholder="e.g. Medispec Pharma / Meralco"
                required
                className="w-full rounded-xl border border-line px-3.5 py-2.5 text-xs text-ink font-medium focus:border-royal focus:outline-hidden"
              />
            </div>
          </div>

          {/* Amount, Category & Branch */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-ink mb-1.5">Amount (₱) *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-ink-soft">
                  ₱
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full rounded-xl border border-line pl-8 pr-3.5 py-2.5 text-xs font-mono font-bold text-ink focus:border-royal focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-ink">Expense Category *</label>
                <button
                  type="button"
                  onClick={onOpenNewCategory}
                  className="text-[10px] text-royal font-bold hover:underline"
                >
                  + New
                </button>
              </div>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-xs font-medium text-ink focus:border-royal focus:outline-hidden"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-ink mb-1.5">Branch</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-xs font-medium text-ink focus:border-royal focus:outline-hidden"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Payment Method, Date, Reference Number */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-ink mb-1.5">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => {
                  const m = e.target.value as ExpensePaymentMethod;
                  setPaymentMethod(m);
                  if (m === "petty_cash") setIsPettyCash(true);
                }}
                className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-xs font-medium text-ink focus:border-royal focus:outline-hidden"
              >
                <option value="cash">Cash on Hand</option>
                <option value="petty_cash">Branch Petty Cash Drawer</option>
                <option value="bank_transfer">Clinic Bank Transfer</option>
                <option value="gcash">GCash / Maya e-Wallet</option>
                <option value="credit_card">Clinic Corporate Card</option>
                <option value="check">Bank Check</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-ink mb-1.5">Expense Date *</label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
                className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-xs font-medium text-ink focus:border-royal focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink mb-1.5">
                Official Receipt / Invoice #
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="OR # / Invoice # / Ref"
                className="w-full rounded-xl border border-line px-3.5 py-2.5 text-xs font-mono text-ink focus:border-royal focus:outline-hidden"
              />
            </div>
          </div>

          {/* Petty Cash Flag */}
          <div className="rounded-2xl bg-emerald-50/60 border border-emerald-200 p-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-bold text-emerald-900 block text-xs">
                Deduct from Branch Petty Cash Drawer
              </span>
              <p className="text-[11px] text-emerald-800">
                Automatically adjusts the active petty cash float for this branch upon recording.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isPettyCash || paymentMethod === "petty_cash"}
                onChange={(e) => setIsPettyCash(e.target.checked)}
                className="rounded border-line text-emerald-600 focus:ring-0 h-4 w-4"
              />
            </label>
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold text-ink mb-1.5">Notes & Items Itemization</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 5 boxes sterile gloves, 100 pcs 1ml syringes, 2 gallons 70% alcohol"
              className="w-full rounded-xl border border-line p-3 text-xs text-ink focus:border-royal focus:outline-hidden"
            />
          </div>

          {/* Receipt Upload / Attachment */}
          <div className="rounded-2xl border-2 border-dashed border-line p-4 text-center">
            {receiptUrl ? (
              <div className="flex items-center justify-between rounded-xl bg-pale/40 p-3 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span className="font-semibold text-ink">Receipt Attached</span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 font-semibold text-royal hover:underline"
                  >
                    View Attachment <ExternalLink size={12} />
                  </a>
                  <button
                    type="button"
                    onClick={() => setReceiptUrl("")}
                    className="text-red-500 font-semibold hover:underline ml-2"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <UploadCloud size={24} className="mx-auto text-ink-soft mb-1" />
                <label className="block font-semibold text-ink cursor-pointer hover:text-royal">
                  <span>{isUploading ? "Uploading receipt image..." : "Upload Official Receipt or Voucher Photo"}</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-ink-soft mt-0.5">PNG, JPG, or PDF up to 10MB</p>
                {isUploading && <Loader2 size={16} className="animate-spin mx-auto mt-2 text-royal" />}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-line pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-line px-4 py-2 text-xs font-semibold text-ink-soft hover:bg-pale transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || isUploading}
              className="flex items-center gap-1.5 rounded-xl bg-royal px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-royal/90 disabled:opacity-50 transition-colors"
            >
              {loading ? "Saving Expense..." : "Record Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
