import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AuditLogsClient } from "./AuditLogsClient";

export default async function AuditLogsPage() {
  await requireStaff();
  const supabase = createAdminClient();

  const { data: logs } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: staff } = await supabase
    .from("staff")
    .select("id, full_name, roles(name)");

  const { data: branches } = await supabase
    .from("branches")
    .select("id, name");

  return <AuditLogsClient initialLogs={logs || []} staff={staff || []} branches={branches || []} />;
}
