"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createPromoCode(data: {
  code: string;
  discountType: "fixed" | "percentage";
  discountValue: number;
  validUntil?: string | null;
  maxUses?: number | null;
}) {
  const staff = await requireStaff();
  if (staff.role !== "super_admin" && staff.role !== "admin" && staff.role !== "manager") {
    return { error: "Forbidden: You do not have permission to create promo codes." };
  }

  const supabase = createAdminClient();
  const cleanCode = data.code.trim().toUpperCase();

  if (!cleanCode) {
    return { error: "Promo code name is required." };
  }

  if (data.discountValue <= 0) {
    return { error: "Discount value must be greater than zero." };
  }

  if (data.discountType === "percentage" && data.discountValue > 100) {
    return { error: "Percentage discount cannot exceed 100%." };
  }

  const { data: existing } = await supabase
    .from("promo_codes")
    .select("id")
    .ilike("code", cleanCode)
    .maybeSingle();

  if (existing) {
    return { error: `Promo code "${cleanCode}" already exists.` };
  }

  const { data: created, error } = await supabase
    .from("promo_codes")
    .insert({
      code: cleanCode,
      discount_type: data.discountType,
      discount_value: Math.round(data.discountValue),
      valid_until: data.validUntil ? new Date(data.validUntil).toISOString() : null,
      max_uses: data.maxUses && data.maxUses > 0 ? Math.round(data.maxUses) : null,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create promo code:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/promos");
  return { success: true, promo: created };
}

export async function editPromoCode(data: {
  id: string;
  code: string;
  discountType: "fixed" | "percentage";
  discountValue: number;
  validUntil?: string | null;
  maxUses?: number | null;
  isActive: boolean;
}) {
  const staff = await requireStaff();
  if (staff.role !== "super_admin" && staff.role !== "admin" && staff.role !== "manager") {
    return { error: "Forbidden: You do not have permission to edit promo codes." };
  }

  const supabase = createAdminClient();
  const cleanCode = data.code.trim().toUpperCase();

  if (!cleanCode) {
    return { error: "Promo code name is required." };
  }

  if (data.discountValue <= 0) {
    return { error: "Discount value must be greater than zero." };
  }

  if (data.discountType === "percentage" && data.discountValue > 100) {
    return { error: "Percentage discount cannot exceed 100%." };
  }

  // Check unique code excluding this promo
  const { data: duplicate } = await supabase
    .from("promo_codes")
    .select("id")
    .ilike("code", cleanCode)
    .neq("id", data.id)
    .maybeSingle();

  if (duplicate) {
    return { error: `Promo code "${cleanCode}" is already in use by another promo.` };
  }

  const { data: updated, error } = await supabase
    .from("promo_codes")
    .update({
      code: cleanCode,
      discount_type: data.discountType,
      discount_value: Math.round(data.discountValue),
      valid_until: data.validUntil ? new Date(data.validUntil).toISOString() : null,
      max_uses: data.maxUses && data.maxUses > 0 ? Math.round(data.maxUses) : null,
      is_active: data.isActive,
    })
    .eq("id", data.id)
    .select()
    .single();

  if (error) {
    console.error("Failed to update promo code:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/promos");
  return { success: true, promo: updated };
}

export async function togglePromoStatus(id: string, isActive: boolean) {
  const staff = await requireStaff();
  if (staff.role !== "super_admin" && staff.role !== "admin" && staff.role !== "manager") {
    return { error: "Forbidden: You do not have permission to modify promo codes." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("promo_codes")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/promos");
  return { success: true };
}

export async function deletePromoCode(id: string) {
  const staff = await requireStaff();
  if (staff.role !== "super_admin" && staff.role !== "admin" && staff.role !== "manager") {
    return { error: "Forbidden: You do not have permission to delete promo codes." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("promo_codes")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Failed to delete promo code:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/promos");
  return { success: true };
}

