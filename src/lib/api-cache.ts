/**
 * In-process TTL cache for expensive GET API responses.
 * Cuts repeat Supabase load on dashboard remounts / home refreshes.
 * Single-instance (dev & single Node). For multi-instance, pair with Upstash later.
 */

type CacheEntry = {
  value: unknown;
  expiresAt: number;
};

const store = new Map<string, CacheEntry>();
const MAX_ENTRIES = 500;

function pruneExpired(now = Date.now()) {
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) store.delete(key);
  }
  if (store.size <= MAX_ENTRIES) return;
  const overflow = store.size - MAX_ENTRIES;
  let removed = 0;
  for (const key of store.keys()) {
    store.delete(key);
    removed += 1;
    if (removed >= overflow) break;
  }
}

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function cacheSet(key: string, value: unknown, ttlMs: number) {
  pruneExpired();
  store.set(key, { value, expiresAt: Date.now() + Math.max(0, ttlMs) });
}

export async function cacheGetOrSet<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<{ data: T; hit: boolean }> {
  const hit = cacheGet<T>(key);
  if (hit !== null) return { data: hit, hit: true };
  const data = await loader();
  cacheSet(key, data, ttlMs);
  return { data, hit: false };
}

/** Invalidate exact key or all keys starting with prefix (e.g. `admin:users:`) */
export function cacheInvalidate(keyOrPrefix: string) {
  if (store.has(keyOrPrefix)) {
    store.delete(keyOrPrefix);
  }
  for (const key of store.keys()) {
    if (key.startsWith(keyOrPrefix)) store.delete(key);
  }
}

export const CacheTTL = {
  /** Public marketing lists */
  public: 60_000,
  /** Platform settings / fees */
  settings: 60_000,
  /** Admin dashboard lists — short so mutations feel fresh after invalidate */
  adminList: 20_000,
  /** Auth user in proxy */
  authUser: 45_000,
} as const;

export function withCacheHeaders(
  init: ResponseInit | undefined,
  ttlSeconds: number,
  hit?: boolean,
): ResponseInit {
  const headers = new Headers(init?.headers);
  headers.set(
    "Cache-Control",
    `private, max-age=0, s-maxage=${ttlSeconds}, stale-while-revalidate=${ttlSeconds * 2}`,
  );
  if (hit !== undefined) headers.set("X-Cache", hit ? "HIT" : "MISS");
  return { ...init, headers };
}
