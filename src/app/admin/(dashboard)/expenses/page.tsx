import { requireStaff } from "@/lib/auth";
import { hasServerPermission } from "@/lib/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { ExpensesClient } from "./ExpensesClient";
import { ExpenseItem, ExpenseCategory, PettyCashFund } from "./types";

export const metadata = {
  title: "Clinic Expenses — Cindyrella Admin",
  description: "Operating disbursements, petty cash vouchers, clinical supplies, and facility overheads.",
};

const DEFAULT_CATEGORIES: ExpenseCategory[] = [
  { id: "cat-1", name: "Rent", color: "#4F46E5", requires_receipt: true, requires_approval: true, is_active: true },
  { id: "cat-2", name: "Electricity", color: "#D97706", requires_receipt: true, requires_approval: true, is_active: true },
  { id: "cat-3", name: "Water", color: "#0284C7", requires_receipt: true, requires_approval: true, is_active: true },
  { id: "cat-4", name: "Internet and Telephone", color: "#2563EB", requires_receipt: true, requires_approval: true, is_active: true },
  { id: "cat-5", name: "Clinic Supplies", color: "#0D9488", requires_receipt: true, requires_approval: false, is_active: true },
  { id: "cat-6", name: "Retail Supplies", color: "#7C3AED", requires_receipt: true, requires_approval: true, is_active: true },
  { id: "cat-7", name: "Medical and Treatment Supplies", color: "#DC2626", requires_receipt: true, requires_approval: true, is_active: true },
  { id: "cat-8", name: "Equipment", color: "#9333EA", requires_receipt: true, requires_approval: true, is_active: true },
  { id: "cat-9", name: "Equipment Maintenance", color: "#EA580C", requires_receipt: true, requires_approval: true, is_active: true },
  { id: "cat-10", name: "Repairs", color: "#C026D3", requires_receipt: true, requires_approval: true, is_active: true },
  { id: "cat-11", name: "Cleaning Supplies", color: "#16A34A", requires_receipt: false, requires_approval: false, is_active: true },
  { id: "cat-12", name: "Marketing and Advertising", color: "#EC4899", requires_receipt: true, requires_approval: true, is_active: true },
  { id: "cat-13", name: "Employee Transportation", color: "#059669", requires_receipt: true, requires_approval: false, is_active: true },
  { id: "cat-14", name: "Staff Meals", color: "#F59E0B", requires_receipt: false, requires_approval: false, is_active: true },
  { id: "cat-15", name: "Office Supplies", color: "#64748B", requires_receipt: false, requires_approval: false, is_active: true },
  { id: "cat-16", name: "Software Subscriptions", color: "#3B82F6", requires_receipt: true, requires_approval: true, is_active: true },
  { id: "cat-17", name: "Professional Services", color: "#8B5CF6", requires_receipt: true, requires_approval: true, is_active: true },
  { id: "cat-18", name: "Government Fees and Permits", color: "#0891B2", requires_receipt: true, requires_approval: true, is_active: true },
  { id: "cat-19", name: "Bank Charges", color: "#6B7280", requires_receipt: false, requires_approval: false, is_active: true },
  { id: "cat-20", name: "Payroll-Related Expenses", color: "#F97316", requires_receipt: false, requires_approval: true, is_active: true },
  { id: "cat-21", name: "Petty Cash", color: "#10B981", requires_receipt: true, requires_approval: false, is_active: true },
  { id: "cat-22", name: "Employee Reimbursement", color: "#84CC16", requires_receipt: true, requires_approval: true, is_active: true },
  { id: "cat-23", name: "Other Expenses", color: "#78716C", requires_receipt: false, requires_approval: false, is_active: true },
];

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const currentStaff = await requireStaff();
  const params = await searchParams;

  const isSuperAdmin = currentStaff.role === "super_admin";
  const isAdmin = currentStaff.role === "admin";
  const isManager = currentStaff.role === "manager";

  // Check RBAC permission
  const canViewExpenses =
    isSuperAdmin ||
    isAdmin ||
    isManager ||
    (await hasServerPermission("expenses.view"));

  if (!canViewExpenses) {
    redirect("/admin/unauthorized");
  }

  const canApprove = isSuperAdmin || isAdmin || isManager;
  const canManageCategories = isSuperAdmin || isAdmin;

  const supabase = createAdminClient();

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
  const { data: categoriesData, error: catError } = await supabase
    .from("expense_categories")
    .select("*")
    .order("name", { ascending: true });

  const categories: ExpenseCategory[] =
    catError || !categoriesData || categoriesData.length === 0
      ? DEFAULT_CATEGORIES
      : categoriesData;

  // 3. Fetch Staff List (for reimbursement assignee and requester names)
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

  // 4. Fetch Expenses with payments and attachments
  let expQuery = supabase
    .from("expenses")
    .select(
      `
      *,
      category:expense_categories(id, name, color, requires_receipt, requires_approval),
      branch:branches(id, name),
      creator:staff!expenses_requested_by_fkey(id, full_name),
      approver:staff!expenses_approved_by_fkey(id, full_name),
      reimbursement_emp:staff!expenses_employee_id_fkey(id, full_name),
      payments:expense_payments(*),
      attachments:expense_attachments(*),
      audit_logs:expense_audit_logs(*)
    `
    )
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  // Branch isolation: non-super admins only see their assigned branch expenses
  if (!isSuperAdmin && currentStaff.branchId) {
    expQuery = expQuery.eq("branch_id", currentStaff.branchId);
  }

  const { data: expensesData, error: expError } = await expQuery;

  let expenses: ExpenseItem[] = [];
  if (!expError && expensesData && expensesData.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expenses = expensesData.map((e: any) => {
      const categoryObj = Array.isArray(e.category) ? e.category[0] : e.category;
      const branchObj = Array.isArray(e.branch) ? e.branch[0] : e.branch;
      const creatorObj = Array.isArray(e.creator) ? e.creator[0] : e.creator;
      const approverObj = Array.isArray(e.approver) ? e.approver[0] : e.approver;
      const empObj = Array.isArray(e.reimbursement_emp) ? e.reimbursement_emp[0] : e.reimbursement_emp;

      const paymentsList = Array.isArray(e.payments) ? e.payments : [];
      const totalPaid = paymentsList
        .filter((p: { is_reversed: boolean; amount: number }) => !p.is_reversed)
        .reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0);

      const targetTotal = Number(e.approved_amount || e.total_amount);
      const balance = Math.max(0, targetTotal - totalPaid);

      return {
        ...e,
        amount_before_tax: Number(e.amount_before_tax || e.total_amount || 0),
        tax_amount: Number(e.tax_amount || 0),
        total_amount: Number(e.total_amount || 0),
        approved_amount: e.approved_amount ? Number(e.approved_amount) : null,
        total_paid: totalPaid,
        outstanding_balance: balance,
        category: categoryObj,
        branch_name: branchObj?.name || "Main Clinic",
        requested_by_name: creatorObj?.full_name || "Staff Member",
        approved_by_name: approverObj?.full_name || null,
        employee_name: empObj?.full_name || null,
        payments: paymentsList,
        attachments: Array.isArray(e.attachments) ? e.attachments : [],
        audit_logs: Array.isArray(e.audit_logs) ? e.audit_logs : [],
      };
    });
  }

  // 5. Fetch Petty Cash Funds
  const { data: fundsData } = await supabase
    .from("petty_cash_funds")
    .select("*, branch:branches(id, name)");

  let pettyCashFunds: PettyCashFund[] = [];
  if (fundsData && fundsData.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pettyCashFunds = fundsData.map((f: any) => ({
      ...f,
      current_balance: Number(f.current_balance),
      target_float: Number(f.target_float),
      branch_name: (Array.isArray(f.branch) ? f.branch[0] : f.branch)?.name || "Branch",
    }));
  } else {
    pettyCashFunds = branches.map((b) => ({
      id: `fund-${b.id}`,
      branch_id: b.id,
      current_balance: 5000.0,
      target_float: 5000.0,
      last_replenished_at: new Date().toISOString(),
      branch_name: b.name,
    }));
  }

  return (
    <ExpensesClient
      initialExpenses={expenses}
      categories={categories}
      pettyCashFunds={pettyCashFunds}
      branches={branches}
      staffList={staffList}
      currentStaffBranchId={currentStaff.branchId}
      currentStaffId={currentStaff.id}
      isSuperAdmin={isSuperAdmin}
      canApprove={canApprove}
      canManageCategories={canManageCategories}
      initialTab={params.tab || "all"}
    />
  );
}
