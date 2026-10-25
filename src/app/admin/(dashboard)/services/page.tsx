import { createClient } from "@/lib/supabase/server";
import { ServicesClient } from "./ServicesClient";
import type { Treatment } from "@/lib/supabase/types";

export const metadata = { title: "Services & Pricing — Admin" };

export default async function ServicesPage() {
  const supabase = await createClient();

  const [
    { data: treatments },
    { data: staff },
    { data: quotasRow },
    { data: completedAppts }
  ] = await Promise.all([
    supabase
      .from("treatments")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("staff")
      .select("id, full_name, role_id, is_active, roles(name)")
      .eq("is_active", true)
      .order("full_name", { ascending: true }),
    supabase
      .from("payroll_settings")
      .select("value")
      .eq("key", "service_quotas")
      .maybeSingle(),
    supabase
      .from("appointments")
      .select("id, treatment_id, status")
      .eq("status", "completed")
  ]);

  const quotasMap = (quotasRow?.value || {}) as Record<string, {
    handled_by?: string | null;
    commission_rate?: number;
    commission_type?: "percentage" | "fixed";
    quota_target?: number;
  }>;

  // Build staff map for fast lookup
  const staffMap: Record<string, string> = {};
  (staff || []).forEach((s) => {
    staffMap[s.id] = s.full_name;
  });

  // Calculate completed count per treatment
  const completedCounts: Record<string, number> = {};
  (completedAppts || []).forEach((a) => {
    if (a.treatment_id) {
      completedCounts[a.treatment_id] = (completedCounts[a.treatment_id] || 0) + 1;
    }
  });

  // Merge treatment settings
  const enrichedTreatments: Treatment[] = (treatments || []).map((t) => {
    const q = quotasMap[t.id] || {};
    const handledBy = (t as unknown as { handled_by?: string }).handled_by || q.handled_by || null;
    return {
      ...t,
      handled_by: handledBy,
      handler_name: handledBy ? staffMap[handledBy] || null : null,
      commission_rate: (t as unknown as { commission_rate?: number }).commission_rate ?? q.commission_rate ?? 10,
      commission_type: (t as unknown as { commission_type?: "percentage" | "fixed" }).commission_type ?? q.commission_type ?? "percentage",
      quota_target: (t as unknown as { quota_target?: number }).quota_target ?? q.quota_target ?? 0,
      completed_count: completedCounts[t.id] || 0,
    };
  });

  const staffList = (staff || []).map((s) => {
    const roleObj = s.roles as unknown as { name?: string } | null;
    return {
      id: s.id,
      fullName: s.full_name,
      role: roleObj?.name || "staff",
    };
  });

  return (
    <ServicesClient
      initialTreatments={enrichedTreatments}
      staffList={staffList}
    />
  );
}
