import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import type { RateLimitResult } from "@/lib/rate-limit";
import { rateLimitHeaders } from "@/lib/rate-limit";

export function jsonError(
  message: string,
  status: number,
  extras?: {
    code?: string;
    hint?: string;
    details?: unknown;
    requestId?: string;
    headers?: HeadersInit;
  },
) {
  const body: Record<string, unknown> = { error: message };
  if (extras?.code) body.code = extras.code;
  if (extras?.hint) body.hint = extras.hint;
  if (extras?.details !== undefined) body.details = extras.details;
  if (extras?.requestId) body.requestId = extras.requestId;

  if (status >= 500) {
    logger.error("api_error", {
      status,
      message,
      code: extras?.code,
      requestId: extras?.requestId,
    });
  }

  return NextResponse.json(body, {
    status,
    headers: extras?.headers,
  });
}

export function rateLimitedResponse(result: RateLimitResult) {
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  return jsonError("Too many requests. Please try again later.", 429, {
    code: "rate_limited",
    headers: {
      ...rateLimitHeaders(result),
      "Retry-After": String(retryAfter),
    },
  });
}

export function getRequestId(request: Request): string {
  return (
    request.headers.get("x-request-id") ||
    request.headers.get("cf-ray") ||
    crypto.randomUUID()
  );
}
