import { redirect } from "next/navigation";
import {
  createSupabaseCookieClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import DashboardClientLayout from "./DashboardClientLayout";
import { buildPageMetadata } from "@/lib/seo";

/** Auth cookie session — must render per-request, not as a static page. */
export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "Dashboard",
  description: "Manage membership, attendance, progress, and gym operations on Forge Gym.",
  path: "/dashboard",
  noIndex: true,
});

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseCookieClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard");
  }

  if (!user.email_confirmed_at) {
    const q = user.email ? `?email=${encodeURIComponent(user.email)}` : "";
    redirect(`/verification${q}`);
  }

  // Prefer service role for the gate — cookie RLS can fail if a policy still
  // references dropped columns (e.g. profiles.role), which falsely looks "unverified".
  const service = createSupabaseServiceClient();
  const db = service || supabase;
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select(
      "is_verified, is_frozen, frozen_until, admin_approved, is_super_admin, gym_owner_id",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    console.warn("dashboard layout profile gate error:", profileError.message);
  }

  if (profile && profile.is_verified !== true) {
    const q = user.email ? `?email=${encodeURIComponent(user.email)}` : "";
    redirect(`/verification${q}`);
  }

  // Block dashboard until approved (super admin is always allowed)
  if (
    profile &&
    profile.is_super_admin !== true &&
    profile.admin_approved !== true
  ) {
    await supabase.auth.signOut();
    const reason =
      profile.gym_owner_id === user.id
        ? "admin_approval_pending"
        : profile.gym_owner_id
          ? "member_approval_pending"
          : "platform_member_approval_pending";
    redirect(`/login?error=${encodeURIComponent(reason)}`);
  }

  // Check if account is frozen
  const isFrozen = profile?.is_frozen === true;
  const frozenUntil = profile?.frozen_until;

  return (
    <DashboardClientLayout serverAuthenticated isFrozen={isFrozen} frozenUntil={frozenUntil}>
      {children}
    </DashboardClientLayout>
  );
}
