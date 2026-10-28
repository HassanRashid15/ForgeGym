"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Instagram, Mail, Award, ArrowRight, Building2, MapPin } from "lucide-react";
import { ScrollAnimate } from "@/hooks/useScrollAnimation";
import { TrainersPageFaq } from "@/components/marketing/FaqAccordion";
import { getNameInitials } from "@/lib/utils";
import type { PublicTrainerListItem } from "@/lib/gyms";
import { TrainerCardSkeleton } from "@/components/loading/TrainerCardSkeleton";
import { normalizeSocialUrl } from "@/lib/social-links";

type TrainersPageClientProps = {
  trainers: PublicTrainerListItem[];
};

export default function TrainersPageClient({ trainers }: TrainersPageClientProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate initial loading for better UX
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);
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
            src="/images/gym_trainers.png"
            alt=""
            className="absolute inset-0 h-full w-full sm:object-[50%_top]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-black/55 to-transparent sm:from-black/92 sm:via-black/40 sm:to-transparent" />
          {/* <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-black/25" /> */}
        </div>

        <div className="relative z-10 mx-auto flex min-h-[78svh] max-w-7xl flex-col justify-center px-4 pb-12 pt-28 sm:min-h-[75svh] sm:px-6 sm:pb-14 sm:pt-32 lg:px-8 lg:pb-16">
          <ScrollAnimate animation="fade-up" className="max-w-xl md:max-w-4xl lg:max-w-5xl">
            <span className="mb-4 inline-flex rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary sm:text-[11px]">
              Coaches
            </span>
            <h1 className="font-display text-[clamp(2.5rem,8vw,5.25rem)] leading-[0.9] tracking-wide text-white md:whitespace-nowrap">
              <span>MEET OUR </span>
              <span className="relative inline-block pb-[0.35em] pr-[0.1em] italic text-primary">
                <span className="relative z-[1]">TRAINERS</span>
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
              Our certified professionals are dedicated to helping you reach your
              fitness goals with personalized guidance and support.
            </p>
          </ScrollAnimate>
        </div>
      </section>

      {/* Trainers Grid */}
      <section className="relative z-10 scroll-mt-24 pb-16 pt-8 sm:pt-10">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-1 flex items-center gap-3">
            <span
              className="h-2 w-8 shrink-0 rounded-xs bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.85)] -mt-[7px]"
              aria-hidden
            />
            <h2 className="font-display text-2xl italic leading-normal tracking-wide text-foreground sm:text-3xl md:text-4xl">
              <span className="text-foreground">FEATURED </span>
              <span className="inline-block pr-[0.1em] text-primary">
                TRAINERS
              </span>
            </h2>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <TrainerCardSkeleton key={i} />
              ))}
            </div>
          ) : trainers.length === 0 ? (
            <p className="text-left text-muted-foreground">
              Trainers from published gyms will appear here.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
              {trainers.map((trainer, index) => {
                const certifications = trainer.certifications?.filter(Boolean) || [];
                const specialties =
                  trainer.skills?.filter(Boolean) ||
                  (trainer.specialization ? [trainer.specialization] : []);
                const href = `/trainers/${trainer.userId}?gym=${encodeURIComponent(trainer.gymOwnerId)}`;

                return (
                  <ScrollAnimate
                    key={trainer.userId}
                    animation={index % 2 === 0 ? "fade-right" : "fade-left"}
                    delay={index * 0.15}
                  >
                    <div className="glass-card group h-full overflow-hidden rounded-2xl hover-lift">
                      <div className="grid h-full grid-cols-1 lg:grid-cols-2">
                        {/* Image */}
                        <Link
                          href={href}
                          className="relative block h-64 overflow-hidden lg:h-full"
                        >
                          {trainer.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={trainer.avatarUrl}
                              alt={trainer.fullName || "Trainer"}
                              className="h-full w-full transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-primary text-4xl font-bold text-primary-foreground">
                              {getNameInitials(trainer.fullName || "PT")}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent lg:hidden" />
                        </Link>

                        {/* Content */}
                        <div className="flex flex-col p-8">
                          <h3 className="font-display mb-1 text-3xl">
                            {trainer.fullName || "Trainer"}
                          </h3>
                          <p className="mb-2 font-medium text-primary">
                            {trainer.specialization || "Personal trainer"}
                          </p>
                          <p className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                            <Link
                              href={`/gyms/${trainer.gymOwnerId}`}
                              className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
                            >
                              <span className="relative flex size-5 shrink-0 items-center justify-center overflow-hidden rounded bg-primary">
                                {trainer.gymMainImageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={trainer.gymMainImageUrl}
                                    alt={trainer.gymName}
                                    className="absolute inset-0 size-full object-cover"
                                  />
                                ) : (
                                  <Building2 className="h-3 w-3 text-primary-foreground" />
                                )}
                              </span>
                              <span>{trainer.gymName}</span>
                            </Link>
                            {trainer.gymCity && (
                              <span className="inline-flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-primary" />
                                {trainer.gymCity}
                              </span>
                            )}
                          </p>
                          <p className="mb-6 text-sm text-muted-foreground">
                            {trainer.bio ||
                              `${trainer.fullName || "This trainer"} coaches at ${trainer.gymName}.`}
                          </p>

                          {certifications.length > 0 && (
                            <div className="mb-6">
                              <div className="mb-2 flex items-center gap-2">
                                <Award className="h-4 w-4 text-primary" />
                                <span className="text-sm font-semibold">Certifications</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {certifications.map((cert) => (
                                  <span
                                    key={cert}
                                    className="rounded bg-secondary px-2 py-1 text-xs"
                                  >
                                    {cert}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {specialties.length > 0 && (
                            <div className="mb-6">
                              <span className="mb-2 block text-sm font-semibold">
                                Specialties
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {specialties.map((s) => (
                                  <span
                                    key={s}
                                    className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                                  >
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="mt-auto flex items-center gap-3 pt-4">
                            {normalizeSocialUrl(trainer.instagramUrl) ? (
                              <a
                                href={normalizeSocialUrl(trainer.instagramUrl)!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary transition-colors hover:bg-primary hover:text-primary-foreground"
                                aria-label="Instagram"
                              >
                                <Instagram className="h-5 w-5" />
                              </a>
                            ) : null}
                            <a
                              href="/contact"
                              className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary transition-colors hover:bg-primary hover:text-primary-foreground"
                              aria-label="Email"
                            >
                              <Mail className="h-5 w-5" />
                            </a>
                            <Button size="sm" className="ml-auto" asChild>
                              <Link href={href}>
                                View Profile
                                <ArrowRight className="ml-1 h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </ScrollAnimate>
                );
              })}
            </div>
          )}
        </div>
      </section>    
      <section className="bg-card py-24">
        <div className="mx-auto max-w-7xl px-4">
          <ScrollAnimate animation="scale" className="text-left">
            <div className="mb-6 flex items-center gap-3">
              <span
                className="-mt-[7px] h-2 w-8 shrink-0 rounded-xs bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.85)]"
                aria-hidden
              />
              <h2 className="font-display text-2xl italic leading-normal tracking-wide text-foreground sm:text-3xl md:text-4xl">
                TRAIN WITH THE <span className="text-primary">BEST</span>
              </h2>
            </div>
            <p className="mb-8 max-w-xl text-lg text-muted-foreground">
              Book a free consultation with one of our trainers and start your personalized
              fitness journey.
            </p>
            <Button variant="hero" asChild>
              <Link href="/contact">Book Free Consultation</Link>
            </Button>
          </ScrollAnimate>
        </div>
      </section>
      <TrainersPageFaq />
      <Footer />
    </div>
  );
}