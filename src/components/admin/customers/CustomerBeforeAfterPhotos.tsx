// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Customer Before & After Photo Comparison & Transformation Tracker
// ==============================================================================

"use client";

import { useState, useRef, useMemo } from "react";
import Image from "next/image";
import {
  Camera,
  UploadCloud,
  Trash2,
  Sparkles,
  Layers,
  Calendar,
  User,
  Plus,
  X,
  Maximize2,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Eye,
} from "lucide-react";
import type { CustomerPhotoRecord } from "@/app/admin/(dashboard)/customers/types";
import {
  uploadCustomerPhoto,
  deleteCustomerPhoto,
  pairCustomerPhotos,
} from "@/app/admin/(dashboard)/customers/actions";
import toast from "react-hot-toast";

interface CustomerBeforeAfterPhotosProps {
  customerId: string;
  customerName: string;
  initialPhotos?: CustomerPhotoRecord[];
  onRefresh?: () => void;
}

export function CustomerBeforeAfterPhotos({
  customerId,
  customerName,
  initialPhotos = [],
  onRefresh,
}: CustomerBeforeAfterPhotosProps) {
  const [photos, setPhotos] = useState<CustomerPhotoRecord[]>(initialPhotos);
  const [selectedTreatment, setSelectedTreatment] = useState<string>("all");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isComparingModalOpen, setIsComparingModalOpen] = useState(false);
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [activePair, setActivePair] = useState<{
    before: CustomerPhotoRecord | null;
    after: CustomerPhotoRecord | null;
    treatmentName: string;
  } | null>(null);

  // Upload Form State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [photoType, setPhotoType] = useState<"before" | "after" | "progress">("before");
  const [treatmentName, setTreatmentName] = useState<string>("");
  const [sessionNumber, setSessionNumber] = useState<number>(1);
  const [dateTaken, setDateTaken] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState<string>("");
  const [selectedPairBeforeId, setSelectedPairBeforeId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Group photos into Pairs and Singles
  const { pairs, singles, treatmentOptions } = useMemo(() => {
    const treatments = new Set<string>();
    const groupedByPair = new Map<string, CustomerPhotoRecord[]>();
    const ungrouped: CustomerPhotoRecord[] = [];

    photos.forEach((p) => {
      if (p.treatment_name) treatments.add(p.treatment_name);
      if (p.comparison_group_id) {
        const list = groupedByPair.get(p.comparison_group_id) || [];
        list.push(p);
        groupedByPair.set(p.comparison_group_id, list);
      } else {
        ungrouped.push(p);
      }
    });

    const parsedPairs: {
      groupId: string;
      before: CustomerPhotoRecord | null;
      after: CustomerPhotoRecord | null;
      treatmentName: string;
      date: string;
    }[] = [];

    groupedByPair.forEach((group, groupId) => {
      const before = group.find((p) => p.photo_type === "before") || group[0] || null;
      const after = group.find((p) => p.photo_type === "after") || group[1] || null;
      parsedPairs.push({
        groupId,
        before,
        after,
        treatmentName: before?.treatment_name || after?.treatment_name || "General Treatment",
        date: after?.date_taken || before?.date_taken || "",
      });
    });

    return {
      pairs: parsedPairs,
      singles: ungrouped,
      treatmentOptions: Array.from(treatments),
    };
  }, [photos]);

  // Filtered lists
  const filteredPairs = useMemo(() => {
    if (selectedTreatment === "all") return pairs;
    return pairs.filter((p) => p.treatmentName === selectedTreatment);
  }, [pairs, selectedTreatment]);

  const filteredSingles = useMemo(() => {
    if (selectedTreatment === "all") return singles;
    return singles.filter((p) => (p.treatment_name || "General Treatment") === selectedTreatment);
  }, [singles, selectedTreatment]);

  // File selection handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    setUploadPreview(URL.createObjectURL(file));
  };

  // Submit Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error("Please choose a photo to upload.");
      return;
    }

    setIsSubmitting(true);
    const fd = new FormData();
    fd.append("customer_id", customerId);
    fd.append("file", uploadFile);
    fd.append("photo_type", photoType);
    fd.append("treatment_name", treatmentName || "Clinical Treatment");
    fd.append("session_number", String(sessionNumber));
    fd.append("date_taken", dateTaken);
    if (notes) fd.append("notes", notes);
    if (photoType === "after" && selectedPairBeforeId) {
      fd.append("comparison_group_id", selectedPairBeforeId);
    }

    try {
      const res = await uploadCustomerPhoto(fd);
      if (res.success && res.photo) {
        toast.success("Photo uploaded successfully!");
        setPhotos((prev) => [res.photo!, ...prev]);

        // If paired with an existing before photo, also update that before photo
        if (photoType === "after" && selectedPairBeforeId) {
          await pairCustomerPhotos(selectedPairBeforeId, res.photo.id, customerId);
        }

        setIsUploadModalOpen(false);
        resetUploadForm();
        onRefresh?.();
      } else {
        toast.error(res.error || "Failed to upload photo.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Photo
  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm("Are you sure you want to permanently delete this photo?")) return;
    setDeletingId(photoId);
    try {
      const res = await deleteCustomerPhoto(photoId, customerId);
      if (res.success) {
        toast.success("Photo deleted.");
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
        if (activePair?.before?.id === photoId || activePair?.after?.id === photoId) {
          setIsComparingModalOpen(false);
          setActivePair(null);
        }
        onRefresh?.();
      } else {
        toast.error(res.error || "Failed to delete photo.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete photo.");
    } finally {
      setDeletingId(null);
    }
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadPreview(null);
    setPhotoType("before");
    setTreatmentName("");
    setSessionNumber(1);
    setDateTaken(new Date().toISOString().slice(0, 10));
    setNotes("");
    setSelectedPairBeforeId("");
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif font-bold text-slate-800 text-base sm:text-lg flex items-center gap-2">
              <Camera className="text-rose-600" size={20} />
              Before & After Clinical Transformations
            </h3>
            <span className="bg-rose-100 text-rose-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
              {photos.length} Photos
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Document visual patient progression, treatment results, and aesthetic session milestones for {customerName}.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Treatment Filter */}
          <select
            value={selectedTreatment}
            onChange={(e) => setSelectedTreatment(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-rose-500 cursor-pointer"
          >
            <option value="all">All Treatments ({photos.length})</option>
            {treatmentOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Add Photo Button */}
          <button
            onClick={() => {
              resetUploadForm();
              setIsUploadModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 bg-rose-700 hover:bg-rose-800 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg shadow-xs transition-all cursor-pointer whitespace-nowrap ml-auto"
          >
            <Plus size={15} /> Add Photo
          </button>
        </div>
      </div>

      {/* QUICK COMPARISON BANNER (if pairs exist) */}
      {pairs.length > 0 && (
        <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-slate-900 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 opacity-10 pointer-events-none">
            <Sparkles size={220} />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-xs text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full mb-2">
                <Sparkles size={12} /> Interactive Split Comparison
              </span>
              <h4 className="text-base sm:text-lg font-bold font-serif">
                {pairs[0].treatmentName} Transformation
              </h4>
              <p className="text-xs text-rose-100 max-w-xl mt-1">
                Drag the interactive slider to inspect microscopic and macroscopic skin contour changes between Before (Session {pairs[0].before?.session_number || 1}) and After (Session {pairs[0].after?.session_number || "Final"}).
              </p>
            </div>
            <button
              onClick={() => {
                setActivePair(pairs[0]);
                setIsComparingModalOpen(true);
              }}
              className="inline-flex items-center gap-2 bg-white text-rose-900 hover:bg-rose-50 font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg transition-all cursor-pointer whitespace-nowrap"
            >
              <SlidersHorizontal size={15} /> Open Interactive Slider
            </button>
          </div>
        </div>
      )}

      {/* PAIRED COMPARISON CARDS */}
      {filteredPairs.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Layers size={14} className="text-rose-600" />
            Paired Transformations ({filteredPairs.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPairs.map((pair) => (
              <div
                key={pair.groupId}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                    <div>
                      <span className="font-serif font-bold text-slate-800 text-sm block">
                        {pair.treatmentName}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Calendar size={11} /> {pair.date}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setActivePair(pair);
                        setIsComparingModalOpen(true);
                      }}
                      className="text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <SlidersHorizontal size={12} /> Compare
                    </button>
                  </div>

                  {/* Dual Thumbnail Comparison */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {/* Before Card */}
                    <div className="relative rounded-xl overflow-hidden bg-slate-100 aspect-4/3 border border-slate-200 group">
                      {pair.before?.photo_url ? (
                        <Image
                          src={pair.before.photo_url}
                          alt="Before Treatment"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                          No Before Photo
                        </div>
                      )}
                      <span className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow">
                        Before (S{pair.before?.session_number || 1})
                      </span>
                      {pair.before && (
                        <button
                          onClick={() => handleDeletePhoto(pair.before!.id)}
                          disabled={deletingId === pair.before.id}
                          className="absolute top-2 right-2 bg-red-600/90 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                          title="Delete photo"
                        >
                          {deletingId === pair.before.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </button>
                      )}
                    </div>

                    {/* After Card */}
                    <div className="relative rounded-xl overflow-hidden bg-slate-100 aspect-4/3 border border-slate-200 group">
                      {pair.after?.photo_url ? (
                        <Image
                          src={pair.after.photo_url}
                          alt="After Treatment"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                          No After Photo
                        </div>
                      )}
                      <span className="absolute top-2 left-2 bg-rose-600/90 backdrop-blur-xs text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow">
                        After (S{pair.after?.session_number || 2})
                      </span>
                      {pair.after && (
                        <button
                          onClick={() => handleDeletePhoto(pair.after!.id)}
                          disabled={deletingId === pair.after.id}
                          className="absolute top-2 right-2 bg-red-600/90 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                          title="Delete photo"
                        >
                          {deletingId === pair.after.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Notes / Observations */}
                  {(pair.after?.notes || pair.before?.notes) && (
                    <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                      &quot;{pair.after?.notes || pair.before?.notes}&quot;
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ALL PHOTO GALLERY / TIMELINE */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Camera size={14} className="text-rose-600" />
          Individual Clinical Records ({filteredSingles.length})
        </h4>

        {filteredSingles.length === 0 && filteredPairs.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
            <Camera className="mx-auto text-slate-300 mb-3" size={42} />
            <h5 className="font-serif font-bold text-slate-700 text-sm">
              No Before & After Photos Yet
            </h5>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Upload initial baseline photos before beginning aesthetic sessions to track clinical transformation over time.
            </p>
            <button
              onClick={() => {
                resetUploadForm();
                setIsUploadModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 bg-rose-700 hover:bg-rose-800 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-xs transition-all cursor-pointer"
            >
              <Plus size={14} /> Upload First Photo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredSingles.map((photo) => (
              <div
                key={photo.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs hover:shadow-sm transition-shadow group flex flex-col"
              >
                <div className="relative aspect-4/3 bg-slate-100 overflow-hidden">
                  <Image
                    src={photo.photo_url}
                    alt={photo.treatment_name || "Treatment photo"}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    unoptimized
                  />
                  <span
                    className={`absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow ${
                      photo.photo_type === "before"
                        ? "bg-slate-900/80 text-white"
                        : photo.photo_type === "after"
                        ? "bg-rose-600 text-white"
                        : "bg-amber-600 text-white"
                    }`}
                  >
                    {photo.photo_type} • S{photo.session_number || 1}
                  </span>

                  <button
                    onClick={() => handleDeletePhoto(photo.id)}
                    disabled={deletingId === photo.id}
                    className="absolute top-2 right-2 bg-red-600/90 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                    title="Delete photo"
                  >
                    {deletingId === photo.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Trash2 size={12} />
                    )}
                  </button>
                </div>

                <div className="p-2.5 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="font-semibold text-slate-800 text-xs block truncate">
                      {photo.treatment_name || "Clinical Service"}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Calendar size={10} /> {photo.date_taken}
                    </span>
                    {photo.notes && (
                      <p className="text-[11px] text-slate-600 line-clamp-2 mt-1 italic">
                        {photo.notes}
                      </p>
                    )}
                  </div>
                  {photo.taken_by_name && (
                    <span className="text-[9px] text-slate-400 mt-2 block border-t border-slate-100 pt-1">
                      By {photo.taken_by_name}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* INTERACTIVE BEFORE & AFTER SPLIT SLIDER MODAL */}
      {/* ========================================================================= */}
      {isComparingModalOpen && activePair && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
                  Interactive Split Viewer
                </span>
                <h3 className="font-serif font-bold text-slate-800 text-base">
                  {activePair.treatmentName} — Before vs After
                </h3>
              </div>
              <button
                onClick={() => setIsComparingModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Split Screen Slider Body */}
            <div className="p-5 flex-1 overflow-y-auto">
              <div className="relative w-full aspect-16/10 rounded-xl overflow-hidden select-none shadow-md bg-slate-900">
                {/* AFTER IMAGE (Bottom Layer) */}
                {activePair.after?.photo_url && (
                  <div className="absolute inset-0">
                    <Image
                      src={activePair.after.photo_url}
                      alt="After"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <span className="absolute bottom-3 right-3 bg-rose-600/90 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded shadow">
                      After (Session {activePair.after.session_number || 2})
                    </span>
                  </div>
                )}

                {/* BEFORE IMAGE (Clipped Layer on Top) */}
                {activePair.before?.photo_url && (
                  <div
                    className="absolute inset-0 overflow-hidden"
                    style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                  >
                    <Image
                      src={activePair.before.photo_url}
                      alt="Before"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <span className="absolute bottom-3 left-3 bg-slate-900/90 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded shadow">
                      Before (Session {activePair.before.session_number || 1})
                    </span>
                  </div>
                )}

                {/* Vertical Divider Line with Grab Handle */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white shadow-2xl z-20 pointer-events-none"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-lg border-2 border-rose-600 flex items-center justify-center text-rose-600">
                    <SlidersHorizontal size={14} />
                  </div>
                </div>

                {/* Range Slider for Interaction */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderPosition}
                  onChange={(e) => setSliderPosition(Number(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
                  aria-label="Before and after split slider"
                />
              </div>

              {/* Slider instruction helper */}
              <div className="flex items-center justify-between text-xs text-slate-500 mt-3 px-1">
                <span className="font-bold text-slate-700">&larr; Drag slider left / right &rarr;</span>
                <span>{sliderPosition}% Split</span>
              </div>

              {/* Clinical Details */}
              <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-700 block mb-1">Before Notes</span>
                  <p className="text-slate-600 italic">
                    {activePair.before?.notes || "Baseline condition recorded prior to therapy."}
                  </p>
                  <span className="text-[10px] text-slate-400 block mt-2">
                    Date: {activePair.before?.date_taken}
                  </span>
                </div>
                <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100">
                  <span className="font-bold text-rose-800 block mb-1">After Results</span>
                  <p className="text-slate-600 italic">
                    {activePair.after?.notes || "Noticeable improvement and desired clinical milestone reached."}
                  </p>
                  <span className="text-[10px] text-slate-400 block mt-2">
                    Date: {activePair.after?.date_taken}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setIsComparingModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* UPLOAD PHOTO MODAL */}
      {/* ========================================================================= */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-700">
                  <Camera size={16} />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-slate-800 text-sm">
                    Upload Clinical Photo
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Patient: {customerName}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 rounded-full hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-5 space-y-4">
              {/* Photo Type Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Photo Stage Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "before", label: "Before Photo", desc: "Prior to session" },
                    { id: "after", label: "After Photo", desc: "Result achieved" },
                    { id: "progress", label: "In-Progress", desc: "Midway session" },
                  ].map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setPhotoType(t.id as any)}
                      className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                        photoType === t.id
                          ? "border-rose-600 bg-rose-50 text-rose-900"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <span className="text-xs font-bold block">{t.label}</span>
                      <span className="text-[10px] text-slate-400 block">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* File Dropzone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Photo Image File
                </label>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />

                {uploadPreview ? (
                  <div className="relative aspect-16/9 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 group">
                    <Image
                      src={uploadPreview}
                      alt="Preview"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/40 text-white font-semibold text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      Change Photo
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-rose-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-rose-50/30"
                  >
                    <UploadCloud className="mx-auto text-slate-400 mb-1" size={32} />
                    <span className="text-xs font-semibold text-slate-700 block">
                      Click to browse or take photo
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Supports JPG, PNG, WebP up to 10MB
                    </span>
                  </div>
                )}
              </div>

              {/* Treatment Name & Session # */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Treatment / Service
                  </label>
                  <input
                    type="text"
                    required
                    value={treatmentName}
                    onChange={(e) => setTreatmentName(e.target.value)}
                    placeholder="e.g. Glutathione Drip, Facial..."
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Session Number
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={sessionNumber}
                    onChange={(e) => setSessionNumber(Number(e.target.value))}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-rose-500"
                  />
                </div>
              </div>

              {/* Date Taken */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Date Taken
                </label>
                <input
                  type="date"
                  value={dateTaken}
                  onChange={(e) => setDateTaken(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-rose-500"
                />
              </div>

              {/* If After photo, allow pairing with an existing Before photo */}
              {photoType === "after" && singles.filter((s) => s.photo_type === "before").length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <LinkIcon size={12} className="text-rose-600" />
                    Pair with an existing &quot;Before&quot; photo
                  </label>
                  <select
                    value={selectedPairBeforeId}
                    onChange={(e) => setSelectedPairBeforeId(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-rose-500 bg-white"
                  >
                    <option value="">-- No Pairing (Standalone Photo) --</option>
                    {singles
                      .filter((s) => s.photo_type === "before")
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.treatment_name || "Treatment"} — S{s.session_number || 1} ({s.date_taken})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Clinical Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Clinical Observations & Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Skin erythema diminished, pigment fading visible, patient expressed high satisfaction."
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:outline-rose-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !uploadFile}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 disabled:opacity-50 rounded-lg shadow-xs transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> Uploading...
                    </>
                  ) : (
                    <>
                      <UploadCloud size={14} /> Save Photo
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

