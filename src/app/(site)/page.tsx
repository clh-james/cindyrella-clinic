import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import {
  ShieldCheck,
  Clock,
  Sparkles,
  Syringe,
  Star,
  ChevronDown,
} from "lucide-react";

const trust = [
  { icon: ShieldCheck, label: "Licensed nurses on every visit" },
  { icon: Sparkles, label: "FDA-approved formulations" },
  { icon: Clock, label: "Same-week appointments" },
];

const faqs = [
  {
    q: "How long does an IV drip session take?",
    a: "Most sessions run 30 to 60 minutes depending on the treatment. Your nurse will confirm the exact time when you arrive.",
  },
  {
    q: "Is IV drip therapy safe?",
    a: "Every drip is administered by a licensed nurse under physician-approved protocols, using FDA-approved products in a clinical setting.",
  },
  {
    q: "Can I combine treatments or come regularly?",
    a: "Yes. Package pricing (5+1 and 10+2) is built for clients who want ongoing sessions, and your nurse can help you plan a schedule.",
  },
  {
    q: "What should I do before my appointment?",
    a: "Eat a light meal and stay hydrated beforehand. Let us know about any medical conditions, allergies, or medications during booking.",
  },
];

const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;

export default async function Home() {
  const supabase = await createClient();
  const { data: treatments } = await supabase
    .from("treatments")
    .select("*")
    .eq("is_active", true)
    .eq("category", "IV Drips")
    .order("sort_order", { ascending: true })
    .limit(6);

  return (
    <main>
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl gap-10 px-6 pb-16 pt-14 md:grid-cols-[1.05fr_0.95fr] md:gap-8 md:pb-24 md:pt-20">
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2 text-sm text-royal">
            <Image src="/logo.png" alt="Cindyrella Logo" width={24} height={24} className="rounded-full" />
            <span>Cindyrella Medical Group</span>
          </div>
          <h1 className="mt-5 font-serif text-5xl font-semibold leading-[1.05] text-ink sm:text-6xl">
            Unlocking ultimate confidence,
            <br />
            inside and out
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-soft">
            Nurse-administered IV drip therapy designed to improve hydration,
            skin glow, recovery, and energy — in a clinical setting that
            feels like a spa.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/booking"
              className="rounded-full bg-royal px-7 py-3.5 text-sm font-medium text-white transition-colors hover:bg-royal-deep"
            >
              Book now
            </Link>
            <Link
              href="/treatments"
              className="rounded-full border border-line px-7 py-3.5 text-sm font-medium text-ink transition-colors hover:border-royal hover:text-royal"
            >
              View treatments
            </Link>
          </div>

          <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-line pt-6">
            {trust.map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col gap-2">
                <Icon size={18} className="text-royal" />
                <dt className="text-xs leading-snug text-ink-soft">{label}</dt>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative h-fit self-center">
          <div className="aspect-video w-full overflow-hidden rounded-[2rem] relative bg-pale">
            <Image 
              src="/storefront.jpg" 
              alt="Cindyrella Drip Wellness Aesthetics Storefront"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="absolute -bottom-6 left-6 right-6 flex items-center justify-between rounded-2xl border border-line bg-paper px-6 py-4 shadow-[0_20px_40px_-15px_rgba(11,26,51,0.25)] sm:left-8 sm:right-auto sm:w-64">
            <div>
              <p className="font-serif text-2xl font-semibold text-ink">4.9<span className="text-base font-normal text-ink-soft">/5</span></p>
              <p className="text-xs text-ink-soft">from 500+ sessions</p>
            </div>
            <div className="flex gap-0.5 text-gold">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={14} fill="currentColor" strokeWidth={0} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Treatments preview */}
      <section className="border-t border-line bg-pale py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="font-serif text-3xl font-semibold text-ink sm:text-4xl">
                Signature drips
              </h2>
              <p className="mt-2 max-w-md text-ink-soft">
                Seven formulations, each built around a specific outcome —
                glow, recovery, clarity, or energy.
              </p>
            </div>
            <Link
              href="/treatments"
              className="text-sm font-medium text-royal hover:text-royal-deep"
            >
              See full pricing
            </Link>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(treatments || []).map((t) => (
              <Link
                href="/treatments"
                key={t.slug}
                className="group flex flex-col justify-between rounded-2xl border border-line bg-paper p-6 transition-colors hover:border-royal"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-serif text-xl font-semibold text-ink">
                      {t.name}
                    </h3>
                    {t.badge && (
                      <span className="whitespace-nowrap rounded-full bg-gold-soft px-2.5 py-1 text-[11px] font-medium text-gold">
                        {t.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                    {t.primary_desc}
                  </p>
                </div>
                <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
                  <span className="text-lg font-semibold text-ink">
                    {peso(t.session_price)}
                  </span>
                  <span className="text-xs text-ink-soft">{t.duration_minutes ? `${t.duration_minutes} min` : ''}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why choose */}
      <section id="about" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-serif text-3xl font-semibold text-ink sm:text-4xl">
          Why clients choose Cindyrella
        </h2>
        <div className="mt-10 grid gap-10 md:grid-cols-3">
          <div>
            <Syringe size={22} className="text-royal" />
            <h3 className="mt-4 text-lg font-semibold text-ink">
              Clinical precision
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Every drip is prepared and administered by a licensed nurse
              under a physician-approved protocol.
            </p>
          </div>
          <div>
            <Sparkles size={22} className="text-royal" />
            <h3 className="mt-4 text-lg font-semibold text-ink">
              Visible results
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Formulations are targeted to a single outcome, so you can
              choose exactly what your body needs.
            </p>
          </div>
          <div>
            <ShieldCheck size={22} className="text-royal" />
            <h3 className="mt-4 text-lg font-semibold text-ink">
              A calm, private setting
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Treatment rooms are designed for rest, not a waiting-room
              rush — book a time that fits your day.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-line bg-pale py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="font-serif text-3xl font-semibold text-ink sm:text-4xl">
            Frequently asked
          </h2>
          <div className="mt-8 divide-y divide-line border-t border-line">
            {faqs.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-ink">
                  <span className="font-medium">{f.q}</span>
                  <ChevronDown
                    size={18}
                    className="shrink-0 text-ink-soft transition-transform group-open:rotate-180"
                  />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="flex flex-col items-start justify-between gap-6 rounded-[2rem] bg-royal px-8 py-12 sm:px-12 md:flex-row md:items-center">
          <div>
            <h2 className="font-serif text-3xl font-semibold text-white">
              Ready to feel it?
            </h2>
            <p className="mt-2 max-w-sm text-white/80">
              Choose a treatment, pick a time, and a licensed nurse will take
              it from there.
            </p>
          </div>
          <Link
            href="/booking"
            className="whitespace-nowrap rounded-full bg-white px-7 py-3.5 text-sm font-medium text-royal transition-transform hover:scale-[1.02]"
          >
            Book your session
          </Link>
        </div>
      </section>
    </main>
  );
}
