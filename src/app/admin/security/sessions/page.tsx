import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ActiveSessionsClient } from "./ActiveSessionsClient";

export default async function ActiveSessionsPage() {
  const user = await requireStaff();
  const supabase = createAdminClient();

  // Fetch only ACTIVE sessions
  const { data: activeSessions } = await supabase
    .from("user_sessions")
    .select("*")
    .eq("status", "ACTIVE")
    .order("login_at", { ascending: false });

  // Fetch staff
  const { data: staff } = await supabase
    .from("staff")
    .select("id, full_name, roles(name)");

  // Fetch branches
  const { data: branches } = await supabase
    .from("branches")
    .select("id, name");

  return (
    <ActiveSessionsClient 
      activeSessions={activeSessions || []} 
      staff={staff || []} 
      branches={branches || []} 
    />
  );
}
