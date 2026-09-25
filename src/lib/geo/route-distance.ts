import { haversineKm } from "@/lib/geo/distance";
import {
  googleDistanceMatrixKm,
  hasGoogleMapsApiKey,
} from "@/lib/geo/google";

export type RouteDistanceResult = {
  distanceKm: number | null;
  straightKm: number;
  profile: "driving" | "walking";
  source: "google" | "haversine";
};

/**
 * Google Distance Matrix only.
 * Pass destination `address` so Google resolves the real street (fixes bad pins).
 */
export async function resolveRouteDistances(params: {
  fromLat: number;
  fromLon: number;
  destinations: Array<{ lat: number; lon: number; address?: string | null }>;
  profile?: "driving" | "foot";
}): Promise<RouteDistanceResult[]> {
  const mode = params.profile === "foot" ? "walking" : "driving";
  const straight = params.destinations.map((d) =>
    haversineKm(params.fromLat, params.fromLon, d.lat, d.lon),
  );

  if (!hasGoogleMapsApiKey()) {
    return straight.map((straightKm) => ({
      distanceKm: straightKm,
      straightKm,
      profile: mode,
      source: "haversine" as const,
    }));
  }

  const google = await googleDistanceMatrixKm({
    fromLat: params.fromLat,
    fromLon: params.fromLon,
    destinations: params.destinations,
    mode,
  });

  return google.map((g, i) => ({
    distanceKm: g.distanceKm ?? straight[i] ?? null,
    straightKm: g.straightKm,
    profile: g.profile,
    source: g.source,
  }));
}
