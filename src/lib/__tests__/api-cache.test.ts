import { describe, it, expect, beforeEach } from "vitest";
import {
  __resetApiCacheForTests,
  apiCacheKey,
  cacheAside,
  cacheDel,
  cacheGet,
  cacheGetOrSet,
  cacheInvalidate,
  cacheSet,
  CacheTTL,
  withCacheHeaders,
} from "@/lib/api-cache";

describe("api-cache", () => {
  beforeEach(() => {
    __resetApiCacheForTests();
  });

  it("builds stable keys", () => {
    expect(apiCacheKey("attendance", "user", "u1")).toBe(
      "api-cache:attendance:user:u1",
    );
  });

  it("exposes CacheTTL presets", () => {
    expect(CacheTTL.public).toBeGreaterThan(0);
    expect(CacheTTL.adminList).toBeGreaterThan(0);
    expect(CacheTTL.authUser).toBeGreaterThan(0);
  });

  it("sets and gets values with TTL", async () => {
    await cacheSet("api-cache:test:a", { ok: true }, 5_000);
    await expect(cacheGet<{ ok: boolean }>("api-cache:test:a")).resolves.toEqual({
      ok: true,
    });
  });

  it("cacheAside / cacheGetOrSet hits after first load", async () => {
    let loads = 0;
    const first = await cacheGetOrSet("api-cache:test:aside", 5_000, async () => {
      loads += 1;
      return { n: 1 };
    });
    const second = await cacheAside("api-cache:test:aside", 5_000, async () => {
      loads += 1;
      return { n: 2 };
    });
    expect(first.hit).toBe(false);
    expect(second.hit).toBe(true);
    expect(second.data).toEqual({ n: 1 });
    expect(loads).toBe(1);
  });

  it("withCacheHeaders sets X-Cache", () => {
    const hit = withCacheHeaders(undefined, 30, true);
    expect(new Headers(hit.headers).get("X-Cache")).toBe("HIT");
    const miss = withCacheHeaders(undefined, 0, false);
    expect(new Headers(miss.headers).get("X-Cache")).toBe("MISS");
  });

  it("deletes keys and prefixes", async () => {
    await cacheSet("api-cache:attendance:gym:g1:page1", { a: 1 }, 5_000);
    await cacheSet("api-cache:attendance:gym:g1:page2", { a: 2 }, 5_000);
    await cacheSet("api-cache:attendance:user:u1:page1", { a: 3 }, 5_000);

    await cacheInvalidate({
      prefixes: ["api-cache:attendance:gym:g1"],
    });

    await expect(
      cacheGet("api-cache:attendance:gym:g1:page1"),
    ).resolves.toBeNull();
    await expect(
      cacheGet("api-cache:attendance:user:u1:page1"),
    ).resolves.toEqual({ a: 3 });

    await cacheDel("api-cache:attendance:user:u1:page1");
    await expect(
      cacheGet("api-cache:attendance:user:u1:page1"),
    ).resolves.toBeNull();
  });
});
