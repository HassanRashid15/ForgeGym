import { apiRequest } from "@/api/client";

export type ManagedUser = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  address?: string | null;
  avatar_url?: string | null;
  membership_status: string | null;
  membership_type: string | null;
  account_status?: string | null;
  join_date?: string | null;
  created_at?: string | null;
  role: "admin" | "moderator" | "user" | "trainer" | "staff";
  is_super_admin?: boolean;
  admin_approved?: boolean;
  specialization?: string | null;
  employment_type?: string | null;
  branch_department?: string | null;
  staff_type?: string | null;
  department?: string | null;
  login_enabled?: boolean;
  gym_name?: string | null;
  gym_owner_id?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  emergency_contact?: string | null;
  trainer_bio?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  twitter_url?: string | null;
  youtube_url?: string | null;
  tiktok_url?: string | null;
  certifications?: string[] | null;
  certification_number?: string | null;
  years_experience?: string | null;
  education?: string | null;
  skills?: string[] | null;
  languages?: string[] | null;
  salary?: string | null;
  commission_percentage?: number | null;
  working_days?: string | null;
  working_hours?: string | null;
  max_client_capacity?: string | null;
  assigned_members?: string[] | null;
  availability?: string | null;
  pt_sessions?: string | null;
  leave_info?: string | null;
  supervisor?: string | null;
  shift?: string | null;
  overtime_rate?: string | null;
  responsibilities?: string | null;
  system_permissions?: string[] | null;
  preferred_trainer_id?: string | null;
  pending_trainer_id?: string | null;
  trainer_request_pending?: boolean;
  fee_concession?: string | null;
  has_trainer?: boolean;
  monthly_fee_label?: string | null;
  gym_monthly_fee?: string | null;
  gym_trainer_fee?: string | null;
};

export type CreateStaffPayload = {
  full_name: string;
  email: string;
  password?: string;
  phone?: string | null;
  address?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  emergency_contact?: string | null;
  account_status?: string;
  membership_status?: string;
  membership_type?: string;
  role?: "admin" | "moderator" | "user" | "trainer" | "staff" | "super_admin";
  avatar_base64?: string;
  specialization?: string | null;
  certifications?: string | string[];
  certification_number?: string | null;
  years_experience?: string | null;
  education?: string | null;
  skills?: string | string[];
  languages?: string | string[];
  trainer_bio?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  twitter_url?: string | null;
  youtube_url?: string | null;
  tiktok_url?: string | null;
  joining_date?: string | null;
  employment_type?: string | null;
  branch_department?: string | null;
  department?: string | null;
  salary?: string | null;
  commission_percentage?: string | number | null;
  working_days?: string | null;
  working_hours?: string | null;
  max_client_capacity?: string | null;
  assigned_members?: string | string[];
  availability?: string | null;
  pt_sessions?: string | null;
  leave_info?: string | null;
  staff_type?: string | null;
  supervisor?: string | null;
  shift?: string | null;
  overtime_rate?: string | null;
  responsibilities?: string | null;
  login_enabled?: boolean;
  system_permissions?: string[];
};

export type CreateUserPayload = CreateStaffPayload;

export type UpdateUserPayload = {
  userId: string;
  action?: "approve" | "reject" | "approve_trainer" | "reject_trainer";
  full_name?: string;
  phone?: string | null;
  address?: string | null;
  membership_status?: string;
  membership_type?: string;
  account_status?: string;
  specialization?: string | null;
  staff_type?: string | null;
  login_enabled?: boolean;
  role?: "admin" | "moderator" | "user" | "trainer" | "staff" | "super_admin";
  gender?: string | null;
  date_of_birth?: string | null;
  emergency_contact?: string | null;
  trainer_bio?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  twitter_url?: string | null;
  youtube_url?: string | null;
  tiktok_url?: string | null;
  certifications?: string | string[];
  certification_number?: string | null;
  years_experience?: string | null;
  education?: string | null;
  skills?: string | string[];
  languages?: string | string[];
  employment_type?: string | null;
  branch_department?: string | null;
  department?: string | null;
  salary?: string | null;
  commission_percentage?: string | number | null;
  working_days?: string | null;
  working_hours?: string | null;
  max_client_capacity?: string | null;
  assigned_members?: string | string[];
  availability?: string | null;
  pt_sessions?: string | null;
  leave_info?: string | null;
  supervisor?: string | null;
  shift?: string | null;
  overtime_rate?: string | null;
  responsibilities?: string | null;
  system_permissions?: string[];
  joining_date?: string | null;
  avatar_base64?: string;
  preferred_trainer_id?: string | null;
  fee_concession?: string | null;
};

/** admin.listUsers → GET /api/admin/users */
export async function listManagedUsers(q?: string) {
  return apiRequest<{ users: ManagedUser[]; isSuperAdmin: boolean; gymOwnerId?: string }>(
    "admin",
    "listUsers",
    q?.trim() ? { query: { q: q.trim() } } : {},
  );
}

/** admin.createUser → POST /api/admin/users */
export async function createManagedUser(payload: CreateStaffPayload) {
  return apiRequest<{
    user: ManagedUser & { requiresVerification?: boolean };
    requiresVerification?: boolean;
    message?: string;
  }>("admin", "createUser", {
    body: payload,
  });
}

/** admin.updateUser → PATCH /api/admin/users */
export async function updateManagedUser(payload: UpdateUserPayload) {
  return apiRequest<{ user: ManagedUser; action?: string }>("admin", "updateUser", {
    body: payload,
  });
}

/** Approve a pending gym member */
export async function approveManagedMember(userId: string) {
  return updateManagedUser({ userId, action: "approve" });
}

/** Reject a pending gym member */
export async function rejectManagedMember(userId: string) {
  return updateManagedUser({ userId, action: "reject" });
}

/** Approve a member's pending trainer change */
export async function approveTrainerRequest(userId: string) {
  return updateManagedUser({ userId, action: "approve_trainer" });
}

/** Reject a member's pending trainer change */
export async function rejectTrainerRequest(userId: string) {
  return updateManagedUser({ userId, action: "reject_trainer" });
}

/** admin.deleteUser → DELETE /api/admin/users */
export async function deleteManagedUser(userId: string) {
  return apiRequest<{ ok: boolean; userId: string }>("admin", "deleteUser", {
    body: { userId },
  });
}

export type MonthlyMember = {
  userId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  membershipStatus: string;
  membershipType: string;
  monthlyFee: string | null;
  /** Gym base fee before trainer add-on */
  gymMonthlyFee?: string | null;
  trainerFee?: string | null;
  hasTrainer?: boolean;
  preferredTrainerId?: string | null;
  pendingTrainerId?: string | null;
  trainerRequestPending?: boolean;
  feeConcession?: string | null;
  associatedAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  daysLeft: number | null;
};

/** admin.monthlyMembers → GET /api/admin/monthly-members */
export async function listMonthlyMembers() {
  return apiRequest<{
    monthlyFee: string | null;
    trainerFee: string | null;
    gymName: string | null;
    members: MonthlyMember[];
  }>("admin", "monthlyMembers");
}
