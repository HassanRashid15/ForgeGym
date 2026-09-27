import { createSupabaseCookieClient, createSupabaseServiceClient } from "@/lib/supabase/server";

export interface DashboardWelcomeCheck {
  /** True when an authenticated user was evaluated on the server */
  checked: boolean;
  showModal: boolean;
  gymName?: string;
  userName?: string;
}

/**
 * Server-side check for welcome modal display.
 * Runs during SSR so the modal can open on first paint for newly approved admins.
 */
export async function checkWelcomeModalSSR(): Promise<DashboardWelcomeCheck> {
  const service = createSupabaseServiceClient();

  if (!service) {
    return { checked: false, showModal: false };
  }

  try {
    const supabase = await createSupabaseCookieClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { checked: false, showModal: false };
    }

    const [{ data: roles }, { data: profile, error: profileError }] = await Promise.all([
      service.from("user_roles").select("role").eq("user_id", user.id),
      service
        .from("profiles")
        .select("admin_approved, welcome_modal_shown, gym_name, full_name, is_super_admin, email")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const roleNames = (roles || []).map((r) => (r as { role: string }).role);
    const isAdmin = roleNames.includes("admin");

    // Gym-owner welcome only — not members, trainers, or superadmin
    if (!isAdmin) {
      return { checked: true, showModal: false };
    }

    // If column doesn't exist yet, fall back without it
    if (profileError && profileError.message?.includes("welcome_modal_shown")) {
      console.log("welcome_modal_shown column doesn't exist yet, using fallback logic");

      const { data: fallbackProfile, error: fallbackError } = await service
        .from("profiles")
        .select("admin_approved, gym_name, full_name, is_super_admin, email")
        .eq("user_id", user.id)
        .maybeSingle();

      if (fallbackError || !fallbackProfile) {
        return { checked: true, showModal: false };
      }

      const typedFallback = fallbackProfile as {
        admin_approved?: boolean;
        gym_name?: string;
        full_name?: string;
        is_super_admin?: boolean;
        email?: string;
      };

      const email = (typedFallback.email || user.email || "").toLowerCase();
      const isSuperAdmin =
        typedFallback.is_super_admin === true || email === "superadmin@forge.test";

      if (isSuperAdmin) {
        return { checked: true, showModal: false };
      }

      const showModal = typedFallback.admin_approved === true;

      return {
        checked: true,
        showModal,
        gymName: typedFallback.gym_name || undefined,
        userName: typedFallback.full_name || undefined,
      };
    }

    if (profileError) {
      console.error("Error checking welcome modal status:", profileError);
      return { checked: false, showModal: false };
    }

    if (!profile) {
      return { checked: true, showModal: false };
    }

    const typedProfile = profile as {
      admin_approved?: boolean;
      welcome_modal_shown?: boolean;
      gym_name?: string;
      full_name?: string;
      is_super_admin?: boolean;
      email?: string;
    };

    const email = (typedProfile.email || user.email || "").toLowerCase();
    const isSuperAdmin =
      typedProfile.is_super_admin === true || email === "superadmin@forge.test";

    if (isSuperAdmin) {
      return { checked: true, showModal: false };
    }

    const showModal =
      typedProfile.admin_approved === true && typedProfile.welcome_modal_shown !== true;

    return {
      checked: true,
      showModal,
      gymName: typedProfile.gym_name || undefined,
      userName: typedProfile.full_name || undefined,
    };
  } catch (error) {
    console.error("Unexpected error checking welcome modal status:", error);
    return { checked: false, showModal: false };
  }
}
