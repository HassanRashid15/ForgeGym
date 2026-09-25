"use client";

import { useState } from "react";
import { GymImageLightbox } from "@/components/gyms/GymImageLightbox";

type GymHeroImageProps = {
  src: string;
  alt: string;
  gallery?: string[];
};

/**
 * Full-bleed gym hero — click opens image preview.
 */
export function GymHeroImage({ src, alt, gallery }: GymHeroImageProps) {
  const [open, setOpen] = useState(false);
  const images =
    gallery && gallery.length > 0
      ? gallery
      : [src];

  return (
    <>
      <button
        type="button"
        className="absolute inset-0 block h-full w-full cursor-zoom-in"
        onClick={() => setOpen(true)}
        aria-label={`Preview ${alt}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      </button>
      <GymImageLightbox
        images={images}
        alt={alt}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
