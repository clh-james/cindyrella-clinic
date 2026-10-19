"use server";

import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { hasServerPermission } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { 
  DEFAULT_CATEGORIES, 
  StockMovementType, 
  TransferStatus, 
  TreatmentRecipeData, 
  TreatmentRecipeMaterial 
} from "./types";

function generateRef(prefix: string) {
  const d = new Date();
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${dateStr}-${rand}`;
}

// ==============================================================================
// 1. CATEGORIES MANAGEMENT
// ==============================================================================

export async function ensureDefaultCategories() {
  const supabase = await createClient();
  try {
    const { data: existing, error } = await supabase
      .from("inventory_categories")
      .select("name, code");

    if (error) {
      // Table might not exist yet if migration 0034 is pending
      return { success: false, error: error.message };
    }

    const existingNames = new Set((existing || []).map((c) => c.name.toLowerCase()));
    const missing = DEFAULT_CATEGORIES.filter(
      (cat) => !existingNames.has(cat.name.toLowerCase())
    );

    if (missing.length > 0) {
      await supabase.from("inventory_categories").insert(missing);
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error seeding categories";
    return { success: false, error: message };
  }
}

export async function getCategories() {
  const supabase = await createClient();
  try {
    const { data: categories, error } = await supabase
      .from("inventory_categories")
      .select("*")
      .order("name", { ascending: true });

    if (error || !categories) {
      // Fallback: return default categories
      return DEFAULT_CATEGORIES.map((c, i) => ({
        id: `default-${i}`,
        name: c.name,
        code: c.code,
        description: c.description,
        subcategories: c.subcategories,
        is_active: true,
      }));
    }

    // Get item counts per category
    const { data: items } = await supabase
      .from("inventory_items")
      .select("category_id, category");

    const countMap: Record<string, number> = {};
    (items || []).forEach((item) => {
      if (item.category_id) {
        countMap[item.category_id] = (countMap[item.category_id] || 0) + 1;
      }
    });

    return categories.map((cat) => ({
      ...cat,
      item_count: countMap[cat.id] || 0,
    }));
  } catch {
    return DEFAULT_CATEGORIES.map((c, i) => ({
      id: `default-${i}`,
      name: c.name,
      code: c.code,
      description: c.description,
      subcategories: c.subcategories,
      is_active: true,
    }));
  }
}

export async function addCategory(formData: FormData) {
  const staff = await requireStaff();
  const canManage = await hasServerPermission("inventory.categories");
  if (!canManage && staff.role !== "super_admin" && staff.role !== "admin") {
    return { error: "Forbidden: You do not have permission to manage categories." };
  }

  const name = (formData.get("name") as string)?.trim();
  const code = (formData.get("code") as string)?.trim().toUpperCase();
  const description = (formData.get("description") as string)?.trim() || null;
  const subcategoriesRaw = (formData.get("subcategories") as string)?.trim() || "";

  if (!name || !code) {
    return { error: "Category name and code are required." };
  }

  const subcategories = subcategoriesRaw
    ? subcategoriesRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const supabase = await createClient();
  const { error } = await supabase.from("inventory_categories").insert({
    name,
    code,
    description,
    subcategories,
    is_active: true,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "A category with this name or code already exists." };
    }
    return { error: `Failed to add category: ${error.message}` };
  }

  revalidatePath("/admin/inventory");
  return { success: true };
}

export async function updateCategory(id: string, formData: FormData) {
  const staff = await requireStaff();
  const canManage = await hasServerPermission("inventory.categories");
  if (!canManage && staff.role !== "super_admin" && staff.role !== "admin") {
    return { error: "Forbidden: You do not have permission to edit categories." };
  }

  const name = (formData.get("name") as string)?.trim();
  const code = (formData.get("code") as string)?.trim().toUpperCase();
  const description = (formData.get("description") as string)?.trim() || null;
  const subcategoriesRaw = (formData.get("subcategories") as string)?.trim() || "";

  if (!name || !code) {
    return { error: "Category name and code are required." };
  }

  const subcategories = subcategoriesRaw
    ? subcategoriesRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory_categories")
    .update({
      name,
      code,
      description,
      subcategories,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { error: `Failed to update category: ${error.message}` };
  }

  revalidatePath("/admin/inventory");
  return { success: true };
}

export async function toggleCategoryActive(id: string, isActive: boolean) {
  const staff = await requireStaff();
  const canManage = await hasServerPermission("inventory.categories");
  if (!canManage && staff.role !== "super_admin" && staff.role !== "admin") {
    return { error: "Forbidden: You do not have permission to manage categories." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory_categories")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/inventory");
  return { success: true };
}

export async function deleteCategory(id: string) {
  const staff = await requireStaff();
  const canManage = await hasServerPermission("inventory.categories");
  if (!canManage && staff.role !== "super_admin") {
    return { error: "Forbidden: Only administrators can delete categories." };
  }

  const supabase = await createClient();
  // Check if items use this category
  const { count } = await supabase
    .from("inventory_items")
    .select("*", { count: "exact", head: true })
    .eq("category_id", id);

  if (count && count > 0) {
    return {
      error: `Cannot delete category: ${count} active item(s) are assigned to it. Please deactivate the category or reassign items first.`,
    };
  }

  const { error } = await supabase.from("inventory_categories").delete().eq("id", id);
  if (error) {
    return { error: `Failed to delete category: ${error.message}` };
  }

  revalidatePath("/admin/inventory");
  return { success: true };
}

// ==============================================================================
// 2. SUPPLIERS MANAGEMENT
// ==============================================================================

export async function getSuppliers() {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("inventory_suppliers")
      .select("*")
      .order("name", { ascending: true });

    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

export async function addSupplier(formData: FormData) {
  const staff = await requireStaff();
  const canManage = await hasServerPermission("inventory.suppliers");
  if (!canManage && staff.role !== "super_admin" && staff.role !== "admin") {
    return { error: "Forbidden: You do not have permission to add suppliers." };
  }

  const name = (formData.get("name") as string)?.trim();
  const contact_person = (formData.get("contact_person") as string)?.trim() || null;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const email = (formData.get("email") as string)?.trim() || null;
  const address = (formData.get("address") as string)?.trim() || null;
  const products_supplied = (formData.get("products_supplied") as string)?.trim() || null;
  const payment_terms = (formData.get("payment_terms") as string)?.trim() || "30 Days Net";
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!name) return { error: "Supplier name is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("inventory_suppliers").insert({
    name,
    contact_person,
    phone,
    email,
    address,
    products_supplied,
    payment_terms,
    notes,
    is_active: true,
  });

  if (error) {
    return { error: `Failed to add supplier: ${error.message}` };
  }

  revalidatePath("/admin/inventory");
  return { success: true };
}

export async function updateSupplier(id: string, formData: FormData) {
  const staff = await requireStaff();
  const canManage = await hasServerPermission("inventory.suppliers");
  if (!canManage && staff.role !== "super_admin" && staff.role !== "admin") {
    return { error: "Forbidden: You do not have permission to edit suppliers." };
  }

  const name = (formData.get("name") as string)?.trim();
  const contact_person = (formData.get("contact_person") as string)?.trim() || null;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const email = (formData.get("email") as string)?.trim() || null;
  const address = (formData.get("address") as string)?.trim() || null;
  const products_supplied = (formData.get("products_supplied") as string)?.trim() || null;
  const payment_terms = (formData.get("payment_terms") as string)?.trim() || "30 Days Net";
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!name) return { error: "Supplier name is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory_suppliers")
    .update({
      name,
      contact_person,
      phone,
      email,
      address,
      products_supplied,
      payment_terms,
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { error: `Failed to update supplier: ${error.message}` };
  }

  revalidatePath("/admin/inventory");
  return { success: true };
}

export async function toggleSupplierActive(id: string, isActive: boolean) {
  const staff = await requireStaff();
  const canManage = await hasServerPermission("inventory.suppliers");
  if (!canManage && staff.role !== "super_admin" && staff.role !== "admin") {
    return { error: "Forbidden: Permission denied." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory_suppliers")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/inventory");
  return { success: true };
}

// ==============================================================================
// 3. ITEM CREATION & EDITING
// ==============================================================================

export async function addInventoryItem(formData: FormData) {
  const staff = await requireStaff();
  const canCreate = await hasServerPermission("inventory.create");
  if (!canCreate && staff.role !== "super_admin" && staff.role !== "admin") {
    return { error: "Forbidden: You do not have permission to create inventory items." };
  }

  const name = (formData.get("name") as string)?.trim();
  const sku = (formData.get("sku") as string)?.trim() || null;
  const barcode = (formData.get("barcode") as string)?.trim() || null;
  const description = (formData.get("description") as string)?.trim() || null;
  const category_id = (formData.get("category_id") as string)?.trim() || null;
  const category = (formData.get("category") as string)?.trim() || "General";
  const subcategory = (formData.get("subcategory") as string)?.trim() || null;
  const brand = (formData.get("brand") as string)?.trim() || null;
  const unit = (formData.get("unit") as string)?.trim();
  const current_stock = parseInt(formData.get("current_stock") as string, 10);
  const low_stock_threshold = parseInt(formData.get("low_stock_threshold") as string, 10);
  const reorder_quantity = parseInt(formData.get("reorder_quantity") as string, 10);
  const cost_price = parseInt(formData.get("cost_price") as string, 10);
  const retail_price = formData.get("retail_price")
    ? parseInt(formData.get("retail_price") as string, 10)
    : null;
  const supplier_id = (formData.get("supplier_id") as string)?.trim() || null;
  const storage_location = (formData.get("storage_location") as string)?.trim() || null;
  const batch_number = (formData.get("batch_number") as string)?.trim() || null;
  const mfg_date = (formData.get("mfg_date") as string)?.trim() || null;
  const expiry_date = (formData.get("expiry_date") as string)?.trim() || null;
  const branch_id = (formData.get("branch_id") as string)?.trim() || staff.branchId || null;
  const image_url = (formData.get("image_url") as string)?.trim() || null;

  if (!name || !unit) {
    return { error: "Item name and unit of measure are required." };
  }

  if (isNaN(current_stock) || current_stock < 0) {
    return { error: "Stock quantity must be a non-negative number." };
  }

  if (cost_price < 0 || (retail_price !== null && retail_price < 0)) {
    return { error: "Prices must be non-negative values." };
  }

  const supabase = await createClient();

  // Validate unique SKU if provided
  if (sku) {
    const { data: existingSku } = await supabase
      .from("inventory_items")
      .select("id")
      .eq("sku", sku)
      .maybeSingle();

    if (existingSku) {
      return { error: `SKU '${sku}' is already assigned to another item.` };
    }
  }

  // Insert item
  const itemPayload: Record<string, unknown> = {
    name,
    sku,
    category,
    unit,
    current_stock: isNaN(current_stock) ? 0 : current_stock,
    low_stock_threshold: isNaN(low_stock_threshold) ? 5 : low_stock_threshold,
    retail_price: isNaN(retail_price as number) ? null : retail_price,
  };

  // Add enhanced columns if supported
  if (category_id) itemPayload.category_id = category_id;
  if (barcode) itemPayload.barcode = barcode;
  if (description) itemPayload.description = description;
  if (brand) itemPayload.brand = brand;
  if (!isNaN(cost_price)) itemPayload.cost_price = cost_price;
  if (!isNaN(reorder_quantity)) itemPayload.reorder_quantity = reorder_quantity;
  if (supplier_id) itemPayload.supplier_id = supplier_id;
  if (storage_location) itemPayload.storage_location = storage_location;
  if (batch_number) itemPayload.batch_number = batch_number;
  if (mfg_date) itemPayload.mfg_date = mfg_date;
  if (expiry_date) itemPayload.expiry_date = expiry_date;
  if (branch_id) itemPayload.branch_id = branch_id;
  if (subcategory) itemPayload.subcategory = subcategory;
  if (image_url) itemPayload.image_url = image_url;

  const { data: newItem, error } = await supabase
    .from("inventory_items")
    .insert(itemPayload)
    .select()
    .single();

  if (error || !newItem) {
    console.error("Error adding inventory item:", error);
    return { error: `Failed to add item: ${error?.message || "Unknown error"}` };
  }

  // Record initial movement log
  if (current_stock > 0) {
    const refNum = generateRef("IN");
    try {
      await supabase.from("inventory_movements").insert({
        reference_number: refNum,
        item_id: newItem.id,
        movement_type: "stock_in",
        quantity: current_stock,
        unit: unit,
        destination_branch_id: branch_id,
        batch_number: batch_number,
        previous_quantity: 0,
        new_quantity: current_stock,
        reason: "Initial Stock In",
        notes: "Created during item registration",
        performed_by: staff.id,
      });
    } catch {
      // Fallback to legacy inventory_logs if movements table pending
      await supabase.from("inventory_logs").insert({
        item_id: newItem.id,
        change_amount: current_stock,
        reason: "Initial Stock In",
        created_by: staff.id,
      });
    }
  }

  revalidatePath("/admin/inventory");
  revalidatePath("/admin/pos");
  return { success: true };
}

export async function updateInventoryItem(id: string, formData: FormData) {
  const staff = await requireStaff();
  const canEdit = await hasServerPermission("inventory.edit");
  if (!canEdit && staff.role !== "super_admin" && staff.role !== "admin") {
    return { error: "Forbidden: You do not have permission to edit inventory." };
  }

  const name = (formData.get("name") as string)?.trim();
  const sku = (formData.get("sku") as string)?.trim() || null;
  const barcode = (formData.get("barcode") as string)?.trim() || null;
  const description = (formData.get("description") as string)?.trim() || null;
  const category_id = (formData.get("category_id") as string)?.trim() || null;
  const category = (formData.get("category") as string)?.trim() || "General";
  const subcategory = (formData.get("subcategory") as string)?.trim() || null;
  const brand = (formData.get("brand") as string)?.trim() || null;
  const unit = (formData.get("unit") as string)?.trim();
  const low_stock_threshold = parseInt(formData.get("low_stock_threshold") as string, 10);
  const reorder_quantity = parseInt(formData.get("reorder_quantity") as string, 10);
  const cost_price = parseInt(formData.get("cost_price") as string, 10);
  const retail_price = formData.get("retail_price")
    ? parseInt(formData.get("retail_price") as string, 10)
    : null;
  const supplier_id = (formData.get("supplier_id") as string)?.trim() || null;
  const storage_location = (formData.get("storage_location") as string)?.trim() || null;
  const batch_number = (formData.get("batch_number") as string)?.trim() || null;
  const mfg_date = (formData.get("mfg_date") as string)?.trim() || null;
  const expiry_date = (formData.get("expiry_date") as string)?.trim() || null;
  const branch_id = (formData.get("branch_id") as string)?.trim() || null;
  const image_url = (formData.get("image_url") as string)?.trim() || null;

  if (!name || !unit) {
    return { error: "Item name and unit of measure are required." };
  }

  const supabase = await createClient();

  // Validate unique SKU
  if (sku) {
    const { data: existingSku } = await supabase
      .from("inventory_items")
      .select("id")
      .eq("sku", sku)
      .neq("id", id)
      .maybeSingle();

    if (existingSku) {
      return { error: `SKU '${sku}' is already assigned to another item.` };
    }
  }

  const updatePayload: Record<string, unknown> = {
    name,
    sku,
    category,
    unit,
    low_stock_threshold: isNaN(low_stock_threshold) ? 5 : low_stock_threshold,
    retail_price: isNaN(retail_price as number) ? null : retail_price,
    updated_at: new Date().toISOString(),
  };

  if (category_id) updatePayload.category_id = category_id;
  if (barcode !== undefined) updatePayload.barcode = barcode;
  if (description !== undefined) updatePayload.description = description;
  if (brand !== undefined) updatePayload.brand = brand;
  if (!isNaN(cost_price)) updatePayload.cost_price = cost_price;
  if (!isNaN(reorder_quantity)) updatePayload.reorder_quantity = reorder_quantity;
  if (supplier_id !== undefined) updatePayload.supplier_id = supplier_id;
  if (storage_location !== undefined) updatePayload.storage_location = storage_location;
  if (batch_number !== undefined) updatePayload.batch_number = batch_number;
  if (mfg_date !== undefined) updatePayload.mfg_date = mfg_date;
  if (expiry_date !== undefined) updatePayload.expiry_date = expiry_date;
  if (branch_id !== undefined) updatePayload.branch_id = branch_id;
  if (subcategory !== undefined) updatePayload.subcategory = subcategory;
  if (image_url !== undefined) updatePayload.image_url = image_url;

  const { error } = await supabase
    .from("inventory_items")
    .update(updatePayload)
    .eq("id", id);

  if (error) {
    return { error: `Failed to update item: ${error.message}` };
  }

  revalidatePath("/admin/inventory");
  revalidatePath("/admin/pos");
  return { success: true };
}

export async function toggleItemActive(id: string, isActive: boolean) {
  const staff = await requireStaff();
  const canEdit = await hasServerPermission("inventory.edit");
  if (!canEdit && staff.role !== "super_admin" && staff.role !== "admin") {
    return { error: "Forbidden: Permission denied." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory_items")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/inventory");
  return { success: true };
}

// ==============================================================================
// 4. ATOMIC STOCK MOVEMENTS (Stock In, Stock Out, Adjustment, Wastage)
// ==============================================================================

export async function recordStockMovement(input: {
  itemId: string;
  type: StockMovementType;
  quantity: number;
  reason: string;
  notes?: string;
  branchId?: string;
  batchNumber?: string;
  referenceId?: string;
}) {
  const staff = await requireStaff();
  const canAdjust = await hasServerPermission("inventory.adjust");
  if (!canAdjust && staff.role !== "super_admin" && staff.role !== "admin" && staff.role !== "manager") {
    return { error: "Forbidden: You do not have permission to perform stock movements." };
  }

  if (input.quantity <= 0) {
    return { error: "Movement quantity must be greater than zero." };
  }

  const supabase = await createClient();

  // 1. Fetch current item
  const { data: item, error: fetchErr } = await supabase
    .from("inventory_items")
    .select("id, name, unit, current_stock, is_quarantined")
    .eq("id", input.itemId)
    .single();

  if (fetchErr || !item) {
    return { error: "Item not found." };
  }

  // Prevent issuing quarantined items
  if (
    item.is_quarantined &&
    (input.type === "stock_out" || input.type === "transfer" || input.type === "wastage")
  ) {
    return { error: "Cannot issue or consume quarantined stock." };
  }

  const previousQty = item.current_stock;
  let newQty = previousQty;

  // Calculate new quantity
  if (
    input.type === "stock_in" ||
    input.type === "customer_return"
  ) {
    newQty = previousQty + input.quantity;
  } else if (
    input.type === "stock_out" ||
    input.type === "transfer" ||
    input.type === "wastage" ||
    input.type === "expired" ||
    input.type === "supplier_return"
  ) {
    if (item.current_stock < input.quantity) {
      return {
        error: `Insufficient stock for ${item.name}. Available: ${item.current_stock} ${item.unit}, Requested: ${input.quantity} ${item.unit}`,
      };
    }
    newQty = previousQty - input.quantity;
  } else if (input.type === "adjustment") {
    // Physical count adjustment
    newQty = input.quantity; // In adjustment, input.quantity is the new count
  }

  // 2. Update stock atomically
  const { error: updateErr } = await supabase
    .from("inventory_items")
    .update({ current_stock: newQty, updated_at: new Date().toISOString() })
    .eq("id", input.itemId);

  if (updateErr) {
    return { error: `Failed to update item stock: ${updateErr.message}` };
  }

  // 2b. Synchronize branch stock balance if branchId is provided
  if (input.branchId) {
    try {
      const { data: bStock } = await supabase
        .from("inventory_stock_balances")
        .select("quantity")
        .eq("item_id", input.itemId)
        .eq("branch_id", input.branchId)
        .maybeSingle();

      const branchPrev = bStock ? Number(bStock.quantity) : (input.type === "stock_in" ? 0 : previousQty);
      let branchNew = branchPrev;

      if (input.type === "stock_in" || input.type === "customer_return") {
        branchNew = branchPrev + input.quantity;
      } else if (
        input.type === "stock_out" ||
        input.type === "transfer" ||
        input.type === "wastage" ||
        input.type === "expired" ||
        input.type === "supplier_return"
      ) {
        branchNew = Math.max(0, branchPrev - input.quantity);
      } else if (input.type === "adjustment") {
        branchNew = input.quantity;
      }

      await supabase
        .from("inventory_stock_balances")
        .upsert(
          {
            item_id: input.itemId,
            branch_id: input.branchId,
            quantity: branchNew,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "item_id,branch_id" }
        );
    } catch (bErr) {
      console.error("Failed to update branch balance:", bErr);
    }
  }

  // 3. Log movement
  const refNum = generateRef(
    input.type === "stock_in" ? "IN" : input.type === "stock_out" ? "OUT" : "ADJ"
  );

  const delta = newQty - previousQty;

  try {
    await supabase.from("inventory_movements").insert({
      reference_number: refNum,
      item_id: item.id,
      movement_type: input.type,
      quantity: Math.abs(delta) || input.quantity,
      unit: item.unit,
      source_branch_id: input.type === "transfer" ? input.branchId : null,
      destination_branch_id: input.branchId || null,
      batch_number: input.batchNumber || null,
      previous_quantity: previousQty,
      new_quantity: newQty,
      reason: input.reason,
      notes: input.notes || null,
      reference_id: input.referenceId || null,
      performed_by: staff.id,
    });
  } catch {
    // Fallback to inventory_logs
    await supabase.from("inventory_logs").insert({
      item_id: item.id,
      change_amount: delta,
      reason: `${input.type.toUpperCase()}: ${input.reason}`,
      created_by: staff.id,
    });
  }

  revalidatePath("/admin/inventory");
  return { success: true, newStock: newQty };
}

// Quick Stock In
export async function stockInItem(input: {
  itemId: string;
  quantity: number;
  reason: string;
  notes?: string;
  branchId?: string;
  batchNumber?: string;
  costPrice?: number;
  expiryDate?: string;
}) {
  return recordStockMovement({
    itemId: input.itemId,
    type: "stock_in",
    quantity: input.quantity,
    reason: input.reason || "Manual Restock",
    notes: input.notes,
    branchId: input.branchId,
    batchNumber: input.batchNumber,
  });
}

// Quick Stock Out
export async function stockOutItem(input: {
  itemId: string;
  quantity: number;
  reason: string;
  notes?: string;
  branchId?: string;
}) {
  return recordStockMovement({
    itemId: input.itemId,
    type: "stock_out",
    quantity: input.quantity,
    reason: input.reason || "Operational Usage",
    notes: input.notes,
    branchId: input.branchId,
  });
}

// Stock Adjustment (Physical Count)
export async function adjustStockItem(input: {
  itemId: string;
  newCount: number;
  reason: string;
  notes?: string;
  branchId?: string;
}) {
  return recordStockMovement({
    itemId: input.itemId,
    type: "adjustment",
    quantity: input.newCount,
    reason: input.reason || "Physical Inventory Count Correction",
    notes: input.notes,
    branchId: input.branchId,
  });
}

// Stock Wastage (Spill / Damaged)
export async function logWastageItem(input: {
  itemId: string;
  quantity: number;
  reason: string;
  notes?: string;
  branchId?: string;
}) {
  return recordStockMovement({
    itemId: input.itemId,
    type: "wastage",
    quantity: input.quantity,
    reason: input.reason || "Damaged/Contaminated Stock",
    notes: input.notes,
    branchId: input.branchId,
  });
}

// ==============================================================================
// 5. INTER-BRANCH TRANSFERS WORKFLOW
// ==============================================================================

export async function requestTransfer(input: {
  sourceBranchId: string;
  destinationBranchId: string;
  notes?: string;
  items: { itemId: string; quantity: number }[];
}) {
  const staff = await requireStaff();
  const canTransfer = await hasServerPermission("inventory.transfer");
  if (!canTransfer && staff.role !== "super_admin" && staff.role !== "admin" && staff.role !== "manager") {
    return { error: "Forbidden: You do not have permission to request stock transfers." };
  }

  if (input.sourceBranchId === input.destinationBranchId) {
    return { error: "Source and destination branch cannot be the same." };
  }

  if (!input.items || input.items.length === 0) {
    return { error: "Please select at least one item to transfer." };
  }

  const supabase = await createClient();
  const transferNumber = generateRef("TRF");

  // Create transfer record
  const { data: transfer, error: trfErr } = await supabase
    .from("inventory_transfers")
    .insert({
      transfer_number: transferNumber,
      source_branch_id: input.sourceBranchId,
      destination_branch_id: input.destinationBranchId,
      status: "requested" as TransferStatus,
      requested_by: staff.id,
      notes: input.notes || null,
    })
    .select("id")
    .single();

  if (trfErr || !transfer) {
    return { error: `Failed to create transfer: ${trfErr?.message || "Error"}` };
  }

  // Create transfer items
  const transferItems = input.items.map((it) => ({
    transfer_id: transfer.id,
    item_id: it.itemId,
    requested_quantity: it.quantity,
    dispatched_quantity: 0,
    received_quantity: 0,
  }));

  const { error: itemsErr } = await supabase
    .from("inventory_transfer_items")
    .insert(transferItems);

  if (itemsErr) {
    return { error: `Failed to save transfer line items: ${itemsErr.message}` };
  }

  revalidatePath("/admin/inventory");
  return { success: true, transferNumber };
}

export async function updateTransferStatus(input: {
  transferId: string;
  action: "approve" | "dispatch" | "receive" | "reject" | "cancel";
  discrepancyNotes?: string;
  receivedQuantities?: Record<string, number>;
}) {
  const staff = await requireStaff();
  const supabase = await createClient();

  const { data: transfer, error: fetchErr } = await supabase
    .from("inventory_transfers")
    .select("*, inventory_transfer_items(*)")
    .eq("id", input.transferId)
    .single();

  if (fetchErr || !transfer) {
    return { error: "Transfer record not found." };
  }

  if (input.action === "approve") {
    const { error } = await supabase
      .from("inventory_transfers")
      .update({
        status: "approved",
        approved_by: staff.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.transferId);

    if (error) return { error: error.message };
  } else if (input.action === "dispatch") {
    // Deduct stock from source or mark dispatched
    const { error } = await supabase
      .from("inventory_transfers")
      .update({
        status: "dispatched",
        dispatched_by: staff.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.transferId);

    if (error) return { error: error.message };
  } else if (input.action === "receive") {
    // Receiving confirmation
    const { error } = await supabase
      .from("inventory_transfers")
      .update({
        status: "completed",
        received_by: staff.id,
        discrepancy_notes: input.discrepancyNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.transferId);

    if (error) return { error: error.message };
  } else if (input.action === "reject" || input.action === "cancel") {
    const { error } = await supabase
      .from("inventory_transfers")
      .update({
        status: input.action === "reject" ? "rejected" : "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.transferId);

    if (error) return { error: error.message };
  }

  revalidatePath("/admin/inventory");
  return { success: true };
}

// ==============================================================================
// 6. PURCHASE ORDERS & PURCHASING
// ==============================================================================

export async function createPurchaseOrder(input: {
  supplierId: string;
  branchId: string;
  expectedDeliveryDate?: string;
  notes?: string;
  items: { itemId: string; quantity: number; unitCost: number }[];
}) {
  const staff = await requireStaff();
  const canPO = await hasServerPermission("inventory.purchase_orders");
  if (!canPO && staff.role !== "super_admin" && staff.role !== "admin" && staff.role !== "manager") {
    return { error: "Forbidden: You do not have permission to create purchase orders." };
  }

  if (!input.items || input.items.length === 0) {
    return { error: "Please add at least one line item." };
  }

  const supabase = await createClient();
  const poNumber = generateRef("PO");
  const totalCost = input.items.reduce((sum, it) => sum + it.quantity * it.unitCost, 0);

  const { data: po, error: poErr } = await supabase
    .from("inventory_purchase_orders")
    .insert({
      po_number: poNumber,
      supplier_id: input.supplierId,
      branch_id: input.branchId,
      expected_delivery_date: input.expectedDeliveryDate || null,
      total_cost: totalCost,
      status: "ordered",
      notes: input.notes || null,
      created_by: staff.id,
    })
    .select("id")
    .single();

  if (poErr || !po) {
    return { error: `Failed to create purchase order: ${poErr?.message || "Error"}` };
  }

  const poItems = input.items.map((it) => ({
    po_id: po.id,
    item_id: it.itemId,
    quantity_ordered: it.quantity,
    quantity_received: 0,
    unit_cost: it.unitCost,
  }));

  const { error: itemsErr } = await supabase.from("inventory_po_items").insert(poItems);
  if (itemsErr) {
    return { error: `Failed to save PO items: ${itemsErr.message}` };
  }

  revalidatePath("/admin/inventory");
  return { success: true, poNumber };
}

export async function receivePurchaseOrder(input: {
  poId: string;
  invoiceNumber?: string;
  receivedItems: {
    itemId: string;
    quantityReceived: number;
    batchNumber?: string;
    expiryDate?: string;
  }[];
}) {
  await requireStaff();
  const supabase = await createClient();

  // Increment stock for each received item and create movements
  for (const item of input.receivedItems) {
    if (item.quantityReceived > 0) {
      await stockInItem({
        itemId: item.itemId,
        quantity: item.quantityReceived,
        reason: `PO Received: Invoice ${input.invoiceNumber || "N/A"}`,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
      });
    }
  }

  // Update PO status
  const { error } = await supabase
    .from("inventory_purchase_orders")
    .update({
      status: "received",
      invoice_number: input.invoiceNumber || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.poId);

  if (error) return { error: error.message };

  revalidatePath("/admin/inventory");
  return { success: true };
}

// ==============================================================================
// 7. BATCH QUARANTINE / SAFETY ACTION
// ==============================================================================

export async function quarantineItem(itemId: string, isQuarantined: boolean, reason: string) {
  const staff = await requireStaff();
  const supabase = await createClient();

  const { error } = await supabase
    .from("inventory_items")
    .update({
      is_quarantined: isQuarantined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId);

  if (error) return { error: error.message };

  // Log in movements
  if (isQuarantined) {
    const refNum = generateRef("QRT");
    try {
      await supabase.from("inventory_movements").insert({
        reference_number: refNum,
        item_id: itemId,
        movement_type: "expired",
        quantity: 0,
        unit: "quarantine",
        previous_quantity: 0,
        new_quantity: 0,
        reason: `Quarantine applied: ${reason}`,
        performed_by: staff.id,
      });
    } catch {
      // ignore if table not present
    }
  }

  revalidatePath("/admin/inventory");
  return { success: true };
}

// ==============================================================================
// 8. TREATMENT MATERIALS / RECIPES (BOM) MANAGEMENT
// ==============================================================================

export async function getTreatmentRecipes(): Promise<TreatmentRecipeData[]> {
  const supabase = await createClient();

  const { data: treatments, error: tErr } = await supabase
    .from("treatments")
    .select("id, name, slug, session_price")
    .order("name", { ascending: true });

  if (tErr || !treatments) return [];

  const { data: materials, error: mErr } = await supabase
    .from("treatment_materials")
    .select("id, treatment_id, item_id, quantity_required, inventory_items(id, name, unit, current_stock, category)");

  if (mErr || !materials) {
    return treatments.map((t) => ({ 
      id: t.id,
      name: t.name,
      slug: t.slug,
      session_price: t.session_price || 0,
      materials: [] 
    }));
  }

  const materialsByTreatment: Record<string, TreatmentRecipeMaterial[]> = {};
  for (const m of materials) {
    if (!materialsByTreatment[m.treatment_id]) {
      materialsByTreatment[m.treatment_id] = [];
    }
    const invItem = m.inventory_items as unknown as {
      id: string;
      name: string;
      unit: string;
      current_stock: number;
      category: string;
    } | undefined;

    materialsByTreatment[m.treatment_id].push({
      id: m.id,
      itemId: m.item_id,
      quantityRequired: m.quantity_required,
      item: invItem,
    });
  }

  return treatments.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    session_price: t.session_price || 0,
    materials: materialsByTreatment[t.id] || [],
  }));
}

export async function addOrUpdateTreatmentMaterial(
  treatmentId: string,
  itemId: string,
  quantityRequired: number
) {
  const staff = await requireStaff();
  if (staff.role !== "super_admin" && staff.role !== "admin" && staff.role !== "manager") {
    return { error: "Forbidden: You do not have permission to edit treatment recipes." };
  }

  if (quantityRequired <= 0) {
    return { error: "Quantity must be at least 1." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("treatment_materials")
    .upsert(
      {
        treatment_id: treatmentId,
        item_id: itemId,
        quantity_required: quantityRequired,
      },
      { onConflict: "treatment_id,item_id" }
    );

  if (error) return { error: error.message };

  revalidatePath("/admin/inventory");
  return { success: true };
}

export async function deleteTreatmentMaterial(treatmentId: string, itemId: string) {
  const staff = await requireStaff();
  if (staff.role !== "super_admin" && staff.role !== "admin" && staff.role !== "manager") {
    return { error: "Forbidden: You do not have permission to delete treatment recipes." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("treatment_materials")
    .delete()
    .eq("treatment_id", treatmentId)
    .eq("item_id", itemId);

  if (error) return { error: error.message };

  revalidatePath("/admin/inventory");
  return { success: true };
}

