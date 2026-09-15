import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
  requireAuth,
} from "@/lib/supabase/server";
import { randomBytes } from "crypto";
import { notify } from "@/lib/notify-actions";
import { verificationRedirectUrl } from "@/lib/site-url";

type AppStaffRole = "user" | "moderator" | "admin" | "trainer" | "staff";

async function requireApprovedAdmin(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth;

  const { supabase, user } = auth;
  const service = createSupabaseServiceClient();
  const db = service || supabase;

  const { data: roleRows } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const isAdmin = (roleRows || []).some((r) => r.role === "admin");
  if (!isAdmin) {
    return {
      error: NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 }),
    };
  }

  const { data: profile } = await db
    .from("profiles")
    .select("admin_approved, is_super_admin, email, gym_name, gym_owner_id, gym_city")
    .eq("user_id", user.id)
    .maybeSingle();

  const email = (profile?.email || user.email || "").toLowerCase();
  const isSuperAdmin =
    (profile as { is_super_admin?: boolean } | null)?.is_super_admin === true ||
    email === "superadmin@forge.test";

  if (!isSuperAdmin && !profile?.admin_approved) {
    return {
      error: NextResponse.json(
        { error: "Forbidden — your admin account is not approved yet" },
        { status: 403 },
      ),
    };
  }

  if (!service) {
    return {
      error: NextResponse.json(
        { error: "Server misconfigured — missing service role key" },
        { status: 500 },
      ),
    };
  }

  const gymOwnerId =
    (profile as { gym_owner_id?: string | null } | null)?.gym_owner_id || user.id;
  const gymName = (profile as { gym_name?: string | null } | null)?.gym_name || null;
  const gymCity = (profile as { gym_city?: string | null } | null)?.gym_city || null;

  // Ensure primary gym owner is stamped on their own profile
  if (!isSuperAdmin && !(profile as { gym_owner_id?: string | null })?.gym_owner_id) {
    await service
      .from("profiles")
      .update({ gym_owner_id: user.id, updated_at: new Date().toISOString() } as never)
      .eq("user_id", user.id);
  }

  return {
    supabase: service,
    user,
    isSuperAdmin,
    gymOwnerId,
    gymName,
    gymCity,
  };
}

function mapRole(roles: Array<{ role: string }> | null | undefined): AppStaffRole {
  const list = (roles || []).map((r) => r.role);
  if (list.includes("admin")) return "admin";
  if (list.includes("trainer")) return "trainer";
  if (list.includes("staff")) return "staff";
  if (list.includes("moderator")) return "moderator";
  return "user";
}

