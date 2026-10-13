"use client";

import { useState, useMemo } from "react";
import { 
  Package, Search, ArrowUpDown, ChevronLeft, ChevronRight,
  Plus, Download, Eye, Edit2, ArrowUpRight, ArrowDownRight,
  Building2, AlertTriangle, ShieldAlert, FileSpreadsheet
} from "lucide-react";
import * as XLSX from "xlsx";
import { InventoryItem, InventoryCategory, InventorySupplier, BranchInfo } from "./types";

interface InventoryTableProps {
  items: InventoryItem[];
  categories: InventoryCategory[];
  suppliers: InventorySupplier[];
  branches: BranchInfo[];
  canManageFinancials: boolean;
  canAdjustStock: boolean;
  onAddItem: () => void;
  onViewDetails: (item: InventoryItem) => void;
  onEditItem: (item: InventoryItem) => void;
  onStockIn: (item: InventoryItem) => void;
  onStockOut: (item: InventoryItem) => void;
  onAdjust?: (item: InventoryItem) => void;
  onTransfer?: (item: InventoryItem) => void;
}

export function InventoryTable({
  items,
  categories,
  suppliers,
  branches,
  canManageFinancials,
  canAdjustStock,
  onAddItem,
  onViewDetails,
  onEditItem,
  onStockIn,
  onStockOut,
}: InventoryTableProps) {
  // Filtering states
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [stockStatusFilter, setStockStatusFilter] = useState("all");
  const [expiryFilter, setExpiryFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");

  // Sorting states
  const [sortField, setSortField] = useState<keyof InventoryItem>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Handle Sort
  const handleSort = (field: keyof InventoryItem) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filtered and Sorted Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Search Query
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesSku = item.sku?.toLowerCase().includes(query);
        const matchesBarcode = item.barcode?.toLowerCase().includes(query);
        const matchesBrand = item.brand?.toLowerCase().includes(query);
        if (!matchesName && !matchesSku && !matchesBarcode && !matchesBrand) return false;
      }

      // 2. Category Filter
      if (categoryFilter !== "all") {
        if (item.category_id !== categoryFilter && item.category !== categoryFilter) return false;
      }

      // 3. Branch Filter
      if (branchFilter !== "all") {
        if (item.branch_id && item.branch_id !== branchFilter) return false;
      }

      // 4. Supplier Filter
      if (supplierFilter !== "all") {
        if (item.supplier_id !== supplierFilter) return false;
      }

      // 5. Stock Status Filter
      if (stockStatusFilter !== "all") {
        const isOut = item.current_stock === 0;
        const isLow = item.current_stock > 0 && item.current_stock <= item.low_stock_threshold;
        const isIn = item.current_stock > item.low_stock_threshold;
        const isInactive = item.is_active === false;

        if (stockStatusFilter === "out" && !isOut) return false;
        if (stockStatusFilter === "low" && !isLow) return false;
        if (stockStatusFilter === "in" && !isIn) return false;
        if (stockStatusFilter === "inactive" && !isInactive) return false;
      }

      // 6. Expiration Filter
      if (expiryFilter !== "all" && item.expiry_date) {
        const exp = new Date(item.expiry_date);
        const now = new Date();
        const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (expiryFilter === "expired" && diffDays >= 0) return false;
        if (expiryFilter === "30d" && (diffDays < 0 || diffDays > 30)) return false;
        if (expiryFilter === "60d" && (diffDays < 0 || diffDays > 60)) return false;
        if (expiryFilter === "90d" && (diffDays < 0 || diffDays > 90)) return false;
      } else if (expiryFilter !== "all" && !item.expiry_date) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (valA === undefined || valA === null) valA = "";
      if (valB === undefined || valB === null) valB = "";

      if (typeof valA === "string") {
        const cmp = (valA as string).localeCompare(valB as string);
        return sortDirection === "asc" ? cmp : -cmp;
      }
      if (typeof valA === "number") {
        const cmp = (valA as number) - (valB as number);
        return sortDirection === "asc" ? cmp : -cmp;
      }
      return 0;
    });
  }, [items, searchTerm, categoryFilter, branchFilter, stockStatusFilter, expiryFilter, supplierFilter, sortField, sortDirection]);

  // Paginated items
  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Export to Excel / CSV
  const handleExport = (format: "xlsx" | "csv") => {
    const exportData = filteredItems.map((item) => {
      const branchName = branches.find((b) => b.id === item.branch_id)?.name || "All Branches";
      const supplierName = suppliers.find((s) => s.id === item.supplier_id)?.name || "N/A";
      
      const row: Record<string, unknown> = {
        "Item Name": item.name,
        "SKU": item.sku || "",
        "Barcode": item.barcode || "",
        "Category": item.category,
        "Subcategory": item.subcategory || "",
        "Brand": item.brand || "",
        "Current Stock": item.current_stock,
        "Unit": item.unit,
        "Min. Threshold": item.low_stock_threshold,
        "Reorder Qty": item.reorder_quantity || 10,
        "Branch": branchName,
        "Supplier": supplierName,
        "Storage Location": item.storage_location || "",
        "Batch Number": item.batch_number || "",
        "Expiry Date": item.expiry_date || "",
        "Retail Price (PHP)": item.retail_price || 0,
      };

      if (canManageFinancials) {
        row["Purchase Cost (PHP)"] = item.cost_price || 0;
        row["Total Valuation (PHP)"] = (item.cost_price || 0) * item.current_stock;
      }

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");

    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `Cindyrella_Inventory_${dateStr}.${format}`;
    XLSX.writeFile(workbook, filename, { bookType: format });
  };

  return (
    <div className="space-y-4">
      {/* Top Filter and Actions Bar */}
      <div className="rounded-2xl border border-line bg-white p-4 shadow-sm space-y-3">
        {/* Row 1: Search, Export & Add Item */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Search by name, SKU, barcode, brand..."
              className="w-full rounded-xl border border-line bg-pale/30 pl-10 pr-4 py-2 text-xs sm:text-sm text-ink outline-none focus:border-royal focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Export Dropdown */}
            <div className="relative inline-block text-left">
              <button
                onClick={() => handleExport("xlsx")}
                className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-medium text-ink hover:bg-pale transition-colors"
                title="Export filtered items to Excel"
              >
                <FileSpreadsheet size={15} className="text-emerald-600" />
                <span className="hidden sm:inline">Export Excel</span>
              </button>
            </div>

            <button
              onClick={() => handleExport("csv")}
              className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-medium text-ink hover:bg-pale transition-colors"
              title="Export filtered items to CSV"
            >
              <Download size={14} className="text-ink-soft" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            <button
              onClick={onAddItem}
              className="flex items-center gap-1.5 rounded-xl bg-royal px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-royal-deep transition-all shadow-sm shadow-royal/20"
            >
              <Plus size={16} />
              <span>Add Item</span>
            </button>
          </div>
        </div>

        {/* Row 2: Comprehensive Multi-Attribute Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-2 border-t border-line">
          {/* Category Filter */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-soft mb-1">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
              className="w-full rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink bg-white outline-none focus:border-royal"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Branch Filter */}
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
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status Filter */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-soft mb-1">
              Stock Status
            </label>
            <select
              value={stockStatusFilter}
              onChange={(e) => { setStockStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink bg-white outline-none focus:border-royal"
            >
              <option value="all">All Stock Statuses</option>
              <option value="in">In Stock (Healthy)</option>
              <option value="low">Low Stock Alert</option>
              <option value="out">Out of Stock (Zero)</option>
              <option value="inactive">Inactive Items</option>
            </select>
          </div>

          {/* Expiration Filter */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-soft mb-1">
              Expiration
            </label>
            <select
              value={expiryFilter}
              onChange={(e) => { setExpiryFilter(e.target.value); setCurrentPage(1); }}
              className="w-full rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink bg-white outline-none focus:border-royal"
            >
              <option value="all">All Expirations</option>
              <option value="expired">Expired Stock</option>
              <option value="30d">Near Expiry (&le; 30 Days)</option>
              <option value="60d">Near Expiry (&le; 60 Days)</option>
              <option value="90d">Near Expiry (&le; 90 Days)</option>
            </select>
          </div>

          {/* Supplier Filter */}
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-soft mb-1">
              Supplier
            </label>
            <select
              value={supplierFilter}
              onChange={(e) => { setSupplierFilter(e.target.value); setCurrentPage(1); }}
              className="w-full rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink bg-white outline-none focus:border-royal"
            >
              <option value="all">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table (Desktop) */}
      <div className="hidden lg:block overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
        <table className="w-full min-w-[960px] border-collapse text-left text-xs">
          <thead>
            <tr className="bg-pale/70 text-ink border-b border-line">
              <th className="py-3 px-4 font-semibold cursor-pointer select-none" onClick={() => handleSort("name")}>
                <div className="flex items-center gap-1.5">
                  Item Name & SKU
                  <ArrowUpDown size={12} className="text-ink-soft" />
                </div>
              </th>
              <th className="py-3 px-3 font-semibold cursor-pointer select-none" onClick={() => handleSort("category")}>
                <div className="flex items-center gap-1.5">
                  Category
                  <ArrowUpDown size={12} className="text-ink-soft" />
                </div>
              </th>
              <th className="py-3 px-3 font-semibold">Branch</th>
              <th className="py-3 px-4 font-semibold cursor-pointer select-none" onClick={() => handleSort("current_stock")}>
                <div className="flex items-center gap-1.5">
                  Stock Level
                  <ArrowUpDown size={12} className="text-ink-soft" />
                </div>
              </th>
              <th className="py-3 px-3 font-semibold">Min. Level</th>
              {canManageFinancials && (
                <th className="py-3 px-3 font-semibold cursor-pointer select-none" onClick={() => handleSort("cost_price")}>
                  <div className="flex items-center gap-1.5">
                    Purchase Cost
                    <ArrowUpDown size={12} className="text-ink-soft" />
                  </div>
                </th>
              )}
              <th className="py-3 px-3 font-semibold">Retail Price</th>
              <th className="py-3 px-3 font-semibold">Expiry Status</th>
              <th className="py-3 px-3 font-semibold">Stock Status</th>
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {paginatedItems.map((item) => {
              const isLowStock = item.current_stock <= item.low_stock_threshold;
              const isOutOfStock = item.current_stock === 0;

              // Expiry checks
              let isExpired = false;
              let isNearExpiry = false;
              let daysUntil: number | null = null;
              if (item.expiry_date) {
                const exp = new Date(item.expiry_date);
                const now = new Date();
                daysUntil = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                if (daysUntil < 0) isExpired = true;
                else if (daysUntil <= 90) isNearExpiry = true;
              }

              const branchName = branches.find((b) => b.id === item.branch_id)?.name || "All Branches";

              return (
                <tr
                  key={item.id}
                  className="hover:bg-pale/40 transition-colors group cursor-pointer"
                  onClick={() => onViewDetails(item)}
                >
                  {/* Name & SKU */}
                  <td className="py-3.5 px-4 font-medium text-ink">
                    <div className="flex items-center gap-2.5">
                      <div className="rounded-lg bg-royal/10 p-1.5 text-royal flex-shrink-0">
                        <Package size={15} />
                      </div>
                      <div>
                        <div className="font-semibold text-ink group-hover:text-royal transition-colors">
                          {item.name}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-ink-soft mt-0.5">
                          {item.sku && <span>SKU: {item.sku}</span>}
                          {item.brand && <span className="font-sans font-normal">• {item.brand}</span>}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-3.5 px-3 text-ink-soft">
                    <span className="capitalize">{item.category}</span>
                    {item.subcategory && (
                      <span className="block text-[10px] text-ink-soft/80 font-normal">
                        {item.subcategory}
                      </span>
                    )}
                  </td>

                  {/* Branch */}
                  <td className="py-3.5 px-3 text-ink-soft">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink">
                      <Building2 size={11} className="text-ink-soft" />
                      {branchName}
                    </span>
                  </td>

                  {/* Current Stock */}
                  <td className="py-3.5 px-4 font-mono font-medium">
                    <div className="flex items-baseline gap-1">
                      <span
                        className={`text-base font-bold ${
                          isOutOfStock
                            ? "text-red-600"
                            : isLowStock
                            ? "text-amber-600"
                            : "text-ink"
                        }`}
                      >
                        {item.current_stock}
                      </span>
                      <span className="text-[11px] text-ink-soft font-sans">{item.unit}</span>
                    </div>
                  </td>

                  {/* Min. Stock Threshold */}
                  <td className="py-3.5 px-3 font-mono text-ink-soft">
                    {item.low_stock_threshold} {item.unit}
                  </td>

                  {/* Purchase Cost (RBAC) */}
                  {canManageFinancials && (
                    <td className="py-3.5 px-3 font-mono text-ink">
                      ₱{(item.cost_price || 0).toLocaleString("en-PH")}
                    </td>
                  )}

                  {/* Retail Price */}
                  <td className="py-3.5 px-3 font-mono text-royal font-medium">
                    {item.retail_price ? `₱${item.retail_price.toLocaleString("en-PH")}` : "—"}
                  </td>

                  {/* Expiration Status */}
                  <td className="py-3.5 px-3">
                    {isExpired ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 border border-red-200">
                        <ShieldAlert size={10} /> Expired
                      </span>
                    ) : isNearExpiry ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200">
                        <AlertTriangle size={10} /> {daysUntil}d left
                      </span>
                    ) : item.expiry_date ? (
                      <span className="text-[11px] font-mono text-ink-soft">{item.expiry_date}</span>
                    ) : (
                      <span className="text-ink-soft text-[11px]">—</span>
                    )}
                  </td>

                  {/* Stock Status */}
                  <td className="py-3.5 px-3">
                    <div className="flex flex-col gap-1 items-start">
                      {item.is_active === false ? (
                        <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700">
                          Inactive
                        </span>
                      ) : isOutOfStock ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700 border border-red-200">
                          <AlertTriangle size={10} /> Out of Stock
                        </span>
                      ) : isLowStock ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200">
                          <AlertTriangle size={10} /> Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700 border border-green-200">
                          In Stock
                        </span>
                      )}

                      {item.is_quarantined && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[9px] font-semibold text-purple-700 border border-purple-200">
                          Quarantined
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Actions Column */}
                  <td
                    className="py-3.5 px-4 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="relative inline-block text-left">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onViewDetails(item)}
                          className="rounded-lg p-1.5 text-ink-soft hover:bg-pale hover:text-royal transition-colors"
                          title="View Details"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => onEditItem(item)}
                          className="rounded-lg p-1.5 text-ink-soft hover:bg-pale hover:text-ink transition-colors"
                          title="Edit Item"
                        >
                          <Edit2 size={15} />
                        </button>
                        {canAdjustStock && (
                          <button
                            onClick={() => onStockIn(item)}
                            className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Stock In"
                          >
                            <ArrowUpRight size={15} />
                          </button>
                        )}
                        {canAdjustStock && (
                          <button
                            onClick={() => onStockOut(item)}
                            className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Stock Out"
                          >
                            <ArrowDownRight size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}

            {paginatedItems.length === 0 && (
              <tr>
                <td
                  colSpan={canManageFinancials ? 10 : 9}
                  className="py-12 text-center text-sm text-ink-soft"
                >
                  <Package size={36} className="mx-auto mb-2 text-ink-soft/40" />
                  No inventory items match your current filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="grid gap-3 lg:hidden">
        {paginatedItems.map((item) => {
          const isLowStock = item.current_stock <= item.low_stock_threshold;
          const isOutOfStock = item.current_stock === 0;

          return (
            <div
              key={item.id}
              onClick={() => onViewDetails(item)}
              className="rounded-xl border border-line bg-white p-4 shadow-sm flex flex-col gap-3 active:scale-[0.99] transition-transform"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 rounded-lg bg-royal/10 p-1.5 text-royal">
                    <Package size={16} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-ink">{item.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.sku && <span className="font-mono text-[10px] text-ink-soft">{item.sku}</span>}
                      <span className="text-[11px] text-ink-soft capitalize">• {item.category}</span>
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                {isOutOfStock ? (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700 border border-red-200">
                    Out of Stock
                  </span>
                ) : isLowStock ? (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200">
                    Low Stock
                  </span>
                ) : (
                  <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700 border border-green-200">
                    In Stock
                  </span>
                )}
              </div>

              {/* Middle Metrics */}
              <div className="flex items-baseline justify-between pt-2 border-t border-line border-dashed text-xs">
                <div>
                  <span className="text-[10px] text-ink-soft uppercase block">Stock Count</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className={`text-lg font-bold font-mono ${isOutOfStock ? "text-red-600" : isLowStock ? "text-amber-600" : "text-ink"}`}>
                      {item.current_stock}
                    </span>
                    <span className="text-ink-soft text-[11px]">{item.unit}</span>
                  </div>
                </div>

                {item.retail_price && (
                  <div className="text-right">
                    <span className="text-[10px] text-ink-soft uppercase block">Retail Price</span>
                    <span className="font-mono font-semibold text-royal text-sm">
                      ₱{item.retail_price.toLocaleString("en-PH")}
                    </span>
                  </div>
                )}
              </div>

              {/* Mobile Quick Action Buttons */}
              <div
                className="flex items-center justify-end gap-2 pt-2 border-t border-line"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => onViewDetails(item)}
                  className="rounded-lg bg-pale px-3 py-1.5 text-xs font-medium text-ink hover:bg-line transition-colors"
                >
                  Details
                </button>
                {canAdjustStock && (
                  <button
                    onClick={() => onStockIn(item)}
                    className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700"
                  >
                    + In
                  </button>
                )}
                {canAdjustStock && (
                  <button
                    onClick={() => onStockOut(item)}
                    className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700"
                  >
                    - Out
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-2 px-1 text-xs text-ink-soft">
        <div>
          Showing <span className="font-semibold text-ink">{(currentPage - 1) * pageSize + 1}</span> to{" "}
          <span className="font-semibold text-ink">
            {Math.min(currentPage * pageSize, filteredItems.length)}
          </span>{" "}
          of <span className="font-semibold text-ink">{filteredItems.length}</span> items
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(parseInt(e.target.value) || 15); setCurrentPage(1); }}
              className="rounded-lg border border-line bg-white px-2 py-1 text-xs text-ink outline-none"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-lg border border-line bg-white p-1.5 text-ink hover:bg-pale disabled:opacity-40 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="font-medium text-ink px-1">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="rounded-lg border border-line bg-white p-1.5 text-ink hover:bg-pale disabled:opacity-40 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
