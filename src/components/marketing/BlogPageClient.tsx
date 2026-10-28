"use client";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import InteractiveBackground from "@/components/marketing/InteractiveBackground";
import { BlogSection } from "@/components/marketing/BlogSection";
import { ScrollAnimate } from "@/hooks/useScrollAnimation";

export default function BlogPageClient() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative overflow-hidden bg-card pb-12 pt-32">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary blur-3xl" />
        </div>
        <InteractiveBackground variant="gradient" />

        <div className="relative z-10 mx-auto max-w-7xl px-4">
          <ScrollAnimate animation="fade-up">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
              Insights
            </p>
            <h1 className="font-display mb-4 text-5xl md:text-7xl">
              FORGE <span className="text-gradient">BLOG</span>
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Fitness advice, nutrition tips, and workout strategies — all posts in one place.
            </p>
          </ScrollAnimate>
        </div>
      </section>

      <BlogSection compact paginate />

      <Footer />
    </div>
  );
}
