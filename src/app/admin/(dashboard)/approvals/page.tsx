// ==============================================================================
// Cindyrella Aesthetic & Wellness / Clinic & Spa Management System
// Operations Approvals Queue — Centralized Bills & Expenses Review Hub
// ==============================================================================

import { requireStaff } from "@/lib/auth";
import { hasServerPermission } from "@/lib/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { ApprovalsClient } from "./ApprovalsClient";
import { BillItem } from "@/app/admin/(dashboard)/bills/types";
import { ExpenseItem } from "@/app/admin/(dashboard)/expenses/types";
import {
  deriveBillStatus,
  calculateOutstandingBalance,
  computeValidPaymentsTotal,
  getLocalDateString,
} from "@/lib/bills/bill-calculator";

export const metadata = {
  title: "Approvals Queue — Cindyrella Admin",
  description: "Executive review queue for operating disbursements, vendor bills due, and staff reimbursements.",
};

export default async function ApprovalsPage() {
  const currentStaff = await requireStaff();

  const isSuperAdmin = currentStaff.role === "super_admin";
  const isAdmin = currentStaff.role === "admin";
  const isManager = currentStaff.role === "manager";

  // Check RBAC permission
  const canViewApprovals =
    isSuperAdmin ||
    isAdmin ||
    isManager ||
    (await hasServerPermission("approvals.view")) ||
    (await hasServerPermission("expenses.approve")) ||
    (await hasServerPermission("bills.approve"));

  if (!canViewApprovals) {
    redirect("/admin/unauthorized");
  }

  const supabase = createAdminClient();
  const todayStr = getLocalDateString();

  // 1. Fetch Branches
  const { data: branchesData } = await supabase
    .from("branches")
    .select("id, name")
    .order("name", { ascending: true });

  const branches = (branchesData || []).map((b) => ({ id: b.id, name: b.name }));

  // 2. Fetch Pending Bills
  let billsQuery = supabase
    .from("bills")
    .select(`
      *,
      category:expense_categories(id, name, color),
      branch:branches(id, name),
      creator:staff!bills_created_by_fkey(id, full_name),
      payments:bill_payments(*)
    `)
    .eq("approval_status", "pending")
    .order("created_at", { ascending: false });

  if (!isSuperAdmin && currentStaff.branchId) {
    billsQuery = billsQuery.or(`branch_id.eq.${currentStaff.branchId},branch_id.is.null`);
  }

  const { data: pendingBillsRaw } = await billsQuery;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pendingBills: BillItem[] = (pendingBillsRaw || []).map((b: any) => {
    const categoryObj = Array.isArray(b.category) ? b.category[0] : b.category;
    const branchObj = Array.isArray(b.branch) ? b.branch[0] : b.branch;
    const creatorObj = Array.isArray(b.creator) ? b.creator[0] : b.creator;
    const paymentsList = Array.isArray(b.payments) ? b.payments : [];
    const validPayments = computeValidPaymentsTotal(paymentsList);
    const totalAmount = Number(b.total_amount || 0);

    return {
      ...b,
      total_amount: totalAmount,
      amount_paid: validPayments,
      outstanding_balance: calculateOutstandingBalance(totalAmount, validPayments),
      status: deriveBillStatus({
        dueDate: b.due_date,
        totalAmount,
        amountPaid: validPayments,
        referenceDateStr: todayStr,
      }),
      category: categoryObj,
      category_name: categoryObj?.name || "General",
      branch_name: branchObj?.name || "Main Clinic",
      created_by_name: creatorObj?.full_name || "Staff",
      payments: paymentsList,
    };
  });

  // 3. Fetch Pending Expenses & Reimbursements
  let expensesQuery = supabase
    .from("expenses")
    .select(`
      *,
      category:expense_categories(id, name, color),
      branch:branches(id, name),
      creator:staff!expenses_requested_by_fkey(id, full_name)
    `)
    .eq("approval_status", "pending")
    .order("created_at", { ascending: false });

  if (!isSuperAdmin && currentStaff.branchId) {
    expensesQuery = expensesQuery.or(`branch_id.eq.${currentStaff.branchId},branch_id.is.null`);
  }

  const { data: pendingExpensesRaw } = await expensesQuery;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pendingExpenses: ExpenseItem[] = (pendingExpensesRaw || []).map((e: any) => {
    const cat = Array.isArray(e.category) ? e.category[0] : e.category;
    const br = Array.isArray(e.branch) ? e.branch[0] : e.branch;
    const cr = Array.isArray(e.creator) ? e.creator[0] : e.creator;
    const total = Number(e.total_amount || e.amount || 0);

    return {
      ...e,
      total_amount: total,
      amount_before_tax: Number(e.amount_before_tax || total),
      tax_amount: Number(e.tax_amount || 0),
      category: cat,
      branch_name: br?.name || "Main Clinic",
      requested_by_name: cr?.full_name || "Staff",
    };
  });

  return (
    <ApprovalsClient
      pendingBills={pendingBills}
      pendingExpenses={pendingExpenses}
      branches={branches}
      currentStaffId={currentStaff.id}
      isSuperAdmin={isSuperAdmin}
    />
  );
}
