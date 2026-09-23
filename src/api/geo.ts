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
  [key: string]: unknown;
};

export type GeoReverseResult = {
  label?: string;
  lat?: number;
  lon?: number;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  [key: string]: unknown;
};

export async function searchGeo(q: string) {
  return apiRequest<GeoSearchResult>("geo", "search", { query: { q } });
}

export async function reverseGeo(lat: number, lon: number) {
  return apiRequest<GeoReverseResult>("geo", "reverse", {
    query: { lat, lon },
  });
}
