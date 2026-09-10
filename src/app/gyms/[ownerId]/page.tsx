"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Clock,
  Users,
  Phone,
  Mail,
  Loader2,
} from "lucide-react";

type GymDetail = {
  ownerId: string;
  gymName: string;
  gymType: string | null;
  gymCity: string | null;
  facilities: string[];
  services: string[];
  peakHours: string | null;
  capacity: string | null;
  yearsOperating: string | null;
  operatingDays: number | null;
  ownerName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  bio: string | null;
  avatarUrl: string | null;
};

export default function GymDetailPage({
  params,
}: {
  params: Promise<{ ownerId: string }>;
}) {
  const { ownerId } = use(params);
  const [gym, setGym] = useState<GymDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/gyms/${ownerId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gym not found");
        if (!cancelled) setGym(data.gym);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ownerId]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {loading ? (
        <div className="flex min-h-[50vh] items-center justify-center pt-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error || !gym ? (
        <div className="container mx-auto px-4 pb-16 pt-32 text-center">
          <h1 className="mb-4 font-display text-5xl">Gym Not Found</h1>
          <p className="mb-6 text-muted-foreground">{error}</p>
          <Button asChild>
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      ) : (
        <>
          <section className="relative pt-24">
            <div className="absolute inset-0 h-[40vh] bg-gradient-to-br from-red-950/40 via-zinc-900 to-background" />
            <div className="container relative z-10 mx-auto px-4 pb-16 pt-16">
              <Link
                href="/"
                className="mb-8 inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                {gym.gymType && <Badge variant="outline">{gym.gymType}</Badge>}
                {gym.gymCity && (
                  <Badge variant="secondary" className="gap-1">
                    <MapPin className="h-3 w-3" />
                    {gym.gymCity}
                  </Badge>
                )}
              </div>
              <h1 className="mt-4 font-display text-5xl md:text-7xl">{gym.gymName}</h1>
              {gym.ownerName && (
                <p className="mt-2 text-lg text-muted-foreground">
                  Owned by {gym.ownerName}
                </p>
              )}
            </div>
          </section>

          <section className="pb-24">
            <div className="container mx-auto px-4">
              <div className="grid gap-10 lg:grid-cols-3">
                <div className="space-y-8 lg:col-span-2">
                  {gym.bio && (
                    <div>
                      <h2 className="mb-3 font-display text-3xl">About</h2>
                      <p className="text-muted-foreground leading-relaxed">{gym.bio}</p>
                    </div>
                  )}

                  {gym.facilities.length > 0 && (
                    <div>
                      <h2 className="mb-3 font-display text-3xl">Facilities</h2>
                      <div className="flex flex-wrap gap-2">
                        {gym.facilities.map((f) => (
                          <Badge key={f} variant="secondary">
                            {f}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {gym.services.length > 0 && (
                    <div>
                      <h2 className="mb-3 font-display text-3xl">Services</h2>
                      <div className="flex flex-wrap gap-2">
                        {gym.services.map((s) => (
                          <Badge key={s} className="bg-primary/20 text-primary">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-border/60 bg-card/40 p-5 space-y-4">
                    <h3 className="flex items-center gap-2 font-semibold">
                      <Building2 className="h-4 w-4 text-primary" />
                      Gym info
                    </h3>
                    {gym.yearsOperating && (
                      <p className="text-sm text-muted-foreground">
                        Years operating:{" "}
                        <span className="text-foreground">{gym.yearsOperating}</span>
                      </p>
                    )}
                    {gym.capacity && (
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        Capacity: <span className="text-foreground">{gym.capacity}</span>
                      </p>
                    )}
                    {gym.peakHours && (
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        Peak: <span className="text-foreground">{gym.peakHours}</span>
                      </p>
                    )}
                    {gym.operatingDays != null && (
                      <p className="text-sm text-muted-foreground">
                        Operating days / week:{" "}
                        <span className="text-foreground">{gym.operatingDays}</span>
                      </p>
                    )}
                    {gym.address && (
                      <p className="flex items-start gap-2 text-sm text-muted-foreground">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="text-foreground">{gym.address}</span>
                      </p>
                    )}
                    {gym.phone && (
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span className="text-foreground">{gym.phone}</span>
                      </p>
                    )}
                    {gym.email && (
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span className="text-foreground">{gym.email}</span>
                      </p>
                    )}
                  </div>
                  <Button asChild className="w-full">
                    <Link href={`/register?gym=${encodeURIComponent(ownerId)}`}>
                      Join this gym
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      <Footer />
    </div>
  );
}
