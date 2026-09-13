/**
 * Notification Templates
 * Pre-defined notification templates for common gym events
 */

import { createNotification } from "@/lib/notifications";
import type { NotificationType, NotificationMetadata, Notification } from "@/lib/notifications";

export interface NotificationTemplate {
  type: NotificationType;
  title: string;
  message: string;
  metadata?: NotificationMetadata;
}

// Booking-related templates
export const bookingTemplates = {
  confirmed: (className: string, date: string, time: string): NotificationTemplate => ({
    type: "booking",
    title: `${className} Booking Confirmed`,
    message: `Your slot for ${className} on ${date} at ${time} is secured. Arrive 10 minutes early for check-in.`,
    metadata: { icon: "event_available", priority: "high" as const, action_url: "/dashboard/schedule" },
  }),
  
  reminder: (className: string, date: string, time: string): NotificationTemplate => ({
    type: "reminder",
    title: `Upcoming ${className} Class`,
    message: `Reminder: Your ${className} class is scheduled for ${date} at ${time}. Don't forget to bring your gear!`,
    metadata: { icon: "alarm", priority: "medium" as const, action_url: "/dashboard/schedule" },
  }),
  
  cancelled: (className: string, date: string): NotificationTemplate => ({
    type: "alert",
    title: `${className} Class Cancelled`,
    message: `Unfortunately, the ${className} class scheduled for ${date} has been cancelled. Please check for available alternatives.`,
    metadata: { icon: "event_busy", priority: "high" as const, action_url: "/dashboard/classes" },
  }),
  
  rescheduled: (className: string, oldDate: string, newDate: string): NotificationTemplate => ({
    type: "info",
    title: `${className} Rescheduled`,
    message: `Your ${className} class has been rescheduled from ${oldDate} to ${newDate}. Please update your calendar.`,
    metadata: { icon: "event_available", priority: "medium" as const, action_url: "/dashboard/schedule" },
  }),
};

// Payment-related templates
export const paymentTemplates = {
  success: (amount: number, plan: string): NotificationTemplate => ({
    type: "payment",
    title: "Payment Successful",
    message: `Your payment of $${amount.toFixed(2)} for ${plan} membership has been processed successfully.`,
    metadata: { icon: "payments", priority: "high" as const, action_url: "/dashboard/membership" },
  }),
  
  failed: (amount: number, reason: string): NotificationTemplate => ({
    type: "alert",
    title: "Payment Failed",
    message: `Your payment of $${amount.toFixed(2)} could not be processed. ${reason}. Please update your payment method.`,
    metadata: { icon: "error", priority: "high" as const, action_url: "/dashboard/membership" },
  }),
  
  upcoming: (amount: number, dueDate: string): NotificationTemplate => ({
    type: "reminder",
    title: "Upcoming Payment",
    message: `Your membership payment of $${amount.toFixed(2)} is due on ${dueDate}. Please ensure your payment method is up to date.`,
    metadata: { icon: "credit_card", priority: "medium" as const, action_url: "/dashboard/membership" },
  }),
  
  refund: (amount: number, reason: string): NotificationTemplate => ({
    type: "payment",
    title: "Refund Processed",
    message: `A refund of $${amount.toFixed(2)} has been processed to your account. Reason: ${reason}.`,
    metadata: { icon: "refund", priority: "medium" as const, action_url: "/dashboard/membership" },
  }),
};

