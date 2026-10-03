import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { LoginActivityClient } from "./LoginActivityClient";

export default async function LoginActivityPage() {
  const user = await requireStaff();
  const supabase = createAdminClient();

  // Fetch login sessions
  const { data: sessions } = await supabase
    .from("user_sessions")
    .select("*")
    .order("login_at", { ascending: false })
    .limit(500);

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
