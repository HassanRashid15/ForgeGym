import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { jsonError, rateLimitedResponse, getRequestId } from "@/lib/api/errors";
import { trackEvent } from "@/lib/monitoring";
import { placeFromNominatimAddress } from "@/lib/geo/place";

const NOMINATIM = "https://nominatim.openstreetmap.org";
const UA = "ForgeGymHub/1.0 (gym-journey-hub; address-lookup)";

/** GET /api/geo/reverse?lat=&lon= — reverse geocode current location */
export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const limited = await rateLimit(clientKey(request, "geo:reverse"), 30, 60_000);
  if (!limited.allowed) {
    trackEvent("auth.rate_limited", { route: "geo-reverse", requestId });
    return rateLimitedResponse(limited);
  }

  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return jsonError("lat and lon are required", 400, { requestId });
  }

  try {
    const url = new URL(`${NOMINATIM}/reverse`);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "1");

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json", "User-Agent": UA },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return jsonError("Reverse geocode unavailable", 502, { requestId });
    }

    const data = (await res.json()) as {
      display_name?: string;
      lat?: string;
      lon?: string;
      error?: string;
      address?: Record<string, string>;
    };

    if (data.error || !data.display_name) {
      return jsonError("No address found for this location", 404, { requestId });
    }

    const place = placeFromNominatimAddress(data.address);

    return NextResponse.json({
      label: data.display_name,
      lat: Number(data.lat ?? lat),
      lon: Number(data.lon ?? lon),
      city: place.city,
      region: place.region,
      country: place.country,
    });
  } catch {
    return jsonError("Reverse geocode failed", 500, { requestId });
  }
}
