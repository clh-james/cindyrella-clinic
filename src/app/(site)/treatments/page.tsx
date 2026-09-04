import Link from "next/link";
import { treatments, peso } from "@/lib/treatments";

export const metadata = {
  title: "Treatments — Cindyrella Medical Group",
};

export default function TreatmentsPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <header className="max-w-2xl">
        <h1 className="font-serif text-4xl font-semibold text-ink sm:text-5xl">
          Rx IV Treatments
        </h1>
        <p className="mt-4 text-ink-soft">
          Every formulation is administered by a licensed nurse. Package
          pricing rewards clients who return for ongoing sessions.
        </p>
      </header>

      {/* Pricing table, matching the clinic's printed price list */}
      <div className="mt-12 overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="bg-pale text-left text-ink">
              <th className="px-6 py-4 font-semibold">IV Treatment</th>
              <th className="px-6 py-4 font-semibold">/ Session</th>
              <th className="px-6 py-4 font-semibold">5 + 1</th>
              <th className="px-6 py-4 font-semibold">10 + 2</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody>
            {treatments.map((t, i) => (
              <tr
                key={t.slug}
                className={i !== treatments.length - 1 ? "border-b border-line" : ""}
              >
                <td className="px-6 py-4 font-medium text-ink">
                  <div className="flex items-center gap-2.5">
                    {t.name}
                    {t.badge && (
                      <span className="whitespace-nowrap rounded-full bg-gold-soft px-2.5 py-1 text-[11px] font-medium text-gold">
                        {t.badge}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-ink-soft">{peso(t.session)}</td>
                <td className="px-6 py-4 text-ink-soft">{peso(t.fivePlusOne)}</td>
                <td className="px-6 py-4 text-ink-soft">{peso(t.tenPlusTwo)}</td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href="/booking"
                    className="text-sm font-medium text-royal hover:text-royal-deep"
                  >
                    Book
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-ink-soft">
        Results vary from person to person. Factors such as lifestyle, skin
        condition, sun exposure, and adherence to a skincare routine may
        affect outcomes.
      </p>

      {/* Detail cards */}
      <div className="mt-16 grid gap-6 md:grid-cols-2">
        {treatments.map((t) => (
          <div
            key={t.slug}
            id={t.slug}
            className="flex flex-col rounded-2xl border border-line p-7"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-serif text-2xl font-semibold text-ink">
                {t.name}
              </h2>
              <span className="whitespace-nowrap text-sm text-ink-soft">
                {t.duration}
              </span>
            </div>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 font-medium text-ink">Primary</dt>
                <dd className="text-ink-soft">{t.primary}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 font-medium text-ink">Secondary</dt>
                <dd className="text-ink-soft">{t.secondary}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 font-medium text-ink">Best for</dt>
                <dd className="text-ink-soft">{t.bestFor}</dd>
              </div>
            </dl>

            <div className="mt-6 flex items-center justify-between border-t border-line pt-5">
              <span className="text-xl font-semibold text-ink">
                {peso(t.session)}
                <span className="ml-1 text-sm font-normal text-ink-soft">/ session</span>
              </span>
              <Link
                href="/booking"
                className="rounded-full bg-royal px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-royal-deep"
              >
                Book this
              </Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
