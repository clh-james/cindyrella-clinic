import { createClient } from "./supabase/server";

export async function hasServerPermission(permissionKey: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return false;

  const { data, error } = await supabase.rpc('has_permission', {
    p_user_id: user.id,
    p_permission_key: permissionKey
  });

  if (error) {
    console.error("Error checking permission:", error);
    return false;
  }

  return !!data;
}

export async function requireServerPermission(permissionKey: string) {
  const hasAccess = await hasServerPermission(permissionKey);
  if (!hasAccess) {
    throw new Error(`Forbidden: Missing required permission [${permissionKey}]`);
  }
}