function splitList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function buildProfilePayload(
  body: Record<string, unknown>,
  userId: string,
  email: string,
  gym: { gymOwnerId: string; gymName: string | null; gymCity: string | null },
) {
  const fullName = String(body.full_name || "").trim();
  const accountStatus = body.account_status
    ? String(body.account_status)
    : body.membership_status
      ? String(body.membership_status)
      : "active";
  const commission =
    body.commission_percentage !== undefined &&
    body.commission_percentage !== null &&
    body.commission_percentage !== ""
      ? Number(body.commission_percentage)
      : null;
  const loginEnabled = body.login_enabled === false ? false : true;
  const role = String(body.role || "staff");

  return {
    id: userId,
    user_id: userId,
    email,
    full_name: fullName,
    phone: body.phone ? String(body.phone).trim() : null,
    address: body.address ? String(body.address).trim() : null,
    emergency_contact: body.emergency_contact
      ? String(body.emergency_contact).trim()
      : null,
    gender: body.gender ? String(body.gender).trim() : null,
    date_of_birth: body.date_of_birth ? String(body.date_of_birth) : null,
    avatar_url: body.avatar_url ? String(body.avatar_url) : null,
    bio: body.trainer_bio ? String(body.trainer_bio).trim() : null,
    trainer_bio: body.trainer_bio ? String(body.trainer_bio).trim() : null,
    specialization: body.specialization ? String(body.specialization).trim() : null,
    certifications: splitList(body.certifications),
    certification_number: body.certification_number
      ? String(body.certification_number).trim()
      : null,
    years_experience: body.years_experience
      ? String(body.years_experience).trim()
      : null,
    education: body.education ? String(body.education).trim() : null,
    skills: splitList(body.skills),
    languages: splitList(body.languages),
    join_date: body.joining_date
      ? String(body.joining_date)
      : new Date().toISOString().split("T")[0],
    employment_type: body.employment_type
      ? String(body.employment_type).trim()
      : null,
    branch_department: body.branch_department
      ? String(body.branch_department).trim()
      : body.branch
        ? String(body.branch).trim()
        : null,
    department: body.department
      ? String(body.department).trim()
      : body.branch_department
        ? String(body.branch_department).trim()
        : null,
    salary: body.salary ? String(body.salary).trim() : null,
    commission_percentage: Number.isFinite(commission as number) ? commission : null,
    working_days: body.working_days ? String(body.working_days).trim() : null,
    working_hours: body.working_hours ? String(body.working_hours).trim() : null,
    max_client_capacity: body.max_client_capacity
      ? String(body.max_client_capacity).trim()
      : null,
    assigned_members: splitList(body.assigned_members),
    availability: body.availability ? String(body.availability).trim() : null,
    pt_sessions: body.pt_sessions ? String(body.pt_sessions).trim() : null,
    leave_info: body.leave_info ? String(body.leave_info).trim() : null,
    system_permissions: splitList(body.system_permissions),
    staff_type: body.staff_type ? String(body.staff_type).trim() : null,
    supervisor: body.supervisor ? String(body.supervisor).trim() : null,
    shift: body.shift ? String(body.shift).trim() : null,
    overtime_rate: body.overtime_rate ? String(body.overtime_rate).trim() : null,
    responsibilities: body.responsibilities
      ? String(body.responsibilities).trim()
      : null,
    login_enabled: loginEnabled,
    gym_owner_id: gym.gymOwnerId,
    gym_name: gym.gymName,
    gym_city: gym.gymCity,
    account_status: accountStatus,
    membership_status: accountStatus,
    membership_type:
      role === "trainer" || role === "staff" || role === "admin"
        ? "staff"
        : body.membership_type
          ? String(body.membership_type)
          : "basic",
    updated_at: new Date().toISOString(),
  };
}

async function uploadAvatarIfPresent(
  supabase: ReturnType<NonNullable<typeof createSupabaseServiceClient>>,
  userId: string,
  avatarBase64: unknown,
) {
  if (typeof avatarBase64 !== "string" || !avatarBase64.startsWith("data:")) return;
  try {
    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(avatarBase64);
    if (!match) return;
    const contentType = match[1];
    const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
    const buffer = Buffer.from(match[2], "base64");
    const path = `${userId}/avatar.${ext}`;
    await supabase.storage.from("avatars").upload(path, buffer, {
      contentType,
      upsert: true,
    });
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    if (pub?.publicUrl) {
      await supabase
        .from("profiles")
        .update({ avatar_url: pub.publicUrl, updated_at: new Date().toISOString() } as never)
        .eq("user_id", userId);
    }
  } catch (e) {
    console.warn("avatar upload failed", e);
  }
}

