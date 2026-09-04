"use client";

import { useState } from "react";
import { lookupBooking, cancelBooking, rescheduleBooking, type ManagedBooking } from "@/app/(site)/manage/actions";
import { CalendarDays, Loader2 } from "lucide-react";

const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;
const timeSlots = ["9AM", "10AM", "11AM", "1PM", "2PM", "3PM", "4PM", "5PM"];

function nextDates(count: number) {
  const out: { label: string; iso: string }[] = [];
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (out.length < count) {
    if (d.getDay() !== 0) {
      out.push({
        label: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
        iso: d.toISOString().slice(0, 10),
      });
    }
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export function ManageBookingFlow() {
  const [reference, setReference] = useState("");
  const [email, setEmail] = useState("");
  const [booking, setBooking] = useState<ManagedBooking | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"view" | "reschedule">("view");
  const [newDate, setNewDate] = useState<{ label: string; iso: string } | null>(null);
  const [newTime, setNewTime] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionDone, setActionDone] = useState<"cancelled" | "rescheduled" | null>(null);
  const dates = nextDates(10);

  async function search() {
    setLoading(true);
    setNotFound(false);
    setBooking(null);
    setActionDone(null);
    const result = await lookupBooking(reference, email);
    setLoading(false);
    if (result) setBooking(result);
    else setNotFound(true);
  }

  async function handleCancel() {
    if (!booking) return;
    setLoading(true);
    setActionError(null);
    const result = await cancelBooking(booking.referenceNumber, email);
    setLoading(false);
    if (result.ok) {
      setActionDone("cancelled");
      setBooking({ ...booking, status: "cancelled" });
    } else {
      setActionError(result.error ?? "Something went wrong.");
    }
  }

  async function handleReschedule() {
    if (!booking || !newDate || !newTime) return;
    setLoading(true);
    setActionError(null);
    const result = await rescheduleBooking(booking.referenceNumber, email, newDate.iso, newTime);
    setLoading(false);
    if (result.ok) {
      setActionDone("rescheduled");
      setBooking({ ...booking, date: newDate.iso, time: newTime, status: "pending" });
      setMode("view");
    } else {
      setActionError(result.error ?? "Something went wrong.");
    }
  }

  if (!booking) {
    return (
      <div className="mt-10 max-w-md">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Reference number</span>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="CMG-2026XXXXX"
            className="rounded-lg border border-line px-3.5 py-2.5 text-ink outline-none focus:border-royal"
          />
        </label>
        <label className="mt-4 flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Email used to book</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-line px-3.5 py-2.5 text-ink outline-none focus:border-royal"
          />
        </label>
        {notFound && (
          <p className="mt-3 text-sm text-red-700">
            We couldn&apos;t find a booking matching that reference and email.
          </p>
        )}
        <button
          onClick={search}
          disabled={!reference || !email || loading}
          className="mt-6 flex items-center gap-2 rounded-full bg-royal px-6 py-3 text-sm font-medium text-white hover:bg-royal-deep disabled:opacity-50"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          Find my booking
        </button>
      </div>
    );
  }

  return (
    <div className="mt-10 max-w-md rounded-2xl border border-line p-6">
      <p className="text-sm text-ink-soft">Hi {booking.customerFirstName},</p>
      <h2 className="mt-1 font-serif text-2xl font-semibold text-ink">{booking.treatmentName}</h2>
      <p className="mt-1 text-sm text-ink-soft">{peso(booking.treatmentPrice)} · {booking.branchName}</p>

      <div className="mt-4 flex items-center gap-2 rounded-xl bg-pale px-4 py-3 text-sm text-ink">
        <CalendarDays size={16} className="text-royal" />
        {booking.date} at {booking.time}
      </div>

      <p className="mt-3 text-xs capitalize text-ink-soft">
        Status: {booking.status.replace("_", " ")} · Payment: {booking.paymentStatus}
      </p>

      {actionDone === "cancelled" && (
        <p className="mt-4 rounded-lg bg-pale px-4 py-3 text-sm text-ink">
          Your booking has been cancelled.
        </p>
      )}
      {actionDone === "rescheduled" && (
        <p className="mt-4 rounded-lg bg-pale px-4 py-3 text-sm text-ink">
          Your booking has been moved. A confirmation was sent to your email.
        </p>
      )}
      {actionError && <p className="mt-4 text-sm text-red-700">{actionError}</p>}

      {booking.status !== "cancelled" && mode === "view" && !actionDone && (
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => setMode("reschedule")}
            className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink hover:border-royal hover:text-royal"
          >
            Reschedule
          </button>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-red-700 hover:border-red-700 disabled:opacity-50"
          >
            Cancel booking
          </button>
        </div>
      )}

      {mode === "reschedule" && (
        <div className="mt-6">
          <p className="text-sm font-medium text-ink">Pick a new date</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {dates.map((d) => (
              <button
                key={d.iso}
                onClick={() => setNewDate(d)}
                className={`rounded-lg border p-2 text-xs font-medium ${
                  newDate?.iso === d.iso ? "border-royal bg-pale text-ink" : "border-line text-ink-soft"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm font-medium text-ink">Pick a new time</p>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {timeSlots.map((t) => (
              <button
                key={t}
                onClick={() => setNewTime(t)}
                className={`rounded-lg border p-2 text-xs font-medium ${
                  newTime === t ? "border-royal bg-pale text-ink" : "border-line text-ink-soft"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setMode("view")}
              className="text-sm font-medium text-ink-soft"
            >
              Back
            </button>
            <button
              onClick={handleReschedule}
              disabled={!newDate || !newTime || loading}
              className="ml-auto rounded-full bg-royal px-6 py-2.5 text-sm font-medium text-white hover:bg-royal-deep disabled:opacity-50"
            >
              {loading ? "Saving…" : "Confirm new time"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
