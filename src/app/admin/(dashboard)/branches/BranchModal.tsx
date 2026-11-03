"use client";

import { useState, useEffect } from "react";
import { Building2, X, Loader2, AlertCircle } from "lucide-react";
import { Branch } from "./types";
import { createBranch, updateBranch } from "./actions";

interface BranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchToEdit?: Branch | null;
  onSuccess: () => void;
}

export default function BranchModal({
  isOpen,
  onClose,
  branchToEdit,
  onSuccess,
}: BranchModalProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (branchToEdit) {
      setName(branchToEdit.name || "");
      setAddress(branchToEdit.address || "");
      setPhone(branchToEdit.phone || "");
      setIsActive(branchToEdit.is_active);
    } else {
      setName("");
      setAddress("");
      setPhone("");
      setIsActive(true);
    }
    setError(null);
  }, [branchToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Branch name is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (branchToEdit) {
        const res = await updateBranch(branchToEdit.id, {
          name,
          address,
          phone,
          is_active: isActive,
        });
        if (res.error) {
          setError(res.error);
          setIsSubmitting(false);
          return;
        }
      } else {
        const res = await createBranch({
          name,
          address,
          phone,
          is_active: isActive,
        });
        if (res.error) {
          setError(res.error);
          setIsSubmitting(false);
          return;
        }
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred while saving branch.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-line overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line bg-mist/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-royal/10 text-royal">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">
                {branchToEdit ? "Edit Clinic Branch" : "Add New Clinic Branch"}
              </h2>
              <p className="text-xs text-ink-soft">
                {branchToEdit
                  ? `Update details for ${branchToEdit.name}`
                  : "Register a new branch location for POS, appointments, and staff"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="rounded-lg p-2 text-ink-soft hover:bg-mist transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 border border-red-200">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
              Branch Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Makati, Davao, Alaminos Pangasinan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm text-ink outline-none focus:border-royal focus:ring-2 focus:ring-royal/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
              Complete Address
            </label>
            <textarea
              rows={2}
              placeholder="e.g. 2nd Floor, Grand Mall, Quimpo Blvd., Davao City"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-xl border border-line px-3.5 py-2 text-sm text-ink outline-none focus:border-royal focus:ring-2 focus:ring-royal/20 transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
              Contact / Telephone Number
            </label>
            <input
              type="text"
              placeholder="e.g. (0917) 000 0001 or 082-224-5668"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm text-ink outline-none focus:border-royal focus:ring-2 focus:ring-royal/20 transition-all"
            />
          </div>

          <div className="pt-2 border-t border-line">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-line text-royal focus:ring-royal"
              />
              <div>
                <span className="text-sm font-semibold text-ink">Active Branch</span>
                <p className="text-xs text-ink-soft">
                  When enabled, this branch appears in POS, booking forms, and shift registers.
                </p>
              </div>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-line mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-mist transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-royal px-5 py-2 text-sm font-semibold text-white hover:bg-royal/90 shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : branchToEdit ? (
                "Save Changes"
              ) : (
                "Create Branch"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

