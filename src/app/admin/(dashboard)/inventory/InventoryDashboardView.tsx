"use client";

import { useMemo } from "react";
import { 
  Boxes, Package, DollarSign, AlertTriangle, ShieldAlert, 
  ArrowRightLeft, TrendingUp, BarChart3, Clock, Building2, CheckCircle2
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, Cell 
} from "recharts";
import { InventoryItem, InventoryCategory, InventoryMovement, InventoryTransfer, BranchInfo } from "./types";

interface InventoryDashboardViewProps {
  items: InventoryItem[];
  categories: InventoryCategory[];
  movements: InventoryMovement[];
  transfers: InventoryTransfer[];
  branches: BranchInfo[];
  canManageFinancials: boolean;
  canViewAllBranches: boolean;
  onNavigateToTab: (tab: string) => void;
  onSelectItem: (item: InventoryItem) => void;
}

export function InventoryDashboardView({
  items,
  categories,
  movements,
  transfers,
  branches,
  canManageFinancials,
  canViewAllBranches,
  onNavigateToTab,
  onSelectItem,
}: InventoryDashboardViewProps) {
  // 1. Calculate KPI Metrics
  const metrics = useMemo(() => {
    const totalActiveItems = items.filter((i) => i.is_active !== false).length;
    const totalStockQuantity = items.reduce((sum, i) => sum + (i.current_stock || 0), 0);
    const totalValuation = items.reduce(
      (sum, i) => sum + (i.cost_price || 0) * (i.current_stock || 0),
      0
    );

    const lowStockItems = items.filter(
      (i) => i.current_stock > 0 && i.current_stock <= i.low_stock_threshold
    );
    const outOfStockItems = items.filter((i) => i.current_stock === 0);

    const now = new Date();
    let nearExpiryCount = 0;
    let expiredCount = 0;
    const nearExpiryItemsList: { item: InventoryItem; daysUntil: number }[] = [];
    const expiredItemsList: InventoryItem[] = [];

    items.forEach((item) => {
      if (item.expiry_date) {
        const exp = new Date(item.expiry_date);
        const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
          expiredCount++;
          expiredItemsList.push(item);
        } else if (diffDays <= 90) {
          nearExpiryCount++;
          nearExpiryItemsList.push({ item, daysUntil: diffDays });
        }
      }
    });

    const pendingTransfersCount = transfers.filter(
      (t) => t.status === "requested" || t.status === "pending_approval" || t.status === "dispatched"
    ).length;

    return {
      totalActiveItems,
      totalStockQuantity,
      totalValuation,
      lowStockCount: lowStockItems.length,
      lowStockItems,
      outOfStockCount: outOfStockItems.length,
      outOfStockItems,
      nearExpiryCount,
      nearExpiryItemsList: nearExpiryItemsList.sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 5),
      expiredCount,
      expiredItemsList: expiredItemsList.slice(0, 5),
      pendingTransfersCount,
    };
  }, [items, transfers]);

  // 2. Stock by Category Chart Data
  const categoryChartData = useMemo(() => {
    const map: Record<string, { name: string; count: number; stock: number; value: number }> = {};
    categories.forEach((c) => {
      map[c.name] = { name: c.name, count: 0, stock: 0, value: 0 };
    });

    items.forEach((item) => {
      const catName = item.category || "General";
      if (!map[catName]) {
        map[catName] = { name: catName, count: 0, stock: 0, value: 0 };
      }
      map[catName].count++;
      map[catName].stock += item.current_stock || 0;
      map[catName].value += (item.cost_price || 0) * (item.current_stock || 0);
    });

    return Object.values(map)
      .filter((d) => d.stock > 0 || d.count > 0)
      .sort((a, b) => b.stock - a.stock);
  }, [items, categories]);

  // 3. Movement Activity Breakdown
  const movementBreakdown = useMemo(() => {
    const counts: Record<string, number> = {
      stock_in: 0,
      stock_out: 0,
      adjustment: 0,
      transfer: 0,
      wastage: 0,
    };

    movements.forEach((m) => {
      if (counts[m.movement_type] !== undefined) {
        counts[m.movement_type] += m.quantity;
      }
    });

    return [
      { type: "Stock In", quantity: counts.stock_in, fill: "#10b981" },
      { type: "Stock Out", quantity: counts.stock_out, fill: "#3b82f6" },
      { type: "Adjustments", quantity: counts.adjustment, fill: "#8b5cf6" },
      { type: "Transfers", quantity: counts.transfer, fill: "#06b6d4" },
      { type: "Wastage", quantity: counts.wastage, fill: "#f59e0b" },
    ];
  }, [movements]);

  // 4. Branch Stock Comparison (Super Admin only)
  const branchChartData = useMemo(() => {
    if (!canViewAllBranches) return [];
    const map: Record<string, { branchName: string; itemCount: number; totalStock: number }> = {};
    branches.forEach((b) => {
      map[b.id] = { branchName: b.name, itemCount: 0, totalStock: 0 };
    });

    items.forEach((i) => {
      if (i.branch_id && map[i.branch_id]) {
        map[i.branch_id].itemCount++;
        map[i.branch_id].totalStock += i.current_stock || 0;
      }
    });

    return Object.values(map);
  }, [items, branches, canViewAllBranches]);

  return (
    <div className="space-y-6">
      {/* 8 Primary KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Active Items */}
        <div className="rounded-2xl border border-line bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
              Active Items
            </span>
            <div className="rounded-xl bg-royal/10 p-2 text-royal">
              <Boxes size={18} />
            </div>
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-ink">
            {metrics.totalActiveItems}
          </p>
          <p className="mt-1 text-[11px] text-ink-soft">Unique active SKUs & supplies</p>
        </div>

        {/* Total Stock Quantity */}
        <div className="rounded-2xl border border-line bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
              Total Units
            </span>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
              <Package size={18} />
            </div>
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-ink">
            {metrics.totalStockQuantity.toLocaleString()}
          </p>
          <p className="mt-1 text-[11px] text-ink-soft">Consumable items in inventory</p>
        </div>

        {/* Total Inventory Value (Protected) */}
        <div className="rounded-2xl border border-line bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
              Total Valuation
            </span>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
              <DollarSign size={18} />
            </div>
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-ink">
            {canManageFinancials
              ? `₱${metrics.totalValuation.toLocaleString("en-PH")}`
              : "Restricted"}
          </p>
          <p className="mt-1 text-[11px] text-ink-soft">Based on unit purchase cost</p>
        </div>

        {/* Low Stock Alerts */}
        <div
          onClick={() => onNavigateToTab("alerts")}
          className="rounded-2xl border border-line bg-white p-4 sm:p-5 shadow-sm cursor-pointer hover:border-amber-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
              Low-Stock Alerts
            </span>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
              <AlertTriangle size={18} />
            </div>
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-amber-600">
            {metrics.lowStockCount}
          </p>
          <p className="mt-1 text-[11px] text-ink-soft">Items at or below threshold</p>
        </div>

        {/* Out of Stock */}
        <div
          onClick={() => onNavigateToTab("alerts")}
          className="rounded-2xl border border-line bg-white p-4 sm:p-5 shadow-sm cursor-pointer hover:border-red-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-red-700">
              Out of Stock
            </span>
            <div className="rounded-xl bg-red-50 p-2 text-red-600">
              <ShieldAlert size={18} />
            </div>
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-red-600">
            {metrics.outOfStockCount}
          </p>
          <p className="mt-1 text-[11px] text-ink-soft">Zero inventory remaining</p>
        </div>

        {/* Near Expiration */}
        <div
          onClick={() => onNavigateToTab("alerts")}
          className="rounded-2xl border border-line bg-white p-4 sm:p-5 shadow-sm cursor-pointer hover:border-amber-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
              Expiring Soon
            </span>
            <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
              <Clock size={18} />
            </div>
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-amber-700">
            {metrics.nearExpiryCount}
          </p>
          <p className="mt-1 text-[11px] text-ink-soft">Expires within 90 days</p>
        </div>

        {/* Expired Stock */}
        <div
          onClick={() => onNavigateToTab("alerts")}
          className="rounded-2xl border border-line bg-white p-4 sm:p-5 shadow-sm cursor-pointer hover:border-red-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-red-800">
              Expired Stock
            </span>
            <div className="rounded-xl bg-red-100 p-2 text-red-700">
              <ShieldAlert size={18} />
            </div>
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-red-700">
            {metrics.expiredCount}
          </p>
          <p className="mt-1 text-[11px] text-ink-soft">Past clinical expiry date</p>
        </div>

        {/* Pending Transfers */}
        <div
          onClick={() => onNavigateToTab("transfers")}
          className="rounded-2xl border border-line bg-white p-4 sm:p-5 shadow-sm cursor-pointer hover:border-cyan-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-700">
              Pending Transfers
            </span>
            <div className="rounded-xl bg-cyan-50 p-2 text-cyan-600">
              <ArrowRightLeft size={18} />
            </div>
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-cyan-600">
            {metrics.pendingTransfersCount}
          </p>
          <p className="mt-1 text-[11px] text-ink-soft">Inter-branch shipments in transit</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Movement Activity Chart */}
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm text-ink">Stock Movement Volume</h3>
              <p className="text-xs text-ink-soft">Total units logged by movement type</p>
            </div>
            <TrendingUp size={16} className="text-royal" />
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={movementBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="type" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip
                  formatter={(val) => [`${val} units`, "Quantity"]}
                  contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0" }}
                />
                <Bar dataKey="quantity" radius={[6, 6, 0, 0]}>
                  {movementBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stock Levels by Category Chart */}
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm text-ink">Stock Units by Category</h3>
              <p className="text-xs text-ink-soft">Current consumable distribution</p>
            </div>
            <BarChart3 size={16} className="text-royal" />
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryChartData.slice(0, 6)}
                layout="vertical"
                margin={{ top: 10, right: 25, left: 10, bottom: 10 }}
                barSize={18}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#334155" }}
                  width={140}
                  tickFormatter={(val: string) => (val && val.length > 20 ? `${val.slice(0, 18)}…` : val)}
                />
                <Tooltip
                  formatter={(val) => [`${val} units`, "Stock Units"]}
                  labelFormatter={(label) => `Category: ${label}`}
                  contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}
                />
                <Bar dataKey="stock" fill="#1e3a8a" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Branch Stock Comparison (Super Admin Only) */}
      {canViewAllBranches && branchChartData.length > 0 && (
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-sm text-ink">Multi-Branch Inventory Comparison</h3>
              <p className="text-xs text-ink-soft">Total stock units across Cindyrella branches</p>
            </div>
            <Building2 size={16} className="text-royal" />
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchChartData} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="branchName" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip
                  formatter={(val) => [`${val} units`, "Total Units"]}
                  contentStyle={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0" }}
                />
                <Bar dataKey="totalStock" fill="#0284c7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Urgent Alerts Feed & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Alerts (Low Stock & Near Expiry) */}
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-600" />
              <h3 className="font-semibold text-sm text-ink">Urgent Clinical Alerts</h3>
            </div>
            <button
              onClick={() => onNavigateToTab("alerts")}
              className="text-xs text-royal hover:underline font-medium"
            >
              View All Alerts &rarr;
            </button>
          </div>

          <div className="space-y-2.5">
            {metrics.lowStockItems.slice(0, 4).map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className="flex items-center justify-between p-3 rounded-xl bg-amber-50/50 border border-amber-200/60 hover:bg-amber-50 cursor-pointer transition-colors"
              >
                <div>
                  <h4 className="font-semibold text-xs text-ink">{item.name}</h4>
                  <p className="text-[11px] text-ink-soft">
                    Min alert: {item.low_stock_threshold} {item.unit} • Reorder: {item.reorder_quantity || 10}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-amber-700 text-sm">
                    {item.current_stock} {item.unit}
                  </span>
                  <span className="block text-[10px] text-amber-600 font-medium">Low Stock</span>
                </div>
              </div>
            ))}

            {metrics.nearExpiryItemsList.slice(0, 3).map(({ item, daysUntil }) => (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                className="flex items-center justify-between p-3 rounded-xl bg-red-50/50 border border-red-200/60 hover:bg-red-50 cursor-pointer transition-colors"
              >
                <div>
                  <h4 className="font-semibold text-xs text-ink">{item.name}</h4>
                  <p className="text-[11px] text-ink-soft">
                    Expiry: {item.expiry_date} • Batch: {item.batch_number || "N/A"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-red-700 text-xs">
                    {daysUntil} days left
                  </span>
                  <span className="block text-[10px] text-red-600 font-medium">Near Expiry</span>
                </div>
              </div>
            ))}

            {metrics.lowStockItems.length === 0 && metrics.nearExpiryItemsList.length === 0 && (
              <div className="py-8 text-center text-xs text-ink-soft flex flex-col items-center gap-1.5">
                <CheckCircle2 size={24} className="text-emerald-500" />
                <span>All stock levels and expiration dates are currently healthy.</span>
              </div>
            )}
          </div>
        </div>

        {/* Recent Inventory Transactions Feed */}
        <div className="rounded-2xl border border-line bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-royal" />
              <h3 className="font-semibold text-sm text-ink">Recent Stock Movements</h3>
            </div>
            <button
              onClick={() => onNavigateToTab("movements")}
              className="text-xs text-royal hover:underline font-medium"
            >
              View Full Audit Log &rarr;
            </button>
          </div>

          <div className="space-y-2.5">
            {movements.slice(0, 6).map((mov) => {
              const isPositive = mov.movement_type === "stock_in" || mov.movement_type === "customer_return";
              return (
                <div
                  key={mov.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-line bg-pale/20 hover:bg-pale/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`rounded-lg p-2 font-mono text-xs font-bold ${
                        isPositive ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {isPositive ? `+${mov.quantity}` : `-${mov.quantity}`}
                    </div>
                    <div>
                      <h4 className="font-semibold text-xs text-ink">
                        {mov.inventory_items?.name || "Inventory Item"}
                      </h4>
                      <p className="text-[11px] text-ink-soft">
                        {mov.reason} • {new Date(mov.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-[10px] text-ink-soft block">
                      {mov.reference_number}
                    </span>
                    <span className="text-[10px] capitalize font-medium text-ink">
                      {mov.movement_type.replace("_", " ")}
                    </span>
                  </div>
                </div>
              );
            })}

            {movements.length === 0 && (
              <div className="py-8 text-center text-xs text-ink-soft">
                No recent stock movement logs found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
