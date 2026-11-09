export interface PromoCode {
  id: string;
  code: string;
  discount_type: "fixed" | "percentage";
  discount_value: number;
  valid_until: string | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  created_at: string;
}

