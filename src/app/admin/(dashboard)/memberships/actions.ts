"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth";
import { hasServerPermission } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

export async function adjustCustomerPoints(data: {
  customerId: string;
  pointsDelta: number;
  reason: string;
  referenceId?: string;
}) {
  const staff = await requireStaff();
  const canEdit = await hasServerPermission("memberships.edit");
  if (!canEdit && staff.role !== "super_admin" && staff.role !== "admin" && staff.role !== "manager" && staff.role !== "cashier") {
    return { error: "Forbidden: You do not have permission to adjust loyalty points." };
  }

  const { customerId, pointsDelta, reason, referenceId } = data;
  if (!customerId) return { error: "Customer ID is required." };
  if (!pointsDelta || pointsDelta === 0) return { error: "Points change must be a non-zero number." };
  if (!reason?.trim()) return { error: "Reason for points adjustment is required." };

  const supabase = createAdminClient();

  // 1. Fetch current points
  const { data: customer, error: fetchErr } = await supabase
    .from("customers")
    .select("id, first_name, last_name, loyalty_points, customer_code")
    .eq("id", customerId)
    .single();

  if (fetchErr || !customer) {
    return { error: "Customer not found." };
  }

  const currentPoints = Number(customer.loyalty_points || 0);
  const newPoints = Math.max(0, currentPoints + pointsDelta);

  // 2. Update customer record
  const { error: updateErr } = await supabase
    .from("customers")
    .update({ loyalty_points: newPoints })
    .eq("id", customerId);

  if (updateErr) {
    console.error("Failed to update loyalty points:", updateErr);
    return { error: updateErr.message };
  }

  // 3. Try inserting into loyalty_points_ledger
  try {
    await supabase.from("loyalty_points_ledger").insert({
      customer_id: customerId,
      staff_id: staff.id,
      points_change: pointsDelta,
      balance_after: newPoints,
      action_type: pointsDelta > 0 ? "MANUAL_BONUS" : "REDEMPTION",
      reference_id: referenceId || null,
      reason: reason.trim(),
    });
  } catch (ledgerErr) {
    // Graceful fallback if table is waiting for migration
    console.warn("loyalty_points_ledger insert omitted:", ledgerErr);
  }

  // 4. Log to client_audit_logs
  await supabase.from("client_audit_logs").insert({
    action: "LOYALTY_POINTS_ADJUSTED",
    customer_id: customerId,
    actor_id: staff.id,
    metadata: {
      actor: staff.fullName || staff.email,
      points_delta: pointsDelta,
      old_points: currentPoints,
      new_points: newPoints,
      reason: reason.trim(),
      reference_id: referenceId || null,
      client_name: `${customer.first_name} ${customer.last_name}`.trim(),
      client_code: customer.customer_code,
    },
  });

  // 5. System audit log
  await supabase.from("audit_logs").insert({
    user_id: staff.id,
    action: "ADJUST_LOYALTY_POINTS",
    resource_type: "customers",
    resource_id: customerId,
    metadata: {
      points_delta: pointsDelta,
      old_points: currentPoints,
      new_points: newPoints,
      reason: reason.trim(),
    },
  });

  revalidatePath("/admin/memberships");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/pos");

  return { success: true, newPoints };
}

export async function assignMemberTier(data: {
  customerId: string;
  tierId: string;
  cardNumber?: string;
  expiryDate?: string | null;
  notes?: string;
}) {
  const staff = await requireStaff();
  const canEdit = await hasServerPermission("memberships.edit");
  if (!canEdit && staff.role !== "super_admin" && staff.role !== "admin" && staff.role !== "manager") {
    return { error: "Forbidden: You do not have permission to assign membership tiers." };
  }

  const { customerId, tierId, cardNumber, expiryDate, notes } = data;
  if (!customerId) return { error: "Customer ID is required." };
  if (!tierId) return { error: "Tier selection is required." };

  const supabase = createAdminClient();

  const { data: customer, error: fetchErr } = await supabase
    .from("customers")
    .select("id, first_name, last_name, customer_code, client_classification")
    .eq("id", customerId)
    .single();

  if (fetchErr || !customer) {
    return { error: "Customer not found." };
  }

  const assignedCardNumber =
    cardNumber?.trim() ||
    customer.customer_code ||
    `CY-VIP-${customer.id.slice(0, 6).toUpperCase()}`;

  // Update customer classification & card number
  const { error: updateErr } = await supabase
    .from("customers")
    .update({
      client_classification: tierId,
      customer_code: assignedCardNumber,
    })
    .eq("id", customerId);

  if (updateErr) {
    console.error("Failed to update member tier:", updateErr);
    return { error: updateErr.message };
  }

  // Also try customer_memberships if exists
  try {
    await supabase.from("customer_memberships").upsert({
      customer_id: customerId,
      tier_id: tierId,
      card_number: assignedCardNumber,
      expiry_date: expiryDate || null,
      notes: notes?.trim() || null,
      status: "active",
      updated_at: new Date().toISOString(),
    }, { onConflict: "customer_id" });
  } catch (mErr) {
    console.warn("customer_memberships upsert omitted:", mErr);
  }

  // Audit log
  await supabase.from("client_audit_logs").insert({
    action: "MEMBERSHIP_TIER_UPDATED",
    customer_id: customerId,
    actor_id: staff.id,
    metadata: {
      actor: staff.fullName || staff.email,
      old_tier: customer.client_classification,
      new_tier: tierId,
      card_number: assignedCardNumber,
      expiry_date: expiryDate || null,
      notes: notes || null,
      client_name: `${customer.first_name} ${customer.last_name}`.trim(),
    },
  });

  revalidatePath("/admin/memberships");
  revalidatePath("/admin/customers");
  revalidatePath("/admin/pos");

  return { success: true, cardNumber: assignedCardNumber };
}

export async function issueVipCard(customerId: string) {
  const staff = await requireStaff();
  const canEdit = await hasServerPermission("memberships.edit");
  if (!canEdit && staff.role !== "super_admin" && staff.role !== "admin" && staff.role !== "manager") {
    return { error: "Forbidden: You do not have permission to issue VIP cards." };
  }

  const supabase = createAdminClient();

  const { data: customer, error: fetchErr } = await supabase
    .from("customers")
    .select("id, first_name, last_name, customer_code")
    .eq("id", customerId)
    .single();

  if (fetchErr || !customer) {
    return { error: "Customer not found." };
  }

  const newCardNumber = `CY-VIP-${customer.id.slice(0, 6).toUpperCase()}`;

  const { error: updateErr } = await supabase
    .from("customers")
    .update({ customer_code: newCardNumber })
    .eq("id", customerId);

  if (updateErr) {
    return { error: updateErr.message };
  }

  await supabase.from("client_audit_logs").insert({
    action: "VIP_CARD_ISSUED",
    customer_id: customerId,
    actor_id: staff.id,
    metadata: {
      actor: staff.fullName || staff.email,
      card_number: newCardNumber,
      client_name: `${customer.first_name} ${customer.last_name}`.trim(),
    },
  });

  revalidatePath("/admin/memberships");
  revalidatePath("/admin/customers");

  return { success: true, cardNumber: newCardNumber };
}

