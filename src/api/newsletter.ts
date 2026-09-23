import { apiRequest } from "@/api/client";

export type NewsletterSubscription = {
  id: string;
  email: string;
  subscribed_at: string;
  is_active: boolean;
  unsubscribed_at: string | null;
  unsubscribe_reason: string | null;
  deletion_scheduled_at: string | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
};

export async function checkNewsletter(email: string) {
  return apiRequest<{
    success: boolean;
    is_subscribed: boolean;
    is_active: boolean;
  }>("newsletter", "check", { query: { email } });
}

export async function getMyNewsletterPreference() {
  return apiRequest<{ subscribed: boolean }>("newsletter", "me");
}

export async function updateMyNewsletterPreference(subscribe: boolean) {
  return apiRequest<{ subscribed: boolean; success?: boolean }>(
    "newsletter",
    "updateMe",
    { body: { subscribe } },
  );
}

export async function subscribeNewsletter(email: string) {
  return apiRequest<{
    success: boolean;
    message?: string;
    error?: string;
    no_change?: boolean;
    already_subscribed?: boolean;
    reactivated?: boolean;
  }>("newsletter", "subscribe", { body: { email } });
}

export async function unsubscribeNewsletter(body: {
  email?: string;
  token?: string;
  reason?: string;
}) {
  return apiRequest<{ success: boolean; message?: string; error?: string }>(
    "newsletter",
    "unsubscribe",
    { body },
  );
}

export async function unsubscribeNewsletterLink(query: {
  email?: string;
  token?: string;
}) {
  return apiRequest<{ success: boolean; message?: string; error?: string }>(
    "newsletter",
    "unsubscribeLink",
    { query },
  );
}

export async function listAdminNewsletter() {
  return apiRequest<{
    success: boolean;
    subscriptions: NewsletterSubscription[];
    error?: string;
  }>("admin", "newsletter");
}

export async function deleteAdminNewsletter(email: string) {
  return apiRequest<{ success: boolean; message?: string; error?: string }>(
    "admin",
    "deleteNewsletter",
    { body: { email } },
  );
}

export async function cleanupAdminNewsletter() {
  return apiRequest<{
    success: boolean;
    deleted_count?: number;
    error?: string;
  }>("admin", "cleanupNewsletter", { body: {} });
}
