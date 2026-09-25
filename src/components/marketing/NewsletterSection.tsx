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
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if authenticated user is already subscribed
  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      if (!user?.email) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await checkNewsletter(user.email);

        // If user is already subscribed, set the state
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

    checkSubscriptionStatus();
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
    <section className="py-24 bg-gradient-to-b from-card to-background">
      <div className="container mx-auto px-4">
        <ScrollAnimate animation="fade-up" className="max-w-4xl mx-auto">
          <div className="glass-card relative overflow-hidden rounded-2xl p-6 text-center sm:p-8 md:p-12">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              
              <h2 className="font-display text-4xl md:text-5xl mb-4">
                STAY <span className="text-primary">CONNECTED</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
                Get exclusive fitness tips, workout plans, nutrition advice, and special offers delivered straight to your inbox.
              </p>
              
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span>Checking subscription status...</span>
                </div>
              ) : !isSubscribed ? (
                <>
                  <form
                    onSubmit={handleSubmit}
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
                    <div className={`mt-4 flex items-center justify-center gap-2 text-sm ${
                      message.type === "success" ? "text-green-600" : "text-red-600"
                    }`}>
                      {message.type === "success" ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                      {message.text}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-lg font-medium">You're already subscribed to our newsletter!</span>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground mt-4">
                No spam, unsubscribe anytime. Read our Privacy Policy.
              </p>
            </div>
          </div>
        </ScrollAnimate>
      </div>
    </section>
  );
}