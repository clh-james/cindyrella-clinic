// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Clinical Treatment Charts & Aesthetician Handoff History Tab (EMR)
// ==============================================================================

"use client";

import { useState, useMemo } from "react";
import {
  Stethoscope,
  Activity,
  Plus,
  Calendar,
  User,
  Zap,
  Sparkles,
  HeartPulse,
  UserCheck,
  AlertCircle,
  Clock,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  PenTool,
} from "lucide-react";
import type {
  ClinicalChartRecord,
  CustomerProfile,
} from "@/app/admin/(dashboard)/customers/types";
import { NewClinicalChartModal } from "./NewClinicalChartModal";
import { deleteClinicalChart } from "@/app/admin/(dashboard)/customers/actions";
import toast from "react-hot-toast";

interface ClinicalChartsTabProps {
  customer: CustomerProfile;
  charts: ClinicalChartRecord[];
  onRefresh?: () => void;
}

export function ClinicalChartsTab({
  customer,
  charts = [],
  onRefresh,
}: ClinicalChartsTabProps) {
  const [isNewChartModalOpen, setIsNewChartModalOpen] = useState(false);
  const [selectedTreatment, setSelectedTreatment] = useState<string>("all");
  const [expandedChartId, setExpandedChartId] = useState<string | null>(
    charts[0]?.id || null
  );

  // Group and sort
  const sortedCharts = useMemo(() => {
    return [...charts].sort(
      (a, b) => new Date(b.chart_date).getTime() - new Date(a.chart_date).getTime()
    );
  }, [charts]);

  const treatmentOptions = useMemo(() => {
    const set = new Set<string>();
    charts.forEach((c) => {
      if (c.treatment_name) set.add(c.treatment_name);
    });
    return Array.from(set);
  }, [charts]);

  const filteredCharts = useMemo(() => {
    if (selectedTreatment === "all") return sortedCharts;
    return sortedCharts.filter((c) => c.treatment_name === selectedTreatment);
  }, [sortedCharts, selectedTreatment]);

  // Latest endorsement to show prominently at top
  const latestEndorsementChart = useMemo(() => {
    return sortedCharts.find((c) => !!c.endorsement_notes);
  }, [sortedCharts]);

  const handleDelete = async (chartId: string) => {
    if (!confirm("Are you sure you want to delete this clinical treatment chart?")) return;
    try {
      const res = await deleteClinicalChart(chartId, customer.id);
      if (res.success) {
        toast.success("Treatment chart deleted.");
        onRefresh?.();
      } else {
        toast.error(res.error || "Failed to delete chart.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete chart.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif font-bold text-slate-800 text-base sm:text-lg flex items-center gap-2">
              <Stethoscope className="text-teal-700" size={20} />
              Treatment Charting &amp; Clinical Notes (EMR)
            </h3>
            <span className="bg-teal-100 text-teal-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
              {charts.length} Sessions Charted
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Procedural settings, needle depth, laser parameters, and handoff endorsements between aestheticians.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {treatmentOptions.length > 0 && (
            <select
              value={selectedTreatment}
              onChange={(e) => setSelectedTreatment(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-teal-500 cursor-pointer"
            >
              <option value="all">All Treatments ({charts.length})</option>
              {treatmentOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setIsNewChartModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg shadow-xs transition-all cursor-pointer whitespace-nowrap ml-auto"
          >
            <Plus size={15} /> Chart New Session
          </button>
        </div>
      </div>

      {/* ⭐ PROMINENT AESTHETICIAN HANDOFF ALERT BANNER */}
      {latestEndorsementChart && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-200 flex items-center justify-center text-amber-900 shrink-0 mt-0.5">
              <UserCheck size={20} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold tracking-widest uppercase text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-full">
                  ⭐ Endorsement for Next Aesthetician
                </span>
                <span className="text-[11px] text-amber-800 font-mono">
                  From {latestEndorsementChart.performed_by_name} ({latestEndorsementChart.chart_date})
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-900 mt-2 bg-white/80 p-3 rounded-xl border border-amber-200 leading-relaxed shadow-2xs">
                &quot;{latestEndorsementChart.endorsement_notes}&quot;
              </p>
              <div className="flex items-center gap-4 mt-2 text-[11px] text-amber-900">
                <span>Treatment: <strong>{latestEndorsementChart.treatment_name}</strong> (Session {latestEndorsementChart.session_number})</span>
                {latestEndorsementChart.next_recommended_date && (
                  <span>Next target: <strong>{latestEndorsementChart.next_recommended_date}</strong></span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SESSION CHARTS TIMELINE */}
      {filteredCharts.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
          <Stethoscope className="mx-auto text-slate-300 mb-3" size={42} />
          <h5 className="font-serif font-bold text-slate-700 text-sm">
            No Treatment Sessions Charted Yet
          </h5>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Document procedural parameters (needle depth, laser settings, serums, tolerance) to keep a seamless clinical record across different aestheticians.
          </p>
          <button
            onClick={() => setIsNewChartModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs px-4 py-2 rounded-lg shadow-xs transition-all cursor-pointer"
          >
            <Plus size={14} /> Record First Session Chart
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCharts.map((chart) => {
            const isExpanded = expandedChartId === chart.id;

            return (
              <div
                key={chart.id}
                className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden transition-all"
              >
                {/* Session Card Header Bar */}
                <div
                  onClick={() => setExpandedChartId(isExpanded ? null : chart.id)}
                  className="p-4 bg-slate-50/70 hover:bg-slate-50 flex items-center justify-between cursor-pointer select-none border-b border-slate-100"
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-serif font-bold text-slate-900 text-sm">
                      {chart.treatment_name}
                    </span>
                    <span className="bg-teal-100 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      Session {chart.session_number} {chart.total_sessions_planned ? `of ${chart.total_sessions_planned}` : ""}
                    </span>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                      <Calendar size={12} /> {chart.chart_date}
                    </span>
                    <span className="text-[11px] text-slate-600 flex items-center gap-1">
                      <User size={12} className="text-teal-700" /> Handled by: <strong>{chart.performed_by_name}</strong> ({chart.performed_by_role || "Aesthetician"})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(chart.id);
                      }}
                      className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                      title="Delete chart entry"
                    >
                      <Trash2 size={14} />
                    </button>
                    {isExpanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                  </div>
                </div>

                {/* Session Parameters Body */}
                {isExpanded && (
                  <div className="p-5 space-y-4 text-xs">
                    {/* Clinical Parameter Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Needle / Depth Box */}
                      <div className="bg-teal-50/50 p-3 rounded-xl border border-teal-200/60 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-teal-900 flex items-center gap-1">
                          <PenTool size={11} /> Needle Settings
                        </span>
                        <div className="space-y-0.5 text-slate-700">
                          <p>Depth: <strong>{chart.needle_parameters?.depth_mm ? `${chart.needle_parameters.depth_mm} mm` : "N/A"}</strong></p>
                          <p>Gauge: <strong>{chart.needle_parameters?.gauge || "Standard"}</strong></p>
                          <p>Technique: <strong>{chart.needle_parameters?.technique || "Standard pass"}</strong></p>
                        </div>
                      </div>

                      {/* Laser / Energy Box */}
                      <div className="bg-sky-50/50 p-3 rounded-xl border border-sky-200/60 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-sky-900 flex items-center gap-1">
                          <Zap size={11} /> Laser &amp; Energy
                        </span>
                        <div className="space-y-0.5 text-slate-700">
                          <p>Device: <strong>{chart.energy_parameters?.machine_name || "N/A"}</strong></p>
                          <p>Intensity: <strong>{chart.energy_parameters?.intensity_level || "N/A"}</strong></p>
                          <p>Fluence: <strong>{chart.energy_parameters?.energy_joules ? `${chart.energy_parameters.energy_joules} J/cm²` : "N/A"}</strong> ({chart.energy_parameters?.pass_count || 1} passes)</p>
                        </div>
                      </div>

                      {/* Products / Serums Box */}
                      <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-200/60 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1">
                          <Sparkles size={11} /> Products Applied
                        </span>
                        <div className="space-y-0.5 text-slate-700">
                          <p>Serum: <strong>{chart.products_used?.serum_brand || "Standard Infusion"}</strong></p>
                          {chart.products_used?.peel_solution && (
                            <p>Peel: <strong>{chart.products_used.peel_solution}</strong> ({chart.products_used.application_time_minutes || 0}m)</p>
                          )}
                          <p>Mask: <strong>{chart.products_used?.calming_mask || "None"}</strong></p>
                        </div>
                      </div>
                    </div>

                    {/* Skin Reaction & Tolerance */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="flex items-center gap-1 font-semibold text-slate-800">
                          <HeartPulse size={13} className="text-rose-600" />
                          Erythema: <span className="capitalize font-bold text-slate-900 ml-1">{chart.skin_reaction?.erythema || "mild"}</span>
                        </span>
                        <span className="text-slate-600">
                          Tolerance: <span className="capitalize font-bold text-slate-900">{chart.skin_reaction?.client_tolerance || "good"}</span>
                        </span>
                        <span className="text-slate-600">
                          Pain Scale: <strong>{chart.skin_reaction?.pain_scale ?? 3} / 10</strong>
                        </span>
                        {chart.skin_reaction?.pinpoint_bleeding && (
                          <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Pinpoint Bleeding
                          </span>
                        )}
                        {chart.skin_reaction?.frosting && (
                          <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Clinical Frosting
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Endorsement for Next Practitioner */}
                    {chart.endorsement_notes && (
                      <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-xl">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-900 block mb-0.5">
                          ⭐ Endorsement Note for Next Aesthetician:
                        </span>
                        <p className="font-semibold text-slate-900 italic">
                          &quot;{chart.endorsement_notes}&quot;
                        </p>
                      </div>
                    )}

                    {/* Clinical Notes & Homecare */}
                    {(chart.clinical_notes || chart.homecare_advice) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {chart.clinical_notes && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <span className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Clinical Notes</span>
                            <p className="text-slate-700">{chart.clinical_notes}</p>
                          </div>
                        )}
                        {chart.homecare_advice && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <span className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Prescribed Homecare</span>
                            <p className="text-slate-700">{chart.homecare_advice}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* NEW CHART MODAL */}
      {isNewChartModalOpen && (
        <NewClinicalChartModal
          isOpen={isNewChartModalOpen}
          onClose={() => setIsNewChartModalOpen(false)}
          customer={customer}
          initialSessionNumber={(charts.length || 0) + 1}
          onSaved={() => {
            setIsNewChartModalOpen(false);
            onRefresh?.();
          }}
        />
      )}
    </div>
  );
}
