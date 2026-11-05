"use client";

import { useState, useTransition, useMemo } from "react";
import { X, CheckCircle2, Loader2, Sparkles, User, PackageOpen, CreditCard, Building2, Search } from "lucide-react";
import { sellCustomerPackage } from "./actions";
import { PackageTemplateItem } from "./types";
import toast from "react-hot-toast";

export function SellPackageModal({
  customers,
  branches,
  templates,
  allTreatments = [],
  initialTreatmentId,
  currentBranchId,
  onClose,
  onSuccess,
}: {
  customers: { id: string; first_name: string; last_name: string; phone: string }[];
  branches: { id: string; name: string }[];
  templates: PackageTemplateItem[];
  allTreatments?: { id: string; name: string; session_price: number; category?: string }[];
  initialTreatmentId?: string | null;
  currentBranchId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");

  const [packageType, setPackageType] = useState<"preset" | "custom">("preset");

  // Initial template selection index
  const initialIndex = useMemo(() => {
    if (!initialTreatmentId) return 0;
    const found = templates.findIndex((t) => t.treatment_id === initialTreatmentId);
    return found !== -1 ? found : 0;
  }, [initialTreatmentId, templates]);

  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState<number>(initialIndex);
  const [presetTier, setPresetTier] = useState<string>("5+1");

  // Custom package states
  const [customTreatmentId, setCustomTreatmentId] = useState("");
  const [customName, setCustomName] = useState("");
  const [customSessions, setCustomSessions] = useState(2);
  const [customPrice, setCustomPrice] = useState(70000);

  const [branchId, setBranchId] = useState(currentBranchId || branches[0]?.id || "");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [expiryMonths, setExpiryMonths] = useState(12);
  const [notes, setNotes] = useState("");

  const [isPending, startTransition] = useTransition();

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 50);
    const q = customerSearch.toLowerCase();
    return customers
      .filter((c) => `${c.first_name} ${c.last_name} ${c.phone}`.toLowerCase().includes(q))
      .slice(0, 50);
  }, [customers, customerSearch]);

  const selectedTemplate = templates[selectedTemplateIndex] || templates[0];

  const calculatedPreset = useMemo(() => {
    if (!selectedTemplate) return { name: "Custom Package", sessions: 6, price: 0, treatmentId: "" };

    // Check if this template has specialized preset options (e.g. Penile 2 Sessions)
    if (selectedTemplate.preset_options && selectedTemplate.preset_options.length > 0) {
      const matchOpt =
        selectedTemplate.preset_options.find((o) => o.label === presetTier) ||
        selectedTemplate.preset_options[0];
      return {
        name: `${selectedTemplate.treatment_name} (${matchOpt.label})`,
        sessions: matchOpt.sessions,
        price: matchOpt.price,
        treatmentId: selectedTemplate.treatment_id,
      };
    }

    if (presetTier === "10+2" && selectedTemplate.ten_plus_two_price) {
      return {
        name: `${selectedTemplate.treatment_name} (10+2 Package)`,
        sessions: 12,
        price: selectedTemplate.ten_plus_two_price,
        treatmentId: selectedTemplate.treatment_id,
      };
    }
    const price = selectedTemplate.five_plus_one_price || selectedTemplate.session_price * 5;
    return {
      name: `${selectedTemplate.treatment_name} (5+1 Package)`,
      sessions: 6,
      price: price,
      treatmentId: selectedTemplate.treatment_id,
    };
  }, [selectedTemplate, presetTier]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (customerMode === "existing" && !selectedCustomerId) {
      toast.error("Please select a customer.");
      return;
    }

    if (customerMode === "new" && (!newCustomerName.trim() || !newCustomerPhone.trim())) {
      toast.error("Please enter the customer name and phone number.");
      return;
    }

    const finalName = packageType === "preset" ? calculatedPreset.name : customName;
    const finalSessions = packageType === "preset" ? calculatedPreset.sessions : customSessions;
    const finalPrice = packageType === "preset" ? calculatedPreset.price : customPrice;
    const finalTreatmentId =
      packageType === "preset" ? calculatedPreset.treatmentId : (customTreatmentId || undefined);

    startTransition(async () => {
      const res = await sellCustomerPackage({
        customerId: customerMode === "existing" ? selectedCustomerId : undefined,
        customerName: customerMode === "new" ? newCustomerName.trim() : undefined,
        customerPhone: customerMode === "new" ? newCustomerPhone.trim() : undefined,
        packageName: finalName,
        treatmentId: finalTreatmentId,
        branchId,
        totalSessions: finalSessions,
        pricePaid: finalPrice,
        paymentMethod,
        expiryMonths,
        notes: notes.trim() || undefined,
      });

      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(`Package "${finalName}" assigned successfully!`);
        onSuccess();
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 overflow-y-auto">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-line overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-pale/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-royal/10 text-royal flex items-center justify-center font-bold">
              <PackageOpen size={18} />
            </div>
            <div>
              <h3 className="font-bold text-ink text-base">Sell / Assign Package</h3>
              <p className="text-xs text-ink-soft">Setup 5+1 or multi-session credits for client</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-soft hover:bg-line/40 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm max-h-[80vh] overflow-y-auto">
          {/* Customer Selection */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-ink uppercase tracking-wider">
                Select Patient <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setCustomerMode("existing")}
                  className={`px-2.5 py-1 rounded-md font-semibold ${
                    customerMode === "existing" ? "bg-royal text-white" : "bg-pale text-ink-soft"
                  }`}
                >
                  Existing Patient
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerMode("new")}
                  className={`px-2.5 py-1 rounded-md font-semibold ${
                    customerMode === "new" ? "bg-royal text-white" : "bg-pale text-ink-soft"
                  }`}
                >
                  + New Patient
                </button>
              </div>
            </div>

            {customerMode === "existing" ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-3 text-ink-soft" />
                  <input
                    type="text"
                    placeholder="Search by name or phone..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full bg-white border border-line rounded-xl pl-9 pr-3.5 py-2 text-xs text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-royal/30 focus:border-royal"
                  />
                </div>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  required
                  className="w-full bg-white border border-line rounded-xl px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-royal/30 focus:border-royal"
                >
                  <option value="">-- Choose Patient ({filteredCustomers.length} found) --</option>
                  {filteredCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name} ({c.phone || "No phone"})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 bg-pale/40 p-3 rounded-xl border border-line">
                <div>
                  <label className="block text-[11px] font-semibold text-ink-soft mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Juan Dela Cruz"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="w-full bg-white border border-line rounded-lg px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-royal/30 focus:border-royal"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-ink-soft mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    placeholder="09171234567"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    className="w-full bg-white border border-line rounded-lg px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-royal/30 focus:border-royal"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Package Type Selection */}
          <div className="space-y-2 pt-2 border-t border-line">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-ink uppercase tracking-wider">
                Package Details <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setPackageType("preset")}
                  className={`px-2.5 py-1 rounded-md font-semibold ${
                    packageType === "preset" ? "bg-royal text-white" : "bg-pale text-ink-soft"
                  }`}
                >
                  Clinic Preset
                </button>
                <button
                  type="button"
                  onClick={() => setPackageType("custom")}
                  className={`px-2.5 py-1 rounded-md font-semibold ${
                    packageType === "custom" ? "bg-royal text-white" : "bg-pale text-ink-soft"
                  }`}
                >
                  Custom Package
                </button>
              </div>
            </div>

            {packageType === "preset" ? (
              <div className="space-y-3 bg-pale/40 p-3.5 rounded-xl border border-line">
                <div>
                  <label className="block text-[11px] font-semibold text-ink-soft mb-1">Select Service</label>
                  <select
                    value={selectedTemplateIndex}
                    onChange={(e) => setSelectedTemplateIndex(Number(e.target.value))}
                    className="w-full bg-white border border-line rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-royal/30 focus:border-royal"
                  >
                    {templates.map((t, idx) => (
                      <option key={t.treatment_id} value={idx}>
                        {t.treatment_name} (Single: ₱{t.session_price.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {selectedTemplate?.preset_options && selectedTemplate.preset_options.length > 0 ? (
                    selectedTemplate.preset_options.map((opt) => {
                      const isSelected =
                        presetTier === opt.label ||
                        (!selectedTemplate.preset_options?.some((o) => o.label === presetTier) &&
                          opt === selectedTemplate.preset_options?.[0]);
                      return (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => setPresetTier(opt.label)}
                          className={`flex-1 min-w-[140px] py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                            isSelected
                              ? "bg-royal text-white border-royal shadow-xs"
                              : "bg-white text-ink border-line hover:bg-pale"
                          }`}
                        >
                          {opt.label} ({opt.sessions} Sessions)
                        </button>
                      );
                    })
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setPresetTier("5+1")}
                        className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                          presetTier === "5+1"
                            ? "bg-royal text-white border-royal shadow-xs"
                            : "bg-white text-ink border-line hover:bg-pale"
                        }`}
                      >
                        5 + 1 Sessions (6 Total)
                      </button>
                      {selectedTemplate?.ten_plus_two_price && (
                        <button
                          type="button"
                          onClick={() => setPresetTier("10+2")}
                          className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                            presetTier === "10+2"
                              ? "bg-royal text-white border-royal shadow-xs"
                              : "bg-white text-ink border-line hover:bg-pale"
                          }`}
                        >
                          10 + 2 Sessions (12 Total)
                        </button>
                      )}
                    </>
                  )}
                </div>

                <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-line text-xs font-medium">
                  <span className="text-ink-soft">Package Price:</span>
                  <span className="font-mono font-bold text-royal text-sm">
                    ₱{calculatedPreset.price.toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3 bg-pale/40 p-3.5 rounded-xl border border-line">
                {allTreatments.length > 0 && (
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-soft mb-1">
                      Base Service / Treatment (Optional Quick-Fill)
                    </label>
                    <select
                      value={customTreatmentId}
                      onChange={(e) => {
                        const tid = e.target.value;
                        setCustomTreatmentId(tid);
                        const found = allTreatments.find((t) => t.id === tid);
                        if (found) {
                          const isPenile = found.name.toLowerCase().includes("penile");
                          const defaultSessions = isPenile ? 2 : 5;
                          const defaultPrice = (found.session_price || 0) * defaultSessions;
                          setCustomName(`${found.name} (${defaultSessions} Sessions)`);
                          setCustomSessions(defaultSessions);
                          setCustomPrice(defaultPrice);
                        }
                      }}
                      className="w-full bg-white border border-line rounded-lg px-3 py-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-royal/30 focus:border-royal"
                    >
                      <option value="">-- Choose a Service (e.g. Penile Enhancement) or type below --</option>
                      {allTreatments.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} (₱{Number(t.session_price || 0).toLocaleString()} / session)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-[11px] font-semibold text-ink-soft mb-1">Package Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Penile Enhancement (2 Sessions)"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full bg-white border border-line rounded-lg px-3 py-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-royal/30 focus:border-royal"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-soft mb-1">Total Sessions</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={50}
                      value={customSessions}
                      onChange={(e) => {
                        const s = Number(e.target.value);
                        setCustomSessions(s);
                        // If treatment selected and user hasn't overridden price manually, re-calculate
                        if (customTreatmentId) {
                          const found = allTreatments.find((t) => t.id === customTreatmentId);
                          if (found) setCustomPrice((found.session_price || 0) * s);
                        }
                      }}
                      className="w-full bg-white border border-line rounded-lg px-3 py-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-royal/30 focus:border-royal"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-ink-soft mb-1">Price Paid (₱)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={customPrice}
                      onChange={(e) => setCustomPrice(Number(e.target.value))}
                      className="w-full bg-white border border-line rounded-lg px-3 py-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-royal/30 focus:border-royal"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment & Branch Info */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-line">
            <div>
              <label className="block text-[11px] font-semibold text-ink-soft mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-white border border-line rounded-lg px-3 py-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-royal/30 focus:border-royal"
              >
                <option value="cash">Cash</option>
                <option value="maya">Maya / E-Wallet</option>
                <option value="credit_card">Credit / Debit Card</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-ink-soft mb-1">Branch</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full bg-white border border-line rounded-lg px-3 py-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-royal/30 focus:border-royal"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Expiration & Notes */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-ink-soft mb-1">Validity (Months)</label>
              <input
                type="number"
                min={1}
                max={36}
                value={expiryMonths}
                onChange={(e) => setExpiryMonths(Number(e.target.value))}
                className="w-full bg-white border border-line rounded-lg px-3 py-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-royal/30 focus:border-royal"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-ink-soft mb-1">Notes (Optional)</label>
              <input
                type="text"
                placeholder="Official Receipt #, Promo, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-white border border-line rounded-lg px-3 py-2 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-royal/30 focus:border-royal"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2.5 rounded-xl border border-line text-sm font-semibold text-ink hover:bg-pale transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl bg-royal text-white text-sm font-bold shadow-md hover:bg-royal/90 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Confirm & Assign Package
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

