import { NextResponse } from "next/server";
import {
  createSupabaseServiceClient,
  requireAuth,
} from "@/lib/supabase/server";
import { notify, notifyApprovalRequest } from "@/lib/notify-actions";
import { cacheInvalidate } from "@/lib/api-cache";
import { trialActivationPatch } from "@/lib/admin-trial";

/** 1-month dashboard access starts when the platform fee is accepted. */
function accessMonthPatch(now = new Date()) {
  const trial = trialActivationPatch(now);
  return {
    ...trial,
    account_status: "active",
    membership_status: "active",
    is_frozen: false,
    frozen_until: null,
    freeze_reason: null,
  };
}

export type PlatformFeeStatus =
  | "pending_acceptance"
  | "accepted"
  | "concession_requested"
  | "concession_rejected"
  | null;

async function loadAuth(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth;

  const { supabase, user } = auth;
  const service = createSupabaseServiceClient();
  const db = service || supabase;

  const [{ data: roleRows }, { data: profile }] = await Promise.all([
    db.from("user_roles").select("role").eq("user_id", user.id),
    db
      .from("profiles")
      .select(
        "admin_approved, is_super_admin, email, full_name, gym_owner_id, platform_monthly_fee, platform_fee_status, platform_fee_concession_amount, platform_fee_concession_note, platform_fee_responded_at",
      )
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const roles = (roleRows || []).map((r) => r.role);
  const isAdmin = roles.includes("admin");
  const isSuperAdmin =
    (profile as { is_super_admin?: boolean } | null)?.is_super_admin === true;
  const approved =
    (profile as { admin_approved?: boolean } | null)?.admin_approved === true;
  const gymOwnerId = (
    profile as { gym_owner_id?: string | null } | null
  )?.gym_owner_id;
  // Self-training platform members: approved user role, no gym tenant
  const isPlatformMember =
    !isAdmin &&
    !isSuperAdmin &&
    approved &&
    roles.includes("user") &&
    !gymOwnerId;

  return {
    supabase: db,
    user,
    profile,
    isAdmin,
    isSuperAdmin,
    isPlatformMember,
    canRespondToFee: (isAdmin && approved && !isSuperAdmin) || isPlatformMember,
  };
}

/** GET — own fee status (gym admin) or concession queue (super admin ?queue=1) */
export async function GET(request: Request) {
  const auth = await loadAuth(request);
  if ("error" in auth) return auth.error;

  const {
    supabase,
    user,
    profile,
    isAdmin,
    isSuperAdmin,
    canRespondToFee,
  } = auth;
  const url = new URL(request.url);
  const queue = url.searchParams.get("queue") === "1";

  if (queue) {
    if (!isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "user_id, full_name, email, phone, platform_monthly_fee, platform_fee_status, platform_fee_concession_amount, platform_fee_concession_note, platform_fee_responded_at, updated_at",
      )
      .eq("platform_fee_status", "concession_requested")
      .order("platform_fee_responded_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const ownerIds = (data || []).map((p) => p.user_id);
    const { data: gyms } =
      ownerIds.length > 0
        ? await supabase
            .from("gyms")
            .select("owner_user_id, name, city")
            .in("owner_user_id", ownerIds)
        : { data: [] as { owner_user_id: string; name: string | null; city: string | null }[] };

    const gymByOwner = new Map(
      (gyms || []).map((g) => [g.owner_user_id, g] as const),
    );

    return NextResponse.json({
      concessions: (data || []).map((p) => {
        const gym = gymByOwner.get(p.user_id);
        const offered = String(p.platform_monthly_fee || "")
          .trim()
          .replace(/^\$/, "");
        let asked = String(p.platform_fee_concession_amount || "")
          .trim()
          .replace(/^\$/, "");
        let note = String(p.platform_fee_concession_note || "").trim() || null;
        // Recover amount that was typed into the note field
        if ((!asked || asked === offered) && note && /^\d+(\.\d+)?$/.test(note)) {
          asked = note;
          note = null;
        }
        return {
          user_id: p.user_id,
          full_name: p.full_name,
          email: p.email,
          phone: p.phone,
          platform_monthly_fee: p.platform_monthly_fee || null,
          platform_fee_status: p.platform_fee_status,
          platform_fee_concession_amount: asked || null,
          platform_fee_concession_note: note,
          platform_fee_responded_at: p.platform_fee_responded_at || null,
          gym_name: gym?.name || null,
          gym_city: gym?.city || null,
        };
      }),
    });
  }

  if (!isAdmin && !isSuperAdmin && !canRespondToFee) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    userId: user.id,
    platformMonthlyFee:
      (profile as { platform_monthly_fee?: string | null } | null)
        ?.platform_monthly_fee || null,
    platformFeeStatus:
      ((profile as { platform_fee_status?: string | null } | null)
        ?.platform_fee_status as PlatformFeeStatus) || null,
    concessionAmount:
      (profile as { platform_fee_concession_amount?: string | null } | null)
        ?.platform_fee_concession_amount || null,
    concessionNote:
      (profile as { platform_fee_concession_note?: string | null } | null)
        ?.platform_fee_concession_note || null,
    respondedAt:
      (profile as { platform_fee_responded_at?: string | null } | null)
        ?.platform_fee_responded_at || null,
  });
}

/**
 * POST — gym owner: accept | request_concession
 *        super admin: resolve_concession (accept | reject)
 */
export async function POST(request: Request) {
  const auth = await loadAuth(request);
  if ("error" in auth) return auth.error;

  const { supabase, user, profile, isSuperAdmin, canRespondToFee } = auth;
  const body = await request.json().catch(() => null);
  const action = String(body?.action || "").trim();

  if (action === "accept" || action === "request_concession") {
    if (!canRespondToFee) {
      return NextResponse.json(
        { error: "Only approved owners or platform members can respond to a fee" },
        { status: 403 },
      );
    }

    const currentFee = String(
      (profile as { platform_monthly_fee?: string | null } | null)
        ?.platform_monthly_fee || "",
    ).trim();
    if (!currentFee) {
      return NextResponse.json(
        { error: "No platform fee has been set yet" },
        { status: 400 },
      );
    }

    const status = (
      profile as { platform_fee_status?: string | null } | null
    )?.platform_fee_status;
    if (status === "accepted") {
      return NextResponse.json(
        { error: "Fee already accepted" },
        { status: 400 },
      );
    }
    if (status === "concession_requested") {
      return NextResponse.json(
        { error: "Concession already pending with super admin" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();

    if (action === "accept") {
      const access = accessMonthPatch(new Date(now));
      const { data: accepted, error } = await supabase
        .from("profiles")
        .update({
          platform_fee_status: "accepted",
          platform_fee_concession_amount: null,
          platform_fee_concession_note: null,
          platform_fee_responded_at: now,
          ...access,
          updated_at: now,
        })
        .eq("user_id", user.id)
        .select("trial_starts_at, trial_ends_at")
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      void notify.platformFeeAccessGranted(
        user.id,
        `$${currentFee}`,
        access.trial_ends_at,
      );

      cacheInvalidate("settings:platform_facility_fee");
      cacheInvalidate("admin-platform-settings");
      cacheInvalidate("auth-me");

      return NextResponse.json({
        ok: true,
        platformFeeStatus: "accepted",
        platformMonthlyFee: currentFee,
        access: {
          startsAt: accepted?.trial_starts_at || access.trial_starts_at,
          endsAt: accepted?.trial_ends_at || access.trial_ends_at,
        },
      });
    }

    let concessionAmount = String(body?.concessionAmount ?? "")
      .trim()
      .replace(/^\$/, "");
    let concessionNote = String(body?.note ?? "").trim() || null;
    // Recover misplaced amount typed into the note field
    if (
      (!concessionAmount || concessionAmount === currentFee) &&
      concessionNote &&
      /^\d+(\.\d+)?$/.test(concessionNote)
    ) {
      concessionAmount = concessionNote;
      concessionNote = null;
    }
    if (!concessionAmount) {
      return NextResponse.json(
        { error: "concessionAmount is required" },
        { status: 400 },
      );
    }
    if (concessionAmount === currentFee) {
      return NextResponse.json(
        { error: "Requested amount must differ from the offered fee" },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        platform_fee_status: "concession_requested",
        platform_fee_concession_amount: concessionAmount,
        platform_fee_concession_note: concessionNote,
        platform_fee_responded_at: now,
        updated_at: now,
      })
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const { data: superAdmins } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("is_super_admin", true)
      .eq("admin_approved", true);

    const recipients = (superAdmins || [])
      .map((p: { user_id: string }) => p.user_id)
      .filter((id) => id && id !== user.id);

    const name =
      (profile as { full_name?: string | null } | null)?.full_name ||
      (profile as { email?: string | null } | null)?.email ||
      "A gym owner";

    await notifyApprovalRequest({
      recipientIds: recipients,
      type: "admin_approval_request",
      fromUserId: user.id,
      title: "Platform fee concession requested",
      message: `${name} wants $${concessionAmount}/mo instead of $${currentFee}/mo.${
        concessionNote ? ` Reason: ${concessionNote}` : ""
      }`,
    });

    cacheInvalidate("settings:platform_facility_fee");
    cacheInvalidate("admin-platform-settings");
    cacheInvalidate("admin:pending");

    return NextResponse.json({
      ok: true,
      platformFeeStatus: "concession_requested",
      concessionAmount,
      platformMonthlyFee: currentFee,
    });
  }

  if (action === "resolve_concession") {
    if (!isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = String(body?.userId || "").trim();
    const decision =
      body?.decision === "reject" ? "reject" : ("accept" as "accept" | "reject");
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const { data: target, error: targetErr } = await supabase
      .from("profiles")
      .select(
        "user_id, full_name, email, platform_monthly_fee, platform_fee_status, platform_fee_concession_amount, platform_fee_concession_note",
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (targetErr || !target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (target.platform_fee_status !== "concession_requested") {
      return NextResponse.json(
        { error: "No pending concession for this user" },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const offered = String(target.platform_monthly_fee || "")
      .trim()
      .replace(/^\$/, "");
    let requested = String(target.platform_fee_concession_amount || "")
      .trim()
      .replace(/^\$/, "");
    const noteAmt = String(
      (target as { platform_fee_concession_note?: string | null })
        .platform_fee_concession_note || "",
    ).trim();
    if (
      (!requested || requested === offered) &&
      noteAmt &&
      /^\d+(\.\d+)?$/.test(noteAmt)
    ) {
      requested = noteAmt;
    }

    if (decision === "accept") {
      const nextFee =
        String(body?.platformMonthlyFee ?? "").trim().replace(/^\$/, "") ||
        requested ||
        null;
      if (!nextFee) {
        return NextResponse.json(
          { error: "Concession amount is missing" },
          { status: 400 },
        );
      }

      const access = accessMonthPatch(new Date(now));
      const { data: accepted, error } = await supabase
        .from("profiles")
        .update({
          platform_monthly_fee: nextFee,
          platform_fee_status: "accepted",
          platform_fee_concession_amount: null,
          platform_fee_concession_note: null,
          platform_fee_responded_at: now,
          ...access,
          updated_at: now,
        })
        .eq("user_id", userId)
        .select("trial_starts_at, trial_ends_at")
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      void notify.platformFeeConcessionResolved(userId, true, `$${nextFee}`);
      void notify.platformFeeAccessGranted(
        userId,
        `$${nextFee}`,
        access.trial_ends_at,
      );
      cacheInvalidate("settings:platform_facility_fee");
      cacheInvalidate("admin-platform-settings");
      cacheInvalidate("admin:pending");
      cacheInvalidate("admin:membership-fees");
      cacheInvalidate("auth-me");

      return NextResponse.json({
        ok: true,
        decision: "accept",
        platformMonthlyFee: nextFee,
        platformFeeStatus: "accepted",
        access: {
          startsAt: accepted?.trial_starts_at || access.trial_starts_at,
          endsAt: accepted?.trial_ends_at || access.trial_ends_at,
        },
      });
    }

    const original = String(target.platform_monthly_fee || "").trim() || null;
    const { error } = await supabase
      .from("profiles")
      .update({
        platform_fee_status: "concession_rejected",
        platform_fee_responded_at: now,
        updated_at: now,
      })
      .eq("user_id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    void notify.platformFeeConcessionResolved(
      userId,
      false,
      original ? `$${original}` : null,
    );
    cacheInvalidate("settings:platform_facility_fee");
    cacheInvalidate("admin-platform-settings");
    cacheInvalidate("admin:pending");

    return NextResponse.json({
      ok: true,
      decision: "reject",
      platformMonthlyFee: original,
      platformFeeStatus: "concession_rejected",
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
