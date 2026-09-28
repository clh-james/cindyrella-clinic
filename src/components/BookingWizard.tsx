"use client";

import { useMemo, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, Search, ArrowRight, X } from "lucide-react";
import type { Branch, Treatment, PaymentMethod, PromoCode } from "@/lib/supabase/types";
import { createBooking } from "@/app/(site)/booking/actions";
import { validatePromoCode } from "@/app/(site)/booking/validatePromo";

const steps = [
  "Treatment",
  "Branch",
  "Date",
  "Time",
  "Your info",
  "Review",
  "Payment",
];

const timeSlots = ["9AM", "10AM", "11AM", "1PM", "2PM", "3PM", "4PM", "5PM"];

const paymentOptions: { value: PaymentMethod; label: string }[] = [
  { value: "gcash", label: "GCash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "maya", label: "Maya" },
  { value: "cash", label: "Cash" },
  { value: "credit_card", label: "Credit Card" },
];

const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;

type Customer = {
  firstName: string;
  lastName: string;
  birthday: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  medicalConditions: string;
  allergies: string;
  pregnant: string;
  emergencyContact: string;
  notes: string;
  agreeToTerms: boolean;
};

const emptyCustomer: Customer = {
  firstName: "",
  lastName: "",
  birthday: "",
  gender: "",
  phone: "",
  email: "",
  address: "",
  medicalConditions: "",
  allergies: "",
  pregnant: "",
  emergencyContact: "",
  notes: "",
  agreeToTerms: false,
};

function nextDates(count: number) {
  const out: { label: string; iso: string }[] = [];
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (out.length < count) {
    if (d.getDay() !== 0) {
      out.push({
        label: d.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        iso: d.toISOString().slice(0, 10),
      });
    }
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function localReference() {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 90000 + 10000);
  return `CMG-${year}${rand}`;
}

export function BookingWizard({
  treatments,
  branches,
  live,
}: {
  treatments: Treatment[];
  branches: Branch[];
  live: boolean;
}) {
  const [step, setStep] = useState(0);
  const [treatmentId, setTreatmentId] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [date, setDate] = useState<{ label: string; iso: string } | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer>(emptyCustomer);
  const [payment, setPayment] = useState<PaymentMethod | null>(null);
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Treatment step specifics
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const dates = useMemo(() => nextDates(10), []);
  const treatment = treatments.find((t) => t.id === treatmentId);
  const branch = branches.find((b) => b.id === branchId);

  // Derive categories from actual DB data
  const categories = useMemo(() => {
    const cats = Array.from(new Set(treatments.map((t) => t.category).filter(Boolean)));
    return ["All", ...cats];
  }, [treatments]);

  const filteredTreatments = useMemo(() => {
    return treatments.filter((t) => {
      const matchCat = selectedCategory === "All" || t.category === selectedCategory;
      const matchSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [treatments, selectedCategory, searchQuery]);

  const calculateDiscountedPrice = () => {
    if (!treatment) return 0;
    if (!appliedPromo) return treatment.session_price;
    if (appliedPromo.discount_type === 'fixed') {
      return Math.max(0, treatment.session_price - appliedPromo.discount_value);
    }
    return Math.max(0, treatment.session_price * (1 - appliedPromo.discount_value / 100));
  };

  const canContinue = (() => {
    switch (step) {
      case 0: return !!treatmentId;
      case 1: return !!branchId;
      case 2: return !!date;
      case 3: return !!time;
      case 4:
        return !!(customer.firstName && customer.lastName && customer.phone && customer.email);
      case 5: 
        return customer.agreeToTerms;
      case 6: return !!payment;
      default: return false;
    }
  })();

  function setField<K extends keyof Customer>(key: K, value: Customer[K]) {
    setCustomer((c) => ({ ...c, [key]: value }));
  }

  async function submit() {
    if (!treatment || !branch || !date || !time || !payment) return;
    setSubmitting(true);
    setError(null);

    if (!live) {
      await new Promise((r) => setTimeout(r, 500));
      setConfirmed(localReference());
      setSubmitting(false);
      return;
    }

    const result = await createBooking({
      treatmentId: treatment.id,
      branchId: branch.id,
      date: date.iso,
      time,
      paymentMethod: (payment === "maya" ? "bank_transfer" : payment) as PaymentMethod,
      amountDue: calculateDiscountedPrice(),
      applied_promo_code: appliedPromo?.id,
      customer: {
        first_name: customer.firstName,
        last_name: customer.lastName,
        birthday: customer.birthday || null,
        gender: customer.gender || null,
        phone: customer.phone,
        email: customer.email,
        address: customer.address || null,
        medical_conditions: customer.notes ? `${customer.medicalConditions || ''} | Notes: ${customer.notes}` : (customer.medicalConditions || null),
        allergies: customer.allergies || null,
        is_pregnant: customer.pregnant ? customer.pregnant.toLowerCase() === "yes" : null,
        emergency_contact: customer.emergencyContact || null,
      },
    });

    setSubmitting(false);
    if (result.ok) {
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      setConfirmed(result.referenceNumber);
    } else {
      setError(result.error);
    }
  }

  // Focus effect for moving to next step
  const handleContinue = () => {
    if (canContinue && step < steps.length - 1) {
      setStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (confirmed) {
    return (
      <div className="mt-14 rounded-2xl border border-line p-10 text-center max-w-2xl mx-auto shadow-sm bg-white">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-royal/10">
          <Check className="text-royal" size={32} />
        </div>
        <h2 className="mt-6 font-serif text-3xl font-semibold text-ink">
          Booking confirmed
        </h2>
        <p className="mt-3 text-ink-soft text-lg">
          A confirmation has been sent to <span className="font-medium text-ink">{customer.email}</span>.
        </p>
        <div className="mt-8 mb-8 pt-6 border-t border-line">
          <p className="text-sm uppercase tracking-wider font-semibold text-ink-soft mb-2">Reference Number</p>
          <p className="font-mono text-2xl font-bold tracking-widest text-royal">
            {confirmed}
          </p>
        </div>
        
        <div className="mx-auto max-w-sm rounded-xl bg-pale p-6 text-left text-sm text-ink-soft border border-line/50">
          <p className="flex justify-between mb-3"><span className="text-ink-soft">Treatment</span> <span className="font-medium text-ink">{treatment?.name}</span></p>
          <p className="flex justify-between mb-3"><span className="text-ink-soft">Amount</span> <span className="font-medium text-ink">{peso(treatment?.session_price ?? 0)}</span></p>
          <p className="flex justify-between mb-3"><span className="text-ink-soft">Branch</span> <span className="font-medium text-ink">{branch?.name}</span></p>
          <p className="flex justify-between mb-3"><span className="text-ink-soft">Date & Time</span> <span className="font-medium text-ink">{date?.label} at {time}</span></p>
          <p className="flex justify-between"><span className="text-ink-soft">Payment</span> <span className="font-medium text-ink">{paymentOptions.find((p) => p.value === payment)?.label}</span></p>
        </div>

        {payment !== "cash" && (
          <div className="mx-auto mt-8 max-w-sm rounded-xl border border-line p-8 bg-white shadow-md relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-royal"></div>
            <h3 className="font-semibold text-ink text-xl mb-3">Secure Your Slot</h3>
            <p className="text-sm text-ink-soft mb-6 leading-relaxed">
              Please scan the QR code below using your <strong className="text-ink">{paymentOptions.find((p) => p.value === payment)?.label}</strong> app to pay the deposit. 
              <br/><br/>
              <strong>Important:</strong> Put your reference number (<span className="text-royal font-mono bg-royal/5 px-1 rounded">{confirmed}</span>) in the payment notes.
            </p>
            <div className="bg-pale/50 p-4 rounded-xl border border-line mb-6 w-full text-center">
              <img 
                src="/payment_qr.png" 
                alt="Payment QR Code" 
                className="w-full max-w-[240px] mx-auto rounded-lg shadow-sm" 
              />
            </div>
            <p className="text-xs text-ink-soft bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-yellow-800">
              Your appointment will be verified by our staff once payment is received.
            </p>
          </div>
        )}

        <a href="/manage" className="mt-8 inline-block text-sm font-medium text-royal hover:text-royal-deep underline underline-offset-4">
          Need to reschedule or cancel?
        </a>
      </div>
    );
  }

  const renderDesktopStepper = () => (
    <div className="hidden md:block mb-10 w-full overflow-hidden">
      <div className="flex items-center justify-between relative">
        {/* Connecting Line */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-line -z-10" />
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-royal -z-10 transition-all duration-500 ease-in-out"
          style={{ width: `${(step / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((label, i) => {
          const isActive = i === step;
          const isCompleted = i < step;
          
          return (
            <button
              key={label}
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              className={`flex flex-col items-center gap-2 bg-paper px-2 ${isActive ? 'cursor-default' : isCompleted ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-50'}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                isActive 
                  ? "bg-royal text-white shadow-md ring-4 ring-royal/10" 
                  : isCompleted 
                    ? "bg-royal text-white" 
                    : "bg-pale border-2 border-line text-ink-soft"
              }`}>
                {isCompleted ? <Check size={16} /> : i + 1}
              </div>
              <span className={`text-xs font-medium whitespace-nowrap ${isActive ? "text-royal" : "text-ink-soft"}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderMobileStepper = () => (
    <div className="md:hidden mb-8">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-royal">Step {step + 1} of {steps.length}</span>
        <span className="text-sm text-ink-soft">· {steps[step]}</span>
      </div>
      <div className="w-full h-1.5 bg-line rounded-full overflow-hidden">
        <div 
          className="h-full bg-royal transition-all duration-300"
          style={{ width: `${((step + 1) / steps.length) * 100}%` }}
        />
      </div>
    </div>
  );

  const renderBookingSummary = () => (
    <div className="bg-white rounded-2xl border border-line shadow-sm overflow-hidden sticky top-24">
      <div className="p-6 bg-pale/30 border-b border-line">
        <h3 className="font-serif text-xl text-ink font-semibold tracking-tight">Your Booking</h3>
      </div>
      <div className="p-6 space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1">Treatment</p>
          {treatment ? (
            <div>
              <p className="font-medium text-ink">{treatment.name}</p>
              <p className="text-sm text-ink-soft mt-0.5">{treatment.duration_minutes} min · {peso(treatment.session_price)}</p>
            </div>
          ) : (
            <p className="text-sm text-ink-soft/70 italic">Not selected</p>
          )}
        </div>

        <div className="h-px w-full bg-line/60" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1">Branch</p>
            <p className={`text-sm ${branch ? "font-medium text-ink" : "text-ink-soft/70 italic"}`}>
              {branch?.name || "Not selected"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1">Date</p>
            <p className={`text-sm ${date ? "font-medium text-ink" : "text-ink-soft/70 italic"}`}>
              {date?.label || "Not selected"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft mb-1">Time</p>
            <p className={`text-sm ${time ? "font-medium text-ink" : "text-ink-soft/70 italic"}`}>
              {time || "Not selected"}
            </p>
          </div>
        </div>

        <div className="h-px w-full bg-line/60" />

        <div className="flex items-center justify-between pt-2">
          <p className="text-sm font-semibold uppercase tracking-wider text-ink">Total</p>
          <p className="font-serif text-2xl text-royal font-medium">
            {peso(calculateDiscountedPrice())}
          </p>
        </div>
      </div>
      
      <div className="p-6 pt-0">
        {step < steps.length - 1 ? (
          <button
            onClick={handleContinue}
            disabled={!canContinue}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-royal py-3.5 text-sm font-semibold text-white transition-all hover:bg-royal-deep hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none"
          >
            Continue to {steps[step + 1]} <ArrowRight size={16} />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={!canContinue || submitting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-royal py-3.5 text-sm font-semibold text-white transition-all hover:bg-royal-deep hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Confirm booking
          </button>
        )}
      </div>
    </div>
  );

  const renderMobileBottomBar = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-line shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50 md:hidden p-4 pb-safe">
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1 truncate pr-4">
          <p className="font-semibold text-ink text-sm truncate">{treatment?.name || "No treatment selected"}</p>
          <p className="text-xs text-ink-soft mt-0.5">
            {treatment ? `${peso(calculateDiscountedPrice())} · ${treatment.duration_minutes} min` : "—"}
          </p>
        </div>
      </div>
      {step < steps.length - 1 ? (
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-royal py-3.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue <ArrowRight size={16} />
        </button>
      ) : (
        <button
          onClick={submit}
          disabled={!canContinue || submitting}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-royal py-3.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          Confirm booking
        </button>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 relative min-h-screen">
      {/* Header */}
      <div className="mb-10 text-center md:text-left">
        <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold text-ink tracking-tight mb-3">
          Book Your Cindyrella Session
        </h1>
        <p className="text-ink-soft text-lg max-w-2xl">
          Choose your treatment and we'll take care of the rest.
        </p>
      </div>

      {renderDesktopStepper()}
      {renderMobileStepper()}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] lg:grid-cols-[1fr_380px] gap-8 lg:gap-12 pb-32 md:pb-0">
        
        {/* Left Column: Form Content */}
        <div className="min-h-[500px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              
              {/* STEP 0: TREATMENT */}
              {step === 0 && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="relative w-full sm:max-w-xs">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft/50" size={18} />
                      <input 
                        type="text" 
                        placeholder="Search treatments..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal transition-all"
                      />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink">
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Categories */}
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          selectedCategory === cat 
                            ? "bg-ink text-white shadow-md" 
                            : "bg-pale text-ink-soft hover:bg-line/50"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Treatments Grid */}
                  {filteredTreatments.length === 0 ? (
                    <div className="py-20 text-center border border-dashed border-line rounded-2xl bg-pale/50">
                      <p className="text-ink font-medium text-lg mb-2">No treatments found</p>
                      <p className="text-ink-soft text-sm">Try another category or adjust your search.</p>
                      <button onClick={() => {setSearchQuery(""); setSelectedCategory("All");}} className="mt-4 text-royal text-sm font-medium hover:underline">
                        Clear filters
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                      {filteredTreatments.map((t) => {
                        const isSelected = treatmentId === t.id;
                        return (
                          <button
                            key={t.id}
                            onClick={() => setTreatmentId(t.id)}
                            className={`group relative flex flex-col text-left overflow-hidden rounded-2xl border transition-all duration-200 ${
                              isSelected 
                                ? "border-royal ring-1 ring-royal shadow-md bg-royal/5" 
                                : "border-line bg-white hover:border-royal/50 hover:shadow-sm"
                            }`}
                          >
                            <div className="relative w-full h-40 bg-pale overflow-hidden">
                              {t.image_url ? (
                                <img src={t.image_url} alt={t.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-royal/5 text-royal/20">
                                  <span className="font-serif text-3xl font-bold opacity-30">C</span>
                                </div>
                              )}
                              
                              {/* Selected Indicator */}
                              {isSelected && (
                                <div className="absolute top-3 right-3 w-7 h-7 bg-royal text-white rounded-full flex items-center justify-center shadow-lg">
                                  <Check size={16} strokeWidth={3} />
                                </div>
                              )}
                              
                              {/* Badge */}
                              {t.badge && !isSelected && (
                                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-ink px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm">
                                  {t.badge}
                                </div>
                              )}
                            </div>
                            
                            <div className="p-4 flex flex-col flex-1">
                              <h3 className="font-semibold text-ink text-base mb-1">{t.name}</h3>
                              {t.primary_desc && (
                                <p className="text-ink-soft text-xs line-clamp-2 mb-3 leading-relaxed">{t.primary_desc}</p>
                              )}
                              
                              <div className="mt-auto flex items-end justify-between pt-2">
                                <div>
                                  <p className="text-xs font-medium text-ink-soft uppercase tracking-wider mb-0.5">{t.duration_minutes} min</p>
                                  <p className="font-serif text-lg font-semibold text-royal">{peso(t.session_price)}</p>
                                </div>
                                
                                <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                  isSelected ? "bg-royal text-white" : "bg-pale text-ink group-hover:bg-royal/10 group-hover:text-royal"
                                }`}>
                                  {isSelected ? "Selected" : "Select"}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 1: BRANCH */}
              {step === 1 && (
                <div className="space-y-4">
                  <h2 className="font-serif text-2xl text-ink font-semibold mb-6">Select a Branch</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {branches.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => setBranchId(b.id)}
                        className={`relative p-5 text-left rounded-2xl border transition-all duration-200 ${
                          branchId === b.id 
                            ? "border-royal ring-1 ring-royal bg-royal/5 shadow-md" 
                            : "border-line bg-white hover:border-royal/50 hover:shadow-sm"
                        }`}
                      >
                        {branchId === b.id && (
                          <div className="absolute top-4 right-4 text-royal">
                            <Check size={20} />
                          </div>
                        )}
                        <p className={`font-semibold text-lg mb-1 ${branchId === b.id ? "text-royal" : "text-ink"}`}>{b.name}</p>
                        <p className="text-sm text-ink-soft line-clamp-2">{b.address || "Address not provided"}</p>
                        {b.phone && <p className="text-xs text-ink-soft/70 mt-3 flex items-center gap-1">📞 {b.phone}</p>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 2: DATE */}
              {step === 2 && (
                <div className="space-y-4">
                  <h2 className="font-serif text-2xl text-ink font-semibold mb-6">Choose a Date</h2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {dates.map((d) => (
                      <button
                        key={d.iso}
                        onClick={() => setDate(d)}
                        className={`p-4 text-center rounded-2xl border transition-all duration-200 ${
                          date?.iso === d.iso 
                            ? "border-royal ring-1 ring-royal bg-royal text-white shadow-md" 
                            : "border-line bg-white text-ink hover:border-royal/50 hover:bg-pale"
                        }`}
                      >
                        <p className="text-sm font-semibold mb-1">{d.label.split(',')[0]}</p>
                        <p className={`text-xs ${date?.iso === d.iso ? "text-white/80" : "text-ink-soft"}`}>
                          {d.label.split(',')[1]}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 3: TIME */}
              {step === 3 && (
                <div className="space-y-4">
                  <h2 className="font-serif text-2xl text-ink font-semibold mb-6">Choose a Time</h2>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {timeSlots.map((t) => (
                      <button
                        key={t}
                        onClick={() => setTime(t)}
                        className={`p-4 text-center rounded-2xl border transition-all duration-200 ${
                          time === t 
                            ? "border-royal ring-1 ring-royal bg-royal text-white shadow-md" 
                            : "border-line bg-white text-ink font-medium hover:border-royal/50 hover:bg-pale"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 4: YOUR INFO */}
              {step === 4 && (
                <div className="space-y-6">
                  <h2 className="font-serif text-2xl text-ink font-semibold mb-2">Your Information</h2>
                  <p className="text-sm text-ink-soft mb-6">Please provide your details so we can securely complete your booking.</p>
                  
                  <div className="bg-white rounded-2xl border border-line p-6 shadow-sm">
                    <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                      <Field label="First Name" value={customer.firstName} onChange={(v) => setField("firstName", v)} />
                      <Field label="Last Name" value={customer.lastName} onChange={(v) => setField("lastName", v)} />
                      <Field label="Birthday" type="date" value={customer.birthday} onChange={(v) => setField("birthday", v)} />
                      <Field label="Gender" value={customer.gender} onChange={(v) => setField("gender", v)} />
                      <Field label="Phone Number" value={customer.phone} onChange={(v) => setField("phone", v)} />
                      <Field label="Email Address" type="email" value={customer.email} onChange={(v) => setField("email", v)} />
                      <Field label="Home Address" value={customer.address} onChange={(v) => setField("address", v)} full />
                      
                      <div className="col-span-full h-px bg-line/60 my-2"></div>
                      <h3 className="col-span-full font-semibold text-ink">Medical Information</h3>
                      
                      <Field label="Medical Conditions" value={customer.medicalConditions} onChange={(v) => setField("medicalConditions", v)} full />
                      <Field label="Allergies" value={customer.allergies} onChange={(v) => setField("allergies", v)} />
                      <Field label="Are you pregnant?" value={customer.pregnant} onChange={(v) => setField("pregnant", v)} />
                      <Field label="Emergency Contact" value={customer.emergencyContact} onChange={(v) => setField("emergencyContact", v)} />
                      <Field label="Additional Notes" value={customer.notes} onChange={(v) => setField("notes", v)} full />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: REVIEW */}
              {step === 5 && (
                <div className="space-y-6">
                  <h2 className="font-serif text-2xl text-ink font-semibold mb-6">Review Booking</h2>
                  
                  <div className="bg-white rounded-2xl border border-line p-6 shadow-sm">
                    <h3 className="font-semibold text-ink mb-4 border-b border-line pb-4">Order Summary</h3>
                    
                    <div className="space-y-3 mb-6">
                      <SummaryRow label="Treatment" value={`${treatment?.name}`} />
                      <SummaryRow label="Subtotal" value={peso(treatment?.session_price ?? 0)} />
                      {appliedPromo && (
                        <SummaryRow 
                          label="Promo Applied" 
                          value={`-${appliedPromo.discount_type === 'fixed' ? peso(appliedPromo.discount_value) : `${appliedPromo.discount_value}%`} (${appliedPromo.code})`} 
                        />
                      )}
                      <div className="pt-3 border-t border-line/50 mt-3">
                        <SummaryRow label="Total Amount" value={peso(calculateDiscountedPrice())} isBold />
                      </div>
                    </div>

                    <div className="bg-pale rounded-xl p-5 mb-6">
                      <label className="text-sm font-semibold text-ink block mb-2">Have a promo code?</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={promoCodeInput}
                          onChange={(e) => {
                            setPromoCodeInput(e.target.value.toUpperCase());
                            setPromoError(null);
                            setPromoSuccess(null);
                          }}
                          placeholder="Enter code" 
                          className="flex-1 rounded-xl border border-line px-4 py-2.5 text-sm text-ink outline-none focus:border-royal bg-white"
                        />
                        <button 
                          type="button"
                          onClick={async () => {
                            if (!promoCodeInput) return;
                            setPromoError(null);
                            setPromoSuccess(null);
                            const result = await validatePromoCode(promoCodeInput);
                            if (result.error) {
                              setPromoError(result.error);
                              setAppliedPromo(null);
                            } else if (result.promo) {
                              setAppliedPromo(result.promo);
                              setPromoSuccess("Promo applied successfully!");
                            }
                          }}
                          className="rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink/80"
                        >
                          Apply
                        </button>
                      </div>
                      {promoError && <p className="mt-2 text-xs font-medium text-red-600 flex items-center gap-1"><X size={12}/> {promoError}</p>}
                      {promoSuccess && <p className="mt-2 text-xs font-medium text-green-600 flex items-center gap-1"><Check size={12}/> {promoSuccess}</p>}
                    </div>

                    <label className="flex items-start gap-3 p-1 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={customer.agreeToTerms}
                        onChange={(e) => setField("agreeToTerms", e.target.checked)}
                        className="mt-1 h-5 w-5 shrink-0 rounded border-line text-royal focus:ring-royal transition-all cursor-pointer"
                      />
                      <span className="text-sm text-ink-soft leading-relaxed">
                        I have read and agree to the <a href="/terms" target="_blank" className="text-royal font-medium hover:underline">Terms & Conditions</a> and <a href="/privacy" target="_blank" className="text-royal font-medium hover:underline">Privacy Policy</a> of Cindyrella Medical Group.
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* STEP 6: PAYMENT */}
              {step === 6 && (
                <div className="space-y-6">
                  <h2 className="font-serif text-2xl text-ink font-semibold mb-2">Payment Method</h2>
                  <p className="text-sm text-ink-soft mb-6">Select how you would like to pay for your session.</p>
                  
                  <div className="grid gap-4 sm:grid-cols-2">
                    {paymentOptions.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => setPayment(m.value)}
                        className={`relative p-5 text-left rounded-2xl border transition-all duration-200 ${
                          payment === m.value 
                            ? "border-royal ring-1 ring-royal bg-royal/5 shadow-md" 
                            : "border-line bg-white hover:border-royal/50 hover:shadow-sm"
                        }`}
                      >
                        {payment === m.value && (
                          <div className="absolute top-4 right-4 text-royal bg-white rounded-full shadow-sm">
                            <Check size={20} />
                          </div>
                        )}
                        <p className={`font-semibold text-lg ${payment === m.value ? "text-royal" : "text-ink"}`}>{m.label}</p>
                      </button>
                    ))}
                  </div>
                  
                  <div className="bg-pale/50 rounded-xl p-4 border border-line flex gap-3 items-start mt-6">
                    <div className="mt-0.5 text-royal">ℹ️</div>
                    <p className="text-sm text-ink-soft leading-relaxed">
                      For online payments (GCash, Maya, Bank Transfer), a deposit secures your slot. The remaining balance will be settled at the clinic after your treatment.
                    </p>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
          
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
              <X className="text-red-500 mt-0.5 shrink-0" size={18} />
              <p className="text-sm font-medium text-red-700">{error}</p>
            </div>
          )}

          {/* Desktop Navigation Buttons (hidden on mobile, replaced by bottom bar) */}
          <div className="hidden md:flex mt-12 items-center justify-between border-t border-line pt-8">
            <button
              onClick={() => {
                setStep((s) => Math.max(0, s - 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={step === 0 || submitting}
              className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all ${
                step === 0 || submitting ? "opacity-0 cursor-default" : "bg-white border border-line text-ink hover:bg-pale hover:border-line/80 shadow-sm"
              }`}
            >
              Back
            </button>
          </div>
        </div>

        {/* Right Column: Sticky Summary (Desktop Only) */}
        <div className="hidden md:block">
          {renderBookingSummary()}
        </div>
      </div>

      {/* Mobile Bottom Fixed Bar */}
      {renderMobileBottomBar()}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  full = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  full?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm ${full ? "sm:col-span-2" : ""}`}>
      <span className="font-semibold text-ink">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-line px-4 py-3 text-ink outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal transition-all bg-pale/30 focus:bg-white"
      />
    </label>
  );
}

function SummaryRow({ label, value, isBold = false }: { label: string; value: string, isBold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className={`${isBold ? "font-semibold text-ink" : "text-ink-soft"}`}>{label}</span>
      <span className={`${isBold ? "font-semibold text-royal text-base" : "font-medium text-ink"}`}>{value}</span>
    </div>
  );
}
