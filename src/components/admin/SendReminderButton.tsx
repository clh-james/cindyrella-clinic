"use client";

import { useState, useTransition } from "react";
import { sendAppointmentReminder } from "@/app/admin/actions";
import { MessageSquare, Check } from "lucide-react";

export function SendReminderButton({ appointmentId }: { appointmentId: string }) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<"idle" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        disabled={pending}
        onClick={() => {
          setState("idle");
          setError(null);
          startTransition(async () => {
            const result = await sendAppointmentReminder(appointmentId);
            if (result?.error) {
              setState("error");
              setError(result.error);
            } else {
              setState("sent");
            }
          });
        }}
        className="flex items-center gap-1.5 text-xs font-medium text-royal hover:text-royal-deep disabled:opacity-50"
      >
        {state === "sent" ? <Check size={13} /> : <MessageSquare size={13} />}
        {state === "sent" ? "Sent" : pending ? "Sending…" : "Remind"}
      </button>
      {error && <p className="max-w-[160px] text-[11px] text-red-700">{error}</p>}
    </div>
  );
}
