export type MePayload = {
  id: string;
  email: string | null;
  name: string;
  role: "admin" | "moderator" | "customer" | "trainer" | "staff";
  isSuperAdmin?: boolean;
  admin_approved: boolean;
  avatar: string | null;
  gymName?: string | null;
  gymOwnerId?: string | null;
  gymCity?: string | null;
  gymType?: string | null;
  gymMainImageUrl?: string | null;
  membershipStatus?: string | null;
  membershipType?: string | null;
};

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(fallback);
      });
  });
}

const ME_CACHE_TTL_MS = 5 * 60 * 1000;

export type MeCacheEntry = {
  userId: string;
  data: MePayload;
  at: number;
};

export function readMeCache(
  cache: MeCacheEntry | null,
  userId: string,
): MePayload | null {
  if (!cache || cache.userId !== userId) return null;
  if (Date.now() - cache.at >= ME_CACHE_TTL_MS) return null;
  return cache.data;
}

export function writeMeCache(
  userId: string,
  data: MePayload,
): MeCacheEntry {
  return { userId, data, at: Date.now() };
}
