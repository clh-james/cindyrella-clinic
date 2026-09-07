import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Treatments & Services — Cindyrella Medical Group",
};

const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;

export default async function TreatmentsPage() {
  const supabase = await createClient();
  const { data: treatments } = await supabase
    .from("treatments")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const categories = ["IV Drips", "Nail Care", "Eyelash Extension", "PRP Treatment", "Facial & Warts", "Contouring & Whitening"];
  
  const groupedTreatments = categories.map(cat => ({
    name: cat,
    items: treatments?.filter(t => t.category === cat) || []
  })).filter(g => g.items.length > 0);

  // Fallback if there's no data (e.g. migration not run yet)
  if (groupedTreatments.length === 0) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-16 text-center">
        <h1 className="font-serif text-4xl font-semibold text-ink sm:text-5xl">
          Services & Treatments
        </h1>
        <p className="mt-4 text-ink-soft">Please run database migrations to load treatments.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <header className="max-w-2xl">
        <h1 className="font-serif text-4xl font-semibold text-ink sm:text-5xl">
          Services & Treatments
        </h1>
        <p className="mt-4 text-ink-soft">
          From IV Drips to Nail Care and Facial Treatments, every service is administered by our expert professionals.
        </p>
      </header>

      <div className="mt-16 space-y-20">
        {groupedTreatments.map((group) => (
          <section key={group.name} id={group.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}>
            <h2 className="font-serif text-3xl font-semibold text-ink border-b border-line pb-4 mb-8">
              {group.name}
            </h2>
            
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((t) => (
                <div key={t.id} className="flex flex-col rounded-2xl border border-line p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-serif text-xl font-medium text-ink">
                      {t.name}
                    </h3>
                    {t.badge && (
                      <span className="whitespace-nowrap rounded-full bg-gold-soft px-2.5 py-1 text-[11px] font-medium text-gold">
                        {t.badge}
                      </span>
                    )}
                  </div>
                  
                  {t.primary_desc && (
                    <p className="text-sm text-ink-soft mb-6 flex-grow">{t.primary_desc}</p>
                  )}
                  
                  <div className="mt-auto border-t border-line pt-4 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-ink-soft">Session</span>
                      <span className="text-lg font-semibold text-ink">{peso(t.session_price)}</span>
                    </div>
                    {t.five_plus_one_price != null && t.five_plus_one_price > 0 && (
                      <div className="flex justify-between items-center text-sm mt-1">
                        <span className="text-ink-soft">5 + 1 Package</span>
                        <span className="font-medium text-ink">{peso(t.five_plus_one_price)}</span>
                      </div>
                    )}
                    {t.ten_plus_two_price != null && t.ten_plus_two_price > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-ink-soft">10 + 2 Package</span>
                        <span className="font-medium text-ink">{peso(t.ten_plus_two_price)}</span>
                      </div>
                    )}
                    
                    <Link
                      href="/booking"
                      className="mt-5 w-full rounded-full bg-royal/10 text-royal px-4 py-2.5 text-center text-sm font-medium transition-colors hover:bg-royal hover:text-white"
                    >
                      Book Appointment
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      
      <p className="mt-16 text-center text-xs text-ink-soft max-w-2xl mx-auto">
        Results vary from person to person. Factors such as lifestyle, skin condition, sun exposure, and adherence to a skincare routine may affect outcomes. Prices and packages are subject to change.
      </p>
    </main>
  );
}
