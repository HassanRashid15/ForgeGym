"use client";

import { Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mapsDirectionsUrl } from "@/lib/geo/navigate";
import { cn } from "@/lib/utils";

type NavigateGymButtonProps = {
  lat: number | null | undefined;
  lon: number | null | undefined;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  label?: string;
};

/**
 * Opens Google Maps (Android/desktop) or Apple Maps (iOS) — free, no API key.
 */
export function NavigateGymButton({
  lat,
  lon,
  className,
  variant = "outline",
  size = "sm",
  label = "Navigate",
}: NavigateGymButtonProps) {
  if (
    typeof lat !== "number" ||
    typeof lon !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lon)
  ) {
    return null;
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn("gap-1.5", className)}
      asChild
    >
      <a
        href={mapsDirectionsUrl(lat, lon)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
      >
        <Navigation className="h-3.5 w-3.5" />
        {label}
      </a>
    </Button>
  );
}
