"use client";

import { useState, useTransition } from "react";
import { setStaffActive, updateStaffRole } from "@/app/admin/actions";

const roles = ["admin", "receptionist", "nurse", "doctor"] as const;

export function StaffRowControls({
  staffId,
  role,
  isActive,
}: {
  staffId: string;
  role: (typeof roles)[number];
  isActive: boolean;
}) {
  const [currentRole, setCurrentRole] = useState(role);
  const [active, setActive] = useState(isActive);
  const [, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <select
        value={currentRole}
        onChange={(e) => {
          const next = e.target.value as (typeof roles)[number];
          setCurrentRole(next);
          startTransition(() => {
            updateStaffRole(staffId, next);
          });
        }}
        className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs font-medium capitalize text-ink outline-none focus:border-royal"
      >
        {roles.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>

      <button
        onClick={() => {
          const next = !active;
          setActive(next);
          startTransition(() => {
            setStaffActive(staffId, next);
          });
        }}
        className={`rounded-full px-3 py-1.5 text-xs font-medium ${
          active ? "bg-pale text-ink-soft hover:text-red-700" : "bg-red-50 text-red-700"
        }`}
      >
        {active ? "Deactivate" : "Reactivate"}
      </button>
    </div>
  );
}
