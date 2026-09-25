import type { GymListItem } from "@/lib/gyms";
import { googleGeocode, hasGoogleMapsApiKey } from "@/lib/geo/google";

type GeoPoint = { lat: number; lon: number };

/**
 * SSR: fill missing gym lat/lng via Google Geocoding so near-me
 * Distance Matrix can run as soon as the browser has GPS.
 */
export async function resolveGymCoordsForSsr(
  gyms: GymListItem[],
): Promise<GymListItem[]> {
  if (!hasGoogleMapsApiKey()) {
    return gyms;
  }

  const out: GymListItem[] = [];
  const cityCache = new Map<string, GeoPoint>();

  for (const g of gyms) {
    if (
      typeof g.latitude === "number" &&
      typeof g.longitude === "number" &&
      Number.isFinite(g.latitude) &&
      Number.isFinite(g.longitude)
    ) {
      out.push(g);
      continue;
    }

    let point: GeoPoint | null = null;
    const address = (g.address || "").trim();
    if (address.length >= 8) {
      const found = await googleGeocode(address);
      if (found) point = { lat: found.lat, lon: found.lon };
    }

    if (!point) {
      const city = (g.gymCity || "").trim().toLowerCase();
      if (city) {
        if (cityCache.has(city)) {
          point = cityCache.get(city)!;
        } else {
          const found = await googleGeocode(g.gymCity!);
          if (found) {
            point = { lat: found.lat, lon: found.lon };
            cityCache.set(city, point);
          }
        }
      }
    }

    out.push(point ? { ...g, latitude: point.lat, longitude: point.lon } : g);
  }

  return out;
}
