"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ArrowRight, Zap, Users, Clock, Trophy, Star, ChevronRight, ChevronDown, Building2, MapPin, Dumbbell } from "lucide-react";
import { useEffect, useState } from "react";
import { ScrollAnimate } from "@/hooks/useScrollAnimation";
import InteractiveBackground from "@/components/marketing/InteractiveBackground";
import { ComingSoonOverlay } from "@/components/ComingSoonOverlay";
import TypingText from "@/components/marketing/TypingText";
import { useSplash } from "@/components/marketing/SplashProvider";

export type FeaturedGym = {
  ownerId: string;
  gymName: string;
  gymType: string | null;
  gymCity: string | null;
  gymMainImageUrl: string | null;
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

const testimonials = [
  {
    name: "Sarah Mitchell",
    role: "Member since 2022",
    content: "Forge completely transformed my fitness journey. The trainers are incredible and the community is so supportive.",
    rating: 5,
  },
  {
    name: "David Chen",
    role: "Member since 2021",
    content: "Best gym I've ever been to. The equipment is top-notch and the classes are challenging but fun.",
    rating: 5,
  },
  {
    name: "Emily Rodriguez",
    role: "Member since 2023",
    content: "I've lost 30 pounds and gained so much confidence. Forge isn't just a gym, it's a lifestyle.",
    rating: 5,
  },
];

export default function HomePageClient({
  featuredGyms = [],
}: {
  featuredGyms?: FeaturedGym[];
}) {
  const { splashReady } = useSplash();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    if (!splashReady) {
      setScrollY(0);
      return;
    }

    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [splashReady]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section with Parallax — only after splash so scroll doesn't fight the preloader */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0"
          style={{ transform: `translateY(${splashReady ? scrollY * 0.5 : 0}px)` }}
        >
          <img
            src="/images/hero-gym.jpg"
            alt="Gym interior with dramatic lighting"
            className="w-full h-[120%] object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />
        </div>
        
        {/* Fire glow effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-0 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-accent/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
        </div>

        {/* Interactive particle background */}
        <InteractiveBackground variant="particles" density={70} />

        
        <div 
          className="container mx-auto px-4 relative z-10 pt-20"
          style={{ transform: `translateY(${splashReady ? scrollY * 0.2 : 0}px)` }}
        >
          <div className="max-w-2xl">
            <p className="text-sm md:text-base uppercase tracking-[0.3em] text-primary mb-4 animate-slide-up">
              Unleash. Ignite. Dominate.
            </p>
            <h1 className="font-display text-6xl md:text-8xl leading-none mb-6 animate-slide-up">
              FORGE YOUR
              <span className="text-gradient block drop-shadow-[0_0_30px_hsl(0,95%,55%,0.5)] min-h-[1.1em]">
                <TypingText
                  phrases={["FUTURE", "STRENGTH", "LEGACY", "GREATNESS", "POWER"]}
                />
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 animate-slide-up" style={{ animationDelay: "0.1s" }}>
              Sweat is your fuel. Every rep, every drop, every breath ΓÇö this is where champions are built. Push past limits with elite coaches, cutting-edge gear, and a tribe that refuses to quit.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <Button variant="hero" asChild>
                <Link href="/membership">
                  Start Your Journey
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button variant="heroOutline" asChild>
                <Link href="/classes">
                  Explore Classes
                </Link>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce z-10">
          <ChevronDown className="w-8 h-8 text-primary" />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-card">
        <div className="container mx-auto px-4">
          <ScrollAnimate animation="fade-up" className="text-center mb-16">
            <h2 className="font-display text-5xl md:text-6xl mb-4">WHY CHOOSE FORGE</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              We provide everything you need to achieve your fitness goals in one place.
            </p>
          </ScrollAnimate>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <ScrollAnimate
                key={feature.title}
                animation="fade-up"
                delay={index * 0.1}
              >
                <div className="glass-card rounded-xl p-8 hover-lift h-full">
                  <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
                    <feature.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-display text-2xl mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </div>
              </ScrollAnimate>
            ))}
          </div>
        </div>
      </section>

      {/* Classes Preview */}
      <section className="py-24 bg-gradient-to-b from-background to-card/50">
        <div className="container mx-auto px-4">
          {featuredGyms.length > 0 && (
            <ScrollAnimate animation="fade-up">
              <div className="mb-16">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-primary">
                      Featured gyms
                    </p>
                    <h2 className="font-display text-3xl md:text-4xl">Discover Top Locations</h2>
                  </div>
                  <Button variant="outline" asChild className="hidden md:flex">
                    <Link href="/gyms">
                      View All Gyms
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featuredGyms.map((gym) => (
                    <Link
                      key={gym.ownerId}
                      href={`/gyms/${gym.ownerId}`}
                      className="group"
                    >
                      <div className="glass-card hover-lift flex h-full flex-col overflow-hidden rounded-2xl">
                        <div className="relative aspect-[16/10] overflow-hidden bg-secondary/30">
                          {gym.gymMainImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={gym.gymMainImageUrl}
                              alt={gym.gymName}
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 via-secondary/40 to-background">
                              <Building2 className="h-10 w-10 text-primary/70" />
                            </div>
                          )}
                          {gym.gymType && (
                            <span className="absolute right-3 top-3 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                              {gym.gymType}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-1 flex-col p-6">
                          <h3 className="font-display mb-2 text-xl font-bold transition-colors group-hover:text-primary">
                            {gym.gymName}
                          </h3>

                          {gym.gymCity && (
                            <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              <span>{gym.gymCity}</span>
                            </div>
                          )}

                          <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-4">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Users className="h-4 w-4" />
                              <span>Active Members</span>
                            </div>
                            <div className="flex items-center gap-1 text-primary transition-all group-hover:gap-2">
                              <span className="text-sm font-medium">Visit</span>
                              <ChevronRight className="h-4 w-4" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Mobile View All Button */}
                <div className="mt-6 md:hidden">
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/gyms">
                      View All Gyms
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </ScrollAnimate>
          )}

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

      {/* Stats Section */}
      <section className="py-24 bg-card">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "10K+", label: "Active Members" },
              { value: "50+", label: "Expert Trainers" },
              { value: "100+", label: "Weekly Classes" },
              { value: "15", label: "Years of Excellence" },
            ].map((stat, index) => (
              <ScrollAnimate
                key={stat.label}
                animation="fade-up"
                delay={index * 0.1}
                className="text-center"
              >
                <div className="font-display text-5xl md:text-7xl text-primary mb-2">{stat.value}</div>
                <p className="text-muted-foreground">{stat.label}</p>
              </ScrollAnimate>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <ScrollAnimate animation="fade-up" className="text-center mb-16">
            <h2 className="font-display text-5xl md:text-6xl mb-4">MEMBER STORIES</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Real results from real people who chose to transform their lives at Forge.
            </p>
          </ScrollAnimate>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <ScrollAnimate
                key={testimonial.name}
                animation="fade-up"
                delay={index * 0.15}
              >
                <div className="glass-card rounded-xl p-8 hover-lift h-full">
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-primary fill-primary" />
                    ))}
                  </div>
                  <p className="text-foreground mb-6 italic">"{testimonial.content}"</p>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </ScrollAnimate>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-card relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <ScrollAnimate animation="scale" className="text-center max-w-3xl mx-auto">
            <h2 className="font-display text-5xl md:text-7xl mb-6">
              READY TO <span className="text-gradient">TRANSFORM</span>?
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Join thousands of members who have already started their fitness journey. Your first week is on us.
            </p>
            <Button variant="hero" size="xl" asChild>
              <Link href="/membership">
                Get Started Free
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
