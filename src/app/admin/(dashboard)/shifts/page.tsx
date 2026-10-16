import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ShiftsClient } from "./ShiftsClient";

export default async function ShiftsPage() {
  const user = await requireStaff();
  const supabase = await createClient();

  // Fetch branches for selection
  const { data: branches } = await supabase.from("branches").select("id, name");

  // Fetch shifts (last 50)
  const { data: shifts } = await supabase
    .from("cashier_shifts")
    .select("*, staff:cashier_id(full_name), branches:branch_id(name)")
    .order("created_at", { ascending: false })
    .limit(50);

  // Compute live cash sales for open shifts
  const processedShifts = await Promise.all((shifts || []).map(async (shift) => {
    if (shift.status !== "open") return shift;

    // 1. Walk-in clinic treatments (appointments paid in cash)
    const { data: apptSales } = await supabase
      .from("appointments")
      .select("amount_due")
      .eq("branch_id", shift.branch_id)
      .eq("payment_method", "cash")
      .eq("payment_status", "paid")
      .neq("status", "cancelled")
      .gte("created_at", shift.opened_at);

    // 2. POS retail product sales (paid in cash)
    const { data: posSales } = await supabase
      .from("pos_sales")
      .select("total_amount")
      .eq("branch_id", shift.branch_id)
      .eq("payment_method", "cash")
      .gte("created_at", shift.opened_at);

    const apptCash = (apptSales || []).reduce((sum, a) => sum + (a.amount_due || 0), 0);
    const posCash = (posSales || []).reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const liveCashSales = apptCash + posCash;
    const liveExpectedCash = (shift.starting_cash || 0) + liveCashSales - (shift.cash_refunds || 0);

    return {
      ...shift,
      cash_sales: liveCashSales,
      expected_cash: liveExpectedCash,
    };
  }));

  return (
    <ShiftsClient 
      branches={branches || []} 
      initialShifts={processedShifts || []} 
      currentUserId={user.id}
      currentUserRole={user.role || ""}
      currentUserBranchId={user.branchId || ""}
    />
  );
}
