"use client";

import { removeBlockedDate } from "@/app/admin/actions";
import { X } from "lucide-react";

export function RemoveBlockedDate({ id }: { id: string }) {
  return (
    <button
      onClick={() => removeBlockedDate(id)}
      aria-label="Remove blocked date"
      className="text-ink-soft hover:text-red-700"
    >
      <X size={14} />
    </button>
  );
}
