"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ScrollAnimate } from "@/hooks/useScrollAnimation";
import { Star, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReviewLoop, type ReviewItem } from "./ReviewLoop";
import { getReviews, reviewerRoleLabel, type Review } from "@/api/reviews";
import { useAuth } from "@/contexts/AuthContext";

function convertToReviewItem(review: Review): ReviewItem {
  const initials = review.reviewer_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return {
    name: review.reviewer_name,
    role: reviewerRoleLabel(review.reviewer_role),
    rating: review.rating,
    text: review.review_text,
    avatar: initials || "FG",
    gymName: review.gym_name || null,
    gymLogoUrl: review.gym_logo_url || null,
  };
}

export function ReviewSection() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [average, setAverage] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const data = await getReviews(50);
        const list = data.reviews || [];
        setReviews(list.map(convertToReviewItem));
        setAverage(typeof data.average === "number" ? data.average : null);
        setCount(data.count ?? list.length);
      } catch {
        setReviews([]);
        setAverage(null);
        setCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchReviews();
  }, []);

  const displayAverage = useMemo(() => {
    if (average != null) return average;
    if (reviews.length === 0) return null;
    return (
      Math.round(
        (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10,
      ) / 10
    );
  }, [average, reviews]);

  const displayCount = count || reviews.length;
  const filledStars = displayAverage != null ? Math.round(displayAverage) : 0;
  const hasReviews = reviews.length > 0;

  return (
    <section className="bg-gradient-to-b from-background to-card/50 py-24">
      <div className="container mx-auto px-4">
        <ScrollAnimate animation="fade-up" className="mb-16 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">
            Testimonials
          </p>
          <h2 className="mb-4 font-display text-5xl md:text-6xl">
            WHAT OUR MEMBERS SAY
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Real stories from real members who transformed their fitness journey
            with Forge.
          </p>
        </ScrollAnimate>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : hasReviews ? (
          <ReviewLoop
            reviews={reviews}
            speed={100}
            direction="left"
            cardWidth={400}
            gap={24}
            pauseOnHover
            hoverSpeed={0}
            scaleOnHover
            fadeOut
            fadeOutColor="transparent"
            ariaLabel="Customer reviews"
          />
        ) : (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 px-6 py-16 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground/50" />
            <p className="font-display text-2xl tracking-wide text-foreground">
              No reviews yet
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Be the first to share your experience on Forge.
            </p>
          </div>
        )}

        <ScrollAnimate
          animation="fade-up"
          delay={0.3}
          className="mt-12 text-center"
        >
          <div className="flex flex-col items-center gap-4">
            {hasReviews && (
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-6 py-3">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < filledStars
                          ? "fill-primary text-primary"
                          : "fill-none text-muted-foreground/45"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {displayAverage != null
                    ? `${displayAverage.toFixed(1)}/5 · ${displayCount} review${
                        displayCount === 1 ? "" : "s"
                      }`
                    : "Based on member reviews"}
                </span>
              </div>
            )}

            <Button asChild variant="outline" size="sm">
              <Link
                href={
                  user
                    ? "/dashboard/feedback"
                    : "/login?redirect=/dashboard/feedback"
                }
              >
                Open feedback page
              </Link>
            </Button>
          </div>
        </ScrollAnimate>
      </div>
    </section>
  );
}
