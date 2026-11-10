// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// New Clinical Treatment Chart & Session EMR Modal
// ==============================================================================

"use client";

import { useState } from "react";
import {
  X,
  Stethoscope,
  Activity,
  Sparkles,
  Zap,
  Layers,
  HeartPulse,
  UserCheck,
  Calendar,
  AlertCircle,
  Clock,
  Loader2,
  CheckCircle2,
  PenTool,
} from "lucide-react";
import { saveClinicalChart } from "@/app/admin/(dashboard)/customers/actions";
import type { CustomerProfile } from "@/app/admin/(dashboard)/customers/types";
import toast from "react-hot-toast";

interface NewClinicalChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerProfile;
  initialTreatmentName?: string;
  initialSessionNumber?: number;
  onSaved?: () => void;
}

const COMMON_TREATMENTS = [
  "Cinderella Glutathione Drip Infusion",
  "Diamond Peel Facial with Phototherapy",
  "CO2 Fractional Laser Resurfacing",
  "Diode 808nm Laser Hair Removal",
  "Pico Laser Melasma & Pigmentation",
  "Microneedling Collagen Induction",
  "HIFU Non-Surgical Face Contouring",
  "Chemical Skin Peeling (TCA / Glycolic)",
  "RF Skin Tightening & Slimming",
  "Penile Enhancement Combo",
];

