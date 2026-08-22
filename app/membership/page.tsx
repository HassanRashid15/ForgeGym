"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Check, X, Sparkles } from "lucide-react";
import BMICalculator from "@/components/fitness/BMICalculator";
import FitnessAssessment from "@/components/fitness/FitnessAssessment";
import { ScrollAnimate } from "@/hooks/useScrollAnimation";
import { usePageLoading } from "@/hooks/usePageLoading";
import PageSkeleton from "@/components/skeletons/PageSkeleton";
import InteractiveBackground from "@/components/InteractiveBackground";

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

const faqs = [
  {
    question: "Can I freeze my membership?",
    answer: "Yes, you can freeze your membership for up to 3 months per year. Contact our front desk to arrange this.",
  },
  {
    question: "Is there a joining fee?",
    answer: "We occasionally waive the joining fee during promotions. Currently, we're offering $0 enrollment for all new members.",
  },
  {
    question: "Can I upgrade or downgrade my plan?",
    answer: "Absolutely! You can change your plan at any time. Changes take effect at the start of your next billing cycle.",
  },
  {
    question: "Do you offer corporate rates?",
    answer: "Yes, we offer special rates for companies with 10+ employees. Contact us for a custom quote.",
  },
  {
    question: "What's your cancellation policy?",
    answer: "You can cancel anytime with 30 days notice. No hidden fees or penalties.",
  },
];

export default function MembershipPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const isLoading = usePageLoading(500);

  if (isLoading) {
    return <PageSkeleton variant="membership" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16 bg-card relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary rounded-full blur-3xl" />
        </div>
        <InteractiveBackground variant="gradient" />

        <div className="container mx-auto px-4 relative z-10">
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
        <div className="container mx-auto px-4">
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
        <div className="container mx-auto px-4">
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
        <div className="container mx-auto px-4">
          <ScrollAnimate animation="fade-up" className="text-center mb-12">
            <h2 className="font-display text-5xl mb-4">
              ASSESS YOUR <span className="text-gradient">FITNESS</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
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
        <div className="container mx-auto px-4">
          <ScrollAnimate animation="fade-up" className="text-center mb-16">
            <h2 className="font-display text-5xl mb-4">ALL MEMBERS GET</h2>
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

      {/* FAQ */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <ScrollAnimate animation="fade-up">
              <h2 className="font-display text-5xl text-center mb-12">FAQ</h2>
            </ScrollAnimate>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <ScrollAnimate
                  key={index}
                  animation="fade-up"
                  delay={index * 0.1}
                >
                  <div className="glass-card rounded-xl overflow-hidden">
                    <button
                      className="w-full p-6 text-left flex items-center justify-between"
                      onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    >
                      <span className="font-semibold">{faq.question}</span>
                      <span className={`transition-transform duration-300 ${openFaq === index ? "rotate-45" : ""}`}>
                        +
                      </span>
                    </button>
                    {openFaq === index && (
                      <div className="px-6 pb-6 animate-fade-in">
                        <p className="text-muted-foreground">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                </ScrollAnimate>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-card">
        <div className="container mx-auto px-4 text-center">
          <ScrollAnimate animation="scale">
            <h2 className="font-display text-5xl md:text-6xl mb-6">
              STILL HAVE QUESTIONS?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              Our team is here to help you choose the right plan for your fitness goals.
            </p>
            <Button variant="hero" asChild>
              <Link href="/contact">Contact Us</Link>
            </Button>
          </ScrollAnimate>
        </div>
      </section>

      <Footer />
    </div>
  );
}