import { createClient } from "./supabase/server";

export async function hasServerPermission(permissionKey: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return false;

  // Check if user is super_admin
  const { data: staff } = await supabase
    .from("staff")
    .select("role_id, roles(name)")
    .eq("id", user.id)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rolesObj = staff?.roles as any;
  const roleName = Array.isArray(rolesObj) ? rolesObj[0]?.name : rolesObj?.name;
  if (roleName === "super_admin") return true;

  const { data, error } = await supabase.rpc('has_permission', {
    p_user_id: user.id,
    p_permission_key: permissionKey
  });

  if (error) {
    if (roleName === "admin") return true;
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
