import { NextResponse } from "next/server";

const NOMINATIM = "https://nominatim.openstreetmap.org";
const UA = "ForgeGymHub/1.0 (gym-journey-hub; address-lookup)";

export type GeoSuggestion = {
  id: string;
  label: string;
  lat: number;
  lon: number;
};

/** GET /api/geo/search?q=... — address autocomplete (OpenStreetMap) */
export async function GET(request: Request) {
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
    url.searchParams.set("limit", "6");

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
    }>;

    const results: GeoSuggestion[] = (data || [])
      .filter((r) => r.display_name && r.lat && r.lon)
      .map((r) => ({
        id: String(r.place_id ?? `${r.lat},${r.lon}`),
        label: r.display_name as string,
        lat: Number(r.lat),
        lon: Number(r.lon),
      }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "Address search failed", results: [] },
      { status: 500 },
    );
  }
}
