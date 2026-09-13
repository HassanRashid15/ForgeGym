import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type Bucket = {
  count: number;
  resetAt: number;
};

const memoryBuckets = new Map<string, Bucket>();
const upstashLimiters = new Map<string, Ratelimit>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
};

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function getUpstashLimiter(limit: number, windowMs: number): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;

  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const cacheKey = `${limit}:${windowSec}`;
  const cached = upstashLimiters.get(cacheKey);
  if (cached) return cached;

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(limit, `${windowSec} s`),
    prefix: "gym-hub",
    analytics: false,
  });
  upstashLimiters.set(cacheKey, limiter);
  return limiter;
}

function memoryRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const existing = memoryBuckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    memoryBuckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt, limit };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt, limit };
  }

  existing.count += 1;
  memoryBuckets.set(key, existing);
  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
    limit,
  };
}

/**
 * Rate limit with Upstash Redis when `UPSTASH_REDIS_REST_*` is set;
 * otherwise in-memory fallback (single-instance).
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const upstash = getUpstashLimiter(limit, windowMs);
  if (upstash) {
    const result = await upstash.limit(key);
    return {
      allowed: result.success,
      remaining: result.remaining,
      resetAt: result.reset,
      limit,
    };
  }

  return memoryRateLimit(key, limit, windowMs);
}

export function clientKey(request: Request, prefix: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    (forwarded ? forwarded.split(",")[0]?.trim() : null) ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return `${prefix}:${ip}`;
}

export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}

/** Test helper — clears limiter state between unit tests. */
export function __resetRateLimitForTests() {
  memoryBuckets.clear();
  upstashLimiters.clear();
}
