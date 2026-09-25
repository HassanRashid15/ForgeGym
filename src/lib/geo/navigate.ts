/** Free deep links — no API key required. */

export function googleMapsDirectionsUrl(lat: number, lon: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
}

export function appleMapsDirectionsUrl(lat: number, lon: number): string {
  return `https://maps.apple.com/?daddr=${lat},${lon}`;
}

/** Prefer Apple Maps on iOS, Google Maps elsewhere. */
export function mapsDirectionsUrl(lat: number, lon: number): string {
  if (typeof navigator !== "undefined") {
    const ua = navigator.userAgent || "";
    if (/iPhone|iPad|iPod/i.test(ua)) {
      return appleMapsDirectionsUrl(lat, lon);
    }
  }
  return googleMapsDirectionsUrl(lat, lon);
}