// Achievement-related templates
export const achievementTemplates = {
  milestone: (achievement: string, details: string): NotificationTemplate => ({
    type: "achievement",
    title: `🎉 Achievement Unlocked: ${achievement}`,
    message: `Congratulations! You've reached a new milestone: ${details}. Keep up the great work!`,
    metadata: { icon: "emoji_events", priority: "high" as const, action_url: "/dashboard/progress" },
  }),
  
  streak: (days: number): NotificationTemplate => ({
    type: "achievement",
    title: `🔥 ${days}-Day Streak!`,
    message: `Amazing work! You've maintained a ${days}-day workout streak. Your consistency is paying off!`,
    metadata: { icon: "local_fire_department", priority: "high" as const, action_url: "/dashboard/progress" },
  }),
  
  personalBest: (exercise: string, value: string): NotificationTemplate => ({
    type: "achievement",
    title: `💪 New Personal Best: ${exercise}`,
    message: `Incredible! You've set a new personal best in ${exercise} with ${value}. You're getting stronger every day!`,
    metadata: { icon: "military_tech", priority: "high" as const, action_url: "/dashboard/progress" },
  }),
  
  levelUp: (level: number): NotificationTemplate => ({
    type: "achievement",
    title: `⭐ Level Up!`,
    message: `You've reached Level ${level}! Your dedication and hard work are truly impressive.`,
    metadata: { icon: "stars", priority: "high" as const, action_url: "/dashboard/progress" },
  }),
};

// Membership-related templates
export const membershipTemplates = {
  welcome: (gymName: string): NotificationTemplate => ({
    type: "welcome",
    title: `Welcome to ${gymName}!`,
    message: `We're thrilled to have you join our fitness community. Get started by exploring our facilities and booking your first class!`,
    metadata: { icon: "waving_hand", priority: "high" as const, action_url: "/dashboard" },
  }),
  
  renewal: (plan: string, expiryDate: string): NotificationTemplate => ({
    type: "reminder",
    title: "Membership Renewal",
    message: `Your ${plan} membership expires on ${expiryDate}. Renew now to continue enjoying all member benefits.`,
    metadata: { icon: "card_membership", priority: "high" as const, action_url: "/dashboard/membership" },
  }),
  
  upgrade: (newPlan: string, benefits: string[]): NotificationTemplate => ({
    type: "promotion",
    title: "Membership Upgraded",
    message: `Congratulations! Your membership has been upgraded to ${newPlan}. You now have access to: ${benefits.join(", ")}.`,
    metadata: { icon: "upgrade", priority: "high" as const, action_url: "/dashboard/membership" },
  }),
  
  expired: (plan: string): NotificationTemplate => ({
    type: "alert",
    title: "Membership Expired",
    message: `Your ${plan} membership has expired. Renew now to regain access to all gym facilities and classes.`,
    metadata: { icon: "event_busy", priority: "high" as const, action_url: "/dashboard/membership" },
  }),
};

// System-related templates
export const systemTemplates = {
  maintenance: (facility: string, startDate: string, endDate: string): NotificationTemplate => ({
    type: "maintenance",
    title: `${facility} Maintenance`,
    message: `${facility} will be under maintenance from ${startDate} to ${endDate}. Alternative facilities will be available.`,
    metadata: { icon: "build", priority: "high" as const },
  }),
  
  newFeature: (feature: string, description: string): NotificationTemplate => ({
    type: "system",
    title: `New Feature: ${feature}`,
    message: `${description}. Check it out in your dashboard!`,
    metadata: { icon: "new_releases", priority: "low" as const, action_url: "/dashboard" },
  }),
  
  scheduleUpdate: (className: string, changes: string): NotificationTemplate => ({
    type: "class_update",
    title: `${className} Schedule Updated`,
    message: `The schedule for ${className} has been updated. ${changes}`,
    metadata: { icon: "schedule", priority: "medium" as const, action_url: "/dashboard/schedule" },
  }),
  
  promotion: (title: string, description: string, code?: string): NotificationTemplate => ({
    type: "promotion",
    title: title,
    message: `${description}${code ? ` Use code: ${code}` : ""}`,
    metadata: { icon: "local_offer", priority: "medium" as const, action_url: "/dashboard/membership" },
  }),
};

