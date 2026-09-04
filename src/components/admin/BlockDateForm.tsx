"use client";

import { useState } from "react";
import { addBlockedDate } from "@/app/admin/actions";
import type { Branch } from "@/lib/supabase/types";

export function BlockDateForm({ branches }: { branches: Branch[] }) {
  const [error, setError] = useState<string | null>(null);

  async function action(formData: FormData) {
    const result = await addBlockedDate(formData);
    setError(result?.error ?? null);
    if (!result?.error) {
      const form = document.getElementById("block-date-form") as HTMLFormElement | null;
      form?.reset();
    }
  }

  return (
    <form id="block-date-form" action={action} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">Date</span>
        <input
          name="date"
          type="date"
          required
          className="rounded-lg border border-line px-3 py-2 text-ink outline-none focus:border-royal"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">Branch</span>
        <select
          name="branch_id"
          className="rounded-lg border border-line px-3 py-2 text-ink outline-none focus:border-royal"
        >
          <option value="">All branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink">Reason</span>
        <input
          name="reason"
          placeholder="Holiday, maintenance, vacation…"
          className="rounded-lg border border-line px-3 py-2 text-ink outline-none focus:border-royal"
        />
      </label>
      <button className="rounded-full bg-royal px-5 py-2.5 text-sm font-medium text-white hover:bg-royal-deep">
        Block date
      </button>
      {error && <p className="w-full text-sm text-red-700">{error}</p>}
    </form>
  );
}
