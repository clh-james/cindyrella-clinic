/* eslint-disable @typescript-eslint/no-explicit-any */
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
    resource_type: "cashier_shifts",
    resource_id: newShift.id,
    user_id: userAuth.user.id,
    branch_id: data.branchId,
    metadata: { opening_cash: data.startingCash }
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

  // Calculate expected cash (Starting Cash + All Cash transactions by this cashier/branch since opened_at)
  // 1. Walk-in Clinic Treatments / Services (appointments paid in cash, completed/paid, not cancelled)
  const { data: apptSales } = await supabase
    .from("appointments")
    .select("amount_due")
    .eq("branch_id", shift.branch_id)
    .eq("payment_method", "cash")
    .eq("payment_status", "paid")
    .neq("status", "cancelled")
    .gte("created_at", shift.opened_at)
    .lte("created_at", now);

  const apptCash = (apptSales || []).reduce((acc, a) => acc + (a.amount_due || 0), 0);

  // 2. POS Retail Sales (CASH only)
  const { data: posSales } = await supabase
    .from("pos_sales")
    .select("total_amount")
    .eq("branch_id", shift.branch_id)
    .eq("payment_method", "cash")
    .gte("created_at", shift.opened_at)
    .lte("created_at", now);

  const posCash = (posSales || []).reduce((acc, sale) => acc + (sale.total_amount || 0), 0);
  
  const cashSales = apptCash + posCash;
  const cashRefunds = 0; // Assuming 0 for now as refunds are not fully implemented

  // 3. Physical Cash Disbursements / Operating Expenses paid from drawer during this shift
  let cashDisbursements = 0;
  try {
    const { data: drawerExpenses } = await supabase
      .from("expense_payments")
      .select("amount")
      .eq("shift_id", shift.id)
      .eq("payment_method", "cashier_drawer")
      .eq("is_reversed", false);

    cashDisbursements = (drawerExpenses || []).reduce((acc: number, p: { amount: number }) => acc + (Number(p.amount) || 0), 0);
  } catch {
    // If expense_payments not yet populated
    cashDisbursements = Number(shift.cash_disbursements || 0);
  }

  const expectedCash = shift.starting_cash + cashSales - cashRefunds - cashDisbursements;
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
      cash_refunds: cashRefunds,
      cash_disbursements: cashDisbursements,
    })
    .eq("id", data.shiftId);

  if (updateError) {
    return { error: updateError.message };
  }

  // Audit log
  await supabase.from("audit_logs").insert({
    action: status === "closed" ? "SHIFT_CLOSED" : "SHIFT_VARIANCE_CREATED",
    resource_type: "cashier_shifts",
    resource_id: shift.id,
    user_id: userAuth.user.id,
    branch_id: shift.branch_id,
    metadata: { expected: expectedCash, actual: data.actualCash, variance: variance, notes: data.notes, reason: data.reason }
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
    resource_type: "cashier_shifts",
    resource_id: shiftId,
    user_id: userAuth.user.id,
    branch_id: shift.branch_id,
    metadata: { approved_variance: shift.variance }
  });

  revalidatePath("/admin/shifts");
  return { success: true };
}

export async function getShiftTransactions(shiftId: string) {
  const supabase = await createClient();

  const { data: shift, error: shiftErr } = await supabase
    .from("cashier_shifts")
    .select("id, branch_id, opened_at, closed_at, cashier_id")
    .eq("id", shiftId)
    .single();

  if (shiftErr || !shift) return { error: "Shift not found" };

  // 1. Appointments (clinic treatments)
  let apptQuery = supabase
    .from("appointments")
    .select(`
      id, reference_number, appointment_date, appointment_time, payment_status, payment_method, amount_due, status, created_at,
      customers(first_name, last_name, phone),
      treatments(name)
    `)
    .eq("branch_id", shift.branch_id)
    .gte("created_at", shift.opened_at);

  if (shift.closed_at) {
    apptQuery = apptQuery.lte("created_at", shift.closed_at);
  }

  const { data: appts } = await apptQuery;

  // 2. POS Retail Sales
  let posQuery = supabase
    .from("pos_sales")
    .select(`
      id, reference_number, created_at, payment_method, status, total_amount,
      customers(first_name, last_name, phone),
      items:pos_sale_items(quantity, price_per_unit, item:inventory_items(name))
    `)
    .eq("branch_id", shift.branch_id)
    .gte("created_at", shift.opened_at);

  if (shift.closed_at) {
    posQuery = posQuery.lte("created_at", shift.closed_at);
  }

  const { data: posSales } = await posQuery;

  // Format into unified transactions
  const formattedAppts = (appts || []).map((a: any) => ({
    id: a.id,
    type: "treatment" as const,
    reference_number: a.reference_number || "N/A",
    created_at: a.created_at,
    customer_name: a.customers ? `${a.customers.first_name || ""} ${a.customers.last_name || ""}`.trim() : "Walk-in Guest",
    customer_phone: a.customers?.phone || "",
    description: a.treatments?.name || "Clinic Treatment",
    payment_method: a.payment_method || "cash",
    amount: a.amount_due || 0,
    status: a.payment_status === "voided" || a.status === "cancelled" ? "voided" : a.payment_status || "paid",
  }));

  const formattedPos = (posSales || []).map((s: any) => ({
    id: s.id,
    type: "retail" as const,
    reference_number: s.reference_number || "N/A",
    created_at: s.created_at,
    customer_name: s.customers ? `${s.customers.first_name || ""} ${s.customers.last_name || ""}`.trim() : "Retail Customer",
    customer_phone: s.customers?.phone || "",
    description: s.items && s.items.length > 0 
      ? s.items.map((i: any) => `${i.item?.name || "Product"} (x${i.quantity})`).join(", ")
      : "POS Retail Sale",
    payment_method: s.payment_method || "cash",
    amount: s.total_amount || 0,
    status: s.status || "completed",
  }));

  const all = [...formattedAppts, ...formattedPos].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return { transactions: all };
}

