import { createSupabaseServiceClient } from "@/lib/supabase/server";

type RpcSubscribeResult = { success: boolean; message?: string };
type RpcSetPreferenceResult = { success: boolean };
type RpcCheckSubscriptionResult = { is_subscribed: boolean; is_active: boolean };

/** Subscribe email via service role (login / settings / public form helpers). */
export async function subscribeEmail(email: string) {
  const service = createSupabaseServiceClient();
  if (!service) return { success: false as const, error: "Service unavailable" };
  const clean = email.trim().toLowerCase();
  if (!clean.includes("@")) return { success: false as const, error: "Invalid email" };

  const { data, error } = await service.rpc("subscribe_to_newsletter", {
    p_email: clean,
  });
  if (error) return { success: false as const, error: error.message };
  return { success: true as const, ...((data || {}) as RpcSubscribeResult) };
}

export async function setNewsletterPreference(
  email: string,
  subscribe: boolean,
  reason?: string,
) {
  const service = createSupabaseServiceClient();
  if (!service) return { success: false as const, error: "Service unavailable" };
  const clean = email.trim().toLowerCase();

  const { data, error } = await service.rpc("set_newsletter_preference", {
    p_email: clean,
    p_subscribe: subscribe,
    p_reason: reason || null,
  });
  if (error) return { success: false as const, error: error.message };
  return { success: true as const, ...((data || {}) as RpcSetPreferenceResult) };
}

export async function checkNewsletterSubscription(email: string) {
  const service = createSupabaseServiceClient();
  if (!service) return { is_subscribed: false, is_active: false };
  const clean = email.trim().toLowerCase();
  const { data } = await service.rpc("check_newsletter_subscription", {
    p_email: clean,
  });
  const result = (data || {}) as RpcCheckSubscriptionResult;
  return {
    is_subscribed: Boolean(result.is_subscribed),
    is_active: Boolean(result.is_active),
  };
}

export async function listActiveSubscriberEmails(): Promise<string[]> {
  const service = createSupabaseServiceClient();
  if (!service) return [];
  const { data } = await service
    .from("newsletter_subscriptions")
    .select("email")
    .eq("is_active", true);
  return ((data as { email: string }[] | null) || [])
    .map((r) => r.email)
    .filter(Boolean);
}
