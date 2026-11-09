import { createClient } from "@/lib/supabase/server";
import { PromosClient } from "./PromosClient";
import { PromoCode } from "./types";

export const metadata = { title: "Promo Codes — Admin" };

export default async function PromosPage() {
  const supabase = await createClient();
  const { data: promos } = await supabase
    .from("promo_codes")
    .select("*")
    .order("created_at", { ascending: false });

  return <PromosClient initialPromos={(promos ?? []) as PromoCode[]} />;
}
