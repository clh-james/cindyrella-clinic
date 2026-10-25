"use client";

import { useState, useTransition } from "react";
import { setAppointmentHandler } from "@/app/admin/actions";
import { UserCheck } from "lucide-react";
import toast from "react-hot-toast";

interface StaffOption {
  id: string;
  fullName: string;
}

interface AppointmentHandlerSelectProps {
  appointmentId: string;
  currentHandlerId?: string | null;
  staffList: StaffOption[];
  status?: string;
}

export function AppointmentHandlerSelect({
  appointmentId,
  currentHandlerId = "",
  staffList,
  status,
}: AppointmentHandlerSelectProps) {
  const [handlerId, setHandlerId] = useState(currentHandlerId || "");
  const [isPending, startTransition] = useTransition();

  const handleChange = (newId: string) => {
    setHandlerId(newId);
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

  return (
    <div className="flex items-center gap-1.5">
      <UserCheck size={13} className={handlerId ? "text-purple-600" : "text-ink-soft"} />
      <select
        value={handlerId}
        disabled={isPending}
        onChange={(e) => handleChange(e.target.value)}
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
    </div>
  );
}
