import { apiRequest } from "@/api/client";

export type MembershipMe = {
  hasGym: boolean;
  daysLeft: number | null;
  periodEnd: string | null;
  periodStart?: string | null;
  joinedAt?: string | null;
  feeLabel: string | null;
  dueSoon: boolean;
  overdue: boolean;
  gymName?: string | null;
  trainerRequestPending?: boolean;
  feeConcession?: string | null;
  hasTrainer?: boolean;
  preferredTrainerId?: string | null;
  membershipStatus?: string | null;
  gymMonthlyFee?: string | number | null;
  [key: string]: unknown;
};

export async function getMyMembership() {
  return apiRequest<MembershipMe>("membership", "me");
}
