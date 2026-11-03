"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth";
import { hasServerPermission } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

export async function createAnnouncement(data: {
  title: string;
  content: string;
  priority: "normal" | "important" | "urgent";
  target_audience: "all" | "cashier" | "staff" | "therapist" | "manager";
  branch_id?: string | null;
  is_pinned?: boolean;
}) {
  const staff = await requireStaff();
  const canCreate = await hasServerPermission("announcements.create");
  if (!canCreate && staff.role !== "super_admin" && staff.role !== "admin" && staff.role !== "manager") {
    return { error: "Forbidden: You do not have permission to publish announcements." };
  }

  const { title, content, priority, target_audience, branch_id, is_pinned } = data;
  if (!title?.trim()) return { error: "Title is required." };
  if (!content?.trim()) return { error: "Content is required." };

  const supabase = createAdminClient();

  const authorName = staff.fullName || "Admin Staff";

  const { data: newAnnouncement, error: insertError } = await supabase
    .from("announcements")
    .insert({
      title: title.trim(),
      content: content.trim(),
      priority: priority || "normal",
      target_audience: target_audience || "all",
      branch_id: branch_id || null,
      author_id: staff.id,
      author_name: authorName,
      is_pinned: is_pinned ?? false,
      is_active: true,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Failed to insert announcement:", insertError);
    return { error: insertError.message };
  }

  // System audit log
  await supabase.from("audit_logs").insert({
    user_id: staff.id,
    action: "CREATE_ANNOUNCEMENT",
    resource_type: "announcements",
    resource_id: newAnnouncement.id,
    metadata: {
      title,
      priority,
      target_audience,
      branch_id,
    },
  });

  revalidatePath("/admin/announcements");
  revalidatePath("/admin");

  return { success: true, announcement: newAnnouncement };
}

export async function updateAnnouncement(
  id: string,
  data: {
    title: string;
    content: string;
    priority: "normal" | "important" | "urgent";
    target_audience: "all" | "cashier" | "staff" | "therapist" | "manager";
    branch_id?: string | null;
    is_pinned?: boolean;
    is_active?: boolean;
  }
) {
  const staff = await requireStaff();
  const canEdit = await hasServerPermission("announcements.edit");
  if (!canEdit && staff.role !== "super_admin" && staff.role !== "admin" && staff.role !== "manager") {
    return { error: "Forbidden: You do not have permission to edit announcements." };
  }

  const { title, content, priority, target_audience, branch_id, is_pinned, is_active } = data;
  if (!title?.trim()) return { error: "Title is required." };
  if (!content?.trim()) return { error: "Content is required." };

  const supabase = createAdminClient();

  const { data: updated, error: updateError } = await supabase
    .from("announcements")
    .update({
      title: title.trim(),
      content: content.trim(),
      priority,
      target_audience,
      branch_id: branch_id || null,
      is_pinned: is_pinned ?? false,
      is_active: is_active ?? true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    return { error: updateError.message };
  }

  await supabase.from("audit_logs").insert({
    user_id: staff.id,
    action: "UPDATE_ANNOUNCEMENT",
    resource_type: "announcements",
    resource_id: id,
    metadata: { title, priority, target_audience },
  });

  revalidatePath("/admin/announcements");
  revalidatePath("/admin");

  return { success: true, announcement: updated };
}

export async function togglePinAnnouncement(id: string, is_pinned: boolean) {
  const staff = await requireStaff();
  const canEdit = await hasServerPermission("announcements.edit");
  if (!canEdit && staff.role !== "super_admin" && staff.role !== "admin" && staff.role !== "manager") {
    return { error: "Forbidden: You do not have permission to pin announcements." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("announcements")
    .update({ is_pinned })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/announcements");
  return { success: true };
}

export async function deleteAnnouncement(id: string) {
  const staff = await requireStaff();
  const canDelete = await hasServerPermission("announcements.delete");
  if (!canDelete && staff.role !== "super_admin" && staff.role !== "admin") {
    return { error: "Forbidden: You do not have permission to delete announcements." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("announcements").delete().eq("id", id);

  if (error) return { error: error.message };

  await supabase.from("audit_logs").insert({
    user_id: staff.id,
    action: "DELETE_ANNOUNCEMENT",
    resource_type: "announcements",
    resource_id: id,
  });

  revalidatePath("/admin/announcements");
  revalidatePath("/admin");

  return { success: true };
}

