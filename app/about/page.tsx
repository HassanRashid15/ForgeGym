"use client";

import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Target, Heart, Users, Award, ArrowRight } from "lucide-react";
import { ScrollAnimate } from "@/hooks/useScrollAnimation";
import { usePageLoading } from "@/hooks/usePageLoading";
import PageSkeleton from "@/components/skeletons/PageSkeleton";
import InteractiveBackground from "@/components/InteractiveBackground";
import heroImage from "@/assets/hero-gym.jpg";

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
  { year: "2009", title: "The Beginning", description: "Forge was founded with a single location and a vision to create a different kind of gym." },
  { year: "2012", title: "First Expansion", description: "We opened our second location due to overwhelming demand from our growing community." },
  { year: "2016", title: "Innovation", description: "Launched our signature HIIT program that would become one of the most popular classes." },
  { year: "2020", title: "Digital Transformation", description: "Introduced our mobile app and online training to reach members anywhere." },
  { year: "2024", title: "Today", description: "Now with 5 locations and 50+ trainers, we continue to grow while staying true to our values." },
];

export default function AboutPage() {
  const isLoading = usePageLoading(500);

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
                Forge was born from a simple belief: everyone deserves access to world-class fitness facilities and expert guidance. We saw too many gyms focused on selling memberships rather than transforming lives.
              </p>
              <p className="text-muted-foreground mb-6">
                So in 2009, we set out to create something different. A gym where the equipment is always top-notch, the trainers are true professionals, and the community is welcoming to everyone — from first-timers to elite athletes.
              </p>
              <p className="text-muted-foreground mb-8">
                Today, Forge stands as a testament to what's possible when you put people first. With over 10,000 active members and 50+ certified trainers, we've become one of the most respected fitness brands in the country.
              </p>
              <Button variant="outline" asChild>
                <Link href="/membership">
                  Join Our Community
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </ScrollAnimate>
            <ScrollAnimate animation="fade-left" delay={0.2}>
              <div className="relative">
                <div className="aspect-[4/3] rounded-2xl overflow-hidden">
                  <img
                    src={heroImage.src}
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

      {/* Stats */}
      <section className="py-24 bg-card">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "5", label: "Locations" },
              { value: "50+", label: "Expert Trainers" },
              { value: "10K+", label: "Active Members" },
              { value: "1M+", label: "Workouts Completed" },
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

      {/* CTA */}
      <section className="py-24">
        <div className="container mx-auto px-4 text-center">
          <ScrollAnimate animation="scale">
            <h2 className="font-display text-5xl md:text-6xl mb-6">
              BECOME PART OF <span className="text-gradient">OUR STORY</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              Join thousands of members who have made Forge their fitness home.
            </p>
            <Button variant="hero" asChild>
              <Link href="/membership">
                Start Your Journey
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