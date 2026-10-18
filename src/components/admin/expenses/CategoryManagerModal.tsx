"use client";

import { useState } from "react";
import {
  X,
  Plus,
  Edit2,
  Check,
  Loader2,
  Layers,
  FileCheck,
  ShieldCheck,
  Power,
} from "lucide-react";
import { ExpenseCategory } from "@/app/admin/(dashboard)/expenses/types";
import { saveCategory } from "@/app/admin/(dashboard)/expenses/actions";
import toast from "react-hot-toast";

interface CategoryManagerModalProps {
  categories: ExpenseCategory[];
  onClose: () => void;
  onRefresh: () => void;
}

const PRESET_COLORS = [
  "#4F46E5", // Indigo
  "#0284C7", // Sky
  "#D97706", // Amber
  "#10B981", // Emerald
  "#EC4899", // Pink
  "#8B5CF6", // Purple
  "#F59E0B", // Yellow
  "#64748B", // Slate
  "#DC2626", // Red
  "#059669", // Teal
  "#2563EB", // Blue
  "#7C3AED", // Violet
];

export function CategoryManagerModal({
  categories,
  onClose,
  onRefresh,
}: CategoryManagerModalProps) {
  const [editingCat, setEditingCat] = useState<ExpenseCategory | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [requiresReceipt, setRequiresReceipt] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  const startEdit = (cat: ExpenseCategory) => {
    setEditingCat(cat);
    setName(cat.name);
    setDescription(cat.description || "");
    setColor(cat.color || PRESET_COLORS[0]);
    setRequiresReceipt(!!cat.requires_receipt);
    setRequiresApproval(cat.requires_approval !== undefined ? !!cat.requires_approval : true);
    setIsActive(cat.is_active !== undefined ? !!cat.is_active : true);
  };

  const resetForm = () => {
    setEditingCat(null);
    setName("");
    setDescription("");
    setColor(PRESET_COLORS[0]);
    setRequiresReceipt(false);
    setRequiresApproval(true);
    setIsActive(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Category name is required");
      return;
    }

    setLoading(true);
    try {
      const res = await saveCategory({
        id: editingCat ? editingCat.id : undefined,
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        requires_receipt: requiresReceipt,
        requires_approval: requiresApproval,
        is_active: isActive,
      });

      if (res.success) {
        toast.success(editingCat ? "Category updated!" : "Category created!");
        resetForm();
        onRefresh();
      } else {
        toast.error(res.error || "Failed to save category");
      }
    } catch {
      toast.error("Failed to save category");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (cat: ExpenseCategory) => {
    try {
      const res = await saveCategory({
        id: cat.id,
        name: cat.name,
        description: cat.description || undefined,
        color: cat.color,
        requires_receipt: cat.requires_receipt,
        requires_approval: cat.requires_approval,
        is_active: !cat.is_active,
      });

      if (res.success) {
        toast.success(`Category ${!cat.is_active ? "activated" : "deactivated"}!`);
        onRefresh();
      } else {
        toast.error(res.error || "Failed to toggle status");
      }
    } catch {
      toast.error("Failed to toggle status");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/60">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Clinic Expense Categories</h2>
              <p className="text-xs text-slate-500">
                Configure accounts, approval policies & receipt requirements
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Add / Edit Form */}
          <form
            onSubmit={handleSave}
            className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                {editingCat ? `Edit Category: ${editingCat.name}` : "Create New Expense Category"}
              </h3>
              {editingCat && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold underline"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Laser Maintenance, Doctor Fees"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Color Tag
                </label>
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        color === c ? "scale-110 border-slate-900 shadow-sm" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description / Clinical Accounting Scope
              </label>
              <input
                type="text"
                placeholder="What clinic expenses fall under this category..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Checkbox Policies */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors">
                <input
                  type="checkbox"
                  checked={requiresReceipt}
                  onChange={(e) => setRequiresReceipt(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-slate-400" /> Requires Receipt
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors">
                <input
                  type="checkbox"
                  checked={requiresApproval}
                  onChange={(e) => setRequiresApproval(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" /> Requires Approval
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
                <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                  <Power className="w-3.5 h-3.5 text-slate-400" /> Active Category
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm flex items-center gap-1.5"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {editingCat ? "Update Category" : "Add Category"}
              </button>
            </div>
          </form>

          {/* Categories List */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Configured Categories ({categories.length})
            </h3>
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden text-xs bg-white">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className={`p-3.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors ${
                    !cat.is_active ? "opacity-50 bg-slate-50/50" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: cat.color }} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{cat.name}</span>
                        {!cat.is_active && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 text-slate-700 font-medium">
                            Deactivated
                          </span>
                        )}
                        {cat.requires_receipt && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-medium">
                            Receipt Req
                          </span>
                        )}
                        {!cat.requires_approval && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-medium">
                            Auto-Approve
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 mt-0.5 text-[11px]">{cat.description || "No description."}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(cat)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Edit Category"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                        cat.is_active
                          ? "border-slate-300 text-slate-700 hover:bg-slate-100"
                          : "border-emerald-300 text-emerald-700 hover:bg-emerald-50 bg-emerald-50/30"
                      }`}
                    >
                      {cat.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/60 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 bg-white shadow-sm transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
