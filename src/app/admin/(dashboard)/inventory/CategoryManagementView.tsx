"use client";

import { useState } from "react";
import { 
  Layers, Plus, Search, Edit2, Trash2, Check, X, 
  Loader2, Sparkles, ShieldAlert
} from "lucide-react";
import { InventoryCategory } from "./types";
import { 
  addCategory, updateCategory, toggleCategoryActive, 
  deleteCategory, ensureDefaultCategories 
} from "./actions";

interface CategoryManagementViewProps {
  categories: InventoryCategory[];
  canManageCategories: boolean;
  onRefresh?: () => void;
}

export function CategoryManagementView({
  categories,
  canManageCategories,
  onRefresh,
}: CategoryManagementViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<InventoryCategory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [subcategoriesStr, setSubcategoriesStr] = useState("");

  const filteredCategories = categories.filter((c) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q)
    );
  });

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setName("");
    setCode("");
    setDescription("");
    setSubcategoriesStr("");
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: InventoryCategory) => {
    setEditingCategory(c);
    setName(c.name);
    setCode(c.code);
    setDescription(c.description || "");
    setSubcategoriesStr((c.subcategories || []).join(", "));
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("code", code.trim());
    formData.append("description", description.trim());
    formData.append("subcategories", subcategoriesStr.trim());

    const res = editingCategory
      ? await updateCategory(editingCategory.id, formData)
      : await addCategory(formData);

    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      setLoading(false);
      setIsModalOpen(false);
      if (onRefresh) onRefresh();
    }
  };

  const handleToggleActive = async (cat: InventoryCategory) => {
    await toggleCategoryActive(cat.id, !cat.is_active);
    if (onRefresh) onRefresh();
  };

  const handleDelete = async (cat: InventoryCategory) => {
    if (!confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;
    setLoading(true);
    setError(null);
    const res = await deleteCategory(cat.id);
    if (res.error) {
      setError(res.error);
    } else {
      if (onRefresh) onRefresh();
    }
    setLoading(false);
  };

  const handleSeedDefaults = async () => {
    setLoading(true);
    setSuccessMsg(null);
    setError(null);
    const res = await ensureDefaultCategories();
    if (res.success) {
      setSuccessMsg("Default clinic categories verified and synced successfully!");
      if (onRefresh) onRefresh();
    } else {
      setError(res.error || "Failed to seed default categories.");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search categories by name, code, or description..."
            className="w-full rounded-xl border border-line bg-pale/30 pl-10 pr-4 py-2 text-xs sm:text-sm text-ink outline-none focus:border-royal focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          {canManageCategories && (
            <button
              onClick={handleSeedDefaults}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-semibold text-royal hover:bg-pale transition-all shadow-sm"
              title="Ensure all 8 standard Cindyrella categories are seeded"
            >
              <Sparkles size={14} />
              <span>Verify Standard Categories</span>
            </button>
          )}

          {canManageCategories && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 rounded-xl bg-royal px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-royal-deep transition-all shadow-sm"
            >
              <Plus size={16} />
              <span>Add Category</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-3.5 border border-red-200 text-xs text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      {successMsg && (
        <div className="rounded-xl bg-emerald-50 p-3.5 border border-emerald-200 text-xs text-emerald-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check size={16} className="text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)}><X size={14} /></button>
        </div>
      )}

      {/* Categories Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map((cat) => (
          <div
            key={cat.id}
            className={`rounded-2xl border p-5 shadow-sm space-y-4 flex flex-col justify-between transition-all ${
              cat.is_active
                ? "border-line bg-white hover:border-royal/40"
                : "border-line/60 bg-gray-50/70 opacity-75"
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold bg-royal/10 text-royal px-2.5 py-1 rounded-lg">
                    {cat.code}
                  </span>
                  <h3 className="font-semibold text-sm text-ink">{cat.name}</h3>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                    cat.is_active
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-gray-100 text-gray-600 border-gray-200"
                  }`}
                >
                  {cat.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              {cat.description && (
                <p className="text-xs text-ink-soft mt-2 leading-relaxed">
                  {cat.description}
                </p>
              )}

              {/* Subcategories tags */}
              {cat.subcategories && cat.subcategories.length > 0 && (
                <div className="mt-3 pt-3 border-t border-line">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft block mb-1.5">
                    Subcategories ({cat.subcategories.length})
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {cat.subcategories.map((sub, i) => (
                      <span
                        key={i}
                        className="rounded-md bg-pale/70 px-2 py-0.5 text-[10px] font-medium text-ink-soft border border-line"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom bar with Item Count & Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-line text-xs">
              <span className="font-medium text-ink-soft text-[11px]">
                {cat.item_count || 0} Item(s) Linked
              </span>

              {canManageCategories && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(cat)}
                    className="p-1.5 text-ink-soft hover:text-ink rounded-lg hover:bg-pale"
                    title="Edit Category"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleToggleActive(cat)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                      cat.is_active
                        ? "text-amber-700 hover:bg-amber-50"
                        : "text-emerald-700 hover:bg-emerald-50"
                    }`}
                  >
                    {cat.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => handleDelete(cat)}
                    className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50"
                    title="Delete Category"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {filteredCategories.length === 0 && (
          <div className="col-span-3 py-16 text-center text-sm text-ink-soft bg-white rounded-2xl border border-line">
            <Layers size={36} className="mx-auto mb-2 text-ink-soft/40" />
            No categories match your search.
          </div>
        )}
      </div>

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-line">
            <h3 className="font-serif text-lg font-semibold text-ink">
              {editingCategory ? "Edit Category" : "Add New Category"}
            </h3>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-ink mb-1">
                    Category Name *
                  </label>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. IV Drip & Infusion Supplies"
                    className="w-full rounded-xl border border-line px-3 py-2 text-xs text-ink outline-none focus:border-royal"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">
                    Code (3-4 chars) *
                  </label>
                  <input
                    required
                    maxLength={6}
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="IVS"
                    className="w-full rounded-xl border border-line px-3 py-2 text-xs font-mono font-bold text-ink outline-none focus:border-royal uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Examples and clinical usage scope..."
                  className="w-full rounded-xl border border-line px-3 py-2 text-xs text-ink outline-none focus:border-royal"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Subcategories (Comma separated)
                </label>
                <input
                  type="text"
                  value={subcategoriesStr}
                  onChange={(e) => setSubcategoriesStr(e.target.value)}
                  placeholder="e.g. IV Bags, Infusion Sets, Tubing, Cannulas"
                  className="w-full rounded-xl border border-line px-3 py-2 text-xs text-ink outline-none focus:border-royal"
                />
                <p className="text-[10px] text-ink-soft mt-1">
                  Separate subcategory tags with commas.
                </p>
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
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
