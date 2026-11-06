"use client";

import { useState } from "react";
import { inviteStaff } from "@/app/admin/actions";
import type { Branch } from "@/lib/supabase/types";

export function InviteStaffForm({ 
  branches,
  roles
}: { 
  branches: Branch[];
  roles: { id: string; name: string }[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; tempPassword: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function action(formData: FormData) {
    setLoading(true);
    setError(null);
    setCreated(null);
    const result = await inviteStaff(formData);
    setLoading(false);
    if (result.ok) {
      setCreated({ email: String(formData.get("email")), tempPassword: result.tempPassword });
      (document.getElementById("invite-staff-form") as HTMLFormElement | null)?.reset();
    } else {
      setError(result.error);
    }
  }

  return (
    <div>
      <form id="invite-staff-form" action={action} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
        <label className="flex flex-col gap-1.5 text-xs sm:text-sm">
          <span className="font-semibold text-ink">Full name</span>
          <input
            name="full_name"
            required
            placeholder="e.g. Maria Santos"
            className="w-full rounded-xl border border-line px-3 py-2 text-ink outline-none focus:border-royal text-xs sm:text-sm shadow-2xs"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs sm:text-sm">
          <span className="font-semibold text-ink">Email</span>
          <input
            name="email"
            type="email"
            required
            placeholder="maria@cindyrellaclinic.com"
            className="w-full rounded-xl border border-line px-3 py-2 text-ink outline-none focus:border-royal text-xs sm:text-sm shadow-2xs"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs sm:text-sm">
          <span className="font-semibold text-ink">Role</span>
          <select
            name="role_id"
            required
            className="w-full rounded-xl border border-line px-3 py-2 text-ink outline-none focus:border-royal capitalize text-xs sm:text-sm shadow-2xs bg-white"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name.replace("_", " ")}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs sm:text-sm">
          <span className="font-semibold text-ink">Branch</span>
          <select
            name="branch_id"
            className="w-full rounded-xl border border-line px-3 py-2 text-ink outline-none focus:border-royal text-xs sm:text-sm shadow-2xs bg-white"
          >
            <option value="">Unassigned</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </label>
        <button
          disabled={loading}
          className="w-full rounded-xl bg-royal px-5 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-royal-deep disabled:opacity-50 min-h-[40px] touch-manipulation transition-colors shadow-sm"
        >
          {loading ? "Adding…" : "Add Staff"}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

      {created && (
        <div className="mt-4 rounded-xl bg-pale p-4 text-sm text-ink">
          <p className="font-medium">Account created for {created.email}</p>
          <p className="mt-1 text-ink-soft">
            Temporary password (shown once — share it securely):
          </p>
          <p className="mt-1 font-mono text-base">{created.tempPassword}</p>
        </div>
      )}
    </div>
  );
}
