"use client";

import { useState } from "react";
import { 
  X, Package, Building2, DollarSign, Calendar, 
  ArrowUpRight, ArrowDownRight, RefreshCw, AlertTriangle, ShieldAlert,
  Edit2, CheckCircle
} from "lucide-react";
import { InventoryItem, BranchInfo } from "./types";
import { quarantineItem } from "./actions";

interface ItemDetailsDrawerProps {
  item: InventoryItem | null;
  onClose: () => void;
  onEdit: (item: InventoryItem) => void;
  onStockIn: (item: InventoryItem) => void;
  onStockOut: (item: InventoryItem) => void;
  onAdjust: (item: InventoryItem) => void;
  onTransfer: (item: InventoryItem) => void;
  onWastage: (item: InventoryItem) => void;
  branches: BranchInfo[];
  canManageFinancials: boolean;
  canAdjustStock: boolean;
}

export function ItemDetailsDrawer({
  item,
  onClose,
  onEdit,
  onStockIn,
  onStockOut,
  onAdjust,
  onTransfer,
  onWastage,
  branches,
  canManageFinancials,
  canAdjustStock,
}: ItemDetailsDrawerProps) {
  const [quarantining, setQuarantining] = useState(false);

  if (!item) return null;

  const isLowStock = item.current_stock <= item.low_stock_threshold;
  const isOutOfStock = item.current_stock === 0;

  // Expiration calculations
  let isExpired = false;
  let isNearExpiry = false;
  let daysUntilExpiry: number | null = null;

  if (item.expiry_date) {
    const exp = new Date(item.expiry_date);
    const now = new Date();
    const diffTime = exp.getTime() - now.getTime();
    daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry < 0) {
      isExpired = true;
    } else if (daysUntilExpiry <= 90) {
      isNearExpiry = true;
    }
  }

  const branchName = branches.find((b) => b.id === item.branch_id)?.name || "All Branches";

  const handleToggleQuarantine = async () => {
    const nextState = !item.is_quarantined;
    const reason = nextState ? "Quarantined for clinical inspection" : "Released from quarantine";
    setQuarantining(true);
    await quarantineItem(item.id, nextState, reason);
    setQuarantining(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 transition-opacity">
      <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-pale/40">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-royal/10 p-2.5 text-royal">
              <Package size={22} />
            </div>
            <div>
              <h2 className="text-lg font-serif font-semibold text-ink leading-tight">
                {item.name}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                {item.sku && (
                  <span className="font-mono text-xs text-ink-soft bg-white px-2 py-0.5 rounded border border-line">
                    {item.sku}
                  </span>
                )}
                <span className="text-xs text-ink-soft">{item.category}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-ink-soft hover:bg-pale hover:text-ink transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            {isOutOfStock ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 border border-red-200">
                <AlertTriangle size={12} /> Out of Stock
              </span>
            ) : isLowStock ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
                <AlertTriangle size={12} /> Low Stock Alert
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 border border-green-200">
                <CheckCircle size={12} /> In Stock
              </span>
            )}

            {isExpired && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800 border border-red-300">
                <ShieldAlert size={12} /> Expired ({Math.abs(daysUntilExpiry || 0)}d ago)
              </span>
            )}

            {!isExpired && isNearExpiry && daysUntilExpiry !== null && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 border border-amber-300">
                <AlertTriangle size={12} /> Expiring in {daysUntilExpiry} days
              </span>
            )}

            {item.is_quarantined && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800 border border-purple-300">
                <ShieldAlert size={12} /> Quarantined / Do Not Dispense
              </span>
            )}
          </div>

          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-line bg-pale/30 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                Current Stock
              </p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold font-mono text-ink">
                  {item.current_stock}
                </span>
                <span className="text-xs text-ink-soft">{item.unit}</span>
              </div>
            </div>

            <div className="rounded-xl border border-line bg-pale/30 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                Min. Threshold
              </p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold font-mono text-ink">
                  {item.low_stock_threshold}
                </span>
                <span className="text-xs text-ink-soft">{item.unit}</span>
              </div>
            </div>

            <div className="rounded-xl border border-line bg-pale/30 p-4 col-span-2 sm:col-span-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                Reorder Qty
              </p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold font-mono text-ink">
                  {item.reorder_quantity || 10}
                </span>
                <span className="text-xs text-ink-soft">{item.unit}</span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          {canAdjustStock && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-royal">
                Quick Inventory Actions
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => onStockIn(item)}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 py-2.5 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  <ArrowUpRight size={14} /> Stock In
                </button>
                <button
                  onClick={() => onStockOut(item)}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-50 border border-blue-200 py-2.5 px-3 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  <ArrowDownRight size={14} /> Stock Out
                </button>
                <button
                  onClick={() => onAdjust(item)}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-purple-50 border border-purple-200 py-2.5 px-3 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition-colors"
                >
                  <RefreshCw size={14} /> Adjust Count
                </button>
                <button
                  onClick={() => onTransfer(item)}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-cyan-50 border border-cyan-200 py-2.5 px-3 text-xs font-semibold text-cyan-700 hover:bg-cyan-100 transition-colors"
                >
                  <Building2 size={14} /> Transfer
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => onWastage(item)}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-50 border border-amber-200 py-2 px-3 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
                >
                  <AlertTriangle size={14} /> Log Wastage/Spill
                </button>
                <button
                  onClick={handleToggleQuarantine}
                  disabled={quarantining}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-medium border transition-colors ${
                    item.is_quarantined
                      ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                      : "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                  }`}
                >
                  <ShieldAlert size={14} />
                  {item.is_quarantined ? "Release Quarantine" : "Quarantine Item"}
                </button>
              </div>
            </div>
          )}

          {/* Pricing & Financials (Protected by RBAC) */}
          <div className="rounded-xl border border-line bg-white p-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-soft flex items-center gap-1.5">
              <DollarSign size={14} /> Financial & Valuation
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-ink-soft block">Purchase Cost:</span>
                {canManageFinancials ? (
                  <span className="font-semibold font-mono text-ink text-base">
                    ₱{(item.cost_price || 0).toLocaleString("en-PH")}
                  </span>
                ) : (
                  <span className="text-xs italic text-ink-soft">Restricted</span>
                )}
              </div>
              <div>
                <span className="text-xs text-ink-soft block">Retail Selling Price:</span>
                <span className="font-semibold font-mono text-royal text-base">
                  {item.retail_price ? `₱${item.retail_price.toLocaleString("en-PH")}` : "Not for retail sale"}
                </span>
              </div>
              {canManageFinancials && (
                <div className="col-span-2 pt-2 border-t border-line">
                  <span className="text-xs text-ink-soft block">Total Inventory Valuation:</span>
                  <span className="font-bold font-mono text-ink text-lg">
                    ₱{((item.cost_price || 0) * item.current_stock).toLocaleString("en-PH")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Clinical Tracking & Storage */}
          <div className="rounded-xl border border-line bg-white p-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-soft flex items-center gap-1.5">
              <Calendar size={14} /> Clinical & Safety Specifications
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-ink-soft block">Batch / Lot #:</span>
                <span className="font-mono text-ink">
                  {item.batch_number || "Not specified"}
                </span>
              </div>
              <div>
                <span className="text-xs text-ink-soft block">Expiration Date:</span>
                <span className={`font-mono ${isExpired ? "text-red-600 font-bold" : "text-ink"}`}>
                  {item.expiry_date || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-xs text-ink-soft block">Storage Location:</span>
                <span className="text-ink">{item.storage_location || "Clinic Storage"}</span>
              </div>
              <div>
                <span className="text-xs text-ink-soft block">Assigned Branch:</span>
                <span className="text-ink font-medium">{branchName}</span>
              </div>
              <div>
                <span className="text-xs text-ink-soft block">Brand:</span>
                <span className="text-ink">{item.brand || "Standard"}</span>
              </div>
              <div>
                <span className="text-xs text-ink-soft block">Barcode:</span>
                <span className="font-mono text-ink">{item.barcode || "None"}</span>
              </div>
            </div>
            {item.description && (
              <div className="pt-2 border-t border-line">
                <span className="text-xs text-ink-soft block mb-1">Description:</span>
                <p className="text-xs text-ink leading-relaxed">{item.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-line p-4 bg-pale/20 flex items-center justify-between">
          <div className="text-[11px] text-ink-soft">
            Updated: {new Date(item.updated_at || item.created_at).toLocaleDateString("en-PH")}
          </div>
          <button
            onClick={() => onEdit(item)}
            className="flex items-center gap-1.5 rounded-xl bg-royal px-4 py-2 text-sm font-semibold text-white hover:bg-royal-deep transition-colors shadow-sm"
          >
            <Edit2 size={14} /> Edit Item
          </button>
        </div>
      </div>
    </div>
  );
}
