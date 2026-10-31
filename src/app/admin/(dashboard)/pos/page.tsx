import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { POSClient } from "./POSClient";

export const metadata = { title: "POS — Admin" };

export default async function POSPage() {
  const supabase = await createClient();
  const user = await requireStaff();
  
  // Fetch required data for POS
  const [{ data: treatments }, { data: inventory }, { data: branches }, { data: staffData }, { data: staffList }] = await Promise.all([
    supabase.from("treatments").select("*").eq("is_active", true).order("name"),
    supabase.from("inventory_items").select("*").not("retail_price", "is", null).order("name"),
    supabase.from("branches").select("*").eq("is_active", true),
    supabase.from("staff").select("branch_id, full_name").eq("id", user.id).single(),
    supabase.from("staff").select("id, full_name, role, branch_id").eq("is_active", true).order("full_name")
  ]);

  return (
    <div className="h-full w-full">
      <POSClient 
        treatments={treatments ?? []} 
        inventory={inventory ?? []} 
        branches={branches ?? []}
        staffList={staffList ?? []}
        staffBranchId={staffData?.branch_id ?? null}
        cashierName={staffData?.full_name ?? user.fullName ?? "Cashier"}
      />
    </div>
  );
}
