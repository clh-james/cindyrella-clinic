import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { TikTokEmbed } from "@/components/TikTokEmbed";
import { Slideshow } from "@/components/Slideshow";
import { AnimatedStats } from "@/components/AnimatedStats";
import { FadeIn } from "@/components/FadeIn";
import { FloatingElement } from "@/components/FloatingElement";
import { RippleButton } from "@/components/RippleButton";
import {
  ShieldCheck,
  Clock,
  Sparkles,
  Syringe,
  Star,
  ChevronDown,
  Check,
} from "lucide-react";

const trust = [
  "Licensed Medical Professionals",
  "FDA-Approved IV Formulations",
  "Sterile Equipment",
  "5000+ Successful Treatments",
  "4.9★ Customer Rating",
  "Doctor Supervised",
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
      <section className="relative mx-auto grid max-w-6xl gap-10 px-6 pb-16 pt-14 md:grid-cols-[1.05fr_0.95fr] md:gap-8 md:pb-24 md:pt-20">
        <FloatingElement className="absolute top-10 left-10 text-royal/10 pointer-events-none hidden md:block">
          <Sparkles size={120} />
        </FloatingElement>
        
        <FadeIn direction="left" className="flex flex-col justify-center relative z-10">
          <div className="flex items-center gap-3 text-base font-medium text-royal">
            <Image src="/logo.png" alt="Cindyrella Logo" width={40} height={40} />
            <span>Cindyrella Medical Group</span>
          </div>
          <h1 className="mt-6 font-serif text-5xl font-semibold leading-[1.05] text-ink sm:text-6xl">
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
            <RippleButton
              href="/booking"
              className="rounded-full bg-royal px-7 py-3.5 text-sm font-medium text-white transition-colors hover:bg-royal-deep"
            >
              Book now
            </RippleButton>
            <RippleButton
              href="/treatments"
              className="rounded-full border border-line px-7 py-3.5 text-sm font-medium text-ink transition-colors hover:border-royal hover:text-royal"
            >
              View treatments
            </RippleButton>
          </div>

          <ul className="mt-12 grid max-w-md grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-6">
            {trust.map((label) => (
              <li key={label} className="flex items-start gap-2">
                <Check size={16} className="text-royal shrink-0 mt-0.5" />
                <span className="text-xs font-medium text-ink-soft leading-snug">{label}</span>
              </li>
            ))}
          </ul>
        </FadeIn>

        <FadeIn direction="right" className="relative h-fit self-center z-10">
          <div className="aspect-[3/4] w-full overflow-hidden rounded-[2rem] relative bg-pale">
            <Slideshow />
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
        </FadeIn>
      </section>

      <AnimatedStats />

      {/* Treatments preview */}
      <section className="relative border-t border-line bg-pale py-20 overflow-hidden">
        <FloatingElement delay={1} className="absolute right-0 top-1/4 text-royal/5 pointer-events-none hidden lg:block -mr-10">
          <Syringe size={200} />
        </FloatingElement>

        <FadeIn className="mx-auto max-w-6xl px-6 relative z-10">
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

          <div className="mt-10 flex overflow-x-auto snap-x snap-mandatory gap-5 pb-8 -mx-6 px-6 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible sm:pb-0 scrollbar-hide">
            {(treatments || []).map((t, index) => (
              <FadeIn key={t.slug} delay={index * 0.1} className="shrink-0 w-[85vw] snap-center sm:w-auto">
              <Link
                href="/treatments"
                className="group h-full flex flex-col justify-between rounded-3xl border border-line bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_40px_-10px_rgba(30,58,138,0.15)] hover:border-royal"
              >
                <div className="flex flex-col gap-6">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-serif text-xl font-semibold text-ink">
                      {t.name}
                    </h3>
                    {t.badge && (
                      <span className="whitespace-nowrap rounded-full bg-gold-soft px-2.5 py-1 text-[11px] font-semibold text-gold uppercase tracking-wider">
                        {t.badge}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-ink">
                      {peso(t.session_price)}
                    </span>
                  </div>

                  <ul className="space-y-3 mt-2">
                    {(t.best_for ? t.best_for.split(',') : (t.primary_desc ? [t.primary_desc] : [])).slice(0, 3).map((feature: string, i: number) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check size={18} className="mt-0.5 shrink-0 text-gold" />
                        <span className="text-sm text-ink-soft leading-snug">{feature.trim()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="mt-8 pt-6 border-t border-line">
                  <div className="w-full rounded-full bg-royal px-6 py-3.5 text-center text-sm font-medium text-white transition-colors group-hover:bg-royal-deep">
                    Book Now
                  </div>
                </div>
              </Link>
              </FadeIn>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* Packages Section */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <FadeIn>
        <div className="text-center mb-12">
          <h2 className="font-serif text-3xl font-semibold text-ink sm:text-4xl">
            Package Pricing
          </h2>
          <p className="mt-4 text-lg text-ink-soft">
            Commit to your wellness journey and enjoy significant savings with our treatment packages.
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-pale border-b border-line">
                <th className="py-4 px-6 font-semibold text-ink">Package</th>
                <th className="py-4 px-6 font-semibold text-ink text-right">Price</th>
                <th className="py-4 px-6 font-semibold text-ink text-right hidden sm:table-cell">Value</th>
                <th className="py-4 px-6 font-semibold text-royal text-right">Savings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              <tr className="hover:bg-pale/50 transition-colors">
                <td className="py-5 px-6 font-medium text-ink">1 Session</td>
                <td className="py-5 px-6 font-medium text-ink text-right">₱2,999</td>
                <td className="py-5 px-6 text-ink-soft text-right hidden sm:table-cell">-</td>
                <td className="py-5 px-6 text-ink-soft text-right">-</td>
              </tr>
              <tr className="hover:bg-pale/50 transition-colors">
                <td className="py-5 px-6 font-semibold text-ink flex items-center">
                  5 + 1 <span className="text-[10px] font-bold uppercase tracking-wider text-royal bg-royal/10 px-2 py-1 rounded-full ml-3">1 Free</span>
                </td>
                <td className="py-5 px-6 font-semibold text-ink text-right">₱14,995</td>
                <td className="py-5 px-6 text-ink-soft text-right line-through hidden sm:table-cell">₱17,994</td>
                <td className="py-5 px-6 font-semibold text-royal text-right">Save ₱2,999</td>
              </tr>
              <tr className="hover:bg-pale/50 transition-colors bg-royal/5">
                <td className="py-5 px-6 font-bold text-ink flex items-center">
                  10 + 2 <span className="text-[10px] font-bold uppercase tracking-wider text-gold bg-gold/10 px-2 py-1 rounded-full ml-3">2 Free</span>
                </td>
                <td className="py-5 px-6 font-bold text-ink text-right">₱29,990</td>
                <td className="py-5 px-6 text-ink-soft text-right line-through hidden sm:table-cell">₱35,988</td>
                <td className="py-5 px-6 font-bold text-royal text-right">Save ₱5,998</td>
              </tr>
            </tbody>
          </table>
        </div>
        </FadeIn>
      </section>

      {/* Why choose */}
      <section id="about" className="mx-auto max-w-6xl px-6 py-20">
        <FadeIn>
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
        </FadeIn>
      </section>

      {/* TikTok Video */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <FadeIn className="flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1">
            <h2 className="font-serif text-3xl font-semibold text-ink sm:text-4xl">
              See us in action
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-soft">
              Get a glimpse inside our clinic and see real treatments, real results, and what makes the Cindyrella experience so special.
            </p>
            <div className="mt-8">
              <Link
                href="https://www.tiktok.com/@cindyrellabyaryana"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-line px-6 py-3 text-sm font-medium text-ink transition-colors hover:border-royal hover:text-royal"
              >
                Follow us on TikTok
              </Link>
            </div>
          </div>
          <div className="w-full md:w-[360px] lg:w-[400px] shrink-0">
            <TikTokEmbed author="cindyrellabyaryana" videoId="7507188332435361042" />
          </div>
        </FadeIn>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-line bg-pale py-20">
        <FadeIn className="mx-auto max-w-3xl px-6">
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
        </FadeIn>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <FadeIn className="flex flex-col items-start justify-between gap-6 rounded-[2rem] bg-royal px-8 py-12 sm:px-12 md:flex-row md:items-center">
          <div>
            <h2 className="font-serif text-3xl font-semibold text-white">
              Ready to feel it?
            </h2>
            <p className="mt-2 max-w-sm text-white/80">
              Choose a treatment, pick a time, and a licensed nurse will take
              it from there.
            </p>
          </div>
          <RippleButton
            href="/booking"
            className="whitespace-nowrap rounded-full bg-white px-7 py-3.5 text-sm font-medium text-royal transition-transform hover:scale-[1.02] shadow-lg"
          >
            Book your session
          </RippleButton>
        </FadeIn>
      </section>
    </main>
  );
}
