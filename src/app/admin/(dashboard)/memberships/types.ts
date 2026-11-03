export interface MembershipTier {
  id: string; // 'bronze' | 'silver' | 'gold' | 'platinum'
  name: string;
  min_spend: number;
  min_points: number;
  discount_pct: number;
  retail_discount_pct: number;
  points_multiplier: number;
  badge_color: string;
  perks: string[];
  is_active: boolean;
}

export interface CustomerMember {
  id: string;
  customer_code: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  tier_id: string;
  tier_name: string;
  tier_badge_color: string;
  discount_pct: number;
  retail_discount_pct: number;
  card_number: string;
  loyalty_points: number;
  total_spend: number;
  registered_at: string;
  expiry_date: string | null;
  status: "active" | "expired" | "suspended";
  notes: string | null;
}

export interface LoyaltyAuditEntry {
  id: string;
  customer_id: string;
  customer_name: string;
  staff_name?: string;
  action_type: string;
  points_change: number;
  balance_after: number;
  reason?: string;
  created_at: string;
}

