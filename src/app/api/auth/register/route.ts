import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";

/** POST /api/auth/register */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = body?.email?.trim()?.toLowerCase();
  const password = body?.password;
  const fullName = body?.full_name?.trim() || body?.name?.trim();
  const fitnessData = body?.fitnessData || {};

  if (!email || !password || !fullName) {
    return NextResponse.json(
      { error: "Email, password, and name are required" },
      { status: 400 },
    );
  }

  const requestedRole =
    fitnessData.requested_role === "admin" || body?.role === "admin"
      ? "admin"
      : "user";

  const supabase = createSupabaseServerClient();

  // Block duplicate accounts (auth.users + profiles)
  const { data: exists } = await (supabase.rpc as any)("check_user_exists", {
    check_email: email,
  });
  if (exists === true) {
    return NextResponse.json(
      {
        error: "An account with this email already exists. Please sign in instead.",
        code: "email_exists",
      },
      { status: 409 },
    );
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    request.headers.get("origin") ||
    "http://localhost:3000";
  const emailRedirectTo = `${siteUrl}/verification?email=${encodeURIComponent(email)}`;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        ...fitnessData,
        requested_role: requestedRole,
      },
      emailRedirectTo,
    },
  });

  if (error) {
    const msg = error.message || "Registration failed";
    const lower = msg.toLowerCase();
    if (lower.includes("already") || lower.includes("registered") || lower.includes("exists")) {
      return NextResponse.json(
        {
          error: "An account with this email already exists. Please sign in instead.",
          code: "email_exists",
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Supabase returns a user with empty identities when email is already registered
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return NextResponse.json(
      {
        error: "An account with this email already exists. Please sign in instead.",
        code: "email_exists",
      },
      { status: 409 },
    );
  }

  const userId = data.user?.id ?? null;

  // Backup: sync profile/role/notifications via RPC (when session exists)
  // or service role (when confirm-email is on and session is null)
  let profileSynced = false;
  if (userId) {
    if (data.session?.access_token) {
      const authed = createSupabaseServerClient(data.session.access_token);
      const { error: syncErr } = await (authed.rpc as any)("sync_my_signup_profile");
      profileSynced = !syncErr;
      if (syncErr) {
        console.warn("sync_my_signup_profile failed:", syncErr.message);
      }
    }

    const service = createSupabaseServiceClient();
    if (service && (!profileSynced || requestedRole === "admin")) {
      try {
        const adminApproved = requestedRole !== "admin";
        await service.from("profiles").upsert(
          {
            id: userId,
            user_id: userId,
            email,
            full_name: fullName,
            phone: fitnessData.phone || null,
            address: fitnessData.address || null,
            emergency_contact: fitnessData.emergency_contact || null,
            admin_approved: adminApproved,
            is_super_admin: false,
            approval_requested_at: requestedRole === "admin" ? new Date().toISOString() : null,
            gym_name: fitnessData.gym_name || null,
            gym_type: fitnessData.gym_type || null,
            gym_city: fitnessData.gym_city || null,
            gym_years_operating: fitnessData.gym_years_operating || null,
            gym_facilities: fitnessData.gym_facilities || null,
            gym_operating_days: fitnessData.gym_operating_days ?? null,
            gym_peak_hours: fitnessData.gym_peak_hours || null,
            gym_member_capacity: fitnessData.gym_member_capacity || null,
            gym_services: fitnessData.gym_services || null,
            date_of_birth: fitnessData.date_of_birth || null,
            gender: fitnessData.gender || null,
            weight_kg: fitnessData.weight_kg ?? null,
            height_cm: fitnessData.height_cm ?? null,
            activity_level: fitnessData.activity_level || null,
            fitness_goal: fitnessData.fitness_goal || null,
            experience_level: fitnessData.experience_level || null,
            target_areas: fitnessData.target_areas || null,
            workout_days_per_week: fitnessData.workout_days_per_week ?? null,
            workout_duration: fitnessData.workout_duration || null,
            workout_type: fitnessData.workout_type || null,
            preferred_workout_time: fitnessData.preferred_workout_time || null,
            membership_status: "active",
            membership_type: "basic",
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: "user_id" },
        );

        await service.from("user_roles").upsert(
          {
            user_id: userId,
            role: requestedRole === "admin" ? "admin" : "user",
          } as any,
          { onConflict: "user_id,role" },
        );

        if (requestedRole === "admin") {
          const { data: superAdmins } = await (service.from("profiles") as any)
            .select("user_id")
            .eq("is_super_admin", true)
            .eq("admin_approved", true);

          const recipients = ((superAdmins || []) as Array<{ user_id: string }>)
            .map((p) => p.user_id)
            .filter((id) => id && id !== userId);

          if (recipients.length > 0) {
            await (service.from("admin_notifications" as any) as any).insert(
              recipients.map((recipient_user_id: string) => ({
                recipient_user_id,
                type: "admin_approval_request",
                from_user_id: userId,
                title: "New admin awaiting approval",
                message: `${fullName} (${email}) registered as admin/gym owner and needs approval.`,
              })),
            );
          }
        }
        profileSynced = true;
      } catch (e: any) {
        console.warn("service-role signup finalize failed:", e?.message || e);
      }
    }
  }

  // Always try to send / resend the confirmation email
  let verificationEmailSent = false;
  let verificationError: string | null = null;
  try {
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo },
    });
    if (resendError) {
      verificationError = resendError.message;
      console.warn("verification resend:", resendError.message);
    } else {
      verificationEmailSent = true;
    }
  } catch (e: any) {
    verificationError = e?.message || "Failed to send verification email";
  }

  // Prefer manual login after verification — do not keep a live session
  if (data.session) {
    await supabase.auth.signOut();
  }

  const requiresVerification = !data.user?.email_confirmed_at;

  return NextResponse.json({
    userId,
    user: data.user
      ? {
          id: data.user.id,
          email: data.user.email,
          email_confirmed_at: data.user.email_confirmed_at,
        }
      : null,
    requiresVerification,
    requiresAdminApproval: requestedRole === "admin",
    profileSynced,
    verificationEmailSent,
    verificationError,
    verificationHint: requiresVerification
      ? "Use a real email inbox. Enable Custom SMTP in Supabase (Auth → Emails) if mail never arrives. Check spam."
      : null,
  });
}
