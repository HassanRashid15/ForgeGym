"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, MessageSquare, X } from "lucide-react";
import { toast } from "sonner";
import {
  mapAppRoleToReviewerRole,
  reviewTypeLabel,
  reviewTypesForRole,
  submitReview,
  type ReviewType,
} from "@/api/reviews";

export function FeedbackForm() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewType, setReviewType] = useState<ReviewType>("general");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reviewerRole = mapAppRoleToReviewerRole(user?.role);
  const types = useMemo(() => reviewTypesForRole(reviewerRole), [reviewerRole]);
  const userName = user?.name || "Anonymous";

  const handleOpen = () => {
    if (!user) {
      toast.error("Sign in to leave a review");
      return;
    }
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Sign in to leave a review");
      return;
    }
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    if (!reviewText.trim()) {
      toast.error("Please write your review");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitReview({
        reviewerName: userName,
        rating,
        reviewText: reviewText.trim(),
        reviewType,
        gymOwnerId: user.gymOwnerId || undefined,
      });
      toast.success("Submitted! It will appear after admin approval.");
      setOpen(false);
      setRating(0);
      setReviewText("");
      setReviewType("general");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={handleOpen} variant="outline" size="sm" className="gap-2">
          <MessageSquare className="h-4 w-4" />
          Leave a Review
        </Button>
        {user && (
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/feedback">Open feedback page</Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-lg bg-card p-6 shadow-lg">
        <button
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="space-y-6">
          <div>
            <h3 className="flex items-center gap-2 text-xl font-semibold">
              <MessageSquare className="h-5 w-5" />
              Share Your Experience
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              As a {reviewerRole === "admin" ? "gym owner" : reviewerRole}, your
              review shows on What Our Members Say after approval.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoverRating || rating)
                        ? "fill-primary text-primary"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Review Type</label>
            <div className="flex flex-wrap gap-2">
              {types.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setReviewType(type)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    reviewType === type
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {reviewTypeLabel(type)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Your Review</label>
            <Textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your experience with us..."
              rows={4}
              maxLength={500}
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">
              {reviewText.length}/500
            </p>
          </div>

          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm">
              <span className="font-medium">Submitting as:</span> {userName} (
              {reviewerRole === "admin" ? "gym owner" : reviewerRole})
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSubmit()}
              disabled={isSubmitting || rating === 0 || !reviewText.trim()}
            >
              {isSubmitting ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
