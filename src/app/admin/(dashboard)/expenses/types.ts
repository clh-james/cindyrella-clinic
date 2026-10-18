// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Clinic Operating Expenses & Petty Cash Management Types
// ==============================================================================

export type ExpensePaymentMethod =
  | "cash"
  | "petty_cash"
  | "bank_transfer"
  | "gcash"
  | "credit_card"
  | "check";

export type ExpenseStatus = "pending" | "approved" | "rejected" | "reimbursed";

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  is_active: boolean;
  created_at?: string;
}

export interface ExpenseItem {
  id: string;
  expense_number: string;
  branch_id?: string | null;
  category_id: string;
  title: string;
  description?: string | null;
  amount: number;
  expense_date: string;
  payment_method: ExpensePaymentMethod;
  reference_number?: string | null;
  vendor_or_payee: string;
  receipt_url?: string | null;
  status: ExpenseStatus;
  is_petty_cash: boolean;
  created_by?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
  category?: ExpenseCategory | null;
  branch?: { id: string; name: string } | null;
  creator?: { id: string; full_name: string } | null;
  approver?: { id: string; full_name: string } | null;
}

export interface PettyCashFund {
  id: string;
  branch_id: string;
  current_balance: number;
  target_float: number;
  last_replenished_at?: string | null;
  updated_at?: string;
  branch?: { id: string; name: string } | null;
}

export interface ExpenseAuditLog {
  id: string;
  expense_id: string;
  actor_id?: string | null;
  action: string;
  notes?: string | null;
  created_at: string;
  actor?: { id: string; full_name: string } | null;
}

export interface BranchInfo {
  id: string;
  name: string;
}

export interface ExpenseFormData {
  title: string;
  category_id: string;
  branch_id: string;
  amount: number;
  expense_date: string;
  payment_method: ExpensePaymentMethod;
  vendor_or_payee: string;
  reference_number?: string;
  description?: string;
  is_petty_cash: boolean;
  receipt_url?: string;
}