export async function getShiftAuditLogs(shiftId: string) {
  const supabase = await createClient();

  // 1. Fetch shift info
  const { data: shift, error: shiftErr } = await supabase
    .from("cashier_shifts")
    .select("*, cashier:cashier_id(id, full_name), branch:branch_id(name)")
    .eq("id", shiftId)
    .single();

  if (shiftErr || !shift) return { error: "Shift not found" };

  // 2. Fetch staff for display name resolution
  const { data: staffList } = await supabase.from("staff").select("id, full_name");
  const staffMap: Record<string, string> = {};
  (staffList || []).forEach((s: any) => {
    staffMap[s.id] = s.full_name;
  });

  // 3. Fetch explicit audit logs for this shift
  const { data: rawLogs } = await supabase
    .from("audit_logs")
    .select("*")
    .or(`resource_id.eq.${shift.id},metadata->>shift_id.eq.${shift.id}`)
    .order("created_at", { ascending: false });

  // 4. Fetch voids that took place in this branch during this shift window
  let voidQuery = supabase
    .from("audit_logs")
    .select("*")
    .eq("action", "VOID_TRANSACTION")
    .gte("created_at", shift.opened_at);

  if (shift.closed_at) {
    voidQuery = voidQuery.lte("created_at", shift.closed_at);
  }

  const { data: voidLogs } = await voidQuery;

  // Synthesize lifecycle events if missing in audit_logs
  const timeline: Array<{
    id: string;
    action: string;
    user_name: string;
    created_at: string;
    details: any;
  }> = [];

  // Opening event
  timeline.push({
    id: `open-${shift.id}`,
    action: "SHIFT_OPENED",
    user_name: shift.cashier?.full_name || staffMap[shift.cashier_id] || "Cashier",
    created_at: shift.opened_at,
    details: {
      opening_cash: shift.starting_cash,
      branch: shift.branch?.name || "Clinic",
    },
  });

  // Void events
  (voidLogs || []).forEach((v: any) => {
    timeline.push({
      id: v.id,
      action: "VOID_TRANSACTION",
      user_name: staffMap[v.user_id] || "Staff",
      created_at: v.created_at,
      details: {
        reason: v.metadata?.reason || "No reason specified",
        target_id: v.resource_id,
        resource_type: v.resource_type,
      },
    });
  });

  // Explicit logs (avoid duplicates)
  (rawLogs || []).forEach((l: any) => {
    if (l.action !== "SHIFT_OPENED") {
      timeline.push({
        id: l.id,
        action: l.action,
        user_name: staffMap[l.user_id] || "Staff",
        created_at: l.created_at,
        details: l.metadata || {},
      });
    }
  });

  // Closing event if closed
  if (shift.closed_at) {
    timeline.push({
      id: `close-${shift.id}`,
      action: "SHIFT_CLOSED",
      user_name: staffMap[shift.closed_by || shift.cashier_id] || "Staff",
      created_at: shift.closed_at,
      details: {
        actual_cash: shift.actual_cash,
        expected_cash: shift.expected_cash,
        variance: shift.variance,
        reason: shift.variance_reason,
        notes: shift.notes,
      },
    });
  }

  // Sort chronological descending
  timeline.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return { timeline };
}

