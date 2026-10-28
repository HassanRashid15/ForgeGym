"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  MapPin,
  Phone,
  Mail,
  Send,
  Loader2,
  CalendarDays,
  Dumbbell,
  UserRound,
  Users,
  ArrowRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollAnimate } from "@/hooks/useScrollAnimation";
import { PageSkeleton } from "@/components/loading/PageSkeleton";
import { getContactInfo, submitContactMessage, type ContactRecipientOption } from "@/api/contact";
import {
  getDefaultSiteContact,
  phoneHref,
  type SiteContactInfo,
} from "@/lib/site-contact";

const featureItems = [
  {
    icon: CalendarDays,
    title: "Book Classes",
    description: "Find and reserve your favorite classes in seconds.",
  },
  {
    icon: Dumbbell,
    title: "Track Workouts",
    description: "Log sets, reps, and progress with clear history.",
  },
  {
    icon: UserRound,
    title: "Trainers",
    description: "Connect with coaches who guide your goals.",
  },
  {
    icon: Users,
    title: "Community",
    description: "Train alongside members who keep you accountable.",
  },
];

export default function ContactPage() {
  const { toast } = useToast();
  const [contact, setContact] = useState<SiteContactInfo>(getDefaultSiteContact);
  const [recipients, setRecipients] = useState<ContactRecipientOption[]>([
    {
      id: "superadmin",
      type: "superadmin",
      label: "Forge Platform (Platform Owner)",
    },
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    recipientId: "superadmin",
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
        if (!cancelled && data?.recipients?.length) {
          setRecipients(data.recipients);
          setFormData((prev) => ({
            ...prev,
            recipientId: data.recipients![0]?.id || "superadmin",
          }));
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
        recipientId: formData.recipientId || "superadmin",
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
        recipientId: recipients[0]?.id || "superadmin",
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

  const addressLine = contact.addressLines.filter(Boolean).join(", ");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative isolate overflow-hidden bg-background">
        <div
          className="pointer-events-none absolute inset-0 forge-hero-media"
          aria-hidden
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/gym_contact.png"
            alt=""
            className="absolute inset-0 h-full w-full"
          />
            <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-black/55 to-transparent sm:from-black/92 sm:via-black/40 sm:to-transparent" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[78svh] max-w-7xl flex-col justify-center px-4 pb-14 pt-28 sm:min-h-[72svh] sm:px-6 sm:pb-16 sm:pt-32 lg:px-2">
          <ScrollAnimate animation="fade-up" className="max-w-xl md:max-w-2xl">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.28em] text-primary sm:text-xs">
              Train<span className="mx-2 text-primary/70">/</span>Track
              <span className="mx-2 text-primary/70">/</span>Achieve
            </p>
            <h1 className="font-display text-[clamp(2.75rem,9vw,5.5rem)] leading-[0.9] tracking-wide text-white">
              <span className="block">YOUR GYM,</span>
              <span className="relative mt-[-0.05em] inline-block pb-[0.35em] pr-[0.1em] text-primary">
                <span className="relative z-[1]">YOUR WAY</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/red_stroke.png"
                  alt=""
                  aria-hidden
                  className="pointer-events-none absolute left-[-4%] top-[70%] z-0 h-[0.36em] w-[112%] max-w-none select-none object-fill object-left sm:h-[0.32em]"
                />
              </span>
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/80 sm:mt-0 sm:text-base">
              Book classes, track workouts, connect with trainers — all in one
              powerful app.
            </p>
            <div className="mt-8 max-w-md sm:mt-4">
              <div className="mb-3 flex items-center" aria-hidden>
                <span className="h-[3px] w-16 shrink-0 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.8)] sm:w-20" />
                <span className="h-px flex-1 bg-white/25" />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/90 sm:text-[11px]">
                <span className="text-primary">Forge</span> your future with
                data driven fitness
              </p>
            </div>
          </ScrollAnimate>
        </div>
      </section>

      <section className="relative z-10 border-y border-border bg-card">
        <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x lg:divide-border">
          {featureItems.map((item, index) => (
            <ScrollAnimate
              key={item.title}
              animation="fade-up"
              delay={index * 0.08}
              className="flex gap-4 px-5 py-8 sm:px-6 sm:py-10 lg:px-7"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
                <item.icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-lg tracking-wide text-foreground sm:text-xl">
                  {item.title === "Book Classes" ? (
                    <>
                      BOOK <span className="text-primary">CLASSES</span>
                    </>
                  ) : item.title === "Track Workouts" ? (
                    <>
                      TRACK <span className="text-primary">WORKOUTS</span>
                    </>
                  ) : (
                    item.title.toUpperCase()
                  )}
                </h2>
                <p className="mt-1 text-sm leading-snug text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </ScrollAnimate>
          ))}
        </div>
      </section>

      {/* Form + Find us */}
      <section className="relative z-10 border-t border-border/60 bg-background py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-1 items-start gap-14 lg:grid-cols-2 lg:gap-16">
            <ScrollAnimate animation="fade-right" className="flex h-full flex-col">
              <div className="min-h-[7.5rem] sm:min-h-[8rem]">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-primary sm:text-xs">
                  Get In Touch
                </p>
                <div className="flex items-center gap-3">
                  <span
                    className="-mt-[7px] h-2 w-8 shrink-0 rounded-xs bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.85)]"
                    aria-hidden
                  />
                  <h2 className="font-display text-2xl italic leading-normal tracking-wide text-foreground sm:text-3xl md:text-4xl">
                    <span className="text-foreground">SEND US A </span>
                    <span className="text-primary">MESSAGE</span>
                  </h2>
                </div>
                <p className="mt-3 max-w-md text-sm text-muted-foreground sm:text-base">
                  Fill out the form below and we&apos;ll get back to you within 24
                  hours.
                </p>
              </div>

              <form
                onSubmit={(e) => void handleSubmit(e)}
                className="mt-8 space-y-5"
              >
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
                      className="h-11 border-border bg-secondary/80"
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
                      className="h-11 border-border bg-secondary/80"
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
                      className="h-11 border-border bg-secondary/80"
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
                      className="h-11 border-border bg-secondary/80"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="contact-recipient"
                    className="mb-2 block text-sm font-medium"
                  >
                    Message to
                  </label>
                  <select
                    id="contact-recipient"
                    value={formData.recipientId}
                    onChange={(e) =>
                      setFormData({ ...formData, recipientId: e.target.value })
                    }
                    required
                    className="flex h-11 w-full rounded-md border border-border bg-secondary/80 px-3 py-2 text-sm text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <optgroup label="Platform">
                      {recipients
                        .filter((r) => r.type === "superadmin")
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.label}
                          </option>
                        ))}
                    </optgroup>
                    {recipients.some((r) => r.type === "gym_admin") ? (
                      <optgroup label="Partner gyms">
                        {recipients
                          .filter((r) => r.type === "gym_admin")
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.label}
                            </option>
                          ))}
                      </optgroup>
                    ) : null}
                  </select>
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
                    className="border-border bg-secondary/80"
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

            <ScrollAnimate
              animation="fade-left"
              delay={0.15}
              className="flex h-full flex-col"
            >
              <div className="min-h-[7.5rem] sm:min-h-[8rem]">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-primary sm:text-xs">
                  Our Location
                </p>
                <div className="flex items-center gap-3">
                  <span
                    className="-mt-[7px] h-2 w-8 shrink-0 rounded-xs bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.85)]"
                    aria-hidden
                  />
                  <h2 className="font-display text-2xl italic leading-normal tracking-wide text-foreground sm:text-3xl md:text-4xl">
                    <span className="text-foreground">FIND </span>
                    <span className="text-primary">US</span>
                  </h2>
                </div>
                <p className="mt-3 max-w-md text-sm text-muted-foreground sm:text-base">
                  Visit a partner gym or reach Forge support — we&apos;re ready
                  when you are.
                </p>
              </div>

              <div className="relative mt-8 aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-secondary">
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

              <div className="mt-6 rounded-2xl border border-border bg-card/40 p-5 sm:p-6">
                <h3 className="mb-4 font-display text-xl tracking-wide">
                  <div className="flex items-center gap-3">
                    {/* <span
                      className="-mt-[7px] h-2 w-5 shrink-0 rounded-xs bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.85)]"
                      aria-hidden
                    /> */}
                    <h2 className="font-display text-2xl italic leading-normal tracking-wide text-foreground sm:text-3xl md:text-2xl">
                      <span className="text-foreground">REACH </span>
                      <span className="inline-block pr-[0.1em] text-primary">CONTACT</span>
                    </h2>
                  </div>
                </h3>
                <div className="space-y-3">
                  <a
                    href={phoneHref(contact.primaryPhone)}
                    className="flex items-start gap-3 text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    <Phone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span>{contact.primaryPhone}</span>
                  </a>
                  {addressLine ? (
                    <p className="flex items-start gap-3 text-sm text-muted-foreground">
                      <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <span>{addressLine}</span>
                    </p>
                  ) : null}
                  <a
                    href={`mailto:${contact.supportEmail}`}
                    className="flex items-start gap-3 text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span>{contact.supportEmail}</span>
                  </a>
                </div>
              </div>
            </ScrollAnimate>
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/contact_section.png"
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          {/* <div className="absolute inset-0 bg-black/75" /> */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-black/55 to-transparent sm:from-black/92 sm:via-black/40 sm:to-transparent" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[52svh] max-w-4xl flex-col items-center justify-center px-4 py-20 text-center sm:min-h-[48svh] sm:py-24">
          <ScrollAnimate animation="scale" className="w-full">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.28em] text-primary sm:text-xs">
              Ready To
            </p>
            <h2 className="font-display text-[clamp(3.25rem,12vw,6.5rem)] leading-[0.9] tracking-wide text-white">
              START?
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-white/80 sm:mt-6 sm:text-base">
              Join today and take the first step towards a stronger, healthier
              and better you.
            </p>
            <div className="mt-8 flex w-full flex-col items-stretch justify-center gap-3 sm:mt-10 sm:flex-row sm:items-center sm:gap-4">
              <Button
                asChild
                variant="hero"
                className="h-12 rounded-full px-7 text-sm font-semibold"
              >
                <Link href="/gyms">
                  Find a Partner Gym
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="heroOutline"
                className="h-12 rounded-full border-primary px-7 text-sm font-semibold text-primary hover:bg-primary/10 hover:text-primary"
              >
                <a href={phoneHref(contact.primaryPhone)}>
                  <Phone className="h-4 w-4" />
                  Call us now
                </a>
              </Button>
            </div>
          </ScrollAnimate>
        </div>
      </section>

      <Footer />
    </div>
  );
}
