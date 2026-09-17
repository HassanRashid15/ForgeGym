import { NextResponse } from "next/server";
import {
  createSupabaseServiceClient,
  requireAuth,
} from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";
import { listActiveSubscriberEmails } from "@/lib/newsletter";
import { sendPromotionEmails } from "@/lib/promotion-email";
import { cacheInvalidate } from "@/lib/api-cache";

async function requireSuperAdmin(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth;

  const { supabase, user } = auth;
  const service = createSupabaseServiceClient();
  const db = service || supabase;

  const { data: profile } = await db
    .from("profiles")
    .select("is_super_admin, email")
    .eq("user_id", user.id)
    .maybeSingle();

  const email = (profile?.email || user.email || "").toLowerCase();
  const isSuperAdmin =
    profile?.is_super_admin === true || email === "superadmin@forge.test";

  if (!isSuperAdmin) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { supabase: db, user };
}

/** GET /api/admin/promotions — list all promotions (superadmin)
 *  ?emailLogId=uuid — include email delivery log for one promo
 */
export async function GET(request: Request) {
  const auth = await requireSuperAdmin(request);
  if ("error" in auth) return auth.error;

  const emailLogId = new URL(request.url).searchParams.get("emailLogId");
  if (emailLogId) {
    const { data: logs, error: logErr } = await auth.supabase
      .from("promotion_email_log" as never)
      .select("id, recipient_email, status, provider, error_message, sent_at")
      .eq("promotion_id", emailLogId)
      .order("sent_at", { ascending: false })
      .limit(200);
    if (logErr) {
      return jsonError(
        logErr.message.includes("promotion_email_log")
          ? "Run migration 20260918_market_features.sql first"
          : logErr.message,
        400,
      );
    }
    return NextResponse.json({ logs: logs || [] });
  }

  const { data, error } = await auth.supabase
    .from("platform_promotions" as never)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return jsonError(
      error.message.includes("platform_promotions")
        ? "Run migration 20260917_promotions_and_newsletter_prefs.sql first"
        : error.message,
      400,
    );
  }

  return NextResponse.json({ promotions: data || [] });
}

/** POST /api/admin/promotions — create promotion; optional email blast */
export async function POST(request: Request) {
  const auth = await requireSuperAdmin(request);
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const title = String(body?.title || "").trim();
  const promotionBody = String(body?.body || "").trim();
  if (!title || !promotionBody) {
    return jsonError("Title and body are required", 400);
  }

  const sendEmail = body?.sendEmail === true;
  const isPublished = body?.isPublished !== false;
  const showOnHome = body?.showOnHome !== false;

  const insert = {
    title,
    body: promotionBody,
    cta_label: body?.ctaLabel ? String(body.ctaLabel).trim() : null,
    cta_href: body?.ctaHref ? String(body.ctaHref).trim() : null,
    image_url: body?.imageUrl ? String(body.imageUrl).trim() : null,
    is_published: isPublished,
    show_on_home: showOnHome,
    starts_at: body?.startsAt || null,
    ends_at: body?.endsAt || null,
    created_by: auth.user.id,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await auth.supabase
    .from("platform_promotions" as never)
    .insert(insert as never)
    .select("*")
    .maybeSingle();

  if (error) {
    return jsonError(error.message, 400);
  }

  let emailResult: { sent: number; skipped: number; mode: string } | null = null;
  if (sendEmail && data) {
    const recipients = await listActiveSubscriberEmails();
    emailResult = await sendPromotionEmails({
      title,
      body: promotionBody,
      ctaLabel: insert.cta_label,
      ctaHref: insert.cta_href,
      recipients,
      promotionId: (data as { id: string }).id,
    });
    await auth.supabase
      .from("platform_promotions" as never)
      .update({
        email_sent_at: new Date().toISOString(),
        email_recipient_count: emailResult.sent || recipients.length,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", (data as { id: string }).id);
  }

  cacheInvalidate("public:promotions");

  return NextResponse.json({
    promotion: data,
    email: emailResult,
  });
}

/** PATCH /api/admin/promotions — update / publish / resend */
export async function PATCH(request: Request) {
  const auth = await requireSuperAdmin(request);
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const id = String(body?.id || "").trim();
  if (!id) return jsonError("id required", 400);

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (typeof body?.title === "string") patch.title = body.title.trim();
  if (typeof body?.body === "string") patch.body = body.body.trim();
  if ("ctaLabel" in (body || {})) patch.cta_label = body.ctaLabel || null;
  if ("ctaHref" in (body || {})) patch.cta_href = body.ctaHref || null;
  if ("imageUrl" in (body || {})) patch.image_url = body.imageUrl || null;
  if (typeof body?.isPublished === "boolean") patch.is_published = body.isPublished;
  if (typeof body?.showOnHome === "boolean") patch.show_on_home = body.showOnHome;
  if ("startsAt" in (body || {})) patch.starts_at = body.startsAt || null;
  if ("endsAt" in (body || {})) patch.ends_at = body.endsAt || null;

  const { data, error } = await auth.supabase
    .from("platform_promotions" as never)
    .update(patch as never)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return jsonError(error.message, 400);

  let emailResult = null;
  if (body?.sendEmail === true && data) {
    const row = data as {
      title: string;
      body: string;
      cta_label: string | null;
      cta_href: string | null;
    };
    const recipients = await listActiveSubscriberEmails();
    emailResult = await sendPromotionEmails({
      title: row.title,
      body: row.body,
      ctaLabel: row.cta_label,
      ctaHref: row.cta_href,
      recipients,
      promotionId: id,
    });
    await auth.supabase
      .from("platform_promotions" as never)
      .update({
        email_sent_at: new Date().toISOString(),
        email_recipient_count: emailResult.sent || recipients.length,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", id);
  }

  cacheInvalidate("public:promotions");

  return NextResponse.json({ promotion: data, email: emailResult });
}

/** DELETE /api/admin/promotions?id= */
export async function DELETE(request: Request) {
  const auth = await requireSuperAdmin(request);
  if ("error" in auth) return auth.error;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return jsonError("id required", 400);

  const { error } = await auth.supabase
    .from("platform_promotions" as never)
    .delete()
    .eq("id", id);

  if (error) return jsonError(error.message, 400);
  cacheInvalidate("public:promotions");
  return NextResponse.json({ success: true });
}
