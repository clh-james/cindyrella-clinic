// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Paperless iPad / Tablet Digital Consent Waiver & Medical Intake Modal
// ==============================================================================

"use client";

import { useState, useRef } from "react";
import {
  X,
  FileCheck,
  ShieldCheck,
  AlertTriangle,
  User,
  Heart,
  Sparkles,
  Phone,
  CheckCircle2,
  Calendar,
  PenTool,
  RotateCcw,
  Loader2,
  ChevronRight,
  Info,
} from "lucide-react";
import {
  DigitalSignaturePad,
  DigitalSignaturePadHandle,
} from "./DigitalSignaturePad";
import { saveCustomerWaiver } from "@/app/admin/(dashboard)/customers/actions";
import type { CustomerProfile } from "@/app/admin/(dashboard)/customers/types";
import toast from "react-hot-toast";

interface DigitalWaiverSignModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerProfile;
  appointmentId?: string | null;
  defaultTreatmentName?: string;
  onSaved?: () => void;
}

const COMMON_CONDITIONS = [
  "Hypertension / High Blood Pressure",
  "Diabetes Mellitus",
  "Cardiovascular / Heart Condition",
  "Bleeding / Clotting Disorder",
  "Asthma / Severe Respiratory Condition",
  "Keloid / Hypertrophic Scarring Tendency",
  "Active Skin Infection / Cold Sores / Open Wounds",
  "Accutane (Isotretinoin) / Oral Retinoids in past 6 months",
  "Active Chemotherapy / Immunotherapy",
  "Pacemaker or Metallic Implants in treatment area",
  "Epilepsy / Seizure Disorder",
];

const SUGGESTED_TREATMENTS = [
  "Cinderella Glutathione Drip Infusion",
  "Diamond Peel Facial with Phototherapy",
  "Hydra-Glow Deep Cleansing Facial",
  "CO2 Fractional Laser Resurfacing",
  "Diode Laser Hair Removal",
  "Pico Laser Melasma & Pigmentation",
  "HIFU Face & Neck Non-Surgical Lift",
  "Body Contouring & RF Slimming",
  "Chemical Skin Peeling",
  "Penile Enhancement Combo",
];

