import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  getGymTrainers,
  listApprovedGyms,
  listAllPublicTrainers,
  type GymListItem,
} from "@/lib/gyms";

export type PlatformPublicStats = {
  memberCount: number;
  trainerCount: number;
  classCount: number;
  gymCount: number;
  maxYearsOperating: number;
  memberCountsByOwner: Record<string, number>;
};

export type GymLiveStats = {
  memberCount: number;
  trainerCount: number;
  classCount: number;
};

function isActiveProfile(accountStatus?: string | null, membershipStatus?: string | null) {
  const status = String(accountStatus || membershipStatus || "active").toLowerCase();
  return status !== "inactive" && status !== "rejected";
}

function parseYears(value: string | null | undefined): number {
  if (!value) return 0;
  const match = String(value).match(/(\d+(\.\d+)?)/);
  if (!match) return 0;
  return Math.max(0, Math.floor(Number(match[1])));
}

/** Member counts keyed by gym owner id across published gyms. */
export async function getMemberCountsByOwnerIds(
  ownerIds: string[],
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const id of ownerIds) counts[id] = 0;

  const service = createSupabaseServiceClient();
  if (!service || ownerIds.length === 0) return counts;

  const { data: profiles, error } = await service
    .from("profiles")
    .select("user_id, gym_owner_id, account_status, membership_status, admin_approved")
    .in("gym_owner_id", ownerIds);

  if (error || !profiles?.length) return counts;

  const userIds = profiles.map((p) => p.user_id).filter(Boolean);
  const { data: roleRows } = await service
    .from("user_roles")
    .select("user_id, role")
    .eq("role", "user")
    .in("user_id", userIds);

  const memberIds = new Set((roleRows || []).map((r) => r.user_id));

  for (const p of profiles) {
    if (!memberIds.has(p.user_id)) continue;
    if (!isActiveProfile(p.account_status, p.membership_status)) continue;
    if (p.admin_approved === false) continue;
    const ownerId = String(p.gym_owner_id || "");
    if (!ownerId || !(ownerId in counts)) continue;
    counts[ownerId] += 1;
  }

  return counts;
}

export async function getPlatformPublicStats(
  gyms?: GymListItem[],
): Promise<PlatformPublicStats> {
  const approvedGyms = gyms ?? (await listApprovedGyms());
  const ownerIds = approvedGyms.map((g) => g.ownerId);

  const [memberCountsByOwner, trainers, classCount] = await Promise.all([
    getMemberCountsByOwnerIds(ownerIds),
    listAllPublicTrainers(),
    countActiveClasses(ownerIds),
  ]);

  const memberCount = Object.values(memberCountsByOwner).reduce((sum, n) => sum + n, 0);
  const maxYearsOperating = approvedGyms.reduce(
    (max, g) => Math.max(max, parseYears(g.yearsOperating)),
    0,
  );

  return {
    memberCount,
    trainerCount: trainers.length,
    classCount,
    gymCount: approvedGyms.length,
    maxYearsOperating,
    memberCountsByOwner,
  };
}

export async function getGymLiveStats(ownerId: string): Promise<GymLiveStats> {
  if (!ownerId) {
    return { memberCount: 0, trainerCount: 0, classCount: 0 };
  }

  const [memberCounts, trainers, classCount] = await Promise.all([
    getMemberCountsByOwnerIds([ownerId]),
    getGymTrainers(ownerId),
    countActiveClasses([ownerId]),
  ]);

  return {
    memberCount: memberCounts[ownerId] || 0,
    trainerCount: trainers.length,
    classCount,
  };
}

async function countActiveClasses(ownerIds: string[]): Promise<number> {
  const service = createSupabaseServiceClient();
  if (!service || ownerIds.length === 0) return 0;

  const { count, error } = await (service as any)
    .from("gym_classes")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
    .in("gym_owner_id", ownerIds);

  if (error) return 0;
  return count || 0;
}
