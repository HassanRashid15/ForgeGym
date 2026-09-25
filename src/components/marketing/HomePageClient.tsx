"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import NewsletterSection from "@/components/marketing/NewsletterSection";
import { HomePromotionsSection } from "@/components/marketing/HomePromotionsSection";
import { HomePromotionModal } from "@/components/marketing/HomePromotionModal";
import { ReviewSection } from "@/components/marketing/ReviewSection";
import {
  ArrowRight,
  Zap,
  Users,
  Clock,
  Trophy,
  ChevronRight,
  Building2,
  MapPin,
  Dumbbell,
  Salad,
  LineChart,
} from "lucide-react";
import { ScrollAnimate } from "@/hooks/useScrollAnimation";
import { ComingSoonOverlay } from "@/components/ComingSoonOverlay";
import { TextType } from "@/components/marketing/TextType";
import { HomeStatsSection } from "@/components/marketing/HomeStatsSection";
import type { PlatformPublicStats } from "@/lib/platform-stats";
import { useLivePlatformStats } from "@/hooks/useLivePlatformStats";
import { useMemo } from "react";

const heroHighlights = [
  {
    icon: Dumbbell,
    title: "Expert Workouts",
    detail: "For all fitness levels",
  },
  {
    icon: Salad,
    title: "Nutrition Guidance",
    detail: "Eat better, perform better",
  },
  {
    icon: LineChart,
    title: "Track Progress",
    detail: "See your results",
  },
] as const;

export type FeaturedGym = {
  ownerId: string;
  gymName: string;
  gymType: string | null;
  gymCity: string | null;
  address?: string | null;
  gymMainImageUrl: string | null;
  avatarUrl: string | null;
  memberCount?: number;
  monthlyFee?: string | null;
};

const features = [
  {
    icon: Zap,
    title: "High-Tech Equipment",
    description: "State-of-the-art machines and free weights for every fitness level.",
  },
  {
    icon: Users,
    title: "Expert Trainers",
    description: "Certified professionals dedicated to helping you reach your goals.",
  },
  {
    icon: Clock,
    title: "24/7 Access",
    description: "Train on your schedule with round-the-clock gym access.",
  },
  {
    icon: Trophy,
    title: "Results Driven",
    description: "Proven programs designed to deliver real, lasting results.",
  },
];

const classes = [
  {
    name: "HIIT Training",
    image: "/images/class-hiit.jpg",
    duration: "45 min",
    intensity: "High",
  },
  {
    name: "Power Yoga",
    image: "/images/class-yoga.jpg",
    duration: "60 min",
    intensity: "Medium",
  },
  {
    name: "Spin Class",
    image: "/images/class-spin.jpg",
    duration: "50 min",
    intensity: "High",
  },
];

