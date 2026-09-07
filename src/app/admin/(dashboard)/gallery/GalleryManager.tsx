"use client";

import { useState, useEffect, useRef } from "react";
import { UploadCloud, Trash2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface GalleryImage {
  name: string;
  id: string | null;
  updated_at: string | null;
  created_at: string | null;
  url: string;
}

export function GalleryManager() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchImages() {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.storage.from("gallery").list();
      
      if (error) throw error;
      
      // Filter out any hidden files or empty folders like .emptyFolderPlaceholder
      const validFiles = data?.filter(file => file.name !== '.emptyFolderPlaceholder' && !file.name.startsWith('.')) || [];
      
      // Get public URLs for each file
      const filesWithUrls = validFiles.map(file => {
        const { data: urlData } = supabase.storage.from("gallery").getPublicUrl(file.name);
        return {
          ...file,
          url: urlData.publicUrl
        };
      }).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      
      setImages(filesWithUrls);
    } catch (err) {
      console.error("Error fetching images:", err);
      setError("Failed to load images. Please ensure the gallery storage bucket is configured.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    
    try {
      // Create a unique file name to prevent overwriting
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("gallery")
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });
        
      if (uploadError) throw uploadError;
      
      // Refresh the image list
      await fetchImages();
    } catch (err) {
      console.error("Error uploading image:", err);
      setError("Failed to upload image. Please check your permissions.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleDelete(fileName: string) {
    if (!window.confirm("Are you sure you want to delete this image?")) return;
    
    try {
      const { error } = await supabase.storage.from("gallery").remove([fileName]);
      if (error) throw error;
      
      // Refresh the list
      await fetchImages();
    } catch (err) {
      console.error("Error deleting image:", err);
      setError("Failed to delete image.");
    }
  }

  return (
    <div>
      <div className="mt-8 max-w-2xl rounded-2xl border border-line bg-pale p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-royal shadow-sm">
          <UploadCloud size={28} />
        </div>
        <h2 className="mt-4 font-serif text-xl font-medium text-ink">Upload a new photo</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Select an image file to add to the public gallery.
        </p>
        
        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}
        
        <div className="mt-6">
          <input 
            type="file" 
            id="gallery-file-upload"
            accept="image/*" 
            className="sr-only" 
            ref={fileInputRef}
            onChange={handleFileUpload}
            disabled={isUploading}
          />
          <label 
            htmlFor="gallery-file-upload"
            className={`inline-flex items-center gap-2 rounded-full bg-royal px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-royal-deep cursor-pointer ${
              isUploading ? "opacity-70 pointer-events-none" : ""
            }`}
          >
            {isUploading && <Loader2 size={16} className="animate-spin" />}
            {isUploading ? "Uploading..." : "Select files"}
          </label>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="font-serif text-lg font-medium text-ink">Recent Uploads</h2>
        
        {isLoading ? (
          <div className="mt-4 flex h-32 items-center justify-center rounded-2xl border border-line text-sm text-ink-soft">
            <Loader2 size={20} className="mr-2 animate-spin text-royal" /> Loading images...
          </div>
        ) : images.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-line p-8 text-center text-sm text-ink-soft">
            No images uploaded yet.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {images.map((image) => (
              <div key={image.id || image.name} className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-pale">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={image.url} 
                  alt={image.name} 
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                
                {/* Overlay with delete button */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <button 
                    onClick={() => handleDelete(image.name)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-red-600 shadow-md transition-transform hover:scale-110"
                    title="Delete image"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
