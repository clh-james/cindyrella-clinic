"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Package, Tag, DollarSign, Calendar, Layers } from "lucide-react";
import { addInventoryItem, updateInventoryItem } from "./actions";
import { InventoryCategory, InventoryItem, InventorySupplier, BranchInfo, STANDARD_UNITS } from "./types";

interface InventoryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemToEdit?: InventoryItem | null;
  categories: InventoryCategory[];
  suppliers: InventorySupplier[];
  branches: BranchInfo[];
  defaultBranchId?: string;
  onSuccess?: () => void;
}

export function InventoryItemModal({
  isOpen,
  onClose,
  itemToEdit,
  categories,
  suppliers,
  branches,
  defaultBranchId,
  onSuccess,
}: InventoryItemModalProps) {
  const isEditing = !!itemToEdit;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [customSubcategory, setCustomSubcategory] = useState("");
  const [isCustomSubcategory, setIsCustomSubcategory] = useState(false);
  const [brand, setBrand] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [customUnit, setCustomUnit] = useState("");
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [currentStock, setCurrentStock] = useState(0);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [reorderQuantity, setReorderQuantity] = useState(10);
  const [costPrice, setCostPrice] = useState(0);
  const [retailPrice, setRetailPrice] = useState<number | "">("");
  const [supplierId, setSupplierId] = useState("");
  const [storageLocation, setStorageLocation] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [mfgDate, setMfgDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [branchId, setBranchId] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  // Populate form if editing
  useEffect(() => {
    if (itemToEdit) {
      setName(itemToEdit.name || "");
      setSku(itemToEdit.sku || "");
      setBarcode(itemToEdit.barcode || "");
      setDescription(itemToEdit.description || "");
      setCategoryId(itemToEdit.category_id || "");
      setCategoryName(itemToEdit.category || "");
      const itemSub = itemToEdit.subcategory || "";
      const cat = categories.find((c) => c.id === itemToEdit.category_id);
      const catSubs = cat?.subcategories || [];
      if (itemSub && catSubs.length > 0 && !catSubs.includes(itemSub)) {
        setIsCustomSubcategory(true);
        setCustomSubcategory(itemSub);
        setSubcategory("custom");
      } else {
        setIsCustomSubcategory(false);
        setCustomSubcategory("");
        setSubcategory(itemSub);
      }
      setBrand(itemToEdit.brand || "");
      
      const isStandard = STANDARD_UNITS.includes(itemToEdit.unit);
      if (isStandard) {
        setUnit(itemToEdit.unit);
        setIsCustomUnit(false);
      } else {
        setUnit("custom");
        setCustomUnit(itemToEdit.unit);
        setIsCustomUnit(true);
      }

      setCurrentStock(itemToEdit.current_stock ?? 0);
      setLowStockThreshold(itemToEdit.low_stock_threshold ?? 5);
      setReorderQuantity(itemToEdit.reorder_quantity ?? 10);
      setCostPrice(itemToEdit.cost_price ?? 0);
      setRetailPrice(itemToEdit.retail_price ?? "");
      setSupplierId(itemToEdit.supplier_id || "");
      setStorageLocation(itemToEdit.storage_location || "");
      setBatchNumber(itemToEdit.batch_number || "");
      setMfgDate(itemToEdit.mfg_date || "");
      setExpiryDate(itemToEdit.expiry_date || "");
      setBranchId(itemToEdit.branch_id || defaultBranchId || "");
      setImageUrl(itemToEdit.image_url || "");
    } else {
      // Reset defaults
      setName("");
      setSku("");
      setBarcode("");
      setDescription("");
      setCategoryId(categories[0]?.id || "");
      setCategoryName(categories[0]?.name || "IV Drip & Infusion Supplies");
      setSubcategory("");
      setCustomSubcategory("");
      setIsCustomSubcategory(false);
      setBrand("");
      setUnit("pcs");
      setCustomUnit("");
      setIsCustomUnit(false);
      setCurrentStock(0);
      setLowStockThreshold(5);
      setReorderQuantity(10);
      setCostPrice(0);
      setRetailPrice("");
      setSupplierId(suppliers[0]?.id || "");
      setStorageLocation("");
      setBatchNumber("");
      setMfgDate("");
      setExpiryDate("");
      setBranchId(defaultBranchId || branches[0]?.id || "");
      setImageUrl("");
    }
    setError(null);
  }, [itemToEdit, isOpen, categories, suppliers, branches, defaultBranchId]);

  // Selected category subcategories
  const selectedCat = categories.find((c) => c.id === categoryId);
  const availableSubcategories = selectedCat?.subcategories || [];

  const handleCategoryChange = (catId: string) => {
    setCategoryId(catId);
    setIsCustomSubcategory(false);
    setCustomSubcategory("");
    const cat = categories.find((c) => c.id === catId);
    if (cat) {
      setCategoryName(cat.name);
      setSubcategory(cat.subcategories?.[0] || "");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const effectiveUnit = isCustomUnit ? customUnit.trim() : unit;
    if (!effectiveUnit) {
      setError("Please specify a unit of measure.");
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("name", name.trim());
    if (sku.trim()) formData.append("sku", sku.trim());
    if (barcode.trim()) formData.append("barcode", barcode.trim());
    if (description.trim()) formData.append("description", description.trim());
    formData.append("category_id", categoryId);
    formData.append("category", categoryName);
    const effectiveSubcategory = isCustomSubcategory ? customSubcategory.trim() : subcategory.trim();
    if (effectiveSubcategory) formData.append("subcategory", effectiveSubcategory);
    if (brand.trim()) formData.append("brand", brand.trim());
    formData.append("unit", effectiveUnit);
    formData.append("current_stock", currentStock.toString());
    formData.append("low_stock_threshold", lowStockThreshold.toString());
    formData.append("reorder_quantity", reorderQuantity.toString());
    formData.append("cost_price", costPrice.toString());
    if (retailPrice !== "") formData.append("retail_price", retailPrice.toString());
    if (supplierId) formData.append("supplier_id", supplierId);
    if (storageLocation.trim()) formData.append("storage_location", storageLocation.trim());
    if (batchNumber.trim()) formData.append("batch_number", batchNumber.trim());
    if (mfgDate) formData.append("mfg_date", mfgDate);
    if (expiryDate) formData.append("expiry_date", expiryDate);
    if (branchId) formData.append("branch_id", branchId);
    if (imageUrl.trim()) formData.append("image_url", imageUrl.trim());

    const res = isEditing && itemToEdit
      ? await updateInventoryItem(itemToEdit.id, formData)
      : await addInventoryItem(formData);

    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      setLoading(false);
      onClose();
      if (onSuccess) onSuccess();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="relative my-8 w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-line flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-pale/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-royal/10 p-2 text-royal">
              <Package size={20} />
            </div>
            <div>
              <h2 className="text-lg font-serif font-semibold text-ink">
                {isEditing ? "Edit Inventory Item" : "Register New Inventory Item"}
              </h2>
              <p className="text-xs text-ink-soft">
                {isEditing
                  ? "Update item details, thresholds, and clinical tracking information."
                  : "Add supplies, aesthetic consumables, or retail products."}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-ink-soft hover:bg-pale hover:text-ink transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="rounded-xl bg-red-50 p-4 border border-red-200 text-sm text-red-700 flex items-center gap-2">
              <X size={16} className="text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-royal flex items-center gap-2">
              <Tag size={14} /> Basic Item Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-ink mb-1">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. PNSS 500ml Infusion Bag, Collagen Drip, Syringe 10cc"
                  className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm text-ink outline-none focus:border-royal focus:ring-1 focus:ring-royal transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  SKU (Stock Keeping Unit)
                </label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  placeholder="e.g. IVS-PNSS-500"
                  className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm font-mono text-ink outline-none focus:border-royal focus:ring-1 focus:ring-royal transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Barcode / UPC
                </label>
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="e.g. 4801234567890"
                  className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm font-mono text-ink outline-none focus:border-royal focus:ring-1 focus:ring-royal transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Brand / Manufacturer
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. Terumo, Cindyrella Medical, PharmaDerm"
                  className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm text-ink outline-none focus:border-royal focus:ring-1 focus:ring-royal transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Item Image URL (Optional)
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/item.png"
                  className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm text-ink outline-none focus:border-royal focus:ring-1 focus:ring-royal transition-all"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-ink mb-1">
                  Description / Clinical Usage Notes
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed specifications, contraindications, or storage instructions..."
                  className="w-full rounded-xl border border-line px-3.5 py-2 text-sm text-ink outline-none focus:border-royal focus:ring-1 focus:ring-royal transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Category & Unit */}
          <div className="space-y-4 pt-4 border-t border-line">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-royal flex items-center gap-2">
              <Layers size={14} /> Classification & Measurement
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm text-ink bg-white outline-none focus:border-royal"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Subcategory
                </label>
                {availableSubcategories.length > 0 ? (
                  <>
                    <select
                      value={isCustomSubcategory ? "custom" : subcategory}
                      onChange={(e) => {
                        if (e.target.value === "custom") {
                          setIsCustomSubcategory(true);
                        } else {
                          setIsCustomSubcategory(false);
                          setSubcategory(e.target.value);
                        }
                      }}
                      className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm text-ink bg-white outline-none focus:border-royal"
                    >
                      <option value="">None / General</option>
                      {availableSubcategories.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                      <option value="custom">+ Custom Subcategory...</option>
                    </select>
                    {isCustomSubcategory && (
                      <input
                        type="text"
                        value={customSubcategory}
                        onChange={(e) => setCustomSubcategory(e.target.value)}
                        placeholder="Enter custom subcategory"
                        className="mt-2 w-full rounded-xl border border-royal px-3 py-1.5 text-xs text-ink outline-none"
                      />
                    )}
                  </>
                ) : (
                  <input
                    type="text"
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    placeholder="e.g. Infusion Sets"
                    className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm text-ink outline-none focus:border-royal"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Unit of Measure <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={isCustomUnit ? "custom" : unit}
                    onChange={(e) => {
                      if (e.target.value === "custom") {
                        setIsCustomUnit(true);
                      } else {
                        setIsCustomUnit(false);
                        setUnit(e.target.value);
                      }
                    }}
                    className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm text-ink bg-white outline-none focus:border-royal"
                  >
                    {STANDARD_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                    <option value="custom">+ Custom Unit...</option>
                  </select>
                </div>
                {isCustomUnit && (
                  <input
                    type="text"
                    required
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    placeholder="Enter custom unit (e.g. cartridge, tub)"
                    className="mt-2 w-full rounded-xl border border-royal px-3 py-1.5 text-xs text-ink outline-none"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Cost, Pricing & Branch Stock */}
          <div className="space-y-4 pt-4 border-t border-line">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-royal flex items-center gap-2">
              <DollarSign size={14} /> Stock Levels & Financials
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  {isEditing ? "Current Stock Count" : "Initial Stock Quantity"}
                </label>
                <input
                  type="number"
                  min={0}
                  value={currentStock}
                  onChange={(e) => setCurrentStock(parseInt(e.target.value) || 0)}
                  disabled={isEditing} // Changes to existing stock should use Stock In / Out / Adjust
                  className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm font-semibold font-mono text-ink bg-white disabled:bg-gray-50 outline-none focus:border-royal"
                />
                {isEditing && (
                  <p className="text-[10px] text-ink-soft mt-1">
                    Use Stock In / Out actions to update existing quantities.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Low Stock Alert Level
                </label>
                <input
                  type="number"
                  min={0}
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm font-mono text-ink outline-none focus:border-royal"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Reorder Quantity
                </label>
                <input
                  type="number"
                  min={1}
                  value={reorderQuantity}
                  onChange={(e) => setReorderQuantity(parseInt(e.target.value) || 1)}
                  className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm font-mono text-ink outline-none focus:border-royal"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Branch Assignment
                </label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm text-ink bg-white outline-none focus:border-royal"
                >
                  <option value="">All / Primary Branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Purchase Cost (₱)
                </label>
                <input
                  type="number"
                  min={0}
                  value={costPrice}
                  onChange={(e) => setCostPrice(parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm font-mono text-ink outline-none focus:border-royal"
                />
                <p className="text-[10px] text-ink-soft mt-0.5">Clinic cost per unit</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Retail / Selling Price (₱)
                </label>
                <input
                  type="number"
                  min={0}
                  value={retailPrice}
                  onChange={(e) => setRetailPrice(e.target.value === "" ? "" : parseInt(e.target.value) || 0)}
                  placeholder="Leave empty if internal"
                  className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm font-mono text-ink outline-none focus:border-royal"
                />
                <p className="text-[10px] text-ink-soft mt-0.5">For POS retail sales</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Supplier
                </label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm text-ink bg-white outline-none focus:border-royal"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Storage Location
                </label>
                <input
                  type="text"
                  value={storageLocation}
                  onChange={(e) => setStorageLocation(e.target.value)}
                  placeholder="e.g. Refrigerator 1, Shelf B2"
                  className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm text-ink outline-none focus:border-royal"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Batch & Clinical Expiration Safety */}
          <div className="space-y-4 pt-4 border-t border-line">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-royal flex items-center gap-2">
              <Calendar size={14} /> Batch & Expiration Safety (FEFO)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Batch / Lot Number
                </label>
                <input
                  type="text"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="e.g. LOT-202610-A"
                  className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm font-mono text-ink outline-none focus:border-royal"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Manufacturing Date
                </label>
                <input
                  type="date"
                  value={mfgDate}
                  onChange={(e) => setMfgDate(e.target.value)}
                  className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm text-ink outline-none focus:border-royal"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Expiration Date
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm text-ink outline-none focus:border-royal"
                />
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl px-5 py-2.5 text-sm font-medium text-ink-soft hover:bg-pale hover:text-ink transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl bg-royal px-6 py-2.5 text-sm font-semibold text-white hover:bg-royal-deep transition-all shadow-md shadow-royal/20 disabled:opacity-50"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {isEditing ? "Save Changes" : "Register Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
