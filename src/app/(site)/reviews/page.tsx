import { Star } from "lucide-react";

export const metadata = {
  title: "Reviews — Cindyrella Medical Group",
};

const reviews = [
  {
    name: "Maria S.",
    rating: 5,
    text: "The best IV drip experience in Davao! The nurses were so gentle and the clinic is stunning. I felt instantly rejuvenated.",
    date: "A week ago"
  },
  {
    name: "John D.",
    rating: 5,
    text: "Highly professional staff. They explained the formulation to me clearly before starting. Will definitely come back for the recovery drip after my gym sessions.",
    date: "2 weeks ago"
  },
  {
    name: "Ana V.",
    rating: 5,
    text: "I booked the glow drip for an upcoming wedding and my skin has never looked better. Plus, it's so easy to book an appointment.",
    date: "1 month ago"
  },
  {
    name: "Kevin T.",
    rating: 4,
    text: "Very clean and private setting. It feels like a spa rather than a clinic. Prices are very reasonable for the quality of service.",
    date: "2 months ago"
  }
];

export default function ReviewsPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <header className="mb-12 max-w-2xl">
        <h1 className="font-serif text-4xl font-semibold text-ink sm:text-5xl">
          Customer Reviews
        </h1>
        <p className="mt-4 text-lg text-ink-soft">
          Don&apos;t just take our word for it. Here is what our clients have to say about their Cindyrella experience.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {reviews.map((review, idx) => (
          <div key={idx} className="rounded-2xl border border-line bg-paper p-8">
            <div className="flex items-center justify-between">
              <span className="font-serif text-xl font-medium text-ink">{review.name}</span>
              <div className="flex gap-1 text-gold">
                {Array.from({ length: review.rating }).map((_, i) => (
                  <Star key={i} size={16} fill="currentColor" strokeWidth={0} />
                ))}
              </div>
            </div>
            <p className="mt-4 text-ink-soft leading-relaxed">
              &quot;{review.text}&quot;
            </p>
            <span className="mt-4 block text-xs text-ink-soft opacity-70">
              {review.date}
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
