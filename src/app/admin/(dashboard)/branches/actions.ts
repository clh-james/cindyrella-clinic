"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth";
import { hasServerPermission } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

export async function createBranch(data: {
  name: string;
  address?: string;
  phone?: string;
  is_active?: boolean;
}) {
  const staff = await requireStaff();
  const canCreate = await hasServerPermission("branches.create");
  if (!canCreate && staff.role !== "super_admin" && staff.role !== "admin") {
    return { error: "Forbidden: You do not have permission to create branches." };
  }

  const trimmedName = data.name.trim();
  if (!trimmedName) {
    return { error: "Branch name is required." };
  }

  const supabase = createAdminClient();

  // Check if branch name already exists
  const { data: existing } = await supabase
    .from("branches")
    .select("id")
    .ilike("name", trimmedName)
    .maybeSingle();

  if (existing) {
    return { error: "A branch with this name already exists." };
  }

  const { data: newBranch, error: insertError } = await supabase
    .from("branches")
    .insert({
      name: trimmedName,
      address: data.address?.trim() || null,
      phone: data.phone?.trim() || null,
      is_active: data.is_active ?? true,
    })
    .select()
    .single();

  if (insertError || !newBranch) {
    console.error("Failed to create branch:", insertError);
    return { error: insertError?.message || "Failed to create branch." };
  }

  // Audit log
  await supabase.from("audit_logs").insert({
    user_id: staff.id,
    action: "CREATE_BRANCH",
    resource_type: "branches",
    resource_id: newBranch.id,
    metadata: {
      name: newBranch.name,
      address: newBranch.address,
      phone: newBranch.phone,
      is_active: newBranch.is_active,
    },
  });

  revalidatePath("/admin/branches");
  revalidatePath("/admin/pos");
  revalidatePath("/admin/appointments");
  revalidatePath("/admin/staff");

  return { success: true, branch: newBranch };
}

export async function updateBranch(
  branchId: string,
  data: {
    name: string;
    address?: string;
    phone?: string;
    is_active?: boolean;
  }
) {
  const staff = await requireStaff();
  const canEdit = await hasServerPermission("branches.edit");
  if (!canEdit && staff.role !== "super_admin" && staff.role !== "admin") {
    return { error: "Forbidden: You do not have permission to edit branches." };
  }

  const trimmedName = data.name.trim();
  if (!trimmedName) {
    return { error: "Branch name is required." };
  }

  const supabase = createAdminClient();

  // Check if another branch with this name exists
  const { data: existing } = await supabase
    .from("branches")
    .select("id")
    .ilike("name", trimmedName)
    .neq("id", branchId)
    .maybeSingle();

  if (existing) {
    return { error: "Another branch with this name already exists." };
  }

  const { data: updatedBranch, error: updateError } = await supabase
    .from("branches")
    .update({
      name: trimmedName,
      address: data.address?.trim() || null,
      phone: data.phone?.trim() || null,
      is_active: data.is_active ?? true,
    })
    .eq("id", branchId)
    .select()
    .single();

  if (updateError || !updatedBranch) {
    console.error("Failed to update branch:", updateError);
    return { error: updateError?.message || "Failed to update branch." };
  }

  // Audit log
  await supabase.from("audit_logs").insert({
    user_id: staff.id,
    action: "UPDATE_BRANCH",
    resource_type: "branches",
    resource_id: branchId,
    metadata: {
      name: updatedBranch.name,
      address: updatedBranch.address,
      phone: updatedBranch.phone,
      is_active: updatedBranch.is_active,
    },
  });

  revalidatePath("/admin/branches");
  revalidatePath("/admin/pos");
  revalidatePath("/admin/appointments");
  revalidatePath("/admin/staff");

  return { success: true, branch: updatedBranch };
}

export async function toggleBranchStatus(branchId: string, is_active: boolean) {
  const staff = await requireStaff();
  const canEdit = await hasServerPermission("branches.edit");
  if (!canEdit && staff.role !== "super_admin" && staff.role !== "admin") {
    return { error: "Forbidden: You do not have permission to modify branch status." };
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("branches")
    .update({ is_active })
    .eq("id", branchId);

  if (error) {
    console.error("Failed to toggle branch status:", error);
    return { error: error.message };
  }

  // Audit log
  await supabase.from("audit_logs").insert({
    user_id: staff.id,
    action: is_active ? "ACTIVATE_BRANCH" : "DEACTIVATE_BRANCH",
    resource_type: "branches",
    resource_id: branchId,
    metadata: { is_active },
  });

  revalidatePath("/admin/branches");
  revalidatePath("/admin/pos");
  revalidatePath("/admin/appointments");
  revalidatePath("/admin/staff");

  return { success: true };
}

export async function deleteBranch(branchId: string) {
  const staff = await requireStaff();
  const canDelete = await hasServerPermission("branches.delete");
  if (!canDelete && staff.role !== "super_admin") {
    return { error: "Forbidden: Only Super Administrators can delete branches." };
  }

  const supabase = createAdminClient();

  // Safety checks: check if staff or appointments exist for this branch
  const [{ count: staffCount }, { count: aptCount }, { count: salesCount }] = await Promise.all([
    supabase.from("staff").select("id", { count: "exact", head: true }).eq("branch_id", branchId),
    supabase.from("appointments").select("id", { count: "exact", head: true }).eq("branch_id", branchId),
    supabase.from("pos_sales").select("id", { count: "exact", head: true }).eq("branch_id", branchId),
  ]);

  if ((staffCount || 0) > 0 || (aptCount || 0) > 0 || (salesCount || 0) > 0) {
    return {
      error: `Cannot delete branch: There are active records linked to this branch (${staffCount || 0} staff, ${aptCount || 0} appointments, ${salesCount || 0} sales). Please mark the branch as 'Inactive' instead to preserve financial and historical data.`,
    };
  }

  const { error } = await supabase.from("branches").delete().eq("id", branchId);

  if (error) {
    console.error("Failed to delete branch:", error);
    return { error: error.message };
  }

  // Audit log
  await supabase.from("audit_logs").insert({
    user_id: staff.id,
    action: "DELETE_BRANCH",
    resource_type: "branches",
    resource_id: branchId,
  });

  revalidatePath("/admin/branches");
  revalidatePath("/admin/pos");
  revalidatePath("/admin/appointments");
  revalidatePath("/admin/staff");

  return { success: true };
}

