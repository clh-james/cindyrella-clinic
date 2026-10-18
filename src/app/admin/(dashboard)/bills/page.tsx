// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Bills Due Page — Server Component Loader with RBAC & Branch Isolation
// ==============================================================================

import { requireStaff } from "@/lib/auth";
import { hasServerPermission } from "@/lib/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { BillsClient } from "./BillsClient";
import {
  BillItem,
  RecurringBillTemplate,
  BillReminderLog,
  BillReminderSettings,
} from "./types";
import { ExpenseCategory } from "@/app/admin/(dashboard)/expenses/types";
import {
  deriveBillStatus,
  calculateOutstandingBalance,
  computeValidPaymentsTotal,
  getNextReminderInfo,
  getLocalDateString,
} from "@/lib/bills/bill-calculator";

export const metadata = {
  title: "Bills Due & Automated Payment Reminders — Cindyrella Admin",
  description: "Manage clinic vendor bills, utility payables, recurring schedules, and automated reminders.",
};

const DEFAULT_CATEGORIES: ExpenseCategory[] = [
  { id: "cat-1", name: "Rent", color: "#4F46E5", requires_receipt: true, requires_approval: true, is_active: true },
  { id: "cat-2", name: "Electricity", color: "#D97706", requires_receipt: true, requires_approval: true, is_active: true },
  { id: "cat-3", name: "Water", color: "#0284C7", requires_receipt: true, requires_approval: true, is_active: true },
  { id: "cat-4", name: "Internet and Telephone", color: "#2563EB", requires_receipt: true, requires_approval: true, is_active: true },
  { id: "cat-5", name: "Clinic Supplies", color: "#0D9488", requires_receipt: true, requires_approval: false, is_active: true },
  { id: "cat-16", name: "Software Subscriptions", color: "#3B82F6", requires_receipt: true, requires_approval: true, is_active: true },
  { id: "cat-18", name: "Government Fees and Permits", color: "#0891B2", requires_receipt: true, requires_approval: true, is_active: true },
  { id: "cat-9", name: "Equipment Maintenance", color: "#EA580C", requires_receipt: true, requires_approval: true, is_active: true },
  { id: "cat-12", name: "Marketing and Advertising", color: "#EC4899", requires_receipt: true, requires_approval: true, is_active: true },
  { id: "cat-23", name: "Other Expenses", color: "#78716C", requires_receipt: false, requires_approval: false, is_active: true },
];

