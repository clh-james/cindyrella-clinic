"use client";

import { useState } from "react";
import { processCheckin } from "./actions";
import { Loader2 } from "lucide-react";

export function CheckinButton({ appointmentId }: { appointmentId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCheckin = async () => {
    setLoading(true);
    setError("");
    const res = await processCheckin(appointmentId);
    if (res.error) {
      setError(res.error);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center">
      <button 
        onClick={handleCheckin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-royal px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-royal-deep disabled:opacity-70"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Check In Customer
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
