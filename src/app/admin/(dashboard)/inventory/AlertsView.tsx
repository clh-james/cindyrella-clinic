"use client";

import { useState, useMemo } from "react";
import { 
  AlertTriangle, ShieldAlert, Clock, CheckCircle, 
  ArrowUpRight, ShoppingCart
} from "lucide-react";
import { InventoryItem, BranchInfo } from "./types";
import { quarantineItem } from "./actions";

interface AlertsViewProps {
  items: InventoryItem[];
  branches: BranchInfo[];
  canAdjustStock: boolean;
  onStockIn: (item: InventoryItem) => void;
  onSelectItem: (item: InventoryItem) => void;
  onNavigateToTab: (tab: string) => void;
}

export function AlertsView({
  items,
  branches,
  canAdjustStock,
  onStockIn,
  onSelectItem,
  onNavigateToTab,
}: AlertsViewProps) {
  const [activeTab, setActiveTab] = useState<"low_stock" | "expiration" | "quarantined">("low_stock");
  const [expirationWindow, setExpirationWindow] = useState<30 | 60 | 90>(90);
  const [quarantiningId, setQuarantiningId] = useState<string | null>(null);

  // 1. Low stock items
  const lowStockItems = useMemo(() => {
    return items
      .filter((i) => i.current_stock <= i.low_stock_threshold)
      .sort((a, b) => a.current_stock - b.current_stock);
  }, [items]);

  // 2. Expiration items
  const { expiredItems, nearExpiryItems } = useMemo(() => {
    const expired: { item: InventoryItem; daysOverdue: number }[] = [];
    const near: { item: InventoryItem; daysLeft: number }[] = [];
    const currentTime = new Date().getTime();

    items.forEach((item) => {
      if (item.expiry_date) {
        const exp = new Date(item.expiry_date);
        const diffDays = Math.ceil((exp.getTime() - currentTime) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
          expired.push({ item, daysOverdue: Math.abs(diffDays) });
        } else if (diffDays <= expirationWindow) {
          near.push({ item, daysLeft: diffDays });
        }
      }
    });

    return {
      expiredItems: expired.sort((a, b) => b.daysOverdue - a.daysOverdue),
      nearExpiryItems: near.sort((a, b) => a.daysLeft - b.daysLeft),
    };
  }, [items, expirationWindow]);

  // 3. Quarantined items
  const quarantinedItems = useMemo(() => {
    return items.filter((i) => i.is_quarantined);
  }, [items]);

  const handleToggleQuarantine = async (item: InventoryItem) => {
    setQuarantiningId(item.id);
    const nextState = !item.is_quarantined;
    await quarantineItem(
      item.id,
      nextState,
      nextState ? "Manually quarantined from Alerts module" : "Released from quarantine"
    );
    setQuarantiningId(null);
  };

  return (
    <div className="space-y-4">
      {/* Sub-tabs header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-line bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("low_stock")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
              activeTab === "low_stock"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-ink-soft hover:bg-pale hover:text-ink"
            }`}
          >
            <AlertTriangle size={15} />
            <span>Low-Stock Alerts ({lowStockItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("expiration")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
              activeTab === "expiration"
                ? "bg-red-600 text-white shadow-sm"
                : "text-ink-soft hover:bg-pale hover:text-ink"
            }`}
          >
            <Clock size={15} />
            <span>Expiration Safety ({expiredItems.length + nearExpiryItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("quarantined")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
              activeTab === "quarantined"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-ink-soft hover:bg-pale hover:text-ink"
            }`}
          >
            <ShieldAlert size={15} />
            <span>Quarantined Batches ({quarantinedItems.length})</span>
          </button>
        </div>

        {activeTab === "expiration" && (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-ink-soft mr-1">Alert Horizon:</span>
            {[30, 60, 90].map((days) => (
              <button
                key={days}
                onClick={() => setExpirationWindow(days as 30 | 60 | 90)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                  expirationWindow === days
                    ? "bg-royal text-white"
                    : "border border-line bg-white text-ink hover:bg-pale"
                }`}
              >
                {days}d
              </button>
            ))}
          </div>
        )}
      </div>

      {/* VIEW 1: LOW STOCK ALERTS */}
      {activeTab === "low_stock" && (
        <div className="space-y-3">
          {lowStockItems.map((item) => {
            const isOut = item.current_stock === 0;
            const branchName = branches.find((b) => b.id === item.branch_id)?.name || "All Branches";
            const suggestedReorder = item.reorder_quantity || Math.max(10, item.low_stock_threshold * 2);

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-line bg-white p-5 shadow-sm space-y-3 hover:border-amber-300 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`rounded-xl p-2.5 ${
                        isOut ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                      }`}
                    >
                      {isOut ? <ShieldAlert size={20} /> : <AlertTriangle size={20} />}
                    </div>
                    <div>
                      <h3
                        onClick={() => onSelectItem(item)}
                        className="font-semibold text-sm text-ink cursor-pointer hover:text-royal transition-colors"
                      >
                        {item.name}
                      </h3>
                      <div className="flex items-center gap-2 text-[11px] text-ink-soft mt-0.5">
                        {item.sku && <span className="font-mono">{item.sku}</span>}
                        <span>• {item.category}</span>
                        <span>• Branch: {branchName}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold border ${
                      isOut
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {isOut ? "Out of Stock (Zero Units)" : "Critically Low Stock"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] text-ink-soft uppercase block font-semibold">Available Stock</span>
                    <span className={`text-base font-bold font-mono ${isOut ? "text-red-600" : "text-amber-600"}`}>
                      {item.current_stock} {item.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-soft uppercase block font-semibold">Minimum Threshold</span>
                    <span className="text-sm font-semibold font-mono text-ink">
                      {item.low_stock_threshold} {item.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-soft uppercase block font-semibold">Suggested Reorder</span>
                    <span className="text-sm font-bold font-mono text-royal">
                      +{suggestedReorder} {item.unit}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    {canAdjustStock && (
                      <button
                        onClick={() => onStockIn(item)}
                        className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <ArrowUpRight size={14} /> Quick Restock
                      </button>
                    )}
                    <button
                      onClick={() => onNavigateToTab("purchasing")}
                      className="rounded-xl border border-line bg-white px-3 py-2 text-xs font-medium text-ink hover:bg-pale transition-colors flex items-center gap-1"
                    >
                      <ShoppingCart size={13} className="text-ink-soft" /> PO
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {lowStockItems.length === 0 && (
            <div className="py-16 text-center text-sm text-ink-soft bg-white rounded-2xl border border-line flex flex-col items-center gap-2">
              <CheckCircle size={36} className="text-emerald-500" />
              <span>Great news! All clinic supplies are currently above minimum threshold levels.</span>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: EXPIRATION SAFETY */}
      {activeTab === "expiration" && (
        <div className="space-y-6">
          {/* Expired Items (Critical) */}
          {expiredItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
                <ShieldAlert size={18} />
                <span>Expired Stock ({expiredItems.length}) — Do Not Issue to Clients</span>
              </div>
              {expiredItems.map(({ item, daysOverdue }) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-red-200 bg-red-50/40 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <h4
                      onClick={() => onSelectItem(item)}
                      className="font-bold text-sm text-ink cursor-pointer hover:text-royal"
                    >
                      {item.name}
                    </h4>
                    <p className="text-xs text-red-700 font-medium mt-0.5">
                      Expired on {item.expiry_date} ({daysOverdue} days past expiry) • Batch: {item.batch_number || "N/A"}
                    </p>
                    <p className="text-[11px] text-ink-soft mt-0.5">
                      Remaining stock: {item.current_stock} {item.unit}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleQuarantine(item)}
                      disabled={quarantiningId === item.id}
                      className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
                        item.is_quarantined
                          ? "bg-purple-100 text-purple-800 border border-purple-300"
                          : "bg-red-600 text-white hover:bg-red-700"
                      }`}
                    >
                      {item.is_quarantined ? "Quarantined" : "Quarantine & Lock"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Near Expiration Items */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
              <Clock size={18} />
              <span>Nearing Expiration (&le; {expirationWindow} Days)</span>
            </div>

            {nearExpiryItems.map(({ item, daysLeft }) => (
              <div
                key={item.id}
                className="rounded-2xl border border-line bg-white p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-amber-300 transition-colors"
              >
                <div>
                  <h4
                    onClick={() => onSelectItem(item)}
                    className="font-semibold text-sm text-ink cursor-pointer hover:text-royal"
                  >
                    {item.name}
                  </h4>
                  <p className="text-xs text-amber-800 font-medium mt-0.5">
                    Expires on {item.expiry_date} ({daysLeft} days remaining) • Batch: {item.batch_number || "N/A"}
                  </p>
                  <p className="text-[11px] text-ink-soft mt-0.5">
                    Current stock: {item.current_stock} {item.unit} • Storage: {item.storage_location || "Clinic Room"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                    FEFO Priority: Consume First
                  </span>
                </div>
              </div>
            ))}

            {expiredItems.length === 0 && nearExpiryItems.length === 0 && (
              <div className="py-16 text-center text-sm text-ink-soft bg-white rounded-2xl border border-line flex flex-col items-center gap-2">
                <CheckCircle size={36} className="text-emerald-500" />
                <span>No items are expired or nearing expiration within the {expirationWindow}-day window.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: QUARANTINED BATCHES */}
      {activeTab === "quarantined" && (
        <div className="space-y-3">
          {quarantinedItems.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-purple-200 bg-purple-50/30 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <span className="font-semibold text-purple-900 text-sm block">{item.name}</span>
                <p className="text-xs text-purple-800 mt-0.5">
                  Locked from treatment dispensation and POS sales.
                </p>
                <div className="flex items-center gap-3 text-[11px] text-ink-soft mt-1">
                  <span>Stock: {item.current_stock} {item.unit}</span>
                  {item.batch_number && <span>Batch: {item.batch_number}</span>}
                  {item.expiry_date && <span>Expiry: {item.expiry_date}</span>}
                </div>
              </div>

              <div>
                <button
                  onClick={() => handleToggleQuarantine(item)}
                  disabled={quarantiningId === item.id}
                  className="rounded-xl bg-white border border-line px-4 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition-colors"
                >
                  Release from Quarantine
                </button>
              </div>
            </div>
          ))}

          {quarantinedItems.length === 0 && (
            <div className="py-16 text-center text-sm text-ink-soft bg-white rounded-2xl border border-line flex flex-col items-center gap-2">
              <CheckCircle size={36} className="text-emerald-500" />
              <span>No items or batches are currently under clinical quarantine.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
