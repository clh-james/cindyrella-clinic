"use client";

import { useState, useTransition, useEffect } from "react";
import { 
  Package, CheckCircle2, Clock, Plus, AlertCircle, 
  Trash2, Loader2, X, Sparkles, ShieldCheck, ArrowDownRight 
} from "lucide-react";
import { getAppointmentUsedMaterials, recordAdditionalUsedItems, updateAppointmentStatus } from "@/app/admin/actions";
import { toast } from "react-hot-toast";

interface UsedItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  referenceNumber: string;
  treatmentName: string;
  clientName: string;
  status: string;
  allItems?: { id: string; name: string; unit: string; current_stock: number }[];
  onStatusChange?: (newStatus: string) => void;
}

export function UsedItemsModal({
  isOpen,
  onClose,
  appointmentId,
  referenceNumber,
  treatmentName,
  clientName,
  status,
  allItems = [],
  onStatusChange,
}: UsedItemsModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [isPending, startTransition] = useTransition();

  // Additional items to record
  const [showAddExtra, setShowAddExtra] = useState(false);
  const [selectedExtraItem, setSelectedExtraItem] = useState<string>("");
  const [extraQuantity, setExtraQuantity] = useState<number>(1);
  const [extraNotes, setExtraNotes] = useState<string>("");
  const [savingExtra, setSavingExtra] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getAppointmentUsedMaterials(appointmentId);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, appointmentId]);

  if (!isOpen) return null;

  const isCompleted = status === "completed";
  const isDeducted = data?.isDeducted || false;

  const handleCompleteAndDeduct = () => {
    startTransition(async () => {
      const res = await updateAppointmentStatus(appointmentId, "completed");
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Treatment completed & items deducted from inventory!");
        if (onStatusChange) onStatusChange("completed");
        await loadData();
      }
    });
  };

  const handleSaveExtra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExtraItem || extraQuantity <= 0) {
      toast.error("Please pick an item and enter quantity.");
      return;
    }

    setSavingExtra(true);
    const res = await recordAdditionalUsedItems(
      appointmentId,
      [{ itemId: selectedExtraItem, quantity: extraQuantity }],
      extraNotes || `Extra supplies used for ${referenceNumber}`
    );

    setSavingExtra(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Deducted ${extraQuantity} extra unit(s) from inventory!`);
      setSelectedExtraItem("");
      setExtraQuantity(1);
      setExtraNotes("");
      setShowAddExtra(false);
      await loadData();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-line flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-royal/10 text-royal">
                <Package size={18} />
              </div>
              <h2 className="font-serif text-lg font-semibold text-ink">
                Used Items & Clinical Consumables
              </h2>
            </div>
            <p className="mt-1 text-xs text-ink-soft">
              Client: <span className="font-semibold text-ink">{clientName}</span> · Ref:{" "}
              <span className="font-mono text-royal font-semibold">{referenceNumber}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-soft hover:bg-pale hover:text-ink transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Status Indicator */}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-pale/60 p-3.5 border border-line text-xs">
          <div>
            <span className="text-ink-soft">Treatment: </span>
            <span className="font-semibold text-ink">{treatmentName}</span>
          </div>
          <div>
            {isDeducted ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-800">
                <CheckCircle2 size={13} className="text-emerald-600" />
                Deducted from Inventory
              </span>
            ) : isCompleted ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 font-semibold text-blue-800">
                <ShieldCheck size={13} className="text-blue-600" />
                Completed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">
                <Clock size={13} className="text-amber-600" />
                Deducts upon Completion
              </span>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-4 pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-ink-soft">
              <Loader2 size={24} className="animate-spin text-royal mb-2" />
              <p className="text-xs">Loading consumable materials...</p>
            </div>
          ) : (
            <>
              {/* Recipe Consumables Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                    Standard Recipe Consumables ({data?.recipe?.length || 0})
                  </h3>
                  <span className="text-[11px] text-ink-soft">
                    Auto-deducted from branch inventory
                  </span>
                </div>

                {(!data?.recipe || data.recipe.length === 0) ? (
                  <div className="rounded-xl border border-line border-dashed p-4 text-center text-xs text-ink-soft">
                    No predefined recipe consumables for this treatment.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-line">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-pale/70 text-ink font-medium border-b border-line">
                        <tr>
                          <th className="px-3 py-2">Item Name</th>
                          <th className="px-3 py-2 text-center">Qty Required</th>
                          <th className="px-3 py-2 text-center">Available Stock</th>
                          <th className="px-3 py-2 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {data.recipe.map((r: any) => {
                          const item = r.inventory_items;
                          const hasStock = (item?.current_stock ?? 0) >= r.quantity_required;
                          return (
                            <tr key={r.item_id} className="hover:bg-pale/30">
                              <td className="px-3 py-2 font-medium text-ink">
                                {item?.name}
                                <span className="block text-[10px] text-ink-soft">{item?.category}</span>
                              </td>
                              <td className="px-3 py-2 text-center font-mono font-semibold text-ink">
                                {r.quantity_required} {item?.unit}
                              </td>
                              <td className="px-3 py-2 text-center font-mono">
                                <span className={hasStock ? "text-emerald-700" : "text-red-600 font-semibold"}>
                                  {item?.current_stock ?? 0} {item?.unit}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right">
                                {isDeducted ? (
                                  <span className="text-[11px] font-semibold text-emerald-700">✓ Deducted</span>
                                ) : (
                                  <span className="text-[11px] text-ink-soft">Ready</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Actual Deduction Movements Ledger for this appointment */}
              {data?.actualMovements && data.actualMovements.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-soft mb-2">
                    Recorded Stock Out Movements ({data.actualMovements.length})
                  </h3>
                  <div className="space-y-1.5">
                    {data.actualMovements.map((m: any) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-lg border border-line bg-emerald-50/50 px-3 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <ArrowDownRight size={14} className="text-emerald-600 flex-shrink-0" />
                          <div>
                            <span className="font-semibold text-ink">{m.inventory_items?.name || "Item"}</span>
                            <span className="block text-[10px] text-ink-soft">
                              Ref: {m.reference_number} · {new Date(m.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-red-600">
                            -{m.quantity} {m.unit}
                          </span>
                          <span className="block text-[10px] text-ink-soft">
                            {m.previous_quantity} → {m.new_quantity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Extra Items Usage Form */}
              <div className="border-t border-line pt-3">
                {!showAddExtra ? (
                  <button
                    type="button"
                    onClick={() => setShowAddExtra(true)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line bg-pale/40 py-2.5 text-xs font-semibold text-royal hover:bg-pale transition-colors"
                  >
                    <Plus size={14} />
                    Record Extra Consumables Used (Syringes, Vials, Gauze)
                  </button>
                ) : (
                  <form onSubmit={handleSaveExtra} className="rounded-xl border border-line bg-pale/30 p-3 space-y-3 text-xs">
                    <div className="flex items-center justify-between font-semibold text-ink">
                      <span>Add Extra Consumable Used in this Session</span>
                      <button
                        type="button"
                        onClick={() => setShowAddExtra(false)}
                        className="text-ink-soft hover:text-ink"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-ink mb-1">Pick Inventory Item *</label>
                        <select
                          required
                          value={selectedExtraItem}
                          onChange={(e) => setSelectedExtraItem(e.target.value)}
                          className="w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs text-ink outline-none focus:border-royal"
                        >
                          <option value="">-- Choose Item --</option>
                          {allItems.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.name} ({i.current_stock} {i.unit} available)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-ink mb-1">Quantity Used *</label>
                        <input
                          type="number"
                          min={1}
                          required
                          value={extraQuantity}
                          onChange={(e) => setExtraQuantity(parseInt(e.target.value) || 1)}
                          className="w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-mono text-ink outline-none focus:border-royal"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-ink mb-1">Usage Notes (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Extra syringe needed for patient touch-up"
                        value={extraNotes}
                        onChange={(e) => setExtraNotes(e.target.value)}
                        className="w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs text-ink outline-none focus:border-royal"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddExtra(false)}
                        className="rounded-lg px-3 py-1.5 text-ink-soft hover:bg-pale"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingExtra}
                        className="flex items-center gap-1.5 rounded-lg bg-royal px-4 py-1.5 font-semibold text-white hover:bg-royal-dark disabled:opacity-50"
                      >
                        {savingExtra && <Loader2 size={13} className="animate-spin" />}
                        Deduct Extra Stock
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-medium text-ink-soft hover:bg-pale transition-colors"
          >
            Close
          </button>

          {!isCompleted && (
            <button
              type="button"
              disabled={isPending}
              onClick={handleCompleteAndDeduct}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              Complete Treatment & Deduct Used Items
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
