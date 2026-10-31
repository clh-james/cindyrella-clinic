// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Attendance Calculation, Timekeeping, and Reconciliation Engine
// ==============================================================================

import {
  AttendanceStatus,
  DailyAttendanceRecord,
  EmployeeSchedule,
  AttendanceDashboardKPIs,
  CashierAttendanceDiscrepancy,
  PayrollAttendanceSummary,
} from "@/app/admin/(dashboard)/attendance/types";

/**
 * Parses time string (e.g. "09:00:00" or "09:00") into minutes from midnight.
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(":").map(Number);
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  return hours * 60 + minutes;
}

/**
 * Checks whether a given shift crosses midnight.
 * e.g. scheduledStart = "21:00", scheduledEnd = "06:00" -> true
 */
export function isOvernightShift(scheduledStart: string, scheduledEnd: string): boolean {
  const startMins = parseTimeToMinutes(scheduledStart);
  const endMins = parseTimeToMinutes(scheduledEnd);
  return endMins <= startMins;
}

export const APP_TIMEZONE = "Asia/Manila";

/**
 * Returns hours and minutes from midnight (0..1439) in the clinic timezone (Asia/Manila, UTC+8).
 */
export function getMinutesFromMidnightInTimezone(
  dateOrIsoStr: string | Date,
  timeZone: string = APP_TIMEZONE
): number {
  if (!dateOrIsoStr) return 0;
  const d = typeof dateOrIsoStr === "string" ? new Date(dateOrIsoStr) : dateOrIsoStr;
  if (isNaN(d.getTime())) return 0;

  try {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const formatted = formatter.format(d);
    const parts = formatted.split(":");
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    return hours * 60 + minutes;
  } catch {
    return d.getHours() * 60 + d.getMinutes();
  }
}

/**
 * Calculates late minutes considering the schedule grace period.
 * If employee clocks in after scheduled_start + grace_period,
 * late minutes are calculated from the scheduled_start time in Asia/Manila (UTC+8).
 */
export function calculateLateMinutes(
  timeInStr: string | null | undefined,
  scheduledStartStr: string,
  gracePeriodMinutes: number = 0,
  shiftDateStr?: string
): number {
  if (!timeInStr) return 0;

  const actualTotalMins = getMinutesFromMidnightInTimezone(timeInStr);
  const scheduledStartMins = parseTimeToMinutes(scheduledStartStr);
  const diff = actualTotalMins - scheduledStartMins;

  // If clock-in is within grace period or early, not late
  if (diff <= gracePeriodMinutes) {
    return 0;
  }

  // Late minutes are measured from the official scheduled start
  return Math.max(0, diff);
}

/**
 * Calculates undertime minutes (leaving earlier than scheduled end) in Asia/Manila (UTC+8).
 */
export function calculateUndertimeMinutes(
  timeOutStr: string | null | undefined,
  scheduledEndStr: string,
  scheduledStartStr: string
): number {
  if (!timeOutStr) return 0;

  const actualTotalMins = getMinutesFromMidnightInTimezone(timeOutStr);
  const scheduledEndMins = parseTimeToMinutes(scheduledEndStr);

  const overnight = isOvernightShift(scheduledStartStr, scheduledEndStr);
  if (!overnight) {
    const diff = scheduledEndMins - actualTotalMins;
    return diff > 0 ? diff : 0;
  } else {
    // Overnight shift: scheduled end is next morning
    const diff = scheduledEndMins - actualTotalMins;
    return diff > 0 ? diff : 0;
  }
}

/**
 * Calculates net working hours between time-in and time-out, subtracting unpaid break minutes.
 * Returns decimal rounded to 2 places (e.g. 8.00).
 */
