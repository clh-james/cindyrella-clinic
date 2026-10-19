"use client";

import { useState } from "react";
import { 
  Sparkles, Search, Plus, Trash2, Edit2, 
  Package, Check, AlertCircle, Loader2, ChevronRight, Filter 
} from "lucide-react";
import { InventoryItem } from "./types";
import { addOrUpdateTreatmentMaterial, deleteTreatmentMaterial } from "./actions";
import { toast } from "react-hot-toast";

interface TreatmentRecipe {
  id: string;
  name: string;
  slug: string;
  session_price: number;
  materials: {
    id: string;
    itemId: string;
    quantityRequired: number;
    item?: {
      id: string;
      name: string;
      unit: string;
      current_stock: number;
      category: string;
    };
  }[];
}

interface TreatmentRecipesViewProps {
  initialRecipes: TreatmentRecipe[];
  allItems: InventoryItem[];
  canEdit: boolean;
}

export function TreatmentRecipesView({
  initialRecipes,
  allItems,
  canEdit,
}: TreatmentRecipesViewProps) {
  const [recipes, setRecipes] = useState<TreatmentRecipe[]>(initialRecipes);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Selected treatment for adding/editing material
  const [activeTreatment, setActiveTreatment] = useState<TreatmentRecipe | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [quantityRequired, setQuantityRequired] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Filter recipes
  const filteredRecipes = recipes.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.slug.toLowerCase().includes(search.toLowerCase()) ||
      r.materials.some((m) => m.item?.name.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (categoryFilter === "drips") {
      return r.name.toLowerCase().includes("drip") || r.slug.includes("iv-");
    }
    if (categoryFilter === "facials") {
      return r.name.toLowerCase().includes("facial") || r.slug.includes("facial-");
    }
    if (categoryFilter === "waxing") {
      return r.name.toLowerCase().includes("wax") || r.slug.includes("wax-");
    }
    if (categoryFilter === "lashes") {
      return r.name.toLowerCase().includes("lash") || r.slug.includes("lash-");
    }
    if (categoryFilter === "threads") {
      return r.name.toLowerCase().includes("thread") || r.slug.includes("thread-");
    }
    if (categoryFilter === "unmapped") {
      return r.materials.length === 0;
    }

    return true;
  });

  const handleOpenAdd = (treatment: TreatmentRecipe) => {
    setActiveTreatment(treatment);
    setSelectedItemId(allItems[0]?.id || "");
    setQuantityRequired(1);
    setIsAddModalOpen(true);
  };

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTreatment || !selectedItemId || quantityRequired <= 0) return;

    setSubmitting(true);
    const res = await addOrUpdateTreatmentMaterial(
      activeTreatment.id,
      selectedItemId,
      quantityRequired
    );
    setSubmitting(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Treatment recipe updated!");
      const targetItem = allItems.find((i) => i.id === selectedItemId);

      setRecipes((prev) =>
        prev.map((r) => {
          if (r.id !== activeTreatment.id) return r;
          const existingIdx = r.materials.findIndex((m) => m.itemId === selectedItemId);
          let newMaterials = [...r.materials];
          if (existingIdx >= 0) {
            newMaterials[existingIdx] = {
              ...newMaterials[existingIdx],
              quantityRequired,
            };
          } else {
            newMaterials.push({
              id: `temp-${Date.now()}`,
              itemId: selectedItemId,
              quantityRequired,
              item: targetItem
                ? {
                    id: targetItem.id,
                    name: targetItem.name,
                    unit: targetItem.unit,
                    current_stock: targetItem.current_stock,
                    category: targetItem.category,
                  }
                : undefined,
            });
          }
          return { ...r, materials: newMaterials };
        })
      );
      setIsAddModalOpen(false);
    }
  };

  const handleDeleteMaterial = async (treatmentId: string, itemId: string) => {
    if (!confirm("Remove this consumable item from the treatment recipe?")) return;

    const res = await deleteTreatmentMaterial(treatmentId, itemId);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Item removed from recipe");
      setRecipes((prev) =>
        prev.map((r) => {
          if (r.id !== treatmentId) return r;
          return {
            ...r,
            materials: r.materials.filter((m) => m.itemId !== itemId),
          };
        })
      );
    }
  };

  const totalMapped = recipes.filter((r) => r.materials.length > 0).length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Explanation */}
      <div className="rounded-2xl border border-royal/20 bg-gradient-to-r from-royal/5 via-pale/50 to-emerald-50/50 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-royal" />
              <h2 className="font-serif text-lg font-semibold text-ink">
                Treatment Recipes & Consumables (BOM)
              </h2>
            </div>
            <p className="mt-1 text-xs text-ink-soft max-w-2xl leading-relaxed">
              Define the exact materials, vials, and medical supplies consumed per service.
              When an appointment is marked <strong className="text-emerald-700">Completed</strong>,
              these items are automatically deducted from the branch inventory and logged in the audit trail.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/80 backdrop-blur rounded-xl px-4 py-2.5 border border-line shadow-sm">
            <div>
              <span className="block text-[11px] text-ink-soft">Mapped Recipes</span>
              <span className="font-mono text-base font-bold text-ink">
                {totalMapped} / {recipes.length}
              </span>
            </div>
            <div className="h-8 w-px bg-line" />
            <div>
              <span className="block text-[11px] text-ink-soft">Auto-Deduction</span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                <Check size={14} /> Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            type="text"
            placeholder="Search treatments or consumable supplies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-line bg-white pl-9 pr-4 py-2 text-xs text-ink placeholder:text-ink-soft outline-none focus:border-royal"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {[
            { id: "all", label: "All Treatments" },
            { id: "drips", label: "IV Drips" },
            { id: "facials", label: "Facials" },
            { id: "waxing", label: "Waxing" },
            { id: "lashes", label: "Eyelashes" },
            { id: "threads", label: "Threads" },
            { id: "unmapped", label: "Needs Mapping" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`rounded-lg px-3 py-1.5 font-medium whitespace-nowrap transition-colors ${
                categoryFilter === cat.id
                  ? "bg-royal text-white shadow-sm"
                  : "bg-white border border-line text-ink hover:bg-pale"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Treatments List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRecipes.map((treatment) => {
          const hasMaterials = treatment.materials.length > 0;
          return (
            <div
              key={treatment.id}
              className={`flex flex-col justify-between rounded-2xl border p-4 shadow-sm bg-white transition-all ${
                hasMaterials ? "border-line" : "border-amber-200 bg-amber-50/20"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-semibold text-ink text-sm leading-tight">
                      {treatment.name}
                    </h3>
                    <span className="font-mono text-[11px] text-ink-soft">
                      ₱{(treatment.session_price || 0).toLocaleString("en-PH")} / session
                    </span>
                  </div>
                  {hasMaterials ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                      {treatment.materials.length} items
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-800">
                      Unmapped
                    </span>
                  )}
                </div>

                {/* Consumables List */}
                <div className="mt-3 space-y-1.5 border-t border-line/60 pt-3 text-xs">
                  {treatment.materials.map((m) => (
                    <div
                      key={m.id || m.itemId}
                      className="group flex items-center justify-between rounded-lg bg-pale/50 px-2.5 py-1.5"
                    >
                      <div className="flex items-center gap-1.5 overflow-hidden pr-2">
                        <Package size={13} className="text-royal flex-shrink-0" />
                        <span className="truncate text-ink font-medium">
                          {m.item?.name || "Consumable Item"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-mono font-bold text-ink">
                          {m.quantityRequired} {m.item?.unit || "pcs"}
                        </span>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMaterial(treatment.id, m.itemId)}
                            className="text-ink-soft opacity-0 group-hover:opacity-100 hover:text-red-600 transition-opacity p-0.5"
                            title="Remove item"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {!hasMaterials && (
                    <p className="text-[11px] text-ink-soft italic py-2 text-center">
                      No consumables linked yet.
                    </p>
                  )}
                </div>
              </div>

              {canEdit && (
                <div className="mt-4 pt-3 border-t border-line/60 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleOpenAdd(treatment)}
                    className="flex items-center gap-1 text-xs font-semibold text-royal hover:text-royal-dark transition-colors"
                  >
                    <Plus size={13} />
                    {hasMaterials ? "Add Consumable" : "Create Recipe"}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {filteredRecipes.length === 0 && (
          <div className="col-span-full py-12 text-center text-xs text-ink-soft border border-line rounded-2xl bg-white">
            No treatments found matching your search or filter.
          </div>
        )}
      </div>

      {/* Add / Edit Material Modal */}
      {isAddModalOpen && activeTreatment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-line">
            <h3 className="font-serif text-base font-semibold text-ink">
              Add Consumable to {activeTreatment.name}
            </h3>
            <p className="mt-1 text-xs text-ink-soft">
              This item will automatically deduct from inventory when {activeTreatment.name} is completed.
            </p>

            <form onSubmit={handleSaveMaterial} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">Pick Inventory Item *</label>
                <select
                  required
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink outline-none focus:border-royal"
                >
                  {allItems.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.current_stock} {i.unit} in stock)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Quantity Required *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={quantityRequired}
                  onChange={(e) => setQuantityRequired(parseInt(e.target.value) || 1)}
                  className="w-full rounded-xl border border-line px-3 py-2 text-xs font-mono font-semibold text-ink outline-none focus:border-royal"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-ink-soft hover:bg-pale rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 rounded-xl bg-royal px-5 py-2 text-xs font-semibold text-white hover:bg-royal-dark disabled:opacity-50"
                >
                  {submitting && <Loader2 size={13} className="animate-spin" />}
                  Save Consumable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
