import { createClient } from "@/lib/supabase/server";
import { POSClient } from "./POSClient";

export const metadata = { title: "POS — Admin" };

export default async function POSPage() {
  const supabase = await createClient();
  
  // Fetch required data for POS
  const [{ data: treatments }, { data: inventory }, { data: branches }] = await Promise.all([
    supabase.from("treatments").select("*").eq("is_active", true).order("name"),
    supabase.from("inventory_items").select("*").not("retail_price", "is", null).order("name"),
    supabase.from("branches").select("*").eq("is_active", true)
  ]);

  return (
    <div className="h-full w-full">
      <POSClient 
        treatments={treatments ?? []} 
        inventory={inventory ?? []} 
        branches={branches ?? []} 
      />
    </div>
  );
}
