// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Type Definitions for Bills Due, Recurring Schedules & Automated Reminders
// ==============================================================================

export type BillStatus =
  | "draft"
  | "upcoming"
  | "due_today"
  | "overdue"
  | "partially_paid"
  | "paid"
  | "cancelled";

export type BillApprovalStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected";

export type RecurrenceFrequency =
  | "weekly"
  | "monthly"
  | "quarterly"
  | "semi_annually"
  | "annually"
  | "custom";

export type ReminderStage =
  | "7_days"
  | "3_days"
  | "1_day"
  | "due_date"
  | "overdue";

export type PaymentMethod =
  | "cash"
  | "gcash"
  | "maya"
  | "bank_transfer"
  | "check"
  | "credit_card"
  | "debit_card"
  | "petty_cash"
  | "cashier_drawer"
  | "other";

export interface BillPayment {
  id: string;
  bill_id: string;
  payment_number: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod | string;
  payment_account?: string | null;
  reference_number?: string | null;
  paid_by?: string | null;
  paid_by_name?: string | null;
  receipt_url?: string | null;
  shift_id?: string | null;
  expense_payment_id?: string | null;
  is_reversed?: boolean;
  reversed_at?: string | null;
  reversed_by?: string | null;
  reversed_by_name?: string | null;
  reversal_reason?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface BillReminderLog {
  id: string;
  bill_id: string;
  reminder_stage: ReminderStage | string;
  scheduled_for: string;
  sent_at: string;
  recipient_id?: string | null;
  recipient_email?: string | null;
  recipient_phone?: string | null;
  recipient_name?: string | null;
  channel: "in_app" | "email" | "sms";
  delivery_status: "pending" | "sent" | "failed" | "skipped";
  delivery_error?: string | null;
  idempotency_key: string;
  outstanding_balance_at_send: number;
  details?: Record<string, unknown> | null;
  created_at: string;
}

export interface StaffNotification {
  id: string;
  recipient_id: string;
  branch_id?: string | null;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  is_read: boolean;
  read_at?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface BillAuditLog {
  id: string;
  bill_id: string;
  actor_id?: string | null;
  actor_name?: string | null;
  action:
    | "BILL_CREATED"
    | "BILL_UPDATED"
    | "BILL_APPROVED"
    | "BILL_CANCELLED"
    | "BILL_PAYMENT_RECORDED"
    | "BILL_PAYMENT_REVERSED"
    | "BILL_REMINDER_SCHEDULED"
    | "BILL_REMINDER_SENT"
    | "BILL_REMINDER_FAILED"
    | "BILL_MARKED_PAID"
    | string;
  details?: Record<string, unknown> | null;
  notes?: string | null;
  created_at: string;
}

export interface RecurringBillTemplate {
  id: string;
  template_name: string;
  category_id: string;
  category_name?: string;
  vendor_or_payee: string;
  branch_id?: string | null;
  branch_name?: string;
  frequency: RecurrenceFrequency;
  custom_interval_days?: number | null;
  default_amount: number;
  tax_amount: number;
  due_date_rule: "day_of_month" | "days_after_billing";
  due_day_offset: number;
  start_date: string;
  next_billing_date: string;
  end_date?: string | null;
  payment_method: PaymentMethod | string;
  responsible_employee_id?: string | null;
  responsible_employee_name?: string | null;
  reminder_schedule: { stages: ReminderStage[] };
  status: "active" | "paused" | "completed" | "cancelled";
  auto_generate: boolean;
  notes?: string | null;
  last_generated_at?: string | null;
  last_generated_bill_id?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillReminderSettings {
  id: string;
  branch_id?: string | null;
  stages_enabled: Record<ReminderStage, boolean>;
  overdue_frequency_days: number;
  in_app_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  notify_branch_managers: boolean;
  notify_super_admins: boolean;
  updated_at?: string;
}

export interface BillItem {
  id: string;
  bill_number: string;
  title: string;
  category_id: string;
  category?: {
    id: string;
    name: string;
    color: string;
  } | null;
  category_name?: string;
  category_color?: string;
  vendor_or_payee: string;
  branch_id?: string | null;
  branch_name?: string;
  invoice_number?: string | null;
  billing_period?: string | null;
  issue_date: string;
  due_date: string;
  amount_before_tax: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  outstanding_balance: number;
  payment_method: PaymentMethod | string;
  status: BillStatus;
  approval_status: BillApprovalStatus;
  is_recurring: boolean;
  recurring_rule_id?: string | null;
  responsible_employee_id?: string | null;
  responsible_employee_name?: string | null;
  reminder_schedule: { stages: ReminderStage[]; custom_days?: number[] };
  receipt_url?: string | null;
  notes?: string | null;
  expense_id?: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  approved_by?: string | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  cancelled_by?: string | null;
  cancelled_by_name?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  payments?: BillPayment[];
  reminder_logs?: BillReminderLog[];
  audit_logs?: BillAuditLog[];
  next_reminder_date?: string | null;
  next_reminder_stage?: ReminderStage | string | null;
  created_at: string;
  updated_at: string;
}

export interface BillFormData {
  title: string;
  category_id: string;
  vendor_or_payee: string;
  branch_id?: string | null;
  invoice_number?: string;
  billing_period?: string;
  issue_date: string;
  due_date: string;
  amount_before_tax: number;
  tax_amount: number;
  total_amount: number;
  payment_method: PaymentMethod | string;
  is_recurring: boolean;
  recurrence_frequency?: RecurrenceFrequency;
  recurring_rule_id?: string | null;
  responsible_employee_id?: string | null;
  reminder_stages: ReminderStage[];
  receipt_url?: string;
  notes?: string;
  create_linked_expense?: boolean;
}

export interface BillPaymentFormData {
  bill_id: string;
  payment_date: string;
  amount: number;
  payment_method: PaymentMethod | string;
  payment_account?: string;
  reference_number?: string;
  notes?: string;
  receipt_url?: string;
  shift_id?: string | null;
}

export interface RecurringTemplateFormData {
  template_name: string;
  category_id: string;
  vendor_or_payee: string;
  branch_id?: string | null;
  frequency: RecurrenceFrequency;
  custom_interval_days?: number;
  default_amount: number;
  tax_amount: number;
  due_date_rule: "day_of_month" | "days_after_billing";
  due_day_offset: number;
  start_date: string;
  next_billing_date: string;
  end_date?: string;
  payment_method: PaymentMethod | string;
  responsible_employee_id?: string | null;
  reminder_stages: ReminderStage[];
  notes?: string;
}

export interface BillSummaryKPIs {
  dueTodayCount: number;
  dueTodayAmount: number;
  dueWithin7DaysCount: number;
  dueWithin7DaysAmount: number;
  overdueCount: number;
  overdueAmount: number;
  outstandingCount: number;
  outstandingAmount: number;
  paidThisMonthCount: number;
  paidThisMonthAmount: number;
}
