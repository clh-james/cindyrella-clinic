-- ==============================================================================
-- Cindyrella Aesthetic & Wellness Clinic
-- Migration 0049: Memberships and Loyalty Program Foundation
-- Supports VIP tiers (Bronze, Silver, Gold, Platinum), points ledger, and VIP passes
-- ==============================================================================

-- 1. Create membership_tiers table
CREATE TABLE IF NOT EXISTS membership_tiers (
  id TEXT PRIMARY KEY, -- 'bronze', 'silver', 'gold', 'platinum'
  name TEXT NOT NULL,
  min_spend NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  min_points INTEGER NOT NULL DEFAULT 0,
  discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  retail_discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  points_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  badge_color TEXT NOT NULL DEFAULT 'slate',
  perks TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default clinic membership tiers
INSERT INTO membership_tiers (id, name, min_spend, min_points, discount_pct, retail_discount_pct, points_multiplier, badge_color, perks, display_order)
VALUES 
  ('bronze', 'Bronze Member', 0, 0, 0.0, 0.0, 1.0, 'zinc', ARRAY['1 Point for every ₱100 spent', 'Member newsletter & birthday greetings', 'Online booking access'], 1),
  ('silver', 'Silver VIP', 10000, 500, 5.0, 0.0, 1.25, 'slate', ARRAY['5% discount on all clinic treatments', '1.25x Loyalty Points multiplier', 'Complimentary Birthday consultation', 'Priority slot waitlist'], 2),
  ('gold', 'Gold VIP', 25000, 1500, 10.0, 5.0, 1.5, 'amber', ARRAY['10% discount on treatments', '5% discount on retail skincare', '1.5x Loyalty Points multiplier', '1 Free Birthday Facial treatment', 'Complimentary skin analysis'], 3),
  ('platinum', 'Diamond Platinum VIP', 50000, 3000, 15.0, 10.0, 2.0, 'purple', ARRAY['15% discount on treatments', '10% discount on retail skincare', '2x Loyalty Points multiplier', '2 Free Birthday Luxury treatments', 'VIP Private Room access', 'Dedicated aesthetician priority queue'], 4)
ON CONFLICT (id) DO NOTHING;

-- 2. Create customer_memberships table
CREATE TABLE IF NOT EXISTS customer_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tier_id TEXT NOT NULL REFERENCES membership_tiers(id) ON DELETE RESTRICT,
  card_number TEXT UNIQUE,
  points_balance INTEGER NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
  total_spend NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_spend >= 0),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE, -- NULL means lifetime VIP
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_memberships_cust ON customer_memberships(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_memberships_tier ON customer_memberships(tier_id);
CREATE INDEX IF NOT EXISTS idx_customer_memberships_card ON customer_memberships(card_number);

-- 3. Create loyalty_points_ledger table
CREATE TABLE IF NOT EXISTS loyalty_points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  points_change INTEGER NOT NULL, -- Positive for earning/bonus, negative for redemption
  balance_after INTEGER NOT NULL,
  action_type TEXT NOT NULL, -- 'EARNED_PURCHASE', 'MANUAL_BONUS', 'REDEMPTION', 'TIER_UPGRADE', 'EXPIRATION'
  reference_id TEXT, -- POS sale id, appointment id, or receipt number
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_cust ON loyalty_points_ledger(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_date ON loyalty_points_ledger(created_at);

-- 4. Enable Row Level Security
ALTER TABLE membership_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_points_ledger ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "Public read membership tiers" ON membership_tiers
  FOR SELECT USING (true);

CREATE POLICY "Staff can view customer memberships" ON customer_memberships
  FOR SELECT USING (has_permission(auth.uid(), 'memberships.view') OR is_super_admin());

CREATE POLICY "Staff can modify customer memberships" ON customer_memberships
  FOR ALL USING (has_permission(auth.uid(), 'memberships.edit') OR is_super_admin())
  WITH CHECK (has_permission(auth.uid(), 'memberships.edit') OR is_super_admin());

CREATE POLICY "Staff can view loyalty ledger" ON loyalty_points_ledger
  FOR SELECT USING (has_permission(auth.uid(), 'memberships.view') OR is_super_admin());

CREATE POLICY "Staff can insert loyalty ledger" ON loyalty_points_ledger
  FOR INSERT WITH CHECK (has_permission(auth.uid(), 'memberships.edit') OR is_super_admin());

