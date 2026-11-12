// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Physical Paper Waiver Photo Upload Modal
// Allows photographing or scanning physical paper waivers signed with real pen
// ==============================================================================

"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  X,
  Camera,
  Upload,
  FileCheck,
  CheckCircle2,
  Loader2,
  Calendar,
  User,
  AlertTriangle,
  FileText,
  Sparkles,
  Info,
} from "lucide-react";
import { uploadPaperWaiver } from "@/app/admin/(dashboard)/customers/actions";
import type { CustomerProfile } from "@/app/admin/(dashboard)/customers/types";
import toast from "react-hot-toast";

interface PaperWaiverUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerProfile;
  defaultTreatmentName?: string;
  onSaved?: () => void;
}

const COMMON_TREATMENTS = [
  "Cinderella Glutathione Drip Infusion",
  "Diamond Peel Facial with Phototherapy",
  "Hydra-Glow Deep Cleansing Facial",
  "Diode Laser Hair Removal",
  "Wart Removal & Cautery Procedure",
  "Carbon Laser Skin Rejuvenation Peel",
  "HIFU Non-Surgical Facelift",
  "RF Microneedling Skin Tightening",
  "Underarm Whitening Treatment",
  "General Medical Aesthetic Consultation",
];

export function PaperWaiverUploadModal({
  isOpen,
  onClose,
  customer,
  defaultTreatmentName,
  onSaved,
}: PaperWaiverUploadModalProps) {
  const [treatmentName, setTreatmentName] = useState(defaultTreatmentName || COMMON_TREATMENTS[0]);
  const [customTreatment, setCustomTreatment] = useState("");
  const [signerFullName, setSignerFullName] = useState(`${customer.first_name} ${customer.last_name}`.trim());
  const [signedDate, setSignedDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [allergies, setAllergies] = useState(customer.allergies || "");
  const [medicalConditions, setMedicalConditions] = useState(customer.medical_conditions || "");
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      toast.error("Please take a photo or select an image of the signed paper waiver.");
      return;
    }

    const finalTreatment = treatmentName === "custom" ? customTreatment.trim() : treatmentName;
    if (!finalTreatment) {
      toast.error("Please enter the treatment or procedure name.");
      return;
    }

    if (!signerFullName.trim()) {
      toast.error("Please enter the printed name of the signer.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("customer_id", customer.id);
      formData.append("treatment_name", finalTreatment);
      formData.append("signer_full_name", signerFullName.trim());
      formData.append("signed_at", signedDate);
      formData.append("file", selectedFile);
      if (notes.trim()) formData.append("notes", notes.trim());
      if (allergies.trim()) formData.append("allergies", allergies.trim());
      if (medicalConditions.trim()) formData.append("medical_conditions", medicalConditions.trim());

      const res = await uploadPaperWaiver(formData);

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Signed paper waiver uploaded and archived successfully!");
        if (onSaved) onSaved();
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload paper waiver.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Camera size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-slate-800 text-base">
                  Upload Signed Paper Waiver
                </h3>
                <span className="bg-amber-100 text-amber-800 font-bold text-[10px] px-2 py-0.5 rounded-full uppercase">
                  Physical Hardcopy
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Patient: <span className="font-semibold text-slate-800">{customer.first_name} {customer.last_name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          {/* Informational Guidance */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5 text-blue-900">
            <Info size={16} className="text-blue-700 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Gamitin ito kung pinirmahan ng pasyente ang <strong>hardcopy paper waiver sa clipboard gamit ang ballpen</strong>. Kunan ng litrato o i-scan ang papel para mai-save sa system. Pwede itong i-download muli anumang oras bilang patunay.
            </p>
          </div>

          {/* Photo Capture / Upload Zone */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Photo of Signed Paper Waiver *
            </label>

            {previewUrl ? (
              <div className="relative border-2 border-slate-200 rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center min-h-[220px]">
                <img
                  src={previewUrl}
                  alt="Paper Waiver Preview"
                  className="max-h-[300px] w-auto object-contain"
                />
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="absolute top-3 right-3 bg-red-600 hover:bg-red-700 text-white p-2 rounded-xl shadow-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                >
                  <X size={14} /> Remove / Re-take
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/50 hover:bg-amber-50/30 transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
                  <Camera size={22} />
                </div>
                <h5 className="font-bold text-slate-700 text-xs">
                  Tap to Take Photo or Browse Image
                </h5>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                  Supports Camera capture on iPad/Mobile, or upload JPG, PNG, HEIC scan
                </p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileChange(file);
              }}
            />
          </div>

          {/* Treatment Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Treatment / Procedure *
              </label>
              <select
                value={treatmentName}
                onChange={(e) => setTreatmentName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
              >
                {COMMON_TREATMENTS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
                <option value="custom">+ Other / Custom Procedure...</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Date Signed on Paper *
              </label>
              <input
                type="date"
                value={signedDate}
                onChange={(e) => setSignedDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>

          {treatmentName === "custom" && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Specify Procedure Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Underarm Laser Hair Removal Session 1"
                value={customTreatment}
                onChange={(e) => setCustomTreatment(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          )}

          {/* Signer Full Name */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Patient / Signer Name on Paper *
            </label>
            <input
              type="text"
              value={signerFullName}
              onChange={(e) => setSignerFullName(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          {/* Optional Health Disclosures from Paper */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
              Disclosures from Paper (Syncs with Medical File)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                  Allergies noted on paper:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lidocaine, Shellfish, None"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                  Health conditions noted:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hypertension, Asthma"
                  value={medicalConditions}
                  onChange={(e) => setMedicalConditions(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Internal Archival Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Physical signed waiver stored in Davao Clinic Folder #3"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedFile}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Uploading Paper Waiver...
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  Save Paper Waiver
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
