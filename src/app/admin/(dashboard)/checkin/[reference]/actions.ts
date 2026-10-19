"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { deductAppointmentInventory } from "@/lib/inventory/deduction";

export async function processCheckin(appointmentId: string) {
  const supabase = await createClient();

  const { data: appointment, error } = await supabase
    .from("appointments")
    .update({ status: "checked_in" })
    .eq("id", appointmentId)
    .select("treatment_id, branch_id")
    .single();

  if (error || !appointment) {
    return { error: "Failed to check in customer." };
  }

  // Deduct inventory based on treatment recipe
  try {
    const user = (await supabase.auth.getUser()).data.user;
    await deductAppointmentInventory(appointmentId, user?.id);
  } catch (err) {
    console.error("Inventory deduction failed:", err);
  }

  revalidatePath("/admin/appointments");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/checkin");
  return { success: true };
}
