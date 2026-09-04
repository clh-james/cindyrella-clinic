import Image from "next/image";

export const metadata = {
  title: "Gallery — Cindyrella Medical Group",
};

// Placeholder images for the gallery until the owner uploads real ones
const galleryImages = [
  { src: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=800", alt: "Clinic Interior" },
  { src: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=800", alt: "IV Drip Therapy" },
  { src: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=800", alt: "Medical Staff" },
  { src: "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&q=80&w=800", alt: "Wellness Experience" },
  { src: "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&q=80&w=800", alt: "Treatment Room" },
  { src: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=800", alt: "Healthy Glow" },
];

export default function GalleryPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <header className="mb-12 max-w-2xl">
        <h1 className="font-serif text-4xl font-semibold text-ink sm:text-5xl">
          Gallery
        </h1>
        <p className="mt-4 text-lg text-ink-soft">
          Take a look inside our clinic and see the Cindyrella experience for yourself. 
          A clean, professional, and calming environment awaits you.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {galleryImages.map((img, idx) => (
          <div key={idx} className="group relative aspect-square overflow-hidden rounded-2xl bg-pale">
            <Image 
              src={img.src} 
              alt={img.alt} 
              fill 
              className="object-cover transition-transform duration-500 group-hover:scale-105" 
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-end p-6">
              <span className="text-white font-medium text-lg">{img.alt}</span>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
