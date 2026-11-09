"use client";

import { useState, useMemo } from "react";
import { 
  PackageOpen, Sparkles, Plus, Search, Filter, Calendar, User, 
  CheckCircle2, Clock, AlertCircle, ArrowUpRight, Check,
  Pencil, Trash2, AlertTriangle, Loader2 
} from "lucide-react";
import { CustomerPackage, PackageTemplateItem } from "./types";
import { RedeemSessionModal } from "./RedeemSessionModal";
import { SellPackageModal } from "./SellPackageModal";
import { EditPackageModal } from "./EditPackageModal";
import { deleteCustomerPackage } from "./actions";
import toast from "react-hot-toast";

export function PackagesClient({
  initialPackages,
  templates,
  allTreatments = [],
  customers,
  branches,
  staffList,
  currentBranchId,
}: {
  initialPackages: CustomerPackage[];
  templates: PackageTemplateItem[];
  allTreatments?: { id: string; name: string; session_price: number; category?: string }[];
  customers: { id: string; first_name: string; last_name: string; phone: string }[];
  branches: { id: string; name: string }[];
  staffList: { id: string; full_name: string; role?: string }[];
  currentBranchId?: string | null;
}) {
  const [packages, setPackages] = useState<CustomerPackage[]>(initialPackages);
  const [activeTab, setActiveTab] = useState<"client_packages" | "redemptions" | "catalog">("client_packages");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");

  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [redeemTarget, setRedeemTarget] = useState<CustomerPackage | null>(null);
  const [editTarget, setEditTarget] = useState<CustomerPackage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerPackage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await deleteCustomerPackage(deleteTarget.id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Package deleted successfully");
      setPackages((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete package");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered packages
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      const q = searchTerm.toLowerCase();
      const custName = `${pkg.customer?.first_name || ""} ${pkg.customer?.last_name || ""}`.toLowerCase();
      const phone = (pkg.customer?.phone || "").toLowerCase();
      const pkgName = pkg.package_name.toLowerCase();

      const matchesSearch = !q || custName.includes(q) || phone.includes(q) || pkgName.includes(q);
      const matchesStatus = statusFilter === "all" || pkg.status === statusFilter;
      const matchesBranch = branchFilter === "all" || pkg.branch_id === branchFilter;

      return matchesSearch && matchesStatus && matchesBranch;
    });
  }, [packages, searchTerm, statusFilter, branchFilter]);

  // Statistics
  const stats = useMemo(() => {
    const active = packages.filter((p) => p.status === "active");
    const totalRemaining = active.reduce((acc, p) => acc + (p.sessions_remaining || 0), 0);
    const totalRevenue = packages.reduce((acc, p) => acc + Number(p.price_paid || 0), 0);
    const fullyRedeemed = packages.filter((p) => p.status === "fully_redeemed").length;

    return {
      activeCount: active.length,
      totalRemaining,
      totalRevenue,
      fullyRedeemed,
    };
  }, [packages]);

  // Extract redemption logs from notes for the history tab
  const redemptionLogs = useMemo(() => {
    const logs: Array<{
      packageId: string;
      packageName: string;
      customerName: string;
      rawLog: string;
      dateStr: string;
    }> = [];

    packages.forEach((pkg) => {
      if (pkg.notes) {
        const matches = pkg.notes.match(/\[Session [^\]]+\]/g);
        if (matches) {
          matches.forEach((m) => {
            logs.push({
              packageId: pkg.id,
              packageName: pkg.package_name,
              customerName: `${pkg.customer?.first_name || "Patient"} ${pkg.customer?.last_name || ""}`,
              rawLog: m.replace(/^\[|\]$/g, ""),
              dateStr: pkg.updated_at,
            });
          });
        }
      }
    });

    return logs.reverse();
  }, [packages]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Active
          </span>
        );
      case "fully_redeemed":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            Fully Availed
          </span>
        );
      case "expired":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Expired
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            Cancelled
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-royal text-white flex items-center justify-center shadow-md">
              <PackageOpen size={22} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink font-serif">
                Packages & Session Credits
              </h1>
              <p className="text-xs sm:text-sm text-ink-soft">
                Manage 5+1 and 10+2 prepaid treatment packages, customer session balances, and redemptions.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setSelectedTemplateId(null);
            setSellModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 bg-royal hover:bg-royal/90 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95"
        >
          <Plus size={16} />
          Add / Assign Package
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-line rounded-2xl p-4 sm:p-5 shadow-xs">
          <span className="text-xs font-semibold text-ink-soft uppercase tracking-wider">Active Packages</span>
          <div className="text-xl sm:text-2xl font-bold text-ink mt-1">{stats.activeCount}</div>
          <span className="text-[11px] text-emerald-600 font-medium">Currently in-progress</span>
        </div>

        <div className="bg-white border border-line rounded-2xl p-4 sm:p-5 shadow-xs">
          <span className="text-xs font-semibold text-ink-soft uppercase tracking-wider">Remaining Sessions</span>
          <div className="text-xl sm:text-2xl font-bold text-royal mt-1 font-mono">{stats.totalRemaining}</div>
          <span className="text-[11px] text-ink-soft">Available to be redeemed</span>
        </div>

        <div className="bg-white border border-line rounded-2xl p-4 sm:p-5 shadow-xs">
          <span className="text-xs font-semibold text-ink-soft uppercase tracking-wider">Fully Availed</span>
          <div className="text-xl sm:text-2xl font-bold text-ink mt-1 font-mono">{stats.fullyRedeemed}</div>
          <span className="text-[11px] text-blue-600 font-medium">Completed packages</span>
        </div>

        <div className="bg-white border border-line rounded-2xl p-4 sm:p-5 shadow-xs">
          <span className="text-xs font-semibold text-ink-soft uppercase tracking-wider">Package Revenue</span>
          <div className="text-xl sm:text-2xl font-bold text-ink mt-1 font-mono">
            ₱{stats.totalRevenue.toLocaleString()}
          </div>
          <span className="text-[11px] text-ink-soft">Cumulative prepaid sales</span>
        </div>
      </div>

      {/* Navigation Tabs (Smooth horizontal touch scrolling on mobile) */}
      <div className="flex border-b border-line gap-1 sm:gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 touch-scroll">
        <button
          onClick={() => setActiveTab("client_packages")}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
            activeTab === "client_packages"
              ? "border-royal text-royal"
              : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          <Sparkles size={15} />
          Patient Balances ({packages.length})
        </button>
        <button
          onClick={() => setActiveTab("redemptions")}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
            activeTab === "redemptions"
              ? "border-royal text-royal"
              : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          <Clock size={15} />
          Redemption History ({redemptionLogs.length})
        </button>
        <button
          onClick={() => setActiveTab("catalog")}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
            activeTab === "catalog"
              ? "border-royal text-royal"
              : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          <PackageOpen size={15} />
          Available Offers ({templates.length})
        </button>
      </div>

      {/* TAB 1: CLIENT PACKAGES TABLE */}
      {activeTab === "client_packages" && (
        <div className="bg-white border border-line rounded-2xl shadow-xs overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 border-b border-line/80 flex flex-col md:flex-row gap-3 justify-between items-center bg-pale/20">
            <div className="relative w-full md:w-80">
              <Search size={15} className="absolute left-3 top-3 text-ink-soft" />
              <input
                type="text"
                placeholder="Search patient, phone, or package..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-line rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-ink placeholder:text-ink-soft/50 focus:outline-none focus:ring-2 focus:ring-royal/30 focus:border-royal"
              />
            </div>

            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-line rounded-xl px-3 py-2 text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-royal/30"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="fully_redeemed">Fully Availed</option>
                <option value="expired">Expired</option>
              </select>

              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="bg-white border border-line rounded-xl px-3 py-2 text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-royal/30"
              >
                <option value="all">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* MOBILE CARDS VIEW (< lg) */}
          <div className="p-3 space-y-3 lg:hidden">
            {filteredPackages.length > 0 ? (
              filteredPackages.map((pkg) => {
                const used = pkg.total_sessions - pkg.sessions_remaining;
                const percentUsed = Math.min(100, Math.round((used / pkg.total_sessions) * 100));

                return (
                  <div key={pkg.id} className="bg-white border border-line rounded-xl p-4 shadow-2xs space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-ink text-sm">
                          {pkg.customer?.first_name} {pkg.customer?.last_name}
                        </div>
                        <div className="text-[11px] text-ink-soft">{pkg.customer?.phone || "No phone"}</div>
                      </div>
                      <div>{getStatusBadge(pkg.status)}</div>
                    </div>

                    <div className="border-t border-b border-line/60 py-2.5 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-ink">{pkg.package_name}</span>
                        <span className="font-mono font-bold text-royal">
                          ₱{Number(pkg.price_paid || 0).toLocaleString()}
                        </span>
                      </div>
                      {pkg.branch?.name && (
                        <div className="text-[11px] text-ink-soft">Branch: {pkg.branch.name}</div>
                      )}

                      {/* Progress bar */}
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono font-bold text-royal">
                            {pkg.sessions_remaining} of {pkg.total_sessions} Remaining
                          </span>
                          <span className="text-ink-soft">{used} used</span>
                        </div>
                        <div className="w-full bg-line rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-royal h-full rounded-full transition-all duration-300"
                            style={{ width: `${percentUsed}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-line/60">
                      <span className="text-[10px] text-ink-soft">
                        {pkg.expiry_date ? `Exp: ${pkg.expiry_date}` : `Added: ${pkg.start_date}`}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {pkg.status === "active" && pkg.sessions_remaining > 0 ? (
                          <button
                            onClick={() => setRedeemTarget(pkg)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-royal text-white font-bold text-xs shadow-xs hover:bg-royal/90 transition-all touch-manipulation min-h-[34px]"
                          >
                            <Sparkles size={13} />
                            Redeem
                          </button>
                        ) : null}

                        <button
                          onClick={() => setEditTarget(pkg)}
                          title="Edit Package"
                          className="p-1.5 rounded-lg border border-line bg-white text-ink-soft hover:text-royal hover:border-royal/40 hover:bg-royal/5 transition-all min-h-[34px] min-w-[34px] flex items-center justify-center"
                        >
                          <Pencil size={14} />
                        </button>

                        <button
                          onClick={() => setDeleteTarget(pkg)}
                          title="Delete Package"
                          className="p-1.5 rounded-lg border border-line bg-white text-ink-soft hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all min-h-[34px] min-w-[34px] flex items-center justify-center"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 text-ink-soft">
                <PackageOpen size={32} className="mx-auto mb-2 text-ink-soft/40" />
                <p className="font-semibold text-ink text-sm">No packages found</p>
                <p className="text-xs text-ink-soft mt-0.5">
                  Click &quot;Sell / Assign Package&quot; to issue a package to a patient.
                </p>
              </div>
            )}
          </div>

          {/* DESKTOP TABLE VIEW (>= lg) */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-pale/60 border-b border-line text-[11px] font-bold text-ink-soft uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Package Service</th>
                  <th className="py-3 px-4">Session Balance</th>
                  <th className="py-3 px-4">Price Paid</th>
                  <th className="py-3 px-4">Validity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredPackages.length > 0 ? (
                  filteredPackages.map((pkg) => {
                    const used = pkg.total_sessions - pkg.sessions_remaining;
                    const percentUsed = Math.min(100, Math.round((used / pkg.total_sessions) * 100));

                    return (
                      <tr key={pkg.id} className="hover:bg-pale/30 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-ink">
                          <div>
                            {pkg.customer?.first_name} {pkg.customer?.last_name}
                          </div>
                          <div className="text-[11px] text-ink-soft font-normal">{pkg.customer?.phone || "No phone"}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-ink">{pkg.package_name}</div>
                          {pkg.branch?.name && (
                            <div className="text-[11px] text-ink-soft">{pkg.branch.name}</div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 min-w-[160px]">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-mono font-bold text-royal">
                              {pkg.sessions_remaining} left
                            </span>
                            <span className="text-[11px] text-ink-soft">
                              {used} / {pkg.total_sessions} used
                            </span>
                          </div>
                          <div className="w-full bg-line rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-royal h-full rounded-full transition-all duration-300"
                              style={{ width: `${percentUsed}%` }}
                            />
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-semibold text-ink">
                          ₱{Number(pkg.price_paid || 0).toLocaleString()}
                        </td>

                        <td className="py-3.5 px-4 text-xs text-ink-soft">
                          <div>Purchased: {pkg.start_date}</div>
                          {pkg.expiry_date && <div>Expires: {pkg.expiry_date}</div>}
                        </td>

                        <td className="py-3.5 px-4">{getStatusBadge(pkg.status)}</td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {pkg.status === "active" && pkg.sessions_remaining > 0 ? (
                              <button
                                onClick={() => setRedeemTarget(pkg)}
                                title="Redeem Session"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-royal text-white font-bold text-xs shadow-xs hover:bg-royal/90 transition-all"
                              >
                                <Sparkles size={13} />
                                Redeem
                              </button>
                            ) : null}

                            <button
                              onClick={() => setEditTarget(pkg)}
                              title="Edit Package"
                              className="p-1.5 rounded-lg border border-line bg-white text-ink-soft hover:text-royal hover:border-royal/40 hover:bg-royal/5 transition-all"
                            >
                              <Pencil size={14} />
                            </button>

                            <button
                              onClick={() => setDeleteTarget(pkg)}
                              title="Delete Package"
                              className="p-1.5 rounded-lg border border-line bg-white text-ink-soft hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-ink-soft">
                      <PackageOpen size={32} className="mx-auto mb-2 text-ink-soft/40" />
                      <p className="font-semibold text-ink">No packages found</p>
                      <p className="text-xs text-ink-soft mt-0.5">
                        Click &quot;Sell / Assign Package&quot; to issue a 5+1 or 10+2 package to a patient.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: REDEMPTION AUDIT LOGS */}
      {activeTab === "redemptions" && (
        <div className="bg-white border border-line rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-line bg-pale/30">
            <h3 className="font-bold text-ink text-sm">Session Redemption Audit Trail</h3>
            <p className="text-xs text-ink-soft">Chronological log of clinical treatment sessions claimed by patients.</p>
          </div>

          <div className="divide-y divide-line">
            {redemptionLogs.length > 0 ? (
              redemptionLogs.map((log, idx) => (
                <div key={idx} className="p-4 hover:bg-pale/20 transition-colors flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="flex-1 text-xs sm:text-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="font-bold text-ink">{log.customerName}</span>
                      <span className="text-[11px] text-ink-soft font-mono">
                        {new Date(log.dateStr).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-royal font-semibold text-xs mt-0.5">{log.packageName}</div>
                    <div className="text-ink-soft mt-1 bg-pale/50 px-2.5 py-1 rounded-md border border-line/60">
                      {log.rawLog}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-ink-soft">
                <Clock size={32} className="mx-auto mb-2 text-ink-soft/40" />
                <p className="font-semibold text-ink">No session redemptions recorded yet</p>
                <p className="text-xs text-ink-soft mt-0.5">
                  Whenever a staff member redeems a session for a patient, it will be logged here.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CLINIC PRESET 5+1 & 10+2 OFFERS */}
      {activeTab === "catalog" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => {
            const savings5Plus1 = (t.session_price * 6) - (t.five_plus_one_price || 0);

            return (
              <div key={t.treatment_id} className="bg-white border border-line rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-ink text-base font-serif">{t.treatment_name}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-royal/10 text-royal">
                      Single: ₱{t.session_price.toLocaleString()}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2.5">
                    {t.five_plus_one_price && (
                      <div className="p-3 bg-pale/50 rounded-xl border border-line/80">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-ink">5 + 1 Package (6 Sessions)</span>
                          <span className="font-mono font-bold text-royal text-sm">
                            ₱{t.five_plus_one_price.toLocaleString()}
                          </span>
                        </div>
                        {savings5Plus1 > 0 && (
                          <div className="text-[10px] text-emerald-600 font-semibold mt-1">
                            Patient saves ₱{savings5Plus1.toLocaleString()} vs single sessions
                          </div>
                        )}
                      </div>
                    )}

                    {t.ten_plus_two_price && (
                      <div className="p-3 bg-pale/50 rounded-xl border border-line/80">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-ink">10 + 2 Package (12 Sessions)</span>
                          <span className="font-mono font-bold text-royal text-sm">
                            ₱{t.ten_plus_two_price.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}

                    {t.preset_options && t.preset_options.map((opt, i) => (
                      <div key={i} className="p-3 bg-pale/50 rounded-xl border border-royal/30 bg-royal/5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-ink">{opt.label} ({opt.sessions} Sessions)</span>
                          <span className="font-mono font-bold text-royal text-sm">
                            ₱{opt.price.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedTemplateId(t.treatment_id);
                    setSellModalOpen(true);
                  }}
                  className="w-full mt-4 py-2 rounded-xl border border-royal text-royal hover:bg-royal hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} />
                  Sell This Package
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {redeemTarget && (
        <RedeemSessionModal
          pkg={redeemTarget}
          staffList={staffList}
          onClose={() => setRedeemTarget(null)}
          onSuccess={() => {
            // Optimistic update
            setPackages((prev) =>
              prev.map((p) => {
                if (p.id === redeemTarget.id) {
                  const newRemaining = p.sessions_remaining - 1;
                  return {
                    ...p,
                    sessions_remaining: newRemaining,
                    status: newRemaining === 0 ? "fully_redeemed" : "active",
                  };
                }
                return p;
              })
            );
          }}
        />
      )}

      {/* Edit Package Modal */}
      {editTarget && (
        <EditPackageModal
          pkg={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={(updatedPkg) => {
            setPackages((prev) =>
              prev.map((p) => (p.id === updatedPkg.id ? updatedPkg : p))
            );
            setEditTarget(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-line overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="font-bold text-ink text-base">Delete Patient Package?</h3>
                <p className="text-xs text-ink-soft">This action cannot be undone.</p>
              </div>
            </div>

            <div className="bg-pale/40 rounded-xl p-3 border border-line my-4 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-ink-soft">Patient:</span>
                <span className="font-bold text-ink">
                  {deleteTarget.customer?.first_name} {deleteTarget.customer?.last_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Package:</span>
                <span className="font-semibold text-ink">{deleteTarget.package_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Sessions Remaining:</span>
                <span className="font-mono font-bold text-royal">
                  {deleteTarget.sessions_remaining} of {deleteTarget.total_sessions}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Price Paid:</span>
                <span className="font-mono font-semibold text-ink">
                  ₱{Number(deleteTarget.price_paid || 0).toLocaleString()}
                </span>
              </div>
            </div>

            <p className="text-xs text-rose-600 font-medium mb-5">
              Deleting this package will permanently remove the record and any remaining session credits for this patient.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="rounded-xl border border-line px-4 py-2 text-xs font-bold text-ink-soft hover:bg-line/40 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition-all disabled:opacity-50 active:scale-95"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    Yes, Delete Package
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {sellModalOpen && (
        <SellPackageModal
          customers={customers}
          branches={branches}
          templates={templates}
          allTreatments={allTreatments}
          initialTreatmentId={selectedTemplateId}
          currentBranchId={currentBranchId}
          onClose={() => {
            setSellModalOpen(false);
            setSelectedTemplateId(null);
          }}
          onSuccess={() => {
            // Reload page on assign
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
