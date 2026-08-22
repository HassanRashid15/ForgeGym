"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Phone, Mail, Clock, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollAnimate } from "@/hooks/useScrollAnimation";
import { usePageLoading } from "@/hooks/usePageLoading";
import PageSkeleton from "@/components/skeletons/PageSkeleton";
import InteractiveBackground from "@/components/InteractiveBackground";

const contactInfo = [
  {
    icon: MapPin,
    title: "Visit Us",
    details: ["123 Fitness Street", "Downtown, CA 90210"],
  },
  {
    icon: Phone,
    title: "Call Us",
    details: ["(555) 123-4567", "(555) 987-6543"],
  },
  {
    icon: Mail,
    title: "Email Us",
    details: ["info@forgegym.com", "support@forgegym.com"],
  },
  {
    icon: Clock,
    title: "Hours",
    details: ["Mon-Fri: 5am - 11pm", "Sat-Sun: 6am - 10pm"],
  },
];

export default function ContactPage() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isLoading = usePageLoading(500);

  if (isLoading) {
    return <PageSkeleton variant="contact" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1500));

    toast({
      title: "Message Sent!",
      description: "We'll get back to you within 24 hours.",
    });

    setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-16 bg-card">
        <InteractiveBackground variant="gradient" />
        <div className="container mx-auto px-4 relative z-10">

          <ScrollAnimate animation="fade-up">
            <h1 className="font-display text-6xl md:text-8xl mb-4">
              GET IN <span className="text-gradient">TOUCH</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Have questions about our memberships, classes, or facilities? We're here to help.
            </p>
          </ScrollAnimate>
        </div>
      </section>

      {/* Contact Info */}
      <section className="py-16 bg-card border-b border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {contactInfo.map((item, index) => (
              <ScrollAnimate
                key={item.title}
                animation="fade-up"
                delay={index * 0.1}
                className="text-center lg:text-left"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto lg:mx-0 mb-4">
                  <item.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-display text-xl mb-2">{item.title}</h3>
                {item.details.map((detail, i) => (
                  <p key={i} className="text-muted-foreground text-sm">{detail}</p>
                ))}
              </ScrollAnimate>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form & Map */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Form */}
            <ScrollAnimate animation="fade-right">
              <h2 className="font-display text-4xl mb-6">SEND US A MESSAGE</h2>
              <p className="text-muted-foreground mb-8">
                Fill out the form below and we'll get back to you within 24 hours.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Name</label>
                    <Input
                      placeholder="Your name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="bg-secondary border-border"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Email</label>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="bg-secondary border-border"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Phone</label>
                    <Input
                      placeholder="(555) 123-4567"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="bg-secondary border-border"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Subject</label>
                    <Input
                      placeholder="How can we help?"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      required
                      className="bg-secondary border-border"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Message</label>
                  <Textarea
                    placeholder="Tell us more about your inquiry..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    rows={6}
                    className="bg-secondary border-border"
                  />
                </div>

                <Button
                  type="submit"
                  variant="hero"
                  className="w-full sm:w-auto"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Message
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>
            </ScrollAnimate>

            {/* Map Placeholder */}
            <ScrollAnimate animation="fade-left" delay={0.2}>
              <h2 className="font-display text-4xl mb-6">FIND US</h2>
              <div className="aspect-square lg:aspect-[4/3] rounded-2xl overflow-hidden bg-secondary relative">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3305.7152203584424!2d-118.25280548478977!3d34.04846798060689!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80c2c75ddc27da13%3A0xe22fdf6f254608f4!2sLos%20Angeles%2C%20CA!5e0!3m2!1sen!2sus!4v1635959573032!5m2!1sen!2sus"
                  width="100%"
                  height="100%"
                  style={{ border: 0, filter: "invert(90%) hue-rotate(180deg)" }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Forge Gym Location"
                />
              </div>
              
              <div className="mt-8 glass-card rounded-xl p-6">
                <h3 className="font-display text-xl mb-4">QUICK CONTACT</h3>
                <div className="space-y-3">
                  <a href="tel:5551234567" className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors">
                    <Phone className="w-5 h-5 text-primary" />
                    (555) 123-4567
                  </a>
                  <a href="mailto:info@forgegym.com" className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors">
                    <Mail className="w-5 h-5 text-primary" />
                    info@forgegym.com
                  </a>
                </div>
              </div>
            </ScrollAnimate>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-card">
        <div className="container mx-auto px-4 text-center">
          <ScrollAnimate animation="scale">
            <h2 className="font-display text-5xl md:text-6xl mb-6">
              READY TO START?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              Visit us today for a free tour and trial workout. No commitment required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero">Schedule a Tour</Button>
              <Button variant="heroOutline">Call Us Now</Button>
            </div>
          </ScrollAnimate>
        </div>
      </section>

      <Footer />
    </div>
  );
}