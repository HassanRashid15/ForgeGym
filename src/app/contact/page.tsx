"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Phone, Mail, Clock, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollAnimate } from "@/hooks/useScrollAnimation";
import { PageSkeleton } from "@/components/loading/PageSkeleton";
import InteractiveBackground from "@/components/marketing/InteractiveBackground";
import { getContactInfo, submitContactMessage } from "@/api/contact";
import {
  getDefaultSiteContact,
  phoneHref,
  type SiteContactInfo,
} from "@/lib/site-contact";

type InfoCard = {
  icon: typeof MapPin;
  title: string;
  details: string[];
  hrefs?: (string | null)[];
};

export default function ContactPage() {
  const { toast } = useToast();
  const [contact, setContact] = useState<SiteContactInfo>(getDefaultSiteContact);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getContactInfo();
        if (!cancelled && data?.contact) {
          setContact(data.contact);
        }
      } catch {
        // Keep defaults from env
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const contactInfo: InfoCard[] = useMemo(
    () => [
      {
        icon: MapPin,
        title: "Visit Us",
        details: contact.addressLines,
      },
      {
        icon: Phone,
        title: "Call Us",
        details: contact.phones,
        hrefs: contact.phones.map(phoneHref),
      },
      {
        icon: Mail,
        title: "Email Us",
        details: contact.emails,
        hrefs: contact.emails.map((e) => `mailto:${e}`),
      },
      {
        icon: Clock,
        title: "Hours",
        details: contact.hours,
      },
    ],
    [contact],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await submitContactMessage({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        subject: formData.subject.trim(),
        message: formData.message.trim(),
      });
      toast({
        title: "Message Sent!",
        description:
          res.message || "We'll get back to you within 24 hours.",
      });
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });
    } catch (err) {
      toast({
        title: "Could not send",
        description:
          err instanceof Error
            ? err.message
            : "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <PageSkeleton variant="contact" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative overflow-hidden bg-card pb-16 pt-32">
        <InteractiveBackground variant="gradient" />
        <div className="container relative z-10 mx-auto px-4">
          <ScrollAnimate animation="fade-up">
            <h1 className="mb-4 font-display text-6xl md:text-8xl">
              GET IN <span className="text-gradient">TOUCH</span>
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Questions about partner gyms, memberships, trainers, or the Forge
              platform? We&apos;re here to help.
            </p>
          </ScrollAnimate>
        </div>
      </section>

      <section className="border-b border-border bg-card py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {contactInfo.map((item, index) => (
              <ScrollAnimate
                key={item.title}
                animation="fade-up"
                delay={index * 0.1}
                className="text-center lg:text-left"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 lg:mx-0">
                  <item.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="mb-2 font-display text-xl">{item.title}</h3>
                {item.details.map((detail, i) => {
                  const href = item.hrefs?.[i];
                  if (href) {
                    return (
                      <a
                        key={`${detail}-${i}`}
                        href={href}
                        className="block text-sm text-muted-foreground transition-colors hover:text-primary"
                      >
                        {detail}
                      </a>
                    );
                  }
                  return (
                    <p
                      key={`${detail}-${i}`}
                      className="text-sm text-muted-foreground"
                    >
                      {detail}
                    </p>
                  );
                })}
              </ScrollAnimate>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-2">
            <ScrollAnimate animation="fade-right">
              <h2 className="mb-6 font-display text-4xl">SEND US A MESSAGE</h2>
              <p className="mb-8 text-muted-foreground">
                Fill out the form below and we&apos;ll get back to you within 24
                hours.
              </p>

              <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Name</label>
                    <Input
                      placeholder="Your name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                      className="border-border bg-secondary"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required
                      className="border-border bg-secondary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Phone</label>
                    <Input
                      placeholder={contact.primaryPhone}
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="border-border bg-secondary"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Subject
                    </label>
                    <Input
                      placeholder="How can we help?"
                      value={formData.subject}
                      onChange={(e) =>
                        setFormData({ ...formData, subject: e.target.value })
                      }
                      required
                      className="border-border bg-secondary"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Message
                  </label>
                  <Textarea
                    placeholder="Tell us more about your inquiry..."
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    required
                    rows={6}
                    maxLength={2000}
                    className="border-border bg-secondary"
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
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Message
                      <Send className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </ScrollAnimate>

            <ScrollAnimate animation="fade-left" delay={0.2}>
              <h2 className="mb-6 font-display text-4xl">FIND US</h2>
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-secondary lg:aspect-[4/3]">
                <iframe
                  src={contact.mapEmbedUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0, filter: "invert(90%) hue-rotate(180deg)" }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Forge Gym Location"
                />
              </div>

              <div className="glass-card mt-8 rounded-xl p-6">
                <h3 className="mb-4 font-display text-xl">QUICK CONTACT</h3>
                <div className="space-y-3">
                  <a
                    href={phoneHref(contact.primaryPhone)}
                    className="flex items-center gap-3 text-muted-foreground transition-colors hover:text-primary"
                  >
                    <Phone className="h-5 w-5 text-primary" />
                    {contact.primaryPhone}
                  </a>
                  <a
                    href={`mailto:${contact.supportEmail}`}
                    className="flex items-center gap-3 text-muted-foreground transition-colors hover:text-primary"
                  >
                    <Mail className="h-5 w-5 text-primary" />
                    {contact.supportEmail}
                  </a>
                </div>
              </div>
            </ScrollAnimate>
          </div>
        </div>
      </section>

      <section className="bg-card py-24">
        <div className="container mx-auto px-4 text-center">
          <ScrollAnimate animation="scale">
            <h2 className="mb-6 font-display text-5xl md:text-6xl">
              READY TO START?
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-lg text-muted-foreground">
              Browse partner gyms and create your Forge account — no commitment
              required.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Button asChild variant="hero">
                <Link href="/gyms">Find partner gyms</Link>
              </Button>
              <Button asChild variant="heroOutline">
                <a href={phoneHref(contact.primaryPhone)}>Call us now</a>
              </Button>
            </div>
          </ScrollAnimate>
        </div>
      </section>

      <Footer />
    </div>
  );
}
