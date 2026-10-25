"use client";

import { useState, useTransition, useMemo, useRef } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
  Image as ImageIcon,
  UserCheck,
  Target,
  Sparkles,
  Percent,
  CheckCircle2,
  Save,
} from "lucide-react";
import {
  upsertTreatment,
  deleteTreatment,
  autoComputeAllCommissions,
  saveBulkServiceQuotas,
} from "./actions";
import type { Treatment } from "@/lib/supabase/types";
import toast from "react-hot-toast";

const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;

interface StaffMember {
  id: string;
  fullName: string;
  role: string;
}

interface ServicesClientProps {
  initialTreatments: Treatment[];
  staffList?: StaffMember[];
}

export function ServicesClient({
  initialTreatments,
  staffList = [],
}: ServicesClientProps) {
  const [isPending, startTransition] = useTransition();
  const [treatments] = useState<Treatment[]>(initialTreatments);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<Treatment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isComputingCommissions, setIsComputingCommissions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bulk quota state for the quick quota modal
  const [bulkQuotas, setBulkQuotas] = useState<
    Record<string, {
      handled_by: string;
      commission_rate: number;
      commission_type: "percentage" | "fixed";
      quota_target: number;
    }>
  >(() => {
    const initial: Record<string, {
      handled_by: string;
      commission_rate: number;
      commission_type: "percentage" | "fixed";
      quota_target: number;
    }> = {};
    initialTreatments.forEach((t) => {
      initial[t.id] = {
        handled_by: t.handled_by || "",
        commission_rate: t.commission_rate ?? 10,
        commission_type: t.commission_type || "percentage",
        quota_target: t.quota_target ?? 0,
      };
    });
    return initial;
  });

  const filteredTreatments = useMemo(() => {
    return treatments.filter(
      (t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.handler_name && t.handler_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [treatments, searchQuery]);

  const openModal = (t: Treatment | null = null) => {
    setEditingTreatment(t);
    setError(null);
    setSelectedImage(null);
    setPreviewUrl(t?.image_url || null);
    setRemoveImage(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTreatment(null);
    setSelectedImage(null);
    setPreviewUrl(null);
  };

  const handleFileSelect = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Only JPG, PNG and WEBP are supported");
      return;
    }
    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
    setRemoveImage(false);
    setError(null);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const onRemoveImage = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    setRemoveImage(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    if (selectedImage) formData.append("image", selectedImage);
    if (removeImage) formData.append("remove_image", "true");

    startTransition(async () => {
      const res = await upsertTreatment(formData);
      if (res.error) {
        setError(res.error);
        toast.error(res.error);
      } else {
        toast.success("Service saved with handler & quota settings!");
        closeModal();
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;

    startTransition(async () => {
      const res = await deleteTreatment(id);
      if (res.error) toast.error(res.error);
      else toast.success("Service removed.");
    });
  };

  // Auto compute commissions action
  const handleAutoComputeCommissions = async () => {
    setIsComputingCommissions(true);
    try {
      const res = await autoComputeAllCommissions();
      if (!res.success) {
        toast.error(res.error || "Failed to auto-compute commissions.");
      } else {
        toast.success(
          `Auto-computed ${res.count} commissions totaling ${peso(res.totalAmount || 0)} credited to staff payroll!`,
          { duration: 5000 }
        );
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error computing commissions");
    } finally {
      setIsComputingCommissions(false);
    }
  };

  // Save bulk quotas
  const handleSaveBulkQuotas = async () => {
    startTransition(async () => {
      const res = await saveBulkServiceQuotas(bulkQuotas);
      if (!res.success) {
        toast.error(res.error || "Failed to save quotas.");
      } else {
        toast.success("Service quotas and handlers updated successfully!");
        setIsQuotaModalOpen(false);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-xl sm:text-2xl font-semibold text-ink">Services & Pricing</h1>
          <p className="mt-1 text-xs sm:text-sm text-ink-soft">
            Clinic services offered, assigned aestheticians/handlers, and commission quota settings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Auto Compute Commissions Button */}
          <button
            onClick={handleAutoComputeCommissions}
            disabled={isComputingCommissions}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium text-xs shadow-sm transition-all disabled:opacity-50"
            title="Automatically compute commissions for all completed appointments based on handler quotas"
          >
            <Sparkles size={14} className={isComputingCommissions ? "animate-spin" : ""} />
            {isComputingCommissions ? "Computing..." : "Auto-Compute Commissions"}
          </button>

          {/* Quick Quota & Commission Setup */}
          <button
            onClick={() => setIsQuotaModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium text-xs shadow-sm transition-all"
          >
            <Target size={14} />
            Set Quotas & Commissions
          </button>

          {/* Add Service */}
          <button
            onClick={() => openModal()}
            className="flex items-center gap-1.5 px-4 py-2 bg-royal text-white rounded-xl font-medium text-xs hover:bg-royal/90 shadow-sm transition-colors"
          >
            <Plus size={15} />
            Add Service
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" size={17} />
        <input
          type="text"
          placeholder="Search by service name, category, or handler..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl border border-line bg-white focus:border-royal focus:outline-hidden text-xs text-ink transition-colors"
        />
      </div>

      {/* MOBILE VIEW (CARDS) */}
      <div className="grid gap-4 lg:hidden">
        {filteredTreatments.map((t) => {
          const quota = t.quota_target || 0;
          const completed = t.completed_count || 0;
          const progressPercent = quota > 0 ? Math.min(100, Math.round((completed / quota) * 100)) : 0;

          return (
            <div key={t.id} className="rounded-2xl border border-line bg-white p-4 shadow-sm flex flex-col gap-3 relative">
              <div className="absolute top-4 right-4 flex items-center gap-1.5">
                <button
                  onClick={() => openModal(t)}
                  className="p-1.5 text-ink-soft hover:text-royal hover:bg-royal/10 rounded-lg transition-colors"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="p-1.5 text-ink-soft hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="flex gap-3 items-start pr-16">
                <div className="w-12 h-12 rounded-xl border border-line bg-pale overflow-hidden shrink-0 flex items-center justify-center">
                  {t.image_url ? (
                    <img src={t.image_url} alt={t.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={18} className="text-ink-soft/50" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-ink leading-tight text-sm">{t.name}</h3>
                  <p className="text-[11px] text-ink-soft capitalize mt-0.5">{t.category}</p>
                  
                  {/* Handler Badge */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {t.handler_name ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 text-purple-700 px-2 py-0.5 text-[10px] font-semibold border border-purple-200">
                        <UserCheck size={10} />
                        Handled by: {t.handler_name}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 text-gray-600 px-2 py-0.5 text-[10px] font-medium border border-gray-200">
                        Any Aesthetician
                      </span>
                    )}

                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium border ${t.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-600 border-gray-200"}`}>
                      {t.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pricing & Commission / Quota Grid */}
              <div className="grid grid-cols-2 gap-3 border-t border-line border-dashed pt-3 mt-1 text-xs">
                <div>
                  <p className="text-[10px] text-ink-soft uppercase tracking-wider font-semibold mb-0.5">Session Price</p>
                  <p className="font-mono font-bold text-royal text-sm">{peso(t.session_price)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-ink-soft uppercase tracking-wider font-semibold mb-0.5">Commission</p>
                  <p className="font-semibold text-ink text-xs">
                    {t.commission_rate ?? 10}
                    {t.commission_type === "fixed" ? " ₱ fixed" : "% per service"}
                  </p>
                </div>
              </div>

              {/* Quota Progress */}
              {quota > 0 && (
                <div className="rounded-xl bg-pale/50 p-2.5 border border-line/60 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-medium text-ink-soft flex items-center gap-1">
                      <Target size={11} className="text-purple-600" />
                      Monthly Quota Target
                    </span>
                    <span className="font-mono font-bold text-ink">
                      {completed} / {quota} ({progressPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-line rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${progressPercent >= 100 ? "bg-emerald-500" : "bg-purple-600"}`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredTreatments.length === 0 && (
          <div className="py-10 text-center text-xs text-ink-soft border border-line rounded-2xl bg-white">
            No services found matching your criteria.
          </div>
        )}
      </div>

      {/* DESKTOP VIEW (TABLE) */}
      <div className="hidden lg:block overflow-x-auto rounded-2xl border border-line bg-white shadow-xs">
        <table className="w-full min-w-[1000px] border-collapse text-xs">
          <thead>
            <tr className="bg-pale/60 text-left text-ink border-b border-line uppercase text-[10px] tracking-wider font-bold">
              <th className="px-4 py-3 w-14">Image</th>
              <th className="px-4 py-3">Service & Category</th>
              <th className="px-4 py-3">Handled By (Staff)</th>
              <th className="px-3 py-3 font-mono">Session Price</th>
              <th className="px-3 py-3">Commission</th>
              <th className="px-3 py-3">Quota & Progress</th>
              <th className="px-3 py-3">Duration</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filteredTreatments.map((t) => {
              const quota = t.quota_target || 0;
              const completed = t.completed_count || 0;
              const progressPercent = quota > 0 ? Math.min(100, Math.round((completed / quota) * 100)) : 0;

              return (
                <tr key={t.id} className="hover:bg-pale/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="w-10 h-10 rounded-lg border border-line bg-pale overflow-hidden shrink-0 flex items-center justify-center">
                      {t.image_url ? (
                        <img src={t.image_url} alt={t.name} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon size={15} className="text-ink-soft/40" />
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink text-xs">{t.name}</div>
                    <div className="text-[11px] text-ink-soft capitalize mt-0.5">{t.category}</div>
                  </td>

                  {/* Handled By Column */}
                  <td className="px-4 py-3">
                    {t.handler_name ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 text-purple-700 px-2.5 py-1 text-[11px] font-semibold border border-purple-200">
                        <UserCheck size={12} />
                        {t.handler_name}
                      </span>
                    ) : (
                      <span className="text-[11px] text-ink-soft italic">
                        Any Aesthetician
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-3 font-mono font-bold text-royal text-xs">
                    {peso(t.session_price)}
                  </td>

                  {/* Commission */}
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1 font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                      <Percent size={11} />
                      {t.commission_rate ?? 10}
                      {t.commission_type === "fixed" ? " ₱ (Fixed)" : "%"}
                    </span>
                  </td>

                  {/* Quota & Progress */}
                  <td className="px-3 py-3 min-w-[140px]">
                    {quota > 0 ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-medium text-ink-soft">Target: {quota}</span>
                          <span className="font-mono font-bold text-ink">
                            {completed}/{quota} ({progressPercent}%)
                          </span>
                        </div>
                        <div className="w-full bg-line rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${progressPercent >= 100 ? "bg-emerald-500" : "bg-purple-600"}`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-[11px] text-ink-soft font-mono">No quota set</span>
                    )}
                  </td>

                  <td className="px-3 py-3 text-ink-soft text-[11px]">
                    {t.duration_minutes ? `${t.duration_minutes} min` : "—"}
                  </td>

                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold border uppercase tracking-wider ${
                        t.is_active
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-gray-50 text-gray-600 border-gray-200"
                      }`}
                    >
                      {t.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openModal(t)}
                        className="p-1.5 text-ink-soft hover:text-royal hover:bg-royal/10 rounded-lg transition-colors"
                        title="Edit Service, Handler & Quota"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="p-1.5 text-ink-soft hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Service"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* QUICK QUOTA & COMMISSION MODAL */}
      {isQuotaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-line bg-pale/50">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-purple-100 p-2 text-purple-700">
                  <Target size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-ink text-base font-serif">Service Handlers, Quotas & Commission Rates</h2>
                  <p className="text-xs text-ink-soft">
                    Assign which aesthetician handles each service, set monthly session quotas, and customize commission rates.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsQuotaModalOpen(false)}
                className="p-1.5 text-ink-soft hover:text-ink hover:bg-line/50 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="rounded-xl bg-blue-50/70 p-3 text-xs text-blue-900 border border-blue-200 flex items-start gap-2">
                <CheckCircle2 size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Auto-Compute Integration:</strong> When services are marked completed in Appointments,
                  the system automatically credits the specified commission to the assigned handler&apos;s payroll record.
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-line">
                <table className="w-full text-xs text-left">
                  <thead className="bg-pale/70 border-b border-line uppercase text-[10px] tracking-wider text-ink-soft font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Service Name</th>
                      <th className="py-2.5 px-3">Handled By (Primary Staff)</th>
                      <th className="py-2.5 px-3">Commission Rate</th>
                      <th className="py-2.5 px-3">Commission Type</th>
                      <th className="py-2.5 px-3">Monthly Quota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {treatments.map((t) => {
                      const q = bulkQuotas[t.id] || {
                        handled_by: "",
                        commission_rate: 10,
                        commission_type: "percentage",
                        quota_target: 0,
                      };

                      return (
                        <tr key={t.id} className="hover:bg-pale/20">
                          <td className="py-2.5 px-3 font-medium text-ink">
                            <div>{t.name}</div>
                            <div className="text-[10px] text-ink-soft font-mono">{peso(t.session_price)}</div>
                          </td>

                          {/* Handled By Dropdown */}
                          <td className="py-2.5 px-3">
                            <select
                              value={q.handled_by}
                              onChange={(e) =>
                                setBulkQuotas((prev) => ({
                                  ...prev,
                                  [t.id]: { ...q, handled_by: e.target.value },
                                }))
                              }
                              className="rounded-lg border border-line bg-white px-2.5 py-1 text-xs text-ink focus:border-royal focus:outline-hidden"
                            >
                              <option value="">Any Available Aesthetician</option>
                              {staffList.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.fullName} ({s.role})
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Commission Rate */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={q.commission_rate}
                                onChange={(e) =>
                                  setBulkQuotas((prev) => ({
                                    ...prev,
                                    [t.id]: {
                                      ...q,
                                      commission_rate: parseFloat(e.target.value) || 0,
                                    },
                                  }))
                                }
                                className="w-20 rounded-lg border border-line px-2 py-1 text-xs font-mono text-ink focus:border-royal focus:outline-hidden"
                              />
                            </div>
                          </td>

                          {/* Commission Type */}
                          <td className="py-2.5 px-3">
                            <select
                              value={q.commission_type}
                              onChange={(e) =>
                                setBulkQuotas((prev) => ({
                                  ...prev,
                                  [t.id]: {
                                    ...q,
                                    commission_type: e.target.value as "percentage" | "fixed",
                                  },
                                }))
                              }
                              className="rounded-lg border border-line bg-white px-2 py-1 text-xs text-ink focus:border-royal focus:outline-hidden"
                            >
                              <option value="percentage">Percentage (%)</option>
                              <option value="fixed">Fixed Pesos (₱)</option>
                            </select>
                          </td>

                          {/* Monthly Quota */}
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              min="0"
                              value={q.quota_target}
                              placeholder="0 (no quota)"
                              onChange={(e) =>
                                setBulkQuotas((prev) => ({
                                  ...prev,
                                  [t.id]: {
                                    ...q,
                                    quota_target: parseInt(e.target.value, 10) || 0,
                                  },
                                }))
                              }
                              className="w-24 rounded-lg border border-line px-2 py-1 text-xs font-mono text-ink focus:border-royal focus:outline-hidden"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t border-line bg-pale/40 flex items-center justify-between">
              <span className="text-xs text-ink-soft">
                {treatments.length} total services configured
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuotaModalOpen(false)}
                  className="px-4 py-2 bg-white border border-line text-ink font-medium text-xs rounded-xl hover:bg-pale transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleSaveBulkQuotas}
                  className="flex items-center gap-1.5 px-4 py-2 bg-royal text-white font-medium text-xs rounded-xl hover:bg-royal/90 shadow-sm transition-colors disabled:opacity-50"
                >
                  <Save size={14} />
                  {isPending ? "Saving..." : "Save All Quotas & Handlers"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT SERVICE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-line bg-pale/60 sticky top-0 z-10 backdrop-blur-xs">
              <h2 className="font-bold text-ink text-base font-serif">
                {editingTreatment ? "Edit Service" : "Add Service"}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 text-ink-soft hover:text-ink hover:bg-line/50 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100">
                  {error}
                </div>
              )}

              {editingTreatment && <input type="hidden" name="id" value={editingTreatment.id} />}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-ink mb-1">Service Name *</label>
                  <input
                    required
                    name="name"
                    defaultValue={editingTreatment?.name}
                    className="w-full px-3 py-2 border border-line rounded-xl focus:outline-hidden focus:border-royal text-xs text-ink"
                    placeholder="e.g. Total Glow Drip"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Category *</label>
                  <input
                    required
                    name="category"
                    defaultValue={editingTreatment?.category}
                    className="w-full px-3 py-2 border border-line rounded-xl focus:outline-hidden focus:border-royal text-xs text-ink"
                    placeholder="e.g. IV Therapy"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    name="duration_minutes"
                    defaultValue={editingTreatment?.duration_minutes ?? ""}
                    className="w-full px-3 py-2 border border-line rounded-xl focus:outline-hidden focus:border-royal text-xs text-ink"
                    placeholder="e.g. 45"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Session Price (₱) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    name="session_price"
                    defaultValue={editingTreatment?.session_price}
                    className="w-full px-3 py-2 border border-line rounded-xl focus:outline-hidden focus:border-royal text-xs font-mono font-semibold text-ink"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Sort Order</label>
                  <input
                    type="number"
                    name="sort_order"
                    defaultValue={editingTreatment?.sort_order || 0}
                    className="w-full px-3 py-2 border border-line rounded-xl focus:outline-hidden focus:border-royal text-xs text-ink"
                  />
                </div>

                {/* Handled By (Aesthetician) */}
                <div className="col-span-2 rounded-2xl bg-purple-50/60 border border-purple-200 p-3.5 space-y-3">
                  <div className="flex items-center gap-1.5 text-purple-900 font-bold text-xs">
                    <UserCheck size={15} />
                    <span>Handler Attribution & Commission Quota</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      Assigned Handler / Aesthetician
                    </label>
                    <select
                      name="handled_by"
                      defaultValue={editingTreatment?.handled_by || ""}
                      className="w-full px-3 py-2 border border-line bg-white rounded-xl focus:outline-hidden focus:border-royal text-xs text-ink"
                    >
                      <option value="">Any Available Aesthetician / Staff</option>
                      {staffList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.fullName} ({s.role})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-ink-soft mt-1">
                      Who is credited with performing this service when completed
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-ink mb-1">Commission Rate</label>
                      <input
                        type="number"
                        step="0.1"
                        name="commission_rate"
                        defaultValue={editingTreatment?.commission_rate ?? 10}
                        className="w-full px-2.5 py-1.5 border border-line bg-white rounded-xl focus:outline-hidden focus:border-royal text-xs font-mono text-ink"
                        placeholder="10.0"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-ink mb-1">Rate Type</label>
                      <select
                        name="commission_type"
                        defaultValue={editingTreatment?.commission_type || "percentage"}
                        className="w-full px-2.5 py-1.5 border border-line bg-white rounded-xl focus:outline-hidden focus:border-royal text-xs text-ink"
                      >
                        <option value="percentage">Percent (%)</option>
                        <option value="fixed">Pesos (₱)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-ink mb-1">Monthly Quota</label>
                      <input
                        type="number"
                        name="quota_target"
                        defaultValue={editingTreatment?.quota_target ?? 0}
                        className="w-full px-2.5 py-1.5 border border-line bg-white rounded-xl focus:outline-hidden focus:border-royal text-xs font-mono text-ink"
                        placeholder="20"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">5+1 Package (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="five_plus_one_price"
                    defaultValue={editingTreatment?.five_plus_one_price ?? ""}
                    className="w-full px-3 py-2 border border-line rounded-xl focus:outline-hidden focus:border-royal text-xs font-mono text-ink"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">10+2 Package (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="ten_plus_two_price"
                    defaultValue={editingTreatment?.ten_plus_two_price ?? ""}
                    className="w-full px-3 py-2 border border-line rounded-xl focus:outline-hidden focus:border-royal text-xs font-mono text-ink"
                    placeholder="0.00"
                  />
                </div>

                {/* Service Image */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-ink mb-1.5">Service Image</label>

                  {previewUrl ? (
                    <div className="relative w-full aspect-2/1 sm:aspect-video rounded-2xl border border-line overflow-hidden bg-pale">
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={onRemoveImage}
                        className="absolute top-2 right-2 p-1.5 bg-white/90 text-red-600 rounded-xl hover:bg-white shadow-sm"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`w-full border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center transition-colors ${
                        isDragging ? "border-royal bg-royal/5" : "border-line hover:border-royal/50"
                      }`}
                      onDragOver={onDragOver}
                      onDragLeave={onDragLeave}
                      onDrop={onDrop}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                      />
                      <div className="w-10 h-10 rounded-full bg-pale flex items-center justify-center text-ink-soft mb-2">
                        <ImageIcon size={20} />
                      </div>
                      <p className="text-xs font-semibold text-ink">Upload Service Image</p>
                      <p className="text-[10px] text-ink-soft mt-0.5 mb-2.5">PNG, JPG, WEBP — Max 5MB</p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-1.5 bg-pale hover:bg-line/50 text-ink font-semibold text-xs rounded-xl transition-colors"
                      >
                        Choose Image
                      </button>
                    </div>
                  )}
                </div>

                <div className="col-span-2 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="is_active"
                      value="true"
                      defaultChecked={editingTreatment ? editingTreatment.is_active : true}
                      className="w-4 h-4 text-royal border-line rounded-md focus:ring-royal"
                    />
                    <span className="text-xs font-medium text-ink">Service is active and bookable</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-line mt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-pale hover:bg-line/50 text-ink font-medium text-xs rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-royal hover:bg-royal/90 text-white font-medium text-xs rounded-xl transition-colors disabled:opacity-50"
                >
                  {isPending ? "Saving..." : "Save Service & Quota"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
