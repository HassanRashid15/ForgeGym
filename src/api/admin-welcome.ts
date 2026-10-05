import { apiRequest } from "@/api/client";

/** admin.checkWelcomeModal → GET /api/admin/check-welcome-modal */
export async function checkWelcomeModal() {
  return apiRequest<{
    showModal: boolean;
    gymName?: string;
    userName?: string;
  }>("admin", "checkWelcomeModal");
}

/** admin.welcomeModal → POST /api/admin/welcome-modal */
export async function markWelcomeModalShown(input: {
  enableClasses?: boolean;
  enableSchedule?: boolean;
  enableMembership?: boolean;
}) {
  return apiRequest<{
    success: boolean;
    enableClasses?: boolean;
    enableSchedule?: boolean;
    enableMembership?: boolean;
  }>("admin", "welcomeModal", {
    body: {
      enableClasses: input.enableClasses === true,
      enableSchedule: input.enableSchedule === true,
      enableMembership: input.enableMembership === true,
    },
  });
}

/** admin.checkPermissions → GET /api/admin/check-permissions */
export async function checkAdminPermissions() {
  return apiRequest<{
    authenticated: boolean;
    userId: string;
    email: string;
    roles: string[];
    hasAdminRole: boolean;
    adminApproved: boolean;
    isSuperAdmin: boolean;
    gymOwnerId: string | null;
    canAccessAdminUsers: boolean;
  }>("admin", "checkPermissions");
}

/** admin.applyMigration → POST /api/admin/apply-migration (dev/superadmin) */
export async function applyAdminMigration(body?: Record<string, unknown>) {
  return apiRequest<{ success?: boolean; note?: string }>("admin", "applyMigration", {
    body: body || {},
  });
}
