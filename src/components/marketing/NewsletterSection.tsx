"use client";

import { useState, useEffect } from "react";
import { Mail, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollAnimate } from "@/hooks/useScrollAnimation";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/api/client";
import { checkNewsletter, subscribeNewsletter } from "@/api/newsletter";

export default function NewsletterSection() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      if (!user?.email) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await checkNewsletter(user.email);
        if (data.success && data.is_subscribed && data.is_active) {
          setIsSubscribed(true);
          setEmail(user.email);
        }
      } catch (error) {
        console.error("Error checking subscription status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void checkSubscriptionStatus();
  }, [user?.email]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const data = await subscribeNewsletter(email);

      if (data.success) {
        if (data.no_change) {
          setMessage({
            type: "success",
            text: "You're already subscribed to our newsletter!",
          });
          setEmail("");
          setIsSubscribed(true);
        } else if (data.already_subscribed) {
          setMessage({
            type: "success",
            text: "You're already subscribed!",
          });
          setEmail("");
          setIsSubscribed(true);
        } else if (data.reactivated) {
          setMessage({
            type: "success",
            text: "Welcome back! Your subscription has been reactivated.",
          });
          setEmail("");
          setIsSubscribed(true);
        } else {
          setMessage({
            type: "success",
            text: "Successfully subscribed!",
          });
          setEmail("");
          setIsSubscribed(true);
        }
      } else {
        setMessage({
          type: "error",
          text: data.error || "Failed to subscribe. Please try again.",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof ApiError
            ? error.message
            : "An error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="border-t border-border bg-background py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4">
        <ScrollAnimate animation="fade-up">
          <div className="rounded-2xl border border-border bg-card px-6 py-10 text-center sm:px-10 sm:py-12 md:px-14">
            <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
              <Mail className="h-5 w-5 text-primary" strokeWidth={1.75} />
            </div>

            <div className="mb-4 flex items-center justify-center gap-3">
              <span
                className="-mt-[7px] h-2 w-8 shrink-0 rounded-xs bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.85)]"
                aria-hidden
              />
              <h2 className="font-display text-2xl italic leading-normal tracking-wide text-foreground sm:text-3xl md:text-4xl">
                STAY <span className="text-primary">CONNECTED</span>
              </h2>
            </div>
            <p className="mx-auto mb-8 max-w-xl text-base text-muted-foreground sm:text-lg">
              Fitness tips, workout plans, and partner-gym updates — no spam.
            </p>

            {isLoading ? (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span>Checking subscription status...</span>
              </div>
            ) : !isSubscribed ? (
              <>
                <form
                  onSubmit={(e) => void handleSubmit(e)}
                  className="mx-auto flex w-full max-w-lg flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-3"
                >
                  <input
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    autoComplete="email"
                    inputMode="email"
                    enterKeyHint="send"
                    className="box-border min-h-12 w-full flex-1 appearance-none rounded-full border border-border bg-background px-5 py-3 text-base leading-normal text-foreground placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 [-webkit-appearance:none]"
                    required
                    disabled={isSubmitting}
                  />
                  <Button
                    type="submit"
                    className="box-border inline-flex h-auto min-h-12 w-full shrink-0 items-center justify-center rounded-full bg-primary px-8 py-3 text-base font-semibold text-white transition hover:bg-primary/90 sm:w-auto"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Subscribing..." : "Subscribe"}
                    {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                </form>

                {message && (
                  <div
                    className={`mt-4 flex items-center justify-center gap-2 text-sm ${
                      message.type === "success"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {message.type === "success" ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    {message.text}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="text-lg font-medium">
                  You&apos;re already subscribed to our newsletter!
                </span>
              </div>
            )}

            <p className="mt-4 text-xs text-muted-foreground">
              No spam, unsubscribe anytime. Read our Privacy Policy.
            </p>
          </div>
        </ScrollAnimate>
      </div>
    </section>
  );
}
