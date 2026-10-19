export type UnitOfMeasure =
  | "pcs"
  | "box"
  | "pack"
  | "bottle"
  | "vial"
  | "ampoule"
  | "syringe"
  | "mL"
  | "liter"
  | "roll"
  | "set"
  | "unit"
  | string;

export const STANDARD_UNITS: string[] = [
  "pcs",
  "box",
  "pack",
  "bottle",
  "vial",
  "ampoule",
  "syringe",
  "mL",
  "liter",
  "roll",
  "set",
  "unit",
];

export type StockMovementType =
  | "stock_in"
  | "stock_out"
  | "adjustment"
  | "transfer"
  | "wastage"
  | "expired"
  | "customer_return"
  | "supplier_return";

export const MOVEMENT_TYPE_LABELS: Record<StockMovementType, { label: string; color: string }> = {
  stock_in: { label: "Stock In", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  stock_out: { label: "Stock Out", color: "text-blue-700 bg-blue-50 border-blue-200" },
  adjustment: { label: "Stock Adjustment", color: "text-purple-700 bg-purple-50 border-purple-200" },
  transfer: { label: "Stock Transfer", color: "text-cyan-700 bg-cyan-50 border-cyan-200" },
  wastage: { label: "Stock Wastage", color: "text-amber-700 bg-amber-50 border-amber-200" },
  expired: { label: "Expired Stock", color: "text-red-700 bg-red-50 border-red-200" },
  customer_return: { label: "Customer Return", color: "text-indigo-700 bg-indigo-50 border-indigo-200" },
  supplier_return: { label: "Supplier Return", color: "text-orange-700 bg-orange-50 border-orange-200" },
};

export type TransferStatus =
  | "requested"
  | "pending_approval"
  | "approved"
  | "dispatched"
  | "received"
  | "completed"
  | "rejected"
  | "cancelled";

export type PurchaseOrderStatus =
  | "draft"
  | "ordered"
  | "partially_received"
  | "received"
  | "cancelled";

export interface InventoryCategory {
  id: string;
  name: string;
  code: string;
  description: string | null;
  subcategories: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  item_count?: number;
}

export interface InventorySupplier {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  products_supplied: string | null;
  payment_terms: string | null;
  notes: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  barcode?: string | null;
  description?: string | null;
  category: string; // legacy text category
  category_id?: string | null;
  subcategory?: string | null;
  brand?: string | null;
  unit: string;
  current_stock: number;
  low_stock_threshold: number;
  reorder_quantity?: number;
  cost_price?: number; // purchase cost in PHP
  retail_price: number | null; // selling price in PHP
  supplier_id?: string | null;
  storage_location?: string | null;
  batch_number?: string | null;
  mfg_date?: string | null;
  expiry_date?: string | null;
  branch_id?: string | null;
  image_url?: string | null;
  is_active?: boolean;
  is_quarantined?: boolean;
  created_at: string;
  updated_at: string;
  // Joins
  categories?: { id: string; name: string; code: string } | null;
  suppliers?: { id: string; name: string } | null;
  branches?: { id: string; name: string } | null;
}

export interface InventoryStockBalance {
  id: string;
  item_id: string;
  branch_id: string;
  quantity: number;
  low_stock_threshold: number;
  reorder_quantity: number;
  storage_location?: string | null;
  updated_at?: string;
  branch?: { id: string; name: string };
}

export interface InventoryBatch {
  id: string;
  item_id: string;
  branch_id: string;
  batch_number: string;
  initial_quantity: number;
  current_quantity: number;
  cost_price: number;
  mfg_date?: string | null;
  expiry_date?: string | null;
  status: "active" | "quarantined" | "recalled" | "depleted" | "expired";
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryMovement {
  id: string;
  reference_number: string;
  item_id: string;
  movement_type: StockMovementType;
  quantity: number;
  unit: string;
  source_branch_id?: string | null;
  destination_branch_id?: string | null;
  batch_id?: string | null;
  batch_number?: string | null;
  previous_quantity: number;
  new_quantity: number;
  reason: string;
  notes?: string | null;
  reference_id?: string | null;
  performed_by?: string | null;
  approved_by?: string | null;
  created_at: string;
  // Joins
  inventory_items?: { name: string; sku: string | null };
  source_branch?: { name: string };
  destination_branch?: { name: string };
  performer?: { full_name: string };
}

export interface InventoryTransferItem {
  id: string;
  transfer_id: string;
  item_id: string;
  batch_id?: string | null;
  requested_quantity: number;
  dispatched_quantity: number;
  received_quantity: number;
  item?: { name: string; unit: string; sku: string | null };
}

export interface InventoryTransfer {
  id: string;
  transfer_number: string;
  source_branch_id: string;
  destination_branch_id: string;
  status: TransferStatus;
  requested_by?: string | null;
  approved_by?: string | null;
  dispatched_by?: string | null;
  received_by?: string | null;
  notes?: string | null;
  discrepancy_notes?: string | null;
  created_at: string;
  updated_at: string;
  source_branch?: { name: string };
  destination_branch?: { name: string };
  items?: InventoryTransferItem[];
}

export interface InventoryPOItem {
  id: string;
  po_id: string;
  item_id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  batch_number?: string | null;
  expiry_date?: string | null;
  item?: { name: string; unit: string; sku: string | null };
}

export interface InventoryPurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  branch_id: string;
  order_date: string;
  expected_delivery_date?: string | null;
  total_cost: number;
  status: PurchaseOrderStatus;
  invoice_number?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  supplier?: { name: string; contact_person: string | null; phone: string | null };
  branch?: { name: string };
  items?: InventoryPOItem[];
}

export interface BranchInfo {
  id: string;
  name: string;
  address?: string;
  phone?: string;
}

// Default 8 Categories specified in project requirements
export const DEFAULT_CATEGORIES: {
  name: string;
  code: string;
  description: string;
  subcategories: string[];
}[] = [
  {
    name: "IV Drip & Infusion Supplies",
    code: "IVS",
    description: "IV bags, infusion sets, tubing, cannulas, and intravenous infusion essentials",
    subcategories: ["IV Bags", "Infusion Sets", "Tubing", "Cannulas", "Catheters"],
  },
  {
    name: "Aesthetic & Treatment Products",
    code: "ATP",
    description: "Approved treatment products, serums, ampoules, peels, and clinical vials",
    subcategories: ["Serums", "Ampoules", "Vials", "Peels", "Boosters"],
  },
  {
    name: "Medical Consumables & PPE",
    code: "MCP",
    description: "Gloves, masks, gauze, cotton, alcohol swabs, syringes, and clinical disposables",
    subcategories: ["Gloves", "Masks", "Gauze & Cotton", "Alcohol Swabs", "Syringes & Needles", "Bandages"],
  },
  {
    name: "Skincare & Retail Products",
    code: "SKN",
    description: "Cleansers, moisturizers, sunscreen, lotions, and take-home retail products",
    subcategories: ["Cleansers", "Moisturizers", "Sunscreen", "Toners", "Creams"],
  },
  {
    name: "Spa, Nail & Beauty Supplies",
    code: "SNB",
    description: "Nail polish, files, acetone, wax, massage oils, and aesthetic beauty essentials",
    subcategories: ["Nail Care", "Waxing Supplies", "Massage Oils", "Eyelash Supplies", "Piercing Supplies"],
  },
  {
    name: "Cleaning & Sanitation Supplies",
    code: "CLN",
    description: "Disinfectants, detergents, hand soap, trash bags, and clinic sterilizers",
    subcategories: ["Disinfectants", "Sterilization", "Detergents", "Soaps & Sanitizers", "Trash Bags"],
  },
  {
    name: "Office & POS Supplies",
    code: "OPS",
    description: "Receipt rolls, printer paper, labels, pens, and clerical administrative supplies",
    subcategories: ["Receipt Rolls", "Printer Paper", "Thermal Labels", "Office Stationery"],
  },
  {
    name: "Equipment & Reusable Tools",
    code: "EQT",
    description: "Treatment machines, reusable instruments, trolleys, autoclave trays, and hardware",
    subcategories: ["Treatment Machines", "Reusable Tools", "Trolleys & Trays", "Applicators"],
  },
];

export interface TreatmentRecipeMaterial {
  id: string;
  itemId: string;
  quantityRequired: number;
  item?: {
    id: string;
    name: string;
    unit: string;
    current_stock: number;
    category: string;
  };
}

export interface TreatmentRecipeData {
  id: string;
  name: string;
  slug: string;
  session_price: number;
  materials: TreatmentRecipeMaterial[];
}

