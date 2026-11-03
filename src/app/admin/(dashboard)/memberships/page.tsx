import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import MembershipsClient from "./MembershipsClient";
import { CustomerMember, MembershipTier, LoyaltyAuditEntry } from "./types";

export const metadata = {
  title: "Memberships & Loyalty — Admin",
  description: "Manage VIP tiers, client loyalty points, and member card passes.",
};

const DEFAULT_TIERS: MembershipTier[] = [
  {
    id: "bronze",
    name: "Bronze Regular",
    min_spend: 0,
    min_points: 0,
    discount_pct: 0,
    retail_discount_pct: 0,
    points_multiplier: 1.0,
    badge_color: "zinc",
    perks: [
      "1 Point for every ₱100 spent",
      "Member newsletter & birthday greetings",
      "Online booking access",
    ],
    is_active: true,
  },
  {
    id: "silver",
    name: "Silver VIP",
    min_spend: 10000,
    min_points: 500,
    discount_pct: 5,
    retail_discount_pct: 0,
    points_multiplier: 1.25,
    badge_color: "slate",
    perks: [
      "5% discount on all clinic treatments",
      "1.25x Loyalty Points multiplier",
      "Complimentary Birthday consultation",
      "Priority slot waitlist",
    ],
    is_active: true,
  },
  {
    id: "gold",
    name: "Gold VIP",
    min_spend: 25000,
    min_points: 1500,
    discount_pct: 10,
    retail_discount_pct: 5,
    points_multiplier: 1.5,
    badge_color: "amber",
    perks: [
      "10% discount on treatments",
      "5% discount on retail skincare",
      "1.5x Loyalty Points multiplier",
      "1 Free Birthday Facial treatment",
      "Complimentary skin analysis",
    ],
    is_active: true,
  },
  {
    id: "platinum",
    name: "Diamond Platinum VIP",
    min_spend: 50000,
    min_points: 3000,
    discount_pct: 15,
    retail_discount_pct: 10,
    points_multiplier: 2.0,
    badge_color: "purple",
    perks: [
      "15% discount on treatments",
      "10% discount on retail skincare",
      "2x Loyalty Points multiplier",
      "2 Free Birthday Luxury treatments",
      "VIP Private Room access",
      "Dedicated aesthetician priority queue",
    ],
    is_active: true,
  },
];

export default async function MembershipsPage() {
  await requireStaff();
  const supabase = createAdminClient();

  // 1. Fetch membership tiers (if table exists, otherwise fallback to defaults)
  let tiers = DEFAULT_TIERS;
  try {
    const { data: dbTiers } = await supabase
      .from("membership_tiers")
      .select("*")
      .order("display_order", { ascending: true });

    if (dbTiers && dbTiers.length > 0) {
      tiers = dbTiers as unknown as MembershipTier[];
    }
  } catch (err) {
    console.warn("Using default membership tiers:", err);
  }

  // 2. Fetch customers
  const { data: customers, error: custErr } = await supabase
    .from("customers")
    .select("id, first_name, last_name, phone, email, loyalty_points, customer_code, client_classification, created_at")
    .order("created_at", { ascending: false });

  if (custErr) {
    console.error("Failed to load customers for memberships:", custErr);
  }

  // Map tiers lookup
  const tierMap = new Map<string, MembershipTier>();
  for (const t of tiers) {
    tierMap.set(t.id, t);
  }

  const initialMembers: CustomerMember[] = (customers || []).map((c) => {
    // Resolve tier by classification or points
    let tierId = "bronze";
    const classification = (c.client_classification || "").toLowerCase();

    if (classification.includes("platinum")) tierId = "platinum";
    else if (classification.includes("gold")) tierId = "gold";
    else if (classification.includes("silver")) tierId = "silver";
    else {
      // Auto-assign based on points if not explicitly set
      const points = Number(c.loyalty_points || 0);
      if (points >= 3000) tierId = "platinum";
      else if (points >= 1500) tierId = "gold";
      else if (points >= 500) tierId = "silver";
    }

    const tier = tierMap.get(tierId) || DEFAULT_TIERS[0];
    const cardNumber =
      c.customer_code || `CY-VIP-${c.id.slice(0, 6).toUpperCase()}`;

    return {
      id: c.id,
      customer_code: cardNumber,
      first_name: c.first_name || "Valued",
      last_name: c.last_name || "Client",
      phone: c.phone || "",
      email: c.email || null,
      tier_id: tier.id,
      tier_name: tier.name,
      tier_badge_color: tier.badge_color,
      discount_pct: Number(tier.discount_pct || 0),
      retail_discount_pct: Number(tier.retail_discount_pct || 0),
      card_number: cardNumber,
      loyalty_points: Number(c.loyalty_points || 0),
      total_spend: 0,
      registered_at: c.created_at,
      expiry_date: null,
      status: "active",
      notes: null,
    };
  });

  // 3. Fetch recent audit logs for loyalty adjustments
  let recentAuditLogs: LoyaltyAuditEntry[] = [];
  try {
    const { data: auditData } = await supabase
      .from("client_audit_logs")
      .select("id, customer_id, action, metadata, created_at")
      .in("action", [
        "LOYALTY_POINTS_ADJUSTED",
        "MEMBERSHIP_TIER_UPDATED",
        "VIP_CARD_ISSUED",
      ])
      .order("created_at", { ascending: false })
      .limit(50);

    if (auditData) {
      recentAuditLogs = auditData.map((a) => {
        const meta = (a.metadata || {}) as Record<string, unknown>;
        return {
          id: a.id,
          customer_id: a.customer_id,
          customer_name: String(meta.client_name || "Customer"),
          staff_name: String(meta.actor || "Staff"),
          action_type: a.action,
          points_change: Number(meta.points_delta || 0),
          balance_after: Number(meta.new_points || 0),
          reason: String(meta.reason || meta.new_tier || ""),
          created_at: a.created_at,
        };
      });
    }
  } catch (err) {
    console.warn("Failed to load loyalty audit logs:", err);
  }

  return (
    <MembershipsClient
      initialMembers={initialMembers}
      tiers={tiers}
      recentAuditLogs={recentAuditLogs}
    />
  );
}

