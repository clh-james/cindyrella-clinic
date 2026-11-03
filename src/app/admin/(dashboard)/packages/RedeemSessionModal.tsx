"use client";

import { useState, useTransition } from "react";
import { X, CheckCircle2, Loader2, Sparkles, User, Calendar, FileText } from "lucide-react";
import { redeemPackageSession } from "./actions";
import { CustomerPackage } from "./types";
import toast from "react-hot-toast";

export function RedeemSessionModal({
  pkg,
  staffList,
  onClose,
  onSuccess,
}: {
  pkg: CustomerPackage;
  staffList: { id: string; full_name: string; role?: string }[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedStaffId, setSelectedStaffId] = useState(staffList[0]?.id || "");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  const nextSessionNumber = pkg.total_sessions - pkg.sessions_remaining + 1;

  const handleRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await redeemPackageSession({
        packageId: pkg.id,
        staffId: selectedStaffId || undefined,
        notes: notes.trim() || undefined,
      });

      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(`Session ${res.sessionNumber} redeemed successfully! (${res.remainingSessions} left)`);
        onSuccess();
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-line overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-pale/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-royal/10 text-royal flex items-center justify-center font-bold">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="font-bold text-ink text-base">Redeem Package Session</h3>
              <p className="text-xs text-ink-soft">Deduct session credit for patient</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-soft hover:bg-line/40 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleRedeem} className="p-6 space-y-4">
          {/* Summary Box */}
          <div className="bg-pale/50 border border-line/70 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-ink-soft text-xs font-semibold uppercase tracking-wider">Patient</span>
              <span className="font-bold text-ink">
                {pkg.customer?.first_name} {pkg.customer?.last_name}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-ink-soft text-xs font-semibold uppercase tracking-wider">Package</span>
              <span className="font-semibold text-royal">{pkg.package_name}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-line/60">
              <span className="text-ink-soft text-xs font-semibold uppercase tracking-wider">Session to Redeem</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                Session {nextSessionNumber} of {pkg.total_sessions}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs text-ink-soft">
              <span>Remaining after this:</span>
              <span className="font-bold text-ink">{pkg.sessions_remaining - 1} sessions</span>
            </div>
          </div>

          {/* Attending Therapist / Staff Selection */}
          <div>
            <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
              Attending Therapist / Handler <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                required
                className="w-full bg-white border border-line rounded-xl px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-royal/30 focus:border-royal appearance-none"
              >
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.role || "Therapist"})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-ink-soft">
                <User size={16} />
              </div>
            </div>
          </div>

          {/* Treatment / Session Notes */}
          <div>
            <label className="block text-xs font-bold text-ink uppercase tracking-wider mb-1.5">
              Session Treatment Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Facial session 2 done, applied calming serum, client satisfied"
              className="w-full bg-white border border-line rounded-xl px-3.5 py-2 text-sm text-ink placeholder:text-ink-soft/50 focus:outline-none focus:ring-2 focus:ring-royal/30 focus:border-royal"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2.5 rounded-xl border border-line text-sm font-semibold text-ink hover:bg-pale transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl bg-royal text-white text-sm font-bold shadow-md hover:bg-royal/90 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Confirm & Redeem
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
