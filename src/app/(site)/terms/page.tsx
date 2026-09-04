export const metadata = {
  title: "Terms & Conditions — Cindyrella Medical Group",
};

export default function TermsAndConditionsPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <header className="mb-12">
        <h1 className="font-serif text-4xl font-semibold text-ink sm:text-5xl">
          Terms & Conditions
        </h1>
        <p className="mt-4 text-ink-soft">Last updated: September 2026</p>
      </header>

      <div className="space-y-8 text-ink-soft leading-relaxed">
        <section>
          <h2 className="font-serif text-2xl font-semibold text-ink mb-4">1. Agreement to Terms</h2>
          <p>
            By accessing our website and booking our services, you agree to be bound by these Terms and Conditions. If you disagree with any part of the terms, you may not access our services.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-semibold text-ink mb-4">2. Medical Disclaimer</h2>
          <p>
            The IV drip therapies provided by Cindyrella Medical Group are designed to support overall wellness and hydration. They are not intended to diagnose, treat, cure, or prevent any disease. Always consult with your primary care physician before beginning any new treatment or therapy. Results vary from person to person.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-semibold text-ink mb-4">3. Booking and Cancellation Policy</h2>
          <p>
            Appointments can be made online via our booking portal. To secure your slot, full payment or a deposit may be required. 
            We kindly ask for at least 24 hours notice if you need to cancel or reschedule your appointment. Late cancellations or no-shows may be subject to a cancellation fee or forfeiture of your deposit.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-semibold text-ink mb-4">4. Right of Refusal</h2>
          <p>
            Our licensed nurses reserve the right to refuse treatment to any individual if they determine that the therapy is medically contraindicated, if the client is under the influence of drugs or alcohol, or if the client displays inappropriate behavior.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-semibold text-ink mb-4">5. Contact Information</h2>
          <p>
            For any questions regarding these Terms, please contact us at <strong>cindyrelladripdavao26@gmail.com</strong> or call <strong>09302245668</strong>.
          </p>
        </section>
      </div>
    </main>
  );
}
