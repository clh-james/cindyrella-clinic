export interface CustomerPackage {
  id: string;
  customer_id: string;
  package_name: string;
  treatment_id?: string | null;
  branch_id?: string | null;
  total_sessions: number;
  sessions_remaining: number;
  price_paid: number;
  start_date: string;
  expiry_date?: string | null;
  status: "active" | "fully_redeemed" | "expired" | "cancelled";
  notes?: string | null;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
  } | null;
  treatment?: {
    id: string;
    name: string;
    session_price: number;
  } | null;
  branch?: {
    id: string;
    name: string;
  } | null;
}

export interface PackageTemplateItem {
  treatment_id: string;
  treatment_name: string;
  session_price: number;
  five_plus_one_price?: number | null;
  ten_plus_two_price?: number | null;
}

export interface RedemptionRecord {
  id: string;
  customer_id: string;
  customer_name?: string;
  package_name?: string;
  session_number: number;
  total_sessions: number;
  remaining_sessions: number;
  performed_by_name?: string;
  branch_name?: string;
  notes?: string;
  redeemed_at: string;
}
