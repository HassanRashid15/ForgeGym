import { haversineKm } from "@/lib/geo/distance";

const GMAPS = "https://maps.googleapis.com/maps/api";

export function getGoogleMapsApiKey(): string | null {
  const key =
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_SERVER_KEY?.trim() ||
    "";
  return key || null;
}

export function hasGoogleMapsApiKey(): boolean {
  return Boolean(getGoogleMapsApiKey());
}

export type GooglePlaceSuggestion = {
  id: string;
  label: string;
  lat: number;
  lon: number;
  city: string | null;
  region: string | null;
  country: string | null;
};

function cityFromGoogleComponents(
  components: Array<{ long_name: string; short_name: string; types: string[] }> | undefined,
): { city: string | null; region: string | null; country: string | null } {
  if (!components?.length) return { city: null, region: null, country: null };
  const find = (...types: string[]) =>
    components.find((c) => types.some((t) => c.types.includes(t)))?.long_name ??
    null;
  return {
    city:
      find("locality", "postal_town") ||
      find("sublocality", "administrative_area_level_2") ||
      null,
    region: find("administrative_area_level_1"),
    country: find("country"),
  };
}

/** Geocode freeform address → lat/lng (biased to Pakistan). */
export async function googleGeocode(
  q: string,
): Promise<GooglePlaceSuggestion | null> {
  const key = getGoogleMapsApiKey();
  if (!key) return null;
  const query = q.trim();
  if (query.length < 2) return null;

  const url = new URL(`${GMAPS}/geocode/json`);
  url.searchParams.set("address", query);
  url.searchParams.set("key", key);
  url.searchParams.set("components", "country:PK");
  url.searchParams.set("language", "en");

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    status?: string;
    results?: Array<{
      place_id?: string;
      formatted_address?: string;
      geometry?: { location?: { lat?: number; lng?: number } };
      address_components?: Array<{
        long_name: string;
        short_name: string;
        types: string[];
      }>;
    }>;
  };

  if (data.status !== "OK" || !data.results?.[0]) return null;
  const r = data.results[0];
  const lat = r.geometry?.location?.lat;
  const lon = r.geometry?.location?.lng;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const place = cityFromGoogleComponents(r.address_components);
  return {
    id: r.place_id || `${lat},${lon}`,
    label: r.formatted_address || query,
    lat: lat!,
    lon: lon!,
    city: place.city,
    region: place.region,
    country: place.country,
  };
}

/** Reverse geocode lat/lng → place label. */
export async function googleReverseGeocode(
  lat: number,
  lon: number,
): Promise<GooglePlaceSuggestion | null> {
  const key = getGoogleMapsApiKey();
  if (!key) return null;

  const url = new URL(`${GMAPS}/geocode/json`);
  url.searchParams.set("latlng", `${lat},${lon}`);
  url.searchParams.set("key", key);
  url.searchParams.set("language", "en");

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    status?: string;
    results?: Array<{
      place_id?: string;
      formatted_address?: string;
      geometry?: { location?: { lat?: number; lng?: number } };
      address_components?: Array<{
        long_name: string;
        short_name: string;
        types: string[];
      }>;
    }>;
  };

  if (data.status !== "OK" || !data.results?.[0]) return null;
  const r = data.results[0];
  const place = cityFromGoogleComponents(r.address_components);
  return {
    id: r.place_id || `${lat},${lon}`,
    label: r.formatted_address || `${lat},${lon}`,
    lat: r.geometry?.location?.lat ?? lat,
    lon: r.geometry?.location?.lng ?? lon,
    city: place.city,
    region: place.region,
    country: place.country,
  };
}

/** Several geocode hits for autocomplete-style search. */
export async function googleGeocodeSuggestions(
  q: string,
  limit = 6,
): Promise<GooglePlaceSuggestion[]> {
  const key = getGoogleMapsApiKey();
  if (!key) return [];
  const query = q.trim();
  if (query.length < 2) return [];

  const url = new URL(`${GMAPS}/geocode/json`);
  url.searchParams.set("address", query);
  url.searchParams.set("key", key);
  url.searchParams.set("components", "country:PK");
  url.searchParams.set("language", "en");

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    status?: string;
    results?: Array<{
      place_id?: string;
      formatted_address?: string;
      geometry?: { location?: { lat?: number; lng?: number } };
      address_components?: Array<{
        long_name: string;
        short_name: string;
        types: string[];
      }>;
    }>;
  };

  if (data.status !== "OK" || !data.results?.length) return [];

  return data.results.slice(0, limit).flatMap((r) => {
    const lat = r.geometry?.location?.lat;
    const lon = r.geometry?.location?.lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];
    const place = cityFromGoogleComponents(r.address_components);
    return [
      {
        id: r.place_id || `${lat},${lon}`,
        label: r.formatted_address || query,
        lat: lat!,
        lon: lon!,
        city: place.city,
        region: place.region,
        country: place.country,
      },
    ];
  });
}

export type GoogleDistanceResult = {
  distanceKm: number | null;
  straightKm: number;
  source: "google" | "haversine";
  profile: "driving" | "walking";
};

/**
 * Google Distance Matrix — prefer destination address when provided
 * (fixes wrong stored pins: Google resolves the real street).
 */
export async function googleDistanceMatrixKm(params: {
  fromLat: number;
  fromLon: number;
  destinations: Array<{ lat: number; lon: number; address?: string | null }>;
  mode?: "driving" | "walking";
}): Promise<GoogleDistanceResult[]> {
  const key = getGoogleMapsApiKey();
  const mode = params.mode ?? "driving";
  const straight = params.destinations.map((d) =>
    haversineKm(params.fromLat, params.fromLon, d.lat, d.lon),
  );

  if (!key || params.destinations.length === 0) {
    return straight.map((straightKm) => ({
      distanceKm: straightKm,
      straightKm,
      source: "haversine" as const,
      profile: mode === "walking" ? ("walking" as const) : ("driving" as const),
    }));
  }

  const origins = `${params.fromLat},${params.fromLon}`;
  const destinations = params.destinations
    .map((d) => {
      const addr = (d.address || "").trim();
      if (addr.length >= 8) return addr;
      return `${d.lat},${d.lon}`;
    })
    .join("|");

  const url = new URL(`${GMAPS}/distancematrix/json`);
  url.searchParams.set("origins", origins);
  url.searchParams.set("destinations", destinations);
  url.searchParams.set("mode", mode);
  url.searchParams.set("units", "metric");
  url.searchParams.set("key", key);
  url.searchParams.set("region", "pk");

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) {
    throw new Error(`Google Distance Matrix HTTP ${res.status}`);
  }

  const data = (await res.json()) as {
    status?: string;
    rows?: Array<{
      elements?: Array<{
        status?: string;
        distance?: { value?: number; text?: string };
      }>;
    }>;
  };

  if (data.status !== "OK" || !data.rows?.[0]?.elements) {
    throw new Error(`Google Distance Matrix status: ${data.status || "unknown"}`);
  }

  const elements = data.rows[0].elements;
  return params.destinations.map((_, i) => {
    const el = elements[i];
    const meters = el?.status === "OK" ? el.distance?.value : null;
    const distanceKm =
      meters != null && Number.isFinite(meters) ? meters / 1000 : straight[i] ?? null;
    return {
      distanceKm,
      straightKm: straight[i] ?? 0,
      source:
        meters != null && Number.isFinite(meters)
          ? ("google" as const)
          : ("haversine" as const),
      profile: mode === "walking" ? ("walking" as const) : ("driving" as const),
    };
  });
}
