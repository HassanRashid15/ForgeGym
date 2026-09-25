import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { jsonError, rateLimitedResponse, getRequestId } from "@/lib/api/errors";
import { trackEvent } from "@/lib/monitoring";
import {
  googleGeocodeSuggestions,
  hasGoogleMapsApiKey,
} from "@/lib/geo/google";

export type GeoSuggestion = {
  id: string;
  label: string;
  lat: number;
  lon: number;
  city: string | null;
  region: string | null;
  country: string | null;
};

/** GET /api/geo/search?q=... — Google Geocoding only */
export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const limited = await rateLimit(clientKey(request, "geo:search"), 40, 60_000);
  if (!limited.allowed) {
    trackEvent("auth.rate_limited", { route: "geo-search", requestId });
    return rateLimitedResponse(limited);
  }

  if (!hasGoogleMapsApiKey()) {
    return jsonError(
      "GOOGLE_MAPS_API_KEY is not configured. Add it to .env to enable location.",
      503,
      { requestId },
    );
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();

  if (q.length < 2) {
    return NextResponse.json({ results: [] as GeoSuggestion[], provider: "google" });
  }

  try {
    const results = await googleGeocodeSuggestions(q, 8);
    return NextResponse.json({ results, provider: "google" });
  } catch {
    return NextResponse.json(
      { error: "Google address search failed", results: [] },
      { status: 502 },
    );
  }
}
