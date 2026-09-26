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
    .eq("status", "open")
    .single();

  if (existing) {
    return { error: "You already have an open shift. Please close it first." };
  }

  const { error } = await supabase
    .from("cashier_shifts")
    .insert({
      cashier_id: userAuth.user.id,
      branch_id: data.branchId,
      starting_cash: data.startingCash,
      status: "open"
    });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/shifts");
  return { success: true };
}

export async function closeShift(data: { shiftId: string, actualCash: number, notes?: string }) {
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
  if (shift.status === "closed") return { error: "Shift is already closed." };

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

  // 2. Appointments / Walk-ins (CASH only)
  // Wait, appointments don't have created_by. We might just rely on POS Sales for now or assume all cash in branch? 
  // Let's assume walk-ins are done via POS, but appointments don't easily track which cashier checked them out unless we check audit logs.
  // We will do our best by checking appointments in the same branch that were updated to paid.
  // Actually, for a precise calculation we'd need `created_by` on appointments. For MVP, we'll just sum posSales cash, or maybe all cash in that branch during the shift.
  
  const expectedCash = shift.starting_cash + posCash;
  const variance = data.actualCash - expectedCash;

  const { error: updateError } = await supabase
    .from("cashier_shifts")
    .update({
      closed_at: now,
      status: "closed",
      actual_cash: data.actualCash,
      expected_cash: expectedCash,
      variance: variance,
      notes: data.notes
    })
    .eq("id", data.shiftId);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/admin/shifts");
  return { success: true };
}
