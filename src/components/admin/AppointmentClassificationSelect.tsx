"use client";

import { useState, useTransition } from "react";
import { updateAppointmentClassification } from "@/app/admin/actions";
import toast from "react-hot-toast";

interface AppointmentClassificationSelectProps {
  appointmentId: string;
  initialClassification?: string | null;
}

export function AppointmentClassificationSelect({
  appointmentId,
  initialClassification,
}: AppointmentClassificationSelectProps) {
  const norm = (initialClassification || "walk-in").toLowerCase();
  const currentKey = norm.includes("boost")
    ? "boosting from main"
    : norm === "booked"
    ? "booked"
    : "walk-in";

  const [value, setValue] = useState(currentKey);
  const [pending, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as "walk-in" | "booked" | "boosting from main";
    setValue(next);

    startTransition(async () => {
      const res = await updateAppointmentClassification(appointmentId, next);
      if (res?.error) {
        toast.error(res.error);
        setValue(currentKey);
      } else {
        const label =
          next === "booked"
            ? "Booked"
            : next === "boosting from main"
            ? "Boosting Main"
            : "Walk-in";
        toast.success(`Classification changed to ${label}!`);
      }
    });
  };

  // Color styles based on active value
  const colorClasses =
    value === "booked"
      ? "bg-indigo-50 text-indigo-700 border-indigo-200 focus:border-indigo-500 hover:bg-indigo-100"
      : value.includes("boost")
      ? "bg-purple-50 text-purple-700 border-purple-200 focus:border-purple-500 hover:bg-purple-100"
      : "bg-sky-50 text-sky-700 border-sky-200 focus:border-sky-500 hover:bg-sky-100";

  return (
    <div className="inline-flex items-center">
      <select
        value={value}
        disabled={pending}
        onChange={handleChange}
        title="Change Client Classification (Click to switch between Booked / Walk-in / Boosting Main)"
        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer outline-none transition-all appearance-none text-center ${colorClasses} disabled:opacity-50`}
      >
        <option value="booked">Booked</option>
        <option value="walk-in">Walk-in</option>
        <option value="boosting from main">Boosting Main</option>
      </select>
    </div>
  );
}
