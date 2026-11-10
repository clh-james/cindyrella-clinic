// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Customer Consent Waivers List & Printable Certificate View
// ==============================================================================

"use client";

import { useState } from "react";
import Image from "next/image";
import {
  FileCheck,
  ShieldCheck,
  Plus,
  Printer,
  Calendar,
  User,
  Clock,
  Eye,
  X,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  FileText,
} from "lucide-react";
import type { CustomerWaiverRecord, CustomerProfile } from "@/app/admin/(dashboard)/customers/types";
import { DigitalWaiverSignModal } from "./DigitalWaiverSignModal";

interface CustomerWaiversTabProps {
  customer: CustomerProfile;
  waivers: CustomerWaiverRecord[];
  onRefresh?: () => void;
}

export function CustomerWaiversTab({
  customer,
  waivers,
  onRefresh,
}: CustomerWaiversTabProps) {
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [selectedWaiverToView, setSelectedWaiverToView] = useState<CustomerWaiverRecord | null>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif font-bold text-slate-800 text-base sm:text-lg flex items-center gap-2">
              <ShieldCheck className="text-rose-700" size={20} />
              Digital Consent Waivers &amp; Medical Intake
            </h3>
            <span className="bg-rose-100 text-rose-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
              {waivers.length} On File
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Legally binding electronic informed consent forms, clinical contraindication disclosures, and iPad signatures.
          </p>
        </div>

        <button
          onClick={() => setIsSignModalOpen(true)}
          className="inline-flex items-center gap-1.5 bg-rose-700 hover:bg-rose-800 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg shadow-xs transition-all cursor-pointer whitespace-nowrap ml-auto"
        >
          <Plus size={15} /> Sign New Waiver
        </button>
      </div>

      {/* Waivers List / Table */}
      {waivers.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
          <FileCheck className="mx-auto text-slate-300 mb-3" size={42} />
          <h5 className="font-serif font-bold text-slate-700 text-sm">
            No Signed Waivers on Record
          </h5>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Patient has not completed a digital intake or informed consent waiver yet. Tap below to launch the paperless iPad signing form.
          </p>
          <button
            onClick={() => setIsSignModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-rose-700 hover:bg-rose-800 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-xs transition-all cursor-pointer"
          >
            <Plus size={14} /> Open iPad Signing Form
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {waivers.map((w) => (
            <div
              key={w.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="font-serif font-bold text-slate-800 text-sm block">
                      {w.treatment_name}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                      <Clock size={11} /> {new Date(w.signed_at).toLocaleString("en-PH")}
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      w.status === "signed"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                  >
                    <CheckCircle2 size={11} /> {w.status}
                  </span>
                </div>

                {/* Medical Summary Snippet */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-3">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">
                      Known Allergies
                    </span>
                    <span className="font-semibold text-slate-800 text-xs truncate block">
                      {w.medical_history?.allergies || "None declared"}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">
                      Contraindications
                    </span>
                    <span className="font-semibold text-slate-800 text-xs truncate block">
                      {w.medical_history?.medical_conditions?.length
                        ? `${w.medical_history.medical_conditions.length} condition(s)`
                        : "None reported"}
                    </span>
                  </div>
                </div>

                {/* Signature Preview */}
                <div className="pt-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 block">Signer</span>
                    <span className="font-bold text-slate-800 text-xs">{w.signer_full_name}</span>
                    {w.staff_witness_name && (
                      <span className="text-[10px] text-slate-400 block">
                        Witness: {w.staff_witness_name}
                      </span>
                    )}
                  </div>

                  {w.signature_data_url && (
                    <div className="relative w-28 h-10 border border-slate-200 rounded-lg bg-slate-50/50 overflow-hidden flex items-center justify-center p-1">
                      <Image
                        src={w.signature_data_url}
                        alt="Signature"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-slate-100 pt-3 flex items-center justify-end gap-2">
                <button
                  onClick={() => setSelectedWaiverToView(w)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Eye size={13} /> View &amp; Print
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SIGN NEW WAIVER MODAL */}
      {/* ========================================================================= */}
      {isSignModalOpen && (
        <DigitalWaiverSignModal
          isOpen={isSignModalOpen}
          onClose={() => setIsSignModalOpen(false)}
          customer={customer}
          onSaved={() => {
            setIsSignModalOpen(false);
            onRefresh?.();
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* VIEW & PRINT OFFICIAL WAIVER CERTIFICATE MODAL */}
      {/* ========================================================================= */}
      {selectedWaiverToView && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Action Bar (Not printed) */}
            <div className="px-5 py-3 bg-slate-800 text-white flex items-center justify-between print:hidden shrink-0">
              <span className="text-xs font-bold font-serif flex items-center gap-2">
                <FileText size={16} className="text-rose-400" />
                Official Clinical Consent Record
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1 bg-rose-700 hover:bg-rose-800 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <Printer size={13} /> Print Form
                </button>
                <button
                  onClick={() => setSelectedWaiverToView(null)}
                  className="p-1 rounded-full hover:bg-white/10 text-white/80 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Document Sheet */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-800 text-xs font-sans print:p-0">
              {/* Clinic Header */}
              <div className="text-center border-b border-slate-200 pb-4">
                <h1 className="font-serif font-extrabold text-xl sm:text-2xl tracking-tight text-slate-900">
                  CINDYRELLA
                </h1>
                <p className="text-[10px] tracking-widest uppercase font-bold text-rose-700">
                  Aesthetic &amp; Wellness Clinic &amp; Spa
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Official Patient Informed Consent &amp; Medical Intake Documentation
                </p>
              </div>

              {/* Patient & Procedure Info */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase text-slate-500 font-bold block">Patient Name</span>
                  <span className="font-bold text-slate-900 text-sm block">{selectedWaiverToView.signer_full_name}</span>
                  <span className="text-[11px] text-slate-500 mt-1 block">Phone: {customer.phone}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-500 font-bold block">Clinical Procedure</span>
                  <span className="font-bold text-rose-800 text-sm block">{selectedWaiverToView.treatment_name}</span>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Signed: {new Date(selectedWaiverToView.signed_at).toLocaleString("en-PH")}
                  </span>
                </div>
              </div>

              {/* Medical Screening Disclosures */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider border-b border-slate-200 pb-1">
                  1. Medical Disclosures &amp; Health Screening
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block font-bold">Declared Allergies:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedWaiverToView.medical_history?.allergies || "None reported"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block font-bold">Current Medications:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedWaiverToView.medical_history?.current_medications || "None"}
                    </span>
                  </div>
                </div>

                {selectedWaiverToView.medical_history?.medical_conditions && selectedWaiverToView.medical_history.medical_conditions.length > 0 && (
                  <div className="pt-1">
                    <span className="text-[10px] text-slate-500 block font-bold">Noted Health Conditions:</span>
                    <ul className="list-disc list-inside text-[11px] text-slate-700 space-y-0.5">
                      {selectedWaiverToView.medical_history.medical_conditions.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Informed Consent Terms */}
              <div className="space-y-2 text-[11px] text-slate-600 leading-relaxed">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider border-b border-slate-200 pb-1">
                  2. Informed Procedure Acknowledgements
                </h4>
                <p>
                  The patient acknowledged full understanding of the treatment plan, expected outcomes, and normal anticipated post-treatment reactions (e.g. erythema, peeling, mild tenderness).
                </p>
                <p>
                  The patient agreed to follow all clinical aftercare instructions, specifically avoiding excessive sun exposure and abrasive topicals for 48 hours following therapy.
                </p>
                <p className="italic text-[10px] text-slate-500">
                  Photo Documentation Release: {selectedWaiverToView.consent_acknowledgements?.photo_consent === "promotional_permitted" ? "Permitted for educational/portfolio sharing" : "Confidential Medical File Only"}.
                </p>
              </div>

              {/* Signatures Block */}
              <div className="pt-4 border-t-2 border-slate-200 grid grid-cols-2 gap-6">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Patient Electronic Signature
                  </span>
                  {selectedWaiverToView.signature_data_url && (
                    <div className="relative w-full h-16 border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-center p-1">
                      <Image
                        src={selectedWaiverToView.signature_data_url}
                        alt="Patient Signature"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  )}
                  <p className="font-bold text-slate-900 text-xs mt-1">
                    {selectedWaiverToView.signer_full_name}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Timestamp: {new Date(selectedWaiverToView.signed_at).toISOString()}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Practitioner / Staff Witness
                  </span>
                  <div className="w-full h-16 border border-dashed border-slate-200 rounded-lg bg-slate-50/50 flex items-center justify-center text-[11px] text-slate-400">
                    Witnessed on Clinic iPad
                  </div>
                  <p className="font-bold text-slate-900 text-xs mt-1">
                    {selectedWaiverToView.staff_witness_name || "Cindyrella Clinical Staff"}
                  </p>
                  <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                    <CheckCircle2 size={11} /> Digitally Verified
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

