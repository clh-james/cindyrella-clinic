"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function markNotificationAsRead(id: string) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("staff_notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", id)
    .or(`recipient_id.eq.${staff.id},recipient_id.is.null`);

  if (error) return { error: error.message };

  revalidatePath("/admin/notifications");
  revalidatePath("/admin");
  return { success: true };
}

export async function markAllAsRead() {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("staff_notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .or(`recipient_id.eq.${staff.id},recipient_id.is.null`)
    .eq("is_read", false);

  if (error) return { error: error.message };

  revalidatePath("/admin/notifications");
  revalidatePath("/admin");
  return { success: true };
}

export async function deleteNotification(id: string) {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("staff_notifications")
    .delete()
    .eq("id", id)
    .or(`recipient_id.eq.${staff.id},recipient_id.is.null`);

  if (error) return { error: error.message };

  revalidatePath("/admin/notifications");
  revalidatePath("/admin");
  return { success: true };
}

export async function clearAllReadNotifications() {
  const staff = await requireStaff();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("staff_notifications")
    .delete()
    .or(`recipient_id.eq.${staff.id},recipient_id.is.null`)
    .eq("is_read", true);

  if (error) return { error: error.message };

  revalidatePath("/admin/notifications");
  revalidatePath("/admin");
  return { success: true };
}

