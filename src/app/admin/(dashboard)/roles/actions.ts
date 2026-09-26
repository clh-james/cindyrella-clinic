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
