import { Redis } from "@upstash/redis";

type MemoryEntry = {
  value: string;
  expiresAt: number;
};

const memoryStore = new Map<string, MemoryEntry>();

let redisClient: Redis | null | undefined;

/** Shared TTL presets (ms) used across API routes + proxy. */
export const CacheTTL = {
  /** Public catalog responses (gyms, promotions). */
  public: 60_000,
  /** Admin list payloads (users, pending). */
  adminList: 15_000,
  /** Auth user session probe cache in proxy. */
  authUser: 30_000,
  /** Live attendance / short-lived private data. */
  attendance: 12_000,
} as const;

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redisClient = null;
    return null;
  }
  redisClient = new Redis({ url, token });
  return redisClient;
}

function memoryGet<T>(key: string): T | null {
  const hit = memoryStore.get(key);
  if (!hit) return null;
  if (Date.now() >= hit.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  try {
    return JSON.parse(hit.value) as T;
  } catch {
    memoryStore.delete(key);
    return null;
  }
}

function memorySet(key: string, value: unknown, ttlMs: number) {
  memoryStore.set(key, {
    value: JSON.stringify(value),
    expiresAt: Date.now() + Math.max(1, ttlMs),
  });
}

function memoryDel(key: string) {
  memoryStore.delete(key);
}

function memoryDelPrefix(prefix: string) {
  for (const key of memoryStore.keys()) {
    if (key.startsWith(prefix)) memoryStore.delete(key);
  }
}

/** Prefix all API cache keys so they never collide with rate-limit keys. */
export function apiCacheKey(
  ...parts: Array<string | number | null | undefined>
) {
  return ["api-cache", ...parts.map((p) => String(p ?? ""))].join(":");
}

/**
 * Read-through / write-through API cache.
 * Uses Upstash Redis when configured; otherwise in-memory (single instance).
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (redis) {
    try {
      const raw = await redis.get<string>(key);
      if (raw == null) return null;
      if (typeof raw === "string") {
        try {
          return JSON.parse(raw) as T;
        } catch {
          return raw as T;
        }
      }
      return raw as T;
    } catch (error) {
      console.warn("api-cache redis get failed:", error);
      return memoryGet<T>(key);
    }
  }
  return memoryGet<T>(key);
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlMs = 15_000,
): Promise<void> {
  const ttlSec = Math.max(1, Math.ceil(ttlMs / 1000));
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(key, JSON.stringify(value), { ex: ttlSec });
      return;
    } catch (error) {
      console.warn("api-cache redis set failed:", error);
    }
  }
  memorySet(key, value, ttlMs);
}

export async function cacheDel(key: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.del(key);
    } catch (error) {
      console.warn("api-cache redis del failed:", error);
    }
  }
  memoryDel(key);
}

/**
 * Invalidate cache entries.
 * - string ending with `:` → prefix invalidate
 * - other string → exact key + prefix (legacy callers)
 * - array → each entry
 * - object → keys / prefixes
 */
export async function cacheInvalidate(
  target:
    | string
    | string[]
    | {
        keys?: string[];
        prefixes?: string[];
      },
): Promise<void> {
  if (typeof target === "string") {
    if (target.endsWith(":")) {
      await cacheInvalidate({ prefixes: [target] });
    } else {
      await cacheInvalidate({ keys: [target], prefixes: [target] });
    }
    return;
  }

  if (Array.isArray(target)) {
    for (const item of target) {
      await cacheInvalidate(item);
    }
    return;
  }

  for (const key of target.keys || []) {
    await cacheDel(key);
  }

  for (const prefix of target.prefixes || []) {
    memoryDelPrefix(prefix);
    const redis = getRedis();
    if (!redis) continue;
    try {
      let cursor: string | number = 0;
      do {
        const [next, keys] = (await redis.scan(cursor, {
          match: `${prefix}*`,
          count: 100,
        })) as [string | number, string[]];
        cursor = next;
        if (keys?.length) await redis.del(...keys);
      } while (cursor !== 0 && cursor !== "0");
    } catch (error) {
      console.warn("api-cache redis invalidate prefix failed:", error);
    }
  }
}

/**
 * Cache helper: return cached value or compute, store, and return.
 */
export async function cacheAside<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<{ data: T; hit: boolean }> {
  const cached = await cacheGet<T>(key);
  if (cached != null) return { data: cached, hit: true };
  const data = await loader();
  await cacheSet(key, data, ttlMs);
  return { data, hit: false };
}

/** Alias used by existing routes — same as cacheAside. */
export const cacheGetOrSet = cacheAside;

/**
 * Response init for NextResponse.json(..., withCacheHeaders(...)).
 */
export function withCacheHeaders(
  init?: ResponseInit,
  maxAgeSec = 0,
  hit = false,
): ResponseInit {
  const headers = new Headers(init?.headers);
  headers.set("X-Cache", hit ? "HIT" : "MISS");
  if (maxAgeSec > 0) {
    headers.set(
      "Cache-Control",
      `public, s-maxage=${maxAgeSec}, stale-while-revalidate=${maxAgeSec * 2}`,
    );
  } else {
    headers.set("Cache-Control", "private, max-age=0, must-revalidate");
  }
  return {
    ...init,
    headers,
  };
}

/** Test helper — clears in-memory store only. */
export function __resetApiCacheForTests() {
  memoryStore.clear();
  redisClient = undefined;
}
