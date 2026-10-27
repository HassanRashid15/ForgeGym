/**
 * Shared Brevo (Sendinblue) transactional email client.
 * Configure with BREVO_API_KEY + NEWSLETTER_FROM_EMAIL; returns null/failure
 * when unconfigured so callers can fall back to queued-only behaviour.
 */
export type BrevoSender = { name: string; email: string };

export function parseSender(raw: string): BrevoSender {
  const named = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (named) {
    return {
      name: named[1].replace(/^["']|["']$/g, "").trim() || "Forge Gym",
      email: named[2].trim(),
    };
  }
  return { name: "Forge Gym", email: raw.trim() };
}

export function getBrevoConfig(): { apiKey: string; from: BrevoSender } | null {
  const apiKey =
    process.env.BREVO_API_KEY?.trim() ||
    process.env.SENDINBLUE_API_KEY?.trim() ||
    "";
  const fromRaw =
    process.env.NEWSLETTER_FROM_EMAIL?.trim() ||
    process.env.BREVO_FROM_EMAIL?.trim() ||
    "";
  if (!apiKey || !fromRaw) return null;
  return { apiKey, from: parseSender(fromRaw) };
}

export async function sendBrevoEmail(opts: {
  to: string[];
  subject: string;
  htmlContent: string;
  replyTo?: string;
  headers?: Record<string, string>;
}): Promise<{ ok: boolean; error?: string }> {
  const cfg = getBrevoConfig();
  if (!cfg) return { ok: false, error: "Brevo not configured" };

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": cfg.apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: cfg.from,
      to: opts.to.map((email) => ({ email })),
      subject: opts.subject,
      htmlContent: opts.htmlContent,
      ...(opts.replyTo ? { replyTo: { email: opts.replyTo } } : {}),
      ...(opts.headers ? { headers: opts.headers } : {}),
    }),
  });

  if (res.ok) return { ok: true };
  const text = await res.text().catch(() => "");
  return { ok: false, error: `Brevo ${res.status}: ${text.slice(0, 300)}` };
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