export default async function BillsDuePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; id?: string }>;
}) {
  const currentStaff = await requireStaff();
  const params = await searchParams;

  const isSuperAdmin = currentStaff.role === "super_admin";
  const isAdmin = currentStaff.role === "admin";
  const isManager = currentStaff.role === "manager";
  const isCashier = currentStaff.role === "cashier";

  // Check RBAC permission: bills.view or expenses.view
  const canViewBills =
    isSuperAdmin ||
    isAdmin ||
    isManager ||
    isCashier ||
    (await hasServerPermission("bills.view")) ||
    (await hasServerPermission("expenses.view"));

  if (!canViewBills) {
    redirect("/admin/unauthorized");
  }

  const canApprove = isSuperAdmin || isAdmin || isManager;
  const canPay = isSuperAdmin || isAdmin || isManager || isCashier;
  const canEdit = isSuperAdmin || isAdmin || isManager;

  const supabase = createAdminClient();
  const todayStr = getLocalDateString();

  // 1. Fetch Branches
  const { data: branchesData } = await supabase
    .from("branches")
    .select("id, name")
    .order("name", { ascending: true });

  const branches = (branchesData || []).map((b) => ({
    id: b.id,
    name: b.name,
  }));

  // 2. Fetch Categories
  const { data: categoriesData } = await supabase
    .from("expense_categories")
    .select("*")
    .order("name", { ascending: true });

  const categories: ExpenseCategory[] =
    categoriesData && categoriesData.length > 0
      ? categoriesData
      : DEFAULT_CATEGORIES;

  // 3. Fetch Staff List
  const { data: staffRows } = await supabase
    .from("staff")
    .select("id, full_name, branch_id")
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  const staffList = (staffRows || []).map((s) => ({
    id: s.id,
    full_name: s.full_name,
    branch_id: s.branch_id,
  }));

  // 4. Fetch Bills with Payments, Reminder Logs, and Audit Logs
  let billsQuery = supabase
    .from("bills")
    .select(`
      *,
      category:expense_categories(id, name, color),
      branch:branches(id, name),
      creator:staff!bills_created_by_fkey(id, full_name),
      responsible_employee:staff!bills_responsible_employee_id_fkey(id, full_name),
      payments:bill_payments(*),
      reminder_logs:bill_reminder_logs(*),
      audit_logs:bill_audit_logs(*)
    `)
    .order("due_date", { ascending: true })
    .order("created_at", { ascending: false });

  // Branch isolation: non-super admins with assigned branch only see their branch bills
  if (!isSuperAdmin && currentStaff.branchId) {
    billsQuery = billsQuery.or(`branch_id.eq.${currentStaff.branchId},branch_id.is.null,responsible_employee_id.eq.${currentStaff.id}`);
  }

  const { data: rawBills, error: billsError } = await billsQuery;

  let bills: BillItem[] = [];

  if (!billsError && rawBills && rawBills.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bills = rawBills.map((b: any) => {
      const categoryObj = Array.isArray(b.category) ? b.category[0] : b.category;
      const branchObj = Array.isArray(b.branch) ? b.branch[0] : b.branch;
      const creatorObj = Array.isArray(b.creator) ? b.creator[0] : b.creator;
      const respObj = Array.isArray(b.responsible_employee) ? b.responsible_employee[0] : b.responsible_employee;

      const paymentsList = Array.isArray(b.payments) ? b.payments : [];
      const validPayments = computeValidPaymentsTotal(paymentsList);
      const totalAmount = Number(b.total_amount || 0);
      const balance = calculateOutstandingBalance(totalAmount, validPayments);

      const status = deriveBillStatus({
        dueDate: b.due_date,
        totalAmount,
        amountPaid: validPayments,
        cancelledAt: b.cancelled_at,
        isDraft: b.status === "draft",
        referenceDateStr: todayStr,
      });

      const nextRem = getNextReminderInfo({
        dueDate: b.due_date,
        status,
        amountPaid: validPayments,
        totalAmount,
        stagesConfig: b.reminder_schedule?.stages,
        referenceDateStr: todayStr,
      });

      return {
        ...b,
        amount_before_tax: Number(b.amount_before_tax || 0),
        tax_amount: Number(b.tax_amount || 0),
        total_amount: totalAmount,
        amount_paid: validPayments,
        outstanding_balance: balance,
        status,
        category: categoryObj,
        category_name: categoryObj?.name || "General",
        category_color: categoryObj?.color || "#4F46E5",
        branch_name: branchObj?.name || "Main Clinic",
        created_by_name: creatorObj?.full_name || "Admin",
        responsible_employee_name: respObj?.full_name || "Branch Manager",
        payments: paymentsList,
        reminder_logs: Array.isArray(b.reminder_logs) ? b.reminder_logs : [],
        audit_logs: Array.isArray(b.audit_logs) ? b.audit_logs : [],
        next_reminder_date: nextRem.nextDate,
        next_reminder_stage: nextRem.nextStage,
      };
    });
  } else {
    // Fallback: If table is newly created and empty, or before initial bills are registered
    bills = [];
  }

  // 5. Fetch Recurring Bill Templates
  let recurringQuery = supabase
    .from("recurring_bill_templates")
    .select(`
      *,
      category:expense_categories(id, name),
      branch:branches(id, name),
      responsible_employee:staff!recurring_bill_templates_responsible_employee_id_fkey(id, full_name)
    `)
    .order("next_billing_date", { ascending: true });

  if (!isSuperAdmin && currentStaff.branchId) {
    recurringQuery = recurringQuery.or(`branch_id.eq.${currentStaff.branchId},branch_id.is.null`);
  }

  const { data: rawTemplates } = await recurringQuery;

  let recurringTemplates: RecurringBillTemplate[] = [];
  if (rawTemplates && rawTemplates.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recurringTemplates = rawTemplates.map((t: any) => ({
      ...t,
      default_amount: Number(t.default_amount || 0),
      tax_amount: Number(t.tax_amount || 0),
      category_name: (Array.isArray(t.category) ? t.category[0] : t.category)?.name || "General",
      branch_name: (Array.isArray(t.branch) ? t.branch[0] : t.branch)?.name || "Main Clinic",
      responsible_employee_name: (Array.isArray(t.responsible_employee) ? t.responsible_employee[0] : t.responsible_employee)?.full_name || null,
    }));
  }

  // 6. Fetch Reminder Logs for the report tab
  const { data: rawReminderLogs } = await supabase
    .from("bill_reminder_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const reminderLogs: BillReminderLog[] = rawReminderLogs || [];

  // 7. Fetch Reminder Settings
  const { data: settingsData } = await supabase
    .from("bill_reminder_settings")
    .select("*")
    .is("branch_id", null)
    .maybeSingle();

  const reminderSettings: BillReminderSettings | null = settingsData || null;

  return (
    <BillsClient
      initialBills={bills}
      categories={categories}
      branches={branches}
      recurringTemplates={recurringTemplates}
      reminderLogs={reminderLogs}
      reminderSettings={reminderSettings}
      staffList={staffList}
      currentStaffBranchId={currentStaff.branchId}
      currentStaffId={currentStaff.id}
      isSuperAdmin={isSuperAdmin}
      canApprove={canApprove}
      canPay={canPay}
      canEdit={canEdit}
      initialTab={params.tab || "bills"}
      initialSelectedBillId={params.id || null}
    />
  );
}
