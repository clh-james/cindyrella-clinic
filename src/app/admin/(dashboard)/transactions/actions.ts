"use server";

import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { hasServerPermission } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

export async function voidTransaction(data: { id: string, type: "retail" | "appointment", reason: string }) {
  const staff = await requireStaff();
  const canVoid = await hasServerPermission("transactions.void");
  if (!canVoid && staff.role !== "super_admin" && staff.role !== "admin" && staff.role !== "manager") {
    return { error: "Forbidden: You do not have permission to void transactions." };
  }

  const supabase = await createClient();
  const { data: userAuth } = await supabase.auth.getUser();
  if (!userAuth.user) return { error: "Not authenticated" };

  const cleanReason = (data.reason || "Voided by management").trim().replace(/[\r\n]+/g, " ");

  if (data.type === "retail") {
    // 1. Mark as voided
    const { error: updateError } = await supabase
      .from("pos_sales")
      .update({ status: "voided", void_reason: cleanReason })
      .eq("id", data.id)
      .eq("status", "completed");

    if (updateError) return { error: "Failed to void transaction. It may already be voided." };

    // 2. Restore Inventory
    const { data: items } = await supabase
      .from("pos_sale_items")
      .select("item_id, quantity")
      .eq("sale_id", data.id);

    if (items) {
      for (const item of items) {
        await supabase.rpc('restock_inventory', { 
          p_item_id: item.item_id, 
          p_quantity: item.quantity,
          p_user_id: userAuth.user.id,
          p_reason: `Voided Retail Sale: ${cleanReason}`
        });
      }
    }
  } else {
    // Appointment / Walk-in Service
    const { data: appt, error: apptFetchErr } = await supabase
      .from("appointments")
      .select("id, reference_number, notes, payment_status, status")
      .eq("id", data.id)
      .single();

    if (apptFetchErr || !appt) {
      return { error: "Appointment not found." };
    }

    if (appt.payment_status === "voided" || appt.status === "cancelled") {
      return { error: "Transaction is already voided or cancelled." };
    }

    // Preserve existing serialized cart JSON and handler tags in notes
    const existingNotes = appt.notes || "";
    const updatedNotes = existingNotes
      ? `${existingNotes}\n[VOID_REASON:${cleanReason}]`
      : `[VOID_REASON:${cleanReason}]`;

    const { error: updateApptError } = await supabase
      .from("appointments")
      .update({ 
        payment_status: "voided", 
        status: "cancelled", 
        notes: updatedNotes 
      })
      .eq("id", data.id);
      
    if (updateApptError) return { error: updateApptError.message };

    // 2. Reverse inventory consumables used for this treatment
    try {
      const { reverseAppointmentInventory } = await import("@/lib/inventory/deduction");
      await reverseAppointmentInventory(data.id, userAuth.user.id, `Transaction voided: ${cleanReason}`);
    } catch (revErr) {
      console.error("Failed to reverse appointment inventory on void:", revErr);
    }

    // 3. Revoke auto-credited commission
    try {
      const supabaseAdmin = await import("@/lib/supabase/admin").then(m => m.createAdminClient());
      await supabaseAdmin
        .from("commission_records")
        .delete()
        .eq("source_id", data.id)
        .eq("source_type", "appointment");
    } catch (commErr) {
      console.error("Failed to revoke commission on void:", commErr);
    }
  }

  // 4. Log Audit Event
  const supabaseAdmin = await import("@/lib/supabase/admin").then(m => m.createAdminClient());
  await supabaseAdmin.from("audit_logs").insert({
    user_id: userAuth.user.id,
    action: "VOID_TRANSACTION",
    resource_type: data.type === "retail" ? "pos_sales" : "appointments",
    resource_id: data.id,
    metadata: { reason: cleanReason, voided_by: staff.fullName }
  });

  revalidatePath("/admin/transactions");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/payroll");
  return { success: true };
}
