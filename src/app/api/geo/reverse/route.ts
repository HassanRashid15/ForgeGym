import { NextResponse } from "next/server";

const NOMINATIM = "https://nominatim.openstreetmap.org";
const UA = "ForgeGymHub/1.0 (gym-journey-hub; address-lookup)";

/** GET /api/geo/reverse?lat=&lon= — reverse geocode current location */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
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
      return NextResponse.json({ error: "Reverse geocode unavailable" }, { status: 502 });
    }

    const data = (await res.json()) as {
      display_name?: string;
      lat?: string;
      lon?: string;
      error?: string;
    };

    if (data.error || !data.display_name) {
      return NextResponse.json({ error: "No address found for this location" }, { status: 404 });
    }

    return NextResponse.json({
      label: data.display_name,
      lat: Number(data.lat ?? lat),
      lon: Number(data.lon ?? lon),
    });
  } catch {
    return NextResponse.json({ error: "Reverse geocode failed" }, { status: 500 });
  }
}
