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
  "Your Info",
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

const PREFERRED_CATEGORY_ORDER = [
  "IV Treatment",
  "IPL Hair Removal",
  "Hair Waxing",
  "Breast Augmentation",
  "Butt Augmentation",
  "Nail Care",
  "Eyelash Extension",
  "PRP Treatment",
  "Facial & Warts",
  "Contouring & Whitening",
  "Piercings",
  "Queen's Intimate Treatment",
  "King's Treatment"
];

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
  const [isLoading, setIsLoading] = useState(true);

  // Treatment step specifics
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  useEffect(() => {
    // Simulate initial loading state for smoother entry
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const dates = useMemo(() => nextDates(10), []);
  const treatment = treatments.find((t) => t.id === treatmentId);
  const branch = branches.find((b) => b.id === branchId);

  // Derive categories using preferred order
  const categories = useMemo(() => {
    const activeCats = new Set(treatments.map((t) => t.category).filter(Boolean) as string[]);
    const sortedCats = PREFERRED_CATEGORY_ORDER.filter(c => activeCats.has(c));
    const otherCats = Array.from(activeCats).filter(c => !PREFERRED_CATEGORY_ORDER.includes(c));
    return [...sortedCats, ...otherCats];
  }, [treatments]);

  const activeCategory = selectedCategory || categories[0] || "";

  const filteredTreatments = useMemo(() => {
    let result = treatments;
    
    if (activeCategory) {
      result = result.filter(t => t.category === activeCategory);
    }
    
    if (searchQuery) {
      result = result.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    
    // Sort by preferred category order
    return [...result].sort((a, b) => {
      if (!a.category || !b.category) return 0;
      
      const idxA = PREFERRED_CATEGORY_ORDER.indexOf(a.category);
      const idxB = PREFERRED_CATEGORY_ORDER.indexOf(b.category);
      
      const realIdxA = idxA === -1 ? 999 : idxA;
      const realIdxB = idxB === -1 ? 999 : idxB;
      
      if (realIdxA !== realIdxB) {
        return realIdxA - realIdxB;
      }
      return 0; // retain original sort_order within same category
    });
  }, [treatments, activeCategory, searchQuery]);

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

  const handleContinue = () => {
    if (canContinue && step < steps.length - 1) {
      setStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getStepTitle = () => {
    switch(step) {
      case 0: return "Choose your treatment";
      case 1: return "Select a branch";
      case 2: return "Choose a date";
      case 3: return "Choose a time";
      case 4: return "Your details";
      case 5: return "Review booking";
      case 6: return "Payment method";
      default: return "";
    }
  }

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

  const renderStepper = () => (
    <div className="w-full mb-8 relative hidden md:block">
      <div className="flex items-center justify-between relative px-2">
        <div className="absolute left-0 top-[11px] w-full h-[2px] bg-line -z-10" />
        <div 
          className="absolute left-0 top-[11px] h-[2px] bg-royal -z-10 transition-all duration-500 ease-in-out"
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
              className={`flex flex-col items-center gap-1.5 bg-paper px-2 ${isActive ? 'cursor-default' : isCompleted ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-50'}`}
            >
              <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-bold transition-colors ${
                isActive 
                  ? "bg-royal text-white ring-4 ring-royal/10" 
                  : isCompleted 
                    ? "bg-royal text-white" 
                    : "bg-pale border-2 border-line text-ink-soft"
              }`}>
                {isCompleted ? <Check size={12} strokeWidth={3} /> : `0${i + 1}`}
              </div>
              <span className={`text-[11px] font-semibold tracking-wide whitespace-nowrap ${isActive ? "text-ink" : "text-ink-soft"}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderBookingSummary = () => (
    <div className="bg-white rounded-xl border border-line shadow-sm overflow-hidden sticky top-24">
      <div className="p-5 bg-pale/30 border-b border-line">
        <h3 className="font-serif text-lg text-ink font-semibold tracking-tight uppercase text-xs tracking-wider">Your Booking</h3>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft mb-1">Treatment</p>
          {treatment ? (
            <div>
              <p className="font-medium text-ink text-sm">{treatment.name}</p>
              <p className="text-xs text-ink-soft mt-0.5">{treatment.duration_minutes} min</p>
            </div>
          ) : (
            <p className="text-xs text-ink-soft/70 italic">Not selected</p>
          )}
        </div>

        <div className="h-px w-full bg-line/60" />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft mb-1">Branch</p>
            <p className={`text-xs ${branch ? "font-medium text-ink" : "text-ink-soft/70 italic"}`}>
              {branch?.name || "Not selected"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft mb-1">Date</p>
            <p className={`text-xs ${date ? "font-medium text-ink" : "text-ink-soft/70 italic"}`}>
              {date?.label || "Not selected"}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft mb-1">Time</p>
            <p className={`text-xs ${time ? "font-medium text-ink" : "text-ink-soft/70 italic"}`}>
              {time || "Not selected"}
            </p>
          </div>
        </div>

        <div className="h-px w-full bg-line/60" />

        <div className="flex items-center justify-between pt-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Total</p>
          <p className="font-serif text-xl text-royal font-medium">
            {peso(calculateDiscountedPrice())}
          </p>
        </div>
      </div>
      
      <div className="p-5 pt-0">
        {step < steps.length - 1 ? (
          <button
            onClick={handleContinue}
            disabled={!canContinue}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-royal py-3 text-sm font-semibold text-white transition-all hover:bg-royal-deep disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue <ArrowRight size={16} />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={!canContinue || submitting}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-royal py-3 text-sm font-semibold text-white transition-all hover:bg-royal-deep disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Confirm booking
          </button>
        )}
      </div>
    </div>
  );

  const renderMobileBottomBar = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-line shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-[60] md:hidden pb-safe">
      <div className="p-4">
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
    </div>
  );

  return (
    <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-32 md:py-10 relative min-h-[80vh] overflow-x-hidden md:overflow-x-visible">
      {/* Page Header */}
      <div className="mb-8 text-left">
        <h1 className="font-serif text-[28px] md:text-[36px] font-semibold text-ink tracking-tight mb-2">
          Book Your Cindyrella Session
        </h1>
        <p className="text-ink-soft text-sm md:text-base max-w-2xl mb-4">
          Choose your treatment and we&apos;ll take care of the rest.
        </p>
        <p className="text-xs md:text-sm font-semibold text-royal tracking-wide uppercase">
          Step {step + 1} of {steps.length} <span className="text-ink-soft/40 mx-1">·</span> <span className="text-ink-soft font-medium capitalize">{getStepTitle()}</span>
        </p>
      </div>

      {renderStepper()}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] lg:grid-cols-[1fr_340px] gap-8 lg:gap-10">
        
        {/* Left Column: Form Content */}
        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              
              {/* STEP 0: TREATMENT */}
              {step === 0 && (
                <div className="space-y-6">
                  
                  {/* Search and Categories Box */}
                  <div className="space-y-4">
                    <div className="relative w-full md:w-[360px]">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft/50" size={16} />
                      <input 
                        type="text" 
                        placeholder="Search treatments..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-line rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-royal/50 focus:border-royal transition-all placeholder:text-ink-soft/60"
                      />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink">
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    <div className="overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0">
                      <div className="flex space-x-3 w-max">
                        {categories.map(cat => (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
                              activeCategory === cat 
                                ? 'bg-royal text-white shadow-md ring-1 ring-royal'
                                : 'bg-pale text-ink hover:bg-pale/80 hover:text-royal'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Active Category Content */}
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeCategory && !searchQuery && (
                      <h2 className="font-serif text-3xl font-semibold text-ink border-b border-line pb-4 mb-8">
                        {activeCategory}
                      </h2>
                    )}
                    {searchQuery && (
                      <h2 className="font-serif text-2xl font-semibold text-ink border-b border-line pb-4 mb-8">
                        Search Results for "{searchQuery}"
                      </h2>
                    )}

                  {/* Treatments Grid */}
                  {isLoading ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
                        {[1,2,3,4].map(i => (
                          <div key={i} className="rounded-xl border border-line bg-white overflow-hidden flex flex-col h-[280px] w-full max-w-[360px] mx-auto">
                            <div className="w-full aspect-[16/7] md:aspect-[16/6] bg-pale animate-pulse"></div>
                            <div className="p-4 flex-1 flex flex-col">
                              <div className="w-3/4 h-5 bg-pale animate-pulse rounded mb-2"></div>
                              <div className="w-full h-3 bg-pale animate-pulse rounded mb-1"></div>
                              <div className="w-2/3 h-3 bg-pale animate-pulse rounded mb-auto"></div>
                              <div className="flex justify-between items-end mt-4">
                                <div>
                                  <div className="w-12 h-3 bg-pale animate-pulse rounded mb-1"></div>
                                  <div className="w-16 h-5 bg-pale animate-pulse rounded"></div>
                                </div>
                                <div className="w-20 h-8 bg-pale animate-pulse rounded-lg"></div>
                              </div>
                            </div>
                          </div>
                        ))}
                     </div>
                  ) : filteredTreatments.length === 0 ? (
                    <div className="py-16 text-center border border-dashed border-line rounded-xl bg-pale/30">
                      <p className="text-ink font-medium text-[15px] mb-1">No treatments found</p>
                      <p className="text-ink-soft text-sm">Try adjusting your search or category.</p>
                      <button onClick={() => {setSearchQuery(""); setSelectedCategory(categories[0] || "");}} className="mt-3 text-royal text-sm font-medium hover:underline">
                        Clear filters
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredTreatments.map((t) => {
                        const isSelected = treatmentId === t.id;
                        return (
                          <button
                            key={t.id}
                            onClick={() => setTreatmentId(t.id)}
                            className={`group h-full w-full max-w-[360px] mx-auto flex flex-col text-left rounded-2xl bg-[#18120F] shadow-lg transition-all duration-300 overflow-hidden relative ${
                              isSelected
                                ? "ring-2 ring-royal -translate-y-2 shadow-[0_20px_40px_-10px_rgba(30,58,138,0.3)]"
                                : "hover:-translate-y-2 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)]"
                            }`}
                          >
                            {/* Image Area */}
                            <div className="relative aspect-video w-full overflow-hidden bg-[#18120F]">
                              {t.image_url ? (
                                <img
                                  src={t.image_url}
                                  alt={t.name}
                                  className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-white/30 font-medium">
                                  <span className="text-sm">Image coming soon</span>
                                </div>
                              )}
                              
                              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#18120F] to-transparent pointer-events-none" />
                            </div>

                            <div className="flex flex-col justify-between p-5 pt-1 flex-1 bg-[#18120F] z-10 relative">
                              <div className="flex flex-col gap-2">
                                <div className="flex items-start justify-between gap-2">
                                  <h3 className="font-serif text-lg font-semibold text-white leading-tight pr-2">
                                    {t.name}
                                  </h3>
                                  {t.badge && (
                                    <span className="whitespace-nowrap rounded-full bg-[#d4af82] px-2.5 py-0.5 text-[10px] font-bold text-[#332211] uppercase tracking-wider shadow-sm mt-0.5 shrink-0">
                                      {t.badge}
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-baseline gap-1">
                                  <span className="text-2xl font-bold text-[#d4af82]">
                                    {peso(t.session_price)}
                                  </span>
                                  <span className="text-xs text-white/50 ml-2">{t.duration_minutes} min</span>
                                </div>

                                <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2">
                                  {(t.best_for ? t.best_for.split(',') : (t.primary_desc ? [t.primary_desc] : [])).slice(0, 4).map((feature: string, i: number) => (
                                    <li key={i} className="flex items-start gap-1.5">
                                      <Check size={14} className="shrink-0 text-[#d4af82] mt-0.5" />
                                      <span className="text-xs text-white/90 leading-snug">{feature.trim()}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              
                              <div className="mt-5">
                                <div className={`w-full rounded-full px-4 py-2.5 text-center text-sm font-medium transition-colors ${
                                  isSelected
                                    ? "bg-royal text-white"
                                    : "bg-white/10 text-white group-hover:bg-royal group-hover:text-white"
                                }`}>
                                  {isSelected ? "✓ Selected" : "Select"}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  </div>
                </div>
              )}

              {/* STEP 1: BRANCH */}
              {step === 1 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {branches.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setBranchId(b.id)}
                      className={`relative p-5 text-left rounded-xl border transition-all duration-200 ${
                        branchId === b.id 
                          ? "border-royal ring-1 ring-royal bg-royal/[0.02]" 
                          : "border-line bg-white hover:border-royal/40"
                      }`}
                    >
                      {branchId === b.id && (
                        <div className="absolute top-4 right-4 text-royal bg-white rounded-full">
                          <Check size={18} />
                        </div>
                      )}
                      <p className={`font-semibold text-[16px] mb-1.5 ${branchId === b.id ? "text-royal" : "text-ink"}`}>{b.name}</p>
                      <p className="text-[13px] text-ink-soft leading-relaxed">{b.address || "Address not provided"}</p>
                      {b.phone && <p className="text-[12px] text-ink-soft/70 mt-3 font-medium">📞 {b.phone}</p>}
                    </button>
                  ))}
                </div>
              )}

              {/* STEP 2: DATE */}
              {step === 2 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {dates.map((d) => (
                    <button
                      key={d.iso}
                      onClick={() => setDate(d)}
                      className={`p-4 text-center rounded-xl border transition-all duration-200 flex flex-col items-center justify-center h-[90px] ${
                        date?.iso === d.iso 
                          ? "border-royal ring-1 ring-royal bg-royal text-white shadow-sm" 
                          : "border-line bg-white text-ink hover:border-royal/40 hover:bg-pale/50"
                      }`}
                    >
                      <p className="text-[15px] font-semibold mb-0.5">{d.label.split(',')[0]}</p>
                      <p className={`text-[12px] font-medium ${date?.iso === d.iso ? "text-white/80" : "text-ink-soft"}`}>
                        {d.label.split(',')[1]}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {/* STEP 3: TIME */}
              {step === 3 && (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {timeSlots.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTime(t)}
                      className={`p-3.5 text-center rounded-xl border transition-all duration-200 text-[14px] ${
                        time === t 
                          ? "border-royal ring-1 ring-royal bg-royal text-white shadow-sm" 
                          : "border-line bg-white text-ink font-medium hover:border-royal/40 hover:bg-pale/50"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}

              {/* STEP 4: YOUR INFO */}
              {step === 4 && (
                <div className="bg-white rounded-xl border border-line p-5 md:p-6 shadow-sm">
                  <p className="text-[13px] text-ink-soft mb-5 border-b border-line pb-4">Please provide your details so we can securely complete your booking.</p>
                  <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                    <Field label="First Name" value={customer.firstName} onChange={(v) => setField("firstName", v)} />
                    <Field label="Last Name" value={customer.lastName} onChange={(v) => setField("lastName", v)} />
                    <Field label="Birthday" type="date" value={customer.birthday} onChange={(v) => setField("birthday", v)} />
                    <Field label="Gender" value={customer.gender} onChange={(v) => setField("gender", v)} />
                    <Field label="Phone Number" value={customer.phone} onChange={(v) => setField("phone", v)} />
                    <Field label="Email Address" type="email" value={customer.email} onChange={(v) => setField("email", v)} />
                    <Field label="Home Address" value={customer.address} onChange={(v) => setField("address", v)} full />
                    
                    <div className="col-span-full h-px bg-line/60 my-2"></div>
                    <h3 className="col-span-full font-semibold text-[15px] text-ink">Medical Information</h3>
                    
                    <Field label="Medical Conditions" value={customer.medicalConditions} onChange={(v) => setField("medicalConditions", v)} full />
                    <Field label="Allergies" value={customer.allergies} onChange={(v) => setField("allergies", v)} />
                    <Field label="Are you pregnant?" value={customer.pregnant} onChange={(v) => setField("pregnant", v)} />
                    <Field label="Emergency Contact" value={customer.emergencyContact} onChange={(v) => setField("emergencyContact", v)} />
                    <Field label="Additional Notes" value={customer.notes} onChange={(v) => setField("notes", v)} full />
                  </div>
                </div>
              )}

              {/* STEP 5: REVIEW */}
              {step === 5 && (
                <div className="bg-white rounded-xl border border-line p-5 md:p-6 shadow-sm">
                  <h3 className="font-semibold text-ink text-[16px] mb-4 border-b border-line pb-4">Order Summary</h3>
                  
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

                  <div className="bg-pale/50 border border-line rounded-lg p-4 mb-6">
                    <label className="text-[13px] font-semibold text-ink block mb-2">Have a promo code?</label>
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
                        className="flex-1 rounded-lg border border-line px-3 py-2 text-[13px] text-ink outline-none focus:border-royal bg-white"
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
                        className="rounded-lg bg-ink px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-ink/80"
                      >
                        Apply
                      </button>
                    </div>
                    {promoError && <p className="mt-2 text-[12px] font-medium text-red-600 flex items-center gap-1"><X size={12}/> {promoError}</p>}
                    {promoSuccess && <p className="mt-2 text-[12px] font-medium text-green-600 flex items-center gap-1"><Check size={12}/> {promoSuccess}</p>}
                  </div>

                  <label className="flex items-start gap-3 p-1 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={customer.agreeToTerms}
                      onChange={(e) => setField("agreeToTerms", e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-royal focus:ring-royal transition-all cursor-pointer"
                    />
                    <span className="text-[13px] text-ink-soft leading-relaxed">
                      I have read and agree to the <a href="/terms" target="_blank" className="text-royal font-medium hover:underline">Terms & Conditions</a> and <a href="/privacy" target="_blank" className="text-royal font-medium hover:underline">Privacy Policy</a> of Cindyrella Medical Group.
                    </span>
                  </label>
                </div>
              )}

              {/* STEP 6: PAYMENT */}
              {step === 6 && (
                <div className="space-y-5">
                  <p className="text-[13px] text-ink-soft mb-2">Select how you would like to pay for your session.</p>
                  
                  <div className="grid gap-3 sm:grid-cols-2">
                    {paymentOptions.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => setPayment(m.value)}
                        className={`relative p-4 text-left rounded-xl border transition-all duration-200 ${
                          payment === m.value 
                            ? "border-royal ring-1 ring-royal bg-royal/[0.02]" 
                            : "border-line bg-white hover:border-royal/40"
                        }`}
                      >
                        {payment === m.value && (
                          <div className="absolute top-1/2 -translate-y-1/2 right-4 text-royal bg-white rounded-full shadow-sm">
                            <Check size={16} strokeWidth={3} />
                          </div>
                        )}
                        <p className={`font-semibold text-[15px] ${payment === m.value ? "text-royal" : "text-ink"}`}>{m.label}</p>
                      </button>
                    ))}
                  </div>
                  
                  <div className="bg-pale/40 rounded-lg p-4 border border-line flex gap-2.5 items-start mt-2">
                    <div className="mt-0.5 text-royal text-sm">ℹ️</div>
                    <p className="text-[12px] text-ink-soft leading-relaxed">
                      For online payments (GCash, Maya, Bank Transfer), a deposit secures your slot. The remaining balance will be settled at the clinic after your treatment.
                    </p>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
          
          {error && (
            <div className="mt-5 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
              <X className="text-red-500 mt-0.5 shrink-0" size={16} />
              <p className="text-[13px] font-medium text-red-700 leading-relaxed">{error}</p>
            </div>
          )}

          {/* Desktop Navigation Back Button */}
          {step > 0 && (
            <div className="hidden md:flex mt-8 items-center pt-6 border-t border-line/50">
              <button
                onClick={() => {
                  setStep((s) => Math.max(0, s - 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={submitting}
                className="px-5 py-2.5 rounded-lg text-[13px] font-semibold bg-white border border-line text-ink hover:bg-pale transition-colors disabled:opacity-50"
              >
                ← Back
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Sticky Summary (Desktop Only) */}
        <div className="hidden md:block relative">
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
    <label className={`flex flex-col gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <span className="font-semibold text-ink text-[13px]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-line px-3.5 py-2.5 text-[14px] text-ink outline-none focus:ring-1 focus:ring-royal/50 focus:border-royal transition-all bg-white shadow-sm"
      />
    </label>
  );
}

function SummaryRow({ label, value, isBold = false }: { label: string; value: string, isBold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={`text-[13px] ${isBold ? "font-semibold text-ink" : "text-ink-soft"}`}>{label}</span>
      <span className={`text-[13px] ${isBold ? "font-semibold text-royal text-[15px]" : "font-medium text-ink"}`}>{value}</span>
    </div>
  );
}
