"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  Building2,
  ChevronDown,
  ChevronRight,
  ListFilter,
  Loader2,
  LocateFixed,
  MapPin,
  Search,
  Users,
} from "lucide-react";
import { ScrollAnimate } from "@/hooks/useScrollAnimation";
import { GymsPageFaq } from "@/components/marketing/FaqAccordion";
import type { GymListItem } from "@/lib/gyms";
import { GymImageLightbox } from "@/components/gyms/GymImageLightbox";
import { formatDistanceKm, haversineKm } from "@/lib/geo/distance";

type GymsPageClientProps = {
  gyms: GymListItem[];
};

type UserCoords = { lat: number; lon: number };

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
  const [userCoords, setUserCoords] = useState<UserCoords | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    images: string[];
    alt: string;
  } | null>(null);

  const distanceByOwner = useMemo(() => {
    const map = new Map<string, number>();
    if (!userCoords) return map;
    for (const g of gyms) {
      if (
        typeof g.latitude === "number" &&
        typeof g.longitude === "number" &&
        Number.isFinite(g.latitude) &&
        Number.isFinite(g.longitude)
      ) {
        map.set(
          g.ownerId,
          haversineKm(userCoords.lat, userCoords.lon, g.latitude, g.longitude),
        );
      }
    }
    return map;
  }, [gyms, userCoords]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    const list = gyms.filter((g) => {
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

    if (nearMe && userCoords) {
      return [...list].sort((a, b) => {
        const da = distanceByOwner.get(a.ownerId);
        const db = distanceByOwner.get(b.ownerId);
        if (da == null && db == null) return a.gymName.localeCompare(b.gymName);
        if (da == null) return 1;
        if (db == null) return -1;
        return da - db;
      });
    }

    return list.sort((a, b) => a.gymName.localeCompare(b.gymName));
  }, [
    gyms,
    search,
    cityFilter,
    typeFilter,
    nearMe,
    userCoords,
    distanceByOwner,
  ]);

  const enableNearMe = () => {
    if (!navigator.geolocation) {
      setLocationError("Location isn’t supported in this browser");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
        setNearMe(true);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setNearMe(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError(
            "Location permission denied — allow location for this site, then try again",
          );
        } else {
          setLocationError("Couldn’t get your location — try again");
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60_000 },
    );
  };

  const toggleNearMe = () => {
    if (nearMe) {
      setNearMe(false);
      setLocationError(null);
      return;
    }
    if (userCoords) {
      setNearMe(true);
      setLocationError(null);
      return;
    }
    enableNearMe();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative isolate overflow-hidden bg-background">
        <div
          className="pointer-events-none absolute inset-0 forge-hero-media"
          aria-hidden
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/gym_hero.png"
            alt=""
            className="absolute inset-0 h-full w-full object-[72%_center] sm:object-[78%_center]"
          />
          {/* Left wash so copy stays readable; athlete stays visible on the right */}
          {/* <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-transparent sm:from-black/95 sm:via-black/55 sm:to-transparent" /> */}
          {/* <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-black/35" /> */}
          {/* Red geometric accent (reference) */}
        </div>

        <div className="relative z-10 mx-auto flex min-h-[78svh] max-w-7xl flex-col justify-end px-4 pb-10 pt-28 sm:min-h-[72svh] sm:px-6 sm:pb-14 sm:pt-32 lg:px-2 lg:pb-16">
          <ScrollAnimate animation="fade-up" className="max-w-xl md:max-w-4xl lg:max-w-5xl">
            <span className="mb-4 inline-flex rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary sm:text-[11px]">
              Discover
            </span>
            <h1 className="font-display text-[clamp(2.5rem,8vw,5.25rem)] leading-[0.9] tracking-wide text-white md:whitespace-nowrap">
              <span>FIND YOUR </span>
              <span className="relative inline-block pb-[0.35em] pr-[0.1em] italic text-primary">
                <span className="relative z-[1]">GYM</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/red_stroke.png"
                  alt=""
                  aria-hidden
                  className="pointer-events-none absolute left-[-4%] top-[70%] z-0 h-[0.36em] w-[112%] max-w-none select-none object-fill object-left sm:h-[0.32em]"
                />
              </span>
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/80 sm:mt-0 sm:text-base">
              Browse top gyms, connect with the fitness community, and take the
              first step towards a healthier you.
            </p>
          </ScrollAnimate>

          {/* Hero search bar — matches reference layout */}
          <div className="mt-8 w-full sm:mt-10">
            <form
              className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/55 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-md sm:flex-row sm:items-center sm:gap-2 sm:rounded-full sm:p-2 sm:pl-4"
              onSubmit={(e) => {
                e.preventDefault();
                document
                  .getElementById("gyms-results")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Search gyms</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search gyms, cities, trainers..."
                  className="h-11 border-white/15 bg-white/5 pl-10 text-white placeholder:text-white/45 focus-visible:ring-primary sm:border-transparent sm:bg-transparent"
                />
              </label>

              <div className="hidden h-8 w-px shrink-0 bg-white/15 sm:block" />

              <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-[200px]">
                <MapPin className="ml-2 hidden h-4 w-4 shrink-0 text-white/50 sm:block" />
                <label className="relative min-w-0 flex-1">
                  <span className="sr-only">City</span>
                  <select
                    value={cityFilter}
                    onChange={(e) => setCityFilter(e.target.value)}
                    className="h-11 w-full appearance-none rounded-md border border-white/15 bg-white/5 px-3 pr-8 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-primary sm:border-0 sm:bg-transparent"
                    aria-label="Filter by city"
                  >
                    <option value="all" className="bg-zinc-900 text-white">
                      All cities
                    </option>
                    {cities.map((city) => (
                      <option
                        key={city}
                        value={city}
                        className="bg-zinc-900 text-white"
                      >
                        {city}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                </label>
              </div>

              <div className="hidden h-8 w-px shrink-0 bg-white/15 sm:block" />

              <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-[200px]">
                <ListFilter className="ml-2 hidden h-4 w-4 shrink-0 text-white/50 sm:block" />
                <label className="relative min-w-0 flex-1">
                  <span className="sr-only">Gym type</span>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="h-11 w-full appearance-none rounded-md border border-white/15 bg-white/5 px-3 pr-8 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-primary sm:border-0 sm:bg-transparent"
                    aria-label="Filter by type"
                  >
                    <option value="all" className="bg-zinc-900 text-white">
                      All types
                    </option>
                    {types.map((type) => (
                      <option
                        key={type}
                        value={type}
                        className="bg-zinc-900 text-white"
                      >
                        {type}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                </label>
              </div>

              <div className="flex gap-2 sm:shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 shrink-0 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                  onClick={toggleNearMe}
                  disabled={locating}
                  aria-pressed={nearMe}
                  title={nearMe ? "Near me on" : "Near me"}
                >
                  {locating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LocateFixed
                      className={`h-4 w-4 ${nearMe ? "text-primary" : ""}`}
                    />
                  )}
                </Button>
                <Button
                  type="submit"
                  className="h-11 flex-1 gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90 sm:flex-none"
                >
                  Search
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </form>

            {locationError ? (
              <p className="mt-2 text-xs text-amber-400">{locationError}</p>
            ) : null}
            {nearMe && userCoords ? (
              <p className="mt-2 text-xs text-white/55">
                Sorted closest first. Gyms without a saved pin appear at the end.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section id="gyms-results" className="relative z-10 scroll-mt-24 pb-16 pt-8 sm:pt-10">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <span
                className="-mt-[7px] h-2 w-8 shrink-0 rounded-xs bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.85)]"
                aria-hidden
              />
              <h2 className="font-display text-2xl italic leading-normal tracking-wide text-foreground sm:text-3xl md:text-4xl">
                <span className="text-foreground">FEATURED </span>
                <span className="inline-block pr-[0.1em] text-primary">GYM</span>
              </h2>
            </div>
            <p className="mt-2 max-w-2xl text-left text-lg text-muted-foreground">
              Browse top gyms, connect with the fitness community, and take the
              first step towards a healthier you.
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
                Try a different search or filter.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setCityFilter("all");
                  setTypeFilter("all");
                  setNearMe(false);
                }}
              >
                Reset filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((gym, index) => {
                const km = distanceByOwner.get(gym.ownerId);
                return (
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
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-card via-card/80 to-transparent" />
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 shadow-[0_18px_36px_12px_hsl(var(--card))]" />
                        <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap gap-1.5">
                          {gym.gymType ? (
                            <span className="rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                              {gym.gymType}
                            </span>
                          ) : null}
                          {nearMe && km != null ? (
                            <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
                              {formatDistanceKm(km, true)}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <Link
                        href={`/gyms/${gym.ownerId}`}
                        className="group flex flex-1 flex-col p-6 outline-none [-webkit-tap-highlight-color:transparent]"
                      >
                        <div className="mb-0 flex items-center gap-3">
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
                              {nearMe && km != null
                                ? ` · ${formatDistanceKm(km, true)} away`
                                : ""}
                            </span>
                          </div>
                        )}

                        {(gym.facilities?.length > 0 ||
                          gym.services?.length > 0) && (
                          <div className="mb-4 flex flex-wrap gap-1.5">
                            {[
                              ...(gym.facilities || []),
                              ...(gym.services || []),
                            ]
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

                        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                            <Users className="h-4 w-4 shrink-0" />
                            <span className="truncate">
                              {gym.capacity || "Open membership"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-primary transition-all group-hover:gap-2">
                            <span className="text-sm font-medium">View gym</span>
                            <ChevronRight className="h-4 w-4" />
                          </div>
                        </div>
                      </Link>
                    </div>
                  </ScrollAnimate>
                );
              })}
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

      <GymsPageFaq />

      <Footer />
    </div>
  );
}
