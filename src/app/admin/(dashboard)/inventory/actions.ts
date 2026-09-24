"use server";

import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function addInventoryItem(formData: FormData) {
  const staff = await requireStaff();

  const name = formData.get("name") as string;
  const category = formData.get("category") as string;
  const unit = formData.get("unit") as string;
  const current_stock = parseInt(formData.get("current_stock") as string, 10);
  const low_stock_threshold = parseInt(formData.get("low_stock_threshold") as string, 10);
  const retail_price = formData.get("retail_price") ? parseInt(formData.get("retail_price") as string, 10) : null;
  const sku = formData.get("sku") as string || null;

  if (!name || !category || !unit) {
    return { error: "Name, category, and unit are required." };
  }

  const supabase = await createClient();

  const { data: item, error } = await supabase
    .from("inventory_items")
    .insert({
      name,
      category,
      unit,
      current_stock: isNaN(current_stock) ? 0 : current_stock,
      low_stock_threshold: isNaN(low_stock_threshold) ? 5 : low_stock_threshold,
      retail_price: isNaN(retail_price as number) ? null : retail_price,
      sku
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding inventory item:", error);
    return { error: "Failed to add inventory item." };
  }

  revalidatePath("/admin/inventory");
  revalidatePath("/admin/pos"); // also revalidate POS page
  return { success: true };
}
