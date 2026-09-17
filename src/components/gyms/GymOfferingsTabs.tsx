"use client";

import Link from "next/link";
import { Dumbbell, Sparkles, UserRound } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getNameInitials } from "@/lib/utils";
import type { GymTrainerPublic } from "@/lib/gyms";

type GymOfferingsTabsProps = {
  gymName: string;
  gymOwnerId: string;
  facilities: string[];
  services: string[];
  trainers: GymTrainerPublic[];
};

export function GymOfferingsTabs({
  gymName,
  gymOwnerId,
  facilities,
  services,
  trainers,
}: GymOfferingsTabsProps) {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-primary">
          Inside {gymName}
        </p>
        <h2 className="font-display mb-8 text-4xl tracking-normal md:text-5xl">
          What we offer
        </h2>

        <Tabs defaultValue="facilities" className="w-full">
          <TabsList className="mb-10 h-auto w-full flex-wrap justify-start gap-1 rounded-none border-b border-border bg-transparent p-0">
            <TabsTrigger
              value="facilities"
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              Facilities
            </TabsTrigger>
            <TabsTrigger
              value="services"
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              Services
            </TabsTrigger>
            <TabsTrigger
              value="trainers"
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              Personal trainers
              {trainers.length > 0 ? ` (${trainers.length})` : ""}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="facilities" className="mt-0 outline-none">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-primary">
              Facilities
            </p>
            <h3 className="font-display mb-6 text-3xl tracking-normal md:text-4xl">
              What&apos;s inside
            </h3>
            {facilities.length > 0 ? (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {facilities.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-3 border-b border-border/80 py-3 text-foreground"
                  >
                    <Dumbbell className="h-4 w-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">
                Facilities will appear once the owner adds them.
              </p>
            )}
          </TabsContent>

          <TabsContent value="services" className="mt-0 outline-none">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-primary">
              Services
            </p>
            <h3 className="font-display mb-6 text-3xl tracking-normal md:text-4xl">
              How you train
            </h3>
            {services.length > 0 ? (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {services.map((s) => (
                  <li
                    key={s}
                    className="flex items-center gap-3 border-b border-border/80 py-3 text-foreground"
                  >
                    <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                    {s}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">
                Services will appear once the owner adds them.
              </p>
            )}
          </TabsContent>

          <TabsContent value="trainers" className="mt-0 outline-none">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-primary">
              Coaching
            </p>
            <h3 className="font-display mb-6 text-3xl tracking-normal md:text-4xl">
              Personal trainers
            </h3>
            {trainers.length > 0 ? (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {trainers.map((t) => (
                  <li key={t.userId}>
                    <Link
                      href={`/trainers/${t.userId}?gym=${encodeURIComponent(gymOwnerId)}`}
                      className="flex gap-4 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/50 hover:bg-card/80"
                    >
                      <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary text-primary-foreground">
                        {t.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={t.avatarUrl}
                            alt={t.fullName || "Trainer"}
                            className="absolute inset-0 size-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-semibold">
                            {getNameInitials(t.fullName || "PT")}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-foreground">
                          {t.fullName || "Trainer"}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                          <UserRound className="h-3.5 w-3.5 shrink-0 text-primary" />
                          {t.specialization || "Personal training"}
                        </p>
                        {t.yearsExperience && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {t.yearsExperience} experience
                          </p>
                        )}
                        {t.bio && (
                          <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                            {t.bio}
                          </p>
                        )}
                        {t.certifications && t.certifications.length > 0 && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            {t.certifications.slice(0, 3).join(" · ")}
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">
                Personal trainers for this gym will appear once the owner adds them.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
