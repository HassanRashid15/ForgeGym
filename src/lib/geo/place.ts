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

  // Drop country + postal codes (e.g. "54000") so city isn't "Lahore" / region "54000"
  const cleaned = parts.filter(
    (p, i) =>
      !(i === parts.length - 1 && /pakistan|india|uae|usa|uk|united/i.test(p)) &&
      !/^\d{4,6}$/.test(p),
  );

  if (cleaned.length === 0) return { city: null, region: null };
  if (cleaned.length === 1) return { city: cleaned[0], region: null };

  // Prefer a known Pakistani city token when present
  const knownCities =
    /\b(lahore|karachi|islamabad|rawalpindi|faisalabad|multan|peshawar|quetta|sialkot|gujranwala|hyderabad)\b/i;
  const cityHit = [...cleaned].reverse().find((p) => knownCities.test(p));
  if (cityHit) {
    const regionHit = [...cleaned]
      .reverse()
      .find(
        (p) =>
          p !== cityHit &&
          /punjab|sindh|balochistan|khyber|kpk|gilgit|ajk|islamabad/i.test(p),
      );
    return { city: cityHit, region: regionHit || null };
  }

  const region = cleaned[cleaned.length - 1] || null;
  const city = cleaned[cleaned.length - 2] || cleaned[0] || null;
  return { city, region };
}

export function formatCityLocation(city: string | null, region: string | null): string {
  const c = (city || "").trim();
  const r = (region || "").trim();
  if (c && r && !c.toLowerCase().includes(r.toLowerCase())) return `${c}, ${r}`;
  return c || r || "";
}
