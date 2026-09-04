import { UploadCloud } from "lucide-react";

export const metadata = { title: "Gallery Management — Admin" };

export default function GalleryManagementPage() {
  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink">Gallery Management</h1>
      <p className="mt-1 text-sm text-ink-soft">Upload and manage photos for the public Gallery page.</p>

      <div className="mt-8 max-w-2xl rounded-2xl border border-line bg-pale p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-royal shadow-sm">
          <UploadCloud size={28} />
        </div>
        <h2 className="mt-4 font-serif text-xl font-medium text-ink">Upload a new photo</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Drag and drop an image here, or click to browse your files.
        </p>
        
        <button className="mt-6 rounded-full bg-royal px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-royal-deep">
          Select files
        </button>
      </div>

      <div className="mt-12">
        <h2 className="font-serif text-lg font-medium text-ink">Recent Uploads</h2>
        <div className="mt-4 text-sm text-ink-soft rounded-2xl border border-line p-8 text-center">
          No images uploaded yet. Please configure Supabase Storage to enable uploads.
        </div>
      </div>
    </div>
  );
}
