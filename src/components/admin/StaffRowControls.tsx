"use client";

import { useState, useTransition } from "react";
import { setStaffActive, updateStaffRole } from "@/app/admin/actions";

export function StaffRowControls({
  staffId,
  roleId,
  isActive,
  availableRoles,
}: {
  staffId: string;
  roleId: string;
  isActive: boolean;
  availableRoles: { id: string; name: string }[];
}) {
  const [currentRoleId, setCurrentRoleId] = useState(roleId);
  const [active, setActive] = useState(isActive);
  const [, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <select
        value={currentRoleId}
        onChange={(e) => {
          const nextId = e.target.value;
          setCurrentRoleId(nextId);
          startTransition(() => {
            updateStaffRole(staffId, nextId);
          });
        }}
        className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs font-medium capitalize text-ink outline-none focus:border-royal"
      >
        {availableRoles.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name.replace("_", " ")}
          </option>
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
