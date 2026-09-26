"use server";

import { createClient } from "@/lib/supabase/server";
import { requireServerPermission } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

export async function toggleRolePermission(
  roleId: string,
  permissionId: string,
  assign: boolean
) {
  // Ensure the user calling this action actually has permission to modify roles
  await requireServerPermission("users.assign_role");
  
  const supabase = await createClient();

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
