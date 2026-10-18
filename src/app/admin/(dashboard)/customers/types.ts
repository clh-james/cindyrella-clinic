// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Type Definitions for Client File Extraction, Installments & Payment History
// ==============================================================================

export type InstallmentFrequency =
  | "weekly"
  | "bi_weekly"
  | "semi_monthly"
  | "monthly"
  | "quarterly"
  | "custom";

export type InstallmentAppStatus =
  | "draft"
  | "pending"
  | "active"
  | "completed"
  | "defaulted"
  | "cancelled"
  | "rejected";

export type InstallmentScheduleStatus =
  | "upcoming"
  | "due_today"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "waived"
  | "cancelled";

export type PaymentRecordStatus =
  | "completed"
  | "reversed"
  | "refunded"
  | "voided"
  | "pending";

export type ActivityType =
  | "client_registration"
  | "appointment_created"
  | "appointment_rescheduled"
  | "appointment_completed"
  | "appointment_cancelled"
  | "service_rendered"
  | "pos_sale"
  | "installment_application_submitted"
  | "installment_application_approved"
  | "installment_application_rejected"
  | "down_payment_received"
  | "installment_payment_received"
  | "receipt_generated"
  | "payment_reversed"
  | "payment_refunded"
  | "package_purchased"
  | "package_redeemed"
  | "membership_renewed"
  | "account_adjustment";

export interface CustomerProfile {
  id: string;
  customer_code?: string | null;
  first_name: string;
  last_name: string;
  full_name?: string;
  phone: string;
  email: string;
  address?: string | null;
  birthday?: string | null;
  gender?: string | null;
  medical_conditions?: string | null;
  allergies?: string | null;
  is_pregnant?: boolean | null;
  emergency_contact?: string | null;
  branch_id?: string | null;
  branch_name?: string | null;
  account_status?: string | null;
  loyalty_points?: number;
  created_at: string;
}

export interface InstallmentApplication {
  id: string;
  application_number: string;
  customer_id: string;
  branch_id?: string | null;
  branch_name?: string | null;
  service_package_name: string;
  treatment_id?: string | null;
  treatment_name?: string | null;
  original_contract_amount: number;
  down_payment_required: number;
  down_payment_received: number;
  frequency: InstallmentFrequency;
  installment_amount: number;
  number_of_installments: number;
  contract_start_date: string;
  contract_end_date?: string | null;
  status: InstallmentAppStatus;
  approval_status: "draft" | "pending" | "approved" | "rejected";
  approved_by?: string | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;

  // Calculated properties
  valid_payments_total?: number;
  outstanding_balance?: number;
  overdue_balance?: number;
  schedules?: InstallmentSchedule[];
  payments?: InstallmentPayment[];
}

export interface InstallmentSchedule {
  id: string;
  application_id: string;
  installment_number: number;
  due_date: string;
  scheduled_amount: number;
  amount_paid: number;
  remaining_amount: number;
  payment_date?: string | null;
  status: InstallmentScheduleStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InstallmentPayment {
  id: string;
  payment_number: string;
  application_id: string;
  application_number?: string | null;
  customer_id: string;
  schedule_id?: string | null;
  installment_number?: number | null;
  amount_paid: number;
  payment_method: string;
  payment_date: string;
  branch_id?: string | null;
  branch_name?: string | null;
  received_by?: string | null;
  received_by_name?: string | null;
  shift_id?: string | null;
  receipt_number?: string | null;
  reference_number?: string | null;
  transaction_reference?: string | null;
  status: PaymentRecordStatus;
  reversed_at?: string | null;
  reversed_by?: string | null;
  reversal_reason?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface CustomerPackage {
  id: string;
  customer_id: string;
  package_name: string;
  treatment_id?: string | null;
  treatment_name?: string | null;
  branch_id?: string | null;
  branch_name?: string | null;
  total_sessions: number;
  sessions_remaining: number;
  price_paid: number;
  start_date: string;
  expiry_date?: string | null;
  status: "active" | "fully_redeemed" | "expired" | "cancelled";
  notes?: string | null;
  created_at: string;
}

export interface UnifiedPaymentRecord {
  id: string;
  source: "installment" | "pos_sale" | "appointment";
  payment_date: string;
  payment_reference: string;
  transaction_reference?: string | null;
  application_reference?: string | null;
  installment_number?: number | null;
  amount_paid: number;
  payment_method: string;
  branch_name: string;
  received_by_name?: string | null;
  shift_reference?: string | null;
  receipt_number?: string | null;
  status: PaymentRecordStatus;
  is_valid_collection: boolean;
  notes?: string | null;
}

export interface ClientActivityTimelineItem {
  id: string;
  timestamp: string;
  date_formatted: string;
  type: ActivityType;
  title: string;
  description: string;
  reference_number?: string | null;
  branch_name?: string | null;
  status?: string | null;
  amount?: number | null;
  actor_name?: string | null;
}

export interface ClientFinancialSummary {
  total_contract_value: number;
  total_valid_payments: number;
  total_refunded_reversed: number;
  total_outstanding_balance: number;
  overdue_balance: number;
  next_due_date: string | null;
  next_scheduled_amount: number | null;
  paid_installments_count: number;
  remaining_installments_count: number;
  active_applications_count: number;
}

export interface ClientAppointmentItem {
  id: string;
  reference_number: string;
  appointment_date: string;
  appointment_time: string;
  treatment_name: string;
  branch_name: string;
  status: string;
  payment_method: string;
  payment_status: string;
  amount_due: number;
  notes?: string | null;
  created_at: string;
}

export interface CompleteClientFile {
  client: CustomerProfile;
  summary: ClientFinancialSummary;
  applications: InstallmentApplication[];
  schedules: InstallmentSchedule[];
  payments: UnifiedPaymentRecord[];
  appointments: ClientAppointmentItem[];
  packages: CustomerPackage[];
  timeline: ClientActivityTimelineItem[];
  generated_at: string;
  generated_by: string;
  branch_scope: string;
}
