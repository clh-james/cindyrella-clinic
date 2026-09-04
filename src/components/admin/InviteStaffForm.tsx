"use client";

import { useState } from "react";
import { inviteStaff } from "@/app/admin/actions";
import type { Branch } from "@/lib/supabase/types";

const roles = ["admin", "receptionist", "nurse", "doctor"] as const;

export function InviteStaffForm({ branches }: { branches: Branch[] }) {
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
      <form id="invite-staff-form" action={action} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Full name</span>
          <input
            name="full_name"
            required
            className="rounded-lg border border-line px-3 py-2 text-ink outline-none focus:border-royal"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Email</span>
          <input
            name="email"
            type="email"
            required
            className="rounded-lg border border-line px-3 py-2 text-ink outline-none focus:border-royal"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Role</span>
          <select
            name="role"
            required
            className="rounded-lg border border-line px-3 py-2 text-ink outline-none focus:border-royal"
          >
            {roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">Branch</span>
          <select
            name="branch_id"
            className="rounded-lg border border-line px-3 py-2 text-ink outline-none focus:border-royal"
          >
            <option value="">Unassigned</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </label>
        <button
          disabled={loading}
          className="rounded-full bg-royal px-5 py-2.5 text-sm font-medium text-white hover:bg-royal-deep disabled:opacity-50"
        >
          {loading ? "Adding…" : "Add staff"}
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