export function calculateWorkingHours(
  timeInStr: string | null | undefined,
  timeOutStr: string | null | undefined,
  breakMinutes: number = 0
): number {
  if (!timeInStr || !timeOutStr) return 0;

  const inTime = new Date(timeInStr).getTime();
  const outTime = new Date(timeOutStr).getTime();

  if (outTime <= inTime) return 0;

  const totalMinutes = (outTime - inTime) / (1000 * 60);
  const netMinutes = Math.max(0, totalMinutes - breakMinutes);
  const hours = netMinutes / 60;

  return Math.round((hours + Number.EPSILON) * 100) / 100;
}

/**
 * Evaluates the authoritative attendance status of a record.
 */
export function determineAttendanceStatus(params: {
  workDate: string;
  timeIn: string | null;
  timeOut: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  gracePeriodMinutes?: number;
  isApprovedLeave?: boolean;
  isRestDay?: boolean;
  hasPendingCorrection?: boolean;
  referenceNow?: Date;
}): AttendanceStatus {
  const now = params.referenceNow || new Date();
  const grace = params.gracePeriodMinutes ?? 15;

  // 1. Pending correction takes precedence for review
  if (params.hasPendingCorrection) {
    return "pending_correction";
  }

  // 2. Approved leave
  if (params.isApprovedLeave) {
    return "on_approved_leave";
  }

  // 3. Rest day (if no clock in occurred)
  if (params.isRestDay && !params.timeIn) {
    return "rest_day";
  }

  // 4. Currently On Break (active break started and not ended)
  if (params.timeIn && params.breakStart && !params.breakEnd && !params.timeOut) {
    return "on_break";
  }

  // 5. Timed Out (completed shift)
  if (params.timeIn && params.timeOut) {
    return "timed_out";
  }

  // 6. Timed in but no time out:
  if (params.timeIn && !params.timeOut) {
    const endStr = params.scheduledEnd.length === 5 ? `${params.scheduledEnd}:00` : params.scheduledEnd;
    const workDateObj = new Date(`${params.workDate}T${endStr}+08:00`);
    const overnight = isOvernightShift(params.scheduledStart, params.scheduledEnd);
    if (overnight) {
      workDateObj.setDate(workDateObj.getDate() + 1);
    }

    // If shift ended over 4 hours ago and employee never clocked out, flag incomplete attendance
    if (now.getTime() > workDateObj.getTime() + 4 * 60 * 60 * 1000) {
      return "incomplete";
    }

    const lateMins = calculateLateMinutes(params.timeIn, params.scheduledStart, grace);
    return lateMins > 0 ? "late" : "present";
  }

  // 7. Not Yet Timed In or Absent
  if (!params.timeIn) {
    const endStr = params.scheduledEnd.length === 5 ? `${params.scheduledEnd}:00` : params.scheduledEnd;
    const workDateObj = new Date(`${params.workDate}T${endStr}+08:00`);
    const overnight = isOvernightShift(params.scheduledStart, params.scheduledEnd);
    if (overnight) {
      workDateObj.setDate(workDateObj.getDate() + 1);
    }

    // If shift scheduled end has elapsed by at least 2 hours, flag absent
    if (now.getTime() > workDateObj.getTime() + 2 * 60 * 60 * 1000) {
      return "absent";
    }

    return "not_timed_in";
  }

  return "incomplete";
}

/**
 * Validates self-service attendance action transitions.
 */
