"use client";

import { Building2, X, Phone, MapPin, Users, Calendar, CheckCircle2, XCircle } from "lucide-react";
import { Branch } from "./types";
import Link from "next/link";

interface BranchDetailsModalProps {
  branch: Branch | null;
  onClose: () => void;
  onEdit: (branch: Branch) => void;
}

export default function BranchDetailsModal({
  branch,
  onClose,
  onEdit,
}: BranchDetailsModalProps) {
  if (!branch) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-line overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line bg-mist/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-royal/10 text-royal">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-ink">{branch.name}</h2>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    branch.is_active
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                  }`}
                >
                  {branch.is_active ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" /> Active
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3" /> Inactive
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-ink-soft">Branch Information & Roster</p>
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

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-line p-3.5 bg-mist/30">
              <div className="flex items-center gap-2 text-xs font-semibold text-ink-soft mb-1">
                <MapPin className="h-3.5 w-3.5 text-royal" /> Location Address
              </div>
              <p className="text-sm font-medium text-ink">
                {branch.address || "No address provided"}
              </p>
            </div>

            <div className="rounded-xl border border-line p-3.5 bg-mist/30">
              <div className="flex items-center gap-2 text-xs font-semibold text-ink-soft mb-1">
                <Phone className="h-3.5 w-3.5 text-royal" /> Contact Number
              </div>
              <p className="text-sm font-medium text-ink">
                {branch.phone || "No contact number"}
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-royal/5 border border-royal/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-royal uppercase tracking-wider">
                    Assigned Staff
                  </p>
                  <p className="text-2xl font-bold text-ink mt-1">
                    {branch.staff_count}
                  </p>
                </div>
                <Users className="h-8 w-8 text-royal/40" />
              </div>
            </div>

            <div className="rounded-xl bg-purple-50 border border-purple-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-purple-700 uppercase tracking-wider">
                    Total Appointments
                  </p>
                  <p className="text-2xl font-bold text-ink mt-1">
                    {branch.appointments_count}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-purple-400" />
              </div>
            </div>
          </div>

          {/* Assigned Staff Members List */}
          <div>
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Branch Team Roster ({branch.staff_members?.length || 0})</span>
              <Link
                href="/admin/staff"
                className="text-xs text-royal hover:underline font-semibold"
              >
                Manage Staff &rarr;
              </Link>
            </h3>

            {branch.staff_members && branch.staff_members.length > 0 ? (
              <div className="max-h-52 overflow-y-auto divide-y divide-line rounded-xl border border-line">
                {branch.staff_members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between px-3.5 py-2.5 text-sm hover:bg-mist/30"
                  >
                    <div>
                      <p className="font-semibold text-ink">{member.full_name}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block rounded-md bg-royal/10 px-2 py-0.5 text-xs font-semibold text-royal">
                        {member.role_name || "Staff"}
                      </span>
                      <p className="text-[11px] text-ink-soft mt-0.5">
                        {member.is_active ? "Active" : "Inactive"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-line p-6 text-center text-xs text-ink-soft">
                No staff members currently assigned to this branch.
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-line bg-mist/30 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-ink hover:bg-white transition-colors"
          >
            Close
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit(branch);
            }}
            className="rounded-xl bg-royal px-5 py-2 text-sm font-semibold text-white hover:bg-royal/90 shadow-sm transition-all"
          >
            Edit Branch Details
          </button>
        </div>
      </div>
    </div>
  );
}