// Security-related templates
export const securityTemplates = {
  loginAlert: (device: string, location: string, time: string): NotificationTemplate => ({
    type: "security",
    title: "New Login Detected",
    message: `A new login was detected from ${device} in ${location} at ${time}. If this wasn't you, please secure your account immediately.`,
    metadata: { icon: "security", priority: "high" as const, action_url: "/profile?tab=settings" },
  }),
  
  passwordChanged: (time: string): NotificationTemplate => ({
    type: "security",
    title: "Password Changed",
    message: `Your password was changed at ${time}. If you didn't make this change, please contact support immediately.`,
    metadata: { icon: "lock", priority: "high" as const, action_url: "/profile?tab=settings" },
  }),
  
  emailChanged: (newEmail: string, time: string): NotificationTemplate => ({
    type: "security",
    title: "Email Changed",
    message: `Your account email was changed to ${newEmail} at ${time}. If you didn't make this change, please contact support immediately.`,
    metadata: { icon: "email", priority: "high" as const, action_url: "/profile?tab=settings" },
  }),
};

/** Real product actions (approve, edit, media, signup, login, …) */
export const actionTemplates = {
  gymOwnerApproved: (gymName: string): NotificationTemplate => ({
    type: "confirmation",
    title: "Gym approved",
    message: `Your gym "${gymName}" is approved. You can manage members and publish your public page.`,
    metadata: { icon: "verified", priority: "high", action_url: "/dashboard" },
  }),

  gymOwnerRejected: (): NotificationTemplate => ({
    type: "alert",
    title: "Gym registration rejected",
    message:
      "Your gym owner account was not approved. Contact support if you believe this is a mistake.",
    metadata: { icon: "block", priority: "high", action_url: "/dashboard" },
  }),

  memberRejected: (gymName: string): NotificationTemplate => ({
    type: "alert",
    title: "Membership not approved",
    message: `Your request to join ${gymName} was not approved.`,
    metadata: { icon: "person_off", priority: "high", action_url: "/dashboard" },
  }),

  memberPending: (gymName: string): NotificationTemplate => ({
    type: "info",
    title: "Membership pending",
    message: `Your request to join ${gymName} was submitted. You'll be notified when a gym admin reviews it.`,
    metadata: { icon: "hourglass_top", priority: "medium", action_url: "/dashboard" },
  }),

  accountCreated: (role: string, gymName: string): NotificationTemplate => ({
    type: "welcome",
    title: "Account created",
    message: `You've been added to ${gymName} as ${role}. Sign in to open your dashboard.`,
    metadata: { icon: "person_add", priority: "high", action_url: "/dashboard" },
  }),

  roleChanged: (role: string): NotificationTemplate => ({
    type: "system",
    title: "Role updated",
    message: `Your account role is now "${role}".`,
    metadata: { icon: "manage_accounts", priority: "high", action_url: "/dashboard" },
  }),

  loginAccessChanged: (enabled: boolean): NotificationTemplate => ({
    type: "security",
    title: enabled ? "Login enabled" : "Login disabled",
    message: enabled
      ? "Your account can sign in again."
      : "Login access for your account was disabled by an admin.",
    metadata: { icon: "lock", priority: "high", action_url: "/dashboard" },
  }),

  accountStatusChanged: (status: string): NotificationTemplate => ({
    type: "membership",
    title: "Account status updated",
    message: `Your account status is now "${status}".`,
    metadata: { icon: "badge", priority: "medium", action_url: "/dashboard" },
  }),

  profileUpdatedByAdmin: (): NotificationTemplate => ({
    type: "info",
    title: "Profile updated",
    message: "An admin updated your profile details.",
    metadata: { icon: "edit", priority: "medium", action_url: "/profile" },
  }),

  profileSaved: (): NotificationTemplate => ({
    type: "confirmation",
    title: "Profile saved",
    message: "Your profile changes were saved successfully.",
    metadata: { icon: "check_circle", priority: "low", action_url: "/profile" },
  }),

  avatarUpdated: (): NotificationTemplate => ({
    type: "confirmation",
    title: "Avatar updated",
    message: "Your profile photo was updated.",
    metadata: { icon: "photo_camera", priority: "low", action_url: "/profile" },
  }),

  gymMediaUploaded: (kind: string): NotificationTemplate => ({
    type: "confirmation",
    title: "Gym media uploaded",
    message: `Your gym ${kind.replace(/-/g, " ")} was uploaded and is ready to show on your public page.`,
    metadata: { icon: "cloud_upload", priority: "medium", action_url: "/profile" },
  }),

  gymMediaDeleted: (): NotificationTemplate => ({
    type: "info",
    title: "Gym media removed",
    message: "A gym media file was deleted from storage.",
    metadata: { icon: "delete", priority: "low", action_url: "/profile" },
  }),

  userDeleted: (targetName: string): NotificationTemplate => ({
    type: "system",
    title: "User removed",
    message: `${targetName} was removed from your gym.`,
    metadata: { icon: "person_remove", priority: "medium", action_url: "/dashboard/users" },
  }),

  registrationWelcome: (
    role: "admin" | "user",
    gymName?: string | null,
  ): NotificationTemplate => ({
    type: "welcome",
    title: role === "admin" ? "Gym registration received" : "Welcome aboard",
    message:
      role === "admin"
        ? "Your gym owner signup is pending platform approval. We'll notify you when it's reviewed."
        : gymName
          ? `Thanks for joining ${gymName}. Verify your email and wait for gym admin approval.`
          : "Thanks for signing up. Verify your email to continue.",
    metadata: { icon: "waving_hand", priority: "high", action_url: "/dashboard" },
  }),

  loginSuccess: (when: string): NotificationTemplate => ({
    type: "security",
    title: "Signed in",
    message: `You signed in successfully at ${when}.`,
    metadata: { icon: "login", priority: "low", action_url: "/dashboard" },
  }),
};

