// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Type Definitions for Daily Staff Attendance, Timekeeping & Login Monitoring
// ==============================================================================

export type AttendanceStatus =
  | "not_timed_in"
  | "present"
  | "late"
  | "on_break"
  | "timed_out"
  | "absent"
  | "on_approved_leave"
  | "rest_day"
  | "incomplete"
  | "pending_correction";

export type CorrectionStatus =
  | "none"
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export type CorrectionType =
  | "missed_time_in"
  | "missed_time_out"
  | "incorrect_time"
  | "missed_break"
  | "undertime_excusal"
  | "other";

export type BreakType = "meal" | "rest" | "coffee" | "other";

export type AttendanceEventType =
  | "ATTENDANCE_TIME_IN"
  | "ATTENDANCE_BREAK_STARTED"
  | "ATTENDANCE_BREAK_ENDED"
  | "ATTENDANCE_TIME_OUT"
  | "ATTENDANCE_CORRECTION_SUBMITTED"
  | "ATTENDANCE_CORRECTION_APPROVED"
  | "ATTENDANCE_CORRECTION_REJECTED"
  | "ATTENDANCE_CORRECTION_CANCELLED"
  | "ATTENDANCE_MANUAL_ADJUSTMENT";

export interface EmployeeSchedule {
  id: string;
  employee_id: string;
  branch_id?: string | null;
  branch_name?: string | null;
  shift_name: string;
  scheduled_start: string; // e.g. "09:00:00"
  scheduled_end: string;   // e.g. "18:00:00"
  break_minutes: number;
  grace_period_minutes: number;
  rest_days: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
  effective_date: string;
  end_date?: string | null;
  is_active: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceBreak {
  id: string;
  attendance_record_id: string;
  break_start: string;
  break_end?: string | null;
  duration_minutes?: number | null;
  break_type: BreakType;
  notes?: string | null;
  created_at: string;
}

export interface AttendanceCorrection {
  id: string;
  attendance_record_id?: string | null;
  employee_id: string;
  employee_name?: string;
  branch_id?: string | null;
  branch_name?: string;
  attendance_date: string;
  original_time_in?: string | null;
  original_time_out?: string | null;
  requested_time_in?: string | null;
  requested_time_out?: string | null;
  correction_type: CorrectionType;
  reason: string;
  attachment_url?: string | null;
  status: CorrectionStatus;
  submitted_by: string;
  submitted_by_name?: string;
  reviewed_by?: string | null;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceAuditEvent {
  id: string;
  attendance_record_id?: string | null;
  employee_id: string;
  employee_name?: string;
  branch_id?: string | null;
  branch_name?: string;
  actor_id?: string | null;
  actor_name?: string;
  event_type: AttendanceEventType;
  previous_state?: Record<string, unknown> | null;
  new_state?: Record<string, unknown> | null;
  ip_address?: string | null;
  device_info?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface DailyAttendanceRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code?: string;
  branch_id: string | null;
  branch_name: string;
  position?: string;
  work_date: string;
  scheduled_shift_id?: string | null;
  shift_name: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  time_in: string | null;
  time_out: string | null;
  break_start: string | null;
  break_end: string | null;
  break_minutes: number;
  breaks?: AttendanceBreak[];
  hours_worked: number;
  late_minutes: number;
  undertime_minutes: number;
  approved_overtime_minutes: number;
  attendance_status: AttendanceStatus;
  correction_status: CorrectionStatus;
  is_approved_leave: boolean;
  leave_type?: string | null;
  notes?: string | null;
  pending_correction_id?: string | null;
  active_cashier_shift_id?: string | null;
  has_cashier_discrepancy?: boolean;
  created_at: string;
  updated_at: string;
}

export interface AttendanceDashboardKPIs {
  presentToday: number;
  notYetTimedIn: number;
  lateArrivals: number;
  currentlyOnBreak: number;
  currentlyClockedIn: number;
  timedOut: number;
  absent: number;
  pendingCorrections: number;
}

export interface CashierAttendanceDiscrepancy {
  employee_id: string;
  employee_name: string;
  branch_name: string;
  cashier_shift_id: string;
  opened_at: string;
  closed_at?: string | null;
  attendance_status: AttendanceStatus;
  issue_description: string;
}

export interface PayrollAttendanceSummary {
  employee_id: string;
  employee_name: string;
  position: string;
  branch_name: string;
  period_start: string;
  period_end: string;
  days_scheduled: number;
  days_worked: number;
  total_hours_worked: number;
  total_late_minutes: number;
  total_undertime_minutes: number;
  approved_overtime_hours: number;
  approved_leave_days: number;
  rest_days_count: number;
  absences_count: number;
  incomplete_records_count: number;
  needs_review: boolean;
}

export interface StaffLoginSessionRecord {
  id: string;
  user_id: string;
  employee_name: string;
  employee_code?: string;
  branch_id?: string | null;
  branch_name: string;
  login_at: string;
  logout_at?: string | null;
  last_activity_at?: string | null;
  duration_seconds?: number | null;
  status: "ACTIVE" | "LOGGED_OUT" | "SESSION_EXPIRED" | "FORCE_LOGGED_OUT" | "REVOKED";
  logout_reason?: string | null;
  auth_result: "SUCCESS" | "FAILURE" | "DENIED";
  ip_address?: string | null;
  device_type?: string | null;
  device_name?: string | null;
  browser?: string | null;
  operating_system?: string | null;
}