export function NewClinicalChartModal({
  isOpen,
  onClose,
  customer,
  initialTreatmentName,
  initialSessionNumber = 1,
  onSaved,
}: NewClinicalChartModalProps) {
  // Session details
  const [treatmentName, setTreatmentName] = useState(
    initialTreatmentName || COMMON_TREATMENTS[0]
  );
  const [sessionNumber, setSessionNumber] = useState<number>(initialSessionNumber);
  const [totalSessionsPlanned, setTotalSessionsPlanned] = useState<number>(6);
  const [chartDate, setChartDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  // 1. Needle Parameters
  const [depthMm, setDepthMm] = useState<string>("1.0");
  const [gauge, setGauge] = useState<string>("32G 4mm");
  const [technique, setTechnique] = useState<string>("Stamping & Gliding");

  // 2. Energy / Laser Settings
  const [machineName, setMachineName] = useState<string>("");
  const [intensityLevel, setIntensityLevel] = useState<string>("Level 3 (Medium)");
  const [energyJoules, setEnergyJoules] = useState<string>("18");
  const [pulseDuration, setPulseDuration] = useState<string>("30");
  const [spotSize, setSpotSize] = useState<string>("10");
  const [passCount, setPassCount] = useState<number>(2);

  // 3. Products & Consumables
  const [serumBrand, setSerumBrand] = useState<string>("Cinderella Complex Glutathione Ampoule");
  const [peelSolution, setPeelSolution] = useState<string>("");
  const [applicationTimeMinutes, setApplicationTimeMinutes] = useState<number>(0);
  const [topicalAnestheticUsed, setTopicalAnestheticUsed] = useState<boolean>(false);
  const [calmingMask, setCalmingMask] = useState<string>("Cica Calming Cryo Sheet Mask");

  // 4. Skin Reaction & Tolerance
  const [erythema, setErythema] = useState<"none" | "mild" | "moderate" | "intense">("mild");
  const [edema, setEdema] = useState<"none" | "mild" | "moderate">("none");
  const [pinpointBleeding, setPinpointBleeding] = useState<boolean>(false);
  const [frosting, setFrosting] = useState<boolean>(false);
  const [painScale, setPainScale] = useState<number>(3);
  const [clientTolerance, setClientTolerance] = useState<"excellent" | "good" | "sensitive" | "poor">("good");

  // 5. Narrative Notes
  const [clinicalNotes, setClinicalNotes] = useState<string>("");
  const [endorsementNotes, setEndorsementNotes] = useState<string>("");
  const [homecareAdvice, setHomecareAdvice] = useState<string>(
    "Apply Cindyrella Tinted Sunscreen SPF 50+ daily. Avoid direct sunlight and harsh AHA/BHA exfoliants for 48 hours."
  );
  const [nextRecommendedDate, setNextRecommendedDate] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!treatmentName.trim()) {
      toast.error("Please enter a treatment name.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await saveClinicalChart({
        customer_id: customer.id,
        treatment_name: treatmentName.trim(),
        session_number: Number(sessionNumber),
        total_sessions_planned: Number(totalSessionsPlanned),
        chart_date: chartDate,
        needle_parameters: {
          depth_mm: depthMm || null,
          gauge: gauge || null,
          technique: technique || null,
        },
        energy_parameters: {
          machine_name: machineName || null,
          intensity_level: intensityLevel || null,
          energy_joules: energyJoules || null,
          pulse_duration_ms: pulseDuration || null,
          spot_size_mm: spotSize || null,
          pass_count: Number(passCount),
        },
        products_used: {
          serum_brand: serumBrand || null,
          peel_solution: peelSolution || null,
          application_time_minutes: Number(applicationTimeMinutes),
          topical_anesthetic_used: topicalAnestheticUsed,
          calming_mask: calmingMask || null,
        },
        skin_reaction: {
          erythema,
          edema,
          pinpoint_bleeding: pinpointBleeding,
          frosting,
          pain_scale: Number(painScale),
          client_tolerance: clientTolerance,
        },
        clinical_notes: clinicalNotes.trim() || undefined,
        endorsement_notes: endorsementNotes.trim() || undefined,
        homecare_advice: homecareAdvice.trim() || undefined,
        next_recommended_date: nextRecommendedDate || undefined,
      });

      if (res.success) {
        toast.success("Treatment session charted successfully!");
        onSaved?.();
        onClose();
      } else {
        toast.error(res.error || "Failed to record chart.");
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
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20">
              <Stethoscope size={22} className="text-teal-200" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-teal-200 block">
                Clinical EMR &amp; Aesthetic Treatment Chart
              </span>
              <h2 className="font-serif font-bold text-base sm:text-lg">
                Record Session Parameters &amp; Endorsement
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
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs">
          {/* Patient Identification Card */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Patient</span>
              <span className="font-bold text-slate-900 text-sm">{customer.full_name || `${customer.first_name || ""} ${customer.last_name || ""}`}</span>
              <span className="text-slate-500 block text-[11px]">{customer.phone}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Chart Date</span>
              <input
                type="date"
                value={chartDate}
                onChange={(e) => setChartDate(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1 bg-white font-semibold text-slate-800 focus:outline-teal-600"
              />
            </div>
          </div>

          {/* Procedure & Session Progress */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Treatment / Procedure Name
              </label>
              <input
                type="text"
                required
                value={treatmentName}
                onChange={(e) => setTreatmentName(e.target.value)}
                placeholder="e.g. CO2 Fractional Laser, Microneedling..."
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-900 bg-white font-semibold focus:outline-teal-600"
              />
              <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                <span className="text-[10px] text-slate-400">Quick select:</span>
                {COMMON_TREATMENTS.slice(0, 3).map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setTreatmentName(t)}
                    className="text-[10px] bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-600 px-2 py-0.5 rounded cursor-pointer transition-colors"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Session Number
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={sessionNumber}
                  onChange={(e) => setSessionNumber(Number(e.target.value))}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-900 bg-white font-bold focus:outline-teal-600"
                />
                <span className="text-slate-400">of</span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={totalSessionsPlanned}
                  onChange={(e) => setTotalSessionsPlanned(Number(e.target.value))}
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 text-slate-900 bg-white font-bold focus:outline-teal-600"
                />
              </div>
            </div>
          </div>

          {/* SECTION 1: Needle & Mechanical Parameters */}
          <div className="bg-teal-50/40 p-4 rounded-xl border border-teal-200/70 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-900 border-b border-teal-200/70 pb-2">
              <PenTool size={14} className="text-teal-700" />
              1. Needle &amp; Depth Settings (For Microneedling / Meso / Injections)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Needle Penetration Depth (mm)
                </label>
                <input
                  type="text"
                  value={depthMm}
                  onChange={(e) => setDepthMm(e.target.value)}
                  placeholder="e.g. 0.5mm, 1.0mm, 1.5mm"
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 bg-white focus:outline-teal-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Gauge / Cartridge Specification
                </label>
                <input
                  type="text"
                  value={gauge}
                  onChange={(e) => setGauge(e.target.value)}
                  placeholder="e.g. 30G, 32G, 36-pin nano"
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 bg-white focus:outline-teal-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Application Technique
                </label>
                <input
                  type="text"
                  value={technique}
                  onChange={(e) => setTechnique(e.target.value)}
                  placeholder="e.g. Circular, Stamping, Cross-hatch"
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 bg-white focus:outline-teal-600"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Laser, Light & Energy Settings */}
          <div className="bg-sky-50/40 p-4 rounded-xl border border-sky-200/70 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-900 border-b border-sky-200/70 pb-2">
              <Zap size={14} className="text-sky-700" />
              2. Laser, Light &amp; Energy Parameters (Pico / Diode / CO2 / RF)
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Machine Model / Device
                </label>
                <input
                  type="text"
                  value={machineName}
                  onChange={(e) => setMachineName(e.target.value)}
                  placeholder="e.g. PicoCare Laser, Diode 808"
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 bg-white focus:outline-sky-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Power / Intensity Level
                </label>
                <input
                  type="text"
                  value={intensityLevel}
                  onChange={(e) => setIntensityLevel(e.target.value)}
                  placeholder="e.g. Level 3 (Medium-High)"
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 bg-white focus:outline-sky-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Energy Fluence (J/cm²)
                </label>
                <input
                  type="text"
                  value={energyJoules}
                  onChange={(e) => setEnergyJoules(e.target.value)}
                  placeholder="e.g. 18 J/cm²"
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 bg-white focus:outline-sky-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Pulse Duration (ms)
                </label>
                <input
                  type="text"
                  value={pulseDuration}
                  onChange={(e) => setPulseDuration(e.target.value)}
                  placeholder="e.g. 30 ms"
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 bg-white focus:outline-sky-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Spot Size (mm)
                </label>
                <input
                  type="text"
                  value={spotSize}
                  onChange={(e) => setSpotSize(e.target.value)}
                  placeholder="e.g. 10 mm"
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 bg-white focus:outline-sky-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Number of Passes
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={passCount}
                  onChange={(e) => setPassCount(Number(e.target.value))}
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 bg-white focus:outline-sky-600"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: Serums, Solutions & Consumables */}
          <div className="bg-rose-50/40 p-4 rounded-xl border border-rose-200/70 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-900 border-b border-rose-200/70 pb-2">
              <Sparkles size={14} className="text-rose-700" />
              3. Serums, Chemical Solutions &amp; Topicals Applied
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Serum / Ampoule Brand &amp; Formula
                </label>
                <input
                  type="text"
                  value={serumBrand}
                  onChange={(e) => setSerumBrand(e.target.value)}
                  placeholder="e.g. PDRN Salmon DNA, Cinderella Gluta..."
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 bg-white focus:outline-rose-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Peel Solution / Acid (if applicable)
                </label>
                <input
                  type="text"
                  value={peelSolution}
                  onChange={(e) => setPeelSolution(e.target.value)}
                  placeholder="e.g. Glycolic Acid 30%, TCA 15%"
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 bg-white focus:outline-rose-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Post-Treatment Calming Mask / Cold Pack
                </label>
                <input
                  type="text"
                  value={calmingMask}
                  onChange={(e) => setCalmingMask(e.target.value)}
                  placeholder="e.g. Cica Sheet Mask with Cryo Ball"
                  className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 bg-white focus:outline-rose-600"
                />
              </div>

              <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200 mt-auto">
                <span className="font-bold text-slate-700">Topical Anesthetic (Lidocaine) Used?</span>
                <input
                  type="checkbox"
                  checked={topicalAnestheticUsed}
                  onChange={(e) => setTopicalAnestheticUsed(e.target.checked)}
                  className="rounded border-slate-300 text-rose-700 focus:ring-rose-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: Skin Reaction & Patient Tolerance */}
          <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-200/70 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-900 border-b border-amber-200/70 pb-2">
              <HeartPulse size={14} className="text-amber-700" />
              4. Immediate Clinical Reaction &amp; Client Tolerance
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Erythema (Redness)
                </label>
                <select
                  value={erythema}
                  onChange={(e) => setErythema(e.target.value as any)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white text-slate-900"
                >
                  <option value="none">None</option>
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="intense">Intense</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Edema (Swelling)
                </label>
                <select
                  value={edema}
                  onChange={(e) => setEdema(e.target.value as any)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white text-slate-900"
                >
                  <option value="none">None</option>
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Overall Tolerance
                </label>
                <select
                  value={clientTolerance}
                  onChange={(e) => setClientTolerance(e.target.value as any)}
                  className="w-full text-xs border border-slate-300 rounded-lg px-2 py-1.5 bg-white text-slate-900 font-semibold"
                >
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="sensitive">Sensitive</option>
                  <option value="poor">Poor / Low threshold</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Pain Scale: {painScale} / 10
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={painScale}
                  onChange={(e) => setPainScale(Number(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center gap-6 pt-1">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={pinpointBleeding}
                  onChange={(e) => setPinpointBleeding(e.target.checked)}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <span>Pin-point Bleeding (Expected in microneedling)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={frosting}
                  onChange={(e) => setFrosting(e.target.checked)}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <span>Clinical Frosting Observed (In chemical peel / pico)</span>
              </label>
            </div>
          </div>

          {/* SECTION 5: Endorsement to Next Aesthetician (Crucial Feature!) */}
          <div className="bg-yellow-50 border-2 border-yellow-300 p-4 rounded-xl space-y-2 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-yellow-950">
              <UserCheck size={16} className="text-yellow-700" />
              ⭐ Endorsement to Next Aesthetician / Practitioner (Crucial Handoff)
            </div>
            <p className="text-[11px] text-yellow-900">
              Write specific observations and advice for whichever aesthetician handles the next session (e.g. sensitivity spots, preferred needle gauge, reaction to serum, areas to avoid or focus on).
            </p>
            <textarea
              rows={2}
              required
              value={endorsementNotes}
              onChange={(e) => setEndorsementNotes(e.target.value)}
              placeholder="e.g. Client has thin sensitive skin around nasolabial fold; maintain depth at 0.5mm there. Loved the cryo ball calming mask. Tolerated Level 3 very well on cheeks."
              className="w-full text-xs border border-yellow-300 rounded-lg p-2.5 text-slate-900 bg-white font-medium focus:outline-yellow-600"
            />
          </div>

          {/* SECTION 6: Procedural Clinical Notes & Homecare */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Detailed Clinical Notes &amp; Observations
              </label>
              <textarea
                rows={2}
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="Full procedural walkthrough notes..."
                className="w-full text-xs border border-slate-300 rounded-lg p-2 text-slate-900 bg-white focus:outline-teal-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Prescribed Homecare &amp; Aftercare Advice
              </label>
              <textarea
                rows={2}
                value={homecareAdvice}
                onChange={(e) => setHomecareAdvice(e.target.value)}
                placeholder="Aftercare regimen prescribed..."
                className="w-full text-xs border border-slate-300 rounded-lg p-2 text-slate-900 bg-white focus:outline-teal-600"
              />
            </div>
          </div>

          {/* Next Recommended Date */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
            <span className="font-bold text-slate-700">Next Recommended Session Date:</span>
            <input
              type="date"
              value={nextRecommendedDate}
              onChange={(e) => setNextRecommendedDate(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-800 font-semibold focus:outline-teal-600"
            />
          </div>

          {/* Action Buttons */}
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
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 rounded-xl shadow-md transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Recording Chart...
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} /> Save Clinical Treatment Chart
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
