import { NextResponse } from "next/server";
import {
  createSupabaseServiceClient,
  requireAuth,
} from "@/lib/supabase/server";
import {
  cacheAside,
  apiCacheKey,
  CacheTTL,
  withCacheHeaders,
  cacheInvalidate,
} from "@/lib/api-cache";

const FEE_KEY = "platform_facility_fee";

async function requireApprovedAdminReader(request: Request) {
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
    .select("admin_approved, is_super_admin, email")
    .eq("user_id", user.id)
    .maybeSingle();

  const isSuperAdmin =
    (profile as { is_super_admin?: boolean } | null)?.is_super_admin === true;

  if (!isSuperAdmin && profile?.admin_approved !== true) {
    return {
      error: NextResponse.json(
        { error: "Forbidden — your admin account is not approved yet" },
        { status: 403 },
      ),
    };
  }

  return { supabase: db, user, isSuperAdmin };
}

async function requireSuperAdmin(request: Request) {
  const auth = await requireApprovedAdminReader(request);
  if ("error" in auth) return auth;
  if (!auth.isSuperAdmin) {
    return {
      error: NextResponse.json(
        { error: "Forbidden — super admin only" },
        { status: 403 },
      ),
    };
  }
  return auth;
}

/** GET /api/admin/platform-settings — facility fee (readable by approved gym admins) */
export async function GET(request: Request) {
  const auth = await requireApprovedAdminReader(request);
  if ("error" in auth) return auth.error;

  const { supabase, user } = auth;
  const cacheKey = apiCacheKey("admin-platform-settings", user.id);

  // Short TTL so fee / concession status stays near real-time
  const feeTtlMs = 2_000;
  const { data, hit } = await cacheAside(
    cacheKey,
    feeTtlMs,
    async () => {
      const [{ data: globalRow, error }, { data: profile }] = await Promise.all([
        supabase
          .from("platform_settings")
          .select("key, value, updated_at")
          .eq("key", FEE_KEY)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select(
            "platform_monthly_fee, platform_fee_status, platform_fee_concession_amount, platform_fee_concession_note, platform_fee_responded_at",
          )
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (error) {
        return {
          platformFacilityFee: "",
          personalMonthlyFee: null as string | null,
          platformFeeStatus: null as string | null,
          concessionAmount: null as string | null,
          concessionNote: null as string | null,
          updatedAt: null as string | null,
          stored: false,
          warning: error.message,
        };
      }

      const globalFee = (globalRow?.value || "").trim();
      const personalFee = (
        (profile as { platform_monthly_fee?: string | null } | null)
          ?.platform_monthly_fee || ""
      ).trim();
      // Gym admins: personal fee first, else global default. Super admin: same for display.
      const effective = personalFee || globalFee;
      const p = profile as {
        platform_fee_status?: string | null;
        platform_fee_concession_amount?: string | null;
        platform_fee_concession_note?: string | null;
      } | null;

      return {
        platformFacilityFee: effective,
        globalFacilityFee: globalFee,
        personalMonthlyFee: personalFee || null,
        platformFeeStatus: p?.platform_fee_status || null,
        concessionAmount: p?.platform_fee_concession_amount || null,
        concessionNote: p?.platform_fee_concession_note || null,
        updatedAt: globalRow?.updated_at || null,
        stored: Boolean(effective),
      };
    }
  );

  return NextResponse.json(
    data,
    withCacheHeaders(undefined, Math.floor(feeTtlMs / 1000), hit),
  );
}

/** PATCH /api/admin/platform-settings — save facility fee to DB (super admin only) */
export async function PATCH(request: Request) {
  const auth = await requireSuperAdmin(request);
  if ("error" in auth) return auth.error;

  const { supabase, user } = auth;
  const body = (await request.json().catch(() => null)) as {
    platformFacilityFee?: string;
  } | null;

  const fee = String(body?.platformFacilityFee || "").trim();
  if (!fee) {
    return NextResponse.json(
      { error: "Platform facility fee is required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("platform_settings")
    .upsert(
      {
        key: FEE_KEY,
        value: fee,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      } as never,
      { onConflict: "key" },
    )
    .select("key, value, updated_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        error:
          error.message.includes("platform_settings") || error.code === "42P01"
            ? "Run migration 20260915_platform_settings.sql first"
            : error.message,
      },
      { status: 400 },
    );
  }

  await cacheInvalidate({ prefixes: ["api-cache:admin-platform-settings:"] });

  return NextResponse.json({
    platformFacilityFee: data?.value || fee,
    updatedAt: data?.updated_at || null,
    stored: true,
  });
}
