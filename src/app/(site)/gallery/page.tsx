import Image from "next/image";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Gallery — Cindyrella Medical Group",
};

export const revalidate = 60; // Revalidate every minute so new uploads appear relatively quickly

export default async function GalleryPage() {
  const supabase = await createClient();
  
  // Fetch images from the "gallery" bucket
  const { data: storageData, error } = await supabase.storage.from("gallery").list();
  
  let galleryImages: { src: string; alt: string }[] = [];
  
  if (!error && storageData) {
    // Filter out any hidden files or empty folders like .emptyFolderPlaceholder
    const validFiles = storageData.filter(file => file.name !== '.emptyFolderPlaceholder' && !file.name.startsWith('.'));
    
    // Sort by created_at descending
    validFiles.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    
    // Get public URLs
    galleryImages = validFiles.map(file => {
      const { data: urlData } = supabase.storage.from("gallery").getPublicUrl(file.name);
      return {
        src: urlData.publicUrl,
        alt: file.name
      };
    });
  }

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

      {galleryImages.length === 0 ? (
        <div className="rounded-2xl border border-line p-12 text-center text-ink-soft bg-pale">
          Check back soon for our updated gallery photos!
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {galleryImages.map((img, idx) => (
            <div key={idx} className="group relative aspect-square overflow-hidden rounded-2xl bg-pale">
              <Image 
                src={img.src} 
                alt={img.alt} 
                fill 
                className="object-cover transition-transform duration-500 group-hover:scale-105" 
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
