import { createClient } from "@/lib/supabase/server";
import { ServiceCard } from "@/components/ServiceCard";
import { Treatment } from "@/lib/supabase/types";

export const metadata = {
  title: "Treatments & Services — Cindyrella Medical Group",
  description: "Explore our full range of services, from our signature IV drips and non-surgical aesthetic enhancements to nail care and facials.",
};

export default async function TreatmentsPage() {
  const supabase = await createClient();
  const { data: treatments } = await supabase
    .from("treatments")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const categories = [
    "IV Treatment",
    "IPL Hair Removal",
    "Hair Waxing",
    "Breast Augmentation",
    "Butt Augmentation",
    "Nail Care",
    "Eyelash Extension",
    "PRP Treatment",
    "Facial & Warts",
    "Contouring & Whitening",
    "Piercings",
    "Queen's Intimate Treatment",
    "King's Treatment"
  ];
  
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
                <ServiceCard key={t.id} service={t as Treatment} />
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
