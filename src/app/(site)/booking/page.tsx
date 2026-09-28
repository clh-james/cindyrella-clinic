import { BookingWizard } from "@/components/BookingWizard";
import type { Branch, Treatment as DbTreatment } from "@/lib/supabase/types";

export const metadata = {
  title: "Book an appointment — Cindyrella Medical Group",
};

const staticBranches: Branch[] = [
  { id: "makati", name: "Makati", address: null, phone: null, is_active: true },
  { id: "bgc", name: "Bonifacio Global City", address: null, phone: null, is_active: true },
  { id: "qc", name: "Quezon City", address: null, phone: null, is_active: true },
  { id: "alabang", name: "Alabang", address: null, phone: null, is_active: true },
];

async function loadData(): Promise<{
  treatments: DbTreatment[];
  branches: Branch[];
  live: boolean;
}> {
  const hasSupabaseEnv =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!hasSupabaseEnv) {
    return { treatments: [], branches: staticBranches, live: false };
  }

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const [{ data: treatments, error: tErr }, { data: branches, error: bErr }] =
      await Promise.all([
        supabase
          .from("treatments")
          .select("*")
          .eq("is_active", true)
          .order("sort_order"),
        supabase.from("branches").select("*").eq("is_active", true).order("name"),
      ]);

    if (tErr || bErr || !treatments?.length || !branches?.length) {
      return { treatments: treatments || [], branches: branches || staticBranches, live: false };
    }

    return { treatments, branches, live: true };
  } catch {
    return { treatments: [], branches: staticBranches, live: false };
  }
}

export default async function BookingPage() {
  const { treatments, branches, live } = await loadData();

  return (
    <main>
      <BookingWizard treatments={treatments} branches={branches} live={live} />
    </main>
  );
}
