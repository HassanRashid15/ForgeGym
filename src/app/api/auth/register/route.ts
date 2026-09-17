import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { rateLimitedResponse, getRequestId } from "@/lib/api/errors";
import { trackEvent } from "@/lib/monitoring";
import { uploadGymMediaFile } from "@/lib/gym-media";
import { notify, notifyApprovalRequest } from "@/lib/notify-actions";
import { verificationRedirectUrl } from "@/lib/site-url";

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

async function parseRegisterBody(request: Request): Promise<{
  email: string;
  password: string;
  fullName: string;
  fitnessData: Record<string, any>;
  roleHint?: string;
  logo: File | null;
  mainImage: File | null;
  optionalImages: File[];
  videoFile: File | null;
}> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const email = String(form.get("email") || "")
      .trim()
      .toLowerCase();
    const password = String(form.get("password") || "");
    const fullName = String(form.get("full_name") || form.get("name") || "").trim();
    let fitnessData: Record<string, any> = {};
    const rawFitness = form.get("fitnessData");
    if (typeof rawFitness === "string" && rawFitness.trim()) {
      try {
        fitnessData = JSON.parse(rawFitness);
      } catch {
        fitnessData = {};
      }
    }

    const logo = form.get("gym_logo");
    const mainImage = form.get("gym_main_image");
    const videoFile = form.get("gym_video_file");
    const optionalImages = form
      .getAll("gym_optional_images")
      .filter((f): f is File => f instanceof File);

    return {
      email,
      password,
      fullName,
      fitnessData,
      roleHint: String(form.get("role") || ""),
      logo: logo instanceof File ? logo : null,
      mainImage: mainImage instanceof File ? mainImage : null,
      optionalImages,
      videoFile: videoFile instanceof File ? videoFile : null,
    };
  }

  const body = await request.json().catch(() => null);
  return {
    email: body?.email?.trim()?.toLowerCase() || "",
    password: body?.password || "",
    fullName: body?.full_name?.trim() || body?.name?.trim() || "",
    fitnessData: body?.fitnessData || {},
    roleHint: body?.role,
    logo: null,
    mainImage: null,
    optionalImages: [],
    videoFile: null,
  };
}

