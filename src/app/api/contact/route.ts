import { NextResponse } from "next/server";
import {
  createSupabaseServiceClient,
  requireAuth,
} from "@/lib/supabase/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { jsonError, rateLimitedResponse, getRequestId } from "@/lib/api/errors";
import { getDefaultSiteContact } from "@/lib/site-contact";
import { trackEvent } from "@/lib/monitoring";

function parseSettingLines(value: string | null | undefined, fallback: string[]) {
  if (!value?.trim()) return fallback;
  return value
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** GET /api/contact — public contact details (env + optional platform_settings) */
export async function GET() {
  const defaults = getDefaultSiteContact();
  const service = createSupabaseServiceClient();

  if (!service) {
    return NextResponse.json({ contact: defaults });
  }

  try {
    const { data } = await service
      .from("platform_settings")
      .select("key, value")
      .in("key", [
        "contact_address",
        "contact_phones",
        "contact_emails",
        "contact_hours",
        "contact_map_embed",
      ]);

    const map = new Map(
      ((data as { key: string; value: string }[]) || []).map((r) => [
        r.key,
        r.value,
      ]),
    );

    const emails = parseSettingLines(map.get("contact_emails"), defaults.emails);
    const phones = parseSettingLines(map.get("contact_phones"), defaults.phones);

    return NextResponse.json({
      contact: {
        addressLines: parseSettingLines(
          map.get("contact_address"),
          defaults.addressLines,
        ),
        phones,
        emails,
        hours: parseSettingLines(map.get("contact_hours"), defaults.hours),
        mapEmbedUrl:
          map.get("contact_map_embed")?.trim() || defaults.mapEmbedUrl,
        supportEmail: emails[0] || defaults.supportEmail,
        primaryPhone: phones[0] || defaults.primaryPhone,
      },
    });
  } catch {
    return NextResponse.json({ contact: defaults });
  }
}

/** POST /api/contact — submit contact form */
export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const limited = await rateLimit(
    clientKey(request, "contact:submit"),
    5,
    60_000,
  );
  if (!limited.allowed) {
    trackEvent("contact.rate_limited", { requestId });
    return rateLimitedResponse(limited);
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return jsonError("Invalid body", 400);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!name || name.length < 2) {
    return jsonError("Name is required", 400);
  }
  if (!email || !email.includes("@")) {
    return jsonError("Valid email is required", 400);
  }
  if (!subject || subject.length < 2) {
    return jsonError("Subject is required", 400);
  }
  if (!message || message.length < 10) {
    return jsonError("Message must be at least 10 characters", 400);
  }
  if (message.length > 2000) {
    return jsonError("Message is too long", 400);
  }

  const service = createSupabaseServiceClient();
  if (!service) {
    return jsonError("Server misconfigured", 500);
  }

  let userId: string | null = null;
  const auth = await requireAuth(request);
  if (!("error" in auth)) {
    userId = auth.user.id;
  }

  const { data, error } = await service
    .from("contact_messages" as never)
    .insert({
      name: name.slice(0, 120),
      email: email.slice(0, 200),
      phone: phone ? phone.slice(0, 40) : null,
      subject: subject.slice(0, 200),
      message: message.slice(0, 2000),
      user_id: userId,
      status: "new",
    } as never)
    .select("id")
    .single();

  if (error) {
    return jsonError(error.message, 400);
  }

  trackEvent("contact.submitted", { requestId });

  return NextResponse.json({
    success: true,
    id: (data as { id: string } | null)?.id,
    message: "Message received. We'll get back to you within 24 hours.",
  });
}
