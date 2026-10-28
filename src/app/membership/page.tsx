"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Check, X, Sparkles, CreditCard } from "lucide-react";
import BMICalculator from "@/components/fitness/BMICalculator";
import FitnessAssessment from "@/components/fitness/FitnessAssessment";
import { ScrollAnimate } from "@/hooks/useScrollAnimation";
import InteractiveBackground from "@/components/marketing/InteractiveBackground";
import { ComingSoonOverlay } from "@/components/ComingSoonOverlay";
import { MembershipPageFaq } from "@/components/marketing/FaqAccordion";

const plans = [
  {
    name: "Basic",
    price: 29,
    period: "month",
    description: "Perfect for getting started with your fitness journey.",
    features: [
      { name: "Access to gym floor", included: true },
      { name: "Locker room access", included: true },
      { name: "Free parking", included: true },
      { name: "Group classes", included: false },
      { name: "Personal training sessions", included: false },
      { name: "Sauna & spa access", included: false },
      { name: "Nutrition coaching", included: false },
      { name: "24/7 gym access", included: false },
    ],
    popular: false,
  },
  {
    name: "Pro",
    price: 59,
    period: "month",
    description: "Our most popular plan for serious fitness enthusiasts.",
    features: [
      { name: "Access to gym floor", included: true },
      { name: "Locker room access", included: true },
      { name: "Free parking", included: true },
      { name: "Group classes", included: true },
      { name: "Personal training sessions (2/month)", included: true },
      { name: "Sauna & spa access", included: true },
      { name: "Nutrition coaching", included: false },
      { name: "24/7 gym access", included: false },
    ],
    popular: true,
  },
  {
    name: "Elite",
    price: 99,
    period: "month",
    description: "The ultimate fitness experience with unlimited access.",
    features: [
      { name: "Access to gym floor", included: true },
      { name: "Locker room access", included: true },
      { name: "Free parking", included: true },
      { name: "Unlimited group classes", included: true },
      { name: "Personal training sessions (4/month)", included: true },
      { name: "Sauna & spa access", included: true },
      { name: "Nutrition coaching", included: true },
      { name: "24/7 gym access", included: true },
    ],
    popular: false,
  },
];

