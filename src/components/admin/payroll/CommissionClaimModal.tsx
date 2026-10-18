"use client";

import { useState } from "react";
import { X, Save, Sparkles } from "lucide-react";
import { StaffBasic, BranchInfo } from "@/app/admin/(dashboard)/payroll/types";
import { createCommissionRecord } from "@/app/admin/(dashboard)/payroll/actions";
import toast from "react-hot-toast";

interface CommissionClaimModalProps {
  staffList: StaffBasic[];
  branches: BranchInfo[];
  onClose: () => void;
  onSaved: () => void;
}

export function CommissionClaimModal({
  staffList,
  branches,
  onClose,
  onSaved,
}: CommissionClaimModalProps) {
  const [employeeId, setEmployeeId] = useState(staffList[0]?.id || "");
  const [branchId, setBranchId] = useState(branches[0]?.id || "");
  const [sourceType, setSourceType] = useState<"appointment" | "pos_sale" | "manual_service" | "manual_retail">("manual_service");
  const [itemName, setItemName] = useState("Cinderella Drip Premium Treatment");
  const [baseAmount, setBaseAmount] = useState("2500");
  const [commissionRate, setCommissionRate] = useState("10"); // 10%
  const [isPercentage, setIsPercentage] = useState(true);
  const [splitRatio, setSplitRatio] = useState("1.0"); // 100%
  const [dateEarned, setDateEarned] = useState(new Date().toISOString().slice(0, 10));
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Compute preview
  const base = parseFloat(baseAmount) || 0;
  const rate = parseFloat(commissionRate) || 0;
  const split = parseFloat(splitRatio) || 1.0;
  const previewAmount = isPercentage
    ? Math.round(base * (rate / 100) * split * 100) / 100
    : Math.round(rate * split * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await createCommissionRecord({
        employee_id: employeeId,
        branch_id: branchId,
        source_type: sourceType,
        reference_number: referenceNumber || undefined,
        item_name: itemName,
        base_amount: base,
        commission_rate: rate,
        is_percentage: isPercentage,
        split_ratio: split,
        date_earned: dateEarned,
        status: "approved",
        notes,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to record commission");
      } else {
        toast.success("Commission attributed successfully!");
        onSaved();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create commission";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold font-serif text-ink">Attribute Treatment Commission</h2>
              <p className="text-xs text-ink-soft">Record service or retail product commission for clinic staff</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl border border-line p-2 text-ink-soft hover:bg-pale">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink mb-1">Eligible Staff / Therapist</label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full rounded-xl border border-line bg-pale/40 px-3 py-2 text-ink font-medium"
              >
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-ink mb-1">Clinic Branch</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full rounded-xl border border-line bg-pale/40 px-3 py-2 text-ink font-medium"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink mb-1">Source / Attribution Basis</label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as "appointment" | "pos_sale" | "manual_service" | "manual_retail")}
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-ink"
              >
                <option value="appointment">Clinical Service / Appointment</option>
                <option value="pos_sale">POS Retail Consumable Sale</option>
                <option value="manual_service">Special Procedure Service</option>
                <option value="manual_retail">Retail Product Incentive</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-ink mb-1">Transaction Ref / Invoice #</label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. APPT-20261018-001"
                className="w-full rounded-xl border border-line px-3 py-2 font-mono text-ink"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-ink mb-1">Service or Item Rendered</label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              required
              placeholder="e.g. Gluta Drip Infusion, Diamond Peel, Carbon Laser"
              className="w-full rounded-xl border border-line px-3 py-2 font-medium text-ink"
            />
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-2xl bg-pale/40 border border-line p-3">
            <div>
              <label className="block font-semibold text-ink mb-1">Base Price (₱)</label>
              <input
                type="number"
                step="0.01"
                value={baseAmount}
                onChange={(e) => setBaseAmount(e.target.value)}
                required
                className="w-full rounded-xl border border-line bg-white px-3 py-2 font-mono font-semibold text-ink"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink mb-1">Commission Rate</label>
              <div className="flex">
                <input
                  type="number"
                  step="0.1"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  className="w-full rounded-l-xl border border-line bg-white px-3 py-2 font-mono font-semibold text-ink"
                />
                <button
                  type="button"
                  onClick={() => setIsPercentage(!isPercentage)}
                  className="rounded-r-xl border border-l-0 border-line bg-pale px-2.5 font-bold text-royal"
                >
                  {isPercentage ? "%" : "₱"}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-ink mb-1">Staff Split</label>
              <select
                value={splitRatio}
                onChange={(e) => setSplitRatio(e.target.value)}
                className="w-full rounded-xl border border-line bg-white px-2 py-2 text-ink font-mono"
              >
                <option value="1.0">Solo (100%)</option>
                <option value="0.5">50/50 Split</option>
                <option value="0.333">3-Way Split</option>
                <option value="0.25">4-Way Split</option>
              </select>
            </div>
          </div>

          {/* Computed Payout Preview Box */}
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800">Earned Commission</span>
              <p className="text-[11px] text-emerald-600">Calculated staff payout</p>
            </div>
            <span className="font-mono font-bold text-lg text-emerald-700">
              ₱{previewAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-ink mb-1">Date Earned</label>
              <input
                type="date"
                value={dateEarned}
                onChange={(e) => setDateEarned(e.target.value)}
                required
                className="w-full rounded-xl border border-line px-3 py-2 text-ink"
              />
            </div>
            <div>
              <label className="block font-semibold text-ink mb-1">Notes / Treatment Log</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes"
                className="w-full rounded-xl border border-line px-3 py-2 text-ink"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-line px-4 py-2 text-ink-soft hover:bg-pale font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl bg-royal px-5 py-2 font-semibold text-white hover:bg-royal/90 shadow-sm"
            >
              <Save size={15} />
              {loading ? "Attributing..." : "Confirm & Save Commission"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
