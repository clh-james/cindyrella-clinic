import { requireStaff } from "@/lib/auth";
import { ReportsClient } from "./ReportsClient";
import { createClient } from "@/lib/supabase/server";

export default async function ReportsPage() {
  await requireStaff();
  
  const supabase = await createClient();
  
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  
  const [appointmentsRes, salesRes, staffRes] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, amount_due, status, payment_status, appointment_date, created_at, treatment_id, treatments(name), payment_method")
      .gte("created_at", startOfMonth),
    supabase
      .from("pos_sales")
      .select("id, total_amount, payment_method, created_at, created_by")
      .gte("created_at", startOfMonth),
    supabase
      .from("staff")
      .select("id, full_name, is_active, roles(name)")
  ]);

  return (
    <ReportsClient 
      appointments={appointmentsRes.data || []} 
      sales={salesRes.data || []} 
      staff={staffRes.data || []}
    />
  );
}
