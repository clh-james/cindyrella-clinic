"use client";

import { useState } from "react";
import {
  Crown,
  Search,
  Sparkles,
  Award,
  ChevronRight,
  TrendingUp,
  History,
  Users,
  Copy,
  Check,
  Percent,
} from "lucide-react";
import { CustomerMember, MembershipTier, LoyaltyAuditEntry } from "./types";
import AdjustPointsModal from "./AdjustPointsModal";
import AssignTierModal from "./AssignTierModal";
import TierBenefitsDrawer from "./TierBenefitsDrawer";
import { useRouter } from "next/navigation";

interface MembershipsClientProps {
  initialMembers: CustomerMember[];
  tiers: MembershipTier[];
  recentAuditLogs: LoyaltyAuditEntry[];
}

export default function MembershipsClient({
  initialMembers,
  tiers,
  recentAuditLogs,
}: MembershipsClientProps) {
  const router = useRouter();
  const [members, setMembers] = useState<CustomerMember[]>(initialMembers);
  const [activeTab, setActiveTab] = useState<"members" | "history">("members");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>("all");

  // Modals state
  const [adjustMember, setAdjustMember] = useState<CustomerMember | null>(null);
  const [tierMember, setTierMember] = useState<CustomerMember | null>(null);
  const [isBenefitsOpen, setIsBenefitsOpen] = useState(false);

  // Copied feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useState(() => {
    setMembers(initialMembers);
  });

  const handleCopyCard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredMembers = members.filter((member) => {
    const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      fullName.includes(query) ||
      member.phone.includes(query) ||
      member.card_number.toLowerCase().includes(query) ||
      member.customer_code.toLowerCase().includes(query);

    const matchesTier =
      selectedTierFilter === "all" || member.tier_id === selectedTierFilter;

    return matchesSearch && matchesTier;
  });

  // KPIs
  const totalMembers = members.length;
  const vipCount = members.filter(
    (m) => m.tier_id === "silver" || m.tier_id === "gold" || m.tier_id === "platinum"
  ).length;
  const totalPoints = members.reduce((sum, m) => sum + (m.loyalty_points || 0), 0);
  const totalSpendAgg = members.reduce((sum, m) => sum + (m.total_spend || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2.5">
            <Crown className="h-7 w-7 text-amber-500" />
            Memberships & Loyalty Program
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            VIP tiers, customer loyalty point balances, exclusive discounts, and points redemption.
          </p>
        </div>

        <button
          onClick={() => setIsBenefitsOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-sm hover:bg-mist transition-all self-start sm:self-auto"
        >
          <Award className="h-4 w-4 text-amber-500" />
          View Tier Matrix & Perks
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider">Total Members</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-royal/10 text-royal">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-ink mt-2">{totalMembers}</p>
          <p className="text-xs text-ink-soft mt-0.5">Enrolled clinic clients</p>
        </div>

        <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider">VIP Tier Clients</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Crown className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-ink mt-2">{vipCount}</p>
          <p className="text-xs text-ink-soft mt-0.5">Silver, Gold & Platinum</p>
        </div>

        <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider">Total Points In Balance</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-ink mt-2">{totalPoints.toLocaleString()} pts</p>
          <p className="text-xs text-ink-soft mt-0.5">Worth approx. ₱{totalPoints.toLocaleString()}</p>
        </div>

        <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider">Lifetime Spend</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-ink mt-2">₱{totalSpendAgg.toLocaleString()}</p>
          <p className="text-xs text-ink-soft mt-0.5">From tracked transactions</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-line">
        <button
          onClick={() => setActiveTab("members")}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 text-sm font-semibold transition-all ${
            activeTab === "members"
              ? "border-royal text-royal"
              : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          <Crown className="h-4 w-4" />
          Member Directory & VIP Cards ({filteredMembers.length})
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 text-sm font-semibold transition-all ${
            activeTab === "history"
              ? "border-royal text-royal"
              : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          <History className="h-4 w-4" />
          Points Ledger & Audit History ({recentAuditLogs.length})
        </button>
      </div>

      {/* TAB 1: MEMBERS DIRECTORY */}
      {activeTab === "members" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between rounded-2xl border border-line bg-white p-3 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft" />
              <input
                type="text"
                placeholder="Search member name, phone, or VIP card number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-line pl-10 pr-4 py-2 text-sm text-ink outline-none focus:border-royal focus:ring-2 focus:ring-royal/20 transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setSelectedTierFilter("all")}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition-all shrink-0 ${
                  selectedTierFilter === "all"
                    ? "bg-royal text-white shadow-sm"
                    : "bg-mist/50 text-ink-soft hover:bg-mist hover:text-ink"
                }`}
              >
                All Tiers
              </button>
              {tiers.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTierFilter(t.id)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition-all shrink-0 ${
                    selectedTierFilter === t.id
                      ? "bg-royal text-white shadow-sm"
                      : "bg-mist/50 text-ink-soft hover:bg-mist hover:text-ink"
                  }`}
                >
                  {t.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Members Grid */}
          {filteredMembers.length === 0 ? (
            <div className="rounded-2xl border border-line bg-white p-12 text-center shadow-sm">
              <Crown className="mx-auto h-12 w-12 text-ink-soft/40 mb-3" />
              <h3 className="text-base font-semibold text-ink">No members found</h3>
              <p className="text-xs text-ink-soft mt-1 max-w-sm mx-auto">
                No client records matched &quot;{searchQuery}&quot;.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className={`relative flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md ${
                    member.tier_id === "platinum"
                      ? "border-purple-200 bg-gradient-to-br from-white via-white to-purple-50/40"
                      : member.tier_id === "gold"
                      ? "border-amber-200 bg-gradient-to-br from-white via-white to-amber-50/40"
                      : "border-line"
                  }`}
                >
                  <div>
                    {/* Member Top Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-ink text-base">
                          {member.first_name} {member.last_name}
                        </h3>
                        <p className="text-xs text-ink-soft mt-0.5">{member.phone || "No phone registered"}</p>
                      </div>

                      {/* Tier Badge */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                          member.tier_id === "platinum"
                            ? "bg-purple-100 text-purple-800 border border-purple-200"
                            : member.tier_id === "gold"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : member.tier_id === "silver"
                            ? "bg-slate-200 text-slate-800 border border-slate-300"
                            : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                        }`}
                      >
                        <Crown className="h-3 w-3" />
                        {member.tier_name}
                      </span>
                    </div>

                    {/* Card Number Pill */}
                    <div className="mt-3.5 flex items-center justify-between rounded-xl bg-mist/50 border border-line px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-ink-soft">Card:</span>
                        <span className="font-mono text-xs font-semibold text-ink">
                          {member.card_number}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopyCard(member.card_number)}
                        className="text-ink-soft hover:text-royal transition-colors p-1"
                        title="Copy VIP Card"
                      >
                        {copiedId === member.card_number ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Stats & Perks */}
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <div className="rounded-xl border border-line p-2.5 bg-white">
                        <div className="flex items-center gap-1.5 text-amber-600">
                          <Sparkles className="h-3.5 w-3.5" />
                          <span className="text-[10px] uppercase font-bold text-ink-soft">Points</span>
                        </div>
                        <p className="text-base font-bold text-ink mt-0.5">
                          {member.loyalty_points.toLocaleString()}
                        </p>
                      </div>

                      <div className="rounded-xl border border-line p-2.5 bg-white">
                        <div className="flex items-center gap-1.5 text-royal">
                          <Percent className="h-3.5 w-3.5" />
                          <span className="text-[10px] uppercase font-bold text-ink-soft">Discount</span>
                        </div>
                        <p className="text-base font-bold text-royal mt-0.5">
                          {member.discount_pct}% OFF
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="mt-5 pt-3.5 border-t border-line flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustMember(member)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-500/20 transition-colors"
                    >
                      <Sparkles className="h-3 w-3" /> Adjust Points
                    </button>

                    <button
                      type="button"
                      onClick={() => setTierMember(member)}
                      className="inline-flex items-center gap-1 rounded-xl bg-royal/10 px-3 py-1.5 text-xs font-bold text-royal hover:bg-royal/20 transition-colors"
                    >
                      Upgrade Tier <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: POINTS LEDGER & AUDIT HISTORY */}
      {activeTab === "history" && (
        <div className="rounded-2xl border border-line bg-white shadow-sm overflow-hidden">
          <div className="border-b border-line bg-mist/30 px-6 py-4">
            <h2 className="text-sm font-bold text-ink">Recent Loyalty Points & Membership Activity</h2>
            <p className="text-xs text-ink-soft">Audit log of points awarded, redeemed, and tier upgrades</p>
          </div>

          {recentAuditLogs.length === 0 ? (
            <div className="p-12 text-center text-xs text-ink-soft">
              No points activity recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-line bg-mist/20 text-ink-soft uppercase text-[10px]">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Date & Time</th>
                    <th className="px-6 py-3 font-semibold">Client</th>
                    <th className="px-6 py-3 font-semibold">Action</th>
                    <th className="px-6 py-3 font-semibold text-right">Points Change</th>
                    <th className="px-6 py-3 font-semibold text-right">Balance After</th>
                    <th className="px-6 py-3 font-semibold">Authorized By</th>
                    <th className="px-6 py-3 font-semibold">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-ink">
                  {recentAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-mist/30">
                      <td className="px-6 py-3 text-ink-soft whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-3 font-semibold">{log.customer_name}</td>
                      <td className="px-6 py-3">
                        <span className="rounded-md bg-royal/10 px-2 py-0.5 text-[10px] font-bold text-royal">
                          {log.action_type.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className={`px-6 py-3 font-bold text-right ${log.points_change >= 0 ? "text-emerald-600" : "text-amber-600"}`}>
                        {log.points_change >= 0 ? `+${log.points_change}` : log.points_change}
                      </td>
                      <td className="px-6 py-3 text-right font-semibold">
                        {log.balance_after.toLocaleString()} pts
                      </td>
                      <td className="px-6 py-3 text-ink-soft">{log.staff_name || "System"}</td>
                      <td className="px-6 py-3 text-ink-soft italic max-w-xs truncate">
                        {log.reason || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AdjustPointsModal
        member={adjustMember}
        isOpen={Boolean(adjustMember)}
        onClose={() => setAdjustMember(null)}
        onSuccess={() => {
          router.refresh();
        }}
      />

      <AssignTierModal
        member={tierMember}
        tiers={tiers}
        isOpen={Boolean(tierMember)}
        onClose={() => setTierMember(null)}
        onSuccess={() => {
          router.refresh();
        }}
      />

      <TierBenefitsDrawer
        isOpen={isBenefitsOpen}
        onClose={() => setIsBenefitsOpen(false)}
        tiers={tiers}
      />
    </div>
  );
}

