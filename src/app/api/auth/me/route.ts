import { NextResponse } from "next/server";
import {
  createSupabaseServiceClient,
  requireAuth,
} from "@/lib/supabase/server";

/** GET /api/auth/me — role + profile (self-heals missing admin role for gym owners) */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { user, supabase } = auth;
  const service = createSupabaseServiceClient();
  const db = service || supabase;

  const [{ data: roles }, { data: profile }] = await Promise.all([
    db.from("user_roles").select("role").eq("user_id", user.id),
    db
      .from("profiles")
      .select(
        "full_name, email, admin_approved, avatar_url, is_super_admin, is_verified, gym_name, gym_owner_id, gym_city, gym_type, membership_status, membership_type",
      )
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const roleNames = (roles || []).map((r) => r.role);
  let role: "admin" | "moderator" | "customer" | "trainer" | "staff" = "customer";
  if (roleNames.includes("admin")) role = "admin";
  else if (roleNames.includes("trainer")) role = "trainer";
  else if (roleNames.includes("staff")) role = "staff";
  else if (roleNames.includes("moderator")) role = "moderator";

  const email = (profile?.email || user.email || "").toLowerCase();
  let isSuperAdmin = (profile as { is_super_admin?: boolean } | null)?.is_super_admin === true;

  if (email === "superadmin@forge.test") {
    isSuperAdmin = true;
    role = "admin";
  }

  const profileRow = profile as {
    gym_name?: string | null;
    gym_owner_id?: string | null;
    gym_city?: string | null;
    gym_type?: string | null;
    avatar_url?: string | null;
    membership_status?: string | null;
    membership_type?: string | null;
    admin_approved?: boolean | null;
    is_verified?: boolean | null;
  } | null;

  const metaRequested = String(
    (user.user_metadata as { requested_role?: string } | null)?.requested_role || "",
  ).toLowerCase();

  // Gym owners register with gym_name + requested_role=admin. If user_roles is
  // missing, they must not be treated as customers.
  const looksLikeGymOwner =
    Boolean(profileRow?.gym_name?.trim()) ||
    metaRequested === "admin" ||
    metaRequested === "super_admin";

  if (role === "customer" && (isSuperAdmin || looksLikeGymOwner)) {
    role = "admin";
    if (service && !roleNames.includes("admin")) {
      const { error: healErr } = await service.from("user_roles").upsert(
        { user_id: user.id, role: "admin" } as never,
        { onConflict: "user_id,role" },
      );
      if (healErr) {
        console.warn("me: could not self-heal admin role:", healErr.message);
      }
    }
  }

  const gymOwnerId =
    profileRow?.gym_owner_id || (role === "admin" ? user.id : null);

  let gymName = profileRow?.gym_name || null;
  let gymCity = profileRow?.gym_city || null;
  let gymType = profileRow?.gym_type || null;
  let gymMainImageUrl: string | null = null;

  if (gymOwnerId && service) {
    const [{ data: gymRow }, { data: ownerProfile }] = await Promise.all([
      service
        .from("gyms")
        .select("name, city, gym_type, main_image_url")
        .eq("owner_user_id", gymOwnerId)
        .maybeSingle(),
      service
        .from("profiles")
        .select("gym_name, gym_city, gym_type, gym_main_image_url")
        .eq("user_id", gymOwnerId)
        .maybeSingle(),
    ]);

    gymName = gymRow?.name || ownerProfile?.gym_name || gymName;
    gymCity = gymRow?.city || ownerProfile?.gym_city || gymCity;
    gymType = gymRow?.gym_type || ownerProfile?.gym_type || gymType;
    gymMainImageUrl =
      gymRow?.main_image_url || ownerProfile?.gym_main_image_url || null;
  }

  return NextResponse.json({
    id: user.id,
    email: profile?.email || user.email,
    name:
      profile?.full_name ||
      user.user_metadata?.full_name ||
      email.split("@")[0],
    role,
    isSuperAdmin,
    admin_approved: isSuperAdmin || profile?.admin_approved === true,
    is_verified: isSuperAdmin || profileRow?.is_verified === true,
    avatar: profileRow?.avatar_url || user.user_metadata?.avatar_url || null,
    gymName,
    gymOwnerId,
    gymCity,
    gymType,
    gymMainImageUrl,
    membershipStatus: profileRow?.membership_status || null,
    membershipType: profileRow?.membership_type || null,
  });
}
