import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRBAC() {
  console.log("1. Checking roles...");
  const { data: roles } = await supabase.from("roles").select("id, name");
  console.log("Roles:", roles);

  console.log("2. Checking 'users.assign_role' permission...");
  const { data: perm } = await supabase
    .from("permissions")
    .select("id, key, name, module")
    .eq("key", "users.assign_role")
    .maybeSingle();
  console.log("users.assign_role permission:", perm);

  if (perm) {
    console.log("3. Checking which roles have 'users.assign_role'...");
    const { data: rp } = await supabase
      .from("role_permissions")
      .select("role_id, roles(name)")
      .eq("permission_id", perm.id);
    console.log("Role permissions for users.assign_role:", JSON.stringify(rp, null, 2));
  }

  console.log("4. Checking RPC has_permission for all staff...");
  const { data: staffList } = await supabase.from("staff").select("id, full_name, roles(name)");
  for (const s of staffList || []) {
    const { data: hasPerm, error } = await supabase.rpc("has_permission", {
      p_user_id: s.id,
      p_permission_key: "users.assign_role",
    });
    console.log(`Staff [${s.full_name}] (${s.roles?.name}): has_permission('users.assign_role') =`, hasPerm, error?.message || "");
  }
}

checkRBAC();
