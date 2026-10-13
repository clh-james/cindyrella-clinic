"use client";

import { useState } from "react";
import { 
  Boxes, LayoutDashboard, History, ArrowRightLeft, 
  Truck, Layers, AlertTriangle, FileText, Building2, Plus
} from "lucide-react";
import { 
  InventoryItem, InventoryCategory, InventorySupplier, 
  InventoryMovement, InventoryTransfer, InventoryPurchaseOrder, BranchInfo 
} from "./types";
import { InventoryTable } from "./InventoryTable";
import { InventoryDashboardView } from "./InventoryDashboardView";
import { StockMovementsView } from "./StockMovementsView";
import { TransfersView } from "./TransfersView";
import { SuppliersAndPOView } from "./SuppliersAndPOView";
import { CategoryManagementView } from "./CategoryManagementView";
import { AlertsView } from "./AlertsView";
import { InventoryReportsView } from "./InventoryReportsView";
import { InventoryItemModal } from "./InventoryItemModal";
import { ItemDetailsDrawer } from "./ItemDetailsDrawer";
import { 
  StockInModal, StockOutModal, AdjustStockModal, 
  LogWastageModal, QuickTransferModal 
} from "./StockActionModals";

interface InventoryClientProps {
  initialItems: InventoryItem[];
  categories: InventoryCategory[];
  suppliers: InventorySupplier[];
  movements: InventoryMovement[];
  transfers: InventoryTransfer[];
  purchaseOrders: InventoryPurchaseOrder[];
  branches: BranchInfo[];
  currentStaff: {
    id: string;
    fullName: string;
    role: string;
    branchId?: string | null;
  };
  permissions: {
    canCreate: boolean;
    canEdit: boolean;
    canAdjust: boolean;
    canTransfer: boolean;
    canApproveTransfer: boolean;
    canManageSuppliers: boolean;
    canManagePOs: boolean;
    canManageCategories: boolean;
    canManageFinancials: boolean;
    canViewAllBranches: boolean;
  };
}

