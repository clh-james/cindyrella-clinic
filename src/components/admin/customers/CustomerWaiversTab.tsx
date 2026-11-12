// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Customer Consent Waivers List & Printable Certificate View
// Dual Mode Support: Digital iPad E-Signature & Physical Paper Photo Upload / Download
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
  Download,
  Camera,
  ExternalLink,
  FileImage,
  Tablet,
  FileSignature,
} from "lucide-react";
import type { CustomerWaiverRecord, CustomerProfile } from "@/app/admin/(dashboard)/customers/types";
import { DigitalWaiverSignModal } from "./DigitalWaiverSignModal";
import { PaperWaiverUploadModal } from "./PaperWaiverUploadModal";
import { BlankWaiverPrintModal } from "./BlankWaiverPrintModal";
import toast from "react-hot-toast";

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
  const [isPaperModalOpen, setIsPaperModalOpen] = useState(false);
  const [isBlankPrintOpen, setIsBlankPrintOpen] = useState(false);
  const [selectedWaiverToView, setSelectedWaiverToView] = useState<CustomerWaiverRecord | null>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadWaiverImage = async (waiver: CustomerWaiverRecord) => {
    const imageUrl = waiver.paper_document_url || waiver.signature_data_url;
    if (!imageUrl) {
      toast.error("Walang picture o image file na available para i-download.");
      return;
    }

    try {
      const isPaper = waiver.waiver_mode === "paper_upload";
      const cleanSigner = waiver.signer_full_name.replace(/[^a-zA-Z0-9]/g, "_");
      const cleanTreatment = waiver.treatment_name.replace(/[^a-zA-Z0-9]/g, "_");
      const filename = `Cindyrella_${isPaper ? "Paper_Waiver" : "Digital_Signature"}_${cleanSigner}_${cleanTreatment}.jpg`;

      if (imageUrl.startsWith("data:")) {
        const link = document.createElement("a");
        link.href = imageUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      }
      toast.success("Waiver image downloaded successfully!");
    } catch {
      // Fallback: open directly in new window for saving
      window.open(imageUrl, "_blank");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar with Dual Options */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif font-bold text-slate-800 text-base sm:text-lg flex items-center gap-2">
              <ShieldCheck className="text-rose-700" size={20} />
              Consent Waivers &amp; Medical Intake
            </h3>
            <span className="bg-rose-100 text-rose-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
              {waivers.length} On File
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            2 Options available: <strong>Digital iPad E-Signing</strong> o <strong>Physical Paper Waiver Photo Upload</strong> (na pwedeng i-download anumang oras).
          </p>
        </div>

        {/* 3 Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Option A: Digital iPad Signing */}
          <button
            onClick={() => setIsSignModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-rose-700 hover:bg-rose-800 text-white font-semibold text-xs px-3.5 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
            title="Pumirma gamit ang iPad o touch tablet"
          >
            <Tablet size={14} />
            <span>Digital iPad Sign</span>
          </button>

          {/* Option B: Upload Photo of Paper Waiver */}
          <button
            onClick={() => setIsPaperModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-3.5 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
            title="Kumuha ng picture ng papel na pinirmahan"
          >
            <Camera size={14} />
            <span>Upload Paper Photo</span>
          </button>

          {/* Helper: Print Blank Paper Form */}
          <button
            onClick={() => setIsBlankPrintOpen(true)}
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-3 py-2 rounded-xl border border-slate-200 transition-all cursor-pointer"
            title="I-print ang blankong waiver sa papel para papirmahan sa clipboard"
          >
            <Printer size={14} />
            <span>Print Blank Form</span>
          </button>
        </div>
      </div>

      {/* Waivers List / Cards Grid */}
      {waivers.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-10 text-center">
          <FileCheck className="mx-auto text-slate-300 mb-3" size={44} />
          <h5 className="font-serif font-bold text-slate-700 text-sm">
            No Signed Waivers on Record
          </h5>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
            Wala pang nakatalang consent waiver para sa pasyenteng ito. Piliin kung <strong>Digital iPad E-Signing</strong> o <strong>Picture ng Papel na Waiver</strong> ang gagamitin:
          </p>
          <div className="flex flex-wrap justify-center items-center gap-2.5">
            <button
              onClick={() => setIsSignModalOpen(true)}
              className="inline-flex items-center gap-1.5 bg-rose-700 hover:bg-rose-800 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Tablet size={14} /> Launch iPad Signing
            </button>
            <button
              onClick={() => setIsPaperModalOpen(true)}
              className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Camera size={14} /> Take Photo of Paper Waiver
            </button>
            <button
              onClick={() => setIsBlankPrintOpen(true)}
              className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-3.5 py-2 rounded-xl border border-slate-200 transition-all cursor-pointer"
            >
              <Printer size={14} /> Print Blank Form
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {waivers.map((w) => {
            const isPaper = w.waiver_mode === "paper_upload";
            const imageUrl = w.paper_document_url || w.signature_data_url;

            return (
              <div
                key={w.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Top Bar with Mode Badge */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-serif font-bold text-slate-800 text-sm block">
                          {w.treatment_name}
                        </span>
                        {isPaper ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Camera size={10} /> Physical Paper Photo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            <Tablet size={10} /> Digital iPad Sign
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 font-mono">
                        <Clock size={11} /> {new Date(w.signed_at).toLocaleString("en-PH")}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
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
                        Declared Allergies
                      </span>
                      <span className="font-semibold text-slate-800 text-xs truncate block">
                        {w.medical_history?.allergies || "None declared"}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-500 block uppercase">
                        Conditions Noted
                      </span>
                      <span className="font-semibold text-slate-800 text-xs truncate block">
                        {w.medical_history?.medical_conditions?.length
                          ? `${w.medical_history.medical_conditions.length} condition(s)`
                          : "None reported"}
                      </span>
                    </div>
                  </div>

                  {/* Signer & Preview Area */}
                  <div className="pt-3 flex items-center justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">Signer</span>
                      <span className="font-bold text-slate-800 text-xs truncate block">{w.signer_full_name}</span>
                      {w.staff_witness_name && (
                        <span className="text-[10px] text-slate-400 truncate block">
                          Witness: {w.staff_witness_name}
                        </span>
                      )}
                    </div>

                    {/* Image / Signature Thumbnail */}
                    {imageUrl && (
                      <div 
                        onClick={() => setSelectedWaiverToView(w)}
                        className="relative w-28 h-12 border border-slate-200 rounded-lg bg-slate-50 overflow-hidden flex items-center justify-center p-0.5 cursor-pointer hover:border-royal transition-colors shrink-0 group"
                        title="Click to view full image"
                      >
                        <img
                          src={imageUrl}
                          alt="Waiver Preview"
                          className="w-full h-full object-cover rounded"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold">
                          View
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="border-t border-slate-100 pt-3 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {isPaper ? "Photo on File" : "iPad Verified"}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* DOWNLOAD IMAGE BUTTON */}
                    <button
                      onClick={() => handleDownloadWaiverImage(w)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-semibold transition-colors cursor-pointer"
                      title={isPaper ? "Download picture ng papel na waiver" : "Download digital signature image"}
                    >
                      <Download size={13} /> Download Image
                    </button>

                    {/* VIEW & PRINT BUTTON */}
                    <button
                      onClick={() => setSelectedWaiverToView(w)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Eye size={13} /> View
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. DIGITAL IPAD SIGNING MODAL */}
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
      {/* 2. UPLOAD PHYSICAL PAPER WAIVER PHOTO MODAL */}
      {/* ========================================================================= */}
      {isPaperModalOpen && (
        <PaperWaiverUploadModal
          isOpen={isPaperModalOpen}
          onClose={() => setIsPaperModalOpen(false)}
          customer={customer}
          onSaved={() => {
            setIsPaperModalOpen(false);
            onRefresh?.();
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* 3. PRINT BLANK PAPER WAIVER FORM MODAL */}
      {/* ========================================================================= */}
      {isBlankPrintOpen && (
        <BlankWaiverPrintModal
          isOpen={isBlankPrintOpen}
          onClose={() => setIsBlankPrintOpen(false)}
          customer={customer}
        />
      )}

      {/* ========================================================================= */}
      {/* VIEW & DOWNLOAD DETAILED WAIVER RECORD MODAL */}
      {/* ========================================================================= */}
      {selectedWaiverToView && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Action Bar (Not printed) */}
            <div className="px-5 py-3 bg-slate-800 text-white flex items-center justify-between print:hidden shrink-0">
              <div className="flex items-center gap-2">
                {selectedWaiverToView.waiver_mode === "paper_upload" ? (
                  <Camera size={16} className="text-amber-400" />
                ) : (
                  <FileText size={16} className="text-rose-400" />
                )}
                <span className="text-xs font-bold font-serif">
                  {selectedWaiverToView.waiver_mode === "paper_upload" 
                    ? "Signed Physical Paper Waiver Document" 
                    : "Official Digital Consent Certificate"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* DIRECT DOWNLOAD IMAGE BUTTON */}
                <button
                  onClick={() => handleDownloadWaiverImage(selectedWaiverToView)}
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-xs"
                  title="Download image file"
                >
                  <Download size={14} /> Download Image
                </button>

                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <Printer size={13} /> Print
                </button>

                <button
                  onClick={() => setSelectedWaiverToView(null)}
                  className="p-1 rounded-full hover:bg-white/10 text-white/80 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Document Body */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-800 text-xs font-sans print:p-0">
              {/* IF PHYSICAL PAPER WAIVER PHOTO: SHOW HIGH-RES PHOTO VIEWER */}
              {selectedWaiverToView.waiver_mode === "paper_upload" ? (
                <div className="space-y-4">
                  {/* Clinic Header */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div>
                      <h4 className="font-serif font-bold text-slate-900 text-base">
                        {selectedWaiverToView.treatment_name}
                      </h4>
                      <p className="text-xs text-slate-500">
                        Signed on Paper: {new Date(selectedWaiverToView.signed_at).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <span className="bg-amber-100 text-amber-800 font-bold text-[10px] px-2.5 py-1 rounded-full uppercase">
                      Physical Paper Waiver
                    </span>
                  </div>

                  {/* High-Res Paper Waiver Image Display */}
                  <div className="border border-slate-200 rounded-2xl p-2 bg-slate-900 flex flex-col items-center justify-center overflow-hidden shadow-inner">
                    <img
                      src={selectedWaiverToView.paper_document_url || selectedWaiverToView.signature_data_url}
                      alt="Physical Paper Waiver Document"
                      className="max-h-[60vh] w-auto object-contain rounded-xl shadow-lg"
                    />
                  </div>

                  {/* Download Bar directly below image */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-slate-800 text-xs block">
                        Original Physical Document Image
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Signer: <strong className="text-slate-700">{selectedWaiverToView.signer_full_name}</strong> • Witness: <strong className="text-slate-700">{selectedWaiverToView.staff_witness_name || "Staff"}</strong>
                      </p>
                      {selectedWaiverToView.notes && (
                        <p className="text-[10px] text-slate-400 italic mt-0.5">
                          Note: {selectedWaiverToView.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownloadWaiverImage(selectedWaiverToView)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer"
                      >
                        <Download size={14} /> Download Image File
                      </button>

                      {selectedWaiverToView.paper_document_url && (
                        <a
                          href={selectedWaiverToView.paper_document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors"
                        >
                          <ExternalLink size={13} /> Full Tab
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* IF DIGITAL IPAD WAIVER: SHOW OFFICIAL CERTIFICATE */
                <>
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
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
