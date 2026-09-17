"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollAnimate } from "@/hooks/useScrollAnimation";

type HomePromotion = {
  id: string;
  title: string;
  body: string;
  cta_label: string | null;
  cta_href: string | null;
  image_url: string | null;
};

export function HomePromotionsSection() {
  const [promotions, setPromotions] = useState<HomePromotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/promotions");
        const data = await res.json().catch(() => ({}));
        if (!cancelled) setPromotions(data.promotions || []);
      } catch {
        if (!cancelled) setPromotions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loading && promotions.length === 0) return null;

  return (
    <section className="border-y border-border/40 bg-card/40 py-16">
      <div className="container mx-auto px-4">
        <ScrollAnimate animation="fade-up" className="mb-10 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
            What&apos;s new
          </p>
          <h2 className="font-display text-4xl md:text-5xl">PROMOTIONS</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Latest features and offers from Forge Gym.
          </p>
        </ScrollAnimate>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-3 rounded-xl border border-border/50 p-6">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-7 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-10 w-32" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {promotions.map((p, index) => (
              <ScrollAnimate
                key={p.id}
                animation="fade-up"
                delay={index * 0.08}
                className="flex h-full flex-col overflow-hidden rounded-xl border border-border/50 bg-background/60"
              >
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image_url}
                    alt=""
                    className="h-40 w-full object-cover"
                  />
                ) : null}
                <div className="flex flex-1 flex-col p-6">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Megaphone className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 font-display text-xl">{p.title}</h3>
                <p className="mb-4 flex-1 text-sm text-muted-foreground whitespace-pre-wrap">
                  {p.body}
                </p>
                {p.cta_href && (
                  <Button variant="outline" size="sm" className="w-fit" asChild>
                    <Link href={p.cta_href}>
                      {p.cta_label || "Learn more"}
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                )}
                </div>
              </ScrollAnimate>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
