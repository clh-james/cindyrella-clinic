"use client";

import { useState, useMemo } from "react";
import { 
  FileText, Download, FileSpreadsheet
} from "lucide-react";
import * as XLSX from "xlsx";
import { 
  InventoryItem, InventoryMovement, 
  InventoryTransfer, InventoryPurchaseOrder, BranchInfo 
} from "./types";

interface InventoryReportsViewProps {
  items: InventoryItem[];
  movements: InventoryMovement[];
  transfers: InventoryTransfer[];
  purchaseOrders: InventoryPurchaseOrder[];
  branches: BranchInfo[];
  canManageFinancials: boolean;
  canViewAllBranches: boolean;
}

export type ReportType =
  | "current_stock"
  | "valuation"
  | "low_stock"
  | "out_of_stock"
  | "expiration"
  | "movements"
  | "wastage"
  | "adjustments"
  | "transfers"
  | "purchasing"
  | "retail_sales";

const REPORT_DEFINITIONS: { id: ReportType; title: string; desc: string; requiresFinance?: boolean }[] = [
  { id: "current_stock", title: "Current Stock Report", desc: "Live snapshot of on-hand inventory across all active SKUs." },
  { id: "valuation", title: "Inventory Valuation Report", desc: "Total asset value by category and branch based on purchase costs.", requiresFinance: true },
  { id: "low_stock", title: "Low-Stock Reorder Report", desc: "Items currently at or below minimum threshold needing replenishment." },
  { id: "out_of_stock", title: "Out-of-Stock Report", desc: "Items with zero available units disrupting operations or sales." },
  { id: "expiration", title: "Expiration & Batch Safety Report", desc: "Clinical review of batch lot numbers, expiration horizons, and quarantined items." },
  { id: "movements", title: "Stock Movement Audit Report", desc: "Comprehensive chronological ledger of all stock ins, outs, and shifts." },
  { id: "wastage", title: "Stock Wastage & Spoilage Report", desc: "Audit trail of dropped, expired, broken, or contaminated materials." },
  { id: "adjustments", title: "Stock Adjustment & Variance Report", desc: "Reconciliation logs from physical count variances and audits." },
  { id: "transfers", title: "Inter-Branch Transfer Report", desc: "Log of inter-branch shipments, dispatch timestamps, and receipts." },
  { id: "purchasing", title: "Purchase Orders & Receiving Report", desc: "Vendor orders, invoice tracking, unit costs, and receiving statuses." },
  { id: "retail_sales", title: "Retail Sales & Material Consumption", desc: "Stock consumed through POS retail sales and clinical services." },
];

