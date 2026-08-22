"use client";

import { use } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { getEquipmentById, allEquipment } from "@/data/equipment";
import { ArrowLeft, Check, AlertCircle, Lightbulb, Target } from "lucide-react";
import equipmentTreadmill from "@/assets/equipment-treadmill.jpg";
import equipmentCable from "@/assets/equipment-cable.jpg";
import equipmentBarbell from "@/assets/equipment-barbell.jpg";
import equipmentRowing from "@/assets/equipment-rowing.jpg";
import equipmentKettlebell from "@/assets/equipment-kettlebell.jpg";
import equipmentLegpress from "@/assets/equipment-legpress.jpg";

const equipmentImages: Record<string, string> = {
  "treadmill": equipmentTreadmill.src,
  "cable-machine": equipmentCable.src,
  "barbell-rack": equipmentBarbell.src,
  "rowing-machine": equipmentRowing.src,
  "kettlebells": equipmentKettlebell.src,
  "leg-press": equipmentLegpress.src,
};

interface EquipmentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function EquipmentDetailPage({ params }: EquipmentDetailPageProps) {
  const resolvedParams = use(params);
  const equipment = getEquipmentById(resolvedParams.id);

  if (!equipment) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 pb-16 container mx-auto px-4 text-center">
          <h1 className="font-display text-5xl mb-4">Equipment Not Found</h1>
          <p className="text-muted-foreground mb-8">The equipment you're looking for doesn't exist.</p>
          <Button asChild>
            <Link href="/equipment">Back to Equipment</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-24 relative">
        <div className="absolute inset-0 h-[50vh]">
          <img
            src={equipmentImages[equipment.id] || equipment.image}
            alt={equipment.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>

        <div className="container mx-auto px-4 relative z-10 pt-32 pb-16">
          <Link
            href="/equipment"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Equipment
          </Link>

          <div className="flex flex-wrap gap-3 mb-4">
            <span className="px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-full">
              {equipment.category}
            </span>
            <span className="px-4 py-2 bg-secondary text-secondary-foreground text-sm font-bold rounded-full">
              {equipment.quantity} available
            </span>
          </div>

          <h1 className="font-display text-6xl md:text-8xl mb-4">{equipment.name}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            {equipment.shortDescription}
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-12">
              {/* Description */}
              <div>
                <h2 className="font-display text-3xl mb-4">ABOUT THIS EQUIPMENT</h2>
                <p className="text-muted-foreground leading-relaxed">{equipment.longDescription}</p>
              </div>

              {/* Muscle Groups */}
              <div>
                <h2 className="font-display text-3xl mb-4 flex items-center gap-2">
                  <Target className="w-8 h-8 text-primary" />
                  MUSCLES TARGETED
                </h2>
                <div className="flex flex-wrap gap-3">
                  {equipment.muscleGroups.map((muscle, index) => (
                    <span
                      key={index}
                      className="px-4 py-2 bg-primary/10 text-primary font-semibold rounded-full"
                    >
                      {muscle}
                    </span>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div>
                <h2 className="font-display text-3xl mb-4">FEATURES</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {equipment.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* How to Use */}
              <div>
                <h2 className="font-display text-3xl mb-4 flex items-center gap-2">
                  <AlertCircle className="w-8 h-8 text-primary" />
                  HOW TO USE
                </h2>
                <div className="glass-card rounded-xl p-6">
                  <ol className="space-y-4">
                    {equipment.howToUse.map((step, index) => (
                      <li key={index} className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 font-display text-primary-foreground">
                          {index + 1}
                        </div>
                        <span className="text-muted-foreground pt-1">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {/* Tips */}
              <div>
                <h2 className="font-display text-3xl mb-4 flex items-center gap-2">
                  <Lightbulb className="w-8 h-8 text-primary" />
                  PRO TIPS
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {equipment.tips.map((tip, index) => (
                    <div key={index} className="glass-card rounded-xl p-4 border-l-4 border-primary">
                      <p className="text-muted-foreground text-sm">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <aside className="lg:sticky lg:top-24 self-start h-fit space-y-6">
              {/* Quick Info Card */}
              <div className="glass-card rounded-xl p-6">
                <h3 className="font-display text-2xl mb-4">QUICK INFO</h3>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center py-3 border-b border-border">
                    <span className="text-muted-foreground">Category</span>
                    <span className="font-semibold">{equipment.category}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-border">
                    <span className="text-muted-foreground">Quantity</span>
                    <span className="font-semibold text-primary">{equipment.quantity} units</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-border">
                    <span className="text-muted-foreground">Muscle Groups</span>
                    <span className="font-semibold">{equipment.muscleGroups.length}</span>
                  </div>
                </div>

                <Button className="w-full" variant="hero" asChild>
                  <Link href="/contact">Need Help? Contact Us</Link>
                </Button>

                <p className="text-muted-foreground text-xs text-center mt-4">
                  Ask our trainers for a personalized equipment orientation
                </p>
              </div>

              {/* Related Equipment */}
              <div className="glass-card rounded-xl p-6">
                <h4 className="font-display text-xl mb-4">EXPLORE MORE</h4>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/equipment">View All Equipment</Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/classes">Browse Classes</Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href="/trainers">Meet Our Trainers</Link>
                  </Button>
                </div>
              </div>
            </aside>
          </div>

          {/* Related Equipment */}
          {(() => {
            const related = allEquipment.filter((e) => e.id !== equipment.id && e.category === equipment.category).slice(0, 3);
            if (!related.length) return null;
            return (
              <div className="mt-24">
                <h2 className="font-display text-4xl mb-8">
                  RELATED <span className="text-gradient">EQUIPMENT</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {related.map((re) => (
                    <div key={re.id} className="glass-card rounded-xl overflow-hidden hover-lift group flex flex-col">
                      <Link href={`/equipment/${re.id}`} className="block relative h-40 overflow-hidden">
                        <img src={equipmentImages[re.id] || re.image} alt={re.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        <span className="absolute top-3 left-3 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                          {re.category}
                        </span>
                      </Link>
                      <div className="p-5 flex flex-col flex-1">
                        <h3 className="font-display text-xl mb-1">{re.name}</h3>
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{re.shortDescription}</p>
                        <Button size="sm" className="w-full mt-auto" asChild>
                          <Link href={`/equipment/${re.id}`}>View Details</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      <Footer />
    </div>
  );
}