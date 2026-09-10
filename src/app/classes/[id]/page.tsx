"use client";

import { use } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { getClassById, allClasses } from "@/data/classes";
import { Clock, Flame, Users, Calendar, ArrowLeft, Check, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ClassDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ClassDetailPage({ params }: ClassDetailPageProps) {
  const resolvedParams = use(params);
  const { toast } = useToast();
  const gymClass = getClassById(resolvedParams.id);
  const relatedClasses = gymClass
    ? allClasses.filter((c) => c.id !== gymClass.id && c.category === gymClass.category).slice(0, 3)
    : [];

  if (!gymClass) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 pb-16 container mx-auto px-4 text-center">
          <h1 className="font-display text-5xl mb-4">Class Not Found</h1>
          <p className="text-muted-foreground mb-8">The class you're looking for doesn't exist.</p>
          <Button asChild>
            <Link href="/classes">Back to Classes</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const handleBookClass = () => {
    toast({
      title: "Class Booked!",
      description: `You've successfully booked ${gymClass.name}. Check your email for confirmation.`,
    });
  };

  const spotsPercentage = ((gymClass.maxSpots - gymClass.spots) / gymClass.maxSpots) * 100;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-24 relative">
        <div className="absolute inset-0 h-[50vh]">
          <img
            src={gymClass.image}
            alt={gymClass.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>

        <div className="container mx-auto px-4 relative z-10 pt-32 pb-16">
          <Link
            href="/classes"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Classes
          </Link>

          <div className="flex flex-wrap gap-3 mb-4">
            <span className="px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-full">
              {gymClass.category}
            </span>
            <span className="px-4 py-2 bg-secondary text-secondary-foreground text-sm font-bold rounded-full flex items-center gap-2">
              <Flame className="w-4 h-4" />
              {gymClass.intensity} Intensity
            </span>
          </div>

          <h1 className="font-display text-6xl md:text-8xl mb-4">{gymClass.name}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            with <span className="text-foreground font-semibold">{gymClass.trainer}</span>
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-12">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-card rounded-xl p-6 text-center">
                  <Clock className="w-8 h-8 text-primary mx-auto mb-2" />
                  <div className="font-display text-2xl">{gymClass.duration}</div>
                  <div className="text-muted-foreground text-sm">Duration</div>
                </div>
                <div className="glass-card rounded-xl p-6 text-center">
                  <Flame className="w-8 h-8 text-primary mx-auto mb-2" />
                  <div className="font-display text-2xl">{gymClass.calories}</div>
                  <div className="text-muted-foreground text-sm">Calories</div>
                </div>
                <div className="glass-card rounded-xl p-6 text-center">
                  <Users className="w-8 h-8 text-primary mx-auto mb-2" />
                  <div className="font-display text-2xl">{gymClass.maxSpots}</div>
                  <div className="text-muted-foreground text-sm">Max Size</div>
                </div>
                <div className="glass-card rounded-xl p-6 text-center">
                  <Zap className="w-8 h-8 text-primary mx-auto mb-2" />
                  <div className="font-display text-2xl">{gymClass.intensity}</div>
                  <div className="text-muted-foreground text-sm">Intensity</div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h2 className="font-display text-3xl mb-4">ABOUT THIS CLASS</h2>
                <p className="text-muted-foreground leading-relaxed">{gymClass.longDescription}</p>
              </div>

              {/* Benefits */}
              <div>
                <h2 className="font-display text-3xl mb-4">BENEFITS</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {gymClass.benefits.map((benefit, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-muted-foreground">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Requirements */}
              <div>
                <h2 className="font-display text-3xl mb-4">WHAT TO BRING</h2>
                <div className="glass-card rounded-xl p-6">
                  <ul className="space-y-3">
                    {gymClass.requirements.map((req, index) => (
                      <li key={index} className="flex items-center gap-3 text-muted-foreground">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <aside className="lg:sticky lg:top-24 self-start h-fit space-y-6">
              {/* Booking Card */}
              <div className="glass-card rounded-xl p-6">
                <h3 className="font-display text-2xl mb-4">BOOK THIS CLASS</h3>

                {/* Availability */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Availability</span>
                    <span className="text-primary font-semibold">{gymClass.spots} spots left</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${spotsPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Schedule */}
                <div className="mb-6">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    Available Times
                  </h4>
                  <div className="space-y-2">
                    {gymClass.schedule.map((time, index) => (
                      <div
                        key={index}
                        className="px-4 py-3 bg-secondary rounded-lg text-sm flex justify-between items-center"
                      >
                        <span>{time}</span>
                        <button className="text-primary hover:underline text-xs font-semibold">
                          Select
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <Button className="w-full" variant="hero" onClick={handleBookClass}>
                  Book Now
                </Button>

                <p className="text-muted-foreground text-xs text-center mt-4">
                  Free cancellation up to 2 hours before class
                </p>
              </div>

              {/* Trainer */}
              <div className="glass-card rounded-xl p-6">
                <h4 className="font-display text-xl mb-4">YOUR INSTRUCTOR</h4>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                    <span className="font-display text-2xl text-primary">
                      {gymClass.trainer.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold">{gymClass.trainer}</p>
                    <p className="text-muted-foreground text-sm">Certified Instructor</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-4" asChild>
                  <Link href="/trainers">View Profile</Link>
                </Button>
              </div>
            </aside>
          </div>

          {/* Related Classes */}
          {relatedClasses.length > 0 && (
            <div className="mt-24">
              <h2 className="font-display text-4xl mb-8">
                YOU MAY ALSO <span className="text-gradient">LIKE</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedClasses.map((rc) => (
                  <div key={rc.id} className="glass-card rounded-xl overflow-hidden hover-lift group flex flex-col">
                    <Link href={`/classes/${rc.id}`} className="block relative h-40 overflow-hidden">
                      <img src={rc.image} alt={rc.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      <span className="absolute top-3 left-3 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                        {rc.category}
                      </span>
                    </Link>
                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="font-display text-xl mb-1">{rc.name}</h3>
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{rc.description}</p>
                      <Button size="sm" className="w-full mt-auto" asChild>
                        <Link href={`/classes/${rc.id}`}>View Class</Link>
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