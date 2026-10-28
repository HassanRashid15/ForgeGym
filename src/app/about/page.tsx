"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Target, Heart, Users, Award, ArrowRight } from "lucide-react";
import { ScrollAnimate } from "@/hooks/useScrollAnimation";
import { PageSkeleton } from "@/components/loading/PageSkeleton";

const values = [
  {
    icon: Target,
    title: "Excellence",
    description: "We strive for excellence in everything we do, from our facilities to our training programs.",
  },
  {
    icon: Heart,
    title: "Passion",
    description: "Fitness is our passion. We're dedicated to helping you discover your own love for movement.",
  },
  {
    icon: Users,
    title: "Community",
    description: "We believe fitness is better together. Our community supports and motivates each other.",
  },
  {
    icon: Award,
    title: "Results",
    description: "Your success is our success. We're committed to helping you achieve real, lasting results.",
  },
];

const timeline = [
  {
    year: "Idea",
    title: "The vision",
    description:
      "Forge started as a simple idea: give gym owners a modern hub for members, trainers, and day-to-day ops.",
  },
  {
    year: "Build",
    title: "Platform first",
    description:
      "We focused on real workflows — profiles, approvals, attendance, and gym pages — before chasing vanity metrics.",
  },
  {
    year: "Now",
    title: "Soft launch",
    description:
      "We're opening with partner gyms first. Live numbers reflect the network as it grows — no inflated claims.",
  },
];

