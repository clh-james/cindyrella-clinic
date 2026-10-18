"use client";

import { useState } from "react";
import { X, Save, Clock } from "lucide-react";
import { AttendanceRecord, StaffBasic, BranchInfo, AttendanceStatus, LeaveType } from "@/app/admin/(dashboard)/payroll/types";
import { logAttendance } from "@/app/admin/(dashboard)/payroll/actions";
import { OVERTIME_LABELS, OvertimeType } from "@/lib/payroll/philippine-tax";
import toast from "react-hot-toast";

interface AttendanceLogModalProps {
  record?: AttendanceRecord | null;
  staffList: StaffBasic[];
  branches: BranchInfo[];
  onClose: () => void;
  onSaved: () => void;
}

export function AttendanceLogModal({
  record,
  staffList,
  branches,
  onClose,
  onSaved,
}: AttendanceLogModalProps) {
  const [employeeId, setEmployeeId] = useState(record?.employee_id || staffList[0]?.id || "");
  const [branchId, setBranchId] = useState(record?.branch_id || branches[0]?.id || "");
  const [workDate, setWorkDate] = useState(record?.work_date || new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<AttendanceStatus>(record?.status || "present");
  const [hoursWorked, setHoursWorked] = useState(record?.hours_worked?.toString() || "8");
  const [lateMinutes, setLateMinutes] = useState(record?.late_minutes?.toString() || "0");
  const [undertimeMinutes, setUndertimeMinutes] = useState(record?.undertime_minutes?.toString() || "0");
  const [leaveType, setLeaveType] = useState<LeaveType>(record?.leave_type || "none");
  const [isApprovedLeave, setIsApprovedLeave] = useState(record?.is_approved_leave ?? false);

  // Overtime
  const [overtimeHours, setOvertimeHours] = useState(record?.overtime_hours?.toString() || "0");
  const [overtimeType, setOvertimeType] = useState<OvertimeType>(record?.overtime_type || "regular_workday");
  const [overtimeStatus, setOvertimeStatus] = useState<"none" | "pending" | "approved" | "rejected">(record?.overtime_status || "none");
  const [notes, setNotes] = useState(record?.notes || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await logAttendance({
        id: record?.id,
        employee_id: employeeId,
        branch_id: branchId,
        work_date: workDate,
        status,
        hours_worked: parseFloat(hoursWorked) || 0,
        late_minutes: parseInt(lateMinutes, 10) || 0,
        undertime_minutes: parseInt(undertimeMinutes, 10) || 0,
        leave_type: status === "on_leave" ? leaveType : null,
        is_approved_leave: isApprovedLeave,
        overtime_hours: parseFloat(overtimeHours) || 0,
        overtime_type: overtimeType,
        overtime_status: parseFloat(overtimeHours) > 0 ? (overtimeStatus === "none" ? "pending" : overtimeStatus) : "none",
        notes,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to log attendance");
      } else {
        toast.success("Attendance entry saved successfully!");
        onSaved();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save attendance";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-royal/10 p-2 text-royal">
              <Clock size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold font-serif text-ink">
                {record ? "Edit Attendance Record" : "Log Daily Attendance & Overtime"}
              </h2>
              <p className="text-xs text-ink-soft">Record clinical duty hours, tardiness, and overtime</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl border border-line p-2 text-ink-soft hover:bg-pale">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink mb-1">Employee</label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                disabled={!!record}
                className="w-full rounded-xl border border-line bg-pale/40 px-3 py-2 text-ink font-medium"
              >
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-ink mb-1">Branch</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full rounded-xl border border-line bg-pale/40 px-3 py-2 text-ink font-medium"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink mb-1">Work Date</label>
              <input
                type="date"
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
                required
                className="w-full rounded-xl border border-line px-3 py-2 text-ink"
              />
            </div>
            <div>
              <label className="block font-semibold text-ink mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-ink font-medium"
              >
                <option value="present">Present (On Duty)</option>
                <option value="absent">Absent</option>
                <option value="on_leave">On Leave</option>
                <option value="rest_day">Rest Day</option>
                <option value="holiday">Holiday</option>
              </select>
            </div>
          </div>

          {status === "present" && (
            <div className="grid grid-cols-3 gap-3 rounded-2xl bg-pale/30 border border-line p-3">
              <div>
                <label className="block font-semibold text-ink mb-1">Hours Rendered</label>
                <input
                  type="number"
                  step="0.5"
                  value={hoursWorked}
                  onChange={(e) => setHoursWorked(e.target.value)}
                  className="w-full rounded-xl border border-line bg-white px-3 py-2 font-mono font-semibold text-ink"
                />
              </div>
              <div>
                <label className="block font-semibold text-ink mb-1">Late (Minutes)</label>
                <input
                  type="number"
                  value={lateMinutes}
                  onChange={(e) => setLateMinutes(e.target.value)}
                  className="w-full rounded-xl border border-line bg-white px-3 py-2 font-mono font-semibold text-red-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-ink mb-1">Undertime (Mins)</label>
                <input
                  type="number"
                  value={undertimeMinutes}
                  onChange={(e) => setUndertimeMinutes(e.target.value)}
                  className="w-full rounded-xl border border-line bg-white px-3 py-2 font-mono font-semibold text-red-600"
                />
              </div>
            </div>
          )}

          {status === "on_leave" && (
            <div className="grid grid-cols-2 gap-3 rounded-2xl bg-amber-50/50 border border-amber-200 p-3">
              <div>
                <label className="block font-semibold text-ink mb-1">Leave Classification</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                  className="w-full rounded-xl border border-line bg-white px-3 py-2 text-ink"
                >
                  <option value="vacation">Vacation Leave (VL)</option>
                  <option value="sick">Sick Leave (SL)</option>
                  <option value="emergency">Emergency Leave</option>
                  <option value="maternity">Maternity Leave</option>
                  <option value="paternity">Paternity Leave</option>
                  <option value="unpaid">Unpaid Leave</option>
                </select>
              </div>
              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-ink font-semibold">
                  <input
                    type="checkbox"
                    checked={isApprovedLeave}
                    onChange={(e) => setIsApprovedLeave(e.target.checked)}
                    className="rounded border-line text-royal"
                  />
                  Approved Paid Leave
                </label>
              </div>
            </div>
          )}

          {/* Overtime Section */}
          <div className="rounded-2xl border border-line p-3 space-y-3">
            <h4 className="font-semibold uppercase tracking-wider text-[11px] text-royal">
              Overtime Request & Classification
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-ink mb-1">OT Hours</label>
                <input
                  type="number"
                  step="0.5"
                  value={overtimeHours}
                  onChange={(e) => setOvertimeHours(e.target.value)}
                  placeholder="0.0"
                  className="w-full rounded-xl border border-line px-3 py-2 font-mono font-semibold text-ink"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold text-ink mb-1">Overtime Type / Rate</label>
                <select
                  value={overtimeType}
                  onChange={(e) => setOvertimeType(e.target.value as OvertimeType)}
                  className="w-full rounded-xl border border-line bg-white px-3 py-2 text-ink font-medium"
                >
                  {Object.entries(OVERTIME_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {parseFloat(overtimeHours) > 0 && (
              <div className="flex items-center justify-between border-t border-line/60 pt-2">
                <span className="text-[11px] text-ink-soft">Approval Status:</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="otStatus"
                      value="pending"
                      checked={overtimeStatus === "pending" || overtimeStatus === "none"}
                      onChange={() => setOvertimeStatus("pending")}
                    />
                    Pending
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer text-emerald-700 font-semibold">
                    <input
                      type="radio"
                      name="otStatus"
                      value="approved"
                      checked={overtimeStatus === "approved"}
                      onChange={() => setOvertimeStatus("approved")}
                    />
                    Approved
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer text-red-600">
                    <input
                      type="radio"
                      name="otStatus"
                      value="rejected"
                      checked={overtimeStatus === "rejected"}
                      onChange={() => setOvertimeStatus("rejected")}
                    />
                    Rejected
                  </label>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block font-semibold text-ink mb-1">Remarks / Justification</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Approved overtime for high-volume drip patients"
              className="w-full rounded-xl border border-line px-3 py-2 text-ink"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-line px-4 py-2 text-ink-soft hover:bg-pale font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl bg-royal px-5 py-2 font-semibold text-white hover:bg-royal/90 shadow-sm"
            >
              <Save size={15} />
              {loading ? "Saving..." : "Save Attendance"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