export function validateAttendanceAction(
  action: "time_in" | "start_break" | "end_break" | "time_out",
  currentState: {
    timeIn: string | null;
    timeOut: string | null;
    breakStart: string | null;
    breakEnd: string | null;
  }
): { valid: boolean; error?: string } {
  switch (action) {
    case "time_in":
      if (currentState.timeIn && !currentState.timeOut) {
        return { valid: false, error: "You are already timed in for this shift." };
      }
      if (currentState.timeIn && currentState.timeOut) {
        return { valid: false, error: "You have already completed your attendance for this shift." };
      }
      return { valid: true };

    case "start_break":
      if (!currentState.timeIn) {
        return { valid: false, error: "You must time in before starting a break." };
      }
      if (currentState.timeOut) {
        return { valid: false, error: "Cannot start a break after timing out." };
      }
      if (currentState.breakStart && !currentState.breakEnd) {
        return { valid: false, error: "You are already currently on a break." };
      }
      return { valid: true };

    case "end_break":
      if (!currentState.timeIn) {
        return { valid: false, error: "You are not timed in." };
      }
      if (!currentState.breakStart) {
        return { valid: false, error: "No break has been started." };
      }
      if (currentState.breakEnd) {
        return { valid: false, error: "Your break has already been ended." };
      }
      return { valid: true };

    case "time_out":
      if (!currentState.timeIn) {
        return { valid: false, error: "You cannot time out before timing in." };
      }
      if (currentState.timeOut) {
        return { valid: false, error: "You have already timed out for this shift." };
      }
      if (currentState.breakStart && !currentState.breakEnd) {
        return { valid: false, error: "Please end your active break before timing out." };
      }
      return { valid: true };

    default:
      return { valid: false, error: "Invalid attendance action." };
  }
}

/**
 * Validates separation of duties: An employee cannot approve their own correction.
 */
export function validateCorrectionApproval(
  submittedByUserId: string,
  reviewerUserId: string
): { valid: boolean; error?: string } {
  if (submittedByUserId.trim() === reviewerUserId.trim()) {
    return {
      valid: false,
      error: "Separation of duties violation: An employee cannot review or approve their own attendance correction.",
    };
  }
  return { valid: true };
}

/**
 * Computes dashboard KPIs across a collection of daily attendance records.
 */
export function computeAttendanceKPIs(
  records: DailyAttendanceRecord[],
  totalEmployees: number
): AttendanceDashboardKPIs {
  let presentToday = 0;
  let notYetTimedIn = 0;
  let lateArrivals = 0;
  let currentlyOnBreak = 0;
  let currentlyClockedIn = 0;
  let timedOut = 0;
  let absent = 0;
  let pendingCorrections = 0;

  for (const r of records) {
    if (r.correction_status === "pending" || r.pending_correction_id) {
      pendingCorrections++;
    }

    if (r.attendance_status === "on_break") {
      currentlyOnBreak++;
      currentlyClockedIn++;
      presentToday++;
    } else if (r.attendance_status === "present") {
      presentToday++;
      currentlyClockedIn++;
    } else if (r.attendance_status === "late") {
      lateArrivals++;
      presentToday++;
      currentlyClockedIn++;
    } else if (r.attendance_status === "timed_out") {
      timedOut++;
      presentToday++;
    } else if (r.attendance_status === "absent") {
      absent++;
    } else if (r.attendance_status === "not_timed_in") {
      notYetTimedIn++;
    }
  }

  // If there are scheduled employees who don't have records yet today
  if (records.length < totalEmployees) {
    const unrecorded = totalEmployees - records.length;
    notYetTimedIn += unrecorded;
  }

  return {
    presentToday,
    notYetTimedIn,
    lateArrivals,
    currentlyOnBreak,
    currentlyClockedIn,
    timedOut,
    absent,
    pendingCorrections,
  };
}

/**
 * Detects discrepancies between Cashier Drawer Shifts and Attendance records.
 * Flags cases where an employee has an open cashier drawer after timing out or without timing in.
 */
