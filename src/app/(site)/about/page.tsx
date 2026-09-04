export const metadata = {
  title: "About Us — Cindyrella Medical Group",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <header className="mb-12">
        <h1 className="font-serif text-4xl font-semibold text-ink sm:text-5xl">
          About Us
        </h1>
      </header>

      <div className="space-y-8 text-lg text-ink-soft leading-relaxed">
        <p>
          At <strong>Cindyrella Medical Group</strong>, we believe that true confidence starts from within. 
          Founded with a passion for wellness and aesthetics, our clinic provides top-tier, nurse-administered IV drip therapies designed to rejuvenate your body, mind, and spirit.
        </p>

        <p>
          Our mission is to unlock your ultimate confidence, inside and out. We specialize in tailored formulations that target hydration, skin glow, recovery, and energy enhancement. Whether you&apos;re preparing for a big event, recovering from a long week, or simply maintaining your overall well-being, we have a signature drip just for you.
        </p>

        <p>
          Safety and quality are our highest priorities. Every session is conducted in a private, clinical setting by licensed nurses using FDA-approved formulations. We designed our space to feel less like a hospital and more like a serene spa, ensuring you can relax fully while receiving your treatment.
        </p>

        <p>
          Located in the heart of Davao City at Coronet Property Holdings Corp Bldg 3, we are proud to serve our community with same-week appointments and flexible scheduling.
        </p>

        <div className="mt-12 rounded-2xl bg-pale p-8 text-ink">
          <h2 className="font-serif text-2xl font-semibold mb-4">Our Commitment</h2>
          <ul className="list-disc pl-5 space-y-2 text-ink-soft">
            <li><strong>Clinical Precision:</strong> Administered by licensed nurses under strict physician-approved protocols.</li>
            <li><strong>Visible Results:</strong> Targeted formulations for clear, specific outcomes.</li>
            <li><strong>Premium Care:</strong> A calm, private setting designed for your ultimate comfort.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
