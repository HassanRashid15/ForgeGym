"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type GymImageLightboxProps = {
  images: string[];
  startIndex?: number;
  alt?: string;
  open: boolean;
  onClose: () => void;
};

/**
 * Full-screen image preview for gym gallery / card photos.
 */
export function GymImageLightbox({
  images,
  startIndex = 0,
  alt = "Gym photo",
  open,
  onClose,
}: GymImageLightboxProps) {
  const titleId = useId();
  const [index, setIndex] = useState(startIndex);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) setIndex(startIndex);
  }, [open, startIndex]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const go = useCallback(
    (dir: -1 | 1) => {
      if (images.length < 2) return;
      setIndex((i) => (i + dir + images.length) % images.length);
    },
    [images.length],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, go]);

  if (!mounted || !open || images.length === 0) return null;

  const src = images[Math.min(index, images.length - 1)];

  return createPortal(
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <p id={titleId} className="sr-only">
        {alt} preview
      </p>
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
        aria-label="Close preview"
      >
        <X className="h-5 w-5" />
      </button>

      {images.length > 1 && (
        <>
          <button
            type="button"
            className="absolute left-3 z-10 rounded-full bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20 sm:left-6"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            aria-label="Previous image"
          >
            ‹
          </button>
          <button
            type="button"
            className="absolute right-3 z-10 rounded-full bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20 sm:right-6"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            aria-label="Next image"
          >
            ›
          </button>
        </>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-h-[88vh] max-w-[94vw] object-contain"
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      />

      {images.length > 1 && (
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/70">
          {index + 1} / {images.length}
        </p>
      )}
    </div>,
    document.body,
  );
}
