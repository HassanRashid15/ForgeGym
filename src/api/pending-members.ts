import { apiRequest } from "@/api/client";

export type PendingMember = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string | null;
  account_status: string | null;
  membership_type: string | null;
  is_frozen: boolean;
  freeze_reason: string | null;
  frozen_until: string | null;
  trial_ends_at: string | null;
  membership_trial_ends_at: string | null;
};

export type PendingMembersResponse = {
  pendingMembers: PendingMember[];
  count: number;
  timestamp: string;
};

/** Get pending members for approval */
export async function getPendingMembers() {
  return apiRequest<PendingMembersResponse>("admin", "pendingMembers");
}

/** Approve a pending member */
export async function approvePendingMember(userId: string) {
  return apiRequest<{ success: boolean; message: string }>("admin", "pendingMembers", {
    body: { userId, action: "approve" },
  });
}

/** Reject a pending member */
export async function rejectPendingMember(userId: string) {
  return apiRequest<{ success: boolean; message: string }>("admin", "pendingMembers", {
    body: { userId, action: "reject" },
  });
}

/** Renew a frozen account (trial expiration) */
export async function renewFrozenAccount(userId: string, trialType?: "platform" | "membership") {
  return apiRequest<{ success: boolean; message: string; trialEndsAt: string }>("admin", "pendingMembers", {
    body: { userId, action: "renew", trialType },
  });
}