export function detectCashierDiscrepancies(
  cashierShifts: Array<{
    id: string;
    cashier_id: string;
    branch_name: string;
    opened_at: string;
    closed_at?: string | null;
    status: string;
    staff?: { full_name: string };
  }>,
  attendanceRecords: DailyAttendanceRecord[]
): CashierAttendanceDiscrepancy[] {
  const discrepancies: CashierAttendanceDiscrepancy[] = [];
  const attendanceMap = new Map<string, DailyAttendanceRecord>();

  for (const att of attendanceRecords) {
    attendanceMap.set(att.employee_id, att);
  }

  for (const cs of cashierShifts) {
    const att = attendanceMap.get(cs.cashier_id);
    const employeeName = cs.staff?.full_name || "Assigned Cashier";

    // 1. Open cashier shift without attendance time-in
    if (cs.status === "open" && (!att || !att.time_in)) {
      discrepancies.push({
        employee_id: cs.cashier_id,
        employee_name: employeeName,
        branch_name: cs.branch_name,
        cashier_shift_id: cs.id,
        opened_at: cs.opened_at,
        closed_at: cs.closed_at,
        attendance_status: att ? att.attendance_status : "not_timed_in",
        issue_description: "Active cashier drawer shift opened without a recorded staff time-in.",
      });
    }

    // 2. Open cashier shift after attendance time-out
    if (cs.status === "open" && att && att.time_out) {
      discrepancies.push({
        employee_id: cs.cashier_id,
        employee_name: employeeName,
        branch_name: cs.branch_name,
        cashier_shift_id: cs.id,
        opened_at: cs.opened_at,
        closed_at: cs.closed_at,
        attendance_status: "timed_out",
        issue_description: "Active cashier drawer session remains open after employee recorded a shift time-out.",
      });
    }
  }

  return discrepancies;
}

/**
 * Compiles validated attendance data into a clean Payroll summary for a period.
 */
export function compilePayrollAttendanceSummary(
  employeeId: string,
  employeeName: string,
  position: string,
  branchName: string,
  periodStart: string,
  periodEnd: string,
  records: DailyAttendanceRecord[]
): PayrollAttendanceSummary {
  let daysScheduled = 0;
  let daysWorked = 0;
  let totalHoursWorked = 0;
  let totalLateMinutes = 0;
  let totalUndertimeMinutes = 0;
  let approvedOvertimeHours = 0;
  let approvedLeaveDays = 0;
  let restDaysCount = 0;
  let absencesCount = 0;
  let incompleteRecordsCount = 0;

  for (const r of records) {
    if (r.employee_id !== employeeId) continue;

    daysScheduled++;

    if (r.attendance_status === "present" || r.attendance_status === "late" || r.attendance_status === "timed_out") {
      daysWorked++;
      totalHoursWorked += Number(r.hours_worked || 0);
      totalLateMinutes += Number(r.late_minutes || 0);
      totalUndertimeMinutes += Number(r.undertime_minutes || 0);
      approvedOvertimeHours += Number(r.approved_overtime_minutes || 0) / 60;
    } else if (r.attendance_status === "on_approved_leave") {
      approvedLeaveDays++;
    } else if (r.attendance_status === "rest_day") {
      restDaysCount++;
    } else if (r.attendance_status === "absent") {
      absencesCount++;
    } else if (r.attendance_status === "incomplete" || (!r.time_out && r.time_in)) {
      incompleteRecordsCount++;
      // Do not silently omit hours if partially worked
      totalHoursWorked += Number(r.hours_worked || 0);
    }
  }

  return {
    employee_id: employeeId,
    employee_name: employeeName,
    position,
    branch_name: branchName,
    period_start: periodStart,
    period_end: periodEnd,
    days_scheduled: daysScheduled,
    days_worked: daysWorked,
    total_hours_worked: Math.round((totalHoursWorked + Number.EPSILON) * 100) / 100,
    total_late_minutes: totalLateMinutes,
    total_undertime_minutes: totalUndertimeMinutes,
    approved_overtime_hours: Math.round((approvedOvertimeHours + Number.EPSILON) * 100) / 100,
    approved_leave_days: approvedLeaveDays,
    rest_days_count: restDaysCount,
    absences_count: absencesCount,
    incomplete_records_count: incompleteRecordsCount,
    needs_review: incompleteRecordsCount > 0 || absencesCount > 0,
  };
}
