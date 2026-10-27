import type { SupabaseClient } from "@supabase/supabase-js";
import { escapeHtml, getBrevoConfig, sendBrevoEmail } from "@/lib/brevo";
import { getDefaultSiteContact } from "@/lib/site-contact";

function splitLines(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function resolveSuperadminEmails(
  service: SupabaseClient,
): Promise<string[]> {
  const { data } = await service
    .from("platform_settings")
    .select("value")
    .eq("key", "contact_emails")
    .maybeSingle();
  const fromSettings = splitLines(
    (data as { value?: string } | null)?.value,
  );
  return fromSettings.length > 0
    ? fromSettings
    : getDefaultSiteContact().emails;
}

/**
 * Notify the message recipient (platform team or gym owner) via Brevo.
 * No-ops silently when Brevo is unconfigured or no recipient email resolves.
 */
export async function sendContactNotificationEmail(
  service: SupabaseClient,
  opts: {
    name: string;
    email: string;
    phone: string | null;
    subject: string;
    message: string;
    recipientType: "superadmin" | "gym_admin";
    recipientUserId: string | null;
    recipientLabel: string;
  },
): Promise<boolean> {
  if (!getBrevoConfig()) return false;

  let to: string[] = [];
  if (opts.recipientType === "gym_admin" && opts.recipientUserId) {
    const { data } = await service
      .from("profiles")
      .select("email")
      .eq("user_id", opts.recipientUserId)
      .maybeSingle();
    const ownerEmail = (data as { email?: string } | null)?.email?.trim();
    if (ownerEmail) to = [ownerEmail];
  }
  if (to.length === 0) {
    to = await resolveSuperadminEmails(service);
  }
  if (to.length === 0) return false;

  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "";
  const inboxUrl = `${site}/dashboard`;
  const htmlContent = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
      <p style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#ef1111;font-weight:700">Forge Gym · New contact message</p>
      <h1 style="font-size:22px;line-height:1.2;margin:12px 0 16px">${escapeHtml(opts.subject)}</h1>
      <table style="font-size:14px;color:#333;border-collapse:collapse;margin-bottom:16px">
        <tr><td style="padding:4px 12px 4px 0;color:#888">From</td><td>${escapeHtml(opts.name)} &lt;${escapeHtml(opts.email)}&gt;</td></tr>
        ${opts.phone ? `<tr><td style="padding:4px 12px 4px 0;color:#888">Phone</td><td>${escapeHtml(opts.phone)}</td></tr>` : ""}
        <tr><td style="padding:4px 12px 4px 0;color:#888">To</td><td>${escapeHtml(opts.recipientLabel)}</td></tr>
      </table>
      <p style="font-size:15px;line-height:1.6;color:#333;white-space:pre-wrap">${escapeHtml(opts.message)}</p>
      <p style="margin:28px 0">
        <a href="${escapeHtml(inboxUrl)}" style="display:inline-block;background:#ef1111;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600">Open dashboard inbox</a>
      </p>
      <p style="font-size:12px;color:#888;margin-top:32px">Reply directly to this email to respond to ${escapeHtml(opts.name)}.</p>
    </div>
  `;

  const result = await sendBrevoEmail({
    to,
    subject: `New contact message: ${opts.subject}`,
    htmlContent,
    replyTo: opts.email,
  });
  if (!result.ok) {
    console.error("[contact] Brevo notification failed:", result.error);
    return false;
  }
  return true;
}
