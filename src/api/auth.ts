import { apiRequest } from "@/api/client";
import { supabase } from "@/integrations/supabase/client";
import type { FitnessProfileData } from "@/types/auth";

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
    await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  }

  return data;
}

/** auth.register → /api/auth/register */
export async function registerAccount(
  email: string,
  password: string,
  name: string,
  fitnessData?: FitnessProfileData,
) {
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

/** auth.me → GET /api/auth/me */
export async function fetchCurrentUser() {
  return apiRequest<{
    id: string;
    email: string | null;
    name: string;
    role: "admin" | "moderator" | "customer";
    isSuperAdmin?: boolean;
    admin_approved: boolean;
    avatar: string | null;
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
