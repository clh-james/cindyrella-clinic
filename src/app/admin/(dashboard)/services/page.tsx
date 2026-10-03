import { createClient } from "@/lib/supabase/server";
import { ServicesClient } from "./ServicesClient";

export const metadata = { title: "Services & Pricing — Admin" };

export default async function ServicesPage() {
  const supabase = await createClient();
  const { data: treatments } = await supabase
    .from("treatments")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  return (
    <ServicesClient initialTreatments={treatments || []} />
  );
}
