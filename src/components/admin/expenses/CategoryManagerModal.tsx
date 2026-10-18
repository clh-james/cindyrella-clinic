"use client";

import { useState } from "react";
import { X, Plus, Check } from "lucide-react";
import { ExpenseCategory } from "@/app/admin/(dashboard)/expenses/types";
import { createExpenseCategory } from "@/app/admin/(dashboard)/expenses/actions";
import toast from "react-hot-toast";

interface CategoryManagerModalProps {
  categories: ExpenseCategory[];
  onClose: () => void;
  onUpdated: () => void;
}

const PRESET_COLORS = [
  "#4F46E5", // Indigo
  "#0284C7", // Sky blue
  "#059669", // Emerald
  "#D97706", // Amber
  "#DC2626", // Red
  "#EC4899", // Pink
  "#8B5CF6", // Purple
  "#64748B", // Slate
];

export function CategoryManagerModal({
  categories,
  onClose,
  onUpdated,
}: CategoryManagerModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await createExpenseCategory(name, description, color);
      if (res.success) {
        toast.success(`Category "${name}" added!`);
        setName("");
        setDescription("");
        onUpdated();
      } else {
        toast.error(res.error || "Failed to create category");
      }
    } catch {
      toast.error("Failed to create category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <h2 className="text-lg font-bold font-serif text-ink">Expense Categories</h2>
            <p className="text-xs text-ink-soft">
              Classify clinical supplies, petty cash, rent, and operating overheads
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-line p-2 text-ink-soft hover:bg-pale transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Existing Categories List */}
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft block mb-1">
            Active Clinic Categories ({categories.length})
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {categories.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 rounded-xl border border-line bg-pale/30 p-2.5 text-xs"
              >
                <div
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: c.color }}
                />
                <span className="font-semibold text-ink truncate">{c.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Add Category Form */}
        <form onSubmit={handleSubmit} className="rounded-2xl border border-line bg-pale/20 p-4 space-y-4 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-ink">
            <Plus size={15} className="text-royal" />
            <span>Add New Expense Category</span>
          </div>

          <div>
            <label className="block font-semibold text-ink mb-1">Category Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Laundry & Towel Sanitation"
              required
              className="w-full rounded-xl border border-line bg-white p-2.5 text-xs text-ink focus:border-royal focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-semibold text-ink mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Monthly dry-cleaning of spa sheets & robes"
              className="w-full rounded-xl border border-line bg-white p-2.5 text-xs text-ink focus:border-royal focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-semibold text-ink mb-1.5">Color Badge</label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="h-6 w-6 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check size={12} className="text-white" />}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-royal py-2 font-bold text-white hover:bg-royal/90 shadow-sm disabled:opacity-50 transition-colors"
          >
            {loading ? "Adding Category..." : "Save Category"}
          </button>
        </form>
      </div>
    </div>
  );
}