export default function AboutPage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <PageSkeleton variant="about" />;
  }

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
            src="/images/gym_about.png"
            alt=""
            className="absolute inset-0 h-full w-full"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-black/55 to-transparent sm:from-black/92 sm:via-black/40 sm:to-transparent" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[78svh] max-w-7xl flex-col justify-center px-4 pb-10 pt-28 sm:min-h-[72svh] sm:px-6 sm:pb-14 sm:pt-32 lg:px-2 lg:pb-16">
          <ScrollAnimate animation="fade-up" className="max-w-xl md:max-w-2xl">
            <div className="flex gap-4 sm:gap-5">
              {/* <span
                className="mt-1.5 w-1 shrink-0 self-start rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.85)] sm:mt-2 sm:w-1.5"
                style={{ height: "clamp(2.4rem, 7vw, 4.2rem)" }}
                aria-hidden
              /> */}
              <div>
                <h1 className="font-display text-[clamp(2.75rem,9vw,5.5rem)] leading-[0.9] tracking-wide text-white">
                  <span>OUR </span>
                  <span className="relative inline-block pb-[0.35em] pr-[0.1em] text-primary">
                    <span className="relative z-[1]">STORY</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/images/red_stroke.png"
                      alt=""
                      aria-hidden
                      className="pointer-events-none absolute left-[-4%] top-[70%] z-0 h-[0.36em] w-[112%] max-w-none select-none object-fill object-left sm:h-[0.32em]"
                    />
                  </span>
                </h1>
                <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/75 sm:mt-0 sm:text-base">
                  Built on passion. Driven by people. Shaping stronger tomorrows.
                </p>
              </div>
            </div>
          </ScrollAnimate>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <ScrollAnimate animation="fade-right">
              <div className="mb-6 flex items-center gap-3">
                <span
                  className="-mt-[7px] h-2 w-8 shrink-0 rounded-xs bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.85)]"
                  aria-hidden
                />
                <h2 className="font-display text-2xl italic leading-normal tracking-wide text-foreground sm:text-3xl md:text-4xl">
                  FORGING STRONGER <span className="text-primary">FUTURES</span>
                </h2>
              </div>
              <p className="text-muted-foreground mb-6">
                Forge was born from a simple belief: gyms deserve software that helps people train —
                not just sell memberships. We saw too many tools that looked big on paper and broke
                on the floor.
              </p>
              <p className="text-muted-foreground mb-6">
                So we built a hub for owners, trainers, and members: clear gym pages, approval flows,
                progress tracking, and room to grow features like classes and billing in later phases.
              </p>
              <p className="text-muted-foreground mb-8">
                Today Forge is in soft launch with partner gyms. The stats you see on the site are
                live — they grow as the network grows.
              </p>
              <Button variant="outline" asChild>
                <Link href="/gyms">
                  Browse partner gyms
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </ScrollAnimate>
            <ScrollAnimate animation="fade-left" delay={0.2}>
              <div className="relative">
                <div className="aspect-[4/3] rounded-2xl overflow-hidden">
                  <img
                    src="/images/hero-gym.jpg"
                    alt="Forge gym interior"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-8 -left-8 glass-card rounded-xl p-6 glow-effect">
                  <div className="font-display text-4xl text-primary">15+</div>
                  <div className="text-muted-foreground text-sm">Years of Excellence</div>
                </div>
              </div>
            </ScrollAnimate>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 bg-card">
        <div className="mx-auto max-w-7xl px-4">
          <ScrollAnimate animation="fade-up" className="mb-16 text-left">
            <div className="mb-4 flex items-center gap-3">
              <span
                className="-mt-[7px] h-2 w-8 shrink-0 rounded-xs bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.85)]"
                aria-hidden
              />
              <h2 className="font-display text-2xl italic leading-normal tracking-wide text-foreground sm:text-3xl md:text-4xl">
                <span className="text-foreground">OUR </span>
                <span className="inline-block pr-[0.1em] text-primary">VALUES</span>
              </h2>
            </div>
            <p className="max-w-2xl text-lg text-muted-foreground">
              These core values guide everything we do at Forge.
            </p>
          </ScrollAnimate>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <ScrollAnimate
                key={value.title}
                animation="fade-up"
                delay={index * 0.1}
                className="text-center"
              >
                <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <value.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-display text-2xl mb-3">{value.title}</h3>
                <p className="text-muted-foreground text-sm">{value.description}</p>
              </ScrollAnimate>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4">
          <ScrollAnimate animation="fade-up">
            <div className="mb-16 flex items-center gap-3">
              <span
                className="-mt-[7px] h-2 w-8 shrink-0 rounded-xs bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.85)]"
                aria-hidden
              />
              <h2 className="font-display text-2xl italic leading-normal tracking-wide text-foreground sm:text-3xl md:text-4xl">
                <span className="text-foreground">OUR </span>
                <span className="inline-block pr-[0.1em] text-primary">JOURNEY</span>
              </h2>
            </div>
          </ScrollAnimate>
          <div className="max-w-7xl mx-auto">
            {timeline.map((item, index) => (
              <ScrollAnimate
                key={item.year}
                animation="fade-up"
                delay={index * 0.1}
              >
                <div className="flex gap-8 mb-12 last:mb-0">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center font-display text-xl text-primary-foreground">
                      {item.year}
                    </div>
                    {index < timeline.length - 1 && (
                      <div className="w-0.5 h-full bg-border mt-4" />
                    )}
                  </div>
                  <div className="flex-1 pb-12">
                    <h3 className="font-display text-2xl mb-2">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              </ScrollAnimate>
            ))}
          </div>
        </div>
      </section>

      {/* Soft launch note */}
      <section className="border-y border-border bg-card py-20">
        <div className=" mx-auto max-w-7xl px-4 text-left">
          <ScrollAnimate animation="fade-up">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary">
              Soft launch
            </p>
            <div className="mb-4 flex items-center gap-3">
              <span
                className="-mt-[7px] h-2 w-8 shrink-0 rounded-xs bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.85)]"
                aria-hidden
              />
              <h2 className="font-display text-2xl italic leading-normal tracking-wide text-foreground sm:text-3xl md:text-4xl">
                Honest members, 
                <span className="inline-block pr-[0.1em] text-primary">trainers</span> and <span className="inline-block pr-[0.1em] text-primary">gyms</span> only
              </h2>
            </div>
            <p className="text-muted-foreground">
              Member, trainer, and gym counts on Forge update from live data. We&apos;re growing with
              real partners — check the home page for current figures.
            </p>
          </ScrollAnimate>
        </div>
      </section>

      {/* CTA */}
      <section className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/contact_section.png"
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-black/55 to-transparent sm:from-black/92 sm:via-black/40 sm:to-transparent" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[52svh] max-w-4xl flex-col items-center justify-center px-4 py-20 text-center sm:min-h-[48svh] sm:py-24">
          <ScrollAnimate animation="scale" className="w-full">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.28em] text-primary sm:text-xs">
              Soft launch
              <span className="mx-2 text-primary/70">/</span>
              Real partners
            </p>
            <h2 className="font-display text-[clamp(2.5rem,8vw,5rem)] leading-[0.92] tracking-wide text-white">
              <span className="block">BECOME PART OF</span>
              <span className="relative mt-[-0.04em] inline-block pb-[0.3em] pr-[0.08em] text-primary">
                <span className="relative z-[1]">OUR STORY</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/red_stroke.png"
                  alt=""
                  aria-hidden
                  className="pointer-events-none absolute left-[-3%] top-[72%] z-0 h-[0.34em] w-[108%] max-w-none select-none object-fill object-left sm:h-[0.3em]"
                />
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/80 sm:mt-5 sm:text-base">
              Join a partner gym on Forge and train with a platform built for the
              floor — not marketing fiction.
            </p>
            <div className="mt-8 flex justify-center sm:mt-10">
              <Button
                asChild
                variant="hero"
                className="h-12 rounded-full px-7 text-sm font-semibold"
              >
                <Link href="/gyms">
                  Find a gym
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </ScrollAnimate>
        </div>
      </section>

      <Footer />
    </div>
  );
}