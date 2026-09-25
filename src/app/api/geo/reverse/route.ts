import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { jsonError, rateLimitedResponse, getRequestId } from "@/lib/api/errors";
import { trackEvent } from "@/lib/monitoring";
import {
  googleReverseGeocode,
  hasGoogleMapsApiKey,
} from "@/lib/geo/google";

/** GET /api/geo/reverse?lat=&lon= — Google Geocoding only */
export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const limited = await rateLimit(clientKey(request, "geo:reverse"), 30, 60_000);
  if (!limited.allowed) {
    trackEvent("auth.rate_limited", { route: "geo-reverse", requestId });
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
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return jsonError("lat and lon are required", 400, { requestId });
  }

  try {
    const google = await googleReverseGeocode(lat, lon);
    if (!google) {
      return jsonError("No address found for this location", 404, { requestId });
    }
    return NextResponse.json({
      label: google.label,
      lat: google.lat,
      lon: google.lon,
      city: google.city,
      region: google.region,
      country: google.country,
      provider: "google",
    });
  } catch {
    return jsonError("Google reverse geocode failed", 500, { requestId });
  }
}
