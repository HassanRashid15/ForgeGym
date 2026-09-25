import { apiRequest } from "@/api/client";

export type GeoSearchResult = {
  results?: Array<{
    id?: string;
    label?: string;
    lat?: number;
    lon?: number;
    city?: string | null;
    region?: string | null;
    country?: string | null;
    [key: string]: unknown;
  }>;
  provider?: string;
  [key: string]: unknown;
};

export type GeoReverseResult = {
  label?: string;
  lat?: number;
  lon?: number;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  provider?: string;
  [key: string]: unknown;
};

export type GeoDistanceResult = {
  results?: Array<{
    id?: string | null;
    lat?: number;
    lon?: number;
    distanceKm?: number | null;
    straightKm?: number | null;
    source?: "google" | "haversine";
    profile?: "driving" | "walking" | "foot";
  }>;
  provider?: string;
};

export async function searchGeo(q: string) {
  return apiRequest<GeoSearchResult>("geo", "search", { query: { q } });
}

export async function reverseGeo(lat: number, lon: number) {
  return apiRequest<GeoReverseResult>("geo", "reverse", {
    query: { lat, lon },
  });
}

/** Google Distance Matrix (pass destination address for accurate street pin). */
export async function routeDistances(params: {
  from: { lat: number; lon: number };
  destinations: Array<{
    id?: string;
    lat: number;
    lon: number;
    address?: string | null;
  }>;
  profile?: "driving" | "foot";
}) {
  return apiRequest<GeoDistanceResult>("geo", "distance", {
    body: params,
  });
}
