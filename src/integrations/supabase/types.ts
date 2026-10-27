/**
 * Supabase Database types — re-export canonical schema from src/types/database.ts.
 * App lookups use profiles.user_id (not profiles.id). Roles via user_roles.
 * Gym attributes live on public.gyms (owner_user_id), not profiles.gym_*.
 */
export type { Database, Json } from "@/types/database";

// Common RPC function return types
export interface RpcCheckUserExistsResult {
  exists: boolean;
}

export interface RpcSyncMySignupProfileResult {
  success: boolean;
}

export interface RpcCleanupExpiredSubscriptionsResult {
  deleted_count: number;
}

export interface RpcGetNewsletterSubscriptionsResult {
  email: string;
  is_active: boolean;
  created_at: string;
  unsubscribed_at: string | null;
}[]

export interface RpcSubscribeToNewsletterResult {
  success: boolean;
  message?: string;
}

export interface RpcSetNewsletterPreferenceResult {
  success: boolean;
}

export interface RpcCheckNewsletterSubscriptionResult {
  is_subscribed: boolean;
  is_active: boolean;
}

export interface RpcCheckUserVerifiedResult {
  is_verified: boolean;
}
