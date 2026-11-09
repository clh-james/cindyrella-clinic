"use client";

import { useState, useTransition } from "react";
import { X, Loader2, Save, Sparkles, AlertCircle, Calendar, Hash, Tag, FileText } from "lucide-react";
import { CustomerPackage } from "./types";
import { editCustomerPackage } from "./actions";
import toast from "react-hot-toast";

export function EditPackageModal({
  pkg,
  onClose,
  onSuccess,
}: {
  pkg: CustomerPackage;
  onClose: () => void;
  onSuccess: (updatedPkg: CustomerPackage) => void;
}) {
  const [packageName, setPackageName] = useState(pkg.package_name);
  const [totalSessions, setTotalSessions] = useState(pkg.total_sessions);
  const [sessionsRemaining, setSessionsRemaining] = useState(pkg.sessions_remaining);
  const [pricePaid, setPricePaid] = useState(Number(pkg.price_paid || 0));
  const [expiryDate, setExpiryDate] = useState(pkg.expiry_date || "");
  const [status, setStatus] = useState<CustomerPackage["status"]>(pkg.status);
  const [notes, setNotes] = useState(pkg.notes || "");

  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!packageName.trim()) {
      toast.error("Please enter a package name.");
      return;
    }

    if (totalSessions < 1) {
      toast.error("Total sessions must be at least 1.");
      return;
    }

    if (sessionsRemaining < 0) {
      toast.error("Sessions remaining cannot be negative.");
      return;
    }

    if (sessionsRemaining > totalSessions) {
      toast.error("Sessions remaining cannot exceed total sessions.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await editCustomerPackage({
          packageId: pkg.id,
          packageName: packageName.trim(),
          totalSessions: Number(totalSessions),
          sessionsRemaining: Number(sessionsRemaining),
          pricePaid: Number(pricePaid),
          expiryDate: expiryDate || null,
          status,
          notes: notes.trim() || undefined,
        });

        if (res.error) {
          toast.error(res.error);
          return;
        }

        toast.success("Package updated successfully!");
        if (res.package) {
          onSuccess(res.package as CustomerPackage);
        } else {
          onSuccess({
            ...pkg,
            package_name: packageName.trim(),
            total_sessions: Number(totalSessions),
            sessions_remaining: Number(sessionsRemaining),
            price_paid: Number(pricePaid),
            expiry_date: expiryDate || null,
            status,
            notes: notes.trim() || null,
            updated_at: new Date().toISOString(),
          });
        }
        onClose();
      } catch (err: any) {
        toast.error(err.message || "Failed to update package.");
      }
    });
  };

  const patientName = `${pkg.customer?.first_name || "Patient"} ${pkg.customer?.last_name || ""}`.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-line overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-pale/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-royal/10 text-royal">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold font-serif text-ink">Edit Patient Package</h2>
              <p className="text-xs text-ink-soft">
                For: <span className="font-semibold text-ink">{patientName}</span>
                {pkg.customer?.phone && ` (${pkg.customer.phone})`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-ink-soft hover:bg-line/40 hover:text-ink transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Package Name */}
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5 flex items-center gap-1.5">
              <Tag size={13} className="text-royal" />
              Package Name
            </label>
            <input
              type="text"
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              required
              className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-xs sm:text-sm text-ink placeholder:text-ink-soft/40 focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20"
              placeholder="e.g. Cindyrella Glow Drip (5+1 Package)"
            />
          </div>

          {/* Session Balances Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5 flex items-center gap-1.5">
                <Hash size={13} className="text-royal" />
                Sessions Remaining
              </label>
              <input
                type="number"
                min={0}
                max={totalSessions}
                value={sessionsRemaining}
                onChange={(e) => setSessionsRemaining(Number(e.target.value))}
                required
                className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-xs sm:text-sm font-mono font-bold text-royal focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20"
              />
              <span className="text-[10px] text-ink-soft mt-0.5 block">Available to redeem</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5 flex items-center gap-1.5">
                <Hash size={13} className="text-ink-soft" />
                Total Sessions
              </label>
              <input
                type="number"
                min={1}
                value={totalSessions}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setTotalSessions(val);
                  if (sessionsRemaining > val) setSessionsRemaining(val);
                }}
                required
                className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-xs sm:text-sm font-mono font-semibold text-ink focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20"
              />
              <span className="text-[10px] text-ink-soft mt-0.5 block">Original purchased count</span>
            </div>
          </div>

          {/* Price Paid & Expiry Date Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">
                Price Paid (₱)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-ink-soft">₱</span>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={pricePaid}
                  onChange={(e) => setPricePaid(Number(e.target.value))}
                  required
                  className="w-full rounded-xl border border-line bg-white pl-7 pr-3 py-2.5 text-xs sm:text-sm font-mono font-semibold text-ink focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5 flex items-center gap-1.5">
                <Calendar size={13} className="text-royal" />
                Expiry Date
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-xs sm:text-sm text-ink focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20"
              />
            </div>
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">
              Package Status
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { val: "active", label: "Active", bg: "hover:border-emerald-500", active: "bg-emerald-50 border-emerald-500 text-emerald-700" },
                { val: "fully_redeemed", label: "Redeemed", bg: "hover:border-blue-500", active: "bg-blue-50 border-blue-500 text-blue-700" },
                { val: "expired", label: "Expired", bg: "hover:border-amber-500", active: "bg-amber-50 border-amber-500 text-amber-700" },
                { val: "cancelled", label: "Cancelled", bg: "hover:border-rose-500", active: "bg-rose-50 border-rose-500 text-rose-700" },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.val}
                  onClick={() => setStatus(opt.val as any)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition-all ${
                    status === opt.val
                      ? opt.active
                      : "border-line bg-white text-ink-soft " + opt.bg
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5 flex items-center gap-1.5">
              <FileText size={13} className="text-ink-soft" />
              Administrative Notes & History
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add remarks or notes about package adjustments..."
              className="w-full rounded-xl border border-line bg-white p-3 text-xs text-ink placeholder:text-ink-soft/40 focus:border-royal focus:outline-none focus:ring-2 focus:ring-royal/20"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-xl border border-line px-4 py-2.5 text-xs font-bold text-ink-soft hover:bg-line/40 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-royal px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-royal/90 transition-all disabled:opacity-50 active:scale-95"
            >
              {isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={14} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

