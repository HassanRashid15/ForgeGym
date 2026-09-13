/**
 * Fire-and-forget helpers for product actions.
 * Never throw into the request path — notifications are best-effort.
 */

import { createNotification } from "@/lib/notifications";
import {
  sendTemplatedNotification,
  actionTemplates,
  membershipTemplates,
  type NotificationTemplate,
} from "@/lib/notification-templates";

async function safeNotify(userId: string, template: NotificationTemplate) {
  if (!userId) return;
  try {
    await sendTemplatedNotification(userId, template);
  } catch (error) {
    console.warn("notify failed:", error);
  }
}

export async function notifyMany(userIds: string[], template: NotificationTemplate) {
  const unique = [...new Set(userIds.filter(Boolean))];
  await Promise.allSettled(unique.map((id) => safeNotify(id, template)));
}

/** Approval-request rows stay on admin_notifications (type-compatible). */
export async function notifyApprovalRequest(params: {
  recipientIds: string[];
  type: "admin_approval_request" | "member_approval_request";
  fromUserId: string;
  title: string;
  message: string;
}) {
  const recipients = [...new Set(params.recipientIds.filter((id) => id && id !== params.fromUserId))];
  await Promise.allSettled(
    recipients.map((user_id) =>
      createNotification({
        user_id,
        type: params.type,
        title: params.title,
        message: params.message,
        metadata: {
          related_id: params.fromUserId,
          related_type: "user",
          priority: "high",
          action_url: "/dashboard/users",
        },
      }),
    ),
  );
}

export const notify = {
  gymOwnerApproved: (userId: string, gymName?: string | null) =>
    safeNotify(userId, actionTemplates.gymOwnerApproved(gymName || "your gym")),

  gymOwnerRejected: (userId: string) =>
    safeNotify(userId, actionTemplates.gymOwnerRejected()),

  memberApproved: (userId: string, gymName?: string | null) =>
    safeNotify(userId, membershipTemplates.welcome(gymName || "the gym")),

  memberRejected: (userId: string, gymName?: string | null) =>
    safeNotify(userId, actionTemplates.memberRejected(gymName || "the gym")),

  memberPending: (userId: string, gymName?: string | null) =>
    safeNotify(userId, actionTemplates.memberPending(gymName || "the gym")),

  accountCreated: (userId: string, role: string, gymName?: string | null) =>
    safeNotify(userId, actionTemplates.accountCreated(role, gymName || "the gym")),

  roleChanged: (userId: string, role: string) =>
    safeNotify(userId, actionTemplates.roleChanged(role)),

  loginAccessChanged: (userId: string, enabled: boolean) =>
    safeNotify(userId, actionTemplates.loginAccessChanged(enabled)),

  accountStatusChanged: (userId: string, status: string) =>
    safeNotify(userId, actionTemplates.accountStatusChanged(status)),

  profileUpdatedByAdmin: (userId: string) =>
    safeNotify(userId, actionTemplates.profileUpdatedByAdmin()),

  profileSaved: (userId: string) =>
    safeNotify(userId, actionTemplates.profileSaved()),

  avatarUpdated: (userId: string) =>
    safeNotify(userId, actionTemplates.avatarUpdated()),

  gymMediaUploaded: (userId: string, kind: string) =>
    safeNotify(userId, actionTemplates.gymMediaUploaded(kind)),

  gymMediaDeleted: (userId: string) =>
    safeNotify(userId, actionTemplates.gymMediaDeleted()),

  userDeleted: (actorId: string, targetName: string) =>
    safeNotify(actorId, actionTemplates.userDeleted(targetName)),

  registrationWelcome: (userId: string, role: "admin" | "user", gymName?: string | null) =>
    safeNotify(userId, actionTemplates.registrationWelcome(role, gymName)),

  loginSuccess: (userId: string, when: string) =>
    safeNotify(userId, actionTemplates.loginSuccess(when)),
};
