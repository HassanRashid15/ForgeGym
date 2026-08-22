import Link from 'next/link';

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Instagram, Mail, Award, ArrowRight } from "lucide-react";
import { ScrollAnimate } from "@/hooks/useScrollAnimation";
import { usePageLoading } from "@/hooks/usePageLoading";
import PageSkeleton from "@/components/skeletons/PageSkeleton";
import InteractiveBackground from "@/components/InteractiveBackground";
import { allTrainers } from "@/data/trainers";

const Trainers = () => {
  const isLoading = usePageLoading(500);

  if (isLoading) {
    return <PageSkeleton variant="trainers" />;
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
              MEET OUR <span className="text-gradient">TRAINERS</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Our certified professionals are dedicated to helping you reach your fitness goals with personalized guidance and support.
            </p>
          </ScrollAnimate>
        </div>
      </section>

      {/* Trainers Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {allTrainers.map((trainer, index) => (
              <ScrollAnimate
                key={trainer.id}
                animation={index % 2 === 0 ? "fade-right" : "fade-left"}
                delay={index * 0.15}
              >
                <div className="glass-card rounded-2xl overflow-hidden hover-lift group h-full">
                  <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
                    {/* Image */}
                    <Link href={`/trainers/${trainer.id}`} className="relative h-64 lg:h-full overflow-hidden block">
                      <img
                        src={trainer.image}
                        alt={trainer.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent lg:hidden" />
                    </Link>

                    {/* Content */}
                    <div className="p-8 flex flex-col">
                      <h3 className="font-display text-3xl mb-1">{trainer.name}</h3>
                      <p className="text-primary font-medium mb-4">{trainer.role}</p>
                      <p className="text-muted-foreground text-sm mb-6">{trainer.bio}</p>

                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-2">
                          <Award className="w-4 h-4 text-primary" />
                          <span className="text-sm font-semibold">Certifications</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {trainer.certifications.map((cert) => (
                            <span key={cert} className="px-2 py-1 bg-secondary text-xs rounded">
                              {cert}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mb-6">
                        <span className="text-sm font-semibold block mb-2">Specialties</span>
                        <div className="flex flex-wrap gap-2">
                          {trainer.specialties.map((s) => (
                            <span key={s} className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-auto pt-4">
                        <a href={trainer.instagram} className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                          <Instagram className="w-5 h-5" />
                        </a>
                        <a href={`mailto:${trainer.email}`} className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                          <Mail className="w-5 h-5" />
                        </a>
                        <Button size="sm" className="ml-auto" asChild>
                          <Link href={`/trainers/${trainer.id}`}>
                            View Profile
                            <ArrowRight className="w-4 h-4 ml-1" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollAnimate>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-card">
        <div className="container mx-auto px-4 text-center">
          <ScrollAnimate animation="scale">
            <h2 className="font-display text-5xl md:text-6xl mb-6">
              TRAIN WITH THE <span className="text-gradient">BEST</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              Book a free consultation with one of our trainers and start your personalized fitness journey.
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
};

export default Trainers;