/** GET /api/admin/users — gym-scoped for gym owners */
export async function GET(request: Request) {
  const auth = await requireApprovedAdmin(request);
  if ("error" in auth) return auth.error;

  const { supabase, isSuperAdmin, gymOwnerId } = auth;
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();

  let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });

  if (!isSuperAdmin) {
    // Gym-scoped: everyone linked to this gym owner, plus the owner row itself
    query = query.or(`gym_owner_id.eq.${gymOwnerId},user_id.eq.${gymOwnerId}`);
  }

  const { data: profiles, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const userIds = (profiles || []).map((p) => p.user_id).filter(Boolean);
  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .in("user_id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);

  const rolesByUser = new Map<string, Array<{ role: string }>>();
  for (const row of roleRows || []) {
    const list = rolesByUser.get(row.user_id) || [];
    list.push({ role: row.role });
    rolesByUser.set(row.user_id, list);
  }

  let users = (profiles || []).map((p) => {
    const role = mapRole(rolesByUser.get(p.user_id));
    const row = p as Record<string, unknown>;
    return {
      user_id: p.user_id,
      full_name: p.full_name,
      email: p.email,
      phone: p.phone,
      address: p.address,
      avatar_url: (row.avatar_url as string | null) || null,
      membership_status: p.membership_status,
      membership_type: p.membership_type,
      account_status: row.account_status as string | null,
      join_date: p.join_date,
      created_at: p.created_at,
      role,
      is_super_admin: p.is_super_admin === true,
      admin_approved: p.admin_approved === true,
      specialization: row.specialization as string | null,
      employment_type: row.employment_type as string | null,
      branch_department: row.branch_department as string | null,
      staff_type: row.staff_type as string | null,
      department: row.department as string | null,
      login_enabled: row.login_enabled !== false,
      gym_name: row.gym_name as string | null,
      gym_owner_id: row.gym_owner_id as string | null,
      gender: row.gender as string | null,
      date_of_birth: row.date_of_birth as string | null,
      emergency_contact: row.emergency_contact as string | null,
      trainer_bio: (row.trainer_bio as string | null) || (row.bio as string | null) || null,
      certifications: (row.certifications as string[] | null) || null,
      certification_number: row.certification_number as string | null,
      years_experience: row.years_experience as string | null,
      education: row.education as string | null,
      skills: (row.skills as string[] | null) || null,
      languages: (row.languages as string[] | null) || null,
      salary: row.salary as string | null,
      commission_percentage:
        typeof row.commission_percentage === "number" ? row.commission_percentage : null,
      working_days: row.working_days as string | null,
      working_hours: row.working_hours as string | null,
      max_client_capacity: row.max_client_capacity as string | null,
      assigned_members: (row.assigned_members as string[] | null) || null,
      availability: row.availability as string | null,
      pt_sessions: row.pt_sessions as string | null,
      leave_info: row.leave_info as string | null,
      supervisor: row.supervisor as string | null,
      shift: row.shift as string | null,
      overtime_rate: row.overtime_rate as string | null,
      responsibilities: row.responsibilities as string | null,
      system_permissions: (row.system_permissions as string[] | null) || null,
    };
  });

  if (!isSuperAdmin) {
    users = users.filter(
      (u) =>
        !u.is_super_admin &&
        (u.role === "user" ||
          u.role === "trainer" ||
          u.role === "staff" ||
          u.role === "admin"),
    );
  } else {
    // Platform super admin: admins + super admins only
    users = users.filter((u) => u.is_super_admin || u.role === "admin");
  }

  if (q) {
    users = users.filter((u) =>
      [
        u.full_name,
        u.email,
        u.phone,
        u.membership_type,
        u.role,
        u.specialization,
        u.staff_type,
        u.department,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }

  return NextResponse.json({ users, isSuperAdmin, gymOwnerId });
}

/** POST /api/admin/users — create admin/trainer/staff for this gym only */
export async function POST(request: Request) {
  const auth = await requireApprovedAdmin(request);
  if ("error" in auth) return auth.error;

  const { supabase, isSuperAdmin, user, gymOwnerId, gymName, gymCity } = auth;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  const fullName = String(body.full_name || "").trim();
  const loginEnabled = body.login_enabled === false ? false : true;

  let role: AppStaffRole | "super_admin" = "staff";
  const requested = String(body.role || "staff").toLowerCase();
  if (
    requested === "admin" ||
    requested === "trainer" ||
    requested === "staff" ||
    requested === "user" ||
    requested === "moderator" ||
    requested === "super_admin"
  ) {
    role = requested as AppStaffRole | "super_admin";
  }

  // Platform super admin: only super_admin + admin
  if (isSuperAdmin && !["super_admin", "admin"].includes(role)) {
    return NextResponse.json(
      { error: "Super admins can only add Super Admin or Admin" },
      { status: 403 },
    );
  }

  // Gym admins: only admin / trainer / staff for their gym (not platform moderator)
  if (!isSuperAdmin && !["admin", "trainer", "staff"].includes(role)) {
    return NextResponse.json(
      { error: "You can only add Admin, Trainer, or Staff for your gym" },
      { status: 403 },
    );
  }

  if (role === "super_admin" && !isSuperAdmin) {
    return NextResponse.json(
      { error: "Only a super admin can create another super admin" },
      { status: 403 },
    );
  }

  if (!email || !fullName) {
    return NextResponse.json(
      { error: "full_name and email are required" },
      { status: 400 },
    );
  }

  let password = String(body.password || "");
  if (role === "staff" && !loginEnabled) {
    password = password || `NoLogin_${randomBytes(12).toString("hex")}`;
  } else if (!password || password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 },
    );
  }

  const emailRedirectTo = verificationRedirectUrl(email, request);

  let userId: string | null = null;
  let requiresVerification = false;
  const creatingSuperAdmin = role === "super_admin";
  const creatingPlatformAdmin = isSuperAdmin && role === "admin";
  const dbRole: AppStaffRole = creatingSuperAdmin ? "admin" : (role as AppStaffRole);

  if (role === "admin" && !isSuperAdmin) {
    const anon = createSupabaseServerClient();
    const { data: exists } = await (anon.rpc as any)("check_user_exists", {
      check_email: email,
    });
    if (exists === true) {
      return NextResponse.json(
        { error: "An account with this email already exists.", code: "email_exists" },
        { status: 409 },
      );
    }

    const { data, error } = await anon.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          requested_role: "admin",
          created_by_admin: true,
          gym_owner_id: gymOwnerId,
        },
        emailRedirectTo,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return NextResponse.json(
        { error: "An account with this email already exists.", code: "email_exists" },
        { status: 409 },
      );
    }

    userId = data.user?.id ?? null;
    requiresVerification = !data.user?.email_confirmed_at;

    await anon.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo },
    });

    if (data.session) {
      await anon.auth.signOut();
    }
  } else {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        requested_role: creatingSuperAdmin ? "super_admin" : dbRole,
        created_by_admin: true,
        gym_owner_id: creatingPlatformAdmin || creatingSuperAdmin ? null : gymOwnerId,
      },
      ban_duration: role === "staff" && !loginEnabled ? "876000h" : undefined,
    });

    if (createErr || !created.user) {
      return NextResponse.json(
        { error: createErr?.message || "Failed to create user" },
        { status: 400 },
      );
    }
    userId = created.user.id;
  }

  if (!userId) {
    return NextResponse.json({ error: "Failed to create user" }, { status: 400 });
  }

  const targetGymOwnerId = creatingSuperAdmin
    ? null
    : creatingPlatformAdmin
      ? userId
      : gymOwnerId;

  const profilePayload = {
    ...buildProfilePayload(
      { ...body, role: dbRole, login_enabled: loginEnabled },
      userId,
      email,
      {
        gymOwnerId: targetGymOwnerId || userId,
        gymName: creatingSuperAdmin || creatingPlatformAdmin ? null : gymName,
        gymCity: creatingSuperAdmin || creatingPlatformAdmin ? null : gymCity,
      },
    ),
    gym_owner_id: targetGymOwnerId,
    gym_name: creatingSuperAdmin || creatingPlatformAdmin ? null : gymName,
    gym_city: creatingSuperAdmin || creatingPlatformAdmin ? null : gymCity,
    admin_approved: true,
    is_super_admin: creatingSuperAdmin,
    is_verified: creatingSuperAdmin || creatingPlatformAdmin || role !== "admin",
    approval_requested_at: null,
  };

  const { error: profileErr } = await supabase.from("profiles").upsert(
    profilePayload as never,
    { onConflict: "user_id" },
  );

  if (profileErr) {
    if (!(role === "admin" && !isSuperAdmin)) {
      await supabase.auth.admin.deleteUser(userId);
    }
    return NextResponse.json({ error: profileErr.message }, { status: 400 });
  }

  await supabase.from("user_roles").delete().eq("user_id", userId);
  const { error: roleErr } = await supabase
    .from("user_roles")
    .insert({ user_id: userId, role: dbRole } as never);

  if (roleErr) {
    console.warn("role insert failed:", roleErr.message);
  }

  await uploadAvatarIfPresent(supabase, userId, body.avatar_base64);

  void notify.accountCreated(
    userId,
    creatingSuperAdmin ? "super_admin" : dbRole,
    creatingSuperAdmin || creatingPlatformAdmin ? null : gymName,
  );

  return NextResponse.json(
    {
      user: {
        user_id: userId,
        full_name: fullName,
        email,
        role: creatingSuperAdmin ? "super_admin" : dbRole,
        is_super_admin: creatingSuperAdmin,
        gym_owner_id: targetGymOwnerId,
        gym_name: creatingSuperAdmin || creatingPlatformAdmin ? null : gymName,
        requiresVerification,
        login_enabled: loginEnabled,
      },
      requiresVerification,
      message: creatingSuperAdmin
        ? "Super admin created."
        : creatingPlatformAdmin
          ? "Gym owner admin created and approved."
          : role === "admin"
            ? "Gym admin created for your gym. Verification email sent."
            : role === "trainer"
              ? "Trainer added to your gym."
              : loginEnabled
                ? "Staff member created."
                : "Staff member created (login disabled).",
    },
    { status: 201 },
  );
}

