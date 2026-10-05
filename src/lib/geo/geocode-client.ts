/** Browser-side geocode: Google via /api/geo/search, then Nominatim. */

export type GeocodedPlace = {
  lat: number;
  lon: number;
  label?: string;
  city?: string | null;
  region?: string | null;
  country?: string | null;
};

function toCoord(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Progressive queries so noisy addresses still resolve. */
function queryVariants(raw: string): string[] {
  const q = raw.trim().replace(/\s+/g, " ");
  if (q.length < 4) return [];

  const variants: string[] = [q];

  // Drop leading landmarks / "Near …" fluff
  const withoutNear = q
    .replace(/^near\s+[^,]+,?\s*/i, "")
    .replace(/^[^,]*(round-?about|chowk)[^,]*,?\s*/i, "")
    .trim();
  if (withoutNear.length >= 8 && withoutNear !== q) variants.push(withoutNear);

  // Street number + road + city/country tail
  const parts = q
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 3) {
    // e.g. "415 Main Samanabad Circular Rd, Samanabad Town, Lahore"
    const mid = parts.slice(0, Math.min(4, parts.length)).join(", ");
    if (mid.length >= 8) variants.push(mid);

    // Find city-like token (Lahore) + country
    const cityIdx = parts.findIndex((p) =>
      /lahore|karachi|islamabad|rawalpindi|faisalabad|multan|peshawar|quetta/i.test(
        p,
      ),
    );
    if (cityIdx >= 0) {
      const street = parts
        .slice(0, cityIdx)
        .filter((p) => !/^\d{4,}$/.test(p)) // drop postal alone
        .slice(-2)
        .join(", ");
      const cityPart = parts[cityIdx];
      const country = parts.find((p) => /pakistan/i.test(p)) || "Pakistan";
      if (street) variants.push(`${street}, ${cityPart}, ${country}`);
      variants.push(`${cityPart}, ${country}`);
    }

    // Last 3 meaningful parts
    const tail = parts.slice(-3).join(", ");
    if (tail.length >= 8) variants.push(tail);
  }

  // Dedupe
  const seen = new Set<string>();
  return variants.filter((v) => {
    const key = v.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function geocodeOnce(q: string): Promise<GeocodedPlace | null> {
  try {
    const res = await fetch(`/api/geo/search?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = (await res.json()) as {
        results?: Array<{
          lat?: number;
          lon?: number;
          label?: string;
          city?: string | null;
          region?: string | null;
          country?: string | null;
        }>;
      };
      const hit = data.results?.[0];
      const lat = toCoord(hit?.lat);
      const lon = toCoord(hit?.lon);
      if (lat != null && lon != null) {
        return {
          lat,
          lon,
          label: hit?.label,
          city: hit?.city ?? null,
          region: hit?.region ?? null,
          country: hit?.country ?? null,
        };
      }
    }
  } catch {
    /* fall through */
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", q);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("countrycodes", "pk");
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        // Nominatim usage policy — identify the app
        "Accept-Language": "en",
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{
      lat?: string;
      lon?: string;
      display_name?: string;
      address?: {
        city?: string;
        town?: string;
        state?: string;
        country?: string;
      };
    }>;
    const hit = data[0];
    const lat = toCoord(hit?.lat);
    const lon = toCoord(hit?.lon);
    if (lat == null || lon == null) return null;
    return {
      lat,
      lon,
      label: hit?.display_name,
      city: hit?.address?.city || hit?.address?.town || null,
      region: hit?.address?.state || null,
      country: hit?.address?.country || null,
    };
  } catch {
    return null;
  }
}

export async function geocodeAddressClient(
  query: string,
): Promise<GeocodedPlace | null> {
  const variants = queryVariants(query);
  for (const q of variants) {
    const place = await geocodeOnce(q);
    if (place) return place;
  }
  return null;
}

/** Reverse geocode lat/lng → label (Nominatim; no Mapbox required). */
export async function reverseGeocodeClient(
  lat: number,
  lon: number,
): Promise<GeocodedPlace | null> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "1");
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json", "Accept-Language": "en" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      display_name?: string;
      address?: {
        city?: string;
        town?: string;
        state?: string;
        country?: string;
      };
    };
    return {
      lat,
      lon,
      label: data.display_name,
      city: data.address?.city || data.address?.town || null,
      region: data.address?.state || null,
      country: data.address?.country || null,
    };
  } catch {
    return { lat, lon };
  }
}
