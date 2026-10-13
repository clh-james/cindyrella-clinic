import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { hasServerPermission } from "@/lib/rbac";
import { InventoryClient } from "./InventoryClient";
import { 
  InventoryItem, InventoryCategory, InventorySupplier, 
  InventoryMovement, InventoryTransfer, InventoryPurchaseOrder, BranchInfo,
  DEFAULT_CATEGORIES 
} from "./types";

export const metadata = { title: "Inventory & Medical Supplies — Admin" };

export default async function InventoryPage() {
  const staff = await requireStaff();
  const supabase = await createClient();

  // Fetch branches
  const { data: branchesData } = await supabase
    .from("branches")
    .select("id, name, address, phone")
    .order("name", { ascending: true });

  const branches: BranchInfo[] = (branchesData || []).map((b) => ({
    id: b.id,
    name: b.name,
    address: b.address,
    phone: b.phone,
  }));

  // Fetch inventory items
  const { data: itemsData } = await supabase
    .from("inventory_items")
    .select("*")
    .order("name", { ascending: true });

  const items: InventoryItem[] = (itemsData || []).map((item) => ({
    ...item,
    cost_price: item.cost_price ?? 0,
    retail_price: item.retail_price ?? null,
    reorder_quantity: item.reorder_quantity ?? 10,
    is_active: item.is_active ?? true,
    is_quarantined: item.is_quarantined ?? false,
  }));

  // Fetch categories directly
  let categories: InventoryCategory[] = [];
  try {
    const { data: catData, error: catErr } = await supabase
      .from("inventory_categories")
      .select("*")
      .order("name", { ascending: true });

    if (!catErr && catData && catData.length > 0) {
      categories = catData as InventoryCategory[];
    } else {
      categories = DEFAULT_CATEGORIES.map((c, i) => ({
        id: `default-${i}`,
        name: c.name,
        code: c.code,
        description: c.description,
        subcategories: c.subcategories,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    }
  } catch {
    categories = DEFAULT_CATEGORIES.map((c, i) => ({
      id: `default-${i}`,
      name: c.name,
      code: c.code,
      description: c.description,
      subcategories: c.subcategories,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  }

  // Fetch suppliers directly
  let suppliers: InventorySupplier[] = [];
  try {
    const { data: suppData, error: suppErr } = await supabase
      .from("inventory_suppliers")
      .select("*")
      .order("name", { ascending: true });

    if (!suppErr && suppData) {
      suppliers = suppData as InventorySupplier[];
    }
  } catch {
    suppliers = [];
  }

  // Fetch recent stock movements (with fallback to inventory_logs)
  let movements: InventoryMovement[] = [];
  try {
    const { data: movementsData, error: movErr } = await supabase
      .from("inventory_movements")
      .select("*, inventory_items(name, sku)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!movErr && movementsData && movementsData.length > 0) {
      movements = movementsData as unknown as InventoryMovement[];
    } else {
      // Fallback: load legacy inventory_logs
      const { data: logsData } = await supabase
        .from("inventory_logs")
        .select("id, item_id, change_amount, reason, created_at, created_by")
        .order("created_at", { ascending: false })
        .limit(50);

      const itemsMap = new Map(items.map((i) => [i.id, i]));
      movements = (logsData || []).map((l) => {
        const it = itemsMap.get(l.item_id);
        const isPos = l.change_amount > 0;
        return {
          id: l.id,
          reference_number: `LOG-${l.id.slice(0, 8).toUpperCase()}`,
          item_id: l.item_id,
          movement_type: isPos ? "stock_in" : "stock_out",
          quantity: Math.abs(l.change_amount),
          unit: it?.unit || "units",
          previous_quantity: (it?.current_stock || 0) - l.change_amount,
          new_quantity: it?.current_stock || 0,
          reason: l.reason,
          created_at: l.created_at,
          performed_by: l.created_by,
          inventory_items: { name: it?.name || "Consumable", sku: it?.sku || null },
        } as InventoryMovement;
      });
    }
  } catch {
    movements = [];
  }

  // Fetch transfers
  let transfers: InventoryTransfer[] = [];
  try {
    const { data: transfersData, error: trfErr } = await supabase
      .from("inventory_transfers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!trfErr && transfersData) {
      transfers = transfersData as unknown as InventoryTransfer[];
    }
  } catch {
    transfers = [];
  }

  // Fetch purchase orders
  let purchaseOrders: InventoryPurchaseOrder[] = [];
  try {
    const { data: poData, error: poErr } = await supabase
      .from("inventory_purchase_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!poErr && poData) {
      purchaseOrders = poData as unknown as InventoryPurchaseOrder[];
    }
  } catch {
    purchaseOrders = [];
  }

  // Check RBAC Permissions
  const isSuperAdmin = staff.role === "super_admin";
  const isAdmin = staff.role === "admin";

  let permissions = {
    canCreate: true,
    canEdit: true,
    canAdjust: true,
    canTransfer: true,
    canApproveTransfer: true,
    canManageSuppliers: true,
    canManagePOs: true,
    canManageCategories: true,
    canManageFinancials: true,
    canViewAllBranches: true,
  };

  if (!isSuperAdmin && !isAdmin) {
    const [
      canCreate,
      canEdit,
      canAdjust,
      canTransfer,
      canApproveTransfer,
      canManageSuppliers,
      canManagePOs,
      canManageCategories,
      canManageFinancials,
    ] = await Promise.all([
      hasServerPermission("inventory.create"),
      hasServerPermission("inventory.edit"),
      hasServerPermission("inventory.adjust"),
      hasServerPermission("inventory.transfer"),
      hasServerPermission("inventory.transfer_approve"),
      hasServerPermission("inventory.suppliers"),
      hasServerPermission("inventory.purchase_orders"),
      hasServerPermission("inventory.categories"),
      hasServerPermission("reports.financial"),
    ]);

    permissions = {
      canCreate,
      canEdit,
      canAdjust,
      canTransfer,
      canApproveTransfer,
      canManageSuppliers,
      canManagePOs,
      canManageCategories,
      canManageFinancials,
      canViewAllBranches: false,
    };
  }

  return (
    <InventoryClient
      initialItems={items}
      categories={categories}
      suppliers={suppliers}
      movements={movements}
      transfers={transfers}
      purchaseOrders={purchaseOrders}
      branches={branches}
      currentStaff={staff}
      permissions={permissions}
    />
  );
}
