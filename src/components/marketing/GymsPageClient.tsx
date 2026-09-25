"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Loader2,
  LocateFixed,
  MapPin,
  Navigation,
  Search,
  Users,
} from "lucide-react";
import { ScrollAnimate } from "@/hooks/useScrollAnimation";
import InteractiveBackground from "@/components/marketing/InteractiveBackground";
import type { GymListItem } from "@/lib/gyms";
import { formatDistanceKm, haversineKm } from "@/lib/geo/distance";
import { getBestGeolocation } from "@/lib/geo/get-best-position";
import { GymCardSkeleton } from "@/components/loading/GymCardSkeleton";
import { GymImageLightbox } from "@/components/gyms/GymImageLightbox";
import { searchGeo, reverseGeo } from "@/api/geo";

const NEAR_RADIUS_KM = 75;
const GEO_CACHE_KEY = "forge_gym_geo_v3";
/** Mark distance as approximate when GPS accuracy is worse than this (meters). */
const APPROX_USER_ACCURACY_M = 150;

type GymsPageClientProps = {
  gyms: GymListItem[];
};

type GeoPoint = { lat: number; lon: number };

type GymWithDistance = GymListItem & {
  distanceKm: number | null;
  /** True when coords/GPS are coarse (city geocode or weak mobile GPS). */
  distanceApproximate: boolean;
  resolvedLat: number | null;
  resolvedLon: number | null;
};

function loadGeoCache(): Record<string, GeoPoint> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(GEO_CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, GeoPoint>;
  } catch {
    return {};
  }
}

function saveGeoCache(cache: Record<string, GeoPoint>) {
  try {
    sessionStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* ignore quota */
  }
}

function normalizeGeoQuery(q: string): string {
  let query = q.trim();
  if (!query) return "";
  if (!/pakistan|pk\b/i.test(query)) {
    query = `${query}, Pakistan`;
  }
  return query;
}

/** Pick the Nominatim hit that best matches the gym city / street address. */
async function geocodeQuery(
  q: string,
  preferCity?: string | null,
): Promise<GeoPoint | null> {
  const query = normalizeGeoQuery(q);
  if (query.length < 2) return null;
  try {
    const data = await searchGeo(query);
    const results = data.results || [];
    if (results.length === 0) return null;

    const city = (preferCity || "").trim().toLowerCase();
    const ranked = [...results].sort((a, b) => {
      const score = (r: (typeof results)[number]) => {
        let s = 0;
        const label = (r.label || "").toLowerCase();
        const rCity = (r.city || "").toLowerCase();
        if (city && (rCity === city || label.includes(city))) s += 5;
        if (/\d/.test(label)) s += 2;
        if (/road|rd|street|st\b|town|circular/i.test(label)) s += 1;
        return s;
      };
      return score(b) - score(a);
    });

    const best = ranked[0];
    if (!best || !Number.isFinite(best.lat) || !Number.isFinite(best.lon)) {
      return null;
    }
    return { lat: best.lat!, lon: best.lon! };
  } catch {
    return null;
  }
}

function gymAddressCacheKey(g: GymListItem): string | null {
  const address = (g.address || "").trim().toLowerCase();
  if (address.length >= 8) return `addr:${address}`;
  return null;
}

function gymCityCacheKey(g: GymListItem): string | null {
  const city = (g.gymCity || "").trim().toLowerCase();
  return city ? `city:${city}` : null;
}