export default function HomePageClient({
  featuredGyms = [],
  platformStats,
}: {
  featuredGyms?: FeaturedGym[];
  platformStats?: PlatformPublicStats;
}) {
  const liveStats = useLivePlatformStats(platformStats);

  const gyms = useMemo(
    () =>
      featuredGyms.map((g) => ({
        ...g,
        memberCount:
          liveStats?.memberCountsByOwner?.[g.ownerId] ?? g.memberCount ?? 0,
      })),
    [featuredGyms, liveStats],
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Full-bleed hero — image masks into page background for a real blend */}
      <section className="relative flex min-h-[100svh] items-stretch overflow-x-hidden bg-background">
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden forge-hero-media"
          aria-hidden
        >
          <img
            src="/hero_sectiona.png"
            alt=""
            className="forge-hero-bg absolute inset-0 h-full w-full max-w-none object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/65 to-black/25 sm:from-black/85 sm:via-black/40 sm:to-transparent lg:from-black/80 lg:via-black/35 lg:to-transparent" />
        </div>

        <div className="relative z-10 flex w-full flex-1 flex-col justify-end px-4 pb-8 pt-24 sm:justify-center sm:px-8 sm:pb-16 sm:pt-28 md:px-10 lg:px-14 lg:pb-20 xl:px-20">
          <div className="mx-auto w-full max-w-xl sm:mx-0 sm:max-w-2xl lg:max-w-3xl">
            <h1 className="forge-hero-fade forge-hero-fade-delay-1 font-display text-[clamp(2.35rem,9vw,5.75rem)] leading-[0.92] tracking-normal text-white">
              <span className="block">Your Fitness</span>
              <span className="relative mt-1 block min-h-[1.05em] text-[#FA1818]">
                {/* Invisible spacer = longest phrase so nothing clips & height stays fixed */}
                <span className="invisible block whitespace-nowrap" aria-hidden>
                  Never Skip The Grind
                </span>
                <span className="absolute left-0 top-0 whitespace-nowrap">
                  <TextType
                    as="span"
                    text={[
                      "Journey Starts Here",
                      "Get Stronger Daily",
                      "Build Real Strength",
                      "Never Skip The Grind",
                      "Train With Purpose",
                      "Push Past Limits",
                      "Own Your Progress",
                      "Forge Your Future",
                    ]}
                    typingSpeed={50}
                    deletingSpeed={28}
                    pauseDuration={2200}
                    initialDelay={400}
                    loop
                    showCursor
                    cursorCharacter="|"
                    cursorClassName="text-[#FA1818]"
                    className="inline whitespace-nowrap"
                    startOnVisible
                  />
                </span>
              </span>
            </h1>

            <p className="forge-hero-fade forge-hero-fade-delay-2 mt-4 max-w-md text-[13px] leading-relaxed text-white/75 sm:mt-6 sm:text-base">
              Get personalized workout plans, expert guidance and track your
              progress — all in one place. Build a stronger, healthier and better
              you.
            </p>

            <div className="forge-hero-fade forge-hero-fade-delay-3 mt-6 flex w-full flex-col gap-3 sm:mt-10 sm:max-w-none sm:flex-row sm:items-center sm:gap-4">
              <Button
                asChild
                className="h-11 w-full rounded-full bg-[#FA1818] px-7 text-xs font-bold uppercase tracking-wide text-white shadow-[0_0_32px_rgba(250,24,24,0.35)] transition hover:scale-[1.03] hover:bg-[#e01515] hover:shadow-[0_0_40px_rgba(250,24,24,0.45)] sm:h-12 sm:w-auto sm:px-8 sm:text-sm"
              >
                <Link href="/register">
                  Start Your Journey
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-11 w-full rounded-full border-white/70 bg-transparent px-7 text-xs font-bold uppercase tracking-wide text-white hover:border-white hover:bg-white/10 hover:text-white sm:h-12 sm:w-auto sm:px-8 sm:text-sm"
              >
                <Link href="/#features">Explore Features</Link>
              </Button>
            </div>

            <ul className="forge-hero-fade forge-hero-fade-delay-4 mt-7 grid w-full grid-cols-1 gap-3 border-t border-white/15 pt-6 sm:mt-10 sm:max-w-2xl sm:grid-cols-3 sm:gap-5 sm:pt-8 md:mt-12 md:gap-6">
              {heroHighlights.map(({ icon: Icon, title, detail }) => (
                <li key={title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FA1818]/15 text-[#FA1818] ring-1 ring-[#FA1818]/35 sm:h-9 sm:w-9">
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2.25} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="text-xs text-white/55">{detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Soft launch — set expectations early */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <ScrollAnimate animation="fade-up" className="mx-auto max-w-2xl text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary">
              Soft launch
            </p>
            <h2 className="font-display mb-4 text-4xl tracking-normal md:text-5xl">
              Built with real gyms
            </h2>
            <p className="text-lg text-muted-foreground">
              Forge is opening with partner gyms first — honest numbers, real coaches, and room to
              grow. Join early and help shape what comes next.
            </p>
          </ScrollAnimate>
        </div>
      </section>

      {/* Featured gyms — core product */}
      {gyms.length > 0 && (
        <section className="bg-gradient-to-b from-background to-card/50 py-24">
          <div className="container mx-auto px-4">
            <ScrollAnimate animation="fade-up">
              <div className="mb-8">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold uppercase tracking-wider text-primary">
                    Featured gyms
                  </p>
                  <Link
                    href="/gyms"
                    className="link--metis inline-flex shrink-0 items-center gap-1 text-xs font-semibold uppercase tracking-wide text-foreground transition-colors hover:text-primary sm:text-sm [-webkit-tap-highlight-color:transparent]"
                  >
                    View All Gyms
                    <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Link>
                </div>
                <h2 className="font-display text-3xl md:text-4xl">Discover Top Locations</h2>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {gyms.map((gym) => (
                  <Link
                    key={gym.ownerId}
                    href={`/gyms/${gym.ownerId}`}
                    className="group outline-none [-webkit-tap-highlight-color:transparent]"
                  >
                    <article className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card transition-[transform,box-shadow,border-color] duration-300 will-change-transform [transform:translateZ(0)] hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_20px_50px_-28px_hsl(var(--primary)/0.45)]">
                      <div className="relative aspect-[16/10] overflow-hidden bg-card">
                        {gym.gymMainImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={gym.gymMainImageUrl}
                            alt={gym.gymName}
                            className="h-full w-full object-cover transition-transform duration-700 ease-out will-change-transform group-hover:scale-[1.04]"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 via-muted to-background">
                            <Building2 className="h-10 w-10 text-primary/70" />
                          </div>
                        )}
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-card via-card/70 to-transparent" />
                        {gym.gymType && (
                          <span className="absolute left-3 top-3 rounded-md bg-background/85 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-foreground backdrop-blur-sm">
                            {gym.gymType}
                          </span>
                        )}
                        {gym.monthlyFee && (
                          <span className="absolute right-3 top-3 rounded-md bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground">
                            {gym.monthlyFee}
                            <span className="font-medium opacity-80">/mo</span>
                          </span>
                        )}
                      </div>

                      <div className="relative -mt-8 flex flex-1 flex-col bg-card px-5 pb-5 pt-0">
                        <div className="mb-4 flex items-end gap-3">
                          {gym.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={gym.avatarUrl}
                              alt={`${gym.gymName} logo`}
                              className="h-14 w-14 shrink-0 rounded-xl border-2 border-card object-cover shadow-md"
                            />
                          ) : (
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-card bg-primary/10 shadow-md">
                              <Building2 className="h-6 w-6 text-primary" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1 pb-1">
                            <h3 className="font-display text-xl font-bold leading-tight tracking-normal transition-colors group-hover:text-primary sm:text-2xl">
                              {gym.gymName}
                            </h3>
                          </div>
                        </div>

                        {(gym.address || gym.gymCity) && (
                          <div className="mb-4 flex items-start gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                            <span className="line-clamp-2">
                              {gym.address || gym.gymCity}
                            </span>
                          </div>
                        )}

                        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/60 pt-4">
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <Users className="h-3.5 w-3.5" />
                            </span>
                            <div className="leading-tight">
                              {(gym.memberCount ?? 0) > 0 ? (
                                <>
                                  <p className="text-sm font-semibold text-foreground">
                                    {(gym.memberCount ?? 0).toLocaleString()}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    Active members
                                  </p>
                                </>
                              ) : (
                                <p className="text-sm font-medium text-muted-foreground">
                                  Be the first member
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-all group-hover:gap-2">
                            Visit
                            <ChevronRight className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            </ScrollAnimate>
          </div>
        </section>
      )}

      {/* Why Forge */}
      <section id="features" className="scroll-mt-20 bg-background py-24">
        <div className="container mx-auto px-4">
          <ScrollAnimate animation="fade-up" className="mb-16 text-center">
            <h2 className="font-display mb-4 text-5xl md:text-6xl">WHY CHOOSE FORGE</h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              We provide everything you need to achieve your fitness goals in one place.
            </p>
          </ScrollAnimate>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <ScrollAnimate
                key={feature.title}
                animation="fade-up"
                delay={index * 0.1}
              >
                <div className="glass-card hover-lift h-full rounded-xl p-8">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-display mb-3 text-2xl">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </ScrollAnimate>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof — numbers */}
      <HomeStatsSection stats={liveStats} />

      {/* Social proof — people */}
      <ReviewSection />

      {/* Live offers */}
      <HomePromotionsSection />

      {/* Future — classes */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <ComingSoonOverlay
            mode="section"
            title="Classes coming soon"
            description="Popular classes preview — booking unlocks next. Join now for early access."
            icon={Dumbbell}
          >
            <ScrollAnimate animation="fade-up">
              <div className="mb-12 flex flex-col items-start justify-between md:flex-row md:items-end">
                <div>
                  <h2 className="font-display mb-4 text-5xl md:text-6xl">POPULAR CLASSES</h2>
                  <p className="max-w-xl text-lg text-muted-foreground">
                    Join our high-energy classes led by expert instructors.
                  </p>
                </div>
                <Button variant="outline" asChild className="mt-4 md:mt-0">
                  <Link href="/classes">
                    View All Classes
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </ScrollAnimate>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {classes.map((classItem, index) => (
                <ScrollAnimate
                  key={classItem.name}
                  animation="scale"
                  delay={index * 0.15}
                >
                  <div className="group relative aspect-[4/5] overflow-hidden rounded-xl hover-lift">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={classItem.image}
                      alt={classItem.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <div className="mb-3 flex gap-2">
                        <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary">
                          {classItem.duration}
                        </span>
                        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                          {classItem.intensity}
                        </span>
                      </div>
                      <h3 className="font-display text-3xl">{classItem.name}</h3>
                    </div>
                  </div>
                </ScrollAnimate>
              ))}
            </div>
          </ComingSoonOverlay>
        </div>
      </section>

      {/* Convert */}
      <section className="relative overflow-hidden bg-card py-24">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-primary blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-primary blur-3xl" />
        </div>
        <div className="container relative z-10 mx-auto px-4">
          <ScrollAnimate animation="scale" className="mx-auto max-w-3xl text-center">
            <h2 className="font-display mb-6 text-5xl md:text-7xl">
              READY TO <span className="text-gradient">TRANSFORM</span>?
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Find a partner gym near you and start training with Forge. New members get a clear path
              from signup to approval — no inflated promises.
            </p>
            <Button variant="hero" size="xl" asChild>
              <Link href="/gyms">
                Browse gyms
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </ScrollAnimate>
        </div>
      </section>

      {/* Capture leads last */}
      <NewsletterSection />

      <Footer />

      <HomePromotionModal />
    </div>
  );
}
