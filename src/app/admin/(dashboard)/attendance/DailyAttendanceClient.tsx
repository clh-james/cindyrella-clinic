// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Daily Staff Attendance Ledger, Timekeeping Dashboard & Monitoring Client
// ==============================================================================

"use client";

import { useState } from "react";
import {
  CalendarCheck,
  Search,
  Filter,
  Download,
  Users,
  Clock,
  AlertTriangle,
  Coffee,
  CheckCircle2,
  XCircle,
  FileEdit,
  Eye,
  Calendar,
  Building2,
  ChevronRight,
  ShieldCheck,
  Check,
  X,
  Plus,
  Send,
  Timer,
  Info,
} from "lucide-react";
import {
  DailyAttendanceRecord,
  AttendanceDashboardKPIs,
  CashierAttendanceDiscrepancy,
  AttendanceStatus,
  EmployeeSchedule,
} from "./types";
import {
  reviewAttendanceCorrection,
  createOrUpdateEmployeeSchedule,
} from "./actions";
import {
  exportDailyAttendanceExcel,
  generateDailyAttendanceCSV,
} from "@/lib/attendance/attendance-export";
import toast from "react-hot-toast";

interface DailyAttendanceClientProps {
  initialData: {
    date: string;
    branchId: string;
    records: DailyAttendanceRecord[];
    kpis: AttendanceDashboardKPIs;
    discrepancies: CashierAttendanceDiscrepancy[];
    branches: Array<{ id: string; name: string }>;
    staffList: Array<{ id: string; full_name: string; branch_id: string | null }>;
    isSuperAdmin: boolean;
  };
}

