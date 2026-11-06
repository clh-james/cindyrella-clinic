import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TransactionsClient } from "./TransactionsClient";

export default async function TransactionsPage() {
  await requireStaff();
  const supabase = await createClient();

  // Fetch retail sales, appointments with handler & treatments, and active staff
  const [{ data: sales }, { data: appointments }, { data: staffList }] = await Promise.all([
    supabase
      .from("pos_sales")
      .select("*, customers(first_name, last_name), pos_sale_items(quantity, inventory_items(name))")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("appointments")
      .select("*, customers(first_name, last_name), treatments(name), staff:handled_by(id, full_name)")
      .in("payment_status", ["paid", "voided", "refunded"])
      .order("appointment_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("staff")
      .select("id, full_name, branch_id, roles(name)")
      .eq("is_active", true)
      .order("full_name"),
  ]);

  const formattedStaffList = (staffList ?? []).map((s: any) => {
    const rolesObj = s.roles;
    const roleName = Array.isArray(rolesObj) ? rolesObj[0]?.name : rolesObj?.name;
    return {
      id: s.id,
      full_name: s.full_name,
      branch_id: s.branch_id,
      role: roleName || "Staff",
    };
  });

  return (
    <TransactionsClient 
      sales={sales || []} 
      appointments={appointments || []} 
      staffList={formattedStaffList}
    />
  );
}
