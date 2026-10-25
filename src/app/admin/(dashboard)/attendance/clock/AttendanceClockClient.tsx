// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Employee Self-Service Attendance Time Clock Client Component
// ==============================================================================

"use client";

import { useState, useEffect } from "react";
import {
  Clock,
  Play,
  Coffee,
  CheckCircle2,
  Calendar,
  Building2,
  AlertCircle,
  FileEdit,
  History,
  Timer,
  ShieldCheck,
  Send,
  X,
  Camera,
} from "lucide-react";
import {
  recordTimeIn,
  recordStartBreak,
  recordEndBreak,
  recordTimeOut,
  submitAttendanceCorrection,
} from "../actions";
import { AttendanceStatus, CorrectionType } from "../types";
import { SelfieCaptureModal } from "@/components/admin/attendance/SelfieCaptureModal";
import toast from "react-hot-toast";

interface AttendanceClockClientProps {
  initialData: {
    employee: {
      id: string;
      fullName: string;
      role: string;
      branchId?: string | null;
      branchName: string;
    };
    today: string;
    schedule: {
      shift_name: string;
      scheduled_start: string;
      scheduled_end: string;
      break_minutes: number;
      grace_period_minutes: number;
    } | null;
    currentRecord: {
      id: string;
      time_in: string | null;
      time_out: string | null;
      time_in_photo_url?: string | null;
      time_out_photo_url?: string | null;
      break_start: string | null;
      break_end: string | null;
      break_minutes: number;
      hours_worked: number;
      late_minutes: number;
      undertime_minutes: number;
      attendance_status: AttendanceStatus;
      notes?: string | null;
      breaks?: Array<{
        id: string;
        break_start: string;
        break_end?: string | null;
        duration_minutes?: number | null;
        break_type: string;
      }>;
    } | null;
    status: AttendanceStatus;
    recentRecords: any[];
  };
}

