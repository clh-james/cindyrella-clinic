"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
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

  const dates = useMemo(() => nextDates(10), []);
  const treatment = treatments.find((t) => t.id === treatmentId);
  const branch = branches.find((b) => b.id === branchId);

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
      // No Supabase configured yet — confirm locally so the flow is still demoable.
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

  if (confirmed) {
    return (
      <div className="mt-14 rounded-2xl border border-line p-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-royal">
          <Check className="text-white" size={26} />
        </div>
        <h2 className="mt-6 font-serif text-3xl font-semibold text-ink">
          Booking confirmed
        </h2>
        <p className="mt-2 text-ink-soft">
          A confirmation has been sent to {customer.email}.
        </p>
        <p className="mt-6 font-mono text-lg tracking-wide text-royal">
          {confirmed}
        </p>
        <div className="mx-auto mt-8 max-w-sm rounded-xl bg-pale p-5 text-left text-sm text-ink-soft">
          <p><span className="font-medium text-ink">{treatment?.name}</span> · {peso(treatment?.session_price ?? 0)}</p>
          <p className="mt-1">{branch?.name} · {date?.label} · {time}</p>
          <p className="mt-1">Payment: {paymentOptions.find((p) => p.value === payment)?.label}</p>
        </div>
        <a href="/manage" className="mt-6 inline-block text-sm font-medium text-royal hover:text-royal-deep">
          Need to reschedule or cancel?
        </a>
      </div>
    );
  }

  return (
    <div className="mt-12 grid gap-10 md:grid-cols-[200px_1fr]">
      <ol className="flex gap-4 overflow-x-auto md:flex-col md:gap-1 md:overflow-visible">
        {steps.map((label, i) => (
          <li key={label} className="relative flex shrink-0 items-center gap-3 md:py-2.5">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                i === step ? "bg-royal" : i < step ? "bg-royal/40" : "bg-line"
              }`}
            />
            <button
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              className={`whitespace-nowrap text-sm ${
                i === step ? "font-medium text-ink" : i < step ? "text-ink-soft hover:text-royal" : "text-ink-soft/50"
              }`}
            >
              {label}
            </button>
          </li>
        ))}
      </ol>

      <div className="min-h-[420px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {step === 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {treatments.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTreatmentId(t.id)}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      treatmentId === t.id ? "border-royal bg-pale" : "border-line hover:border-royal/50"
                    }`}
                  >
                    <p className="font-medium text-ink">{t.name}</p>
                    <p className="mt-1 text-sm text-ink-soft">
                      {peso(t.session_price)} · {t.duration_minutes} min
                    </p>
                  </button>
                ))}
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {branches.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setBranchId(b.id)}
                    className={`rounded-xl border p-4 text-left font-medium transition-colors ${
                      branchId === b.id ? "border-royal bg-pale text-ink" : "border-line text-ink hover:border-royal/50"
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {dates.map((d) => (
                  <button
                    key={d.iso}
                    onClick={() => setDate(d)}
                    className={`rounded-xl border p-3 text-sm font-medium transition-colors ${
                      date?.iso === d.iso ? "border-royal bg-pale text-ink" : "border-line text-ink-soft hover:border-royal/50"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {timeSlots.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTime(t)}
                    className={`rounded-xl border p-3 text-sm font-medium transition-colors ${
                      time === t ? "border-royal bg-pale text-ink" : "border-line text-ink-soft hover:border-royal/50"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            {step === 4 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First name" value={customer.firstName} onChange={(v) => setField("firstName", v)} />
                <Field label="Last name" value={customer.lastName} onChange={(v) => setField("lastName", v)} />
                <Field label="Birthday" type="date" value={customer.birthday} onChange={(v) => setField("birthday", v)} />
                <Field label="Gender" value={customer.gender} onChange={(v) => setField("gender", v)} />
                <Field label="Phone" value={customer.phone} onChange={(v) => setField("phone", v)} />
                <Field label="Email" type="email" value={customer.email} onChange={(v) => setField("email", v)} />
                <Field label="Address" value={customer.address} onChange={(v) => setField("address", v)} full />
                <Field label="Medical conditions" value={customer.medicalConditions} onChange={(v) => setField("medicalConditions", v)} full />
                <Field label="Allergies" value={customer.allergies} onChange={(v) => setField("allergies", v)} />
                <Field label="Pregnant?" value={customer.pregnant} onChange={(v) => setField("pregnant", v)} />
                <Field label="Emergency contact" value={customer.emergencyContact} onChange={(v) => setField("emergencyContact", v)} />
                <Field label="Notes or special requests" value={customer.notes} onChange={(v) => setField("notes", v)} full />
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-line p-6 space-y-4">
                  <SummaryRow label="Treatment" value={`${treatment?.name} — ${peso(treatment?.session_price ?? 0)}`} />
                  
                  {appliedPromo && (
                    <SummaryRow 
                      label="Promo Applied" 
                      value={`-${appliedPromo.discount_type === 'fixed' ? peso(appliedPromo.discount_value) : `${appliedPromo.discount_value}%`} (${appliedPromo.code})`} 
                    />
                  )}
                  
                  <SummaryRow label="Total Due" value={peso(calculateDiscountedPrice())} />
                  <SummaryRow label="Branch" value={branch?.name ?? ""} />
                  <SummaryRow label="Date & time" value={`${date?.label}, ${time}`} />
                  <SummaryRow label="Name" value={`${customer.firstName} ${customer.lastName}`} />
                  <SummaryRow label="Contact" value={`${customer.phone} · ${customer.email}`} />
                </div>
                
                <div className="rounded-2xl border border-line p-6">
                  <label className="text-sm font-medium text-ink block mb-2">Have a promo code?</label>
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
                      className="flex-1 rounded-lg border border-line px-3.5 py-2 text-sm text-ink outline-none focus:border-royal"
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
                      className="rounded-lg bg-royal px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-royal-deep"
                    >
                      Apply
                    </button>
                  </div>
                  {promoError && <p className="mt-2 text-xs text-red-600">{promoError}</p>}
                  {promoSuccess && <p className="mt-2 text-xs text-green-600">{promoSuccess}</p>}
                </div>
                
                <label className="flex items-start gap-3 rounded-xl border border-line bg-pale p-4 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={customer.agreeToTerms}
                    onChange={(e) => setField("agreeToTerms", e.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-line text-royal focus:ring-royal"
                  />
                  <span className="text-sm text-ink-soft leading-relaxed">
                    I agree to the <a href="/terms" target="_blank" className="text-royal hover:underline">Terms & Conditions</a> and <a href="/privacy" target="_blank" className="text-royal hover:underline">Privacy Policy</a>.
                  </span>
                </label>
              </div>
            )}

            {step === 6 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {paymentOptions.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setPayment(m.value)}
                    className={`rounded-xl border p-4 text-left font-medium transition-colors ${
                      payment === m.value ? "border-royal bg-pale text-ink" : "border-line text-ink hover:border-royal/50"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
                <p className="col-span-full text-xs text-ink-soft">
                  A deposit secures your slot; the balance is settled at the clinic.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        <div className="mt-10 flex items-center justify-between border-t border-line pt-6">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || submitting}
            className="text-sm font-medium text-ink-soft disabled:opacity-0"
          >
            Back
          </button>
          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canContinue}
              className="rounded-full bg-royal px-7 py-3 text-sm font-medium text-white transition-colors hover:bg-royal-deep disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={!canContinue || submitting}
              className="flex items-center gap-2 rounded-full bg-royal px-7 py-3 text-sm font-medium text-white transition-colors hover:bg-royal-deep disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Confirm booking
            </button>
          )}
        </div>
      </div>
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
      <span className="font-medium text-ink">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-line px-3.5 py-2.5 text-ink outline-none focus:border-royal"
      />
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-ink-soft">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}
