import { apiRequest } from "@/api/client";
import { supabase } from "@/integrations/supabase/client";
import type { FitnessProfileData, RegisterMediaFiles } from "@/types/auth";

type AuthSessionPayload = {
  user: any;
  session: {
    access_token: string;
    refresh_token: string;
  } | null;
};

/** auth.login → /api/auth/login */
export async function loginWithPassword(email: string, password: string) {
  const data = await apiRequest<AuthSessionPayload>("auth", "login", {
    body: { email, password },
  });

  if (data.session?.access_token && data.session?.refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
    if (error) {
      // Still proceed — cookies from /api/auth/login may be enough
      console.warn("setSession after login:", error.message);
    }
  } else {
    // Ensure client session exists even if response omitted tokens
    await supabase.auth.getSession();
  }

  return data;
}

/** auth.register → /api/auth/register */
export async function registerAccount(
  email: string,
  password: string,
  name: string,
  fitnessData?: FitnessProfileData,
  media?: RegisterMediaFiles,
) {
  const hasFiles =
    !!media?.logo ||
    !!media?.mainImage ||
    !!(media?.optionalImages && media.optionalImages.length > 0) ||
    !!media?.videoFile;

  if (hasFiles) {
    const form = new FormData();
    form.append("email", email);
    form.append("password", password);
    form.append("full_name", name);
    form.append("fitnessData", JSON.stringify(fitnessData || {}));
    if (media?.logo) form.append("gym_logo", media.logo);
    if (media?.mainImage) form.append("gym_main_image", media.mainImage);
    for (const file of media?.optionalImages || []) {
      form.append("gym_optional_images", file);
    }
    if (media?.videoFile) form.append("gym_video_file", media.videoFile);

    return apiRequest<{
      userId: string | null;
      requiresVerification: boolean;
      user: { id: string; email?: string; email_confirmed_at?: string | null } | null;
    }>("auth", "register", {
      body: form,
      timeoutMs: 120_000,
    });
  }

  return apiRequest<{
    userId: string | null;
    requiresVerification: boolean;
    user: { id: string; email?: string; email_confirmed_at?: string | null } | null;
  }>("auth", "register", {
    body: {
      email,
      password,
      full_name: name,
      fitnessData: fitnessData || {},
    },
  });
}

/** auth.checkGym → /api/auth/check-gym */
export async function checkGymDuplicate(input: {
  gym_name?: string;
  gym_city?: string;
  phone?: string;
}) {
  return apiRequest<{
    duplicate: boolean;
    reason: string | null;
    message?: string;
  }>("auth", "checkGym", {
    body: input,
  });
}

/** auth.logout → /api/auth/logout */
export async function logoutAccount() {
  try {
    await apiRequest<{ ok: boolean }>("auth", "logout", { body: {} });
  } catch {
    // still clear local session
  }
  await supabase.auth.signOut({ scope: "local" });
}

/** auth.checkAccount → /api/auth/check-account */
export async function checkAccountExists(email: string) {
  const data = await apiRequest<{ exists: boolean | null }>("auth", "checkAccount", {
    body: { email },
  });
  return data.exists;
}

/** auth.checkPhone → /api/auth/check-phone */
export async function checkPhoneExists(phone: string, excludeUserId?: string) {
  const data = await apiRequest<{ exists: boolean | null; message?: string }>(
    "auth",
    "checkPhone",
    {
      body: {
        phone,
        ...(excludeUserId ? { excludeUserId } : {}),
      },
    },
  );
  return data.exists;
}

/** auth.checkVerified → /api/auth/check-verified */
export async function checkEmailVerified(email: string) {
  const data = await apiRequest<{ verified: boolean }>("auth", "checkVerified", {
    body: { email },
  });
  return !!data.verified;
}

/** auth.resendVerification → /api/auth/resend-verification */
export async function resendVerificationEmail(email: string) {
  await apiRequest<{ ok: boolean }>("auth", "resendVerification", {
    body: { email },
  });
}

/** auth.markVerified → /api/auth/mark-verified (cookie session from confirm link) */
export async function markEmailVerified() {
  return apiRequest<{ ok?: boolean; success?: boolean }>("auth", "markVerified", {
    body: {},
  });
}

