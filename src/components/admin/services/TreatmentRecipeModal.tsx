"use client";

import { useState, useEffect } from "react";
import { 
  X, Sparkles, Plus, Trash2, AlertTriangle, 
  CheckCircle2, Loader2, PackageCheck, ShieldCheck, 
  TrendingUp, DollarSign, Layers, Info 
} from "lucide-react";
import { 
  getTreatmentRecipeDetails, 
  saveTreatmentRecipeMaterial, 
  deleteTreatmentRecipeMaterial, 
  applyPresetRecipeToTreatment,
  TreatmentConsumableEntry,
  ConsumableItemOption 
} from "@/app/admin/(dashboard)/services/actions";
import type { Treatment } from "@/lib/supabase/types";
import toast from "react-hot-toast";

interface TreatmentRecipeModalProps {
  treatment: Treatment;
  onClose: () => void;
  onRecipeUpdated?: (treatmentId: string, count: number) => void;
}

export function TreatmentRecipeModal({
  treatment,
  onClose,
  onRecipeUpdated,
}: TreatmentRecipeModalProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [presetLoading, setPresetLoading] = useState<string | null>(null);
  const [materials, setMaterials] = useState<TreatmentConsumableEntry[]>([]);
  const [availableItems, setAvailableItems] = useState<ConsumableItemOption[]>([]);

  // Add item form state
  const [selectedItemId, setSelectedItemId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  const sessionPrice = Number(treatment.session_price) || 0;

  // Load recipe details
  const fetchRecipe = async () => {
    setLoading(true);
    const res = await getTreatmentRecipeDetails(treatment.id);
    setLoading(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      setMaterials(res.materials);
      setAvailableItems(res.availableItems);
      if (res.availableItems.length > 0 && !selectedItemId) {
        setSelectedItemId(res.availableItems[0].id);
      }
    }
  };

  useEffect(() => {
    fetchRecipe();
  }, [treatment.id]);

  // Financial calculations (COGS & Profit Margin)
  const totalCost = materials.reduce((sum, m) => {
    return sum + (m.item.cost_price * m.quantityRequired);
  }, 0);

  const grossProfit = Math.max(0, sessionPrice - totalCost);
  const marginPercent = sessionPrice > 0 ? Math.round((grossProfit / sessionPrice) * 100) : 0;

  // Add / Save Material
  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || quantity <= 0) return;

    setSubmitting(true);
    const res = await saveTreatmentRecipeMaterial({
      treatmentId: treatment.id,
      itemId: selectedItemId,
      quantityRequired: quantity,
      notes: notes.trim() || undefined,
    });
    setSubmitting(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Consumable added to service recipe!");
      setNotes("");
      setQuantity(1);
      await fetchRecipe();
      if (onRecipeUpdated) {
        onRecipeUpdated(treatment.id, materials.length + 1);
      }
    }
  };

  // Delete Material
  const handleDelete = async (itemId: string) => {
    if (!confirm("Remove this consumable from this service's auto-deduction recipe?")) return;

    const res = await deleteTreatmentRecipeMaterial(treatment.id, itemId);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Removed consumable from recipe");
      const updatedMaterials = materials.filter((m) => m.itemId !== itemId);
      setMaterials(updatedMaterials);
      if (onRecipeUpdated) {
        onRecipeUpdated(treatment.id, updatedMaterials.length);
      }
    }
  };

  // Quick Preset
  const handleApplyPreset = async (type: "drip" | "facial" | "laser") => {
    setPresetLoading(type);
    const res = await applyPresetRecipeToTreatment(treatment.id, type);
    setPresetLoading(null);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Preset applied! Added/updated standard supplies.`);
      await fetchRecipe();
      if (onRecipeUpdated) {
        onRecipeUpdated(treatment.id, (res.count || 0) + materials.length);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-line flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-pale/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shadow-xs">
              <PackageCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-ink text-base">Back-Bar Consumables Recipe</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-royal/10 text-royal border border-royal/20">
                  Auto-Deduction
                </span>
              </div>
              <p className="text-xs text-ink-soft">
                Service: <span className="font-semibold text-ink">{treatment.name}</span> (₱{sessionPrice.toLocaleString("en-PH")})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-soft hover:bg-line/40 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* Key Metrics & Pilferage Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-line bg-pale/40 p-3 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-ink-soft tracking-wider flex items-center gap-1">
                <DollarSign size={12} className="text-emerald-600" />
                Consumables Cost (COGS)
              </span>
              <span className="text-base font-bold font-mono text-ink mt-1">
                ₱{totalCost.toLocaleString("en-PH")}
              </span>
              <span className="text-[10px] text-ink-soft mt-0.5">
                Total supplies cost per session
              </span>
            </div>

            <div className="rounded-xl border border-line bg-pale/40 p-3 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-ink-soft tracking-wider flex items-center gap-1">
                <TrendingUp size={12} className="text-royal" />
                Gross Margin
              </span>
              <span className="text-base font-bold font-mono text-royal mt-1">
                {marginPercent}% (₱{grossProfit.toLocaleString("en-PH")})
              </span>
              <span className="text-[10px] text-ink-soft mt-0.5">
                Revenue after back-bar supplies
              </span>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider flex items-center gap-1">
                <ShieldCheck size={12} className="text-emerald-700" />
                Pilferage Guard
              </span>
              <span className="text-xs font-semibold text-emerald-800 mt-1">
                {materials.length > 0 ? "Active & Protected" : "Needs Recipe"}
              </span>
              <span className="text-[10px] text-emerald-700 mt-0.5">
                Auto-deducts on appt or package use
              </span>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="rounded-xl border border-line/80 bg-white p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink text-xs flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-500" />
                1-Click Preset Kits
              </span>
              <span className="text-[10px] text-ink-soft">Instantly link standard clinic consumables</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={presetLoading !== null}
                onClick={() => handleApplyPreset("drip")}
                className="px-3 py-1.5 rounded-lg border border-line bg-pale hover:bg-pale/80 text-[11px] font-semibold text-ink flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {presetLoading === "drip" && <Loader2 size={12} className="animate-spin" />}
                ✨ IV Gluta Drip Pack (5 items)
              </button>
              <button
                type="button"
                disabled={presetLoading !== null}
                onClick={() => handleApplyPreset("facial")}
                className="px-3 py-1.5 rounded-lg border border-line bg-pale hover:bg-pale/80 text-[11px] font-semibold text-ink flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {presetLoading === "facial" && <Loader2 size={12} className="animate-spin" />}
                ✨ Facial Basic Kit (3 items)
              </button>
              <button
                type="button"
                disabled={presetLoading !== null}
                onClick={() => handleApplyPreset("laser")}
                className="px-3 py-1.5 rounded-lg border border-line bg-pale hover:bg-pale/80 text-[11px] font-semibold text-ink flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {presetLoading === "laser" && <Loader2 size={12} className="animate-spin" />}
                ✨ Diode Laser Kit (2 items)
              </button>
            </div>
          </div>

          {/* Linked Consumables List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-ink uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Layers size={13} className="text-royal" />
                Required Supplies ({materials.length})
              </h4>
              <span className="text-[10px] text-ink-soft font-mono">Deducted per 1 session</span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-ink-soft flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Loading consumables recipe...
              </div>
            ) : materials.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-dashed border-line bg-pale/30 space-y-1">
                <p className="font-semibold text-ink">No back-bar consumables linked yet.</p>
                <p className="text-[11px] text-ink-soft">
                  Add supplies below or click one of the 1-Click Preset Kits above to automate stock deductions.
                </p>
              </div>
            ) : (
              <div className="border border-line rounded-xl overflow-hidden divide-y divide-line bg-white shadow-2xs">
                {materials.map((mat) => {
                  const isLow = mat.item.current_stock <= 10;
                  const itemCost = mat.item.cost_price * mat.quantityRequired;

                  return (
                    <div key={mat.id} className="p-3 flex items-center justify-between gap-3 hover:bg-pale/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink text-xs truncate">
                            {mat.item.name}
                          </span>
                          {mat.item.sku && (
                            <span className="font-mono text-[10px] text-ink-soft bg-pale px-1.5 py-0.2 rounded border border-line">
                              {mat.item.sku}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-ink-soft">
                          <span className="font-mono font-bold text-royal">
                            Quantity: {mat.quantityRequired} {mat.item.unit}
                          </span>
                          <span>•</span>
                          <span className={isLow ? "text-amber-600 font-semibold" : "text-emerald-700 font-medium"}>
                            Stock: {mat.item.current_stock} {mat.item.unit}
                          </span>
                          <span>•</span>
                          <span className="font-mono text-ink">
                            Cost: ₱{itemCost.toLocaleString("en-PH")}
                          </span>
                          {mat.notes && (
                            <>
                              <span>•</span>
                              <span className="italic text-ink-soft truncate max-w-[180px]">
                                &ldquo;{mat.notes}&rdquo;
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDelete(mat.itemId)}
                        className="p-1.5 text-ink-soft hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                        title="Remove consumable"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add Consumable Form */}
          <form onSubmit={handleAddMaterial} className="p-4 rounded-xl border border-line bg-pale/30 space-y-3">
            <h5 className="font-bold text-ink uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <Plus size={12} className="text-royal" />
              Add Consumable to Recipe
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-6">
                <label className="block text-[10px] font-semibold text-ink uppercase tracking-wider mb-1">
                  Pick Inventory Item *
                </label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  required
                  className="w-full bg-white border border-line rounded-lg px-2.5 py-1.5 text-xs text-ink focus:border-royal focus:outline-none"
                >
                  {availableItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.current_stock} {item.unit} in stock) — ₱{item.cost_price}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-semibold text-ink uppercase tracking-wider mb-1">
                  Qty Required *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full bg-white border border-line rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-ink focus:border-royal focus:outline-none"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-[10px] font-semibold text-ink uppercase tracking-wider mb-1">
                  Clinical Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1 vial solution"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white border border-line rounded-lg px-2.5 py-1.5 text-xs text-ink focus:border-royal focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={submitting || !selectedItemId}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-royal text-white font-semibold text-xs shadow-xs hover:bg-royal/90 disabled:opacity-50 transition-all"
              >
                {submitting && <Loader2 size={13} className="animate-spin" />}
                Add to Recipe
              </button>
            </div>
          </form>

          {/* Educational Note */}
          <div className="rounded-xl border border-line bg-pale/50 p-3 flex items-start gap-2 text-ink-soft">
            <Info size={14} className="mt-0.5 text-royal shrink-0" />
            <p className="text-[11px] leading-relaxed">
              <span className="font-semibold text-ink">Bakit mahalaga ang Auto-Deduction:</span> Tuwing minamarkahan ang appointment bilang <span className="font-mono text-royal">Completed</span> o nagre-redeem ng session sa package, awtomatikong mababawas sa stock ang nakalistang gamot at supplies (vials, needles, cleanser). Maiiwasan nito ang hindi naitatalang kagamitan o kupit sa clinic.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-line bg-pale/30 flex justify-between items-center">
          <span className="text-[11px] text-ink-soft">
            {materials.length} supplies linked to this service
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-ink text-white font-semibold text-xs hover:bg-ink/90 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