export function InventoryReportsView({
  items,
  movements,
  transfers,
  purchaseOrders,
  branches,
  canManageFinancials,
  canViewAllBranches,
}: InventoryReportsViewProps) {
  const [selectedReport, setSelectedReport] = useState<ReportType>("current_stock");
  const [branchFilter, setBranchFilter] = useState("all");

  // Filtered dataset generator for active report
  const reportData = useMemo(() => {
    // 1. Current Stock
    if (selectedReport === "current_stock") {
      return items
        .filter((i) => branchFilter === "all" || i.branch_id === branchFilter)
        .map((i) => ({
          "Item Name": i.name,
          "SKU": i.sku || "N/A",
          "Category": i.category,
          "Current Stock": i.current_stock,
          "Unit": i.unit,
          "Min. Threshold": i.low_stock_threshold,
          "Branch": branches.find((b) => b.id === i.branch_id)?.name || "All Branches",
          "Status": i.current_stock === 0 ? "Out of Stock" : i.current_stock <= i.low_stock_threshold ? "Low Stock" : "Healthy",
        }));
    }

    // 2. Valuation
    if (selectedReport === "valuation") {
      return items
        .filter((i) => branchFilter === "all" || i.branch_id === branchFilter)
        .map((i) => {
          const cost = i.cost_price || 0;
          const totalVal = cost * i.current_stock;
          return {
            "Item Name": i.name,
            "SKU": i.sku || "N/A",
            "Category": i.category,
            "On Hand Qty": i.current_stock,
            "Unit Cost (PHP)": cost,
            "Total Valuation (PHP)": totalVal,
            "Branch": branches.find((b) => b.id === i.branch_id)?.name || "All Branches",
          };
        });
    }

    // 3. Low Stock
    if (selectedReport === "low_stock") {
      return items
        .filter((i) => i.current_stock <= i.low_stock_threshold && (branchFilter === "all" || i.branch_id === branchFilter))
        .map((i) => ({
          "Item Name": i.name,
          "Category": i.category,
          "Available Stock": i.current_stock,
          "Threshold": i.low_stock_threshold,
          "Suggested Reorder": i.reorder_quantity || 10,
          "Unit": i.unit,
          "Branch": branches.find((b) => b.id === i.branch_id)?.name || "All Branches",
        }));
    }

    // 4. Out of Stock
    if (selectedReport === "out_of_stock") {
      return items
        .filter((i) => i.current_stock === 0 && (branchFilter === "all" || i.branch_id === branchFilter))
        .map((i) => ({
          "Item Name": i.name,
          "Category": i.category,
          "Threshold": i.low_stock_threshold,
          "Suggested Reorder": i.reorder_quantity || 10,
          "Unit": i.unit,
          "Branch": branches.find((b) => b.id === i.branch_id)?.name || "All Branches",
        }));
    }

    // 5. Expiration & Batch
    if (selectedReport === "expiration") {
      const currentTime = new Date().getTime();
      return items
        .filter((i) => !!i.expiry_date && (branchFilter === "all" || i.branch_id === branchFilter))
        .map((i) => {
          const exp = new Date(i.expiry_date!);
          const diffDays = Math.ceil((exp.getTime() - currentTime) / (1000 * 60 * 60 * 24));
          return {
            "Item Name": i.name,
            "Batch / Lot #": i.batch_number || "N/A",
            "Expiry Date": i.expiry_date,
            "Days Remaining": diffDays,
            "Safety Status": diffDays < 0 ? "EXPIRED" : diffDays <= 90 ? "NEAR EXPIRY" : "OK",
            "Quarantined": i.is_quarantined ? "YES" : "NO",
            "Stock Count": i.current_stock,
            "Unit": i.unit,
          };
        });
    }

    // 6. Movements
    if (selectedReport === "movements") {
      return movements
        .filter((m) => branchFilter === "all" || m.destination_branch_id === branchFilter || m.source_branch_id === branchFilter)
        .map((m) => ({
          "Ref #": m.reference_number,
          "Date": new Date(m.created_at).toLocaleDateString("en-PH"),
          "Item": m.inventory_items?.name || "N/A",
          "Type": m.movement_type,
          "Quantity": m.quantity,
          "Unit": m.unit,
          "Before": m.previous_quantity,
          "After": m.new_quantity,
          "Reason": m.reason,
        }));
    }

    // 7. Wastage
    if (selectedReport === "wastage") {
      return movements
        .filter((m) => m.movement_type === "wastage")
        .map((m) => ({
          "Ref #": m.reference_number,
          "Date": new Date(m.created_at).toLocaleDateString("en-PH"),
          "Item": m.inventory_items?.name || "N/A",
          "Quantity Wasted": m.quantity,
          "Unit": m.unit,
          "Reason": m.reason,
          "Incident Notes": m.notes || "",
        }));
    }

    // 8. Adjustments
    if (selectedReport === "adjustments") {
      return movements
        .filter((m) => m.movement_type === "adjustment")
        .map((m) => ({
          "Ref #": m.reference_number,
          "Date": new Date(m.created_at).toLocaleDateString("en-PH"),
          "Item": m.inventory_items?.name || "N/A",
          "Previous Stock": m.previous_quantity,
          "Audited Count": m.new_quantity,
          "Variance": m.new_quantity - m.previous_quantity,
          "Audit Reason": m.reason,
          "Notes": m.notes || "",
        }));
    }

    // 9. Transfers
    if (selectedReport === "transfers") {
      return transfers.map((t) => ({
        "Transfer #": t.transfer_number,
        "Source Branch": branches.find((b) => b.id === t.source_branch_id)?.name || "Branch A",
        "Destination Branch": branches.find((b) => b.id === t.destination_branch_id)?.name || "Branch B",
        "Status": t.status,
        "Requested Date": new Date(t.created_at).toLocaleDateString("en-PH"),
        "Discrepancy Notes": t.discrepancy_notes || "None",
      }));
    }

    // 10. Purchasing
    if (selectedReport === "purchasing") {
      return purchaseOrders.map((po) => ({
        "PO #": po.po_number,
        "Order Date": po.order_date,
        "Branch": branches.find((b) => b.id === po.branch_id)?.name || "N/A",
        "Total Cost (PHP)": po.total_cost,
        "Status": po.status,
        "Invoice #": po.invoice_number || "Pending",
      }));
    }

    // 11. Retail Sales & Consumption
    return movements
      .filter((m) => m.movement_type === "stock_out")
      .map((m) => ({
        "Ref #": m.reference_number,
        "Date": new Date(m.created_at).toLocaleDateString("en-PH"),
        "Item": m.inventory_items?.name || "N/A",
        "Quantity Issued": m.quantity,
        "Unit": m.unit,
        "Reason": m.reason,
      }));
  }, [selectedReport, items, movements, transfers, purchaseOrders, branches, branchFilter]);

  const activeDefinition = REPORT_DEFINITIONS.find((r) => r.id === selectedReport) || REPORT_DEFINITIONS[0];

  const handleExport = (format: "xlsx" | "csv") => {
    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `Cindyrella_${selectedReport}_${dateStr}.${format}`;
    XLSX.writeFile(wb, filename, { bookType: format });
  };

  return (
    <div className="space-y-6">
      {/* Report Selector Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {REPORT_DEFINITIONS.map((def) => {
          if (def.requiresFinance && !canManageFinancials) return null;
          const isSelected = selectedReport === def.id;

          return (
            <button
              key={def.id}
              onClick={() => setSelectedReport(def.id)}
              className={`rounded-2xl border p-3.5 text-left transition-all ${
                isSelected
                  ? "border-royal bg-royal text-white shadow-md shadow-royal/20"
                  : "border-line bg-white text-ink hover:border-royal/40 hover:bg-pale/30"
              }`}
            >
              <h4 className="font-semibold text-xs leading-snug">{def.title}</h4>
              <p className={`text-[10px] mt-1 line-clamp-2 ${isSelected ? "text-white/80" : "text-ink-soft"}`}>
                {def.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* Report Viewer Container */}
      <div className="rounded-2xl border border-line bg-white p-5 shadow-sm space-y-4">
        {/* Report Top Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-royal" />
              <h3 className="font-serif text-lg font-semibold text-ink">
                {activeDefinition.title}
              </h3>
            </div>
            <p className="text-xs text-ink-soft mt-0.5">
              Generated: {new Date().toLocaleString("en-PH")} • {reportData.length} Records
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Branch Filter */}
            {canViewAllBranches && (
              <div className="flex items-center gap-1.5">
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="rounded-xl border border-line bg-white px-3 py-1.5 text-xs text-ink outline-none"
                >
                  <option value="all">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={() => handleExport("xlsx")}
              className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors shadow-sm"
            >
              <FileSpreadsheet size={15} />
              <span>Excel</span>
            </button>
            <button
              onClick={() => handleExport("csv")}
              className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-pale transition-colors shadow-sm"
            >
              <Download size={14} className="text-ink-soft" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Data Preview Table */}
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[700px] border-collapse text-left text-xs">
            <thead>
              <tr className="bg-pale/70 text-ink border-b border-line">
                {reportData.length > 0 &&
                  Object.keys(reportData[0]).map((key) => (
                    <th key={key} className="py-2.5 px-3 font-semibold uppercase tracking-wider text-[10px] text-ink-soft">
                      {key}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {reportData.slice(0, 50).map((row, idx) => (
                <tr key={idx} className="hover:bg-pale/30 transition-colors">
                  {Object.values(row).map((val: unknown, i) => (
                    <td key={i} className="py-2.5 px-3 text-ink">
                      {typeof val === "number" && String(Object.keys(row)[i]).includes("PHP")
                        ? `₱${val.toLocaleString("en-PH")}`
                        : String(val)}
                    </td>
                  ))}
                </tr>
              ))}

              {reportData.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-ink-soft">
                    No data available for this report with selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {reportData.length > 50 && (
          <p className="text-right text-[11px] text-ink-soft italic">
            Displaying first 50 rows. Click &quot;Excel&quot; or &quot;CSV&quot; to export all {reportData.length} records.
          </p>
        )}
      </div>
    </div>
  );
}