export function AttendanceClockClient({ initialData }: AttendanceClockClientProps) {
  const [data, setData] = useState(initialData);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Selfie Clock-In / Out Modal State
  const [selfieModalMode, setSelfieModalMode] = useState<"time_in" | "time_out" | null>(null);
  const [submittingSelfie, setSubmittingSelfie] = useState(false);

  // Correction Modal State
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [correctionType, setCorrectionType] = useState<CorrectionType>("missed_time_in");
  const [requestedTimeIn, setRequestedTimeIn] = useState("");
  const [requestedTimeOut, setRequestedTimeOut] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");
  const [submittingCorrection, setSubmittingCorrection] = useState(false);

  // Live Digital Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { employee, schedule, currentRecord, status } = data;

  const scheduledStart = schedule?.scheduled_start?.slice(0, 5) || "09:00";
  const scheduledEnd = schedule?.scheduled_end?.slice(0, 5) || "18:00";
  const shiftTitle = schedule?.shift_name || "Standard Clinic Shift";

  // Trigger selfie capture for Time In
  const handleTimeIn = () => {
    setSelfieModalMode("time_in");
  };

  // Trigger selfie capture for Time Out
  const handleTimeOut = () => {
    setSelfieModalMode("time_out");
  };

  // Submit confirmed selfie for Time In or Time Out
  const handleConfirmSelfie = async (photoDataUrl: string, notes?: string) => {
    if (!selfieModalMode) return;
    setSubmittingSelfie(true);

    try {
      if (selfieModalMode === "time_in") {
        const res = await recordTimeIn(notes, photoDataUrl);
        if (!res.success) {
          toast.error(res.error || "Failed to time in");
        } else {
          toast.success(res.message || "Timed in successfully with verified selfie!");
          setSelfieModalMode(null);
          window.location.reload();
        }
      } else if (selfieModalMode === "time_out") {
        const res = await recordTimeOut(notes, photoDataUrl);
        if (!res.success) {
          toast.error(res.error || "Failed to time out");
        } else {
          toast.success(res.message || "Timed out successfully with verified selfie!");
          setSelfieModalMode(null);
          window.location.reload();
        }
      }
    } catch {
      toast.error("An error occurred while submitting attendance selfie.");
    } finally {
      setSubmittingSelfie(false);
    }
  };

  const handleStartBreak = async () => {
    setLoadingAction("start_break");
    try {
      const res = await recordStartBreak("meal");
      if (!res.success) {
        toast.error(res.error || "Failed to start break");
      } else {
        toast.success(res.message || "Break started.");
        window.location.reload();
      }
    } catch {
      toast.error("An error occurred while starting break.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleEndBreak = async () => {
    setLoadingAction("end_break");
    try {
      const res = await recordEndBreak();
      if (!res.success) {
        toast.error(res.error || "Failed to end break");
      } else {
        toast.success(res.message || "Break ended.");
        window.location.reload();
      }
    } catch {
      toast.error("An error occurred while ending break.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionReason.trim()) {
      toast.error("Please provide a reason for the correction request.");
      return;
    }

    setSubmittingCorrection(true);
    try {
      const res = await submitAttendanceCorrection({
        attendanceRecordId: currentRecord?.id,
        attendanceDate: data.today,
        originalTimeIn: currentRecord?.time_in || undefined,
        originalTimeOut: currentRecord?.time_out || undefined,
        requestedTimeIn: requestedTimeIn ? `${data.today}T${requestedTimeIn}:00` : undefined,
        requestedTimeOut: requestedTimeOut ? `${data.today}T${requestedTimeOut}:00` : undefined,
        correctionType,
        reason: correctionReason,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to submit correction");
      } else {
        toast.success("Attendance correction request submitted for review.");
        setIsCorrectionModalOpen(false);
        setCorrectionReason("");
        setRequestedTimeIn("");
        setRequestedTimeOut("");
        window.location.reload();
      }
    } catch {
      toast.error("Error submitting correction request.");
    } finally {
      setSubmittingCorrection(false);
    }
  };

  const getStatusBadge = (st: AttendanceStatus) => {
    switch (st) {
      case "present":
        return <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold">PRESENT / ON TIME</span>;
      case "late":
        return <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold">LATE ARRIVAL</span>;
      case "on_break":
        return <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">CURRENTLY ON BREAK</span>;
      case "timed_out":
        return <span className="px-3 py-1 bg-slate-200 text-slate-800 rounded-full text-xs font-semibold">TIMED OUT</span>;
      case "on_approved_leave":
        return <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">ON APPROVED LEAVE</span>;
      case "rest_day":
        return <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-semibold">REST DAY</span>;
      case "pending_correction":
        return <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-semibold">CORRECTION PENDING</span>;
      default:
        return <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">NOT YET TIMED IN</span>;
    }
  };

  const isTimedIn = Boolean(currentRecord?.time_in);
  const isTimedOut = Boolean(currentRecord?.time_out);
  const isOnBreak = status === "on_break";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">Staff Attendance Time Clock</h1>
          <p className="text-xs text-ink-soft mt-1">
            Authoritative clinic employee timekeeping and shift attendance punch
          </p>
        </div>
        <button
          onClick={() => setIsCorrectionModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-line rounded-xl text-xs font-medium text-ink hover:bg-pale shadow-2xs transition-colors"
        >
          <FileEdit size={14} className="text-amber-600" />
          Request Punch Correction
        </button>
      </div>

      {/* Main Digital Clock & Employee Profile Card */}
      <div className="bg-white rounded-3xl border border-line p-6 sm:p-8 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Left: Employee Info & Schedule */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-royal/10 text-royal flex items-center justify-center font-bold text-lg">
                {employee.fullName.charAt(0)}
              </div>
              <div>
                <h2 className="font-serif text-lg font-bold text-ink">{employee.fullName}</h2>
                <p className="text-xs text-ink-soft">
                  ID: <span className="font-mono text-ink font-semibold">{employee.id.slice(0, 8)}</span> &bull; {employee.role.toUpperCase()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <div className="bg-pale/60 p-3 rounded-2xl border border-line/60">
                <p className="text-ink-soft flex items-center gap-1.5"><Building2 size={13} /> Assigned Branch</p>
                <p className="font-semibold text-ink mt-0.5">{employee.branchName}</p>
              </div>
              <div className="bg-pale/60 p-3 rounded-2xl border border-line/60">
                <p className="text-ink-soft flex items-center gap-1.5"><Calendar size={13} /> Today&apos;s Date</p>
                <p className="font-semibold text-ink mt-0.5">{new Date(data.today).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</p>
              </div>
            </div>

            <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-3.5 flex items-center justify-between text-xs">
              <div>
                <p className="text-blue-900 font-semibold">{shiftTitle}</p>
                <p className="text-blue-700 mt-0.5">
                  Scheduled: <span className="font-mono font-bold">{scheduledStart} &mdash; {scheduledEnd}</span> (Grace: {schedule?.grace_period_minutes ?? 15}m)
                </p>
              </div>
              <div className="text-right">
                {getStatusBadge(status)}
              </div>
            </div>

            {/* Verified Selfie Badge if clocked in */}
            {currentRecord?.time_in_photo_url && (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentRecord.time_in_photo_url}
                  alt="Clock-in selfie"
                  className="w-12 h-12 rounded-xl object-cover border border-emerald-300 shadow-sm shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-600 shrink-0" /> Verified Clock-In Selfie
                  </p>
                  <p className="text-[11px] text-emerald-800 truncate">
                    Photo verified &bull; {currentRecord.time_in ? new Date(currentRecord.time_in).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }) : "Recorded"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right: Authoritative Live Digital Clock */}
          <div className="flex flex-col items-center justify-center bg-radial from-amber-50/50 to-pale/40 p-6 rounded-3xl border border-line/80 text-center">
            <p className="text-xs uppercase tracking-widest text-ink-soft font-semibold flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-royal" /> Official Clinic Server Time
            </p>
            <div className="font-mono text-4xl sm:text-5xl font-black text-ink mt-2 tracking-tight">
              {currentTime.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
            <p className="text-xs text-ink-soft mt-1.5">
              {currentTime.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>

            {/* Action Buttons Grid */}
            <div className="grid grid-cols-2 gap-3 w-full mt-6">
              {/* TIME IN */}
              <button
                onClick={handleTimeIn}
                disabled={isTimedIn || isTimedOut || loadingAction !== null}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold text-xs transition-all shadow-sm ${
                  !isTimedIn && !isTimedOut
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                }`}
              >
                <Camera size={15} className={!isTimedIn && !isTimedOut ? "text-amber-300" : ""} />
                {loadingAction === "time_in" ? "Processing..." : "TIME IN (SELFIE)"}
              </button>

              {/* TIME OUT */}
              <button
                onClick={handleTimeOut}
                disabled={!isTimedIn || isTimedOut || isOnBreak || loadingAction !== null}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold text-xs transition-all shadow-sm ${
                  isTimedIn && !isTimedOut && !isOnBreak
                    ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                }`}
              >
                <Camera size={15} />
                {loadingAction === "time_out" ? "Processing..." : "TIME OUT (SELFIE)"}
              </button>

              {/* START BREAK */}
              <button
                onClick={handleStartBreak}
                disabled={!isTimedIn || isTimedOut || isOnBreak || loadingAction !== null}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-xs border transition-all ${
                  isTimedIn && !isTimedOut && !isOnBreak
                    ? "bg-white hover:bg-blue-50 text-blue-700 border-blue-300"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200"
                }`}
              >
                <Coffee size={14} />
                {loadingAction === "start_break" ? "Starting..." : "Start Break"}
              </button>

              {/* END BREAK */}
              <button
                onClick={handleEndBreak}
                disabled={!isOnBreak || loadingAction !== null}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-xs border transition-all ${
                  isOnBreak
                    ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-600 animate-pulse"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200"
                }`}
              >
                <Clock size={14} />
                {loadingAction === "end_break" ? "Ending..." : "End Break"}
              </button>
            </div>
          </div>
        </div>

        {/* Visual Punch Timeline */}
        <div className="mt-8 pt-6 border-t border-line">
          <h3 className="text-xs font-bold text-ink uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Timer size={14} className="text-royal" /> Today&apos;s Attendance Punch Ledger
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-pale/40 rounded-xl border border-line">
              <span className="text-ink-soft">Actual Time In</span>
              <p className="font-mono font-bold text-sm text-ink mt-1">
                {currentRecord?.time_in
                  ? new Date(currentRecord.time_in).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })
                  : "--:--"}
              </p>
              {Number(currentRecord?.late_minutes || 0) > 0 && (
                <span className="text-amber-700 font-semibold text-[10px] mt-0.5 block">
                  Late: {currentRecord?.late_minutes} mins
                </span>
              )}
            </div>

            <div className="p-3 bg-pale/40 rounded-xl border border-line">
              <span className="text-ink-soft">Break Duration</span>
              <p className="font-mono font-bold text-sm text-ink mt-1">
                {currentRecord?.break_minutes ? `${currentRecord.break_minutes} mins` : "--"}
              </p>
              {isOnBreak && (
                <span className="text-blue-700 font-semibold text-[10px] mt-0.5 block">
                  Currently on Break
                </span>
              )}
            </div>

            <div className="p-3 bg-pale/40 rounded-xl border border-line">
              <span className="text-ink-soft">Actual Time Out</span>
              <p className="font-mono font-bold text-sm text-ink mt-1">
                {currentRecord?.time_out
                  ? new Date(currentRecord.time_out).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })
                  : "--:--"}
              </p>
              {Number(currentRecord?.undertime_minutes || 0) > 0 && (
                <span className="text-rose-700 font-semibold text-[10px] mt-0.5 block">
                  Undertime: {currentRecord?.undertime_minutes} mins
                </span>
              )}
            </div>

            <div className="p-3 bg-royal/5 rounded-xl border border-royal/20">
              <span className="text-royal font-semibold">Total Working Hours</span>
              <p className="font-mono font-bold text-sm text-royal mt-1">
                {Number(currentRecord?.hours_worked || 0).toFixed(2)} hrs
              </p>
              <span className="text-ink-soft text-[10px] mt-0.5 block">
                {isTimedOut ? "Completed shift" : "In progress"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent History Table */}
      <div className="bg-white rounded-3xl border border-line p-6 shadow-sm space-y-4">
        <h3 className="font-serif font-bold text-base text-ink flex items-center gap-2">
          <History size={16} className="text-royal" /> Past 7 Days Attendance History
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-line text-ink-soft font-semibold">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Time In</th>
                <th className="py-2.5 px-3">Time Out</th>
                <th className="py-2.5 px-3">Break</th>
                <th className="py-2.5 px-3">Recorded Hours</th>
                <th className="py-2.5 px-3">Late / Undertime</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {data.recentRecords.map((rec: any) => (
                <tr key={rec.id} className="hover:bg-pale/40 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-ink">
                    {new Date(rec.work_date).toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" })}
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    {rec.time_in ? new Date(rec.time_in).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    {rec.time_out ? new Date(rec.time_out).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
                  </td>
                  <td className="py-2.5 px-3">{rec.break_minutes || 0}m</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-ink">
                    {Number(rec.hours_worked || 0).toFixed(2)} hrs
                  </td>
                  <td className="py-2.5 px-3">
                    {rec.late_minutes > 0 ? (
                      <span className="text-amber-700">Late: {rec.late_minutes}m</span>
                    ) : rec.undertime_minutes > 0 ? (
                      <span className="text-rose-700">Under: {rec.undertime_minutes}m</span>
                    ) : (
                      <span className="text-emerald-700">On Time</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    {getStatusBadge(rec.attendance_status || rec.status)}
                  </td>
                </tr>
              ))}
              {data.recentRecords.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-ink-soft">
                    No recent attendance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Punch Correction Modal */}
      {isCorrectionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-line shadow-xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <h3 className="font-serif font-bold text-base text-ink flex items-center gap-2">
                <FileEdit size={16} className="text-amber-600" /> Request Punch Correction
              </h3>
              <button
                onClick={() => setIsCorrectionModalOpen(false)}
                className="text-ink-soft hover:text-ink p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitCorrection} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-ink block mb-1">Correction Type</label>
                <select
                  value={correctionType}
                  onChange={(e) => setCorrectionType(e.target.value as CorrectionType)}
                  className="w-full p-2.5 rounded-xl border border-line bg-white text-ink focus:outline-none focus:border-royal"
                >
                  <option value="missed_time_in">Missed Time In</option>
                  <option value="missed_time_out">Missed Time Out</option>
                  <option value="incorrect_time">Incorrect Time Punch</option>
                  <option value="missed_break">Missed Break Adjustment</option>
                  <option value="undertime_excusal">Official Undertime Excusal</option>
                  <option value="other">Other System Discrepancy</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-ink block mb-1">Requested Time In</label>
                  <input
                    type="time"
                    value={requestedTimeIn}
                    onChange={(e) => setRequestedTimeIn(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-line bg-white text-ink font-mono focus:outline-none focus:border-royal"
                  />
                </div>
                <div>
                  <label className="font-semibold text-ink block mb-1">Requested Time Out</label>
                  <input
                    type="time"
                    value={requestedTimeOut}
                    onChange={(e) => setRequestedTimeOut(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-line bg-white text-ink font-mono focus:outline-none focus:border-royal"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-ink block mb-1">Reason / Explanation *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why this correction is needed (e.g. system connection issue, power outage, emergency client handling)..."
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-line bg-white text-ink focus:outline-none focus:border-royal resize-none"
                />
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-600" />
                <span>
                  Corrections require approval by your supervisor or branch manager before taking effect in your official time ledger and payroll.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsCorrectionModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-line text-ink-soft hover:bg-pale font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCorrection}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-royal text-white font-semibold hover:bg-royal/90 shadow-sm disabled:opacity-50"
                >
                  <Send size={13} />
                  {submittingCorrection ? "Submitting..." : "Submit for Approval"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selfie Clock-In / Out Verification Modal */}
      {selfieModalMode && (
        <SelfieCaptureModal
          mode={selfieModalMode}
          employeeName={employee.fullName}
          branchName={employee.branchName}
          onClose={() => setSelfieModalMode(null)}
          onConfirm={handleConfirmSelfie}
          loading={submittingSelfie}
        />
      )}
    </div>
  );
}
