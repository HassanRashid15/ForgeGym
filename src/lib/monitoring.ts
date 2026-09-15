import { logger } from "@/lib/logger";

export type MonitorEvent =
  | "auth.login"
  | "auth.login_failed"
  | "auth.register"
  | "auth.rate_limited"
  | "api.error"
  | "profile.update"
  | "admin.approve"
  | "admin.reject"
  | "newsletter.rate_limited"
  | "newsletter.subscribed";

/**
 * Lightweight production monitoring hook.
 * Uses Sentry when NEXT_PUBLIC_SENTRY_DSN / SENTRY_DSN is set.
 */
export function trackEvent(
  event: MonitorEvent,
  fields?: Record<string, unknown>,
) {
  logger.info(event, {
    event,
    ...fields,
  });

  try {
    const Sentry = (globalThis as { __SENTRY__?: { captureMessage?: (m: string, ctx?: unknown) => void } }).__SENTRY__;
    Sentry?.captureMessage?.(event, { level: "info", extra: fields });
  } catch {
    // optional
  }
}

export function trackException(
  error: unknown,
  context?: Record<string, unknown>,
) {
  const message =
    error instanceof Error ? error.message : "Unknown application error";
  logger.error("exception", {
    message,
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
  });

  try {
    // Dynamic import path kept soft so builds work without initializing Sentry
    const g = globalThis as {
      Sentry?: { captureException?: (e: unknown, ctx?: unknown) => void };
    };
    if (typeof g.Sentry?.captureException === "function") {
      g.Sentry.captureException(error, { extra: context });
    }
  } catch {
    // optional
  }
}

/** Call once from instrumentation when SENTRY_DSN is configured. */
export async function initSentry() {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn,
      tracesSampleRate: 0.1,
      enabled: process.env.NODE_ENV === "production",
    });
    (globalThis as { Sentry?: typeof Sentry }).Sentry = Sentry;
  } catch (err) {
    logger.warn("sentry_init_failed", {
      message: err instanceof Error ? err.message : "unknown",
    });
  }
}
