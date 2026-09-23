import { apiRequest } from "@/api/client";

export type ReviewerRole = "customer" | "admin" | "trainer";

export type ReviewType =
  | "general"
  | "service"
  | "facilities"
  | "trainer"
  | "staff"
  | "platform";

export type Review = {
  id: string;
  user_id: string;
  gym_owner_id: string | null;
  reviewer_name: string;
  reviewer_role: ReviewerRole;
  rating: number;
  review_text: string;
  review_type: ReviewType;
  is_approved: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  /** Enriched on public GET */
  gym_name?: string | null;
  gym_logo_url?: string | null;
};

export type SubmitReviewPayload = {
  reviewerName: string;
  rating: number;
  reviewText: string;
  reviewType?: ReviewType;
  gymOwnerId?: string;
  /** Ignored server-side — role is resolved from user_roles */
  reviewerRole?: ReviewerRole;
};

export type SubmitReviewResponse = {
  success: boolean;
  review: Review;
  message: string;
};

export type GetReviewsResponse = {
  reviews: Review[];
  average?: number | null;
  count?: number;
};

/** Submit a review (auth required) */
export async function submitReview(payload: SubmitReviewPayload) {
  return apiRequest<SubmitReviewResponse>("reviews", "submit", {
    body: payload,
  });
}

/** Get approved reviews for homepage */
export async function getReviews(limit?: number, gymOwnerId?: string) {
  return apiRequest<GetReviewsResponse>("reviews", "get", {
    query: {
      limit: limit?.toString(),
      ...(gymOwnerId && { gymOwnerId }),
    },
  });
}

/** Current user's submissions */
export async function getMyReviews(limit = 20) {
  return apiRequest<GetReviewsResponse>("reviews", "getMine", {
    query: { scope: "mine", limit: String(limit) },
  });
}

/** Pending reviews for moderators */
export async function getPendingReviews(limit = 50) {
  return apiRequest<GetReviewsResponse>("reviews", "getPending", {
    query: { scope: "pending", limit: String(limit) },
  });
}

/** Approve / feature / reject */
export async function moderateReview(input: {
  id: string;
  isApproved?: boolean;
  isFeatured?: boolean;
  reject?: boolean;
}) {
  return apiRequest<{ success: boolean; review?: Review; deleted?: boolean }>(
    "reviews",
    "moderate",
    { body: input },
  );
}

/** Owner updates own review (re-queues for approval) */
export async function updateMyReview(input: {
  id: string;
  rating: number;
  reviewText: string;
  reviewType: ReviewType;
}) {
  return apiRequest<{ success: boolean; review: Review; message?: string }>(
    "reviews",
    "updateMine",
    { body: input },
  );
}

/** Owner (or moderator) deletes a review */
export async function deleteMyReview(id: string) {
  return apiRequest<{ success: boolean; deleted?: boolean }>("reviews", "deleteMine", {
    query: { id },
  });
}

export function mapAppRoleToReviewerRole(
  role?: string | null,
): ReviewerRole {
  if (role === "admin") return "admin";
  if (role === "trainer") return "trainer";
  return "customer";
}

export function reviewTypesForRole(role: ReviewerRole): ReviewType[] {
  if (role === "admin") {
    return ["general", "platform", "service", "facilities", "staff"];
  }
  if (role === "trainer") {
    return ["general", "facilities", "staff", "service"];
  }
  return ["general", "service", "facilities", "trainer", "staff"];
}

export function reviewTypeLabel(type: string) {
  const labels: Record<string, string> = {
    general: "General",
    service: "Service",
    facilities: "Facilities",
    trainer: "Trainer",
    staff: "Staff",
    platform: "Platform",
  };
  return labels[type] || type;
}

export function reviewerRoleLabel(role: ReviewerRole) {
  if (role === "admin") return "Gym owner";
  if (role === "trainer") return "Trainer";
  return "Member";
}
