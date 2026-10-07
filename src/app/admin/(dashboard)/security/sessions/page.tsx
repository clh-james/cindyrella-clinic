import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ActiveSessionsClient } from "./ActiveSessionsClient";

export default async function ActiveSessionsPage() {
  const user = await requireStaff();
  const supabase = createAdminClient();

  // Fetch only ACTIVE sessions that have been active in the last 30 minutes
  const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: activeSessions } = await supabase
    .from("user_sessions")
    .select("*")
    .eq("status", "ACTIVE")
    .gte("last_activity_at", thirtyMinsAgo)
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
