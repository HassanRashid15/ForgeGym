import { createOgImage } from "@/lib/og-image";

// Must be literal exports — Next.js parses these at compile time.
export const alt = "Forge Gym";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
  return createOgImage();
}
