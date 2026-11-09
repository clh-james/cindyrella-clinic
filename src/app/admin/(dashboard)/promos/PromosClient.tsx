"use client";

import { useState, useMemo } from "react";
import { Tag, Plus, Search, Pencil, Trash2, AlertTriangle, Loader2, Sparkles, CheckCircle2, Clock } from "lucide-react";
import { PromoCode } from "./types";
import { AddPromoCode } from "./AddPromoCode";
import { EditPromoCodeModal } from "./EditPromoCodeModal";
import { deletePromoCode, togglePromoStatus } from "./actions";
import toast from "react-hot-toast";

export function PromosClient({ initialPromos }: { initialPromos: PromoCode[] }) {
  const [promos, setPromos] = useState<PromoCode[]>(initialPromos);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [editTarget, setEditTarget] = useState<PromoCode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PromoCode | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const filteredPromos = useMemo(() => {
    return promos.filter((p) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = !q || p.code.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && p.is_active) ||
        (statusFilter === "inactive" && !p.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [promos, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = promos.length;
    const active = promos.filter((p) => p.is_active).length;
    const totalUses = promos.reduce((sum, p) => sum + (p.current_uses || 0), 0);
    return { total, active, totalUses };
  }, [promos]);

  const handleToggleStatus = async (promo: PromoCode) => {
    setTogglingId(promo.id);
    const newStatus = !promo.is_active;
    try {
      const res = await togglePromoStatus(promo.id, newStatus);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setPromos((prev) =>
        prev.map((p) => (p.id === promo.id ? { ...p, is_active: newStatus } : p))
      );
      toast.success(`Promo code is now ${newStatus ? "active" : "inactive"}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setTogglingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await deletePromoCode(deleteTarget.id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`Promo code "${deleteTarget.code}" deleted successfully`);
      setPromos((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete promo code");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Add Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-xl sm:text-2xl font-semibold text-ink">Promo Codes</h1>
          <p className="mt-1 text-xs sm:text-sm text-ink-soft">
            Create, manage discounts, and track promotion code usage.
          </p>
        </div>
        <AddPromoCode />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white border border-line rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-ink-soft uppercase tracking-wider">Total Promos</span>
          <div className="text-xl sm:text-2xl font-bold text-ink mt-1">{stats.total}</div>
        </div>
        <div className="bg-white border border-line rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-ink-soft uppercase tracking-wider">Active</span>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1">{stats.active}</div>
        </div>
        <div className="bg-white border border-line rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-ink-soft uppercase tracking-wider">Total Claims</span>
          <div className="text-xl sm:text-2xl font-bold text-royal font-mono mt-1">{stats.totalUses}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3 top-3 text-ink-soft" />
          <input
            type="text"
            placeholder="Search code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-line rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-ink placeholder:text-ink-soft/50 focus:outline-none focus:ring-2 focus:ring-royal/30 focus:border-royal"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-line rounded-xl px-3 py-2 text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-royal/30 w-full sm:w-auto"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {/* MOBILE VIEW (CARDS) */}
      <div className="grid gap-3 sm:gap-4 lg:hidden">
        {filteredPromos.length > 0 ? (
          filteredPromos.map((promo) => {
            const discountText =
              promo.discount_type === "fixed" ? `₱${promo.discount_value}` : `${promo.discount_value}%`;

            return (
              <div
                key={promo.id}
                className="rounded-2xl border border-line bg-white p-4 shadow-xs flex flex-col gap-3"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-pale p-1.5 rounded-xl text-royal">
                      <Tag size={16} />
                    </div>
                    <h3 className="font-mono font-bold text-ink text-base">{promo.code}</h3>
                  </div>

                  <button
                    onClick={() => handleToggleStatus(promo)}
                    disabled={togglingId === promo.id}
                    className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border transition-colors ${
                      promo.is_active
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
                    }`}
                  >
                    {togglingId === promo.id ? "Updating..." : promo.is_active ? "Active" : "Inactive"}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-line/60 pt-2.5">
                  <div>
                    <p className="text-[10px] text-ink-soft uppercase tracking-wider font-semibold">Discount</p>
                    <p className="font-bold text-royal text-base">{discountText}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-ink-soft uppercase tracking-wider font-semibold">Usage</p>
                    <p className="font-mono text-ink text-sm font-semibold">
                      {promo.current_uses} {promo.max_uses ? `/ ${promo.max_uses}` : "claimed"}
                    </p>
                  </div>
                </div>

                <div className="bg-pale/40 p-2.5 rounded-xl border border-line/50 flex justify-between items-center text-xs">
                  <span className="text-[11px] text-ink-soft">
                    {promo.valid_until ? `Valid until: ${new Date(promo.valid_until).toLocaleDateString()}` : "Never expires"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setEditTarget(promo)}
                      title="Edit Promo"
                      className="p-1.5 rounded-lg border border-line bg-white text-ink-soft hover:text-royal hover:bg-royal/5 transition-all"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(promo)}
                      title="Delete Promo"
                      className="p-1.5 rounded-lg border border-line bg-white text-ink-soft hover:text-rose-600 hover:bg-rose-50 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-12 text-center text-sm text-ink-soft border border-line rounded-2xl bg-white">
            <Tag size={28} className="mx-auto mb-2 text-ink-soft/40" />
            No promo codes match your filter.
          </div>
        )}
      </div>

      {/* DESKTOP VIEW (TABLE) */}
      <div className="hidden lg:block overflow-x-auto rounded-2xl border border-line bg-white shadow-xs">
        <table className="w-full min-w-[800px] border-collapse text-left text-xs sm:text-sm">
          <thead>
            <tr className="bg-pale/60 border-b border-line text-[11px] font-bold text-ink-soft uppercase tracking-wider">
              <th className="px-5 py-3.5">Code</th>
              <th className="px-5 py-3.5">Discount</th>
              <th className="px-5 py-3.5">Usage</th>
              <th className="px-5 py-3.5">Expires</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filteredPromos.length > 0 ? (
              filteredPromos.map((promo) => {
                const discountText =
                  promo.discount_type === "fixed" ? `₱${promo.discount_value}` : `${promo.discount_value}%`;

                return (
                  <tr key={promo.id} className="hover:bg-pale/30 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-ink">
                      <div className="flex items-center gap-2">
                        <Tag size={14} className="text-royal" />
                        {promo.code}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-royal">{discountText}</td>
                    <td className="px-5 py-3.5 font-mono text-ink-soft font-semibold">
                      {promo.current_uses} {promo.max_uses ? `/ ${promo.max_uses}` : "times"}
                    </td>
                    <td className="px-5 py-3.5 text-ink-soft">
                      {promo.valid_until ? new Date(promo.valid_until).toLocaleDateString() : "Never expires"}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => handleToggleStatus(promo)}
                        disabled={togglingId === promo.id}
                        title="Click to toggle status"
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border transition-colors ${
                          promo.is_active
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
                        }`}
                      >
                        {togglingId === promo.id ? "Updating..." : promo.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditTarget(promo)}
                          title="Edit Promo Code"
                          className="p-1.5 rounded-lg border border-line bg-white text-ink-soft hover:text-royal hover:border-royal/40 hover:bg-royal/5 transition-all"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(promo)}
                          title="Delete Promo Code"
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
                <td colSpan={6} className="px-5 py-12 text-center text-ink-soft">
                  <Tag size={28} className="mx-auto mb-2 text-ink-soft/40" />
                  No promo codes match your filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Promo Modal */}
      {editTarget && (
        <EditPromoCodeModal
          promo={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={(updated) => {
            setPromos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
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
                <h3 className="font-bold text-ink text-base">Delete Promo Code?</h3>
                <p className="text-xs text-ink-soft">This action cannot be undone.</p>
              </div>
            </div>

            <div className="bg-pale/40 rounded-xl p-3 border border-line my-4 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-ink-soft">Code:</span>
                <span className="font-mono font-bold text-ink">{deleteTarget.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Discount:</span>
                <span className="font-bold text-royal">
                  {deleteTarget.discount_type === "fixed"
                    ? `₱${deleteTarget.discount_value}`
                    : `${deleteTarget.discount_value}%`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Usage Count:</span>
                <span className="font-mono text-ink">{deleteTarget.current_uses} claimed</span>
              </div>
            </div>

            <p className="text-xs text-rose-600 font-medium mb-5">
              Deleting this promo code will permanently remove it from the system. Future checkouts will not be able to use it.
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
                    Yes, Delete Promo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

