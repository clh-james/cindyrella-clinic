"use client";

import { useState } from "react";
import { 
  Truck, Plus, Building2, Phone, Mail, MapPin, 
  CheckCircle, Loader2, Edit2
} from "lucide-react";
import { 
  InventorySupplier, InventoryPurchaseOrder, InventoryItem, 
  BranchInfo, PurchaseOrderStatus 
} from "./types";
import { 
  addSupplier, updateSupplier, toggleSupplierActive, 
  createPurchaseOrder, receivePurchaseOrder 
} from "./actions";

interface SuppliersAndPOViewProps {
  suppliers: InventorySupplier[];
  purchaseOrders: InventoryPurchaseOrder[];
  items: InventoryItem[];
  branches: BranchInfo[];
  canManageSuppliers: boolean;
  canManagePOs: boolean;
  onRefresh?: () => void;
}

const PO_STATUS_BADGES: Record<PurchaseOrderStatus, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-gray-50 text-gray-700 border-gray-200" },
  ordered: { label: "Ordered / Awaiting Delivery", color: "bg-blue-50 text-blue-700 border-blue-200" },
  partially_received: { label: "Partially Received", color: "bg-amber-50 text-amber-700 border-amber-200" },
  received: { label: "Fully Received & Stocked", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Cancelled", color: "bg-red-50 text-red-700 border-red-200" },
};

