"use client";

import { useState } from "react";
import { GymImageLightbox } from "@/components/gyms/GymImageLightbox";

type GymGalleryProps = {
  gymName: string;
  images: string[];
};

/**
 * Gym photo grid — click any image to open a full-screen preview.
 */
export function GymGallery({ gymName, images }: GymGalleryProps) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        {images.map((src, i) => (
          <button
            key={`${src}-${i}`}
            type="button"
            onClick={() => setPreviewIndex(i)}
            className={`group relative overflow-hidden rounded-xl border border-border text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              i === 0
                ? "col-span-2 aspect-[16/9] md:col-span-2 md:row-span-2 md:aspect-auto md:min-h-[420px]"
                : "aspect-square"
            }`}
            aria-label={`Preview ${gymName} photo ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`${gymName} photo ${i + 1}`}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            />
            <span className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/20" />
          </button>
        ))}
      </div>

      <GymImageLightbox
        images={images}
        startIndex={previewIndex ?? 0}
        alt={`${gymName} photo`}
        open={previewIndex != null}
        onClose={() => setPreviewIndex(null)}
      />
    </>
  );
}
