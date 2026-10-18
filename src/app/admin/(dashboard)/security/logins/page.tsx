import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { LoginActivityClient } from "./LoginActivityClient";

export default async function LoginActivityPage() {
  const user = await requireStaff();
  const supabase = createAdminClient();

  const isSuperAdmin = user.role === "super_admin";
  let sessionsQuery = supabase
    .from("user_sessions")
    .select("*")
    .order("login_at", { ascending: false })
    .limit(500);

  if (!isSuperAdmin && user.branchId) {
    sessionsQuery = sessionsQuery.eq("branch_id", user.branchId);
  }

  const { data: sessions } = await sessionsQuery;

  // Fetch staff
  const { data: staff } = await supabase
    .from("staff")
    .select("id, full_name, roles(name)");

  // Fetch branches
  const { data: branches } = await supabase
    .from("branches")
    .select("id, name");

  return (
    <LoginActivityClient 
      initialSessions={sessions || []} 
      staff={staff || []} 
      branches={branches || []} 
    />
  );
}
