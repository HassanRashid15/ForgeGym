"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { allEquipment, equipmentCategories } from "@/data/equipment";
import { ChevronRight, Dumbbell } from "lucide-react";
import { ScrollAnimate } from "@/hooks/useScrollAnimation";
import InteractiveBackground from "@/components/marketing/InteractiveBackground";
import { ComingSoonOverlay } from "@/components/ComingSoonOverlay";

export default function EquipmentPage() {
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredEquipment = activeCategory === "All"
    ? allEquipment
    : allEquipment.filter((e) => e.category === activeCategory);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <ComingSoonOverlay
        title="Equipment catalog coming soon"
        description="Preview our equipment library. Full guides and booking unlock next — join now for early access."
        icon={Dumbbell}
      >
      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-16 bg-card">
        <InteractiveBackground variant="gradient" />
        <div className="container mx-auto px-4 relative z-10">

          <ScrollAnimate animation="fade-up">
            <h1 className="font-display text-6xl md:text-8xl mb-4">
              GYM <span className="text-gradient">EQUIPMENT</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Explore our state-of-the-art equipment. From cardio machines to free weights, we have everything you need for a complete workout.
            </p>
          </ScrollAnimate>
        </div>
      </section>

      {/* Filters */}
      <section className="py-8 border-b border-border sticky top-16 bg-background/80 backdrop-blur-lg z-40">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap gap-2">
            {equipmentCategories.map((category) => (
              <Button
                key={category}
                variant={activeCategory === category ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Equipment Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEquipment.map((equipment, index) => (
              <ScrollAnimate
                key={equipment.id}
                animation="fade-up"
                delay={index * 0.1}
              >
                <div className="glass-card rounded-xl overflow-hidden hover-lift group h-full flex flex-col">
                  <Link href={`/equipment/${equipment.id}`} className="block relative h-56 overflow-hidden">
                    <img
                      src={equipment.image}
                      alt={equipment.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                        {equipment.category}
                      </span>
                    </div>
                    <div className="absolute top-4 right-4">
                      <span className="px-3 py-1 bg-secondary text-secondary-foreground text-xs font-bold rounded-full">
                        {equipment.quantity} available
                      </span>
                    </div>
                  </Link>
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="font-display text-2xl mb-2 group-hover:text-primary transition-colors">
                      {equipment.name}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                      {equipment.shortDescription}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {equipment.muscleGroups.slice(0, 3).map((muscle) => (
                        <span
                          key={muscle}
                          className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                        >
                          {muscle}
                        </span>
                      ))}
                      {equipment.muscleGroups.length > 3 && (
                        <span className="px-2 py-1 bg-secondary text-muted-foreground text-xs rounded-full">
                          +{equipment.muscleGroups.length - 3} more
                        </span>
                      )}
                    </div>

                    <Button className="w-full mt-auto" asChild>
                      <Link href={`/equipment/${equipment.id}`}>
                        View Details
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Link>
                    </Button>
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
            <Dumbbell className="w-16 h-16 text-primary mx-auto mb-6" />
            <h2 className="font-display text-5xl md:text-6xl mb-6">
              NEED <span className="text-gradient">GUIDANCE?</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              Our trainers can show you how to use any equipment safely and effectively. Book a free orientation session.
            </p>
            <Button variant="hero" asChild>
              <Link href="/contact">Book Orientation</Link>
            </Button>
          </ScrollAnimate>
        </div>
      </section>
      </ComingSoonOverlay>

      <Footer />
    </div>
  );
}