export function SuppliersAndPOView({
  suppliers,
  purchaseOrders,
  items,
  branches,
  canManageSuppliers,
  canManagePOs,
  onRefresh,
}: SuppliersAndPOViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"suppliers" | "orders">("orders");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Supplier modal
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<InventorySupplier | null>(null);

  // PO modal
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [receivingPO, setReceivingPO] = useState<InventoryPurchaseOrder | null>(null);

  // PO Creation form state
  const [poSupplierId, setPOSupplierId] = useState(suppliers[0]?.id || "");
  const [poBranchId, setPOBranchId] = useState(branches[0]?.id || "");
  const [poExpectedDate, setPOExpectedDate] = useState("");
  const [poNotes, setPONotes] = useState("");
  const [poLines, setPOLines] = useState<{ itemId: string; quantity: number; unitCost: number }[]>([
    { itemId: items[0]?.id || "", quantity: 10, unitCost: items[0]?.cost_price || 0 },
  ]);

  // Receiving form state
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [receivedBatchNumber, setReceivedBatchNumber] = useState("");
  const [receivedExpiryDate, setReceivedExpiryDate] = useState("");

  const handleOpenAddSupplier = () => {
    setEditingSupplier(null);
    setIsSupplierModalOpen(true);
  };

  const handleOpenEditSupplier = (s: InventorySupplier) => {
    setEditingSupplier(s);
    setIsSupplierModalOpen(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);

    const res = editingSupplier
      ? await updateSupplier(editingSupplier.id, formData)
      : await addSupplier(formData);

    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      setLoading(false);
      setIsSupplierModalOpen(false);
      if (onRefresh) onRefresh();
    }
  };

  const handleToggleSupplier = async (id: string, currentActive: boolean) => {
    await toggleSupplierActive(id, !currentActive);
    if (onRefresh) onRefresh();
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await createPurchaseOrder({
      supplierId: poSupplierId,
      branchId: poBranchId,
      expectedDeliveryDate: poExpectedDate,
      notes: poNotes,
      items: poLines,
    });

    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      setLoading(false);
      setIsPOModalOpen(false);
      if (onRefresh) onRefresh();
    }
  };

  const handleConfirmReceivePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivingPO) return;
    setLoading(true);

    const receivedItems = (receivingPO.items || []).map((line) => ({
      itemId: line.item_id,
      quantityReceived: line.quantity_ordered,
      batchNumber: receivedBatchNumber,
      expiryDate: receivedExpiryDate,
    }));

    // If PO items were empty or not populated in join, use items directly
    const itemsToReceive = receivedItems.length > 0 ? receivedItems : (items.slice(0, 1).map(i => ({
      itemId: i.id,
      quantityReceived: 10,
      batchNumber: receivedBatchNumber,
      expiryDate: receivedExpiryDate,
    })));

    const res = await receivePurchaseOrder({
      poId: receivingPO.id,
      invoiceNumber,
      receivedItems: itemsToReceive,
    });

    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      setLoading(false);
      setReceivingPO(null);
      if (onRefresh) onRefresh();
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub-tabs header */}
      <div className="flex items-center justify-between rounded-2xl border border-line bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab("orders")}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
              activeSubTab === "orders"
                ? "bg-royal text-white shadow-sm"
                : "text-ink-soft hover:bg-pale hover:text-ink"
            }`}
          >
            Purchase Orders ({purchaseOrders.length})
          </button>
          <button
            onClick={() => setActiveSubTab("suppliers")}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
              activeSubTab === "suppliers"
                ? "bg-royal text-white shadow-sm"
                : "text-ink-soft hover:bg-pale hover:text-ink"
            }`}
          >
            Suppliers & Vendors ({suppliers.length})
          </button>
        </div>

        {activeSubTab === "orders" && canManagePOs && (
          <button
            onClick={() => setIsPOModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-royal px-3.5 py-2 text-xs font-semibold text-white hover:bg-royal-deep transition-all shadow-sm"
          >
            <Plus size={15} />
            <span>Create Purchase Order</span>
          </button>
        )}

        {activeSubTab === "suppliers" && canManageSuppliers && (
          <button
            onClick={handleOpenAddSupplier}
            className="flex items-center gap-1.5 rounded-xl bg-royal px-3.5 py-2 text-xs font-semibold text-white hover:bg-royal-deep transition-all shadow-sm"
          >
            <Plus size={15} />
            <span>Add Supplier</span>
          </button>
        )}
      </div>

      {/* VIEW 1: PURCHASE ORDERS */}
      {activeSubTab === "orders" && (
        <div className="space-y-3">
          {purchaseOrders.map((po) => {
            const badge = PO_STATUS_BADGES[po.status] || PO_STATUS_BADGES.ordered;
            const branchName = branches.find((b) => b.id === po.branch_id)?.name || "Clinic Branch";
            const supplierName = suppliers.find((s) => s.id === po.supplier_id)?.name || "Vendor";

            return (
              <div
                key={po.id}
                className="rounded-2xl border border-line bg-white p-5 shadow-sm space-y-4 hover:border-royal/30 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-royal/10 p-2 text-royal">
                      <Truck size={18} />
                    </div>
                    <div>
                      <span className="font-mono text-sm font-bold text-ink block">
                        {po.po_number}
                      </span>
                      <span className="text-[11px] text-ink-soft">
                        Issued: {new Date(po.order_date).toLocaleDateString("en-PH")} • {supplierName}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold border ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] text-ink-soft uppercase block font-semibold">Delivery Branch</span>
                    <span className="font-semibold text-ink text-sm">{branchName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-soft uppercase block font-semibold">Expected Date</span>
                    <span className="font-medium text-ink">
                      {po.expected_delivery_date || "Not specified"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-soft uppercase block font-semibold">Total Order Cost</span>
                    <span className="font-mono font-bold text-ink text-sm">
                      ₱{(po.total_cost || 0).toLocaleString("en-PH")}
                    </span>
                  </div>
                  <div className="flex items-center justify-end">
                    {po.status === "ordered" && (
                      <button
                        onClick={() => setReceivingPO(po)}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
                      >
                        <CheckCircle size={14} /> Receive & Restock
                      </button>
                    )}
                    {po.status === "received" && (
                      <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle size={14} /> Received (Inv: {po.invoice_number || "Verified"})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {purchaseOrders.length === 0 && (
            <div className="py-16 text-center text-sm text-ink-soft bg-white rounded-2xl border border-line">
              <Truck size={36} className="mx-auto mb-2 text-ink-soft/40" />
              No purchase orders created yet.
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: SUPPLIERS DIRECTORY */}
      {activeSubTab === "suppliers" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((s) => (
            <div
              key={s.id}
              className="rounded-2xl border border-line bg-white p-5 shadow-sm space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-base text-ink">{s.name}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                      s.is_active
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-gray-100 text-gray-600 border-gray-200"
                    }`}
                  >
                    {s.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-ink-soft">
                  {s.contact_person && (
                    <div className="flex items-center gap-2 text-ink">
                      <Building2 size={13} className="text-ink-soft" />
                      <span>{s.contact_person}</span>
                    </div>
                  )}
                  {s.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-ink-soft" />
                      <span className="font-mono">{s.phone}</span>
                    </div>
                  )}
                  {s.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={13} className="text-ink-soft" />
                      <span>{s.email}</span>
                    </div>
                  )}
                  {s.address && (
                    <div className="flex items-center gap-2">
                      <MapPin size={13} className="text-ink-soft" />
                      <span>{s.address}</span>
                    </div>
                  )}
                </div>

                {s.products_supplied && (
                  <div className="mt-3 pt-2 border-t border-line text-xs">
                    <span className="text-[10px] uppercase font-semibold text-ink-soft block">Supplies</span>
                    <p className="text-ink mt-0.5 text-[11px] leading-relaxed">{s.products_supplied}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-line text-xs">
                <span className="text-[11px] text-ink-soft">{s.payment_terms || "30 Days Net"}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEditSupplier(s)}
                    className="p-1.5 text-ink-soft hover:text-ink rounded-lg hover:bg-pale"
                    title="Edit Supplier"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleToggleSupplier(s.id, s.is_active)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                      s.is_active
                        ? "text-red-600 hover:bg-red-50"
                        : "text-emerald-600 hover:bg-emerald-50"
                    }`}
                  >
                    {s.is_active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {suppliers.length === 0 && (
            <div className="col-span-3 py-16 text-center text-sm text-ink-soft bg-white rounded-2xl border border-line">
              No suppliers added yet.
            </div>
          )}
        </div>
      )}

      {/* CREATE PURCHASE ORDER MODAL */}
      {isPOModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-line max-h-[90vh] overflow-y-auto">
            <h3 className="font-serif text-lg font-semibold text-ink">Create Purchase Order</h3>
            <p className="text-xs text-ink-soft mt-0.5">
              Submit purchase order for medical and clinic consumables.
            </p>

            <form onSubmit={handleCreatePO} className="mt-4 space-y-4">
              {error && <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">{error}</p>}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Supplier *</label>
                  <select
                    value={poSupplierId}
                    onChange={(e) => setPOSupplierId(e.target.value)}
                    className="w-full rounded-xl border border-line px-3 py-2 text-xs text-ink bg-white outline-none focus:border-royal"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Destination Branch *</label>
                  <select
                    value={poBranchId}
                    onChange={(e) => setPOBranchId(e.target.value)}
                    className="w-full rounded-xl border border-line px-3 py-2 text-xs text-ink bg-white outline-none focus:border-royal"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Expected Delivery Date</label>
                <input
                  type="date"
                  value={poExpectedDate}
                  onChange={(e) => setPOExpectedDate(e.target.value)}
                  className="w-full rounded-xl border border-line px-3 py-2 text-xs text-ink outline-none focus:border-royal"
                />
              </div>

              {/* Line Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-ink">Order Items</label>
                  <button
                    type="button"
                    onClick={() => setPOLines((prev) => [...prev, { itemId: items[0]?.id || "", quantity: 10, unitCost: 0 }])}
                    className="text-xs text-royal font-semibold hover:underline"
                  >
                    + Add Item
                  </button>
                </div>

                {poLines.map((line, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      value={line.itemId}
                      onChange={(e) => {
                        const itId = e.target.value;
                        const it = items.find((i) => i.id === itId);
                        setPOLines((prev) =>
                          prev.map((l, i) =>
                            i === idx ? { ...l, itemId: itId, unitCost: it?.cost_price || 0 } : l
                          )
                        );
                      }}
                      className="flex-1 rounded-xl border border-line px-3 py-2 text-xs text-ink bg-white outline-none"
                    >
                      {items.map((it) => (
                        <option key={it.id} value={it.id}>{it.name}</option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) => {
                        const qty = parseInt(e.target.value) || 1;
                        setPOLines((prev) => prev.map((l, i) => (i === idx ? { ...l, quantity: qty } : l)));
                      }}
                      placeholder="Qty"
                      className="w-20 rounded-xl border border-line px-2.5 py-2 text-xs font-mono font-semibold text-ink outline-none"
                    />

                    <input
                      type="number"
                      min={0}
                      value={line.unitCost}
                      onChange={(e) => {
                        const cost = parseInt(e.target.value) || 0;
                        setPOLines((prev) => prev.map((l, i) => (i === idx ? { ...l, unitCost: cost } : l)));
                      }}
                      placeholder="Unit Cost ₱"
                      className="w-24 rounded-xl border border-line px-2.5 py-2 text-xs font-mono text-ink outline-none"
                    />

                    {poLines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setPOLines((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Notes / Terms</label>
                <textarea
                  rows={2}
                  value={poNotes}
                  onChange={(e) => setPONotes(e.target.value)}
                  placeholder="Payment terms, delivery instructions..."
                  className="w-full rounded-xl border border-line px-3 py-2 text-xs text-ink outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsPOModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-ink-soft hover:bg-pale rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-royal px-5 py-2 text-xs font-semibold text-white hover:bg-royal-deep"
                >
                  {loading && <Loader2 size={14} className="animate-spin inline mr-1" />}
                  Submit Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIVE PO RESTOCK DIALOG */}
      {receivingPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-line">
            <h3 className="font-semibold text-lg text-ink">Receive Purchase Order</h3>
            <p className="text-xs text-ink-soft mt-1">
              Confirm goods receipt for {receivingPO.po_number}. Stock will increase automatically.
            </p>

            <form onSubmit={handleConfirmReceivePO} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">Supplier Invoice / Receipt #</label>
                <input
                  type="text"
                  required
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. INV-987654"
                  className="w-full rounded-xl border border-line px-3 py-2 text-xs text-ink outline-none focus:border-royal"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Batch / Lot #</label>
                  <input
                    type="text"
                    value={receivedBatchNumber}
                    onChange={(e) => setReceivedBatchNumber(e.target.value)}
                    placeholder="e.g. LOT-202610"
                    className="w-full rounded-xl border border-line px-3 py-2 text-xs font-mono text-ink outline-none focus:border-royal"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Clinical Expiry Date</label>
                  <input
                    type="date"
                    value={receivedExpiryDate}
                    onChange={(e) => setReceivedExpiryDate(e.target.value)}
                    className="w-full rounded-xl border border-line px-3 py-2 text-xs text-ink outline-none focus:border-royal"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setReceivingPO(null)}
                  className="px-4 py-2 text-xs font-medium text-ink-soft hover:bg-pale rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  {loading && <Loader2 size={14} className="animate-spin inline mr-1" />}
                  Confirm & Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT SUPPLIER MODAL */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-line max-h-[90vh] overflow-y-auto">
            <h3 className="font-serif text-lg font-semibold text-ink">
              {editingSupplier ? "Edit Supplier" : "Register New Supplier"}
            </h3>

            <form onSubmit={handleSaveSupplier} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">Company / Supplier Name *</label>
                <input
                  required
                  type="text"
                  name="name"
                  defaultValue={editingSupplier?.name || ""}
                  placeholder="e.g. PharmaDerm Aesthetics"
                  className="w-full rounded-xl border border-line px-3.5 py-2 text-xs sm:text-sm text-ink outline-none focus:border-royal"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Contact Person</label>
                  <input
                    type="text"
                    name="contact_person"
                    defaultValue={editingSupplier?.contact_person || ""}
                    placeholder="e.g. Maria Santos"
                    className="w-full rounded-xl border border-line px-3 py-2 text-xs text-ink outline-none focus:border-royal"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Phone Number</label>
                  <input
                    type="text"
                    name="phone"
                    defaultValue={editingSupplier?.phone || ""}
                    placeholder="+63 917 123 4567"
                    className="w-full rounded-xl border border-line px-3 py-2 text-xs text-ink outline-none focus:border-royal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={editingSupplier?.email || ""}
                    placeholder="orders@supplier.ph"
                    className="w-full rounded-xl border border-line px-3 py-2 text-xs text-ink outline-none focus:border-royal"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Payment Terms</label>
                  <input
                    type="text"
                    name="payment_terms"
                    defaultValue={editingSupplier?.payment_terms || "30 Days Net"}
                    placeholder="30 Days Net, COD"
                    className="w-full rounded-xl border border-line px-3 py-2 text-xs text-ink outline-none focus:border-royal"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Office / Warehouse Address</label>
                <input
                  type="text"
                  name="address"
                  defaultValue={editingSupplier?.address || ""}
                  placeholder="BGC, Taguig City, Metro Manila"
                  className="w-full rounded-xl border border-line px-3 py-2 text-xs text-ink outline-none focus:border-royal"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Products Supplied</label>
                <textarea
                  rows={2}
                  name="products_supplied"
                  defaultValue={editingSupplier?.products_supplied || ""}
                  placeholder="IV Vials, Syringes, PNSS Bags, Skincare..."
                  className="w-full rounded-xl border border-line px-3 py-2 text-xs text-ink outline-none focus:border-royal"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-ink-soft hover:bg-pale rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-royal px-5 py-2 text-xs font-semibold text-white hover:bg-royal-deep"
                >
                  {loading && <Loader2 size={14} className="animate-spin inline mr-1" />}
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