export function DigitalWaiverSignModal({
  isOpen,
  onClose,
  customer,
  appointmentId,
  defaultTreatmentName,
  onSaved,
}: DigitalWaiverSignModalProps) {
  const signaturePadRef = useRef<DigitalSignaturePadHandle>(null);

  // Form State
  const [treatmentName, setTreatmentName] = useState(
    defaultTreatmentName || SUGGESTED_TREATMENTS[0]
  );
  const [selectedConditions, setSelectedConditions] = useState<string[]>(
    customer.medical_conditions
      ? customer.medical_conditions.split(",").map((s) => s.trim())
      : []
  );
  const [allergies, setAllergies] = useState<string>(customer.allergies || "");
  const [isPregnantOrNursing, setIsPregnantOrNursing] = useState<boolean>(
    !!customer.is_pregnant
  );
  const [currentMedications, setCurrentMedications] = useState<string>("");
  const [emergencyContactName, setEmergencyContactName] = useState<string>(
    customer.emergency_contact || ""
  );
  const [emergencyContactPhone, setEmergencyContactPhone] = useState<string>("");

  // Consent checkboxes
  const [risksAcknowledged, setRisksAcknowledged] = useState(true);
  const [aftercareCommitment, setAftercareCommitment] = useState(true);
  const [truthfulInformation, setTruthfulInformation] = useState(true);
  const [photoConsent, setPhotoConsent] = useState<
    "clinical_records_only" | "promotional_permitted" | "declined"
  >("clinical_records_only");

  // Signer
  const [signerFullName, setSignerFullName] = useState<string>(
    customer.full_name || `${customer.first_name || ""} ${customer.last_name || ""}`.trim()
  );
  const [isSignatureEmpty, setIsSignatureEmpty] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleCondition = (cond: string) => {
    setSelectedConditions((prev) =>
      prev.includes(cond) ? prev.filter((c) => c !== cond) : [...prev, cond]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!treatmentName.trim()) {
      toast.error("Please specify the treatment or procedure name.");
      return;
    }

    if (!risksAcknowledged || !aftercareCommitment || !truthfulInformation) {
      toast.error("All informed consent acknowledgements must be confirmed.");
      return;
    }

    const sigData = signaturePadRef.current?.toDataURL();
    if (!sigData || signaturePadRef.current?.isEmpty()) {
      toast.error("Please provide a digital signature on the signature pad.");
      return;
    }

    if (!signerFullName.trim()) {
      toast.error("Please provide your printed full name.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await saveCustomerWaiver({
        customer_id: customer.id,
        appointment_id: appointmentId,
        treatment_name: treatmentName,
        form_type: "general_treatment",
        medical_history: {
          allergies: allergies.trim() || undefined,
          medical_conditions: selectedConditions,
          current_medications: currentMedications.trim() || undefined,
          is_pregnant_or_nursing: isPregnantOrNursing,
          emergency_contact_name: emergencyContactName.trim() || undefined,
          emergency_contact_phone: emergencyContactPhone.trim() || undefined,
        },
        consent_acknowledgements: {
          risks_acknowledged: risksAcknowledged,
          aftercare_commitment: aftercareCommitment,
          truthful_information: truthfulInformation,
          photo_consent: photoConsent,
        },
        signature_data_url: sigData,
        signer_full_name: signerFullName.trim(),
      });

      if (res.success) {
        toast.success("Digital Consent Waiver signed & filed successfully!");
        onSaved?.();
        onClose();
      } else {
        toast.error(res.error || "Failed to submit waiver.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl flex flex-col my-auto max-h-[95vh] border border-slate-200 overflow-hidden">
        {/* Header Bar */}
        <div className="px-5 py-4 bg-gradient-to-r from-rose-900 via-rose-800 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20">
              <FileCheck size={22} className="text-rose-200" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-rose-200 block">
                Cindyrella Aesthetic &amp; Wellness Clinic
              </span>
              <h2 className="font-serif font-bold text-base sm:text-lg">
                Patient Medical Intake &amp; Informed Consent Waiver
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/80 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Quick Notice */}
          <div className="bg-rose-50 border border-rose-200/80 rounded-xl p-3.5 flex items-start gap-3 text-xs text-rose-900">
            <Info size={18} className="text-rose-700 shrink-0 mt-0.5" />
            <p>
              Please carefully review and complete this paperless intake form. All disclosures are confidential and safeguarded under Philippine medical confidentiality and data privacy guidelines.
            </p>
          </div>

          {/* Section 1: Patient & Procedure Info */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-2">
              <User size={14} className="text-rose-700" />
              Section 1: Patient &amp; Treatment Identification
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Patient Full Name</span>
                <span className="font-bold text-slate-900 text-sm">{signerFullName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Contact Number / Email</span>
                <span className="font-semibold text-slate-800">{customer.phone} • {customer.email}</span>
              </div>
            </div>

            {/* Treatment Procedure Field */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Procedure / Treatment to be Performed
              </label>
              <input
                type="text"
                required
                value={treatmentName}
                onChange={(e) => setTreatmentName(e.target.value)}
                placeholder="e.g. Cinderella Glutathione Drip, Diamond Peel..."
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-900 bg-white focus:outline-rose-600 focus:border-rose-600 font-semibold"
              />
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                <span className="text-[10px] text-slate-400 font-medium">Quick select:</span>
                {SUGGESTED_TREATMENTS.slice(0, 4).map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setTreatmentName(t)}
                    className="text-[10px] bg-white border border-slate-200 hover:border-rose-400 text-slate-600 hover:text-rose-700 px-2 py-0.5 rounded cursor-pointer transition-colors"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Health Screening & Contraindications */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-2">
              <Heart size={14} className="text-rose-700" />
              Section 2: Medical History &amp; Contraindications Screening
            </div>

            <p className="text-xs text-slate-500">
              Check any medical conditions that apply to you. If none apply, leave unchecked.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {COMMON_CONDITIONS.map((cond) => {
                const isChecked = selectedConditions.includes(cond);
                return (
                  <button
                    type="button"
                    key={cond}
                    onClick={() => toggleCondition(cond)}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      isChecked
                        ? "border-rose-600 bg-rose-50/80 text-rose-950 font-semibold"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                        isChecked ? "bg-rose-700 text-white" : "border border-slate-300 bg-white"
                      }`}
                    >
                      {isChecked && <CheckCircle2 size={12} />}
                    </div>
                    <span>{cond}</span>
                  </button>
                );
              })}
            </div>

            {/* Allergies & Medications */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Known Allergies (Medications, Latex, Topical)
                </label>
                <input
                  type="text"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="e.g. Lidocaine, Aspirin, Latex, Sulfur, None"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-900 bg-white focus:outline-rose-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Current Medications / Supplements
                </label>
                <input
                  type="text"
                  value={currentMedications}
                  onChange={(e) => setCurrentMedications(e.target.value)}
                  placeholder="e.g. Maintenance meds, Blood thinners, None"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-900 bg-white focus:outline-rose-600"
                />
              </div>
            </div>

            {/* Pregnancy & Nursing Toggle */}
            <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-amber-900">
                <AlertTriangle size={16} className="text-amber-700 shrink-0" />
                <span>Are you currently pregnant, planning to become pregnant, or nursing?</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPregnantOrNursing(false)}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                    !isPregnantOrNursing
                      ? "bg-emerald-700 text-white shadow-xs"
                      : "bg-white border border-slate-200 text-slate-600"
                  }`}
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={() => setIsPregnantOrNursing(true)}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                    isPregnantOrNursing
                      ? "bg-rose-700 text-white shadow-xs"
                      : "bg-white border border-slate-200 text-slate-600"
                  }`}
                >
                  Yes
                </button>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Emergency Contact Name
                </label>
                <input
                  type="text"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  placeholder="Full name of spouse, parent, or guardian"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-900 bg-white focus:outline-rose-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Emergency Contact Phone Number
                </label>
                <input
                  type="tel"
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  placeholder="09XX-XXX-XXXX"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-900 bg-white focus:outline-rose-600"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Informed Consent & Waiver Terms */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-2">
              <ShieldCheck size={14} className="text-rose-700" />
              Section 3: Informed Treatment Consent &amp; Legal Waiver
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5 text-xs text-slate-700 max-h-48 overflow-y-auto leading-relaxed">
              <p>
                <strong>1. Nature of the Procedure:</strong> I understand that the clinical procedure (<strong>{treatmentName}</strong>) has been explained to me, including the nature, expected aesthetic outcomes, and reasonable alternatives.
              </p>
              <p>
                <strong>2. Expected Temporary Reactions &amp; Risks:</strong> I acknowledge that aesthetic procedures may involve anticipated transient reactions, including but not limited to mild redness (erythema), localized warmth, skin peeling, slight bruising, tenderness, or temporary swelling, which typically resolve within standard downtime periods.
              </p>
              <p>
                <strong>3. Compliance with Aftercare Protocols:</strong> I agree to strictly adhere to the verbal and written post-procedure aftercare instructions provided by Cindyrella Clinic practitioners, including avoiding direct sun exposure, wearing prescribed sunscreen (SPF 50+), and refraining from abrasive exfoliants or heat treatments for at least 48 hours.
              </p>
              <p>
                <strong>4. Truthful Disclosure:</strong> I affirm that I have completely and truthfully disclosed all known medical conditions, allergies, current medications, and prior treatments. I release Cindyrella Aesthetic &amp; Wellness Clinic and its staff from liability arising from undisclosed health contraindications.
              </p>
            </div>

            {/* Mandatory Acknowledgement Checkboxes */}
            <div className="space-y-2 pt-1">
              <label className="flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={risksAcknowledged}
                  onChange={(e) => setRisksAcknowledged(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-rose-700 focus:ring-rose-500 cursor-pointer"
                />
                <span>
                  I have read and understand the procedure details, potential temporary side effects, and aftercare expectations.
                </span>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aftercareCommitment}
                  onChange={(e) => setAftercareCommitment(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-rose-700 focus:ring-rose-500 cursor-pointer"
                />
                <span>
                  I commit to adhering to the clinical aftercare advice and contacting the clinic immediately should any unexpected reaction occur.
                </span>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={truthfulInformation}
                  onChange={(e) => setTruthfulInformation(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-rose-700 focus:ring-rose-500 cursor-pointer"
                />
                <span>
                  I certify that all health and allergy disclosures above are accurate and complete to the best of my knowledge.
                </span>
              </label>
            </div>

            {/* Photo Documentation Consent */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Clinical Photography &amp; Transformation Records
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {[
                  {
                    id: "clinical_records_only",
                    label: "Confidential Clinical File Only",
                    desc: "For doctor/practitioner medical progression tracking only.",
                  },
                  {
                    id: "promotional_permitted",
                    label: "Social Media / Portfolio Permitted",
                    desc: "Permits anonymized before/after educational sharing.",
                  },
                  {
                    id: "declined",
                    label: "Decline All Photos",
                    desc: "No before/after photos will be captured.",
                  },
                ].map((opt) => (
                  <button
                    type="button"
                    key={opt.id}
                    onClick={() => setPhotoConsent(opt.id as any)}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      photoConsent === opt.id
                        ? "border-rose-600 bg-rose-50 text-rose-950 font-semibold"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <span className="block font-bold text-xs">{opt.label}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight">
                      {opt.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: Electronic Signature Canvas (iPad Optimized) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-2">
              <PenTool size={14} className="text-rose-700" />
              Section 4: Patient Electronic Signature &amp; Legal Attestation
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Please Sign Below (Using Finger or Stylus on Touchscreen / Mouse)
              </label>
              <DigitalSignaturePad
                ref={signaturePadRef}
                height={160}
                onSignatureChange={(isEmpty) => setIsSignatureEmpty(isEmpty)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Printed Signer Full Name
                </label>
                <input
                  type="text"
                  required
                  value={signerFullName}
                  onChange={(e) => setSignerFullName(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-900 bg-white font-semibold focus:outline-rose-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Signature Date &amp; Official Timestamp
                </label>
                <div className="text-xs text-slate-600 bg-slate-100 px-3 py-2 rounded-lg font-mono flex items-center gap-1.5">
                  <Calendar size={13} className="text-slate-500" />
                  {new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila" })} (PHT)
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer Controls */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 disabled:opacity-50 rounded-xl shadow-md transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Filing Digital Waiver...
                </>
              ) : (
                <>
                  <FileCheck size={15} /> Confirm &amp; Sign Paperless Waiver
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
