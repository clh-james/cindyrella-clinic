"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function openShift(data: { startingCash: number, branchId: string }) {
  const supabase = await createClient();
  const { data: userAuth } = await supabase.auth.getUser();
  if (!userAuth.user) return { error: "Not authenticated" };

  // Check if already has an open shift
  const { data: existing } = await supabase
    .from("cashier_shifts")
    .select("id")
    .eq("cashier_id", userAuth.user.id)
    .in("status", ["open", "variance_review", "investigation"])
    .single();

  if (existing) {
    return { error: "You already have an open shift or a shift pending review. Please close it first." };
  }

  const { error, data: newShift } = await supabase
    .from("cashier_shifts")
    .insert({
      cashier_id: userAuth.user.id,
      branch_id: data.branchId,
      starting_cash: data.startingCash,
      status: "open"
    }).select().single();

  if (error) {
    return { error: error.message };
  }

  // Audit log
  await supabase.from("audit_logs").insert({
    action: "SHIFT_OPENED",
    entity: "cashier_shifts",
    entity_id: newShift.id,
    performed_by: userAuth.user.id,
    branch_id: data.branchId,
    details: { opening_cash: data.startingCash }
  });

  revalidatePath("/admin/shifts");
  return { success: true, shift: newShift };
}

export async function closeShift(data: { shiftId: string, actualCash: number, notes?: string, reason?: string }) {
  const supabase = await createClient();
  const { data: userAuth } = await supabase.auth.getUser();
  if (!userAuth.user) return { error: "Not authenticated" };

  // Fetch the shift
  const { data: shift, error: shiftError } = await supabase
    .from("cashier_shifts")
    .select("*")
    .eq("id", data.shiftId)
    .single();

  if (shiftError || !shift) return { error: "Shift not found." };
  if (shift.status !== "open") return { error: "Shift is not open." };

  const now = new Date().toISOString();

  // Calculate expected cash (Starting Cash + All Cash transactions by this cashier since opened_at)
  // 1. POS Retail Sales (CASH only)
  const { data: posSales } = await supabase
    .from("pos_sales")
    .select("total_amount")
    .eq("created_by", shift.cashier_id)
    .eq("payment_method", "cash")
    .gte("created_at", shift.opened_at)
    .lte("created_at", now);

  const posCash = (posSales || []).reduce((acc, sale) => acc + (sale.total_amount || 0), 0);
  
  // Note: in a real implementation we would also query appointments/walkins here if they use a different table.
  const cashSales = posCash;
  const cashRefunds = 0; // Assuming 0 for now as refunds are not fully implemented

  const expectedCash = shift.starting_cash + cashSales - cashRefunds;
  const variance = data.actualCash - expectedCash;
  const status = variance === 0 ? "closed" : "variance_review";

  const { error: updateError } = await supabase
    .from("cashier_shifts")
    .update({
      closed_at: now,
      closed_by: userAuth.user.id,
      status: status,
      actual_cash: data.actualCash,
      expected_cash: expectedCash,
      variance: variance,
      notes: data.notes,
      variance_reason: data.reason,
      cash_sales: cashSales,
      cash_refunds: cashRefunds
    })
    .eq("id", data.shiftId);

  if (updateError) {
    return { error: updateError.message };
  }

  // Audit log
  await supabase.from("audit_logs").insert({
    action: status === "closed" ? "SHIFT_CLOSED" : "SHIFT_VARIANCE_CREATED",
    entity: "cashier_shifts",
    entity_id: shift.id,
    performed_by: userAuth.user.id,
    branch_id: shift.branch_id,
    details: { expected: expectedCash, actual: data.actualCash, variance: variance, notes: data.notes }
  });

  revalidatePath("/admin/shifts");
  return { success: true, variance, status };
}

export async function approveVariance(shiftId: string) {
  const supabase = await createClient();
  const { data: userAuth } = await supabase.auth.getUser();
  if (!userAuth.user) return { error: "Not authenticated" };

  const { data: shift } = await supabase.from("cashier_shifts").select("*").eq("id", shiftId).single();
  if (!shift || shift.status !== "variance_review") return { error: "Shift not found or not in review." };
  if (shift.cashier_id === userAuth.user.id) return { error: "You cannot approve your own variance." };

  const { error } = await supabase.from("cashier_shifts").update({ status: "closed" }).eq("id", shiftId);
  if (error) return { error: error.message };

  await supabase.from("audit_logs").insert({
    action: "SHIFT_VARIANCE_APPROVED",
    entity: "cashier_shifts",
    entity_id: shiftId,
    performed_by: userAuth.user.id,
    branch_id: shift.branch_id,
    details: {}
  });

  revalidatePath("/admin/shifts");
  return { success: true };
}