// Feedback-related templates
export const feedbackTemplates = {
  reviewRequested: (className: string): NotificationTemplate => ({
    type: "feedback",
    title: "Rate Your Experience",
    message: `How was your recent ${className} class? Your feedback helps us improve our services.`,
    metadata: { icon: "star_rate", priority: "low" as const, action_url: "/dashboard/classes" },
  }),
  
  surveyAvailable: (title: string, incentive: string): NotificationTemplate => ({
    type: "feedback",
    title: "Survey Available",
    message: `${title}. Complete it for ${incentive}!`,
    metadata: { icon: "poll", priority: "low" as const, action_url: "/dashboard" },
  }),
};

// Helper function to send notification using template
export async function sendTemplatedNotification(
  userId: string,
  template: NotificationTemplate
): Promise<boolean> {
  try {
    const result = await createNotification({
      user_id: userId,
      type: template.type,
      title: template.title,
      message: template.message,
      metadata: template.metadata,
    });
    
    return result !== null;
  } catch (error) {
    console.error("Error sending templated notification:", error);
    return false;
  }
}

// Helper function to send notification and return the notification object
export async function sendTemplatedNotificationWithResult(
  userId: string,
  template: NotificationTemplate
): Promise<Notification | null> {
  try {
    const result = await createNotification({
      user_id: userId,
      type: template.type,
      title: template.title,
      message: template.message,
      metadata: template.metadata,
    });
    
    return result;
  } catch (error) {
    console.error("Error sending templated notification:", error);
    return null;
  }
}

// Helper function to send notification to multiple users
export async function broadcastTemplatedNotification(
  userIds: string[],
  template: NotificationTemplate
): Promise<{ success: number; failed: number }> {
  const results = await Promise.allSettled(
    userIds.map((userId) => sendTemplatedNotification(userId, template))
  );
  
  const success = results.filter((r) => r.status === "fulfilled" && r.value === true).length;
  const failed = results.length - success;
  
  return { success, failed };
}