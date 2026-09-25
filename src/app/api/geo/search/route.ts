import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { rateLimitedResponse, getRequestId } from "@/lib/api/errors";
import { trackEvent } from "@/lib/monitoring";
import { placeFromNominatimAddress } from "@/lib/geo/place";

const NOMINATIM = "https://nominatim.openstreetmap.org";
const UA = "ForgeGymHub/1.0 (gym-journey-hub; address-lookup)";

export type GeoSuggestion = {
  id: string;
  label: string;
  lat: number;
  lon: number;
  city: string | null;
  region: string | null;
  country: string | null;
};

/** GET /api/geo/search?q=... — address autocomplete (OpenStreetMap) */
export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const limited = await rateLimit(clientKey(request, "geo:search"), 40, 60_000);
  if (!limited.allowed) {
    trackEvent("auth.rate_limited", { route: "geo-search", requestId });
    return rateLimitedResponse(limited);
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();

  if (q.length < 2) {
    return NextResponse.json({ results: [] as GeoSuggestion[] });
  }

  try {
    const url = new URL(`${NOMINATIM}/search`);
    url.searchParams.set("q", q);
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "8");
    // Bias to Pakistan gyms (Forge launch market) for more accurate street pins
    url.searchParams.set("countrycodes", "pk");
    url.searchParams.set("dedupe", "1");

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json", "User-Agent": UA },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Address search unavailable", results: [] },
        { status: 502 },
      );
    }

    const data = (await res.json()) as Array<{
      place_id?: number;
      display_name?: string;
      lat?: string;
      lon?: string;
      address?: Record<string, string>;
    }>;

    const results: GeoSuggestion[] = (data || [])
      .filter((r) => r.display_name && r.lat && r.lon)
      .map((r) => {
        const place = placeFromNominatimAddress(r.address);
        return {
          id: String(r.place_id ?? `${r.lat},${r.lon}`),
          label: r.display_name as string,
          lat: Number(r.lat),
          lon: Number(r.lon),
          city: place.city,
          region: place.region,
          country: place.country,
        };
      });

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "Address search failed", results: [] },
      { status: 500 },
    );
  }
}
