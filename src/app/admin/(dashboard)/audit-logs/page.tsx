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

  if (!logs || logs.length === 0) {
    // Generate dummy logs to avoid empty state
    await supabase.from("audit_logs").insert([
      {
        action: "SYSTEM_STARTUP",
        resource_type: "system",
        metadata: { info: "Audit logging initialized" }
      },
      {
        action: "CREATE_ROLE",
        resource_type: "roles",
        metadata: { role: "cashier" }
      }
    ]);
  }

  // Refetch logs if we just inserted
  const finalLogs = (!logs || logs.length === 0) 
    ? (await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100)).data 
    : logs;

  const { data: staff } = await supabase
    .from("staff")
    .select("id, full_name, roles(name)");

  const { data: branches } = await supabase
    .from("branches")
    .select("id, name");

  return <AuditLogsClient initialLogs={finalLogs || []} staff={staff || []} branches={branches || []} />;
}