export default function GymsPageClient({ gyms }: GymsPageClientProps) {
  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const g of gyms) {
      const city = (g.gymCity || "").trim();
      if (city) set.add(city);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [gyms]);

  const types = useMemo(() => {
    const set = new Set<string>();
    for (const g of gyms) {
      const t = (g.gymType || "").trim();
      if (t) set.add(t);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [gyms]);

  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [nearMe, setNearMe] = useState(false);
  const [userPoint, setUserPoint] = useState<GeoPoint | null>(null);
  const [userAccuracyM, setUserAccuracyM] = useState<number | null>(null);
  const [userLabel, setUserLabel] = useState<string | null>(null);
  const [userCity, setUserCity] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoCache, setGeoCache] = useState<Record<string, GeoPoint>>({});
  const [resolvingGeo, setResolvingGeo] = useState(false);
  const [preview, setPreview] = useState<{
    images: string[];
    alt: string;
  } | null>(null);

  const resolveGymCoords = useCallback(async (list: GymListItem[]) => {
    const cache = { ...loadGeoCache() };
    const jobs: Array<{ key: string; query: string; city: string | null }> = [];

    for (const g of list) {
      const addrKey = gymAddressCacheKey(g);
      if (addrKey && !cache[addrKey] && g.address) {
        jobs.push({ key: addrKey, query: g.address, city: g.gymCity });
      } else if ((g.latitude == null || g.longitude == null) && !addrKey) {
        const cityKey = gymCityCacheKey(g);
        if (cityKey && !cache[cityKey] && g.gymCity) {
          jobs.push({ key: cityKey, query: g.gymCity, city: g.gymCity });
        }
      }
    }

    const seen = new Set<string>();
    const uniqueJobs = jobs.filter((j) => {
      if (seen.has(j.key)) return false;
      seen.add(j.key);
      return true;
    });

    if (uniqueJobs.length === 0) {
      setGeoCache(cache);
      return cache;
    }

    setResolvingGeo(true);
    try {
      for (const job of uniqueJobs) {
        const point = await geocodeQuery(job.query, job.city);
        if (point) cache[job.key] = point;
        await new Promise((r) => setTimeout(r, 350));
      }
      saveGeoCache(cache);
      setGeoCache(cache);
      return cache;
    } finally {
      setResolvingGeo(false);
    }
  }, []);

  const enableNearMe = async () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported in this browser.");
      return;
    }

    setLocating(true);
    setGeoError(null);

    try {
      const position = await getBestGeolocation({
        targetAccuracyM: 50,
        timeoutMs: 18_000,
        maxAcceptableAccuracyM: 3_000,
      });

      const point = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
      };
      setUserPoint(point);
      setUserAccuracyM(
        Number.isFinite(position.coords.accuracy)
          ? position.coords.accuracy
          : null,
      );

      try {
        const data = await reverseGeo(point.lat, point.lon);
        const label =
          [data.city, data.region].filter(Boolean).join(", ") ||
          data.label ||
          "Your location";
        setUserLabel(label);
        setUserCity(data.city || null);
      } catch {
        setUserLabel("Your location");
        setUserCity(null);
      }

      setNearMe(true);
      setCityFilter("all");
      await resolveGymCoords(gyms);
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? Number((err as GeolocationPositionError).code)
          : null;
      const message =
        err instanceof Error && err.message && !err.message.includes("timed out")
          ? err.message
          : null;
      if (code === 1) {
        setGeoError(
          "Location permission denied. On iPhone: Settings → Safari → Location → Allow, and turn Precise Location On.",
        );
      } else if (code === 2) {
        setGeoError(
          message ||
            "Unable to determine your location. Turn on Precise Location and try outdoors.",
        );
      } else if (code === 3) {
        setGeoError("Location request timed out. Please try again outdoors.");
      } else {
        setGeoError("Could not get your location. Please try again.");
      }
      setNearMe(false);
      setUserAccuracyM(null);
    } finally {
      setLocating(false);
    }
  };

  const clearNearMe = () => {
    setNearMe(false);
    setUserPoint(null);
    setUserAccuracyM(null);
    setUserLabel(null);
    setUserCity(null);
    setGeoError(null);
  };

  const cityMatches = (gymCity: string | null, target: string | null) => {
    if (!gymCity || !target) return false;
    const a = gymCity.trim().toLowerCase();
    const b = target.trim().toLowerCase();
    return a === b || a.includes(b) || b.includes(a);
  };

  const enriched: GymWithDistance[] = useMemo(() => {
    const weakGps =
      userAccuracyM != null && userAccuracyM > APPROX_USER_ACCURACY_M;

    return gyms.map((g) => {
      const addrKey = gymAddressCacheKey(g);
      const cityKey = gymCityCacheKey(g);
      const addrPoint = addrKey ? geoCache[addrKey] : null;
      const cityPoint = cityKey ? geoCache[cityKey] : null;

      let resolvedLat: number | null = null;
      let resolvedLon: number | null = null;
      let distanceApproximate = false;

      // Prefer street-address geocode when available (fixes wrong/city-level DB pins).
      if (addrPoint) {
        resolvedLat = addrPoint.lat;
        resolvedLon = addrPoint.lon;
        distanceApproximate = true;
      } else if (
        typeof g.latitude === "number" &&
        typeof g.longitude === "number"
      ) {
        resolvedLat = g.latitude;
        resolvedLon = g.longitude;
      } else if (cityPoint) {
        resolvedLat = cityPoint.lat;
        resolvedLon = cityPoint.lon;
        distanceApproximate = true;
      }

      if (weakGps) distanceApproximate = true;

      let distanceKm: number | null = null;
      if (
        nearMe &&
        userPoint &&
        typeof resolvedLat === "number" &&
        typeof resolvedLon === "number"
      ) {
        distanceKm = haversineKm(
          userPoint.lat,
          userPoint.lon,
          resolvedLat,
          resolvedLon,
        );
      }

      return {
        ...g,
        distanceKm,
        distanceApproximate,
        resolvedLat,
        resolvedLon,
      };
    });
  }, [gyms, geoCache, nearMe, userPoint, userAccuracyM]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    let list = enriched.filter((g) => {
      if (cityFilter !== "all" && (g.gymCity || "").trim() !== cityFilter) {
        return false;
      }
      if (typeFilter !== "all" && (g.gymType || "").trim() !== typeFilter) {
        return false;
      }
      if (q) {
        const hay = [
          g.gymName,
          g.gymCity,
          g.gymType,
          g.ownerName,
          g.address,
          ...(g.facilities || []),
          ...(g.services || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (nearMe && userPoint) {
      const nearby = list
        .filter((g) => g.distanceKm != null && g.distanceKm <= NEAR_RADIUS_KM)
        .sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));

      if (nearby.length > 0) {
        list = nearby;
      } else if (userCity) {
        list = list
          .filter((g) => cityMatches(g.gymCity, userCity))
          .sort((a, b) => a.gymName.localeCompare(b.gymName));
      } else {
        list = [];
      }
    } else {
      list = [...list].sort((a, b) => a.gymName.localeCompare(b.gymName));
    }

    return list;
  }, [enriched, search, cityFilter, typeFilter, nearMe, userPoint, userCity]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative overflow-hidden bg-card pb-16 pt-32">
        <InteractiveBackground variant="gradient" />
        <div className="container relative z-10 mx-auto px-4">
          <ScrollAnimate animation="fade-up">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
              Directory
            </p>
            <h1 className="font-display mb-4 text-6xl md:text-8xl">
              FIND YOUR <span className="text-gradient">GYM</span>
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Browse published gyms from our network. Filter by city or type, or
              use your location to see what&apos;s nearby.
            </p>
          </ScrollAnimate>
        </div>
      </section>

      <section className="sticky top-16 z-40 border-b border-border bg-background/80 py-4 backdrop-blur-lg">
        <div className="container mx-auto space-y-4 px-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search gyms, cities, facilities…"
                className="pl-9"
              />
            </div>
            <Button
              variant={nearMe ? "default" : "outline"}
              className="gap-2 shrink-0"
              onClick={() => (nearMe ? clearNearMe() : void enableNearMe())}
              disabled={locating || resolvingGeo}
            >
              {locating || resolvingGeo ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : nearMe ? (
                <Navigation className="h-4 w-4" />
              ) : (
                <LocateFixed className="h-4 w-4" />
              )}
              {locating
                ? "Improving GPS…"
                : resolvingGeo
                  ? "Mapping gyms…"
                  : nearMe
                    ? "Near you · On"
                    : "Near your location"}
            </Button>
          </div>

          {nearMe && userLabel && (
            <p className="flex flex-col items-center justify-center gap-1 text-center text-sm text-muted-foreground sm:flex-row sm:gap-2">
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                Showing gyms within {NEAR_RADIUS_KM} km of {userLabel}
              </span>
              {userAccuracyM != null && userAccuracyM > APPROX_USER_ACCURACY_M && (
                <span className="text-xs text-amber-500">
                  GPS ±{Math.round(userAccuracyM)} m — enable Precise Location for
                  better km
                </span>
              )}
            </p>
          )}
          {geoError && (
            <p className="text-center text-sm text-destructive">{geoError}</p>
          )}

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <label className="relative w-full max-w-[220px]">
              <span className="mb-1.5 block text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                City
              </span>
              <div className="relative">
                <select
                  value={nearMe ? "all" : cityFilter}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCityFilter(value);
                    if (nearMe) clearNearMe();
                  }}
                  className="h-10 w-full appearance-none rounded-md border border-input bg-background px-3 pr-9 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Filter by city"
                >
                  <option value="all">All cities</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </label>

            <label className="relative w-full max-w-[220px]">
              <span className="mb-1.5 block text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Type
              </span>
              <div className="relative">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-10 w-full appearance-none rounded-md border border-input bg-background px-3 pr-9 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Filter by type"
                >
                  <option value="all">All types</option>
                  {types.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </label>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-end justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {filtered.length} gym{filtered.length === 1 ? "" : "s"}
              {nearMe ? " near you" : ""}
            </p>
          </div>

          {gyms.length === 0 ? (
            <div className="mx-auto max-w-md text-center">
              <Building2 className="mx-auto mb-4 h-12 w-12 text-primary/70" />
              <h2 className="font-display mb-2 text-3xl">No gyms yet</h2>
              <p className="text-muted-foreground">
                Published gyms will appear here once gym owners are approved.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="mx-auto max-w-md text-center">
              <MapPin className="mx-auto mb-4 h-12 w-12 text-primary/70" />
              <h2 className="font-display mb-2 text-3xl">No matches</h2>
              <p className="mb-6 text-muted-foreground">
                {nearMe
                  ? `No gyms found within ${NEAR_RADIUS_KM} km. Try clearing near-me or pick a city.`
                  : "Try a different search or filter."}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setCityFilter("all");
                  setTypeFilter("all");
                  clearNearMe();
                }}
              >
                Reset filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {resolvingGeo ? (
                <>
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <GymCardSkeleton key={i} />
                  ))}
                </>
              ) : (
                filtered.map((gym, index) => (
                  <ScrollAnimate
                    key={gym.ownerId}
                    animation="fade-up"
                    delay={Math.min(index, 8) * 0.06}
                  >
                    <div className="glass-card hover-lift flex h-full flex-col overflow-hidden rounded-2xl bg-card will-change-transform [transform:translateZ(0)]">
                      <div className="relative aspect-[16/10] overflow-hidden bg-muted/30">
                        {gym.gymMainImageUrl ? (
                          <button
                            type="button"
                            className="absolute inset-0 block h-full w-full cursor-zoom-in"
                            onClick={() =>
                              setPreview({
                                images: [gym.gymMainImageUrl!],
                                alt: gym.gymName,
                              })
                            }
                            aria-label={`Preview ${gym.gymName} photo`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={gym.gymMainImageUrl}
                              alt={gym.gymName}
                              className="h-full w-full object-cover object-center transition-transform duration-500 ease-out will-change-transform hover:scale-[1.04]"
                            />
                          </button>
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 via-secondary/40 to-background">
                            <Building2 className="h-10 w-10 text-primary/70" />
                          </div>
                        )}
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-card/90 via-card/40 to-transparent" />
                        <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap gap-2">
                          {gym.gymType && (
                            <span className="rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                              {gym.gymType}
                            </span>
                          )}
                          {nearMe && gym.distanceKm != null && (
                            <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                              {formatDistanceKm(
                                gym.distanceKm,
                                gym.distanceApproximate,
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      <Link
                        href={`/gyms/${gym.ownerId}`}
                        className="group flex flex-1 flex-col p-6 outline-none [-webkit-tap-highlight-color:transparent]"
                      >
                        <div className="mb-2 flex items-center gap-3">
                          {gym.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={gym.avatarUrl}
                              alt={`${gym.gymName} logo`}
                              className="h-11 w-11 shrink-0 rounded-xl border border-border/60 object-cover"
                            />
                          ) : (
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-primary/10">
                              <Building2 className="h-5 w-5 text-primary" />
                            </div>
                          )}
                          <h3 className="font-display text-xl font-bold transition-colors group-hover:text-primary">
                            {gym.gymName}
                          </h3>
                        </div>

                        {(gym.address || gym.gymCity) && (
                          <div className="mb-3 flex items-start gap-2 text-sm text-muted-foreground">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            <span className="line-clamp-2">
                              {gym.address || gym.gymCity}
                            </span>
                          </div>
                        )}

                        {(gym.facilities?.length > 0 ||
                          gym.services?.length > 0) && (
                          <div className="mb-4 flex flex-wrap gap-1.5">
                            {[...(gym.facilities || []), ...(gym.services || [])]
                              .slice(0, 3)
                              .map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                                >
                                  {tag}
                                </span>
                              ))}
                          </div>
                        )}

                        <div className="mt-auto flex items-center justify-between pt-4">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>{gym.capacity || "Open membership"}</span>
                          </div>
                          <div className="flex items-center gap-1 text-primary transition-all group-hover:gap-2">
                            <span className="text-sm font-medium">View gym</span>
                            <ChevronRight className="h-4 w-4" />
                          </div>
                        </div>
                      </Link>
                    </div>
                  </ScrollAnimate>
                ))
              )}
            </div>
          )}
        </div>
      </section>

      <GymImageLightbox
        images={preview?.images ?? []}
        alt={preview?.alt}
        open={preview != null}
        onClose={() => setPreview(null)}
      />

      <Footer />
    </div>
  );
}
