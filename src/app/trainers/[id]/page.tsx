"use client";

import { use } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { getTrainerById, allTrainers } from "@/data/trainers";
import { ArrowLeft, Award, Instagram, Mail, Star, Users, Calendar } from "lucide-react";

interface TrainerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function TrainerDetailPage({ params }: TrainerDetailPageProps) {
  const resolvedParams = use(params);
  const trainer = getTrainerById(resolvedParams.id);

  if (!trainer) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 pb-16 container mx-auto px-4 text-center">
          <h1 className="font-display text-5xl mb-4">Trainer Not Found</h1>
          <Button asChild>
            <Link href="/trainers">Back to Trainers</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const related = allTrainers.filter((t) => t.id !== trainer.id).slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-24 relative">
        <div className="absolute inset-0 h-[50vh]">
          <img src={trainer.image} alt={trainer.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        </div>

        <div className="container mx-auto px-4 relative z-10 pt-32 pb-16">
          <Link href="/trainers" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Trainers
          </Link>
          <h1 className="font-display text-6xl md:text-8xl mb-2">{trainer.name}</h1>
          <p className="text-xl text-primary font-semibold">{trainer.role}</p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-12">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="glass-card rounded-xl p-6 text-center">
                  <Star className="w-8 h-8 text-primary mx-auto mb-2" />
                  <div className="font-display text-2xl">{trainer.rating}</div>
                  <div className="text-muted-foreground text-sm">Rating</div>
                </div>
                <div className="glass-card rounded-xl p-6 text-center">
                  <Users className="w-8 h-8 text-primary mx-auto mb-2" />
                  <div className="font-display text-2xl">{trainer.clients}</div>
                  <div className="text-muted-foreground text-sm">Clients</div>
                </div>
                <div className="glass-card rounded-xl p-6 text-center">
                  <Award className="w-8 h-8 text-primary mx-auto mb-2" />
                  <div className="font-display text-2xl">{trainer.experience}</div>
                  <div className="text-muted-foreground text-sm">Experience</div>
                </div>
              </div>

              <div>
                <h2 className="font-display text-3xl mb-4">ABOUT {trainer.name.split(" ")[0].toUpperCase()}</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">{trainer.bio}</p>
                <p className="text-muted-foreground leading-relaxed">{trainer.longBio}</p>
              </div>

              <div>
                <h2 className="font-display text-3xl mb-4 flex items-center gap-2">
                  <Award className="w-8 h-8 text-primary" />
                  CERTIFICATIONS
                </h2>
                <div className="flex flex-wrap gap-3">
                  {trainer.certifications.map((c) => (
                    <span key={c} className="px-4 py-2 bg-secondary rounded-lg font-medium">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="font-display text-3xl mb-4">SPECIALTIES</h2>
                <div className="flex flex-wrap gap-3">
                  {trainer.specialties.map((s) => (
                    <span key={s} className="px-4 py-2 bg-primary/10 text-primary font-semibold rounded-full">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <aside className="lg:sticky lg:top-24 self-start h-fit space-y-6">
              <div className="glass-card rounded-xl p-6">
                <h3 className="font-display text-2xl mb-4">BOOK A SESSION</h3>
                <div className="mb-6">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    Available Times
                  </h4>
                  <div className="space-y-2">
                    {trainer.schedule.map((t, i) => (
                      <div key={i} className="px-4 py-3 bg-secondary rounded-lg text-sm flex justify-between items-center">
                        <span>{t}</span>
                        <button className="text-primary hover:underline text-xs font-semibold">Select</button>
                      </div>
                    ))}
                  </div>
                </div>
                <Button className="w-full" variant="hero" asChild>
                  <Link href="/contact">Book Free Consultation</Link>
                </Button>
              </div>

              <div className="glass-card rounded-xl p-6">
                <h4 className="font-display text-xl mb-4">CONNECT</h4>
                <div className="flex gap-3">
                  <a href={trainer.instagram} className="flex-1 h-11 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                    <Instagram className="w-5 h-5" />
                  </a>
                  <a href={`mailto:${trainer.email}`} className="flex-1 h-11 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                    <Mail className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </aside>
          </div>

          {/* Other trainers */}
          {related.length > 0 && (
            <div className="mt-24">
              <h2 className="font-display text-4xl mb-8">
                MEET OTHER <span className="text-gradient">TRAINERS</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {related.map((rt) => (
                  <div key={rt.id} className="glass-card rounded-xl overflow-hidden hover-lift group flex flex-col">
                    <Link href={`/trainers/${rt.id}`} className="block relative h-56 overflow-hidden">
                      <img src={rt.image} alt={rt.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    </Link>
                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="font-display text-xl mb-1">{rt.name}</h3>
                      <p className="text-primary text-sm font-medium mb-4">{rt.role}</p>
                      <Button size="sm" className="w-full mt-auto" asChild>
                        <Link href={`/trainers/${rt.id}`}>View Profile</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}