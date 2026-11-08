"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireServerPermission } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

export async function toggleRolePermission(
  roleId: string,
  permissionId: string,
  assign: boolean
) {
  // Ensure the user calling this action actually has permission to modify roles
  await requireServerPermission("users.assign_role");
  
  // Use admin client to bypass RLS, since role_permissions table is read-only
  // for regular clients and we've already done our authorization check above.
  const supabase = createAdminClient();

  if (assign) {
    const { error } = await supabase
      .from("role_permissions")
      .insert({ role_id: roleId, permission_id: permissionId });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", roleId)
      .eq("permission_id", permissionId);
    if (error) throw new Error(error.message);
  }

  // Revalidate so the page updates
  revalidatePath("/admin/roles");
}

export async function createRole(payload: {
  name: string;
  description?: string;
  cloneFromRoleId?: string;
}) {
  await requireServerPermission("users.assign_role");
  const supabase = createAdminClient();

  const rawName = payload.name?.trim();
  if (!rawName) {
    throw new Error("Role name is required");
  }

  // Normalize key to lower_snake_case for clean database identifiers
  const key = rawName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!key) {
    throw new Error("Invalid role name. Please use alphanumeric characters.");
  }

  // Check if role already exists
  const { data: existing } = await supabase
    .from("roles")
    .select("id, name")
    .or(`name.eq.${key},name.ilike.${rawName}`)
    .maybeSingle();

  if (existing) {
    throw new Error(`A role with name "${existing.name}" already exists.`);
  }

  // Insert role
  const { data: newRole, error: insertError } = await supabase
    .from("roles")
    .insert({
      name: key,
      description: payload.description?.trim() || `Custom role: ${rawName}`,
    })
    .select()
    .single();

  if (insertError || !newRole) {
    throw new Error(insertError?.message || "Failed to create role in database");
  }

  // If copying permissions from another role
  if (payload.cloneFromRoleId) {
    const { data: sourcePerms } = await supabase
      .from("role_permissions")
      .select("permission_id")
      .eq("role_id", payload.cloneFromRoleId);

    if (sourcePerms && sourcePerms.length > 0) {
      const recordsToInsert = sourcePerms.map((p) => ({
        role_id: newRole.id,
        permission_id: p.permission_id,
      }));
      const { error: cloneErr } = await supabase
        .from("role_permissions")
        .insert(recordsToInsert);
      if (cloneErr) {
        console.error("Warning: Failed to clone permissions:", cloneErr);
      }
    }
  }

  revalidatePath("/admin/roles");
  revalidatePath("/admin/staff");

  return { success: true, role: newRole };
}

export async function deleteRole(roleId: string) {
  await requireServerPermission("users.assign_role");
  const supabase = createAdminClient();

  // Fetch role
  const { data: role, error: fetchErr } = await supabase
    .from("roles")
    .select("id, name")
    .eq("id", roleId)
    .single();

  if (fetchErr || !role) {
    throw new Error("Role not found");
  }

  // Protect system roles
  const SYSTEM_ROLES = ["super_admin", "admin", "manager", "cashier", "staff"];
  if (SYSTEM_ROLES.includes(role.name.toLowerCase())) {
    throw new Error(`Cannot delete core system role "${role.name}". It is protected.`);
  }

  // Check if any staff member is assigned to this role
  const { data: assignedStaff } = await supabase
    .from("staff")
    .select("id, full_name")
    .eq("role_id", roleId)
    .limit(5);

  if (assignedStaff && assignedStaff.length > 0) {
    const names = assignedStaff.map((s) => s.full_name).join(", ");
    throw new Error(
      `Cannot delete role "${role.name}" because it is currently assigned to staff member(s): ${names}. Please reassign them in the Staff page before deleting.`
    );
  }

  // Delete permissions first
  await supabase.from("role_permissions").delete().eq("role_id", roleId);

  // Delete the role
  const { error: delErr } = await supabase.from("roles").delete().eq("id", roleId);
  if (delErr) {
    throw new Error(delErr.message || "Failed to delete role");
  }

  revalidatePath("/admin/roles");
  revalidatePath("/admin/staff");

  return { success: true };
}
