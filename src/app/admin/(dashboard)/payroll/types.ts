// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Payroll Module Types & Interfaces
// ==============================================================================

import { OvertimeType } from "@/lib/payroll/philippine-tax";

export type EmploymentStatus = "active" | "on_leave" | "resigned" | "terminated";

export type EmploymentType =
  | "regular"
  | "probationary"
  | "part_time"
  | "contractual"
  | "commission_based";

export type SalaryType =
  | "monthly"
  | "daily"
  | "hourly"
  | "commission_based"
  | "mixed";

export type PayrollFrequency = "weekly" | "semi_monthly" | "monthly" | "custom";

export type PayrollStatus =
  | "draft"
  | "calculating"
  | "for_review"
  | "for_approval"
  | "approved"
  | "released"
  | "cancelled";

export type PayrollItemStatus = "pending" | "approved" | "paid" | "held";

export type AttendanceStatus =
  | "present"
  | "absent"
  | "on_leave"
  | "rest_day"
  | "holiday";

export type LeaveType =
  | "vacation"
  | "sick"
  | "emergency"
  | "maternity"
  | "paternity"
  | "unpaid"
  | "none";

export interface AllowanceItem {
  id: string;
  name: string;
  amount: number;
  is_taxable: boolean;
  is_de_minimis: boolean;
}

export interface EmployeeCompensation {
  id: string;
  employee_id: string;
  branch_id: string | null;
  position: string;
  employment_status: EmploymentStatus;
  employment_type: EmploymentType;
  salary_type: SalaryType;
  basic_salary: number;
  daily_rate: number;
  hourly_rate: number;
  payroll_frequency: PayrollFrequency;
  effective_date: string;
  is_current: boolean;
  allowances: AllowanceItem[];
  commission_eligible: boolean;
  overtime_eligible: boolean;
  sss_enabled: boolean;
  philhealth_enabled: boolean;
  pagibig_enabled: boolean;
  pagibig_custom_amount: number;
  tax_exempt: boolean;
  is_minimum_wage_earner: boolean;
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_account_name?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  staff?: {
    full_name: string;
    branch_id?: string | null;
    branches?: { name: string } | null;
    roles?: { name: string } | null;
  } | null;
}

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  branch_id: string | null;
  work_date: string;
  time_in: string | null;
  time_out: string | null;
  hours_worked: number;
  late_minutes: number;
  undertime_minutes: number;
  status: AttendanceStatus;
  leave_type: LeaveType | null;
  is_approved_leave: boolean;
  overtime_hours: number;
  overtime_type: OvertimeType;
  overtime_status: "none" | "pending" | "approved" | "rejected";
  overtime_approved_by?: string | null;
  notes?: string | null;
  created_at: string;
  staff?: {
    full_name: string;
    branch_id?: string | null;
  } | null;
}

export interface CommissionRecord {
  id: string;
  employee_id: string;
  branch_id: string | null;
  source_type: "appointment" | "pos_sale" | "manual_service" | "manual_retail";
  source_id?: string | null;
  reference_number?: string | null;
  item_name: string;
  base_amount: number;
  commission_rate: number; // percentage or fixed amount
  is_percentage: boolean;
  commission_amount: number;
  split_ratio: number;
  date_earned: string;
  status: "pending" | "approved" | "rejected" | "paid";
  approved_by?: string | null;
  payroll_run_id?: string | null;
  notes?: string | null;
  created_at: string;
  staff?: {
    full_name: string;
  } | null;
}

export interface EarningsDetail {
  code: string;
  label: string;
  amount: number;
  is_taxable: boolean;
}

export interface DeductionsDetail {
  code: string;
  label: string;
  amount: number;
  is_statutory: boolean;
}

export interface AttendanceSummary {
  days_present: number;
  days_absent: number;
  days_on_leave: number;
  hours_worked: number;
  late_minutes: number;
  undertime_minutes: number;
  approved_ot_hours: number;
}

export interface PayrollItem {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  employee_name: string;
  position: string;
  branch_id: string | null;
  branch_name: string;
  salary_type: SalaryType;
  base_salary_rate: number;
  days_worked: number;
  hours_worked: number;
  basic_pay: number;
  overtime_pay: number;
  commission_pay: number;
  allowance_pay: number;
  holiday_pay: number;
  other_earnings: number;
  gross_pay: number;
  sss_employee: number;
  sss_employer: number;
  philhealth_employee: number;
  philhealth_employer: number;
  pagibig_employee: number;
  pagibig_employer: number;
  withholding_tax: number;
  late_undertime_deduction: number;
  absence_deduction: number;
  loan_advance_deduction: number;
  other_deductions: number;
  total_deductions: number;
  net_pay: number;
  total_employer_cost: number;
  earnings_breakdown: EarningsDetail[];
  deductions_breakdown: DeductionsDetail[];
  attendance_summary: AttendanceSummary;
  status: PayrollItemStatus;
  payslip_number: string;
  created_at: string;
}

export interface PayrollRun {
  id: string;
  run_number: string;
  title: string;
  period_start: string;
  period_end: string;
  pay_date: string;
  cutoff_frequency: PayrollFrequency;
  branch_id: string | null;
  status: PayrollStatus;
  total_employees: number;
  total_gross_pay: number;
  total_deductions: number;
  total_net_pay: number;
  total_employer_contributions: number;
  created_by?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  released_at?: string | null;
  approval_comments?: string | null;
  rejection_reason?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  branch?: { name: string } | null;
  creator?: { full_name: string } | null;
  approver?: { full_name: string } | null;
  items?: PayrollItem[];
}

export interface ThirteenthMonthRecord {
  id: string;
  year: number;
  employee_id: string;
  branch_id: string | null;
  months_worked: number;
  total_basic_earned: number;
  thirteenth_month_pay: number;
  adjustments: number;
  adjustment_reason?: string | null;
  final_payout: number;
  status: "calculated" | "reviewed" | "approved" | "released";
  approved_by?: string | null;
  approved_at?: string | null;
  notes?: string | null;
  created_at: string;
  staff?: {
    full_name: string;
    branch_id?: string | null;
    branches?: { name: string } | null;
  } | null;
}

export interface PayrollSettingsState {
  sss_enabled: boolean;
  philhealth_enabled: boolean;
  pagibig_enabled: boolean;
  contribution_schedule: "split_50_50" | "first_cutoff_only" | "second_cutoff_only";
  overtime_approval_required: boolean;
  default_working_days_per_month: number;
  default_daily_hours: number;
}

export interface BranchInfo {
  id: string;
  name: string;
}

export interface StaffBasic {
  id: string;
  full_name: string;
  branch_id: string | null;
  role_id?: string | null;
  is_active: boolean;
  roles?: { name: string } | null;
  branches?: { name: string } | null;
}