export function InventoryClient({
  initialItems,
  categories,
  suppliers,
  movements,
  transfers,
  purchaseOrders,
  branches,
  currentStaff,
  permissions,
}: InventoryClientProps) {
  const [activeTab, setActiveTab] = useState<string>("items");
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    currentStaff.branchId || branches[0]?.id || ""
  );

  // Modals state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);

  const [selectedDetailsItem, setSelectedDetailsItem] = useState<InventoryItem | null>(null);
  const [stockInItem, setStockInItem] = useState<InventoryItem | null>(null);
  const [stockOutItem, setStockOutItem] = useState<InventoryItem | null>(null);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [transferItem, setTransferItem] = useState<InventoryItem | null>(null);
  const [wastageItem, setWastageItem] = useState<InventoryItem | null>(null);

  // Tab definitions
  const tabs = [
    { id: "items", label: "Catalog & Stock", icon: Boxes, count: initialItems.length },
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "movements", label: "Movements Ledger", icon: History, count: movements.length },
    { id: "transfers", label: "Transfers", icon: ArrowRightLeft, count: transfers.length },
    { id: "purchasing", label: "Purchasing & Vendors", icon: Truck },
    { id: "categories", label: "Categories", icon: Layers, count: categories.length },
    { id: "alerts", label: "Safety & Alerts", icon: AlertTriangle },
    { id: "reports", label: "Reports & Exports", icon: FileText },
  ];

  const handleOpenAdd = () => {
    setItemToEdit(null);
    setIsItemModalOpen(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setItemToEdit(item);
    setIsItemModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Branch Context */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-xl sm:text-2xl font-semibold text-ink">
              Clinic Inventory System
            </h1>
            <span className="rounded-full bg-royal/10 px-2.5 py-0.5 text-[11px] font-semibold text-royal">
              Enterprise
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-ink-soft">
            Manage aesthetic consumables, IV drip supplies, medical stock, and inter-branch transfers.
          </p>
        </div>

        {/* Branch Context Switcher (For Multi-branch authorized roles) */}
        <div className="flex items-center gap-3">
          {permissions.canViewAllBranches ? (
            <div className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 shadow-sm text-xs">
              <Building2 size={15} className="text-royal flex-shrink-0" />
              <span className="text-ink-soft hidden sm:inline">Active Branch:</span>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="font-semibold text-ink bg-transparent outline-none cursor-pointer"
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-xs">
              <Building2 size={14} className="text-ink-soft" />
              <span className="font-medium text-ink">
                {branches.find((b) => b.id === currentStaff.branchId)?.name || "Assigned Branch"}
              </span>
            </div>
          )}

          {permissions.canCreate && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 rounded-xl bg-royal px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-royal-deep transition-all shadow-sm shadow-royal/20"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Add Item</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-2xl border border-line bg-white p-1.5 shadow-sm scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-royal text-white shadow-sm"
                  : "text-ink-soft hover:bg-pale hover:text-ink"
              }`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-mono ${
                    isActive ? "bg-white/20 text-white" : "bg-pale text-ink-soft"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ACTIVE TAB CONTENT */}
      <div>
        {activeTab === "items" && (
          <InventoryTable
            items={initialItems}
            categories={categories}
            suppliers={suppliers}
            branches={branches}
            canManageFinancials={permissions.canManageFinancials}
            canAdjustStock={permissions.canAdjust}
            onAddItem={handleOpenAdd}
            onViewDetails={(item) => setSelectedDetailsItem(item)}
            onEditItem={(item) => handleOpenEdit(item)}
            onStockIn={(item) => setStockInItem(item)}
            onStockOut={(item) => setStockOutItem(item)}
            onAdjust={(item) => setAdjustItem(item)}
            onTransfer={(item) => setTransferItem(item)}
          />
        )}

        {activeTab === "dashboard" && (
          <InventoryDashboardView
            items={initialItems}
            categories={categories}
            movements={movements}
            transfers={transfers}
            branches={branches}
            canManageFinancials={permissions.canManageFinancials}
            canViewAllBranches={permissions.canViewAllBranches}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            onSelectItem={(item) => setSelectedDetailsItem(item)}
          />
        )}

        {activeTab === "movements" && (
          <StockMovementsView
            movements={movements}
            branches={branches}
          />
        )}

        {activeTab === "transfers" && (
          <TransfersView
            transfers={transfers}
            items={initialItems}
            branches={branches}
            canApproveTransfers={permissions.canApproveTransfer}
          />
        )}

        {activeTab === "purchasing" && (
          <SuppliersAndPOView
            suppliers={suppliers}
            purchaseOrders={purchaseOrders}
            items={initialItems}
            branches={branches}
            canManageSuppliers={permissions.canManageSuppliers}
            canManagePOs={permissions.canManagePOs}
          />
        )}

        {activeTab === "categories" && (
          <CategoryManagementView
            categories={categories}
            canManageCategories={permissions.canManageCategories}
          />
        )}

        {activeTab === "alerts" && (
          <AlertsView
            items={initialItems}
            branches={branches}
            canAdjustStock={permissions.canAdjust}
            onStockIn={(item) => setStockInItem(item)}
            onSelectItem={(item) => setSelectedDetailsItem(item)}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === "reports" && (
          <InventoryReportsView
            items={initialItems}
            movements={movements}
            transfers={transfers}
            purchaseOrders={purchaseOrders}
            branches={branches}
            canManageFinancials={permissions.canManageFinancials}
            canViewAllBranches={permissions.canViewAllBranches}
          />
        )}
      </div>

      {/* MODAL 1: ADD / EDIT ITEM */}
      <InventoryItemModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        itemToEdit={itemToEdit}
        categories={categories}
        suppliers={suppliers}
        branches={branches}
        defaultBranchId={selectedBranchId}
      />

      {/* MODAL 2: ITEM DETAILS DRAWER */}
      <ItemDetailsDrawer
        item={selectedDetailsItem}
        onClose={() => setSelectedDetailsItem(null)}
        onEdit={(item) => {
          setSelectedDetailsItem(null);
          handleOpenEdit(item);
        }}
        onStockIn={(item) => setStockInItem(item)}
        onStockOut={(item) => setStockOutItem(item)}
        onAdjust={(item) => setAdjustItem(item)}
        onTransfer={(item) => setTransferItem(item)}
        onWastage={(item) => setWastageItem(item)}
        branches={branches}
        canManageFinancials={permissions.canManageFinancials}
        canAdjustStock={permissions.canAdjust}
      />

      {/* MODAL 3: STOCK IN */}
      <StockInModal
        isOpen={!!stockInItem}
        onClose={() => setStockInItem(null)}
        item={stockInItem}
        branches={branches}
        defaultBranchId={selectedBranchId}
      />

      {/* MODAL 4: STOCK OUT */}
      <StockOutModal
        isOpen={!!stockOutItem}
        onClose={() => setStockOutItem(null)}
        item={stockOutItem}
        branches={branches}
        defaultBranchId={selectedBranchId}
      />

      {/* MODAL 5: ADJUST COUNT */}
      <AdjustStockModal
        isOpen={!!adjustItem}
        onClose={() => setAdjustItem(null)}
        item={adjustItem}
        branches={branches}
        defaultBranchId={selectedBranchId}
      />

      {/* MODAL 6: LOG WASTAGE */}
      <LogWastageModal
        isOpen={!!wastageItem}
        onClose={() => setWastageItem(null)}
        item={wastageItem}
        branches={branches}
        defaultBranchId={selectedBranchId}
      />

      {/* MODAL 7: QUICK TRANSFER */}
      <QuickTransferModal
        isOpen={!!transferItem}
        onClose={() => setTransferItem(null)}
        item={transferItem}
        branches={branches}
        defaultBranchId={selectedBranchId}
      />
    </div>
  );
}