export default function MembershipPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  // const isLoading = usePageLoading(500);

  // Preloader commented out for now
  // if (isLoading) {
  //   return <PageSkeleton variant="membership" />;
  // }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <ComingSoonOverlay
        title="Online payments coming soon"
        description="Preview membership plans below. Checkout unlocks next — join a gym now and pay at the front desk for launch."
        icon={CreditCard}
      >
      {/* Hero */}
      <section className="pt-32 pb-16 bg-card relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary rounded-full blur-3xl" />
        </div>
        <InteractiveBackground variant="gradient" />

        <div className="mx-auto max-w-7xl px-4 relative z-10">
          <ScrollAnimate animation="fade-up">
            <h1 className="font-display text-6xl md:text-8xl mb-4">
              MEMBERSHIP <span className="text-gradient">PLANS</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Choose the plan that fits your lifestyle. All memberships include access to our premium facilities.
            </p>
          </ScrollAnimate>
        </div>
      </section>

      {/* Billing Toggle */}
      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4">
          <ScrollAnimate animation="fade-up">
            <div className="flex items-center justify-center gap-4">
              <span className={billingPeriod === "monthly" ? "text-foreground" : "text-muted-foreground"}>
                Monthly
              </span>
              <button
                className="relative w-14 h-7 bg-secondary rounded-full transition-colors"
                onClick={() => setBillingPeriod(billingPeriod === "monthly" ? "yearly" : "monthly")}
              >
                <div
                  className={`absolute top-1 w-5 h-5 bg-primary rounded-full transition-all ${
                    billingPeriod === "yearly" ? "left-8" : "left-1"
                  }`}
                />
              </button>
              <span className={billingPeriod === "yearly" ? "text-foreground" : "text-muted-foreground"}>
                Yearly <span className="text-primary text-sm">(Save 20%)</span>
              </span>
            </div>
          </ScrollAnimate>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <ScrollAnimate
                key={plan.name}
                animation="fade-up"
                delay={index * 0.15}
              >
                <div
                  className={`glass-card rounded-2xl p-8 relative hover-lift h-full flex flex-col ${
                    plan.popular ? "border-2 border-primary ring-4 ring-primary/10" : ""
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        MOST POPULAR
                      </span>
                    </div>
                  )}

                  <h3 className="font-display text-3xl mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground text-sm mb-6">{plan.description}</p>

                  <div className="mb-6">
                    <span className="font-display text-5xl">
                      ${billingPeriod === "yearly" ? Math.round(plan.price * 0.8) : plan.price}
                    </span>
                    <span className="text-muted-foreground">/{plan.period}</span>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-3">
                        {feature.included ? (
                          <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        ) : (
                          <X className="w-5 h-5 text-muted-foreground/50 shrink-0 mt-0.5" />
                        )}
                        <span className={feature.included ? "" : "text-muted-foreground/50"}>
                          {feature.name}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full mt-auto"
                    variant={plan.popular ? "default" : "outline"}
                    disabled
                  >
                    Get Started
                  </Button>
                </div>
              </ScrollAnimate>
            ))}
          </div>
        </div>
      </section>

      {/* Fitness Tools */}
      <section className="py-24 bg-card">
        <div className="mx-auto max-w-7xl px-4">
          <ScrollAnimate animation="fade-up" className="mb-12 text-left">
            <div className="mb-4 flex items-center gap-3">
              <span
                className="-mt-[7px] h-2 w-8 shrink-0 rounded-xs bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.85)]"
                aria-hidden
              />
              <h2 className="font-display text-2xl italic leading-normal tracking-wide text-foreground sm:text-3xl md:text-4xl">
                ASSESS YOUR <span className="text-primary">FITNESS</span>
              </h2>
            </div>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Use our free tools to understand your current fitness level and find the perfect membership plan.
            </p>
          </ScrollAnimate>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <ScrollAnimate animation="fade-right">
              <BMICalculator />
            </ScrollAnimate>
            <ScrollAnimate animation="fade-left" delay={0.2}>
              <FitnessAssessment />
            </ScrollAnimate>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4">
          <ScrollAnimate animation="fade-up" className="mb-16 text-left">
            <div className="mb-4 flex items-center gap-3">
              <span
                className="-mt-[7px] h-2 w-8 shrink-0 rounded-xs bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.85)]"
                aria-hidden
              />
              <h2 className="font-display text-2xl italic leading-normal tracking-wide text-foreground sm:text-3xl md:text-4xl">
                ALL MEMBERS GET
              </h2>
            </div>
          </ScrollAnimate>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {["Free Towel Service", "Water Stations", "WiFi Access", "Mobile App"].map((item, index) => (
              <ScrollAnimate
                key={item}
                animation="scale"
                delay={index * 0.1}
                className="text-center"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-primary" />
                </div>
                <p className="font-medium">{item}</p>
              </ScrollAnimate>
            ))}
          </div>
        </div>
      </section>

      <MembershipPageFaq />

      {/* CTA */}
      <section className="py-24 bg-card">
        <div className="mx-auto max-w-7xl px-4">
          <ScrollAnimate animation="scale" className="text-left">
            <div className="mb-6 flex items-center gap-3">
              <span
                className="-mt-[7px] h-2 w-8 shrink-0 rounded-xs bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.85)]"
                aria-hidden
              />
              <h2 className="font-display text-2xl italic leading-normal tracking-wide text-foreground sm:text-3xl md:text-4xl">
                STILL HAVE QUESTIONS?
              </h2>
            </div>
            <p className="mb-8 max-w-xl text-lg text-muted-foreground">
              Our team is here to help you choose the right plan for your fitness goals.
            </p>
            <Button variant="hero" asChild>
              <Link href="/contact">Contact Us</Link>
            </Button>
          </ScrollAnimate>
        </div>
      </section>
      </ComingSoonOverlay>

      <Footer />
    </div>
  );
}