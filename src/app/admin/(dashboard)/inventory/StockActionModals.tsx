"use client";

import { useState } from "react";
import { X, Loader2, ArrowUpRight, ArrowDownRight, RefreshCw, AlertTriangle, Building2 } from "lucide-react";
import { InventoryItem, BranchInfo } from "./types";
import { stockInItem, stockOutItem, adjustStockItem, logWastageItem, requestTransfer } from "./actions";

interface ModalBaseProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  branches: BranchInfo[];
  defaultBranchId?: string;
  onSuccess?: () => void;
}

// 1. Stock In Modal
export function StockInModal({ isOpen, onClose, item, branches, defaultBranchId, onSuccess }: ModalBaseProps) {
  const [quantity, setQuantity] = useState(10);
  const [reason, setReason] = useState("Restock Delivery");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [branchId, setBranchId] = useState(defaultBranchId || branches[0]?.id || "");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await stockInItem({
      itemId: item.id,
      quantity,
      reason,
      batchNumber,
      expiryDate,
      branchId,
      notes,
    });

    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      setLoading(false);
      onClose();
      if (onSuccess) onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-line">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2 text-emerald-700">
            <ArrowUpRight size={20} />
            <h3 className="font-semibold text-lg text-ink">Stock In — {item.name}</h3>
          </div>
          <button onClick={onClose} className="p-1 text-ink-soft hover:text-ink"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">{error}</p>}
          
          <div>
            <label className="block text-xs font-medium text-ink mb-1">
              Quantity to Receive ({item.unit}) *
            </label>
            <input
              required
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm font-mono font-semibold text-ink outline-none focus:border-royal"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink mb-1">Batch / Lot #</label>
              <input
                type="text"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="e.g. BATCH-01"
                className="w-full rounded-xl border border-line px-3 py-2 text-xs font-mono text-ink outline-none focus:border-royal"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink mb-1">Expiry Date</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full rounded-xl border border-line px-3 py-2 text-xs text-ink outline-none focus:border-royal"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-1">Reason *</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-line px-3 py-2 text-xs text-ink bg-white outline-none focus:border-royal"
            >
              <option value="Restock Delivery">Restock Delivery / Purchase Order</option>
              <option value="Customer Return">Customer Return (Inspected & Usable)</option>
              <option value="Audit Surplus">Audit Surplus / Physical Recount</option>
              <option value="Initial Stock">Initial Stock Intake</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-1">Destination Branch</label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full rounded-xl border border-line px-3 py-2 text-xs text-ink bg-white outline-none focus:border-royal"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-1">Notes / PO Reference</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Invoice #9842"
              className="w-full rounded-xl border border-line px-3 py-2 text-xs text-ink outline-none focus:border-royal"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-line">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-medium text-ink-soft hover:bg-pale rounded-xl">Cancel</button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Confirm Stock In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 2. Stock Out Modal
export function StockOutModal({ isOpen, onClose, item, defaultBranchId, onSuccess }: ModalBaseProps) {
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("Treatment Usage");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity > item.current_stock) {
      setError(`Cannot issue ${quantity} ${item.unit}. Available stock is only ${item.current_stock} ${item.unit}.`);
      return;
    }

    setLoading(true);
    setError(null);

    const res = await stockOutItem({
      itemId: item.id,
      quantity,
      reason,
      notes,
      branchId: defaultBranchId,
    });

    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      setLoading(false);
      onClose();
      if (onSuccess) onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-line">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2 text-blue-700">
            <ArrowDownRight size={20} />
            <h3 className="font-semibold text-lg text-ink">Stock Out — {item.name}</h3>
          </div>
          <button onClick={onClose} className="p-1 text-ink-soft hover:text-ink"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">{error}</p>}

          <div className="bg-pale/50 p-3 rounded-xl flex justify-between items-center text-xs">
            <span className="text-ink-soft">Current Available Stock:</span>
            <span className="font-bold font-mono text-ink text-sm">{item.current_stock} {item.unit}</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-1">
              Quantity to Issue ({item.unit}) *
            </label>
            <input
              required
              type="number"
              min={1}
              max={item.current_stock}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm font-mono font-semibold text-ink outline-none focus:border-royal"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-1">Reason *</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-line px-3 py-2 text-xs text-ink bg-white outline-none focus:border-royal"
            >
              <option value="Treatment Usage">Treatment & Clinical Procedure Usage</option>
              <option value="Staff Training / Demonstration">Staff Training / Demonstration</option>
              <option value="Sample / Tester">Sample / Tester Dispensation</option>
              <option value="Branch Operational Issue">Branch Operational Issue</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-1">Notes / Appointment Reference</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Appointment #CMG-2026001"
              className="w-full rounded-xl border border-line px-3 py-2 text-xs text-ink outline-none focus:border-royal"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-line">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-medium text-ink-soft hover:bg-pale rounded-xl">Cancel</button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Confirm Stock Out
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 3. Stock Adjustment Modal
export function AdjustStockModal({ isOpen, onClose, item, defaultBranchId, onSuccess }: ModalBaseProps) {
  const [newCount, setNewCount] = useState(item?.current_stock ?? 0);
  const [reason, setReason] = useState("Physical Inventory Audit");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const currentCount = item.current_stock;
  const delta = newCount - currentCount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await adjustStockItem({
      itemId: item.id,
      newCount,
      reason,
      notes,
      branchId: defaultBranchId,
    });

    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      setLoading(false);
      onClose();
      if (onSuccess) onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-line">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2 text-purple-700">
            <RefreshCw size={20} />
            <h3 className="font-semibold text-lg text-ink">Physical Count Adjustment</h3>
          </div>
          <button onClick={onClose} className="p-1 text-ink-soft hover:text-ink"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">{error}</p>}

          <div className="grid grid-cols-2 gap-3 text-xs bg-pale/50 p-3 rounded-xl">
            <div>
              <span className="text-ink-soft block">Recorded Stock:</span>
              <span className="font-bold font-mono text-ink text-sm">{currentCount} {item.unit}</span>
            </div>
            <div>
              <span className="text-ink-soft block">Stock Discrepancy:</span>
              <span className={`font-bold font-mono text-sm ${delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-600" : "text-ink"}`}>
                {delta > 0 ? `+${delta}` : delta} {item.unit}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-1">
              Actual Physical Count ({item.unit}) *
            </label>
            <input
              required
              type="number"
              min={0}
              value={newCount}
              onChange={(e) => setNewCount(parseInt(e.target.value) || 0)}
              className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm font-mono font-bold text-ink outline-none focus:border-royal"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-1">Audit Reason *</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-line px-3 py-2 text-xs text-ink bg-white outline-none focus:border-royal"
            >
              <option value="Physical Inventory Audit">End-of-Month Physical Count Audit</option>
              <option value="Count Discrepancy Correction">Count Discrepancy Correction</option>
              <option value="Damaged Stock Written Off">Damaged Stock Written Off</option>
              <option value="Data Entry Correction">Data Entry Correction</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-1">Notes / Auditor Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Verified by Clinic Supervisor"
              className="w-full rounded-xl border border-line px-3 py-2 text-xs text-ink outline-none focus:border-royal"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-line">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-medium text-ink-soft hover:bg-pale rounded-xl">Cancel</button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-5 py-2 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Save Adjustment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 4. Log Wastage Modal
export function LogWastageModal({ isOpen, onClose, item, defaultBranchId, onSuccess }: ModalBaseProps) {
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("Vial Dropped / Shattered");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity > item.current_stock) {
      setError(`Cannot log wastage exceeding available stock (${item.current_stock} ${item.unit}).`);
      return;
    }

    setLoading(true);
    setError(null);

    const res = await logWastageItem({
      itemId: item.id,
      quantity,
      reason,
      notes,
      branchId: defaultBranchId,
    });

    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      setLoading(false);
      onClose();
      if (onSuccess) onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-line">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle size={20} />
            <h3 className="font-semibold text-lg text-ink">Log Wastage / Spoilage</h3>
          </div>
          <button onClick={onClose} className="p-1 text-ink-soft hover:text-ink"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">{error}</p>}

          <p className="text-xs text-ink-soft">
            Document damaged, broken, contaminated, or spilled supplies for audit reconciliation.
          </p>

          <div>
            <label className="block text-xs font-medium text-ink mb-1">
              Quantity Wasted ({item.unit}) *
            </label>
            <input
              required
              type="number"
              min={1}
              max={item.current_stock}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm font-mono font-bold text-ink outline-none focus:border-royal"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-1">Wastage Reason *</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-line px-3 py-2 text-xs text-ink bg-white outline-none focus:border-royal"
            >
              <option value="Vial Dropped / Shattered">Vial / Bottle Dropped or Shattered</option>
              <option value="Contaminated Packaging">Contaminated / Broken Sterile Seal</option>
              <option value="Expired Product Disposal">Expired Product Disposal</option>
              <option value="Infusion Line Leak / Defective">Defective Infusion Set / Tubing Leak</option>
              <option value="Refrigeration / Temperature Breach">Cold Storage / Temperature Deviation</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-1">Incident Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Explain how the spillage occurred and staff involved..."
              className="w-full rounded-xl border border-line px-3 py-2 text-xs text-ink outline-none focus:border-royal"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-line">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-medium text-ink-soft hover:bg-pale rounded-xl">Cancel</button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-5 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Record Wastage
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 5. Transfer Modal
export function QuickTransferModal({ isOpen, onClose, item, branches, defaultBranchId, onSuccess }: ModalBaseProps) {
  const [sourceBranchId, setSourceBranchId] = useState(defaultBranchId || branches[0]?.id || "");
  const [destinationBranchId, setDestinationBranchId] = useState(
    branches.find((b) => b.id !== (defaultBranchId || branches[0]?.id))?.id || ""
  );
  const [quantity, setQuantity] = useState(5);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceBranchId === destinationBranchId) {
      setError("Source and destination branch must be different.");
      return;
    }
    if (quantity > item.current_stock) {
      setError(`Cannot transfer more than available stock (${item.current_stock} ${item.unit}).`);
      return;
    }

    setLoading(true);
    setError(null);

    const res = await requestTransfer({
      sourceBranchId,
      destinationBranchId,
      notes,
      items: [{ itemId: item.id, quantity }],
    });

    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      setLoading(false);
      onClose();
      if (onSuccess) onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-line">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2 text-cyan-700">
            <Building2 size={20} />
            <h3 className="font-semibold text-lg text-ink">Transfer Stock — {item.name}</h3>
          </div>
          <button onClick={onClose} className="p-1 text-ink-soft hover:text-ink"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">{error}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink mb-1">Source Branch *</label>
              <select
                value={sourceBranchId}
                onChange={(e) => setSourceBranchId(e.target.value)}
                className="w-full rounded-xl border border-line px-3 py-2 text-xs text-ink bg-white outline-none focus:border-royal"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink mb-1">Destination Branch *</label>
              <select
                value={destinationBranchId}
                onChange={(e) => setDestinationBranchId(e.target.value)}
                className="w-full rounded-xl border border-line px-3 py-2 text-xs text-ink bg-white outline-none focus:border-royal"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-1">
              Transfer Quantity ({item.unit}) *
            </label>
            <input
              required
              type="number"
              min={1}
              max={item.current_stock}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm font-mono font-bold text-ink outline-none focus:border-royal"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-1">Transfer Notes / Reason</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. High demand at destination branch"
              className="w-full rounded-xl border border-line px-3 py-2 text-xs text-ink outline-none focus:border-royal"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-line">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-medium text-ink-soft hover:bg-pale rounded-xl">Cancel</button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl bg-cyan-600 px-5 py-2 text-xs font-semibold text-white hover:bg-cyan-700 disabled:opacity-50"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Submit Transfer Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
