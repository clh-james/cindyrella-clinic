"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function voidTransaction(data: { id: string, type: "retail" | "appointment", reason: string }) {
  const supabase = await createClient();
  const { data: userAuth } = await supabase.auth.getUser();
  if (!userAuth.user) return { error: "Not authenticated" };

  if (data.type === "retail") {
    // 1. Mark as voided
    const { error: updateError } = await supabase
      .from("pos_sales")
      .update({ status: "voided", void_reason: data.reason })
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
          p_reason: 'Voided Retail Sale'
        });
      }
    }
  } else {
    // Appointment
    const { error } = await supabase
      .from("appointments")
      .update({ payment_status: "voided", status: "cancelled", notes: `VOID REASON: ${data.reason}` })
      .eq("id", data.id);
      
    if (error) return { error: error.message };
  }

  // 3. Log Audit Event
  await supabase.from("audit_logs").insert({
    user_id: userAuth.user.id,
    action: "VOID_TRANSACTION",
    resource_type: data.type === "retail" ? "pos_sales" : "appointments",
    resource_id: data.id,
    metadata: { reason: data.reason }
  });

  revalidatePath("/admin/transactions");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/inventory");
  return { success: true };
}
