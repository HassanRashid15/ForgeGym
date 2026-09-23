import { apiRequest } from "@/api/client";

export type GymSummary = {
  ownerId: string;
  gymName: string;
  gymType?: string | null;
  gymCity?: string | null;
  monthlyFee?: string | number | null;
  trainerFee?: string | number | null;
  [key: string]: unknown;
};

export type GymTrainer = {
  userId: string;
  fullName: string | null;
  specialization: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  yearsExperience?: string | null;
  certifications?: string[] | null;
};

export async function listGyms() {
  return apiRequest<{ gyms: GymSummary[] }>("gyms", "list");
}

export async function getGym(ownerId: string) {
  return apiRequest<{ gym: GymSummary }>("gyms", "get", {
    pathParams: { ownerId },
  });
}

export async function getGymTrainers(ownerId: string) {
  return apiRequest<{ trainers: GymTrainer[] }>("gyms", "trainers", {
    pathParams: { ownerId },
  });
}

export async function getGymReviews(ownerId: string) {
  return apiRequest<{
    reviews: Array<{
      id: string;
      rating: number;
      body: string | null;
      authorName?: string;
      created_at: string;
    }>;
    average: number | null;
    count: number;
  }>("gyms", "reviews", {
    pathParams: { ownerId },
  });
}

export async function submitGymReview(
  ownerId: string,
  body: { rating: number; body?: string },
) {
  return apiRequest<{ success?: boolean; review?: Record<string, unknown> }>(
    "gyms",
    "submitReview",
    {
      pathParams: { ownerId },
      body,
    },
  );
}
