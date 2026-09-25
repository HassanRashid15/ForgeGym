import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { jsonError, rateLimitedResponse, getRequestId } from "@/lib/api/errors";
import { trackEvent } from "@/lib/monitoring";
import {
  googleDistanceMatrixKm,
  hasGoogleMapsApiKey,
} from "@/lib/geo/google";

type DestBody = {
  id?: string;
  lat: number;
  lon: number;
  address?: string | null;
};

/**
 * POST /api/geo/distance
 * Google Distance Matrix only.
 * Prefer destination `address` so Google resolves the real street (fixes bad pins).
 */
export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const limited = await rateLimit(clientKey(request, "geo:distance"), 30, 60_000);
  if (!limited.allowed) {
    trackEvent("auth.rate_limited", { route: "geo-distance", requestId });
    return rateLimitedResponse(limited);
  }

  if (!hasGoogleMapsApiKey()) {
    return jsonError(
      "GOOGLE_MAPS_API_KEY is not configured. Add it to .env to enable near-me distance.",
      503,
      { requestId },
    );
  }

  let body: {
    from?: { lat?: number; lon?: number };
    destinations?: DestBody[];
    profile?: "driving" | "foot";
  };

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400, { requestId });
  }

  const fromLat = Number(body.from?.lat);
  const fromLon = Number(body.from?.lon);
  if (!Number.isFinite(fromLat) || !Number.isFinite(fromLon)) {
    return jsonError("from.lat and from.lon are required", 400, { requestId });
  }

  const destinations = (body.destinations || [])
    .map((d) => ({
      id: d.id != null ? String(d.id) : undefined,
      lat: Number(d.lat),
      lon: Number(d.lon),
      address: typeof d.address === "string" ? d.address : null,
    }))
    .filter((d) => Number.isFinite(d.lat) && Number.isFinite(d.lon));

  if (destinations.length === 0) {
    return NextResponse.json({ results: [], provider: "google" });
  }

  if (destinations.length > 25) {
    return jsonError("Maximum 25 destinations per request", 400, { requestId });
  }

  const mode = body.profile === "foot" ? "walking" : "driving";

  try {
    const distances = await googleDistanceMatrixKm({
      fromLat,
      fromLon,
      destinations,
      mode,
    });

    const results = destinations.map((d, i) => ({
      id: d.id ?? null,
      lat: d.lat,
      lon: d.lon,
      distanceKm: distances[i]?.distanceKm ?? null,
      straightKm: distances[i]?.straightKm ?? null,
      source: distances[i]?.source ?? "google",
      profile: mode,
    }));

    return NextResponse.json({ results, provider: "google" });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Google Distance Matrix failed";
    return jsonError(message, 502, { requestId });
  }
}
