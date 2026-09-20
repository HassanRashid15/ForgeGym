import { apiRequest } from "@/api/client";
import type { PersonalRecord } from "@/lib/progress";
import type { ProgressDayView, ProgressStats } from "@/api/progress";

export type TrainerClient = {
  userId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  membershipStatus: string | null;
  membershipType: string | null;
  fitnessGoal: string | null;
  joinDate: string | null;
  gymMonthlyFee?: string | null;
  trainerFee?: string | null;
  feeConcession?: string | null;
  monthlyFee?: string | null;
  feeBreakdown?: string | null;
};

export type TrainerProfilePay = {
  salary: string | null;
  ptSessions: string | null;
  specialization: string | null;
  yearsExperience: string | null;
  maxClientCapacity: string | null;
  employmentType: string | null;
  workingDays: string | null;
  workingHours: string | null;
  availability: string | null;
};

export type TrainerClientsStats = {
  clientCount: number;
  gymMonthlyFee: string | null;
  trainerFee: string | null;
  projectedTrainerRevenue: string | null;
  projectedTrainerRevenueAmount: number;
  projectedMemberBilling: string | null;
  projectedMemberBillingAmount: number;
};

export type TrainerClientsResponse = {
  clients: TrainerClient[];
  gymName: string | null;
  gymMonthlyFee: string | null;
  trainerFee: string | null;
  stats: TrainerClientsStats;
  trainer: TrainerProfilePay;
};

export type TrainerClientProgress = {
  member: TrainerClient & {
    experienceLevel: string | null;
    weightKg: number | null;
    heightCm: number | null;
    bmi: number | null;
  };
  days: ProgressDayView[];
  personalRecords: PersonalRecord[];
  topExercises: { name: string; count: number }[];
  stats: ProgressStats;
};

/** trainer.clients → GET /api/trainer/clients */
export async function listTrainerClients() {
  return apiRequest<TrainerClientsResponse>("trainer", "clients");
}

/** trainer.clientProgress → GET /api/trainer/clients/:userId/progress */
export async function getTrainerClientProgress(
  userId: string,
  options?: { days?: number; from?: string; to?: string },
) {
  return apiRequest<TrainerClientProgress>("trainer", "clientProgress", {
    pathParams: { userId },
    query: {
      days: options?.days,
      from: options?.from,
      to: options?.to,
    },
  });
}
