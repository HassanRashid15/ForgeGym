"use client";

import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Instagram, Mail, Award, ArrowRight, Building2, MapPin } from "lucide-react";
import { ScrollAnimate } from "@/hooks/useScrollAnimation";
import InteractiveBackground from "@/components/marketing/InteractiveBackground";
import { getNameInitials } from "@/lib/utils";
import type { PublicTrainerListItem } from "@/lib/gyms";

type TrainersPageClientProps = {
  trainers: PublicTrainerListItem[];
};

export default function TrainersPageClient({ trainers }: TrainersPageClientProps) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-card pb-16 pt-32">
        <InteractiveBackground variant="gradient" />
        <div className="container relative z-10 mx-auto px-4">
          <ScrollAnimate animation="fade-up">
            <h1 className="font-display mb-4 text-6xl md:text-8xl">
              MEET OUR <span className="text-gradient">TRAINERS</span>
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Our certified professionals are dedicated to helping you reach your fitness goals
              with personalized guidance and support.
            </p>
          </ScrollAnimate>
        </div>
      </section>

      {/* Trainers Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          {trainers.length === 0 ? (
            <p className="text-center text-muted-foreground">
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
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
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
                            <a
                              href="#"
                              className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary transition-colors hover:bg-primary hover:text-primary-foreground"
                              aria-label="Instagram"
                            >
                              <Instagram className="h-5 w-5" />
                            </a>
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

      {/* CTA */}
      <section className="bg-card py-24">
        <div className="container mx-auto px-4 text-center">
          <ScrollAnimate animation="scale">
            <h2 className="font-display mb-6 text-5xl md:text-6xl">
              TRAIN WITH THE <span className="text-gradient">BEST</span>
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-lg text-muted-foreground">
              Book a free consultation with one of our trainers and start your personalized
              fitness journey.
            </p>
            <Button variant="hero" asChild>
              <Link href="/contact">Book Free Consultation</Link>
            </Button>
          </ScrollAnimate>
        </div>
      </section>

      <Footer />
    </div>
  );
}