/** PATCH /api/admin/users */
export async function PATCH(request: Request) {
  const auth = await requireApprovedAdmin(request);
  if ("error" in auth) return auth.error;

  const { supabase, user, isSuperAdmin, gymOwnerId, gymName } = auth;
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object" || !body.userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const targetId = String(body.userId);
  if (targetId === user.id && body.role && body.role !== "admin") {
    return NextResponse.json(
      { error: "You cannot demote your own admin role" },
      { status: 400 },
    );
  }

  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("is_super_admin, gym_owner_id")
    .eq("user_id", targetId)
    .maybeSingle();

  if (!targetProfile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (targetProfile.is_super_admin && targetId !== user.id) {
    return NextResponse.json(
      { error: "Cannot modify another super admin" },
      { status: 403 },
    );
  }

  const targetGymOwnerId =
    (targetProfile as { gym_owner_id?: string | null }).gym_owner_id || null;

  if (!isSuperAdmin && targetId !== user.id) {
    const inThisGym = targetGymOwnerId === gymOwnerId;
    // Do not allow claiming unscoped members from other signups
    if (!inThisGym) {
      return NextResponse.json(
        { error: "You can only edit users from your gym" },
        { status: 403 },
      );
    }
  }

  const { data: targetRoles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", targetId);
  const targetRole = mapRole(targetRoles);

  if (body.action === "approve" || body.action === "reject") {
    if (targetRole !== "user") {
      return NextResponse.json(
        { error: "Only customer memberships can be approved this way" },
        { status: 400 },
      );
    }

    const approving = body.action === "approve";
    const { data: updated, error } = await supabase
      .from("profiles")
      .update({
        admin_approved: approving,
        admin_rejected_at: approving ? null : new Date().toISOString(),
        approval_requested_at: null,
        membership_status: approving ? "active" : "rejected",
        account_status: approving ? "active" : "rejected",
        updated_at: new Date().toISOString(),
      } as never)
      .eq("user_id", targetId)
      .select("*")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!updated) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    await supabase
      .from("admin_notifications" as any)
      .update({ read_at: new Date().toISOString() } as any)
      .eq("from_user_id", targetId)
      .eq("type", "member_approval_request")
      .is("read_at", null);

    if (approving) {
      void notify.memberApproved(targetId, gymName);
    } else {
      void notify.memberRejected(targetId, gymName);
    }

    return NextResponse.json({
      user: {
        ...updated,
        role: targetRole,
        is_super_admin: updated?.is_super_admin === true,
        admin_approved: updated?.admin_approved === true,
      },
      action: body.action,
    });
  }

  const profileUpdate: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  const assign = (key: string, value: unknown) => {
    if (value !== undefined) profileUpdate[key] = value;
  };

  if (body.full_name !== undefined) assign("full_name", String(body.full_name).trim());
  if (body.phone !== undefined) assign("phone", body.phone ? String(body.phone).trim() : null);
  if (body.address !== undefined)
    assign("address", body.address ? String(body.address).trim() : null);
  if (body.membership_status !== undefined)
    assign("membership_status", String(body.membership_status));
  if (body.membership_type !== undefined)
    assign("membership_type", String(body.membership_type));
  if (body.account_status !== undefined) {
    assign("account_status", String(body.account_status));
    assign("membership_status", String(body.account_status));
  }
  if (body.staff_type !== undefined)
    assign("staff_type", body.staff_type ? String(body.staff_type).trim() : null);
  if (body.login_enabled !== undefined) assign("login_enabled", !!body.login_enabled);
  if (body.specialization !== undefined)
    assign("specialization", body.specialization ? String(body.specialization).trim() : null);
  if (body.gender !== undefined)
    assign("gender", body.gender ? String(body.gender).trim() : null);
  if (body.date_of_birth !== undefined)
    assign("date_of_birth", body.date_of_birth ? String(body.date_of_birth) : null);
  if (body.emergency_contact !== undefined)
    assign(
      "emergency_contact",
      body.emergency_contact ? String(body.emergency_contact).trim() : null,
    );
  if (body.trainer_bio !== undefined) {
    const bio = body.trainer_bio ? String(body.trainer_bio).trim() : null;
    assign("trainer_bio", bio);
    assign("bio", bio);
  }
  if (body.certification_number !== undefined)
    assign(
      "certification_number",
      body.certification_number ? String(body.certification_number).trim() : null,
    );
  if (body.years_experience !== undefined)
    assign(
      "years_experience",
      body.years_experience ? String(body.years_experience).trim() : null,
    );
  if (body.education !== undefined)
    assign("education", body.education ? String(body.education).trim() : null);
  if (body.employment_type !== undefined)
    assign(
      "employment_type",
      body.employment_type ? String(body.employment_type).trim() : null,
    );
  if (body.branch_department !== undefined)
    assign(
      "branch_department",
      body.branch_department ? String(body.branch_department).trim() : null,
    );
  if (body.department !== undefined)
    assign("department", body.department ? String(body.department).trim() : null);
  if (body.salary !== undefined)
    assign("salary", body.salary ? String(body.salary).trim() : null);
  if (body.commission_percentage !== undefined) {
    const n =
      body.commission_percentage === null || body.commission_percentage === ""
        ? null
        : Number(body.commission_percentage);
    assign("commission_percentage", Number.isFinite(n as number) ? n : null);
  }
  if (body.working_days !== undefined)
    assign("working_days", body.working_days ? String(body.working_days).trim() : null);
  if (body.working_hours !== undefined)
    assign("working_hours", body.working_hours ? String(body.working_hours).trim() : null);
  if (body.max_client_capacity !== undefined)
    assign(
      "max_client_capacity",
      body.max_client_capacity ? String(body.max_client_capacity).trim() : null,
    );
  if (body.availability !== undefined)
    assign("availability", body.availability ? String(body.availability).trim() : null);
  if (body.pt_sessions !== undefined)
    assign("pt_sessions", body.pt_sessions ? String(body.pt_sessions).trim() : null);
  if (body.leave_info !== undefined)
    assign("leave_info", body.leave_info ? String(body.leave_info).trim() : null);
  if (body.supervisor !== undefined)
    assign("supervisor", body.supervisor ? String(body.supervisor).trim() : null);
  if (body.shift !== undefined)
    assign("shift", body.shift ? String(body.shift).trim() : null);
  if (body.overtime_rate !== undefined)
    assign("overtime_rate", body.overtime_rate ? String(body.overtime_rate).trim() : null);
  if (body.responsibilities !== undefined)
    assign(
      "responsibilities",
      body.responsibilities ? String(body.responsibilities).trim() : null,
    );
  if (body.joining_date !== undefined)
    assign("join_date", body.joining_date ? String(body.joining_date) : null);
  if (body.certifications !== undefined) assign("certifications", splitList(body.certifications));
  if (body.skills !== undefined) assign("skills", splitList(body.skills));
  if (body.languages !== undefined) assign("languages", splitList(body.languages));
  if (body.assigned_members !== undefined)
    assign("assigned_members", splitList(body.assigned_members));
  if (body.system_permissions !== undefined)
    assign("system_permissions", splitList(body.system_permissions));

  if (body.avatar_base64) {
    await uploadAvatarIfPresent(supabase, targetId, body.avatar_base64);
  }

  const { data: updated, error } = await supabase
    .from("profiles")
    .update(profileUpdate as never)
    .eq("user_id", targetId)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  let role = targetRole;
  let roleChanged = false;
  if (body.role !== undefined) {
    const nextRole = String(body.role) as AppStaffRole;
    const allowedRoles = isSuperAdmin
      ? (["admin", "trainer", "staff", "user", "moderator"] as const)
      : (["admin", "trainer", "staff", "user"] as const);

    if (!(allowedRoles as readonly string[]).includes(nextRole)) {
      return NextResponse.json({ error: "Invalid role for your gym" }, { status: 403 });
    }

    if (nextRole !== targetRole) {
      await supabase.from("user_roles").delete().eq("user_id", targetId);
      await supabase.from("user_roles").insert({ user_id: targetId, role: nextRole } as never);
      role = nextRole;
      roleChanged = true;
    }
  }

  if (body.login_enabled === false) {
    await supabase.auth.admin.updateUserById(targetId, { ban_duration: "876000h" });
  } else if (body.login_enabled === true) {
    await supabase.auth.admin.updateUserById(targetId, { ban_duration: "none" });
  }

  if (targetId !== user.id) {
    if (roleChanged) void notify.roleChanged(targetId, role);
    if (body.login_enabled === true || body.login_enabled === false) {
      void notify.loginAccessChanged(targetId, body.login_enabled === true);
    }
    if (body.account_status !== undefined) {
      void notify.accountStatusChanged(targetId, String(body.account_status));
    } else if (
      body.full_name !== undefined ||
      body.phone !== undefined ||
      body.address !== undefined ||
      body.membership_status !== undefined ||
      body.membership_type !== undefined ||
      body.staff_type !== undefined ||
      body.specialization !== undefined
    ) {
      void notify.profileUpdatedByAdmin(targetId);
    }
  }

  return NextResponse.json({
    user: {
      ...updated,
      role,
      is_super_admin: updated?.is_super_admin === true,
      admin_approved: updated?.admin_approved === true,
    },
  });
}

/** DELETE /api/admin/users */
export async function DELETE(request: Request) {
  const auth = await requireApprovedAdmin(request);
  if ("error" in auth) return auth.error;

  const { supabase, user, isSuperAdmin, gymOwnerId } = auth;
  const url = new URL(request.url);
  const body = await request.json().catch(() => ({}));
  const targetId = String(body.userId || url.searchParams.get("userId") || "");

  if (!targetId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  if (targetId === user.id) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  }

  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("is_super_admin, gym_owner_id, full_name, email")
    .eq("user_id", targetId)
    .maybeSingle();

  if (targetProfile?.is_super_admin) {
    return NextResponse.json({ error: "Cannot delete a super admin" }, { status: 403 });
  }

  if (
    !isSuperAdmin &&
    (targetProfile as { gym_owner_id?: string | null } | null)?.gym_owner_id !== gymOwnerId
  ) {
    return NextResponse.json(
      { error: "You can only delete users from your gym" },
      { status: 403 },
    );
  }

  const targetLabel =
    (targetProfile as { full_name?: string | null } | null)?.full_name ||
    (targetProfile as { email?: string | null } | null)?.email ||
    "User";

  await supabase.from("user_roles").delete().eq("user_id", targetId);
  await supabase.from("profiles").delete().eq("user_id", targetId);

  const { error: deleteErr } = await supabase.auth.admin.deleteUser(targetId);
  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 400 });
  }

  void notify.userDeleted(user.id, targetLabel);

  return NextResponse.json({ ok: true, userId: targetId });
}
