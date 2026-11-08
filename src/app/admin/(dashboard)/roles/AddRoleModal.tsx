"use client";

import React, { useState, useTransition } from "react";
import { Plus, X, ShieldPlus, Copy, AlertCircle, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { createRole } from "./actions";

interface AddRoleModalProps {
  existingRoles: { id: string; name: string }[];
  isOpen: boolean;
  onClose: () => void;
}

export function AddRoleModal({ existingRoles, isOpen, onClose }: AddRoleModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cloneFromRoleId, setCloneFromRoleId] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const slugPreview = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a role name");
      return;
    }

    startTransition(async () => {
      try {
        await createRole({
          name,
          description,
          cloneFromRoleId: cloneFromRoleId || undefined,
        });
        toast.success(`Role "${name.trim()}" created successfully!`);
        setName("");
        setDescription("");
        setCloneFromRoleId("");
        onClose();
      } catch (err: any) {
        toast.error(err.message || "Failed to create role");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-line overflow-hidden transform animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-line bg-gradient-to-r from-royal/5 via-transparent to-transparent">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-royal/10 text-royal">
              <ShieldPlus size={22} />
            </div>
            <div>
              <h2 id="modal-title" className="font-serif text-lg font-semibold text-ink">
                Add New Role
              </h2>
              <p className="text-xs text-ink-soft">
                Define a custom role with tailored module permissions
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="p-2 text-ink-soft hover:text-ink rounded-xl hover:bg-pale transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {/* Role Name */}
            <div>
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                Role Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Nurse, Aesthetician, Senior Therapist"
                required
                disabled={isPending}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-line bg-white text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal transition-all disabled:opacity-60"
                autoFocus
              />
              {slugPreview && (
                <p className="mt-1.5 text-[11px] text-ink-soft flex items-center gap-1.5 font-mono">
                  <span className="text-royal font-bold">System Identifier:</span>
                  <code className="bg-pale px-1.5 py-0.5 rounded text-ink font-semibold">{slugPreview}</code>
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the scope and responsibilities for this role..."
                rows={2}
                disabled={isPending}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-line bg-white text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal transition-all resize-none disabled:opacity-60"
              />
            </div>

            {/* Clone Permissions */}
            <div>
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                Copy Permissions From (Optional)
              </label>
              <div className="relative">
                <select
                  value={cloneFromRoleId}
                  onChange={(e) => setCloneFromRoleId(e.target.value)}
                  disabled={isPending}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-line bg-white text-ink focus:outline-none focus:ring-2 focus:ring-royal/20 focus:border-royal transition-all disabled:opacity-60 appearance-none pr-10 cursor-pointer"
                >
                  <option value="">Start Empty (No initial permissions)</option>
                  {existingRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      Copy from {r.name.replace(/_/g, " ").toUpperCase()}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-ink-soft">
                  <Copy size={16} />
                </div>
              </div>
              <p className="mt-1.5 text-[11px] text-ink-soft">
                Selecting an existing role automatically pre-fills this new role with its active permission toggles.
              </p>
            </div>

            {/* Tip Notice */}
            <div className="rounded-xl border border-line/60 bg-royal/5 p-3.5 flex items-start gap-2.5 text-xs text-ink-soft">
              <AlertCircle size={16} className="text-royal shrink-0 mt-0.5" />
              <p>
                After creating the role, it will immediately show up as a column in the <strong>Role Permissions Table</strong> where you can customize its permissions, and in the <strong>Staff</strong> page for assigning to staff members.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-line bg-[#f8fafc]">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2.5 text-sm font-medium text-ink-soft hover:text-ink rounded-xl hover:bg-white border border-transparent hover:border-line transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-royal hover:bg-royal-deep rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating Role...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Create Role
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

