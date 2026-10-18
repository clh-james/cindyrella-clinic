"use client";

import { useState, useId } from "react";
import {
  X,
  UploadCloud,
  Loader2,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  Receipt,
  FileText,
  DollarSign,
  Building2,
  Layers,
  Calendar,
  Wallet,
  UserCheck,
} from "lucide-react";
import {
  ExpenseCategory,
  ExpensePaymentMethod,
  ExpenseFormData,
} from "@/app/admin/(dashboard)/expenses/types";
import { recordExpense } from "@/app/admin/(dashboard)/expenses/actions";
import toast from "react-hot-toast";

interface RecordExpenseModalProps {
  categories: ExpenseCategory[];
  branches: { id: string; name: string }[];
  defaultBranchId?: string;
  isSuperAdmin?: boolean;
  staffList?: { id: string; full_name: string }[];
  onClose: () => void;
  onSaved: () => void;
  onOpenNewCategory: () => void;
}

export function RecordExpenseModal({
  categories,
  branches,
  defaultBranchId,
  isSuperAdmin = false,
  staffList = [],
  onClose,
  onSaved,
  onOpenNewCategory,
}: RecordExpenseModalProps) {
  const fileInputId = useId();
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [branchId, setBranchId] = useState(defaultBranchId || branches[0]?.id || "");
  const [amountBeforeTax, setAmountBeforeTax] = useState("");
  const [taxAmount, setTaxAmount] = useState("0");
  const [totalAmount, setTotalAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod>("cash");
  const [paymentAccount, setPaymentAccount] = useState("");
  const [recordImmediatePayment, setRecordImmediatePayment] = useState(false);
  const [vendorOrPayee, setVendorOrPayee] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [description, setDescription] = useState("");
  const [isPettyCash, setIsPettyCash] = useState(false);
  const [isReimbursement, setIsReimbursement] = useState(false);
  const [reimbursementEmployeeId, setReimbursementEmployeeId] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [receiptFileName, setReceiptFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");

  const activeCategory = categories.find((c) => c.id === categoryId);

  // Auto-sync totals
  const handleAmountBeforeTaxChange = (val: string) => {
    setAmountBeforeTax(val);
    const before = parseFloat(val) || 0;
    const tax = parseFloat(taxAmount) || 0;
    setTotalAmount((before + tax).toFixed(2));
  };

  const handleTaxChange = (val: string) => {
    setTaxAmount(val);
    const before = parseFloat(amountBeforeTax) || 0;
    const tax = parseFloat(val) || 0;
    setTotalAmount((before + tax).toFixed(2));
  };

  const applyVat12 = () => {
    const before = parseFloat(amountBeforeTax) || 0;
    const vat = Math.round(before * 0.12 * 100) / 100;
    setTaxAmount(vat.toString());
    setTotalAmount((before + vat).toFixed(2));
  };

  const clearTax = () => {
    setTaxAmount("0");
    const before = parseFloat(amountBeforeTax) || 0;
    setTotalAmount(before.toFixed(2));
  };

  const handlePaymentMethodChange = (method: ExpensePaymentMethod) => {
    setPaymentMethod(method);
    if (method === "petty_cash") {
      setIsPettyCash(true);
      setRecordImmediatePayment(true);
      setPaymentAccount("Branch Petty Cash Float");
    } else if (method === "cashier_drawer") {
      setIsPettyCash(false);
      setRecordImmediatePayment(true);
      setPaymentAccount("Active Cashier Register Drawer");
    } else {
      setIsPettyCash(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File exceeds maximum allowed size of 10MB");
      return;
    }

    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/expenses/upload", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (json.success && json.url) {
        setReceiptUrl(json.url);
        setReceiptFileName(file.name);
        toast.success("Receipt voucher uploaded!");
      } else {
        toast.error(json.error || "Failed to upload file");
      }
    } catch {
      toast.error("Failed to attach receipt");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalTotal = parseFloat(totalAmount) || 0;
    if (finalTotal <= 0) {
      toast.error("Please enter a valid expense total greater than ₱0.00");
      return;
    }
    if (!vendorOrPayee.trim()) {
      toast.error("Please provide the vendor or payee name");
      return;
    }
    if (activeCategory?.requires_receipt && !receiptUrl) {
      toast.error(`Receipt attachment is required for "${activeCategory.name}".`);
      return;
    }

    setLoading(true);
    try {
      const payload: ExpenseFormData = {
        title: title.trim() || `${activeCategory?.name || "Expense"} - ${vendorOrPayee.trim()}`,
        category_id: categoryId,
        branch_id: branchId,
        amount_before_tax: parseFloat(amountBeforeTax) || finalTotal,
        tax_amount: parseFloat(taxAmount) || 0,
        total_amount: finalTotal,
        expense_date: expenseDate,
        payment_method: paymentMethod,
        payment_account: paymentAccount,
        record_immediate_payment: recordImmediatePayment,
        vendor_or_payee: vendorOrPayee.trim(),
        reference_number: referenceNumber.trim() || undefined,
        description: description.trim() || undefined,
        is_petty_cash: isPettyCash || paymentMethod === "petty_cash",
        is_reimbursement: isReimbursement,
        employee_id: isReimbursement ? reimbursementEmployeeId : undefined,
        receipt_url: receiptUrl || undefined,
        notes: notes.trim() || undefined,
      };

      const res = await recordExpense(payload);
      if (res.success) {
        toast.success(`Expense ${res.expenseNumber || "recorded"} successfully!`);
        onSaved();
        onClose();
      } else {
        toast.error(res.error || "Failed to record expense");
      }
    } catch {
      toast.error("An unexpected error occurred while saving.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200/60">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Record Clinic Expense</h2>
              <p className="text-xs text-slate-500">
                Log disbursements, petty cash vouchers, clinic overheads & vendor invoices
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* SECTION 1: EXPENSE INFORMATION */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Expense Information</h3>

            {/* Date, Branch, Category */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date *
                </label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" /> Branch *
                </label>
                <select
                  disabled={!isSuperAdmin && branches.length <= 1}
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-60"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-400" /> Category *
                  </label>
                  <button
                    type="button"
                    onClick={onOpenNewCategory}
                    className="text-[11px] font-medium text-rose-600 hover:text-rose-700 underline"
                  >
                    + Manage
                  </button>
                </div>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.requires_receipt ? "★ (Receipt req)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category Notice Banner if receipt or approval required */}
            {activeCategory && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeCategory.color }} />
                  <span className="font-semibold text-slate-800">{activeCategory.name}</span>
                  <span className="text-slate-300">•</span>
                  <span className="truncate max-w-xs text-slate-500">{activeCategory.description || "Operational account"}</span>
                </div>
                <div className="flex items-center gap-2">
                  {activeCategory.requires_receipt && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                      Receipt Required
                    </span>
                  )}
                  {activeCategory.requires_approval && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                      Approval Required
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Payee / Vendor & Purpose */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vendor / Payee Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Meralco, Medline Supplies, PLDT, Landlord"
                  value={vendorOrPayee}
                  onChange={(e) => setVendorOrPayee(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expense Title / Purpose *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Clinic Electricity Bill October 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" /> Description / Itemized Details
              </label>
              <textarea
                rows={2}
                placeholder="Specific items, quantities, or clinic operational purpose..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          {/* SECTION 2: FINANCIAL INFORMATION */}
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Financial Details & Taxes
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={applyVat12}
                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  Apply 12% VAT
                </button>
                <button
                  type="button"
                  onClick={clearTax}
                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  VAT Exempt (0%)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Amount Before Tax (₱)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amountBeforeTax}
                  onChange={(e) => handleAmountBeforeTaxChange(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 font-mono focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Tax / VAT Amount (₱)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={taxAmount}
                  onChange={(e) => handleTaxChange(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 font-mono focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-900 mb-1">
                  Total Amount (₱) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="w-full h-10 px-3 text-sm font-bold rounded-lg border border-rose-300 bg-white text-rose-600 font-mono focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: PAYMENT INFORMATION */}
          <div className="space-y-4 pt-3 border-t border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Payment Information</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-slate-400" /> Payment Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => handlePaymentMethodChange(e.target.value as ExpensePaymentMethod)}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="cash">Cash (Direct)</option>
                  <option value="petty_cash">Petty Cash Float (Drawer)</option>
                  <option value="cashier_drawer">Cashier Shift Drawer (Disbursement)</option>
                  <option value="gcash">GCash</option>
                  <option value="maya">Maya</option>
                  <option value="bank_transfer">Bank Transfer (BDO / BPI)</option>
                  <option value="credit_card">Company Credit Card</option>
                  <option value="cheque">Company Cheque</option>
                  <option value="other">Other / Accounts Payable</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Paid From Account / Cash Source
                </label>
                <input
                  type="text"
                  placeholder="e.g. BDO Checking 1092, Cashier Drawer 1, Petty Cash Box"
                  value={paymentAccount}
                  onChange={(e) => setPaymentAccount(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            {/* Cashier Drawer Shift Notice */}
            {paymentMethod === "cashier_drawer" && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Cashier Shift Integration</p>
                  <p className="mt-0.5">
                    This cash-out will automatically link to the active open shift for this branch and deduct from drawer expected cash during closing reconciliation.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Receipt (OR) / Invoice #
                </label>
                <input
                  type="text"
                  placeholder="e.g. OR-2026-99120, SI-55102"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="pt-4 flex items-center">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recordImmediatePayment}
                    onChange={(e) => setRecordImmediatePayment(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
                  />
                  <span className="text-xs font-medium text-slate-700">
                    Mark as Paid / Immediate Disbursement
                  </span>
                </label>
              </div>
            </div>

            {/* Staff Reimbursement Checkbox & Assignee */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isReimbursement}
                  onChange={(e) => setIsReimbursement(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
                />
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-purple-600" />
                  This is an Employee Out-of-Pocket Reimbursement Request
                </span>
              </label>

              {isReimbursement && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Select Staff Member to Reimburse
                  </label>
                  <select
                    value={reimbursementEmployeeId}
                    onChange={(e) => setReimbursementEmployeeId(e.target.value)}
                    className="w-full h-10 px-3 text-xs rounded-lg border border-slate-200 bg-white text-slate-800"
                  >
                    <option value="">-- Current Logged-in Staff Member --</option>
                    {staffList.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 4: ATTACHMENTS */}
          <div className="space-y-3 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Receipt / Invoice Attachment {activeCategory?.requires_receipt && "*"}
              </span>
              <span className="text-[11px] text-slate-400">JPG, PNG, PDF up to 10MB</span>
            </div>

            {receiptUrl ? (
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
                <div className="flex items-center gap-2.5 truncate">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="truncate">
                    <p className="text-xs font-semibold truncate">{receiptFileName || "Receipt Attached"}</p>
                    <a
                      href={receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-emerald-600 underline flex items-center gap-1 mt-0.5"
                    >
                      View attached file <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setReceiptUrl("");
                    setReceiptFileName("");
                  }}
                  className="text-xs text-slate-400 hover:text-red-500 px-2 py-1 rounded"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="relative border-2 border-dashed border-slate-300 hover:border-rose-400 rounded-xl p-5 transition-colors text-center cursor-pointer bg-slate-50/60">
                <input
                  id={fileInputId}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center gap-1.5">
                  {isUploading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                  ) : (
                    <UploadCloud className="w-6 h-6 text-slate-400" />
                  )}
                  <p className="text-xs font-medium text-slate-700">
                    {isUploading ? "Uploading file..." : "Click or drag & drop receipt file here"}
                  </p>
                  <p className="text-[11px] text-slate-400">Official receipt photo, tax invoice, or vendor PDF</p>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 5: NOTES */}
          <div className="pt-3 border-t border-slate-200">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Internal Auditor Notes
            </label>
            <textarea
              rows={2}
              placeholder="Optional notes for managers, cash reconciliation, or CPA..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || isUploading}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save & Record Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
