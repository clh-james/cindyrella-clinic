"use client";

import { useState, useTransition } from "react";
import { updateAppointmentStatus } from "@/app/admin/actions";

const statuses = ["pending", "confirmed", "completed", "cancelled", "no_show"] as const;

export function StatusSelect({
  appointmentId,
  status,
}: {
  appointmentId: string;
  status: (typeof statuses)[number];
}) {
  const [value, setValue] = useState(status);
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={value}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as (typeof statuses)[number];
        setValue(next);
        startTransition(() => {
          updateAppointmentStatus(appointmentId, next);
        });
      }}
      className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs font-medium capitalize text-ink outline-none focus:border-royal"
    >
      {statuses.map((s) => (
        <option key={s} value={s}>
          {s.replace("_", " ")}
        </option>
      ))}
    </select>
  );
}
