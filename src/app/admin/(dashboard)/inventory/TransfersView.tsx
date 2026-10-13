"use client";

import { useState } from "react";
import { 
  ArrowRight, ArrowRightLeft, Plus, CheckCircle, 
  Clock, XCircle, Truck, PackageCheck, Loader2
} from "lucide-react";
import { InventoryTransfer, InventoryItem, BranchInfo, TransferStatus } from "./types";
import { requestTransfer, updateTransferStatus } from "./actions";

interface TransfersViewProps {
  transfers: InventoryTransfer[];
  items: InventoryItem[];
  branches: BranchInfo[];
  canApproveTransfers: boolean;
  onRefresh?: () => void;
}

const STATUS_BADGES: Record<
  TransferStatus,
  { label: string; color: string; icon: React.ComponentType<{ size?: number; className?: string }> }
> = {
  requested: { label: "Requested", color: "bg-blue-50 text-blue-700 border-blue-200", icon: Clock },
  pending_approval: { label: "Pending Approval", color: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
  approved: { label: "Approved", color: "bg-purple-50 text-purple-700 border-purple-200", icon: CheckCircle },
  dispatched: { label: "Dispatched / In Transit", color: "bg-cyan-50 text-cyan-700 border-cyan-200", icon: Truck },
  received: { label: "Received", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: PackageCheck },
  completed: { label: "Completed", color: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-50 text-red-700 border-red-200", icon: XCircle },
  cancelled: { label: "Cancelled", color: "bg-gray-50 text-gray-700 border-gray-200", icon: XCircle },
};

export function TransfersView({
  transfers,
  items,
  branches,
  canApproveTransfers,
  onRefresh,
}: TransfersViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Transfer Request Form State
  const [sourceBranchId, setSourceBranchId] = useState(branches[0]?.id || "");
  const [destinationBranchId, setDestinationBranchId] = useState(branches[1]?.id || "");
  const [notes, setNotes] = useState("");
  const [transferLines, setTransferLines] = useState<{ itemId: string; quantity: number }[]>([
    { itemId: items[0]?.id || "", quantity: 5 },
  ]);

  // Handle Receiving Dialog
  const [receivingTransfer, setReceivingTransfer] = useState<InventoryTransfer | null>(null);
  const [discrepancyNotes, setDiscrepancyNotes] = useState("");

  const handleAddLine = () => {
    setTransferLines((prev) => [...prev, { itemId: items[0]?.id || "", quantity: 1 }]);
  };

  const handleRemoveLine = (idx: number) => {
    setTransferLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceBranchId === destinationBranchId) {
      setError("Source and destination branch cannot be identical.");
      return;
    }
    setLoading(true);
    setError(null);

    const res = await requestTransfer({
      sourceBranchId,
      destinationBranchId,
      notes,
      items: transferLines,
    });

    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      setLoading(false);
      setIsModalOpen(false);
      if (onRefresh) onRefresh();
    }
  };

  const handleUpdateStatus = async (
    transferId: string,
    action: "approve" | "dispatch" | "receive" | "reject" | "cancel",
    discNotes?: string
  ) => {
    setLoading(true);
    await updateTransferStatus({
      transferId,
      action,
      discrepancyNotes: discNotes,
    });
    setLoading(false);
    setReceivingTransfer(null);
    if (onRefresh) onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm">
        <div>
          <h2 className="font-serif text-lg font-semibold text-ink">Inter-Branch Stock Transfers</h2>
          <p className="text-xs text-ink-soft">
            Manage replenishment and supplies logistics between Cindyrella clinic branches.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-royal px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-royal-deep transition-all shadow-sm"
        >
          <Plus size={16} />
          <span>New Transfer Request</span>
        </button>
      </div>

      {/* Transfers List */}
      <div className="space-y-3">
        {transfers.map((t) => {
          const badge = STATUS_BADGES[t.status] || STATUS_BADGES.requested;
          const BadgeIcon = badge.icon;
          const srcName = branches.find((b) => b.id === t.source_branch_id)?.name || "Branch A";
          const dstName = branches.find((b) => b.id === t.destination_branch_id)?.name || "Branch B";

          return (
            <div
              key={t.id}
              className="rounded-2xl border border-line bg-white p-5 shadow-sm space-y-4 hover:border-royal/30 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-royal/10 p-2 text-royal">
                    <ArrowRightLeft size={18} />
                  </div>
                  <div>
                    <span className="font-mono text-sm font-bold text-ink block">
                      {t.transfer_number}
                    </span>
                    <span className="text-[11px] text-ink-soft">
                      Requested on {new Date(t.created_at).toLocaleDateString("en-PH")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${badge.color}`}
                  >
                    <BadgeIcon size={13} />
                    {badge.label}
                  </span>
                </div>
              </div>

              {/* Transfer Route & Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-pale/30 border border-line">
                  <div className="text-left">
                    <span className="text-[10px] text-ink-soft uppercase block font-semibold">Origin</span>
                    <span className="font-semibold text-ink text-sm">{srcName}</span>
                  </div>
                  <ArrowRight size={16} className="text-ink-soft mx-auto" />
                  <div className="text-right">
                    <span className="text-[10px] text-ink-soft uppercase block font-semibold">Destination</span>
                    <span className="font-semibold text-ink text-sm">{dstName}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-pale/30 border border-line">
                  <span className="text-[10px] text-ink-soft uppercase block font-semibold">Notes / Reason</span>
                  <p className="text-ink mt-0.5">{t.notes || "Standard branch stock replenishment"}</p>
                  {t.discrepancy_notes && (
                    <p className="text-amber-700 text-[11px] mt-1 font-medium">
                      Discrepancy: {t.discrepancy_notes}
                    </p>
                  )}
                </div>

                {/* Workflow Actions */}
                <div className="flex items-center justify-end gap-2">
                  {t.status === "requested" && canApproveTransfers && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(t.id, "approve")}
                        disabled={loading}
                        className="rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-purple-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(t.id, "reject")}
                        disabled={loading}
                        className="rounded-xl border border-line px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {t.status === "approved" && (
                    <button
                      onClick={() => handleUpdateStatus(t.id, "dispatch")}
                      disabled={loading}
                      className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-700 flex items-center gap-1.5"
                    >
                      <Truck size={14} /> Dispatch Stock
                    </button>
                  )}

                  {t.status === "dispatched" && (
                    <button
                      onClick={() => setReceivingTransfer(t)}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 flex items-center gap-1.5"
                    >
                      <PackageCheck size={14} /> Confirm Receipt
                    </button>
                  )}

                  {t.status === "completed" && (
                    <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                      <CheckCircle size={14} /> Completed & Reconciled
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {transfers.length === 0 && (
          <div className="py-16 text-center text-sm text-ink-soft bg-white rounded-2xl border border-line">
            <ArrowRightLeft size={36} className="mx-auto mb-2 text-ink-soft/40" />
            No inter-branch transfers requested yet.
          </div>
        )}
      </div>

      {/* New Transfer Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-line">
            <h3 className="font-serif text-lg font-semibold text-ink">New Inter-Branch Transfer</h3>
            <p className="text-xs text-ink-soft mt-0.5">
              Request stock relocation from one clinic branch to another.
            </p>

            <form onSubmit={handleSubmitTransfer} className="mt-4 space-y-4">
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

              {/* Items Line Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-ink">Transfer Items</label>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-xs text-royal font-semibold hover:underline"
                  >
                    + Add Item
                  </button>
                </div>

                {transferLines.map((line, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      value={line.itemId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTransferLines((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, itemId: val } : l))
                        );
                      }}
                      className="flex-1 rounded-xl border border-line px-3 py-2 text-xs text-ink bg-white outline-none"
                    >
                      {items.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.name} ({it.current_stock} {it.unit} in stock)
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        setTransferLines((prev) =>
                          prev.map((l, i) => (i === idx ? { ...l, quantity: val } : l))
                        );
                      }}
                      className="w-24 rounded-xl border border-line px-3 py-2 text-xs font-mono font-semibold text-ink outline-none"
                    />

                    {transferLines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Transfer Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reason for stock movement..."
                  className="w-full rounded-xl border border-line px-3 py-2 text-xs text-ink outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Receipt & Discrepancy Dialog */}
      {receivingTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-line">
            <h3 className="font-semibold text-lg text-ink">Confirm Shipment Receipt</h3>
            <p className="text-xs text-ink-soft mt-1">
              Verify actual physical quantities received at destination branch for {receivingTransfer.transfer_number}.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Discrepancy Notes (if any goods are missing or damaged)
                </label>
                <textarea
                  rows={2}
                  value={discrepancyNotes}
                  onChange={(e) => setDiscrepancyNotes(e.target.value)}
                  placeholder="e.g. All 10 items received intact, or 1 bottle arrived broken..."
                  className="w-full rounded-xl border border-line px-3 py-2 text-xs text-ink outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-line">
                <button
                  onClick={() => setReceivingTransfer(null)}
                  className="px-4 py-2 text-xs font-medium text-ink-soft hover:bg-pale rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateStatus(receivingTransfer.id, "receive", discrepancyNotes)}
                  disabled={loading}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Confirm & Complete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
