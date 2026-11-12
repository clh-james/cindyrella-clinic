// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Official Blank Printable Paper Waiver Form Modal
// For patients who prefer signing on physical paper on a clipboard
// ==============================================================================

"use client";

import { X, Printer, ShieldCheck, Heart, AlertCircle, FileText } from "lucide-react";
import type { CustomerProfile } from "@/app/admin/(dashboard)/customers/types";

interface BlankWaiverPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerProfile;
  treatmentName?: string;
}

export function BlankWaiverPrintModal({
  isOpen,
  onClose,
  customer,
  treatmentName = "Cinderella Glutathione Drip & Aesthetic Treatment",
}: BlankWaiverPrintModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Toolbar (Screen Only) */}
        <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Printer size={18} className="text-rose-700" />
            <h3 className="font-serif font-bold text-slate-800 text-sm">
              Print Blank Paper Consent Waiver Form
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer size={14} /> Print Paper Form
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Form Sheet */}
        <div className="p-8 overflow-y-auto text-slate-800 space-y-5 text-xs bg-white print:p-0 print:m-0 print:shadow-none">
          {/* Clinic Brand Header */}
          <div className="text-center border-b-2 border-slate-800 pb-3">
            <h1 className="font-serif font-bold text-xl uppercase tracking-widest text-slate-900">
              Cindyrella Aesthetic &amp; Wellness Clinic
            </h1>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mt-0.5">
              Official Patient Medical Intake &amp; Informed Consent Agreement
            </p>
          </div>

          {/* Patient Details Grid */}
          <div className="grid grid-cols-2 gap-3 border border-slate-300 rounded-lg p-3 text-[11px] bg-slate-50/50 print:bg-white">
            <div>
              <span className="font-bold text-slate-600 block text-[9px] uppercase">Patient Full Name:</span>
              <span className="font-semibold text-slate-900 text-xs">
                {customer.first_name} {customer.last_name}
              </span>
            </div>
            <div>
              <span className="font-bold text-slate-600 block text-[9px] uppercase">Contact Phone Number:</span>
              <span className="font-semibold text-slate-900 text-xs">
                {customer.phone || "_____________________"}
              </span>
            </div>
            <div>
              <span className="font-bold text-slate-600 block text-[9px] uppercase">Target Treatment / Procedure:</span>
              <span className="font-semibold text-slate-900 text-xs">
                {treatmentName}
              </span>
            </div>
            <div>
              <span className="font-bold text-slate-600 block text-[9px] uppercase">Date of Procedure:</span>
              <span className="font-semibold text-slate-900 text-xs">
                {new Date().toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}
              </span>
            </div>
          </div>

          {/* Section 1: Health & Medical Checklist */}
          <div className="space-y-2">
            <h4 className="font-bold uppercase text-[11px] text-slate-900 tracking-wider border-b border-slate-300 pb-1 flex items-center justify-between">
              <span>1. Medical Screening Checklist (Mark with ✓ or X)</span>
              <span className="text-[9px] font-normal text-slate-500">Yes / No</span>
            </h4>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px]">
              <div className="flex items-center justify-between border-b border-slate-200 pb-0.5">
                <span>[  ] Known Drug / Solution Allergies (Specify: ___________)</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-0.5">
                <span>[  ] Currently Pregnant or Breastfeeding / Lactating</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-0.5">
                <span>[  ] Hypertension / High Blood Pressure</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-0.5">
                <span>[  ] Bleeding / Blood Clotting Disorder</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-0.5">
                <span>[  ] Diabetes Mellitus</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-0.5">
                <span>[  ] Keloid / Hypertrophic Scarring Tendency</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-0.5">
                <span>[  ] Active Cold Sores / Open Skin Wounds</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-0.5">
                <span>[  ] Pacemaker / Metallic Implants in Body</span>
              </div>
            </div>
          </div>

          {/* Section 2: Informed Consent Terms */}
          <div className="space-y-1.5 text-[10px] leading-relaxed text-slate-700">
            <h4 className="font-bold uppercase text-[11px] text-slate-900 tracking-wider border-b border-slate-300 pb-1">
              2. Patient Acknowledgements &amp; Consent
            </h4>
            <p>
              1. <strong>Nature &amp; Purpose:</strong> I understand the proposed clinical aesthetic treatment, its intended benefits, and realistic expected outcomes. I acknowledge that multiple sessions may be needed for optimal results.
            </p>
            <p>
              2. <strong>Potential Reactions:</strong> I acknowledge that normal transient reactions such as redness, minor swelling, or temporary tenderness may occur at the treated area.
            </p>
            <p>
              3. <strong>Aftercare Commitment:</strong> I commit to following all clinical post-treatment advice provided by the practitioner, including avoiding direct prolonged sun exposure and applying recommended sunscreen/aftercare.
            </p>
            <p>
              4. <strong>Truthfulness:</strong> I confirm that all health information provided above is complete and accurate to the best of my knowledge.
            </p>
          </div>

          {/* Section 3: Signatures */}
          <div className="pt-6 border-t-2 border-slate-400 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <div className="border-b border-slate-700 pb-8 mb-1">
                {/* Blank signature space */}
              </div>
              <span className="font-bold text-slate-900 block">
                {customer.first_name} {customer.last_name}
              </span>
              <span className="text-[10px] text-slate-500 uppercase block">
                Patient Signature over Printed Name / Date
              </span>
            </div>

            <div>
              <div className="border-b border-slate-700 pb-8 mb-1">
                {/* Blank witness space */}
              </div>
              <span className="font-bold text-slate-900 block">
                Cindyrella Attending Staff / RN
              </span>
              <span className="text-[10px] text-slate-500 uppercase block">
                Clinic Witness Signature over Printed Name / Date
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

