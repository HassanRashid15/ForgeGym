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