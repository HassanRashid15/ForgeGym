"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteMyReview,
  getMyReviews,
  getPendingReviews,
  mapAppRoleToReviewerRole,
  moderateReview,
  reviewerRoleLabel,
  reviewTypeLabel,
  reviewTypesForRole,
  submitReview,
  updateMyReview,
  type Review,
  type ReviewType,
} from "@/api/reviews";
import {
  Check,
  Eye,
  Loader2,
  Pencil,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

function roleCopy(role: ReturnType<typeof mapAppRoleToReviewerRole>) {
  if (role === "admin") {
    return {
      title: "Gym owner feedback",
      blurb:
        "Share how Forge works for your gym — members, billing, and day-to-day ops. Approved reviews appear on the homepage under What Our Members Say.",
    };
  }
  if (role === "trainer") {
    return {
      title: "Trainer feedback",
      blurb:
        "Tell us about coaching on Forge — facilities, tools, and support. Approved reviews show on the public homepage.",
    };
  }
  return {
    title: "Member feedback",
    blurb:
      "Rate your gym experience. After approval, your review can appear on What Our Members Say.",
  };
}

type ModalMode = "view" | "edit" | null;

export default function FeedbackPage() {
  const { user } = useAuth();
  const reviewerRole = mapAppRoleToReviewerRole(user?.role);
  const canModerate = user?.role === "admin" || user?.isSuperAdmin === true;
  const copy = roleCopy(reviewerRole);
  const types = useMemo(() => reviewTypesForRole(reviewerRole), [reviewerRole]);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewType, setReviewType] = useState<ReviewType>("general");
  const [submitting, setSubmitting] = useState(false);

  const [mine, setMine] = useState<Review[]>([]);
  const [pending, setPending] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [moderatingId, setModeratingId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [active, setActive] = useState<Review | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editHover, setEditHover] = useState(0);
  const [editText, setEditText] = useState("");
  const [editType, setEditType] = useState<ReviewType>("general");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const mineRes = await getMyReviews(30);
      setMine(mineRes.reviews || []);
      if (canModerate) {
        const pendingRes = await getPendingReviews(50);
        setPending(pendingRes.reviews || []);
      } else {
        setPending([]);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load feedback");
    } finally {
      setLoading(false);
    }
  }, [canModerate]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!types.includes(reviewType)) {
      setReviewType(types[0] || "general");
    }
  }, [types, reviewType]);

  function openView(r: Review) {
    setActive(r);
    setModalMode("view");
  }

  function openEdit(r: Review) {
    setActive(r);
    setEditRating(r.rating);
    setEditText(r.review_text);
    setEditType(r.review_type);
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setActive(null);
  }

  async function handleSubmit() {
    if (!user) {
      toast.error("Please sign in to submit feedback");
      return;
    }
    if (rating < 1) {
      toast.error("Please select a rating");
      return;
    }
    if (!reviewText.trim()) {
      toast.error("Please write your feedback");
      return;
    }

    setSubmitting(true);
    try {
      await submitReview({
        reviewerName: user.name || "Member",
        rating,
        reviewText: reviewText.trim(),
        reviewType,
        gymOwnerId: user.gymOwnerId || undefined,
      });
      toast.success("Submitted — it will show on the homepage after approval.");
      setRating(0);
      setReviewText("");
      setReviewType("general");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveEdit() {
    if (!active) return;
    if (editRating < 1) {
      toast.error("Please select a rating");
      return;
    }
    if (!editText.trim()) {
      toast.error("Please write your feedback");
      return;
    }

    setSavingEdit(true);
    try {
      await updateMyReview({
        id: active.id,
        rating: editRating,
        reviewText: editText.trim(),
        reviewType: editType,
      });
      toast.success("Updated — pending approval again before it goes live.");
      closeModal();
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(r: Review) {
    setDeleteTarget(r);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const r = deleteTarget;
    setActionId(r.id);
    try {
      await deleteMyReview(r.id);
      toast.success("Review deleted");
      setDeleteTarget(null);
      if (active?.id === r.id) closeModal();
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setActionId(null);
    }
  }

  async function handleModerate(
    id: string,
    action: "approve" | "feature" | "reject",
  ) {
    setModeratingId(id);
    try {
      if (action === "reject") {
        await moderateReview({ id, reject: true });
        toast.success("Review removed");
      } else if (action === "approve") {
        await moderateReview({ id, isApproved: true });
        toast.success("Approved — now live on What Our Members Say");
      } else {
        await moderateReview({ id, isApproved: true, isFeatured: true });
        toast.success("Approved & featured");
      }
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Moderation failed");
    } finally {
      setModeratingId(null);
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">{copy.title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{copy.blurb}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Submitting as{" "}
          <span className="font-medium text-foreground">{user?.name || "—"}</span>
          {" · "}
          {reviewerRoleLabel(reviewerRole)}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Write a review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110"
                  aria-label={`${star} stars`}
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
            <label className="mb-2 block text-sm font-medium">Topic</label>
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
            <label className="mb-2 block text-sm font-medium">Your feedback</label>
            <Textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder={
                reviewerRole === "admin"
                  ? "What should Forge improve for gym owners?"
                  : reviewerRole === "trainer"
                    ? "How is coaching and floor support on Forge?"
                    : "Share your gym experience…"
              }
              rows={4}
              maxLength={500}
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">
              {reviewText.length}/500
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => void handleSubmit()}
              disabled={submitting || rating === 0 || !reviewText.trim()}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit feedback"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {canModerate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              Pending approval
              {pending.length > 0 && (
                <Badge variant="secondary">{pending.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending reviews.</p>
            ) : (
              pending.map((r) => (
                <div
                  key={r.id}
                  className="space-y-2 rounded-lg border border-border/60 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.reviewer_name}</span>
                    <Badge variant="outline">
                      {reviewerRoleLabel(r.reviewer_role)}
                    </Badge>
                    <Badge variant="secondary">
                      {reviewTypeLabel(r.review_type)}
                    </Badge>
                    <span className="flex items-center gap-0.5 text-sm text-primary">
                      {Array.from({ length: r.rating }).map((_, i) => (
                        <Star
                          key={i}
                          className="h-3.5 w-3.5 fill-primary text-primary"
                        />
                      ))}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {r.review_text}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      size="sm"
                      disabled={moderatingId === r.id}
                      onClick={() => void handleModerate(r.id, "approve")}
                    >
                      <Check className="mr-1 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={moderatingId === r.id}
                      onClick={() => void handleModerate(r.id, "feature")}
                    >
                      <Star className="mr-1 h-4 w-4" />
                      Feature
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={moderatingId === r.id}
                      onClick={() => void handleModerate(r.id, "reject")}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your submissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : mine.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You haven&apos;t submitted feedback yet.
            </p>
          ) : (
            mine.map((r) => (
              <div
                key={r.id}
                className="flex flex-col gap-3 rounded-lg border border-border/60 p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-0.5 text-sm text-primary">
                      {Array.from({ length: r.rating }).map((_, i) => (
                        <Star
                          key={i}
                          className="h-3.5 w-3.5 fill-primary text-primary"
                        />
                      ))}
                    </span>
                    <Badge variant="secondary">
                      {reviewTypeLabel(r.review_type)}
                    </Badge>
                    {r.is_approved ? (
                      <Badge className="bg-emerald-600/15 text-emerald-600 hover:bg-emerald-600/15">
                        Live on homepage
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <X className="h-3 w-3" />
                        Pending approval
                      </Badge>
                    )}
                    {r.is_featured && <Badge>Featured</Badge>}
                  </div>
                  <p className="line-clamp-2 whitespace-pre-wrap text-sm">
                    {r.review_text}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(r.created_at), "MMM d, yyyy · h:mm a")}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openView(r)}
                  >
                    <Eye className="mr-1 h-4 w-4" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openEdit(r)}
                  >
                    <Pencil className="mr-1 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    disabled={actionId === r.id}
                    onClick={() => void handleDelete(r)}
                  >
                    {actionId === r.id ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-1 h-4 w-4" />
                    )}
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {modalMode && active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-xl">
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            {modalMode === "view" ? (
              <div className="space-y-4 pr-6">
                <h3 className="text-lg font-semibold">Review details</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-0.5 text-primary">
                    {Array.from({ length: active.rating }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 fill-primary text-primary"
                      />
                    ))}
                  </span>
                  <Badge variant="secondary">
                    {reviewTypeLabel(active.review_type)}
                  </Badge>
                  {active.is_approved ? (
                    <Badge className="bg-emerald-600/15 text-emerald-600 hover:bg-emerald-600/15">
                      Live on homepage
                    </Badge>
                  ) : (
                    <Badge variant="outline">Pending approval</Badge>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {active.review_text}
                </p>
                <p className="text-xs text-muted-foreground">
                  Submitted{" "}
                  {format(new Date(active.created_at), "MMM d, yyyy · h:mm a")}
                  {active.updated_at &&
                    active.updated_at !== active.created_at && (
                      <>
                        {" · "}Updated{" "}
                        {format(
                          new Date(active.updated_at),
                          "MMM d, yyyy · h:mm a",
                        )}
                      </>
                    )}
                </p>
                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={closeModal}>
                    Close
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => openEdit(active)}
                  >
                    <Pencil className="mr-1 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    disabled={actionId === active.id}
                    onClick={() => void handleDelete(active)}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-5 pr-6">
                <div>
                  <h3 className="text-lg font-semibold">Edit review</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Saving sends it back for approval before it shows on the
                    homepage again.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Rating</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setEditRating(star)}
                        onMouseEnter={() => setEditHover(star)}
                        onMouseLeave={() => setEditHover(0)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={`h-7 w-7 ${
                            star <= (editHover || editRating)
                              ? "fill-primary text-primary"
                              : "text-muted-foreground"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Topic</label>
                  <div className="flex flex-wrap gap-2">
                    {types.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setEditType(type)}
                        className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                          editType === type
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
                  <label className="mb-2 block text-sm font-medium">
                    Your feedback
                  </label>
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={4}
                    maxLength={500}
                  />
                  <p className="mt-1 text-right text-xs text-muted-foreground">
                    {editText.length}/500
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={closeModal}
                    disabled={savingEdit}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => void handleSaveEdit()}
                    disabled={
                      savingEdit || editRating === 0 || !editText.trim()
                    }
                  >
                    {savingEdit ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Save changes"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-review-title"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 className="h-6 w-6 text-destructive" />
            </div>
            <h3
              id="delete-review-title"
              className="text-lg font-semibold text-foreground"
            >
              Delete this review?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {deleteTarget.is_approved
                ? "It will also disappear from the homepage. This cannot be undone."
                : "This pending review will be removed permanently."}
            </p>
            <p className="mt-3 line-clamp-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              “{deleteTarget.review_text}”
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                disabled={actionId === deleteTarget.id}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => void confirmDelete()}
                disabled={actionId === deleteTarget.id}
              >
                {actionId === deleteTarget.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
