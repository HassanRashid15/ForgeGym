"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Target, Heart, Users, Award, ArrowRight } from "lucide-react";
import { ScrollAnimate } from "@/hooks/useScrollAnimation";
import { PageSkeleton } from "@/components/loading/PageSkeleton";
import InteractiveBackground from "@/components/marketing/InteractiveBackground";

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

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-16 bg-card">
        <InteractiveBackground variant="gradient" />
        <div className="container mx-auto px-4 relative z-10">

          <ScrollAnimate animation="fade-up">
            <h1 className="font-display text-6xl md:text-8xl mb-4">
              OUR <span className="text-gradient">STORY</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              More than a gym — we're a community dedicated to transforming lives through fitness.
            </p>
          </ScrollAnimate>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <ScrollAnimate animation="fade-right">
              <h2 className="font-display text-5xl mb-6">
                FORGING STRONGER <span className="text-gradient">FUTURES</span>
              </h2>
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
        <div className="container mx-auto px-4">
          <ScrollAnimate animation="fade-up" className="text-center mb-16">
            <h2 className="font-display text-5xl mb-4">OUR VALUES</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
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
        <div className="container mx-auto px-4">
          <ScrollAnimate animation="fade-up">
            <h2 className="font-display text-5xl text-center mb-16">OUR JOURNEY</h2>
          </ScrollAnimate>
          <div className="max-w-3xl mx-auto">
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
        <div className="container mx-auto max-w-2xl px-4 text-center">
          <ScrollAnimate animation="fade-up">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary">
              Soft launch
            </p>
            <h2 className="font-display mb-4 text-4xl tracking-normal md:text-5xl">
              Honest numbers only
            </h2>
            <p className="text-muted-foreground">
              Member, trainer, and gym counts on Forge update from live data. We&apos;re growing with
              real partners — check the home page for current figures.
            </p>
          </ScrollAnimate>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container mx-auto px-4 text-center">
          <ScrollAnimate animation="scale">
            <h2 className="font-display text-5xl md:text-6xl mb-6">
              BECOME PART OF <span className="text-gradient">OUR STORY</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              Join a partner gym on Forge and train with a platform built for the floor — not
              marketing fiction.
            </p>
            <Button variant="hero" asChild>
              <Link href="/gyms">
                Find a gym
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
          </ScrollAnimate>
        </div>
      </section>

      <Footer />
    </div>
  );
}