import { GalleryManager } from "./GalleryManager";

export const metadata = { title: "Gallery Management — Admin" };

export default function GalleryManagementPage() {
  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-ink">Gallery Management</h1>
      <p className="mt-1 text-sm text-ink-soft">Upload and manage photos for the public Gallery page.</p>

      <GalleryManager />
    </div>
  );
}
