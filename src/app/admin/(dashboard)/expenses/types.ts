// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Clinic Operating Expenses, Petty Cash & Reimbursements Types
// ==============================================================================

export type ExpensePaymentMethod =
  | "cash"
  | "petty_cash"
  | "cashier_drawer"
  | "bank_transfer"
  | "gcash"
  | "maya"
  | "credit_card"
  | "cheque"
  | "other";

export type ExpensePaymentStatus =
  | "unpaid"
  | "partially_paid"
  | "paid"
  | "cancelled";

export type ExpenseApprovalStatus =
  | "draft"
  | "submitted"
  | "pending"
  | "approved"
  | "rejected"
  | "payment_pending"
  | "archived";

export interface BranchInfo {
  id: string;
  name: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  requires_receipt: boolean;
  requires_approval: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ExpenseAttachment {
  id: string;
  expense_id: string;
  file_name: string;
  file_url: string;
  file_size?: number | null;
  mime_type?: string | null;
  uploaded_by?: string | null;
  uploader_name?: string | null;
  uploaded_at: string;
}

export interface ExpensePayment {
  id: string;
  expense_id: string;
  payment_number: string;
  amount: number;
  payment_date: string;
  payment_method: ExpensePaymentMethod;
  payment_account?: string | null;
  reference_number?: string | null;
  paid_by?: string | null;
  paid_by_name?: string | null;
  shift_id?: string | null;
  is_reversed: boolean;
  reversed_at?: string | null;
  reversed_by?: string | null;
  reversal_reason?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface ExpenseAuditLog {
  id: string;
  expense_id: string;
  actor_id?: string | null;
  actor_name?: string | null;
  action: string;
  details?: Record<string, unknown> | null;
  notes?: string | null;
  created_at: string;
}

export interface ExpenseItem {
  id: string;
  expense_number: string;
  branch_id?: string | null;
  branch_name?: string;
  category_id: string;
  category?: ExpenseCategory;
  title: string;
  description?: string | null;
  vendor_or_payee: string;
  amount_before_tax: number;
  tax_amount: number;
  total_amount: number;
  approved_amount?: number | null;
  expense_date: string;
  payment_method: ExpensePaymentMethod;
  payment_status: ExpensePaymentStatus;
  payment_date?: string | null;
  payment_account?: string | null;
  approval_status: ExpenseApprovalStatus;
  is_petty_cash: boolean;
  is_reimbursement: boolean;
  employee_id?: string | null;
  employee_name?: string | null;
  requested_by?: string | null;
  requested_by_name?: string | null;
  reviewed_by?: string | null;
  reviewed_by_name?: string | null;
  approved_by?: string | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  notes?: string | null;
  receipt_url?: string | null;
  reference_number?: string | null;
  created_at: string;
  updated_at: string;

  // Computed fields
  total_paid: number;
  outstanding_balance: number;
  payments: ExpensePayment[];
  attachments: ExpenseAttachment[];
  audit_logs?: ExpenseAuditLog[];
}

export interface PettyCashFund {
  id: string;
  branch_id: string;
  branch_name?: string;
  current_balance: number;
  target_float: number;
  last_replenished_at?: string | null;
  updated_at?: string;
}

export interface CashierShiftSummary {
  id: string;
  cashier_id: string;
  branch_id: string;
  status: string;
  starting_cash: number;
  opened_at: string;
}

export interface ExpenseFormData {
  branch_id: string;
  category_id: string;
  title: string;
  description?: string;
  vendor_or_payee: string;
  amount_before_tax: number;
  tax_amount: number;
  total_amount: number;
  expense_date: string;
  payment_method: ExpensePaymentMethod;
  payment_account?: string;
  record_immediate_payment?: boolean;
  receipt_url?: string;
  reference_number?: string;
  notes?: string;
  is_petty_cash?: boolean;
  is_reimbursement?: boolean;
  employee_id?: string;
  attachments?: { file_name: string; file_url: string; file_size?: number; mime_type?: string }[];
}

export interface ExpenseFilters {
  branchId?: string;
  categoryId?: string;
  paymentStatus?: string;
  approvalStatus?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  isReimbursement?: boolean;
}
