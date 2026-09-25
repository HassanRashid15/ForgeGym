"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  MapPin,
  Search,
  Users,
} from "lucide-react";
import { ScrollAnimate } from "@/hooks/useScrollAnimation";
import InteractiveBackground from "@/components/marketing/InteractiveBackground";
import type { GymListItem } from "@/lib/gyms";
import { GymImageLightbox } from "@/components/gyms/GymImageLightbox";

type GymsPageClientProps = {
  gyms: GymListItem[];
};

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
  const [preview, setPreview] = useState<{
    images: string[];
    alt: string;
  } | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return gyms
      .filter((g) => {
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
      })
      .sort((a, b) => a.gymName.localeCompare(b.gymName));
  }, [gyms, search, cityFilter, typeFilter]);

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
              Browse published gyms from our network. Filter by city or type to
              find a place to train.
            </p>
          </ScrollAnimate>
        </div>
      </section>

      <section className="sticky top-16 z-40 border-b border-border bg-background/80 py-4 backdrop-blur-lg">
        <div className="container mx-auto space-y-4 px-4">
          <div className="relative mx-auto max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search gyms, cities, facilities…"
              className="pl-9"
            />
          </div>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <label className="relative w-full max-w-[220px]">
              <span className="mb-1.5 block text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                City
              </span>
              <div className="relative">
                <select
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
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
                }}
              >
                Reset filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((gym, index) => (
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
                      {gym.gymType && (
                        <div className="pointer-events-none absolute left-3 top-3 z-10">
                          <span className="rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                            {gym.gymType}
                          </span>
                        </div>
                      )}
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
              ))}
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
