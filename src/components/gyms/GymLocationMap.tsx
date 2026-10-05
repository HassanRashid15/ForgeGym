"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ExternalLink, Loader2, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mapsDirectionsUrl } from "@/lib/geo/navigate";

const LeafletGymPinMap = dynamic(
  () =>
    import("@/components/gyms/LeafletGymPinMap").then((m) => m.LeafletGymPinMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(70vh,560px)] w-full items-center justify-center bg-muted/40 text-sm text-muted-foreground">
        Loading map…
      </div>
    ),
  },
);

type GymLocationMapProps = {
  gymName: string;
  address?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type Coords = { lat: number; lon: number };

function toCoord(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function hasCoords(lat: number | null, lon: number | null): lat is number {
  return lat != null && lon != null;
}

function googleSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

async function geocodeAddress(query: string): Promise<Coords | null> {
  const q = query.trim();
  if (q.length < 4) return null;

  // Prefer app geo API (Google) when configured
  try {
    const res = await fetch(`/api/geo/search?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = (await res.json()) as {
        results?: Array<{ lat?: number; lon?: number }>;
      };
      const hit = data.results?.[0];
      const lat = toCoord(hit?.lat);
      const lon = toCoord(hit?.lon);
      if (hasCoords(lat, lon)) return { lat, lon };
    }
  } catch {
    /* fall through */
  }

  // Free Nominatim fallback (display-only; no billing)
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", q);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat?: string; lon?: string }>;
    const hit = data[0];
    const lat = toCoord(hit?.lat);
    const lon = toCoord(hit?.lon);
    if (hasCoords(lat, lon)) return { lat, lon };
  } catch {
    /* ignore */
  }

  return null;
}

/**
 * Public gym page map — Leaflet pin when lat/lng exist, or geocode address as fallback.
 */
export function GymLocationMap({
  gymName,
  address,
  city,
  latitude,
  longitude,
}: GymLocationMapProps) {
  const savedLat = toCoord(latitude);
  const savedLon = toCoord(longitude);
  const addressTrim = address?.trim() || "";
  const cityTrim = city?.trim() || "";
  const locationLabel = (() => {
    if (!addressTrim && !cityTrim) return null;
    if (!addressTrim) return cityTrim;
    if (!cityTrim) return addressTrim;
    // Avoid "…Lahore, Pakistan, Lahore" which breaks geocoders
    if (addressTrim.toLowerCase().includes(cityTrim.toLowerCase())) {
      return addressTrim;
    }
    return `${addressTrim}, ${cityTrim}`;
  })();

  const [resolved, setResolved] = useState<Coords | null>(
    hasCoords(savedLat, savedLon) ? { lat: savedLat, lon: savedLon } : null,
  );
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeFailed, setGeocodeFailed] = useState(false);

  useEffect(() => {
    if (hasCoords(savedLat, savedLon)) {
      setResolved({ lat: savedLat, lon: savedLon });
      setGeocodeFailed(false);
      return;
    }

    const query = locationLabel;
    if (!query) {
      setResolved(null);
      return;
    }

    let cancelled = false;
    setGeocoding(true);
    setGeocodeFailed(false);
    void (async () => {
      const coords = await geocodeAddress(query);
      if (cancelled) return;
      setResolved(coords);
      setGeocodeFailed(!coords);
      setGeocoding(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [savedLat, savedLon, locationLabel]);

  if (!hasCoords(savedLat, savedLon) && !locationLabel) return null;

  const pinned = resolved != null;
  const pinLabel = gymName.trim() || "Gym";
  const directionsHref = pinned
    ? mapsDirectionsUrl(resolved.lat, resolved.lon)
    : googleSearchUrl([gymName, locationLabel].filter(Boolean).join(" "));
  const openInMapsHref = pinned
    ? `https://www.openstreetmap.org/?mlat=${resolved.lat}&mlon=${resolved.lon}#map=16/${resolved.lat}/${resolved.lon}`
    : directionsHref;

  return (
    <section className="border-t border-border py-20 md:py-28">
      <div className="container mx-auto px-4 md:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-primary">
              Location
            </p>
            <h2 className="font-display text-4xl tracking-normal md:text-5xl">
              Find us
            </h2>
            {locationLabel ? (
              <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground sm:text-base">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{locationLabel}</span>
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="shrink-0 gap-2">
              <a href={openInMapsHref} target="_blank" rel="noopener noreferrer">
                <MapPin className="h-4 w-4" />
                Open map
                <ExternalLink className="h-3.5 w-3.5 opacity-60" />
              </a>
            </Button>
            <Button asChild className="shrink-0 gap-2">
              <a href={directionsHref} target="_blank" rel="noopener noreferrer">
                <Navigation className="h-4 w-4" />
                Get directions
              </a>
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {pinned ? (
            <LeafletGymPinMap
              gymName={pinLabel}
              addressLabel={locationLabel}
              latitude={resolved.lat}
              longitude={resolved.lon}
            />
          ) : geocoding ? (
            <div className="flex h-48 flex-col items-center justify-center gap-3 px-6 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Finding this address on the map…
              </p>
            </div>
          ) : (
            <div className="flex h-48 flex-col items-center justify-center gap-3 px-6 text-center">
              <MapPin className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {geocodeFailed
                  ? "Couldn’t place this address on the map — open Maps to search it."
                  : "Coordinates not set yet — open Maps to search this address."}
              </p>
              <Button asChild variant="outline" size="sm" className="gap-2">
                <a href={directionsHref} target="_blank" rel="noopener noreferrer">
                  <Navigation className="h-3.5 w-3.5" />
                  Search on Maps
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