export function DailyAttendanceClient({ initialData }: DailyAttendanceClientProps) {
  const [data, setData] = useState(initialData);
  const [selectedDate, setSelectedDate] = useState(initialData.date);
  const [selectedBranch, setSelectedBranch] = useState(initialData.branchId);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals state
  const [selectedRecord, setSelectedRecord] = useState<DailyAttendanceRecord | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Review Correction Modal
  const [reviewCorrectionRecord, setReviewCorrectionRecord] = useState<DailyAttendanceRecord | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [processingCorrection, setProcessingCorrection] = useState(false);

  // Configure Schedule Modal
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleEmployeeId, setScheduleEmployeeId] = useState("");
  const [shiftName, setShiftName] = useState("Standard Clinic Shift");
  const [scheduledStart, setScheduledStart] = useState("09:00");
  const [scheduledEnd, setScheduledEnd] = useState("18:00");
  const [gracePeriod, setGracePeriod] = useState(15);
  const [breakMinutes, setBreakMinutes] = useState(60);
  const [savingSchedule, setSavingSchedule] = useState(false);

  const { records, kpis, discrepancies, branches, staffList, isSuperAdmin } = data;

  // Filter records
  const filteredRecords = records.filter((r) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = r.employee_name.toLowerCase().includes(q);
      const matchCode = r.employee_code?.toLowerCase().includes(q);
      if (!matchName && !matchCode) return false;
    }

    if (selectedBranch !== "all" && r.branch_id !== selectedBranch) {
      return false;
    }

    if (statusFilter !== "all" && r.attendance_status !== statusFilter) {
      return false;
    }

    return true;
  });

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    const url = new URL(window.location.href);
    url.searchParams.set("date", newDate);
    if (selectedBranch !== "all") url.searchParams.set("branchId", selectedBranch);
    window.location.href = url.toString();
  };

  const handleBranchChange = (newBranch: string) => {
    setSelectedBranch(newBranch);
    const url = new URL(window.location.href);
    url.searchParams.set("date", selectedDate);
    if (newBranch !== "all") url.searchParams.set("branchId", newBranch);
    else url.searchParams.delete("branchId");
    window.location.href = url.toString();
  };

  const handleExportExcel = async () => {
    try {
      const branchName =
        selectedBranch === "all"
          ? "All Branches"
          : branches.find((b) => b.id === selectedBranch)?.name || "Selected Branch";
      const blob = await exportDailyAttendanceExcel(filteredRecords, selectedDate, branchName);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Cindyrella_Daily_Attendance_${selectedDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Daily attendance Excel workbook generated!");
    } catch {
      toast.error("Failed to generate Excel report.");
    }
  };

  const handleExportCSV = () => {
    try {
      const csvContent = generateDailyAttendanceCSV(filteredRecords);
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Cindyrella_Attendance_${selectedDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("CSV attendance export downloaded!");
    } catch {
      toast.error("Failed to download CSV.");
    }
  };

  const handleReviewCorrection = async (decision: "approved" | "rejected") => {
    if (!reviewCorrectionRecord) return;
    setProcessingCorrection(true);
    try {
      // Find correction id or record id
      const res = await reviewAttendanceCorrection({
        correctionId: reviewCorrectionRecord.pending_correction_id || reviewCorrectionRecord.id,
        decision,
        reviewNotes,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to process correction review.");
      } else {
        toast.success(res.message || `Correction request ${decision}.`);
        setReviewCorrectionRecord(null);
        setReviewNotes("");
        window.location.reload();
      }
    } catch {
      toast.error("Error processing correction review.");
    } finally {
      setProcessingCorrection(false);
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleEmployeeId) {
      toast.error("Please select an employee.");
      return;
    }

    setSavingSchedule(true);
    try {
      const res = await createOrUpdateEmployeeSchedule({
        employee_id: scheduleEmployeeId,
        shift_name: shiftName,
        scheduled_start: `${scheduledStart}:00`,
        scheduled_end: `${scheduledEnd}:00`,
        grace_period_minutes: Number(gracePeriod),
        break_minutes: Number(breakMinutes),
      });

      if (!res.success) {
        toast.error(res.error || "Failed to save schedule.");
      } else {
        toast.success("Employee schedule updated successfully!");
        setIsScheduleModalOpen(false);
      }
    } catch {
      toast.error("Error saving employee schedule.");
    } finally {
      setSavingSchedule(false);
    }
  };

  const getStatusBadge = (st: AttendanceStatus) => {
    switch (st) {
      case "present":
        return <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[11px] font-semibold">Present</span>;
      case "late":
        return <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[11px] font-semibold">Late</span>;
      case "on_break":
        return <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[11px] font-semibold">On Break</span>;
      case "timed_out":
        return <span className="px-2.5 py-0.5 bg-slate-200 text-slate-800 rounded-full text-[11px] font-semibold">Timed Out</span>;
      case "absent":
        return <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 rounded-full text-[11px] font-semibold">Absent</span>;
      case "on_approved_leave":
        return <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 rounded-full text-[11px] font-semibold">Leave</span>;
      case "rest_day":
        return <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-[11px] font-semibold">Rest Day</span>;
      case "pending_correction":
        return <span className="px-2.5 py-0.5 bg-orange-100 text-orange-800 rounded-full text-[11px] font-semibold">Review Pending</span>;
      case "incomplete":
        return <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-[11px] font-semibold">Incomplete</span>;
      default:
        return <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[11px] font-semibold">Not Timed In</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">Staff Daily Attendance & Timekeeping</h1>
          <p className="text-xs text-ink-soft mt-1">
            Authoritative attendance records, shift schedules, overtime, and real-time punch monitoring
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Schedule Configuration Button */}
          <button
            onClick={() => setIsScheduleModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-line rounded-xl text-xs font-semibold text-ink hover:bg-pale shadow-2xs"
          >
            <Clock size={14} className="text-royal" /> Manage Schedules
          </button>

          {/* Export Dropdown Options */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-line rounded-xl text-xs font-semibold text-ink hover:bg-pale shadow-2xs"
          >
            <Download size={14} className="text-emerald-700" /> Export Excel
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-line rounded-xl text-xs font-semibold text-ink hover:bg-pale shadow-2xs"
          >
            <Download size={14} className="text-blue-700" /> CSV
          </button>
        </div>
      </div>

      {/* Cashier Shift Discrepancy Alert Banner */}
      {discrepancies.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
            <AlertTriangle size={16} className="text-amber-600" />
            Cashier Shift Inconsistency Detected ({discrepancies.length})
          </div>
          <div className="space-y-1.5">
            {discrepancies.map((disc, idx) => (
              <div key={idx} className="text-xs text-amber-800 bg-white/70 p-2.5 rounded-xl border border-amber-200/60 flex items-center justify-between">
                <span>
                  <strong>{disc.employee_name}</strong> ({disc.branch_name}): {disc.issue_description}
                </span>
                <span className="font-mono text-[11px] text-amber-700">
                  Shift: {disc.cashier_shift_id.slice(0, 8)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8 Top KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-line shadow-2xs">
          <span className="text-[11px] font-medium text-ink-soft">Present Today</span>
          <p className="text-xl font-bold font-mono text-emerald-700 mt-1">{kpis.presentToday}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-line shadow-2xs">
          <span className="text-[11px] font-medium text-ink-soft">Not Yet Timed In</span>
          <p className="text-xl font-bold font-mono text-slate-600 mt-1">{kpis.notYetTimedIn}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-line shadow-2xs">
          <span className="text-[11px] font-medium text-ink-soft">Late Arrivals</span>
          <p className="text-xl font-bold font-mono text-amber-600 mt-1">{kpis.lateArrivals}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-line shadow-2xs">
          <span className="text-[11px] font-medium text-ink-soft">On Break</span>
          <p className="text-xl font-bold font-mono text-blue-600 mt-1">{kpis.currentlyOnBreak}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-line shadow-2xs">
          <span className="text-[11px] font-medium text-ink-soft">Clocked In</span>
          <p className="text-xl font-bold font-mono text-royal mt-1">{kpis.currentlyClockedIn}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-line shadow-2xs">
          <span className="text-[11px] font-medium text-ink-soft">Timed Out</span>
          <p className="text-xl font-bold font-mono text-slate-800 mt-1">{kpis.timedOut}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-line shadow-2xs">
          <span className="text-[11px] font-medium text-ink-soft">Absent</span>
          <p className="text-xl font-bold font-mono text-rose-600 mt-1">{kpis.absent}</p>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-line shadow-2xs">
          <span className="text-[11px] font-medium text-ink-soft">Pending Reviews</span>
          <p className="text-xl font-bold font-mono text-orange-600 mt-1">{kpis.pendingCorrections}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-line shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker */}
          <div className="flex items-center gap-1.5 bg-pale/50 px-3 py-1.5 rounded-xl border border-line">
            <Calendar size={14} className="text-ink-soft" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="bg-transparent font-semibold text-ink focus:outline-none"
            />
          </div>

          {/* Branch Filter */}
          <div className="flex items-center gap-1.5 bg-pale/50 px-3 py-1.5 rounded-xl border border-line">
            <Building2 size={14} className="text-ink-soft" />
            <select
              value={selectedBranch}
              onChange={(e) => handleBranchChange(e.target.value)}
              className="bg-transparent font-semibold text-ink focus:outline-none"
            >
              {isSuperAdmin && <option value="all">All Authorized Branches</option>}
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-pale/50 px-3 py-1.5 rounded-xl border border-line">
            <Filter size={14} className="text-ink-soft" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-semibold text-ink focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="present">Present / On Time</option>
              <option value="late">Late Arrivals</option>
              <option value="on_break">On Break</option>
              <option value="timed_out">Timed Out</option>
              <option value="absent">Absent</option>
              <option value="on_approved_leave">On Approved Leave</option>
              <option value="rest_day">Rest Day</option>
              <option value="pending_correction">Pending Correction</option>
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            type="text"
            placeholder="Search employee name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-line rounded-xl text-xs text-ink focus:outline-none focus:border-royal"
          />
        </div>
      </div>

      {/* Desktop Attendance Table */}
      <div className="hidden md:block bg-white rounded-3xl border border-line shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-pale/70 border-b border-line text-ink-soft font-semibold">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4">Scheduled Shift</th>
                <th className="py-3 px-4">Time In</th>
                <th className="py-3 px-4">Break Duration</th>
                <th className="py-3 px-4">Time Out</th>
                <th className="py-3 px-4">Hours</th>
                <th className="py-3 px-4">Late / Under</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {filteredRecords.map((r) => (
                <tr key={r.id} className="hover:bg-pale/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-ink">{r.employee_name}</div>
                    <div className="text-[11px] text-ink-soft font-mono">ID: {r.employee_code}</div>
                  </td>
                  <td className="py-3 px-4 text-ink">{r.branch_name}</td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-ink">{r.shift_name}</div>
                    <div className="text-[10px] text-ink-soft font-mono">
                      {r.scheduled_start_time.slice(0, 5)} &mdash; {r.scheduled_end_time.slice(0, 5)}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono font-medium">
                    {r.time_in ? new Date(r.time_in).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
                  </td>
                  <td className="py-3 px-4">
                    {r.break_minutes > 0 ? `${r.break_minutes}m` : "--"}
                    {r.attendance_status === "on_break" && (
                      <span className="block text-[10px] text-blue-600 font-semibold">Active Break</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono font-medium">
                    {r.time_out ? new Date(r.time_out).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-ink">
                    {Number(r.hours_worked || 0).toFixed(2)}h
                  </td>
                  <td className="py-3 px-4">
                    {r.late_minutes > 0 ? (
                      <span className="text-amber-700 font-semibold block">+{r.late_minutes}m Late</span>
                    ) : null}
                    {r.undertime_minutes > 0 ? (
                      <span className="text-rose-700 font-semibold block">-{r.undertime_minutes}m Under</span>
                    ) : null}
                    {r.late_minutes === 0 && r.undertime_minutes === 0 && r.time_in ? (
                      <span className="text-emerald-700">On Time</span>
                    ) : null}
                    {!r.time_in && <span className="text-ink-soft">--</span>}
                  </td>
                  <td className="py-3 px-4">{getStatusBadge(r.attendance_status)}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedRecord(r);
                          setIsDetailsModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg border border-line text-ink-soft hover:bg-pale hover:text-ink"
                        title="View Details"
                      >
                        <Eye size={13} />
                      </button>

                      {r.correction_status === "pending" && (
                        <button
                          onClick={() => {
                            setReviewCorrectionRecord(r);
                          }}
                          className="px-2 py-1 rounded-lg bg-amber-500 text-white font-semibold text-[11px] hover:bg-amber-600"
                        >
                          Review
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-ink-soft">
                    No attendance records match the selected date and filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Responsive Attendance Cards */}
      <div className="md:hidden space-y-3">
        {filteredRecords.map((r) => (
          <div key={r.id} className="bg-white p-4 rounded-2xl border border-line shadow-2xs space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold text-sm text-ink">{r.employee_name}</h4>
                <p className="text-xs text-ink-soft font-mono">ID: {r.employee_code} &bull; {r.branch_name}</p>
              </div>
              <div>{getStatusBadge(r.attendance_status)}</div>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-pale/50 p-2.5 rounded-xl text-center text-xs">
              <div>
                <span className="text-ink-soft text-[10px]">Time In</span>
                <p className="font-mono font-bold mt-0.5">
                  {r.time_in ? new Date(r.time_in).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
                </p>
              </div>
              <div>
                <span className="text-ink-soft text-[10px]">Time Out</span>
                <p className="font-mono font-bold mt-0.5">
                  {r.time_out ? new Date(r.time_out).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
                </p>
              </div>
              <div>
                <span className="text-ink-soft text-[10px]">Hours</span>
                <p className="font-mono font-bold text-royal mt-0.5">
                  {Number(r.hours_worked || 0).toFixed(2)}h
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-line/60">
              <span className="text-ink-soft">
                {r.late_minutes > 0 ? `Late: ${r.late_minutes}m` : "On Time"}
              </span>
              <button
                onClick={() => {
                  setSelectedRecord(r);
                  setIsDetailsModalOpen(true);
                }}
                className="text-royal font-semibold flex items-center gap-1"
              >
                Details <ChevronRight size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Record Details Modal */}
      {isDetailsModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-line shadow-xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <h3 className="font-serif font-bold text-base text-ink">
                Attendance Details &mdash; {selectedRecord.employee_name}
              </h3>
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="text-ink-soft hover:text-ink p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-pale/50 p-3 rounded-2xl">
                <div>
                  <span className="text-ink-soft">Work Date</span>
                  <p className="font-bold text-ink mt-0.5">{selectedRecord.work_date}</p>
                </div>
                <div>
                  <span className="text-ink-soft">Assigned Branch</span>
                  <p className="font-bold text-ink mt-0.5">{selectedRecord.branch_name}</p>
                </div>
                <div>
                  <span className="text-ink-soft">Scheduled Shift</span>
                  <p className="font-bold text-ink mt-0.5">{selectedRecord.shift_name}</p>
                </div>
                <div>
                  <span className="text-ink-soft">Shift Hours</span>
                  <p className="font-bold text-ink mt-0.5 font-mono">
                    {selectedRecord.scheduled_start_time.slice(0, 5)} - {selectedRecord.scheduled_end_time.slice(0, 5)}
                  </p>
                </div>
              </div>

              {/* Punches */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 bg-white border border-line rounded-xl">
                  <span className="text-ink-soft">Time In</span>
                  <p className="font-mono font-bold mt-1">
                    {selectedRecord.time_in ? new Date(selectedRecord.time_in).toLocaleTimeString("en-PH") : "--"}
                  </p>
                </div>
                <div className="p-3 bg-white border border-line rounded-xl">
                  <span className="text-ink-soft">Break Time</span>
                  <p className="font-mono font-bold mt-1">{selectedRecord.break_minutes} mins</p>
                </div>
                <div className="p-3 bg-white border border-line rounded-xl">
                  <span className="text-ink-soft">Time Out</span>
                  <p className="font-mono font-bold mt-1">
                    {selectedRecord.time_out ? new Date(selectedRecord.time_out).toLocaleTimeString("en-PH") : "--"}
                  </p>
                </div>
              </div>

              {selectedRecord.breaks && selectedRecord.breaks.length > 0 && (
                <div className="mt-3">
                  <h4 className="font-semibold text-ink mb-1.5">Recorded Break Sessions:</h4>
                  <ul className="divide-y divide-line/60 border border-line rounded-xl overflow-hidden">
                    {selectedRecord.breaks.map((b, idx) => (
                      <li key={idx} className="p-2.5 flex items-center justify-between bg-pale/20">
                        <span className="capitalize">{b.break_type} Break</span>
                        <span className="font-mono text-ink-soft">
                          {new Date(b.break_start).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}
                          {" &mdash; "}
                          {b.break_end ? new Date(b.break_end).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }) : "In progress"}
                          {b.duration_minutes ? ` (${b.duration_minutes}m)` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedRecord.notes && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-ink">
                  <strong>Notes:</strong> {selectedRecord.notes}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-line">
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-4 py-2 bg-royal text-white rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Correction Request Modal */}
      {reviewCorrectionRecord && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-line shadow-xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <h3 className="font-serif font-bold text-base text-ink flex items-center gap-2">
                <FileEdit size={16} className="text-amber-600" /> Review Attendance Correction
              </h3>
              <button
                onClick={() => setReviewCorrectionRecord(null)}
                className="text-ink-soft hover:text-ink p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-pale/50 p-3 rounded-2xl">
                <p><strong>Employee:</strong> {reviewCorrectionRecord.employee_name}</p>
                <p><strong>Work Date:</strong> {reviewCorrectionRecord.work_date}</p>
                <p><strong>Original Punches:</strong> In: {reviewCorrectionRecord.time_in ? new Date(reviewCorrectionRecord.time_in).toLocaleTimeString("en-PH") : "None"} &bull; Out: {reviewCorrectionRecord.time_out ? new Date(reviewCorrectionRecord.time_out).toLocaleTimeString("en-PH") : "None"}</p>
              </div>

              <div>
                <label className="font-semibold text-ink block mb-1">Supervisor Review Notes / Rationale</label>
                <textarea
                  rows={2}
                  placeholder="Enter comments or explanation for approval/rejection..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-line bg-white text-ink focus:outline-none focus:border-royal resize-none"
                />
              </div>

              <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-[11px] text-blue-900">
                <strong>Separation of Duties Notice:</strong> You cannot approve this correction if you submitted it on your own behalf.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <button
                disabled={processingCorrection}
                onClick={() => handleReviewCorrection("rejected")}
                className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-semibold"
              >
                Reject Request
              </button>
              <button
                disabled={processingCorrection}
                onClick={() => handleReviewCorrection("approved")}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
              >
                Approve Correction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configure Employee Schedule Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-line shadow-xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <h3 className="font-serif font-bold text-base text-ink flex items-center gap-2">
                <Clock size={16} className="text-royal" /> Configure Staff Shift Schedule
              </h3>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-ink-soft hover:text-ink p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-ink block mb-1">Select Employee *</label>
                <select
                  required
                  value={scheduleEmployeeId}
                  onChange={(e) => setScheduleEmployeeId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-line bg-white text-ink focus:outline-none focus:border-royal"
                >
                  <option value="">-- Choose Employee --</option>
                  {staffList.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-ink block mb-1">Shift Name</label>
                <input
                  type="text"
                  required
                  value={shiftName}
                  onChange={(e) => setShiftName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-line bg-white text-ink focus:outline-none focus:border-royal"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-ink block mb-1">Scheduled Start</label>
                  <input
                    type="time"
                    required
                    value={scheduledStart}
                    onChange={(e) => setScheduledStart(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-line bg-white text-ink font-mono focus:outline-none focus:border-royal"
                  />
                </div>
                <div>
                  <label className="font-semibold text-ink block mb-1">Scheduled End</label>
                  <input
                    type="time"
                    required
                    value={scheduledEnd}
                    onChange={(e) => setScheduledEnd(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-line bg-white text-ink font-mono focus:outline-none focus:border-royal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-ink block mb-1">Grace Period (Mins)</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={gracePeriod}
                    onChange={(e) => setGracePeriod(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-line bg-white text-ink font-mono focus:outline-none focus:border-royal"
                  />
                </div>
                <div>
                  <label className="font-semibold text-ink block mb-1">Break Time (Mins)</label>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    value={breakMinutes}
                    onChange={(e) => setBreakMinutes(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-line bg-white text-ink font-mono focus:outline-none focus:border-royal"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-line text-ink-soft hover:bg-pale font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSchedule}
                  className="px-4 py-2 rounded-xl bg-royal text-white font-semibold hover:bg-royal/90 shadow-sm disabled:opacity-50"
                >
                  {savingSchedule ? "Saving..." : "Save Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
