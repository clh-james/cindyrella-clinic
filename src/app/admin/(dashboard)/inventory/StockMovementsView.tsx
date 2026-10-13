"use client";

import { useState, useMemo } from "react";
import { 
  History, Search, Download, ChevronLeft, ChevronRight
} from "lucide-react";
import * as XLSX from "xlsx";
import { InventoryMovement, BranchInfo, MOVEMENT_TYPE_LABELS } from "./types";

interface StockMovementsViewProps {
  movements: InventoryMovement[];
  branches: BranchInfo[];
}

export function StockMovementsView({ movements, branches }: StockMovementsViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all"); // 7d, 30d, 90d, all

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Filter movements
  const filteredMovements = useMemo(() => {
    const now = new Date();

    return movements.filter((m) => {
      // Search
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const refMatch = m.reference_number.toLowerCase().includes(q);
        const itemMatch = m.inventory_items?.name?.toLowerCase().includes(q);
        const reasonMatch = m.reason?.toLowerCase().includes(q);
        const notesMatch = m.notes?.toLowerCase().includes(q);
        if (!refMatch && !itemMatch && !reasonMatch && !notesMatch) return false;
      }

      // Movement Type
      if (typeFilter !== "all" && m.movement_type !== typeFilter) {
        return false;
      }

      // Branch
      if (branchFilter !== "all") {
        if (m.destination_branch_id !== branchFilter && m.source_branch_id !== branchFilter) {
          return false;
        }
      }

      // Date Range
      if (dateFilter !== "all") {
        const movDate = new Date(m.created_at);
        const diffDays = (now.getTime() - movDate.getTime()) / (1000 * 60 * 60 * 24);
        if (dateFilter === "7d" && diffDays > 7) return false;
        if (dateFilter === "30d" && diffDays > 30) return false;
        if (dateFilter === "90d" && diffDays > 90) return false;
      }

      return true;
    });
  }, [movements, searchTerm, typeFilter, branchFilter, dateFilter]);

  // Paginated movements
  const totalPages = Math.ceil(filteredMovements.length / pageSize) || 1;
  const paginatedMovements = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMovements.slice(start, start + pageSize);
  }, [filteredMovements, currentPage, pageSize]);

  // Export CSV
  const handleExportCSV = () => {
    const exportData = filteredMovements.map((m) => {
      const srcBranch = branches.find((b) => b.id === m.source_branch_id)?.name || "—";
      const destBranch = branches.find((b) => b.id === m.destination_branch_id)?.name || "—";

      return {
        "Ref #": m.reference_number,
        "Timestamp": new Date(m.created_at).toLocaleString("en-PH"),
        "Item": m.inventory_items?.name || "N/A",
        "Movement Type": m.movement_type,
        "Quantity": m.quantity,
        "Unit": m.unit,
        "Previous Stock": m.previous_quantity,
        "New Stock": m.new_quantity,
        "Source Branch": srcBranch,
        "Destination Branch": destBranch,
        "Batch #": m.batch_number || "",
        "Reason": m.reason,
        "Notes": m.notes || "",
        "Reference ID": m.reference_id || "",
        "Performed By": m.performer?.full_name || "Staff",
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock Movements");
    XLSX.writeFile(wb, `Cindyrella_Stock_Movements_${new Date().toISOString().slice(0, 10)}.csv`, { bookType: "csv" });
  };

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="rounded-2xl border border-line bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Search reference #, item name, reason..."
              className="w-full rounded-xl border border-line bg-pale/30 pl-10 pr-4 py-2 text-xs sm:text-sm text-ink outline-none focus:border-royal focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-medium text-ink hover:bg-pale transition-colors"
            >
              <Download size={14} className="text-ink-soft" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filter dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-line text-xs">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-soft mb-1">
              Movement Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
              className="w-full rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink bg-white outline-none focus:border-royal"
            >
              <option value="all">All 8 Movement Types</option>
              <option value="stock_in">Stock In (Purchases & Restocks)</option>
              <option value="stock_out">Stock Out (Usage & Issues)</option>
              <option value="adjustment">Stock Adjustment (Audit Recount)</option>
              <option value="transfer">Stock Transfer (Branch Move)</option>
              <option value="wastage">Stock Wastage (Damaged / Spilled)</option>
              <option value="expired">Expired Stock (Disposal)</option>
              <option value="customer_return">Customer Return</option>
              <option value="supplier_return">Supplier Return</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-soft mb-1">
              Branch
            </label>
            <select
              value={branchFilter}
              onChange={(e) => { setBranchFilter(e.target.value); setCurrentPage(1); }}
              className="w-full rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink bg-white outline-none focus:border-royal"
            >
              <option value="all">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-soft mb-1">
              Time Period
            </label>
            <select
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
              className="w-full rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink bg-white outline-none focus:border-royal"
            >
              <option value="all">All Time</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Movements Table */}
      <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
        <table className="w-full min-w-[900px] border-collapse text-left text-xs">
          <thead>
            <tr className="bg-pale/70 text-ink border-b border-line">
              <th className="py-3 px-4 font-semibold">Ref # & Date</th>
              <th className="py-3 px-3 font-semibold">Item & Batch</th>
              <th className="py-3 px-3 font-semibold">Movement Type</th>
              <th className="py-3 px-3 font-semibold text-center">Change</th>
              <th className="py-3 px-3 font-semibold">Stock Before &rarr; After</th>
              <th className="py-3 px-4 font-semibold">Reason & Reference</th>
              <th className="py-3 px-3 font-semibold">Branch</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {paginatedMovements.map((m) => {
              const labelInfo = MOVEMENT_TYPE_LABELS[m.movement_type] || {
                label: m.movement_type,
                color: "text-gray-700 bg-gray-50 border-gray-200",
              };
              const delta = m.new_quantity - m.previous_quantity;
              const branchName =
                branches.find((b) => b.id === (m.destination_branch_id || m.source_branch_id))?.name || "—";

              return (
                <tr key={m.id} className="hover:bg-pale/30 transition-colors">
                  <td className="py-3.5 px-4 font-medium text-ink">
                    <span className="font-mono text-xs font-semibold text-ink block">
                      {m.reference_number}
                    </span>
                    <span className="text-[10px] text-ink-soft">
                      {new Date(m.created_at).toLocaleString("en-PH", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </td>

                  <td className="py-3.5 px-3 font-medium text-ink">
                    <span className="font-semibold block">{m.inventory_items?.name || "Item"}</span>
                    {m.batch_number && (
                      <span className="text-[10px] font-mono text-ink-soft">Batch: {m.batch_number}</span>
                    )}
                  </td>

                  <td className="py-3.5 px-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${labelInfo.color}`}
                    >
                      {labelInfo.label}
                    </span>
                  </td>

                  <td className="py-3.5 px-3 text-center font-mono">
                    <span
                      className={`font-bold text-sm ${
                        delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-600" : "text-ink"
                      }`}
                    >
                      {delta > 0 ? `+${delta}` : delta} {m.unit}
                    </span>
                  </td>

                  <td className="py-3.5 px-3 font-mono text-ink-soft text-xs">
                    <span className="text-ink">{m.previous_quantity}</span>
                    <span className="mx-1">&rarr;</span>
                    <span className="font-semibold text-ink">{m.new_quantity}</span>
                  </td>

                  <td className="py-3.5 px-4 text-xs">
                    <span className="font-medium text-ink block">{m.reason}</span>
                    {m.notes && <span className="text-[11px] text-ink-soft block">{m.notes}</span>}
                    {m.reference_id && (
                      <span className="text-[10px] font-mono text-royal block">Ref: {m.reference_id}</span>
                    )}
                  </td>

                  <td className="py-3.5 px-3 text-xs text-ink-soft">
                    {branchName}
                  </td>
                </tr>
              );
            })}

            {paginatedMovements.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-ink-soft">
                  <History size={32} className="mx-auto mb-2 text-ink-soft/40" />
                  No stock movements recorded matching the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-ink-soft pt-2">
        <div>
          Showing {Math.min((currentPage - 1) * pageSize + 1, filteredMovements.length)} to{" "}
          {Math.min(currentPage * pageSize, filteredMovements.length)} of {filteredMovements.length} logs
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-lg border border-line bg-white p-1.5 text-ink hover:bg-pale disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="rounded-lg border border-line bg-white p-1.5 text-ink hover:bg-pale disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
