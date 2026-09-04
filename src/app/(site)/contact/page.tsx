import { Mail, MapPin, Phone } from "lucide-react";

export const metadata = {
  title: "Contact Us — Cindyrella Medical Group",
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <header className="mb-12">
        <h1 className="font-serif text-4xl font-semibold text-ink sm:text-5xl">
          Contact Us
        </h1>
        <p className="mt-4 text-lg text-ink-soft">
          We would love to hear from you. Reach out to us for any inquiries or to book an appointment.
        </p>
      </header>

      <div className="grid gap-12 md:grid-cols-2">
        <div className="space-y-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pale text-royal">
              <MapPin size={24} />
            </div>
            <div>
              <h3 className="font-serif text-xl font-medium text-ink">Our Location</h3>
              <p className="mt-2 text-ink-soft leading-relaxed">
                Unit 15&16, 2nd Floor, Coronet Property Holdings Corp Bldg 3,<br />
                Quimpo Blvd., Davao City<br />
                <em>(Landmark: Front of Felcris)</em>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pale text-royal">
              <Phone size={24} />
            </div>
            <div>
              <h3 className="font-serif text-xl font-medium text-ink">Phone</h3>
              <p className="mt-2 text-ink-soft leading-relaxed">
                09302245668
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pale text-royal">
              <Mail size={24} />
            </div>
            <div>
              <h3 className="font-serif text-xl font-medium text-ink">Email</h3>
              <p className="mt-2 text-ink-soft leading-relaxed">
                cindyrelladripdavao26@gmail.com
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-paper p-8">
          <h2 className="font-serif text-2xl font-medium text-ink mb-6">Send us a message</h2>
          <form className="flex flex-col gap-4">
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-medium text-ink">Name</label>
              <input type="text" id="name" className="w-full rounded-lg border border-line bg-transparent px-4 py-2.5 text-sm outline-none focus:border-royal" placeholder="Your name" />
            </div>
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-ink">Email</label>
              <input type="email" id="email" className="w-full rounded-lg border border-line bg-transparent px-4 py-2.5 text-sm outline-none focus:border-royal" placeholder="Your email" />
            </div>
            <div>
              <label htmlFor="message" className="mb-2 block text-sm font-medium text-ink">Message</label>
              <textarea id="message" rows={4} className="w-full rounded-lg border border-line bg-transparent px-4 py-2.5 text-sm outline-none focus:border-royal" placeholder="How can we help you?"></textarea>
            </div>
            <button type="button" className="mt-2 rounded-full bg-royal px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-royal-deep">
              Send Message
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