/** POST /api/auth/register */
export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const limited = await rateLimit(clientKey(request, "auth:register"), 5, 60_000);
  if (!limited.allowed) {
    trackEvent("auth.rate_limited", { route: "register", requestId });
    return rateLimitedResponse(limited);
  }

  const parsed = await parseRegisterBody(request);
  const { email, password, fullName } = parsed;
  const fitnessData = { ...(parsed.fitnessData || {}) };

  if (!email || !password || !fullName) {
    return NextResponse.json(
      { error: "Email, password, and name are required" },
      { status: 400 },
    );
  }

  const requestedRole =
    fitnessData.requested_role === "admin" || parsed.roleHint === "admin"
      ? "admin"
      : "user";

  const supabase = createSupabaseServerClient();
  const service = createSupabaseServiceClient();

  const customerGymOwnerId =
    requestedRole === "user" && fitnessData.gym_owner_id
      ? String(fitnessData.gym_owner_id)
      : null;

  let gymMeta: {
    gym_name: string | null;
    gym_city: string | null;
    gym_type: string | null;
  } | null = null;

  // Validate gym selection before creating the auth user
  if (requestedRole === "user") {
    if (!customerGymOwnerId) {
      return NextResponse.json(
        { error: "Please select a gym to join as a customer" },
        { status: 400 },
      );
    }
    if (!service) {
      return NextResponse.json(
        { error: "Server misconfigured — cannot validate gym" },
        { status: 500 },
      );
    }

    const { data: gymProfile } = await service
      .from("profiles")
      .select("user_id, gym_name, gym_city, gym_type, admin_approved, is_super_admin")
      .eq("user_id", customerGymOwnerId)
      .maybeSingle();

    const { data: gymRoles } = await service
      .from("user_roles")
      .select("role")
      .eq("user_id", customerGymOwnerId);

    const isGymAdmin = (gymRoles || []).some((r) => r.role === "admin");
    if (
      !gymProfile ||
      !isGymAdmin ||
      gymProfile.is_super_admin ||
      gymProfile.admin_approved !== true ||
      !(gymProfile.gym_name || "").trim()
    ) {
      return NextResponse.json(
        { error: "Please select a valid gym to join" },
        { status: 400 },
      );
    }
    gymMeta = {
      gym_name: gymProfile.gym_name,
      gym_city: gymProfile.gym_city,
      gym_type: gymProfile.gym_type,
    };

    const preferredTrainerId = fitnessData.preferred_trainer_id
      ? String(fitnessData.preferred_trainer_id).trim()
      : "";
    if (preferredTrainerId) {
      const { data: trainerProfile } = await service
        .from("profiles")
        .select("user_id, gym_owner_id")
        .eq("user_id", preferredTrainerId)
        .maybeSingle();
      const { data: trainerRoles } = await service
        .from("user_roles")
        .select("role")
        .eq("user_id", preferredTrainerId);
      const isTrainer = (trainerRoles || []).some((r) => r.role === "trainer");
      if (
        !trainerProfile ||
        !isTrainer ||
        trainerProfile.gym_owner_id !== customerGymOwnerId
      ) {
        return NextResponse.json(
          { error: "Selected trainer is not available at this gym" },
          { status: 400 },
        );
      }
    } else {
      fitnessData.preferred_trainer_id = null;
    }
  }

  // Block duplicate gym name+city / phone for gym owners
  if (requestedRole === "admin" && service) {
    const gymName = String(fitnessData.gym_name || "").trim();
    const gymCity = String(fitnessData.gym_city || "").trim();
    const phone = String(fitnessData.phone || "").trim();

    if (!gymName) {
      return NextResponse.json({ error: "Gym name is required" }, { status: 400 });
    }
    if (!parsed.mainImage && !fitnessData.gym_main_image_url) {
      return NextResponse.json(
        { error: "Gym main image is required" },
        { status: 400 },
      );
    }

    const { data: roles } = await service.from("user_roles").select("user_id").eq("role", "admin");
    const adminIds = Array.from(new Set((roles || []).map((r) => r.user_id).filter(Boolean)));
    if (adminIds.length > 0) {
      const { data: profiles } = await service
        .from("profiles")
        .select("user_id, gym_name, gym_city, phone, is_super_admin")
        .in("user_id", adminIds);

      const rows = (profiles || []).filter((p) => !(p as any).is_super_admin);
      const nameKey = normalizeKey(gymName);
      const cityKey = normalizeKey(gymCity);
      const nameHit = rows.find((p) => {
        const existingName = normalizeKey(p.gym_name || "");
        if (!existingName || existingName !== nameKey) return false;
        if (!cityKey) return true;
        const existingCity = normalizeKey(p.gym_city || "");
        return (
          !existingCity ||
          existingCity === cityKey ||
          existingCity.includes(cityKey.split(",")[0]) ||
          cityKey.includes(existingCity.split(",")[0])
        );
      });

      if (nameHit) {
        return NextResponse.json(
          {
            error: `A gym named "${gymName}" is already registered${
              nameHit.gym_city ? ` in ${nameHit.gym_city}` : ""
            }.`,
            code: "gym_duplicate",
          },
          { status: 409 },
        );
      }

      const phoneDigits = phone.replace(/\D/g, "");
      if (phoneDigits.length >= 7) {
        const phoneHit = rows.find((p) => {
          const existing = (p.phone || "").replace(/\D/g, "");
          return existing.length >= 7 && existing === phoneDigits;
        });
        if (phoneHit) {
          return NextResponse.json(
            {
              error: "This phone number is already used by another gym owner account.",
              code: "phone_duplicate",
            },
            { status: 409 },
          );
        }
      }
    }
  }

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

  const emailRedirectTo = verificationRedirectUrl(email, request);

  // Keep auth metadata light — large media URLs still go on profile upsert
  const {
    gym_optional_images_urls: _opt,
    gym_main_image_url: _main,
    gym_video_file_url: _vid,
    ...metaFitness
  } = fitnessData;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        ...metaFitness,
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

  // Upload gym media with service role (signup has no session yet)
  if (userId && service && requestedRole === "admin") {
    try {
      if (parsed.logo) {
        fitnessData.avatar_url = await uploadGymMediaFile(
          service,
          userId,
          parsed.logo,
          "logo",
        );
      }

      if (parsed.mainImage) {
        fitnessData.gym_main_image_url = await uploadGymMediaFile(
          service,
          userId,
          parsed.mainImage,
          "main-image",
        );
      }

      if (parsed.optionalImages.length > 0) {
        const urls: string[] = [];
        for (const file of parsed.optionalImages.slice(0, 5)) {
          urls.push(
            await uploadGymMediaFile(service, userId, file, "optional-image"),
          );
        }
        fitnessData.gym_optional_images_urls = urls;
      }

      if (parsed.videoFile) {
        fitnessData.gym_video_file_url = await uploadGymMediaFile(
          service,
          userId,
          parsed.videoFile,
          "video",
        );
      }
    } catch (uploadErr: any) {
      console.warn("gym media upload failed:", uploadErr?.message || uploadErr);
    }
  }

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

    if (service && (!profileSynced || requestedRole === "admin" || customerGymOwnerId)) {
      try {
        const needsApproval = requestedRole === "admin" || !!customerGymOwnerId;
        const adminApproved = !needsApproval;
        const gymOwnerId =
          requestedRole === "admin" ? userId : customerGymOwnerId;

        const { error: profileUpsertError } = await service.from("profiles").upsert(
          {
            id: userId,
            user_id: userId,
            email,
            full_name: fullName,
            phone: fitnessData.phone || null,
            address: fitnessData.address || null,
            emergency_contact: fitnessData.emergency_contact || null,
            avatar_url:
              requestedRole === "admin" ? fitnessData.avatar_url || null : null,
            admin_approved: adminApproved,
            is_super_admin: false,
            approval_requested_at: needsApproval ? new Date().toISOString() : null,
            gym_owner_id: gymOwnerId,
            gym_name:
              requestedRole === "admin"
                ? fitnessData.gym_name || null
                : gymMeta?.gym_name || null,
            gym_type:
              requestedRole === "admin"
                ? fitnessData.gym_type || null
                : gymMeta?.gym_type || null,
            gym_city:
              requestedRole === "admin"
                ? fitnessData.gym_city || null
                : gymMeta?.gym_city || null,
            gym_years_operating: fitnessData.gym_years_operating || null,
            gym_facilities: fitnessData.gym_facilities || null,
            gym_operating_days: fitnessData.gym_operating_days ?? null,
            gym_peak_hours: fitnessData.gym_peak_hours || null,
            gym_member_capacity: fitnessData.gym_member_capacity || null,
            gym_services: fitnessData.gym_services || null,
            gym_main_image_url: fitnessData.gym_main_image_url || null,
            gym_optional_images_urls: fitnessData.gym_optional_images_urls || null,
            gym_video_url: fitnessData.gym_video_url || null,
            gym_video_file_url: fitnessData.gym_video_file_url || null,
            gym_monthly_fee:
              requestedRole === "admin" ? fitnessData.gym_monthly_fee || null : null,
            gym_trainer_fee:
              requestedRole === "admin" ? fitnessData.gym_trainer_fee || null : null,
            preferred_trainer_id:
              requestedRole === "user" ? fitnessData.preferred_trainer_id || null : null,
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
            membership_status: adminApproved ? "active" : "pending",
            account_status: adminApproved ? "active" : "pending",
            membership_type: "basic",
            // Gym owners get a 1-month free trial after superadmin approval
            trial_offered: requestedRole === "admin",
            trial_starts_at: null,
            trial_ends_at: null,
            // Always false until they click the email verification link
            is_verified: false,
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: "user_id" },
        );

        if (profileUpsertError) {
          console.error("profile upsert failed:", profileUpsertError.message);
          if (customerGymOwnerId) {
            return NextResponse.json(
              {
                error:
                  profileUpsertError.message ||
                  "Account created but could not link you to the gym. Please contact support.",
                code: "gym_link_failed",
                userId,
              },
              { status: 500 },
            );
          }
        }

        const { error: roleUpsertError } = await service.from("user_roles").upsert(
          {
            user_id: userId,
            role: requestedRole === "admin" ? "admin" : "user",
          } as any,
          { onConflict: "user_id,role" },
        );
        if (roleUpsertError) {
          console.warn("role upsert failed:", roleUpsertError.message);
        }

        if (requestedRole === "admin") {
          const { data: superAdmins } = await (service.from("profiles") as any)
            .select("user_id")
            .eq("is_super_admin", true)
            .eq("admin_approved", true);

          const recipients = ((superAdmins || []) as Array<{ user_id: string }>)
            .map((p) => p.user_id)
            .filter((id) => id && id !== userId);

          await notifyApprovalRequest({
            recipientIds: recipients,
            type: "admin_approval_request",
            fromUserId: userId!,
            title: "New admin awaiting approval",
            message: `${fullName} (${email}) registered as admin/gym owner and needs approval.`,
          });

          void notify.registrationWelcome(userId!, "admin");
        }

        if (customerGymOwnerId) {
          // Notify the gym owner + any co-admins of that gym
          const { data: gymAdmins } = await service
            .from("profiles")
            .select("user_id")
            .eq("gym_owner_id", customerGymOwnerId)
            .eq("admin_approved", true);

          const { data: ownerRoles } = await service
            .from("user_roles")
            .select("user_id, role")
            .eq("role", "admin")
            .in(
              "user_id",
              [
                customerGymOwnerId,
                ...((gymAdmins || []).map((p) => p.user_id) as string[]),
              ].filter(Boolean),
            );

          const recipients = [
            ...new Set((ownerRoles || []).map((r) => r.user_id).filter(Boolean)),
          ].filter((id) => id !== userId);

          await notifyApprovalRequest({
            recipientIds: recipients,
            type: "member_approval_request",
            fromUserId: userId!,
            title: "New member awaiting approval",
            message: `${fullName} (${email}) wants to join ${gymMeta?.gym_name || "your gym"} and needs approval.`,
          });

          void notify.memberPending(userId!, gymMeta?.gym_name);
        } else if (requestedRole !== "admin" && userId) {
          void notify.registrationWelcome(userId, "user");
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

  // Force app-level unverified even if Supabase auto-confirmed the auth user
  if (service && userId) {
    await service
      .from("profiles")
      .update({ is_verified: false, updated_at: new Date().toISOString() } as never)
      .eq("user_id", userId);
  }

  // Auto-subscribe members & gym admins to newsletter (same as login)
  if (email) {
    const { subscribeEmail } = await import("@/lib/newsletter");
    void subscribeEmail(email).catch(() => null);
  }

  // Public signup always requires email verification before login
  const requiresVerification = true;
  const requiresGymApproval =
    requestedRole === "user" && !!fitnessData.gym_owner_id;

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
    requiresAdminApproval: requestedRole === "admin" || requiresGymApproval,
    requiresGymApproval,
    freeTrialOffered: requestedRole === "admin",
    freeTrialNote:
      requestedRole === "admin"
        ? "After email verification and super admin approval, you get 1 month free trial."
        : null,
    profileSynced,
    verificationEmailSent,
    verificationError,
    verificationHint: requiresVerification
      ? "Use a real email inbox. Enable Custom SMTP in Supabase (Auth → Emails) if mail never arrives. Check spam."
      : null,
  });
}
