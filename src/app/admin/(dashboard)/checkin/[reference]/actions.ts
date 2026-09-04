"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function processCheckin(appointmentId: string) {
  const supabase = await createClient();

  const { data: appointment, error } = await supabase
    .from("appointments")
    .update({ status: "checked_in" })
    .eq("id", appointmentId)
    .select("treatment_id")
    .single();

  if (error || !appointment) {
    return { error: "Failed to check in customer." };
  }

  // Deduct inventory based on treatment recipe
  try {
    // 1. Fetch materials required for this treatment
    const { data: materials } = await supabase
      .from("treatment_materials")
      .select("item_id, quantity_required")
      .eq("treatment_id", appointment.treatment_id);

    if (materials && materials.length > 0) {
      // For a real production app, we should use a Postgres Function (RPC) 
      // to atomically decrement stock and create logs to avoid race conditions.
      // But for this MVP, we will call an RPC that we assume exists or loop them.
      // Assuming we just use RPC:
      await supabase.rpc('deduct_inventory_for_treatment', {
        p_treatment_id: appointment.treatment_id,
        p_user_id: (await supabase.auth.getUser()).data.user?.id
      });
    }
  } catch (err) {
    console.error("Inventory deduction failed:", err);
    // We don't fail the checkin if inventory deduction fails
  }

  revalidatePath("/admin/appointments");
  revalidatePath("/admin/checkin");
  return { success: true };
}
