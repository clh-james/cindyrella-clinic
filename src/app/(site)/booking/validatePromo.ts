"use server";

import { createClient } from "@/lib/supabase/server";

export async function validatePromoCode(code: string) {
  const supabase = await createClient();
  
  const { data: promo, error } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("code", code.toUpperCase())
    .single();

  if (error || !promo) {
    return { error: "Invalid promo code" };
  }

  if (!promo.is_active) {
    return { error: "This promo code is no longer active" };
  }

  if (promo.valid_until && new Date(promo.valid_until) < new Date()) {
    return { error: "This promo code has expired" };
  }

  if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
    return { error: "This promo code has reached its usage limit" };
  }

  return { promo };
}
