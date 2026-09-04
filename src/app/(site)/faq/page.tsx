import { ChevronDown } from "lucide-react";

export const metadata = {
  title: "FAQs — Cindyrella Medical Group",
};

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
  {
    q: "Do you accept walk-ins?",
    a: "We highly encourage booking an appointment in advance to secure your spot, but walk-ins are accepted based on nurse availability.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept Cash, GCash, Maya, Bank Transfer, and Credit/Debit Cards.",
  }
];

export default function FAQPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <header className="mb-12">
        <h1 className="font-serif text-4xl font-semibold text-ink sm:text-5xl">
          Frequently Asked Questions
        </h1>
        <p className="mt-4 text-lg text-ink-soft">
          Find answers to common questions about our treatments, booking process, and policies.
        </p>
      </header>

      <div className="divide-y divide-line border-t border-line">
        {faqs.map((f) => (
          <details key={f.q} className="group py-6">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-ink">
              <span className="font-medium text-lg">{f.q}</span>
              <ChevronDown
                size={20}
                className="shrink-0 text-ink-soft transition-transform group-open:rotate-180"
              />
            </summary>
            <p className="mt-4 text-ink-soft leading-relaxed">
              {f.a}
            </p>
          </details>
        ))}
      </div>
    </main>
  );
}
