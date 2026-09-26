import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TransactionsClient } from "./TransactionsClient";

export default async function TransactionsPage() {
  await requireStaff();
  const supabase = await createClient();

  // Fetch retail sales
  const { data: sales } = await supabase
    .from("pos_sales")
    .select("*, customers(first_name, last_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  // Fetch walk-in / paid appointments
  const { data: appointments } = await supabase
    .from("appointments")
    .select("*, customers(first_name, last_name)")
    .in("payment_status", ["paid", "voided", "refunded"])
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <TransactionsClient 
      sales={sales || []} 
      appointments={appointments || []} 
    />
  );
}
