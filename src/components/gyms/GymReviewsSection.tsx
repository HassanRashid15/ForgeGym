"use client";

import { useEffect, useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Review = {
  id: string;
  rating: number;
  body: string | null;
  authorName: string;
  created_at: string;
};

export function GymReviewsSection({ gymOwnerId }: { gymOwnerId: string }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [average, setAverage] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const canReview =
    user?.gymOwnerId === gymOwnerId && user?.role === "customer";

  async function load() {
    try {
      const res = await fetch(`/api/gyms/${gymOwnerId}/reviews`);
      const data = await res.json().catch(() => ({}));
      setReviews(data.reviews || []);
      setAverage(data.average ?? null);
      setCount(data.count || 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gymOwnerId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/gyms/${gymOwnerId}/reviews`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Could not save review");
        return;
      }
      toast.success("Review saved");
      setBody("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl tracking-normal">Reviews</h2>
          <p className="text-sm text-muted-foreground">
            {count > 0 && average != null
              ? `${average} / 5 · ${count} review${count === 1 ? "" : "s"}`
              : "Be the first to review this gym"}
          </p>
        </div>
        {average != null && (
          <div className="flex items-center gap-1 text-primary">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-5 w-5 ${i < Math.round(average) ? "fill-primary" : ""}`}
              />
            ))}
          </div>
        )}
      </div>

      {canReview && (
        <form
          onSubmit={(e) => void submit(e)}
          className="space-y-3 rounded-2xl border border-border bg-card p-4"
        >
          <p className="text-sm font-medium">Your rating</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className="p-1"
                aria-label={`${n} stars`}
              >
                <Star
                  className={`h-6 w-6 ${
                    n <= rating
                      ? "fill-primary text-primary"
                      : "text-muted-foreground/40"
                  }`}
                />
              </button>
            ))}
          </div>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share your experience (optional)"
            rows={3}
          />
          <Button type="submit" disabled={saving} size="sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit review"}
          </Button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading reviews…</p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="font-medium">{r.authorName}</p>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${
                        i < r.rating
                          ? "fill-primary text-primary"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
              </div>
              {r.body && <p className="text-sm text-muted-foreground">{r.body}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
