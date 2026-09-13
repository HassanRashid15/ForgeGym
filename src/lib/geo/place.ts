/** Extract city / region from Nominatim addressdetails */
export function placeFromNominatimAddress(address: Record<string, string> | undefined | null): {
  city: string | null;
  region: string | null;
  country: string | null;
} {
  if (!address) return { city: null, region: null, country: null };

  const city =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county ||
    address.suburb ||
    null;

  const region = address.state || address.province || address.region || null;
  const country = address.country || null;

  return {
    city: city ? String(city).trim() : null,
    region: region ? String(region).trim() : null,
    country: country ? String(country).trim() : null,
  };
}

/** Best-effort parse from a freeform address label (comma-separated) */
export function placeFromAddressLabel(label: string): {
  city: string | null;
  region: string | null;
} {
  const parts = label
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) return { city: null, region: null };
  if (parts.length === 1) return { city: parts[0], region: null };

  // Typical: street, area, city, province, country
  const withoutCountry =
    parts.length >= 2 && /pakistan|india|uae|usa|uk|united/i.test(parts[parts.length - 1])
      ? parts.slice(0, -1)
      : parts;

  if (withoutCountry.length === 1) {
    return { city: withoutCountry[0], region: null };
  }

  const region = withoutCountry[withoutCountry.length - 1] || null;
  const city = withoutCountry[withoutCountry.length - 2] || withoutCountry[0] || null;
  return { city, region };
}

export function formatCityLocation(city: string | null, region: string | null): string {
  const c = (city || "").trim();
  const r = (region || "").trim();
  if (c && r && !c.toLowerCase().includes(r.toLowerCase())) return `${c}, ${r}`;
  return c || r || "";
}
