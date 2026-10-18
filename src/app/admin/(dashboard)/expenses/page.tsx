import { requireStaff } from "@/lib/auth";
import { hasServerPermission } from "@/lib/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { ExpensesClient } from "./ExpensesClient";
import {
  ExpenseItem,
  ExpenseCategory,
  PettyCashFund,
  BranchInfo,
} from "./types";

export const metadata = {
  title: "Clinic Expenses — Cindyrella Admin",
  description: "Operating disbursements, petty cash vouchers, clinical supplies, and facility overheads.",
};

const DEFAULT_CATEGORIES: ExpenseCategory[] = [
  { id: "cat-1", name: "Clinical Supplies & Consumables", color: "#0284C7", is_active: true },
  { id: "cat-2", name: "Utilities & High-Speed Internet", color: "#D97706", is_active: true },
  { id: "cat-3", name: "Rent & Facility Maintenance", color: "#4F46E5", is_active: true },
  { id: "cat-4", name: "Petty Cash Disbursements", color: "#10B981", is_active: true },
  { id: "cat-5", name: "Marketing & Promotions", color: "#EC4899", is_active: true },
  { id: "cat-6", name: "Professional & Doctor Fees", color: "#8B5CF6", is_active: true },
  { id: "cat-7", name: "Staff Welfare & Meals", color: "#F59E0B", is_active: true },
  { id: "cat-8", name: "Office & POS Supplies", color: "#64748B", is_active: true },
  { id: "cat-9", name: "Equipment Repairs & Maintenance", color: "#DC2626", is_active: true },
  { id: "cat-10", name: "Miscellaneous Operating Costs", color: "#6B7280", is_active: true },
];

export default async function ExpensesPage() {
  const currentStaff = await requireStaff();

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

  const branches: BranchInfo[] = (branchesData || []).map((b) => ({
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

  // 3. Fetch Expenses
  let expQuery = supabase
    .from("expenses")
    .select(
      `
      *,
      category:expense_categories(id, name, color),
      branch:branches(id, name),
      creator:staff!expenses_created_by_fkey(id, full_name),
      approver:staff!expenses_approved_by_fkey(id, full_name)
    `
    )
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  // Branch isolation: non-super admins only see their assigned branch expenses
  if (!isSuperAdmin && currentStaff.branchId) {
    expQuery = expQuery.eq("branch_id", currentStaff.branchId);
  }

  const { data: expensesData, error: expError } = await expQuery;

  // Fallback demo/mock expense if table doesn't have rows yet
  let expenses: ExpenseItem[] = [];
  if (!expError && expensesData && expensesData.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expenses = expensesData.map((e: any) => ({
      ...e,
      category: Array.isArray(e.category) ? e.category[0] : e.category,
      branch: Array.isArray(e.branch) ? e.branch[0] : e.branch,
      creator: Array.isArray(e.creator) ? e.creator[0] : e.creator,
      approver: Array.isArray(e.approver) ? e.approver[0] : e.approver,
    }));
  } else if (!expError && (!expensesData || expensesData.length === 0)) {
    // Initial seeded sample
    const nowStr = new Date().toISOString().slice(0, 10);
    expenses = [
      {
        id: "exp-sample-1",
        expense_number: "EXP-202610-SAMPLE1",
        branch_id: currentStaff.branchId || branches[0]?.id || null,
        category_id: categories[0]?.id || "cat-1",
        title: "Clinical Sterile Gloves & Syringe Consumables",
        description: "5 boxes nitrile gloves, 2 boxes sterile 1ml syringes for aesthetic treatments",
        amount: 3250.0,
        expense_date: nowStr,
        payment_method: "cash",
        reference_number: "OR-88412",
        vendor_or_payee: "Medline Medical Supplies",
        receipt_url: null,
        status: "approved",
        is_petty_cash: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        category: categories[0] || null,
        branch: branches[0] ? { id: branches[0].id, name: branches[0].name } : null,
        creator: { id: currentStaff.id, full_name: currentStaff.fullName },
        approver: { id: currentStaff.id, full_name: "Super Admin" },
        approved_at: new Date().toISOString(),
      },
    ];
  }

  // 4. Fetch Petty Cash Funds
  const { data: fundsData } = await supabase
    .from("petty_cash_funds")
    .select("*, branch:branches(id, name)");

  let pettyCashFunds: PettyCashFund[] = [];
  if (fundsData && fundsData.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pettyCashFunds = fundsData.map((f: any) => ({
      ...f,
      branch: Array.isArray(f.branch) ? f.branch[0] : f.branch,
    }));
  } else {
    pettyCashFunds = branches.map((b) => ({
      id: `fund-${b.id}`,
      branch_id: b.id,
      current_balance: 5000.0,
      target_float: 5000.0,
      last_replenished_at: new Date().toISOString(),
      branch: { id: b.id, name: b.name },
    }));
  }

  return (
    <ExpensesClient
      initialExpenses={expenses}
      categories={categories}
      pettyCashFunds={pettyCashFunds}
      branches={branches}
      currentStaffBranchId={currentStaff.branchId}
      canApprove={canApprove}
      canManageCategories={canManageCategories}
    />
  );
}
