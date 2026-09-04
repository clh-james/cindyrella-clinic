import { BookingWizard } from "@/components/BookingWizard";
import { treatments as staticTreatments } from "@/lib/treatments";
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

function toDbShape(): DbTreatment[] {
  return staticTreatments.map((t, i) => ({
    id: t.slug,
    slug: t.slug,
    name: t.name,
    badge: t.badge ?? null,
    session_price: t.session,
    five_plus_one_price: t.fivePlusOne,
    ten_plus_two_price: t.tenPlusTwo,
    primary_desc: t.primary,
    secondary_desc: t.secondary,
    best_for: t.bestFor,
    duration_minutes: parseInt(t.duration) || 30,
    is_active: true,
    sort_order: i,
  }));
}

async function loadData(): Promise<{
  treatments: DbTreatment[];
  branches: Branch[];
  live: boolean;
}> {
  const hasSupabaseEnv =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!hasSupabaseEnv) {
    return { treatments: toDbShape(), branches: staticBranches, live: false };
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
      return { treatments: toDbShape(), branches: staticBranches, live: false };
    }

    return { treatments, branches, live: true };
  } catch {
    return { treatments: toDbShape(), branches: staticBranches, live: false };
  }
}

export default async function BookingPage() {
  const { treatments, branches, live } = await loadData();

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="max-w-xl">
        <h1 className="font-serif text-4xl font-semibold text-ink sm:text-5xl">
          Book your session
        </h1>
        <p className="mt-4 text-ink-soft">
          Seven steps, about two minutes. A confirmation with your reference
          number follows immediately.
        </p>
      </header>
      <BookingWizard treatments={treatments} branches={branches} live={live} />
    </main>
  );
}
