/** Great-circle distance in kilometers (Haversine). */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistanceKm(km: number, approximate = false): string {
  if (!Number.isFinite(km)) return "";
  const prefix = approximate ? "~" : "";
  if (km < 1) return `${prefix}${Math.round(km * 1000)} m`;
  if (km < 10) return `${prefix}${km.toFixed(1)} km`;
  if (km < 100) return `${prefix}${km.toFixed(1)} km`;
  return `${prefix}${Math.round(km)} km`;
}
