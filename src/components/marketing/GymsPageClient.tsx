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
import { GymCardSkeleton } from "@/components/loading/GymCardSkeleton";
import { searchGeo, reverseGeo } from "@/api/geo";

const NEAR_RADIUS_KM = 75;
const CITY_GEO_CACHE_KEY = "forge_gym_city_geo_v1";

type GymsPageClientProps = {
  gyms: GymListItem[];
};

type GeoPoint = { lat: number; lon: number };

type GymWithDistance = GymListItem & {
  distanceKm: number | null;
  resolvedLat: number | null;
  resolvedLon: number | null;
};

function loadCityCache(): Record<string, GeoPoint> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(CITY_GEO_CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, GeoPoint>;
  } catch {
    return {};
  }
}

function saveCityCache(cache: Record<string, GeoPoint>) {
  try {
    sessionStorage.setItem(CITY_GEO_CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* ignore quota */
  }
}

async function geocodeCity(city: string): Promise<GeoPoint | null> {
  const q = city.trim();
  if (q.length < 2) return null;
  try {
    const data = await searchGeo(q);
    const first = data.results?.[0];
    if (
      !first ||
      !Number.isFinite(first.lat) ||
      !Number.isFinite(first.lon)
    ) {
      return null;
    }
    return { lat: first.lat!, lon: first.lon! };
  } catch {
    return null;
  }
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
  const [userLabel, setUserLabel] = useState<string | null>(null);
  const [userCity, setUserCity] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [cityCoords, setCityCoords] = useState<Record<string, GeoPoint>>({});
  const [resolvingCities, setResolvingCities] = useState(false);

  const resolveGymCoords = useCallback(async (list: GymListItem[]) => {
    const cache = { ...loadCityCache() };
    const uniqueCities = [
      ...new Set(
        list
          .filter((g) => g.latitude == null || g.longitude == null)
          .map((g) => (g.gymCity || "").trim())
          .filter(Boolean),
      ),
    ].filter((c) => !cache[c.toLowerCase()]);

    if (uniqueCities.length === 0) {
      setCityCoords(cache);
      return cache;
    }

    setResolvingCities(true);
    try {
      for (const city of uniqueCities) {
        const point = await geocodeCity(city);
        if (point) cache[city.toLowerCase()] = point;
        await new Promise((r) => setTimeout(r, 350));
      }
      saveCityCache(cache);
      setCityCoords(cache);
      return cache;
    } finally {
      setResolvingCities(false);
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
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60_000,
        });
      });

      const point = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
      };
      setUserPoint(point);

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
      if (code === 1) {
        setGeoError("Location permission denied. Allow location access to find nearby gyms.");
      } else if (code === 2) {
        setGeoError("Unable to determine your location. Try again outdoors or check GPS.");
      } else if (code === 3) {
        setGeoError("Location request timed out. Please try again.");
      } else {
        setGeoError("Could not get your location. Please try again.");
      }
      setNearMe(false);
    } finally {
      setLocating(false);
    }
  };

  const clearNearMe = () => {
    setNearMe(false);
    setUserPoint(null);
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
    return gyms.map((g) => {
      let resolvedLat = g.latitude;
      let resolvedLon = g.longitude;
      if (
        (resolvedLat == null || resolvedLon == null) &&
        g.gymCity
      ) {
        const cached = cityCoords[g.gymCity.trim().toLowerCase()];
        if (cached) {
          resolvedLat = cached.lat;
          resolvedLon = cached.lon;
        }
      }

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
        resolvedLat: resolvedLat ?? null,
        resolvedLon: resolvedLon ?? null,
      };
    });
  }, [gyms, cityCoords, nearMe, userPoint]);

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

      {/* Filters */}
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
              disabled={locating || resolvingCities}
            >
              {locating || resolvingCities ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : nearMe ? (
                <Navigation className="h-4 w-4" />
              ) : (
                <LocateFixed className="h-4 w-4" />
              )}
              {locating
                ? "Locating…"
                : resolvingCities
                  ? "Mapping cities…"
                  : nearMe
                    ? "Near you · On"
                    : "Near your location"}
            </Button>
          </div>

          {nearMe && userLabel && (
            <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              Showing gyms within {NEAR_RADIUS_KM} km of {userLabel}
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
              {resolvingCities ? (
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
                  <Link href={`/gyms/${gym.ownerId}`} className="group block h-full outline-none [-webkit-tap-highlight-color:transparent]">
                    <div className="glass-card hover-lift flex h-full flex-col overflow-hidden rounded-2xl bg-card will-change-transform [transform:translateZ(0)]">
                      <div className="relative aspect-[16/10] overflow-hidden bg-card">
                        {gym.gymMainImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={gym.gymMainImageUrl}
                            alt={gym.gymName}
                            className="h-full w-full object-cover transition-transform duration-500 ease-out will-change-transform group-hover:scale-[1.04]"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 via-secondary/40 to-background">
                            <Building2 className="h-10 w-10 text-primary/70" />
                          </div>
                        )}
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-card via-card/50 to-transparent" />
                        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                          {gym.gymType && (
                            <span className="rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                              {gym.gymType}
                            </span>
                          )}
                          {nearMe && gym.distanceKm != null && (
                            <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                              {formatDistanceKm(gym.distanceKm)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-1 flex-col p-6">
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

                        {(gym.facilities?.length > 0 || gym.services?.length > 0) && (
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

                        <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-4">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>{gym.capacity || "Open membership"}</span>
                          </div>
                          <div className="flex items-center gap-1 text-primary transition-all group-hover:gap-2">
                            <span className="text-sm font-medium">View gym</span>
                            <ChevronRight className="h-4 w-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </ScrollAnimate>
                ))
              )}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
