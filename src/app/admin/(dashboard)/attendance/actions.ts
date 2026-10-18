"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth";
import { hasServerPermission } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import {
  DailyAttendanceRecord,
  AttendanceStatus,
  BreakType,
  EmployeeSchedule,
  CorrectionType,
  StaffLoginSessionRecord,
  AttendanceBreak,
} from "./types";
import {
  calculateLateMinutes,
  calculateUndertimeMinutes,
  calculateWorkingHours,
  determineAttendanceStatus,
  validateAttendanceAction,
  validateCorrectionApproval,
  computeAttendanceKPIs,
  detectCashierDiscrepancies,
  compilePayrollAttendanceSummary,
} from "@/lib/attendance/attendance-engine";

/**
 * Record Employee Self-Service Time In
 */
export async function recordTimeIn(notes?: string) {
  const staff = await requireStaff();
  const supabase = createAdminClient();
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  // 1. Fetch employee's active schedule
  const { data: schedule } = await supabase
    .from("employee_schedules")
    .select("*")
    .eq("employee_id", staff.id)
    .eq("is_active", true)
    .lte("effective_date", todayStr)
    .order("effective_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const scheduledStart = schedule?.scheduled_start || "09:00:00";
  const scheduledEnd = schedule?.scheduled_end || "18:00:00";
  const graceMinutes = schedule?.grace_period_minutes ?? 15;
  const shiftName = schedule?.shift_name || "Standard Clinic Shift";

  // 2. Check existing record today
  const { data: existingRecord } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("employee_id", staff.id)
    .eq("work_date", todayStr)
    .maybeSingle();

  // Validate state
  const validation = validateAttendanceAction("time_in", {
    timeIn: existingRecord?.time_in || null,
    timeOut: existingRecord?.time_out || null,
    breakStart: existingRecord?.break_start || null,
    breakEnd: existingRecord?.break_end || null,
  });

  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const timeInIso = now.toISOString();
  const lateMinutes = calculateLateMinutes(timeInIso, scheduledStart, graceMinutes);
  const status: AttendanceStatus = lateMinutes > 0 ? "late" : "present";

  let recordId: string;

  if (existingRecord) {
    const { data: updated, error } = await supabase
      .from("attendance_records")
      .update({
        time_in: timeInIso,
        late_minutes: lateMinutes,
        status: status === "late" ? "present" : status, // keep backward compat with column check
        attendance_status: status,
        scheduled_shift_id: schedule?.id || null,
        shift_name: shiftName,
        scheduled_start_time: scheduledStart,
        scheduled_end_time: scheduledEnd,
        notes: notes || existingRecord.notes,
        updated_at: timeInIso,
      })
      .eq("id", existingRecord.id)
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };
    recordId = updated.id;
  } else {
    const { data: created, error } = await supabase
      .from("attendance_records")
      .insert({
        employee_id: staff.id,
        branch_id: staff.branchId || null,
        work_date: todayStr,
        time_in: timeInIso,
        late_minutes: lateMinutes,
        status: status === "late" ? "present" : status,
        attendance_status: status,
        scheduled_shift_id: schedule?.id || null,
        shift_name: shiftName,
        scheduled_start_time: scheduledStart,
        scheduled_end_time: scheduledEnd,
        notes: notes || null,
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };
    recordId = created.id;
  }

  // Log Audit Event
  await supabase.from("attendance_audit_events").insert({
    attendance_record_id: recordId,
    employee_id: staff.id,
    branch_id: staff.branchId || null,
    actor_id: staff.id,
    event_type: "ATTENDANCE_TIME_IN",
    new_state: { time_in: timeInIso, late_minutes: lateMinutes, status },
    notes: notes || `Clocked in at ${now.toLocaleTimeString("en-PH")}`,
  });

  revalidatePath("/admin/attendance");
  revalidatePath("/admin/attendance/clock");
  return {
    success: true,
    message: lateMinutes > 0
      ? `Timed in successfully (${lateMinutes} mins late from scheduled ${scheduledStart.slice(0, 5)})`
      : "Timed in successfully on time!",
    status,
    timeIn: timeInIso,
  };
}

/**
 * Record Employee Start Break
 */
export async function recordStartBreak(breakType: BreakType = "meal", notes?: string) {
  const staff = await requireStaff();
  const supabase = createAdminClient();
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const { data: record } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("employee_id", staff.id)
    .eq("work_date", todayStr)
    .maybeSingle();

  const validation = validateAttendanceAction("start_break", {
    timeIn: record?.time_in || null,
    timeOut: record?.time_out || null,
    breakStart: record?.break_start || null,
    breakEnd: record?.break_end || null,
  });

  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const breakStartIso = now.toISOString();

  // 1. Insert into attendance_breaks
  await supabase.from("attendance_breaks").insert({
    attendance_record_id: record.id,
    break_start: breakStartIso,
    break_type: breakType,
    notes: notes || null,
  });

  // 2. Update attendance_records
  await supabase
    .from("attendance_records")
    .update({
      break_start: breakStartIso,
      break_end: null,
      attendance_status: "on_break",
      updated_at: breakStartIso,
    })
    .eq("id", record.id);

  // 3. Log Audit
  await supabase.from("attendance_audit_events").insert({
    attendance_record_id: record.id,
    employee_id: staff.id,
    branch_id: staff.branchId || null,
    actor_id: staff.id,
    event_type: "ATTENDANCE_BREAK_STARTED",
    new_state: { break_start: breakStartIso, break_type: breakType },
    notes: `Started ${breakType} break at ${now.toLocaleTimeString("en-PH")}`,
  });

  revalidatePath("/admin/attendance");
  revalidatePath("/admin/attendance/clock");
  return { success: true, message: `Started ${breakType} break.` };
}

/**
 * Record Employee End Break
 */
export async function recordEndBreak(notes?: string) {
  const staff = await requireStaff();
  const supabase = createAdminClient();
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const { data: record } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("employee_id", staff.id)
    .eq("work_date", todayStr)
    .maybeSingle();

  const validation = validateAttendanceAction("end_break", {
    timeIn: record?.time_in || null,
    timeOut: record?.time_out || null,
    breakStart: record?.break_start || null,
    breakEnd: record?.break_end || null,
  });

  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const breakEndIso = now.toISOString();

  // Find the open break
  const { data: openBreak } = await supabase
    .from("attendance_breaks")
    .select("*")
    .eq("attendance_record_id", record.id)
    .is("break_end", null)
    .order("break_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  let sessionBreakMinutes = 0;
  if (openBreak) {
    const startMs = new Date(openBreak.break_start).getTime();
    sessionBreakMinutes = Math.round((now.getTime() - startMs) / (1000 * 60));

    await supabase
      .from("attendance_breaks")
      .update({
        break_end: breakEndIso,
        duration_minutes: sessionBreakMinutes,
        notes: notes || openBreak.notes,
      })
      .eq("id", openBreak.id);
  }

  const totalBreakMinutes = Number(record.break_minutes || 0) + sessionBreakMinutes;
  const status: AttendanceStatus = record.late_minutes > 0 ? "late" : "present";

  await supabase
    .from("attendance_records")
    .update({
      break_end: breakEndIso,
      break_minutes: totalBreakMinutes,
      attendance_status: status,
      updated_at: breakEndIso,
    })
    .eq("id", record.id);

  await supabase.from("attendance_audit_events").insert({
    attendance_record_id: record.id,
    employee_id: staff.id,
    branch_id: staff.branchId || null,
    actor_id: staff.id,
    event_type: "ATTENDANCE_BREAK_ENDED",
    new_state: { break_end: breakEndIso, duration_minutes: sessionBreakMinutes, total_break_minutes: totalBreakMinutes },
    notes: `Ended break (${sessionBreakMinutes} mins) at ${now.toLocaleTimeString("en-PH")}`,
  });

  revalidatePath("/admin/attendance");
  revalidatePath("/admin/attendance/clock");
  return { success: true, message: `Ended break (${sessionBreakMinutes} mins). Back to work!` };
}

/**
 * Record Employee Time Out
 */
export async function recordTimeOut(notes?: string) {
  const staff = await requireStaff();
  const supabase = createAdminClient();
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const { data: record } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("employee_id", staff.id)
    .eq("work_date", todayStr)
    .maybeSingle();

  const validation = validateAttendanceAction("time_out", {
    timeIn: record?.time_in || null,
    timeOut: record?.time_out || null,
    breakStart: record?.break_start || null,
    breakEnd: record?.break_end || null,
  });

  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const timeOutIso = now.toISOString();
  const breakMins = Number(record.break_minutes || 0);
  const hoursWorked = calculateWorkingHours(record.time_in, timeOutIso, breakMins);
  const scheduledStart = record.scheduled_start_time || "09:00:00";
  const scheduledEnd = record.scheduled_end_time || "18:00:00";
  const undertimeMinutes = calculateUndertimeMinutes(timeOutIso, scheduledEnd, scheduledStart);

  await supabase
    .from("attendance_records")
    .update({
      time_out: timeOutIso,
      hours_worked: hoursWorked,
      undertime_minutes: undertimeMinutes,
      attendance_status: "timed_out",
      notes: notes ? (record.notes ? `${record.notes} | ${notes}` : notes) : record.notes,
      updated_at: timeOutIso,
    })
    .eq("id", record.id);

  await supabase.from("attendance_audit_events").insert({
    attendance_record_id: record.id,
    employee_id: staff.id,
    branch_id: staff.branchId || null,
    actor_id: staff.id,
    event_type: "ATTENDANCE_TIME_OUT",
    new_state: { time_out: timeOutIso, hours_worked: hoursWorked, undertime_minutes: undertimeMinutes },
    notes: `Clocked out at ${now.toLocaleTimeString("en-PH")}. Total hours: ${hoursWorked.toFixed(2)}h`,
  });

  revalidatePath("/admin/attendance");
  revalidatePath("/admin/attendance/clock");
  return {
    success: true,
    message: `Successfully timed out! Recorded ${hoursWorked.toFixed(2)} working hours today.`,
    hoursWorked,
  };
}

/**
 * Submit Attendance Correction Request
 */
export async function submitAttendanceCorrection(params: {
  attendanceRecordId?: string;
  attendanceDate: string;
  originalTimeIn?: string;
  originalTimeOut?: string;
  requestedTimeIn?: string;
  requestedTimeOut?: string;
  correctionType: CorrectionType;
  reason: string;
  attachmentUrl?: string;
}) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  if (!params.reason || params.reason.trim().length < 5) {
    return { success: false, error: "Please provide a detailed reason for the correction request." };
  }

  // 1. Create correction request
  const { data: correction, error } = await supabase
    .from("attendance_corrections")
    .insert({
      attendance_record_id: params.attendanceRecordId || null,
      employee_id: staff.id,
      branch_id: staff.branchId || null,
      attendance_date: params.attendanceDate,
      original_time_in: params.originalTimeIn || null,
      original_time_out: params.originalTimeOut || null,
      requested_time_in: params.requestedTimeIn || null,
      requested_time_out: params.requestedTimeOut || null,
      correction_type: params.correctionType,
      reason: params.reason.trim(),
      attachment_url: params.attachmentUrl || null,
      status: "pending",
      submitted_by: staff.id,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  // 2. Mark attendance record as pending correction if record exists
  if (params.attendanceRecordId) {
    await supabase
      .from("attendance_records")
      .update({
        correction_status: "pending",
        attendance_status: "pending_correction",
      })
      .eq("id", params.attendanceRecordId);
  }

  // 3. Log Audit Event
  await supabase.from("attendance_audit_events").insert({
    attendance_record_id: params.attendanceRecordId || null,
    employee_id: staff.id,
    branch_id: staff.branchId || null,
    actor_id: staff.id,
    event_type: "ATTENDANCE_CORRECTION_SUBMITTED",
    new_state: { correction_id: correction.id, ...params },
    notes: `Submitted attendance correction: ${params.correctionType} - ${params.reason}`,
  });

  // 4. Notify branch managers / admins
  const { data: managers } = await supabase
    .from("staff")
    .select("id, role_id, roles(name)")
    .eq("is_active", true);

  const managerRecipients = (managers || []).filter((m: any) => {
    const rName = Array.isArray(m.roles) ? m.roles[0]?.name : m.roles?.name;
    return rName === "super_admin" || rName === "admin" || rName === "manager";
  });

  for (const m of managerRecipients) {
    await supabase.from("staff_notifications").insert({
      recipient_id: m.id,
      branch_id: staff.branchId || null,
      title: "Attendance Correction Pending",
      message: `${staff.fullName} submitted an attendance correction request for ${params.attendanceDate}.`,
      type: "attendance_correction",
      link: "/admin/attendance",
      is_read: false,
    });
  }

  revalidatePath("/admin/attendance");
  revalidatePath("/admin/attendance/clock");
  return { success: true, message: "Attendance correction request submitted for review." };
}

/**
 * Review Attendance Correction Request (Approve / Reject)
 * Enforces separation of duties: Staff cannot approve their own correction.
 */
export async function reviewAttendanceCorrection(params: {
  correctionId: string;
  decision: "approved" | "rejected";
  reviewNotes?: string;
}) {
  const staff = await requireStaff();
  const canApprove = await hasServerPermission("attendance.approve_corrections");

  if (!canApprove && staff.role !== "super_admin" && staff.role !== "admin" && staff.role !== "manager") {
    return { success: false, error: "Unauthorized: You do not have permission to review attendance corrections." };
  }

  const supabase = createAdminClient();

  const { data: correction } = await supabase
    .from("attendance_corrections")
    .select("*")
    .eq("id", params.correctionId)
    .single();

  if (!correction) return { success: false, error: "Correction request not found." };
  if (correction.status !== "pending") {
    return { success: false, error: `This correction has already been ${correction.status}.` };
  }

  // Separation of duties enforcement
  const dutyValidation = validateCorrectionApproval(correction.submitted_by, staff.id);
  if (!dutyValidation.valid) {
    return { success: false, error: dutyValidation.error };
  }

  const now = new Date().toISOString();

  if (params.decision === "approved") {
    // 1. Update correction status
    await supabase
      .from("attendance_corrections")
      .update({
        status: "approved",
        reviewed_by: staff.id,
        reviewed_at: now,
        review_notes: params.reviewNotes || "Approved by supervisor.",
        updated_at: now,
      })
      .eq("id", correction.id);

    // 2. Update attendance record with requested times
    if (correction.attendance_record_id) {
      const { data: record } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("id", correction.attendance_record_id)
        .single();

      if (record) {
        const timeIn = correction.requested_time_in || record.time_in;
        const timeOut = correction.requested_time_out || record.time_out;
        const breakMins = Number(record.break_minutes || 0);
        const hoursWorked = calculateWorkingHours(timeIn, timeOut, breakMins);
        const scheduledStart = record.scheduled_start_time || "09:00:00";
        const scheduledEnd = record.scheduled_end_time || "18:00:00";
        const lateMins = calculateLateMinutes(timeIn, scheduledStart);
        const undertimeMins = calculateUndertimeMinutes(timeOut, scheduledEnd, scheduledStart);
        const status = determineAttendanceStatus({
          workDate: record.work_date,
          timeIn,
          timeOut,
          breakStart: record.break_start,
          breakEnd: record.break_end,
          scheduledStart,
          scheduledEnd,
          isApprovedLeave: record.is_approved_leave,
        });

        await supabase
          .from("attendance_records")
          .update({
            time_in: timeIn,
            time_out: timeOut,
            hours_worked: hoursWorked,
            late_minutes: lateMins,
            undertime_minutes: undertimeMins,
            correction_status: "approved",
            attendance_status: status,
            notes: record.notes ? `${record.notes} | Correction Approved: ${correction.reason}` : `Correction Approved: ${correction.reason}`,
            updated_at: now,
          })
          .eq("id", record.id);
      }
    }

    // 3. Log Audit Event
    await supabase.from("attendance_audit_events").insert({
      attendance_record_id: correction.attendance_record_id,
      employee_id: correction.employee_id,
      branch_id: correction.branch_id,
      actor_id: staff.id,
      event_type: "ATTENDANCE_CORRECTION_APPROVED",
      notes: `Approved correction #${correction.id.slice(0, 8)}. Notes: ${params.reviewNotes || "None"}`,
    });

    // 4. Notify Employee
    await supabase.from("staff_notifications").insert({
      recipient_id: correction.employee_id,
      branch_id: correction.branch_id,
      title: "Attendance Correction Approved",
      message: `Your attendance correction for ${correction.attendance_date} has been approved.`,
      type: "attendance_correction_approved",
      link: "/admin/attendance/clock",
      is_read: false,
    });
  } else {
    // Rejected
    await supabase
      .from("attendance_corrections")
      .update({
        status: "rejected",
        reviewed_by: staff.id,
        reviewed_at: now,
        review_notes: params.reviewNotes || "Rejected by supervisor.",
        updated_at: now,
      })
      .eq("id", correction.id);

    if (correction.attendance_record_id) {
      await supabase
        .from("attendance_records")
        .update({
          correction_status: "rejected",
        })
        .eq("id", correction.attendance_record_id);
    }

    await supabase.from("attendance_audit_events").insert({
      attendance_record_id: correction.attendance_record_id,
      employee_id: correction.employee_id,
      branch_id: correction.branch_id,
      actor_id: staff.id,
      event_type: "ATTENDANCE_CORRECTION_REJECTED",
      notes: `Rejected correction #${correction.id.slice(0, 8)}. Reason: ${params.reviewNotes || "Unspecified"}`,
    });

    await supabase.from("staff_notifications").insert({
      recipient_id: correction.employee_id,
      branch_id: correction.branch_id,
      title: "Attendance Correction Rejected",
      message: `Your correction request for ${correction.attendance_date} was rejected. Note: ${params.reviewNotes || "None"}`,
      type: "attendance_correction_rejected",
      link: "/admin/attendance/clock",
      is_read: false,
    });
  }

  revalidatePath("/admin/attendance");
  return { success: true, message: `Correction request ${params.decision} successfully.` };
}

/**
 * Fetch Staff Attendance Dashboard Data
 */
export async function getStaffAttendanceDashboard(params: {
  date?: string;
  branchId?: string;
  employeeId?: string;
  statusFilter?: string;
}) {
  const staff = await requireStaff();
  const supabase = createAdminClient();
  const dateStr = params.date || new Date().toISOString().split("T")[0];

  // Branch Isolation
  const isSuperAdmin = staff.role === "super_admin";
  let branchQuery = params.branchId;
  if (!isSuperAdmin && staff.branchId) {
    branchQuery = staff.branchId;
  }

  // 1. Fetch Staff List
  let staffQueryBuilder = supabase
    .from("staff")
    .select("id, full_name, branch_id, is_active, role_id, branches(id, name), roles(name)")
    .eq("is_active", true);

  if (branchQuery && branchQuery !== "all") {
    staffQueryBuilder = staffQueryBuilder.eq("branch_id", branchQuery);
  }

  const { data: staffList } = await staffQueryBuilder;

  // 2. Fetch Attendance Records for date
  let recordsQueryBuilder = supabase
    .from("attendance_records")
    .select(`
      *,
      staff:staff(id, full_name, branch_id, roles(name)),
      branch:branches(id, name),
      breaks:attendance_breaks(*)
    `)
    .eq("work_date", dateStr);

  if (branchQuery && branchQuery !== "all") {
    recordsQueryBuilder = recordsQueryBuilder.eq("branch_id", branchQuery);
  }
  if (params.employeeId && params.employeeId !== "all") {
    recordsQueryBuilder = recordsQueryBuilder.eq("employee_id", params.employeeId);
  }

  const { data: attendanceRaw } = await recordsQueryBuilder;

  // 3. Fetch active cashier shifts today to detect discrepancies
  const { data: cashierShiftsRaw } = await supabase
    .from("cashier_shifts")
    .select(`
      id,
      branch_id,
      cashier_id,
      opened_at,
      closed_at,
      status,
      staff:staff(full_name),
      branches:branches(name)
    `)
    .eq("status", "open");

  // Map enriched attendance records
  const enrichedRecords: DailyAttendanceRecord[] = (attendanceRaw || []).map((r: any) => {
    const bName = r.branch?.name || "Main Clinic";
    const empName = r.staff?.full_name || "Clinic Staff";
    const pos = r.staff?.roles?.name || "Staff";

    const status = determineAttendanceStatus({
      workDate: r.work_date,
      timeIn: r.time_in,
      timeOut: r.time_out,
      breakStart: r.break_start,
      breakEnd: r.break_end,
      scheduledStart: r.scheduled_start_time || "09:00:00",
      scheduledEnd: r.scheduled_end_time || "18:00:00",
      isApprovedLeave: r.is_approved_leave,
      hasPendingCorrection: r.correction_status === "pending",
    });

    return {
      id: r.id,
      employee_id: r.employee_id,
      employee_name: empName,
      employee_code: r.employee_id.slice(0, 8),
      branch_id: r.branch_id,
      branch_name: bName,
      position: pos,
      work_date: r.work_date,
      scheduled_shift_id: r.scheduled_shift_id,
      shift_name: r.shift_name || "Standard Clinic Shift",
      scheduled_start_time: r.scheduled_start_time || "09:00:00",
      scheduled_end_time: r.scheduled_end_time || "18:00:00",
      time_in: r.time_in,
      time_out: r.time_out,
      break_start: r.break_start,
      break_end: r.break_end,
      break_minutes: r.break_minutes || 0,
      breaks: r.breaks || [],
      hours_worked: Number(r.hours_worked || 0),
      late_minutes: Number(r.late_minutes || 0),
      undertime_minutes: Number(r.undertime_minutes || 0),
      approved_overtime_minutes: Number(r.approved_overtime_minutes || 0),
      attendance_status: status,
      correction_status: r.correction_status || "none",
      is_approved_leave: r.is_approved_leave || false,
      leave_type: r.leave_type || null,
      notes: r.notes || null,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  });

  // Calculate KPIs
  const totalActiveStaff = (staffList || []).length;
  const kpis = computeAttendanceKPIs(enrichedRecords, totalActiveStaff);

  // Detect Cashier Discrepancies
  const mappedCashierShifts = (cashierShiftsRaw || []).map((cs: any) => ({
    id: cs.id,
    cashier_id: cs.cashier_id,
    branch_name: cs.branches?.name || "Main Clinic",
    opened_at: cs.opened_at,
    closed_at: cs.closed_at,
    status: cs.status,
    staff: cs.staff,
  }));
  const discrepancies = detectCashierDiscrepancies(mappedCashierShifts, enrichedRecords);

  // Fetch Branches list
  const { data: branches } = await supabase.from("branches").select("id, name").order("name");

  return {
    date: dateStr,
    branchId: branchQuery || "all",
    records: enrichedRecords,
    kpis,
    discrepancies,
    branches: branches || [],
    staffList: staffList || [],
    isSuperAdmin,
  };
}

/**
 * Fetch Employee Self-Service Attendance Profile
 */
export async function getEmployeeSelfAttendance(dateStr?: string) {
  const staff = await requireStaff();
  const supabase = createAdminClient();
  const queryDate = dateStr || new Date().toISOString().split("T")[0];

  // 1. Fetch active schedule
  const { data: schedule } = await supabase
    .from("employee_schedules")
    .select("*")
    .eq("employee_id", staff.id)
    .eq("is_active", true)
    .lte("effective_date", queryDate)
    .order("effective_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 2. Fetch today's record
  const { data: recordRaw } = await supabase
    .from("attendance_records")
    .select(`
      *,
      breaks:attendance_breaks(*)
    `)
    .eq("employee_id", staff.id)
    .eq("work_date", queryDate)
    .maybeSingle();

  // 3. Fetch branch name
  let branchName = "Main Clinic";
  if (staff.branchId) {
    const { data: b } = await supabase.from("branches").select("name").eq("id", staff.branchId).single();
    if (b) branchName = b.name;
  }

  // 4. Determine authoritative status
  const scheduledStart = schedule?.scheduled_start || recordRaw?.scheduled_start_time || "09:00:00";
  const scheduledEnd = schedule?.scheduled_end || recordRaw?.scheduled_end_time || "18:00:00";

  const status = determineAttendanceStatus({
    workDate: queryDate,
    timeIn: recordRaw?.time_in || null,
    timeOut: recordRaw?.time_out || null,
    breakStart: recordRaw?.break_start || null,
    breakEnd: recordRaw?.break_end || null,
    scheduledStart,
    scheduledEnd,
    isApprovedLeave: recordRaw?.is_approved_leave,
    hasPendingCorrection: recordRaw?.correction_status === "pending",
  });

  // 5. Fetch past 7 days records for recent history
  const { data: recentRecords } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("employee_id", staff.id)
    .order("work_date", { ascending: false })
    .limit(7);

  return {
    employee: {
      id: staff.id,
      fullName: staff.fullName,
      role: staff.role,
      branchId: staff.branchId,
      branchName,
    },
    today: queryDate,
    schedule: schedule || null,
    currentRecord: recordRaw
      ? {
          ...recordRaw,
          attendance_status: status,
          breaks: recordRaw.breaks || [],
        }
      : null,
    status,
    recentRecords: recentRecords || [],
  };
}

/**
 * Configure / Update Employee Schedule
 */
export async function createOrUpdateEmployeeSchedule(data: {
  id?: string;
  employee_id: string;
  branch_id?: string | null;
  shift_name: string;
  scheduled_start: string;
  scheduled_end: string;
  break_minutes?: number;
  grace_period_minutes?: number;
  rest_days?: number[];
  effective_date?: string;
  notes?: string;
}) {
  const staff = await requireStaff();
  const canManage = await hasServerPermission("attendance.manage_schedules");
  if (!canManage && staff.role !== "super_admin" && staff.role !== "admin" && staff.role !== "manager") {
    return { success: false, error: "Unauthorized to configure employee schedules." };
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  if (data.id) {
    const { error } = await supabase
      .from("employee_schedules")
      .update({
        shift_name: data.shift_name,
        scheduled_start: data.scheduled_start,
        scheduled_end: data.scheduled_end,
        break_minutes: data.break_minutes ?? 60,
        grace_period_minutes: data.grace_period_minutes ?? 15,
        rest_days: data.rest_days ?? [0],
        effective_date: data.effective_date || now.split("T")[0],
        notes: data.notes || null,
        updated_at: now,
      })
      .eq("id", data.id);

    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await supabase.from("employee_schedules").insert({
      employee_id: data.employee_id,
      branch_id: data.branch_id || null,
      shift_name: data.shift_name,
      scheduled_start: data.scheduled_start,
      scheduled_end: data.scheduled_end,
      break_minutes: data.break_minutes ?? 60,
      grace_period_minutes: data.grace_period_minutes ?? 15,
      rest_days: data.rest_days ?? [0],
      effective_date: data.effective_date || now.split("T")[0],
      notes: data.notes || null,
    });

    if (error) return { success: false, error: error.message };
  }

  revalidatePath("/admin/attendance");
  return { success: true, message: "Employee schedule updated successfully." };
}

/**
 * Fetch Staff System Login & Authentication Activity
 */
export async function getStaffLoginActivity(params: {
  fromDate?: string;
  toDate?: string;
  branchId?: string;
  staffId?: string;
  statusFilter?: string;
  eventTypeFilter?: string;
  limit?: number;
}) {
  const staff = await requireStaff();
  const supabase = createAdminClient();
  const limit = params.limit || 100;

  // Fetch sessions
  let query = supabase
    .from("user_sessions")
    .select(`
      *,
      staff:staff(id, full_name, branch_id),
      branches:branches(id, name)
    `)
    .order("login_at", { ascending: false })
    .limit(limit);

  if (params.fromDate) {
    query = query.gte("login_at", `${params.fromDate}T00:00:00Z`);
  }
  if (params.toDate) {
    query = query.lte("login_at", `${params.toDate}T23:59:59Z`);
  }
  if (params.staffId && params.staffId !== "all") {
    query = query.eq("user_id", params.staffId);
  }
  if (params.branchId && params.branchId !== "all") {
    query = query.eq("branch_id", params.branchId);
  }
  if (params.statusFilter && params.statusFilter !== "All") {
    query = query.eq("status", params.statusFilter);
  }

  const { data: rawSessions } = await query;

  // Map into typed session records
  const records: StaffLoginSessionRecord[] = (rawSessions || []).map((s: any) => ({
    id: s.id,
    user_id: s.user_id,
    employee_name: s.staff?.full_name || "System User",
    employee_code: s.user_id ? s.user_id.slice(0, 8) : undefined,
    branch_id: s.branch_id,
    branch_name: s.branches?.name || "Global / Unassigned",
    login_at: s.login_at,
    logout_at: s.logout_at,
    last_activity_at: s.last_activity_at,
    duration_seconds: s.duration_seconds,
    status: s.status,
    logout_reason: s.logout_reason,
    auth_result: "SUCCESS",
    ip_address: s.ip_address,
    device_type: s.device_type,
    device_name: s.device_name,
    browser: s.browser,
    operating_system: s.operating_system,
  }));

  // Fetch branches and staff for dropdown filters
  const [{ data: branches }, { data: staffList }] = await Promise.all([
    supabase.from("branches").select("id, name").order("name"),
    supabase.from("staff").select("id, full_name").eq("is_active", true).order("full_name"),
  ]);

  return {
    sessions: records,
    branches: branches || [],
    staffList: staffList || [],
  };
}

/**
 * Compile approved attendance summaries for payroll cutoff
 */
export async function getPayrollAttendanceSummaries(params: {
  periodStart: string;
  periodEnd: string;
  branchId?: string;
}) {
  await requireStaff();
  const supabase = createAdminClient();

  // Fetch staff list
  let staffQuery = supabase
    .from("staff")
    .select("id, full_name, role_id, branch_id, branches(name), roles(name)")
    .eq("is_active", true);

  if (params.branchId && params.branchId !== "all") {
    staffQuery = staffQuery.eq("branch_id", params.branchId);
  }

  const { data: staffList } = await staffQuery;

  // Fetch attendance records in period
  let recordsQuery = supabase
    .from("attendance_records")
    .select("*")
    .gte("work_date", params.periodStart)
    .lte("work_date", params.periodEnd);

  if (params.branchId && params.branchId !== "all") {
    recordsQuery = recordsQuery.eq("branch_id", params.branchId);
  }

  const { data: rawRecords } = await recordsQuery;

  const summaries = (staffList || []).map((st: any) => {
    const pos = st.roles?.name || "Staff";
    const bName = st.branches?.name || "Main Clinic";
    const empRecords = (rawRecords || [])
      .filter((r) => r.employee_id === st.id)
      .map((r: any) => ({
        ...r,
        attendance_status: r.attendance_status || r.status,
      }));

    return compilePayrollAttendanceSummary(
      st.id,
      st.full_name,
      pos,
      bName,
      params.periodStart,
      params.periodEnd,
      empRecords
    );
  });

  return summaries;
}