/** auth.me → GET /api/auth/me */
export async function fetchCurrentUser() {
  return apiRequest<{
    id: string;
    email: string | null;
    name: string;
    role: "admin" | "moderator" | "customer" | "trainer" | "staff";
    isSuperAdmin?: boolean;
    admin_approved: boolean;
    is_verified?: boolean;
    avatar: string | null;
    gymName?: string | null;
    gymOwnerId?: string | null;
    gymCity?: string | null;
    gymType?: string | null;
    gymMainImageUrl?: string | null;
    membershipStatus?: string | null;
    membershipType?: string | null;
    trial?: {
      offered: boolean;
      status: "pending_approval" | "active" | "expired" | "none";
      startsAt: string | null;
      endsAt: string | null;
      daysLeft: number | null;
      label: string;
    } | null;
  }>("auth", "me");
}

export type AdminListItem = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string | null;
  admin_approved: boolean;
  admin_rejected_at?: string | null;
  status?: "pending" | "approved" | "rejected";
  is_verified?: boolean;
  approval_requested_at?: string | null;
  gym_name?: string | null;
  gym_type?: string | null;
  gym_city?: string | null;
  trial_offered?: boolean;
  trial_starts_at?: string | null;
  trial_ends_at?: string | null;
  trial_status?: "pending_approval" | "active" | "expired" | "none";
  trial_days_left?: number | null;
  trial_label?: string;
  platform_monthly_fee?: string | null;
};

export type AdminNotification = {
  id: string;
  recipient_user_id: string;
  type: string;
  from_user_id: string | null;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
};

/** admin.pendingAdmins → GET /api/admin/pending */
export async function fetchPendingAdmins() {
  return apiRequest<{
    pending: AdminListItem[];
    approved: AdminListItem[];
    rejected: AdminListItem[];
    admins: AdminListItem[];
    notifications: AdminNotification[];
  }>("admin", "pendingAdmins");
}

/** admin.approveAdmin → POST /api/admin/pending */
export async function approveAdminAccount(userId: string) {
  return apiRequest<{
    approved: {
      user_id: string;
      full_name: string | null;
      email: string | null;
      admin_approved: boolean;
    };
    action: "approve";
  }>("admin", "approveAdmin", {
    body: { userId, action: "approve" },
  });
}

/** admin.approveAdmin → POST /api/admin/pending (reject) */
export async function rejectAdminAccount(userId: string) {
  return apiRequest<{
    rejected: {
      user_id: string;
      full_name: string | null;
      email: string | null;
      admin_approved: boolean;
    };
    action: "reject";
  }>("admin", "approveAdmin", {
    body: { userId, action: "reject" },
  });
}

/** admin.platformSettings → GET /api/admin/platform-settings */
export async function fetchPlatformSettings() {
  return apiRequest<{
    platformFacilityFee: string;
    globalFacilityFee?: string;
    personalMonthlyFee?: string | null;
    updatedAt: string | null;
    stored: boolean;
    warning?: string;
  }>("admin", "platformSettings");
}

/** admin.updatePlatformSettings → PATCH /api/admin/platform-settings */
export async function updatePlatformSettings(platformFacilityFee: string) {
  return apiRequest<{
    platformFacilityFee: string;
    updatedAt: string | null;
    stored: boolean;
  }>("admin", "updatePlatformSettings", {
    body: { platformFacilityFee },
  });
}

export type MembershipFeeAdmin = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  gym_name: string | null;
  gym_city: string | null;
  admin_approved: boolean;
  platform_monthly_fee: string | null;
  trial_status: string;
  trial_ends_at: string | null;
  trial_starts_at: string | null;
  trial_days_left: number | null;
};

/** admin.membershipFees → GET /api/admin/membership-fees */
export async function fetchMembershipFees() {
  return apiRequest<{ admins: MembershipFeeAdmin[] }>(
    "admin",
    "membershipFees",
  );
}

/** admin.updateMembershipFee → PATCH /api/admin/membership-fees */
export async function updateMembershipFee(
  userId: string,
  platformMonthlyFee: string | null,
) {
  return apiRequest<{
    admin: {
      user_id: string;
      full_name: string | null;
      email: string | null;
      gym_name: string | null;
      gym_city: string | null;
      platform_monthly_fee: string | null;
    };
  }>("admin", "updateMembershipFee", {
    body: { userId, platformMonthlyFee },
  });
}
