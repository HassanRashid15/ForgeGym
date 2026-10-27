import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getBrevoConfig, parseSender, sendBrevoEmail } from "@/lib/brevo";
import { sendPromotionEmails } from "@/lib/promotion-email";

const ENV_KEYS = [
  "BREVO_API_KEY",
  "SENDINBLUE_API_KEY",
  "NEWSLETTER_FROM_EMAIL",
  "BREVO_FROM_EMAIL",
  "NEXT_PUBLIC_SITE_URL",
] as const;

let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  vi.unstubAllGlobals();
});

function stubFetch(ok = true, status = 201) {
  const calls: { url: string; init: RequestInit }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return { ok, status, text: async () => (ok ? "" : "smtp quota exceeded") } as Response;
    }),
  );
  return calls;
}

describe("brevo client", () => {
  it("is unconfigured without an API key", () => {
    delete process.env.BREVO_API_KEY;
    delete process.env.SENDINBLUE_API_KEY;
    expect(getBrevoConfig()).toBeNull();
    expect(parseSender("Forge Gym <noreply@forgegym.app>")).toEqual({
      name: "Forge Gym",
      email: "noreply@forgegym.app",
    });
  });

  it("sends with api-key header and parsed sender", async () => {
    process.env.BREVO_API_KEY = "test-key";
    process.env.NEWSLETTER_FROM_EMAIL = "Forge Gym <noreply@forgegym.app>";
    const calls = stubFetch();

    const res = await sendBrevoEmail({
      to: ["a@x.com", "b@x.com"],
      subject: "Hi",
      htmlContent: "<p>Hi</p>",
      replyTo: "visitor@x.com",
      headers: { "List-Unsubscribe": "<https://x.com/unsub>" },
    });

    expect(res).toEqual({ ok: true });
    expect(calls).toHaveLength(1);
    const { url, init } = calls[0];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers["api-key"]).toBe("test-key");
    const body = JSON.parse(String(init.body));
    expect(body.sender).toEqual({ name: "Forge Gym", email: "noreply@forgegym.app" });
    expect(body.to).toEqual([{ email: "a@x.com" }, { email: "b@x.com" }]);
    expect(body.replyTo).toEqual({ email: "visitor@x.com" });
    expect(body.headers["List-Unsubscribe"]).toBe("<https://x.com/unsub>");
  });

  it("surfaces provider errors", async () => {
    process.env.BREVO_API_KEY = "test-key";
    process.env.NEWSLETTER_FROM_EMAIL = "noreply@forgegym.app";
    stubFetch(false, 402);

    const res = await sendBrevoEmail({
      to: ["a@x.com"],
      subject: "Hi",
      htmlContent: "<p>Hi</p>",
    });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("402");
  });
});

describe("sendPromotionEmails", () => {
  it("queues when Brevo is unconfigured", async () => {
    delete process.env.BREVO_API_KEY;
    delete process.env.SENDINBLUE_API_KEY;
    const result = await sendPromotionEmails({
      title: "T",
      body: "B",
      recipients: ["A@x.com", "a@x.com", " "],
    });
    expect(result).toEqual({ sent: 0, skipped: 1, mode: "queued" });
  });

  it("sends via Brevo with unsubscribe header and escaped content", async () => {
    process.env.BREVO_API_KEY = "test-key";
    process.env.NEWSLETTER_FROM_EMAIL = "Forge Gym <noreply@forgegym.app>";
    process.env.NEXT_PUBLIC_SITE_URL = "https://site.test";
    const calls = stubFetch();

    const result = await sendPromotionEmails({
      title: "Sale <now>",
      body: "Body & more",
      ctaLabel: "Join",
      ctaHref: "/pricing",
      recipients: ["MixED@x.com"],
    });

    expect(result).toEqual({ sent: 1, skipped: 0, mode: "brevo" });
    const body = JSON.parse(String(calls[0].init.body));
    expect(body.to).toEqual([{ email: "mixed@x.com" }]);
    expect(body.subject).toBe("Sale <now>");
    expect(body.htmlContent).toContain("Sale &lt;now&gt;");
    expect(body.htmlContent).toContain("https://site.test/pricing");
    expect(body.headers["List-Unsubscribe"]).toMatch(
      /^<https:\/\/site\.test\/unsubscribe\?email=mixed%40x\.com&token=[a-f0-9]{32}>$/,
    );
  });

  it("counts provider failures as skipped", async () => {
    process.env.BREVO_API_KEY = "test-key";
    process.env.NEWSLETTER_FROM_EMAIL = "noreply@forgegym.app";
    stubFetch(false, 400);

    const result = await sendPromotionEmails({
      title: "T",
      body: "B",
      recipients: ["a@x.com", "b@x.com"],
    });
    expect(result).toEqual({ sent: 0, skipped: 2, mode: "brevo" });
  });
});
