import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ShiftsClient } from "./ShiftsClient";

export default async function ShiftsPage() {
  const user = await requireStaff();
  const supabase = await createClient();

  // Fetch branches for selection
  const { data: branches } = await supabase.from("branches").select("id, name");

  // Fetch shifts (last 50)
  const { data: shifts } = await supabase
    .from("cashier_shifts")
    .select("*, staff:cashier_id(full_name), branches:branch_id(name)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <ShiftsClient 
      branches={branches || []} 
      initialShifts={shifts || []} 
      currentUserId={user.id} 
    />
  );
}
