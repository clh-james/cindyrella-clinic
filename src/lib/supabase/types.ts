export type Branch = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
};

export type Treatment = {
  id: string;
  slug: string;
  name: string;
  category: string;
  badge: string | null;
  session_price: number;
  five_plus_one_price: number | null;
  ten_plus_two_price: number | null;
  primary_desc: string | null;
  secondary_desc: string | null;
  best_for: string | null;
  duration_minutes: number | null;
  is_active: boolean;
  sort_order: number;
};

export type PaymentMethod = "gcash" | "bank_transfer" | "cash" | "credit_card" | "maya";

export type Customer = {
  id: string;
  auth_id: string | null;
  loyalty_points: number;
  first_name: string;
  last_name: string;
  birthday: string | null;
  gender: string | null;
  phone: string;
  email: string;
  address: string | null;
  medical_conditions: string | null;
  allergies: string | null;
  is_pregnant: boolean | null;
  emergency_contact: string | null;
  created_at: string;
};

export type NewCustomer = Omit<Customer, "id" | "auth_id" | "loyalty_points" | "created_at"> & {
  auth_id?: string | null;
  loyalty_points?: number;
};

export type PromoCode = {
  id: string;
  code: string;
  discount_type: "fixed" | "percentage";
  discount_value: number;
  valid_until: string | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
};

export type InventoryItem = {
  id: string;
  name: string;
  sku: string | null;
  category: string;
  unit: string;
  current_stock: number;
  low_stock_threshold: number;
  retail_price?: number | null;
  created_at: string;
  updated_at: string;
};

export type POSSale = {
  id: string;
  reference_number: string;
  total_amount: number;
  payment_method: string;
  customer_id: string | null;
  created_by: string | null;
  created_at: string;
};

export type POSSaleItem = {
  id: string;
  sale_id: string;
  item_id: string;
  quantity: number;
  price_per_unit: number;
};

export type InventoryLog = {
  id: string;
  item_id: string;
  change_amount: number;
  reason: string;
  created_at: string;
  created_by: string | null;
};

export type TreatmentMaterial = {
  id: string;
  treatment_id: string;
  item_id: string;
  quantity_required: number;
};

export type NewAppointment = {
  customer_id: string;
  treatment_id: string;
  branch_id: string;
  appointment_date: string;
  appointment_time: string;
  payment_method: PaymentMethod;
  amount_due: number;
  applied_promo_code?: string | null;
};
