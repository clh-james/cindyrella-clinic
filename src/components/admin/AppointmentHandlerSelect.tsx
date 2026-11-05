"use client";

import { useState, useTransition } from "react";
import {
  setAppointmentHandler,
  setAppointmentHandlers,
  type HandlerAssignment,
} from "@/app/admin/actions";
import { UserCheck, Users, Plus, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface StaffOption {
  id: string;
  fullName: string;
}

interface AppointmentHandlerSelectProps {
  appointmentId: string;
  currentHandlerId?: string | null;
  initialHandlers?: HandlerAssignment[];
  staffList: StaffOption[];
  status?: string;
}

export function AppointmentHandlerSelect({
  appointmentId,
  currentHandlerId = "",
  initialHandlers = [],
  staffList,
  status,
}: AppointmentHandlerSelectProps) {
  const [handlerId, setHandlerId] = useState(currentHandlerId || "");
  const [handlers, setHandlers] = useState<HandlerAssignment[]>(initialHandlers);
  const [showTandemModal, setShowTandemModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Tandem modal form states (Defaulting to Option 2: 70/30)
  const [modalPrimaryId, setModalPrimaryId] = useState<string>(
    initialHandlers.find((h) => h.role === "primary")?.staffId || currentHandlerId || ""
  );
  const [modalPrimarySplit, setModalPrimarySplit] = useState<number>(
    initialHandlers.find((h) => h.role === "primary")?.splitPercent || (initialHandlers.length > 1 ? 70 : 100)
  );
  const [modalAssistants, setModalAssistants] = useState<{ staffId: string; splitPercent: number }[]>(() => {
    const assts = initialHandlers.filter((h) => h.role === "assistant");
    if (assts.length > 0) {
      return assts.map((a) => ({ staffId: a.staffId, splitPercent: a.splitPercent }));
    }
    return [];
  });

  const handleSingleSelectChange = (newId: string) => {
    setHandlerId(newId);
    setHandlers(newId ? [{ staffId: newId, role: "primary", splitPercent: 100 }] : []);
    const selectedStaff = staffList.find((s) => s.id === newId);

    startTransition(async () => {
      const res = await setAppointmentHandler(appointmentId, newId);
      if (!res.success) {
        toast.error("Failed to assign staff handler.");
      } else {
        if (newId) {
          toast.success(
            status === "completed"
              ? `Assigned to ${selectedStaff?.fullName}! Commission auto-computed and credited to payroll.`
              : `Assigned to ${selectedStaff?.fullName}.`
          );
        } else {
          toast.success("Handler unassigned.");
        }
      }
    });
  };

  const handleOpenTandemModal = () => {
    const lead = handlers.find((h) => h.role === "primary")?.staffId || handlerId || "";
    setModalPrimaryId(lead);
    const existingAssts = handlers.filter((h) => h.role === "assistant");
    if (existingAssts.length > 0) {
      setModalAssistants(existingAssts.map((a) => ({ staffId: a.staffId, splitPercent: a.splitPercent })));
      setModalPrimarySplit(handlers.find((h) => h.role === "primary")?.splitPercent || 70);
    } else {
      // Option 2 Default: 70% Lead, 30% Assistant
      setModalAssistants([{ staffId: "", splitPercent: 30 }]);
      setModalPrimarySplit(70);
    }
    setShowTandemModal(true);
  };

  const handleAddModalAssistant = () => {
    if (modalAssistants.length === 0) {
      setModalAssistants([{ staffId: "", splitPercent: 30 }]);
      setModalPrimarySplit(70); // Option 2
    } else if (modalAssistants.length === 1) {
      setModalAssistants([...modalAssistants, { staffId: "", splitPercent: 20 }]);
      setModalPrimarySplit(60);
    }
  };

  const handleRemoveModalAssistant = (idx: number) => {
    const updated = modalAssistants.filter((_, i) => i !== idx);
    setModalAssistants(updated);
    if (updated.length === 0) {
      setModalPrimarySplit(100);
    } else if (updated.length === 1) {
      setModalPrimarySplit(70);
      setModalAssistants([{ ...updated[0], splitPercent: 30 }]);
    }
  };

  const handleSaveTandem = () => {
    if (!modalPrimaryId) {
      toast.error("Please select a Lead/Primary therapist.");
      return;
    }
    const validAssts = modalAssistants.filter((a) => Boolean(a.staffId));
    let finalPayload: HandlerAssignment[];

    if (validAssts.length === 0) {
      finalPayload = [{ staffId: modalPrimaryId, role: "primary", splitPercent: 100 }];
    } else {
      finalPayload = [
        { staffId: modalPrimaryId, role: "primary", splitPercent: modalPrimarySplit },
        ...validAssts.map((a) => ({
          staffId: a.staffId,
          role: "assistant" as const,
          splitPercent: a.splitPercent,
        })),
      ];
    }

    startTransition(async () => {
      const res = await setAppointmentHandlers(appointmentId, finalPayload);
      if (!res.success) {
        toast.error("Failed to update handlers.");
      } else {
        setHandlers(finalPayload);
        setHandlerId(modalPrimaryId);
        setShowTandemModal(false);
        toast.success(
          finalPayload.length > 1
            ? `Assigned ${finalPayload.length} handlers with Option 2 commission split!`
            : "Handler saved."
        );
      }
    });
  };

  const isMultiple = handlers.length > 1;

  // Format multiple handlers summary label
  const multipleSummary = handlers
    .map((h) => {
      const name = staffList.find((s) => s.id === h.staffId)?.fullName?.split(" ")[0] || "Staff";
      const tag = h.role === "primary" ? "Lead" : "Asst";
      return `${name} (${tag} ${h.splitPercent}%)`;
    })
    .join(" + ");

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {isMultiple ? (
        <button
          type="button"
          onClick={handleOpenTandemModal}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-900 hover:bg-purple-100 transition-colors shadow-2xs"
          title="Click to adjust multiple handlers or split"
        >
          <Users size={13} className="text-purple-600" />
          <span>{multipleSummary}</span>
        </button>
      ) : (
        <div className="flex items-center gap-1">
          <UserCheck size={13} className={handlerId ? "text-purple-600" : "text-ink-soft"} />
          <select
            value={handlerId}
            disabled={isPending}
            onChange={(e) => handleSingleSelectChange(e.target.value)}
            className={`rounded-lg border px-2 py-1 text-xs font-medium outline-hidden transition-colors ${
              handlerId
                ? "border-purple-200 bg-purple-50/70 text-purple-900 font-semibold"
                : "border-line bg-paper text-ink-soft"
            }`}
          >
            <option value="">Unassigned</option>
            {staffList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleOpenTandemModal}
            className="p-1 rounded-md text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-[11px] font-semibold transition-colors"
            title="Assign Tandem / Multiple Staff (Option 2: 70/30 split)"
          >
            <Plus size={12} />
          </button>
        </div>
      )}

      {/* Tandem Modal */}
      {showTandemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-line p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                  <Users size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">Multiple Handlers (Tandem)</h3>
                  <p className="text-[11px] text-ink-soft">
                    Option 2: Primary Therapist + Assistant Split
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTandemModal(false)}
                className="text-ink-soft hover:text-ink p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            {/* Primary Handler */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-purple-900">
                <span>Lead / Primary Therapist</span>
                <span className="bg-purple-100 px-2 py-0.5 rounded text-[11px]">
                  {modalPrimarySplit}% Commission
                </span>
              </div>
              <select
                value={modalPrimaryId}
                onChange={(e) => setModalPrimaryId(e.target.value)}
                className="w-full rounded-xl border border-line px-3 py-2 text-xs font-medium text-ink bg-white outline-none focus:border-royal"
              >
                <option value="">Select Primary Therapist</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName}
                  </option>
                ))}
              </select>
            </div>

            {/* Assistant Handlers */}
            {modalAssistants.map((asst, idx) => (
              <div key={idx} className="space-y-1 pt-2 border-t border-purple-100">
                <div className="flex items-center justify-between text-xs font-semibold text-indigo-900">
                  <span>Assistant {idx + 1}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="bg-indigo-100 px-2 py-0.5 rounded text-[11px]">
                      {asst.splitPercent}% Commission
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveModalAssistant(idx)}
                      className="text-red-500 hover:text-red-700 p-0.5 rounded"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
                <select
                  value={asst.staffId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setModalAssistants((prev) =>
                      prev.map((a, i) => (i === idx ? { ...a, staffId: val } : a))
                    );
                  }}
                  className="w-full rounded-xl border border-line px-3 py-2 text-xs font-medium text-ink bg-white outline-none focus:border-royal"
                >
                  <option value="">Select Assistant Staff</option>
                  {staffList
                    .filter((s) => s.id !== modalPrimaryId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName}
                      </option>
                    ))}
                </select>
              </div>
            ))}

            {/* Presets */}
            {modalAssistants.length > 0 && (
              <div className="pt-2 flex items-center justify-between gap-1 flex-wrap text-[11px]">
                <span className="font-semibold text-ink-soft">Presets:</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setModalPrimarySplit(70);
                      setModalAssistants((prev) => prev.map((a) => ({ ...a, splitPercent: 30 })));
                    }}
                    className={`px-2 py-0.5 rounded font-bold ${
                      modalPrimarySplit === 70
                        ? "bg-purple-700 text-white"
                        : "bg-pale border border-line text-ink"
                    }`}
                  >
                    70/30 (Option 2)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalPrimarySplit(50);
                      setModalAssistants((prev) => prev.map((a) => ({ ...a, splitPercent: 50 })));
                    }}
                    className={`px-2 py-0.5 rounded font-bold ${
                      modalPrimarySplit === 50
                        ? "bg-purple-700 text-white"
                        : "bg-pale border border-line text-ink"
                    }`}
                  >
                    50/50
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalPrimarySplit(80);
                      setModalAssistants((prev) => prev.map((a) => ({ ...a, splitPercent: 20 })));
                    }}
                    className={`px-2 py-0.5 rounded font-bold ${
                      modalPrimarySplit === 80
                        ? "bg-purple-700 text-white"
                        : "bg-pale border border-line text-ink"
                    }`}
                  >
                    80/20
                  </button>
                </div>
              </div>
            )}

            {/* Add more assistants */}
            {modalAssistants.length < 2 && (
              <button
                type="button"
                onClick={handleAddModalAssistant}
                className="w-full py-1.5 px-3 rounded-lg border border-dashed border-purple-300 text-purple-700 bg-purple-50/50 text-xs font-semibold flex items-center justify-center gap-1 hover:bg-purple-100/50 transition-colors"
              >
                <Plus size={13} />
                {modalAssistants.length === 0 ? "Add Assistant (2nd Staff)" : "Add 3rd Staff"}
              </button>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setShowTandemModal(false)}
                className="px-3 py-1.5 rounded-xl border border-line text-xs font-semibold text-ink hover:bg-pale"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTandem}
                disabled={isPending}
                className="px-4 py-1.5 rounded-xl bg-purple-700 text-white text-xs font-semibold hover:bg-purple-800 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isPending && <Loader2 size={13} className="animate-spin" />}
                Save Handlers
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
