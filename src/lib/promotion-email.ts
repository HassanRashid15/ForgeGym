import { buildUnsubscribeUrl } from "@/lib/newsletter-token";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Send promotion emails via Brevo transactional SMTP API.
 * Requires BREVO_API_KEY (+ NEWSLETTER_FROM_EMAIL). Queues only if key missing.
 */
export async function sendPromotionEmails(opts: {
  title: string;
  body: string;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  recipients: string[];
  promotionId?: string | null;
}): Promise<{ sent: number; skipped: number; mode: "brevo" | "queued" }> {
  const recipients = [...new Set(opts.recipients.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (recipients.length === 0) {
    return { sent: 0, skipped: 0, mode: "queued" };
  }

  const apiKey =
    process.env.BREVO_API_KEY?.trim() ||
    process.env.SENDINBLUE_API_KEY?.trim() ||
    "";

  const fromRaw =
    process.env.NEWSLETTER_FROM_EMAIL?.trim() ||
    process.env.BREVO_FROM_EMAIL?.trim() ||
    "";

  const service = createSupabaseServiceClient();

  async function logRow(
    email: string,
    status: "sent" | "failed" | "queued" | "skipped",
    errorMessage?: string,
  ) {
    if (!service || !opts.promotionId) return;
    try {
      await service.from("promotion_email_log" as never).insert({
        promotion_id: opts.promotionId,
        recipient_email: email,
        status,
        provider: "brevo",
        error_message: errorMessage || null,
      } as never);
    } catch {
      /* ignore log failures */
    }
  }

  if (!apiKey || !fromRaw) {
    console.info(
      `[promotions] BREVO_API_KEY / NEWSLETTER_FROM_EMAIL not set — queued ${recipients.length} emails (not sent)`,
    );
    await Promise.all(
      recipients.map((email) => logRow(email, "queued")),
    );
    return { sent: 0, skipped: recipients.length, mode: "queued" };
  }

  const sender = parseSender(fromRaw);
  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://forge.gym";
  const href = opts.ctaHref
    ? opts.ctaHref.startsWith("http")
      ? opts.ctaHref
      : `${site}${opts.ctaHref.startsWith("/") ? "" : "/"}${opts.ctaHref}`
    : site;
  const cta = opts.ctaLabel || "Learn more";

  let sent = 0;
  let skipped = 0;

  for (const recipient of recipients) {
    const unsub = buildUnsubscribeUrl(recipient, site);
    const htmlContent = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
      <p style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#ef1111;font-weight:700">Forge Gym · Promotion</p>
      <h1 style="font-size:28px;line-height:1.2;margin:12px 0 16px">${escapeHtml(opts.title)}</h1>
      <p style="font-size:16px;line-height:1.6;color:#333;white-space:pre-wrap">${escapeHtml(opts.body)}</p>
      <p style="margin:28px 0">
        <a href="${escapeHtml(href)}" style="display:inline-block;background:#ef1111;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600">${escapeHtml(cta)}</a>
      </p>
      <p style="font-size:12px;color:#888;margin-top:32px">
        You’re receiving this because you subscribed to Forge Gym updates.
        <a href="${escapeHtml(unsub)}" style="color:#888;text-decoration:underline">Unsubscribe</a>
      </p>
    </div>
  `;

    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          sender,
          to: [{ email: recipient }],
          subject: opts.title,
          htmlContent,
          headers: {
            "List-Unsubscribe": `<${unsub}>`,
          },
        }),
      });
      if (res.ok) {
        sent += 1;
        await logRow(recipient, "sent");
      } else {
        const errText = await res.text().catch(() => "");
        console.error("[promotions] Brevo error:", res.status, errText);
        skipped += 1;
        await logRow(recipient, "failed", errText.slice(0, 500));
      }
    } catch (err) {
      console.error("[promotions] Brevo send failed:", err);
      skipped += 1;
      await logRow(recipient, "failed", err instanceof Error ? err.message : "send failed");
    }
  }

  return { sent, skipped, mode: "brevo" };
}

function parseSender(raw: string): { name: string; email: string } {
  const named = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (named) {
    return {
      name: named[1].replace(/^["']|["']$/g, "").trim() || "Forge Gym",
      email: named[2].trim(),
    };
  }
  return { name: "Forge Gym", email: raw.trim() };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
