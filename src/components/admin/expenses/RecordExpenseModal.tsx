"use client";

import { useState, useEffect, useId } from "react";
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
  Sparkles,
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
  const aiScanInputId = useId();

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

  // AI Receipt Scanner States
  const [isScanning, setIsScanning] = useState(false);
  const [scanDone, setScanDone] = useState(false);
  const [customApiKey, setCustomApiKey] = useState("");
  const [tempApiKey, setTempApiKey] = useState("");
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);
  const [lastScannedFile, setLastScannedFile] = useState<File | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cindyrella_gemini_api_key");
      if (saved) setCustomApiKey(saved);
    }
  }, []);

  const handleSaveApiKey = () => {
    const key = tempApiKey.trim();
    if (!key) return;
    localStorage.setItem("cindyrella_gemini_api_key", key);
    setCustomApiKey(key);
    setShowApiKeyPrompt(false);
    toast.success("Gemini API Key na-save! Ini-scan na ang resibo...");
    if (lastScannedFile) {
      processFileAndScan(lastScannedFile, key);
    }
  };

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

  // Upload and AI scan runner
  const processFileAndScan = async (file: File, overrideKey?: string) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File exceeds maximum allowed size of 10MB");
      return;
    }

    setLastScannedFile(file);
    setIsUploading(true);
    setIsScanning(true);

    try {
      // 1. Upload file to Supabase storage voucher bucket
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
      } else {
        toast.error(json.error || "Failed to upload file");
        setIsUploading(false);
        setIsScanning(false);
        return;
      }
      setIsUploading(false);

      // 2. Scan file with Google Gemini Vision
      const scanFd = new FormData();
      scanFd.append("file", file);
      scanFd.append(
        "categories",
        JSON.stringify(categories.map((c) => ({ id: c.id, name: c.name })))
      );
      scanFd.append(
        "branches",
        JSON.stringify(branches.map((b) => ({ id: b.id, name: b.name })))
      );

      const activeKey = overrideKey || customApiKey;
      const scanRes = await fetch("/api/admin/expenses/scan-receipt", {
        method: "POST",
        headers: activeKey ? { "x-gemini-key": activeKey } : undefined,
        body: scanFd,
      });

      const scanJson = await scanRes.json();

      if (!scanRes.ok || !scanJson.success) {
        if (scanJson.needsApiKey) {
          setShowApiKeyPrompt(true);
          toast("Pakilagay ang Gemini API Key para mag-scan ng resibo.", { icon: "🔑" });
        } else {
          toast.error(scanJson.error || "Hindi nabasa ang resibo. Pwede mong manual na i-type.");
        }
        return;
      }

      // 3. Populate form fields
      const data = scanJson.data;
      if (data) {
        if (data.title) setTitle(data.title);
        if (data.suggestedCategoryId) setCategoryId(data.suggestedCategoryId);
        if (data.suggestedBranchId) setBranchId(data.suggestedBranchId);
        if (data.vendor) setVendorOrPayee(data.vendor);
        if (data.invoiceNumber) setReferenceNumber(data.invoiceNumber);
        if (data.expenseDate) setExpenseDate(data.expenseDate);

        if (typeof data.totalAmount === "number" && !isNaN(data.totalAmount)) {
          setTotalAmount(data.totalAmount.toFixed(2));
        }
        if (typeof data.amountBeforeTax === "number" && !isNaN(data.amountBeforeTax)) {
          setAmountBeforeTax(data.amountBeforeTax.toFixed(2));
        } else if (typeof data.totalAmount === "number" && !isNaN(data.totalAmount)) {
          setAmountBeforeTax(data.totalAmount.toFixed(2));
        }
        if (typeof data.taxAmount === "number" && !isNaN(data.taxAmount)) {
          setTaxAmount(data.taxAmount.toFixed(2));
        }

        if (data.paymentMethod) {
          setPaymentMethod(data.paymentMethod);
          if (data.paymentMethod === "petty_cash") {
            setIsPettyCash(true);
          }
        }
        if (data.paymentAccount) {
          setPaymentAccount(data.paymentAccount);
        }
        if (data.formattedBreakdown) {
          setDescription(data.formattedBreakdown);
        }
        if (data.auditorNotes) {
          setNotes(data.auditorNotes);
        }

        setRecordImmediatePayment(true);
        setScanDone(true);
        toast.success("✨ Resibo na-scan na! Kusa nang napunan ang mga detalye.");
      }
    } catch {
      toast.error("Error habang nag-i-scan ng resibo.");
    } finally {
      setIsUploading(false);
      setIsScanning(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFileAndScan(file);
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
          {/* AI RECEIPT SCANNER BANNER / DROPZONE */}
          <div className="relative overflow-hidden rounded-2xl border border-rose-200/90 bg-gradient-to-br from-rose-50 via-purple-50/40 to-amber-50/40 p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-pink-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-rose-500/25 shrink-0 mt-0.5">
                  <Sparkles className={`w-5 h-5 ${isScanning ? "animate-spin text-amber-200" : "animate-pulse"}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      Smart AI Receipt Scanner
                    </h4>
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-rose-600 text-white rounded-full shadow-xs">
                      Auto-Fill
                    </span>
                    {scanDone && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Na-Auto-Fill na!
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    I-upload ang resibo (NCCC, SM Store, Unitop, etc.) — kusa nitong babasahin ang Branch, Halaga, VAT, Items, Petsa, at OR #!
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <label
                  htmlFor={aiScanInputId}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5 shadow-sm transition-all ${
                    isScanning || isUploading
                      ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 text-white shadow-rose-500/20 active:scale-95"
                  }`}
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Binabasa ng AI...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Scan Receipt</span>
                    </>
                  )}
                </label>
                <input
                  id={aiScanInputId}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  disabled={isScanning || isUploading}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKeyPrompt(!showApiKeyPrompt)}
                  title="Configure Gemini API Key"
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-white/90 rounded-xl transition-colors border border-slate-200/80 bg-white/60"
                >
                  <Sparkles className="w-4 h-4 text-purple-600" />
                </button>
              </div>
            </div>

            {/* API Key Prompt / Configuration */}
            {showApiKeyPrompt && (
              <div className="mt-3 pt-3 border-t border-rose-200/70 animate-in fade-in duration-150">
                <div className="p-3 bg-white/95 rounded-xl border border-rose-200 shadow-xs flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      🔑 Google Gemini API Key
                    </label>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-rose-600 underline hover:text-rose-700 font-semibold flex items-center gap-0.5"
                    >
                      Kumuha ng libreng key sa Google AI Studio <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Libreng API key mula sa Google. Maaalala ito ng browser mo para sa lahat ng susunod na pag-scan ng resibo.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      placeholder="I-paste ang iyong AIzaSy... key dito"
                      value={tempApiKey || customApiKey}
                      onChange={(e) => setTempApiKey(e.target.value)}
                      className="flex-1 h-9 px-3 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    <button
                      type="button"
                      onClick={handleSaveApiKey}
                      className="h-9 px-4 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors shrink-0"
                    >
                      I-save Key
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isScanning && (
              <div className="mt-3 pt-3 border-t border-rose-200/70 flex items-center gap-2 text-xs font-semibold text-rose-700 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-rose-600 shrink-0" />
                <span>Sinasala ng Gemini Vision ang mga items, halaga ng VAT, petsa, tindahan, at OR #... Sandali lamang.</span>
              </div>
            )}
          </div>

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
                    setScanDone(false);
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
                  disabled={isUploading || isScanning}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center gap-1.5">
                  {isScanning ? (
                    <div className="flex flex-col items-center gap-1">
                      <Sparkles className="w-6 h-6 animate-spin text-purple-600" />
                      <p className="text-xs font-bold text-purple-700 animate-pulse">
                        Binabasa ng AI ang resibo at ina-auto-fill ang form...
                      </p>
                    </div>
                  ) : isUploading ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                      <p className="text-xs font-medium text-slate-700">Uploading file...</p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 text-rose-500">
                        <UploadCloud className="w-6 h-6 text-slate-400" />
                        <Sparkles className="w-4 h-4 text-purple-500" />
                      </div>
                      <p className="text-xs font-semibold text-slate-700">
                        Click or drag & drop receipt file here (Auto-Scans with AI)
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Official receipt photo, tax invoice, or vendor PDF
                      </p>
                    </>
                  )}
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
