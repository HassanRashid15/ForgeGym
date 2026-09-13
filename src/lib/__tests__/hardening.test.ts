import { describe, it, expect, beforeEach } from "vitest";
import {
  rateLimit,
  __resetRateLimitForTests,
} from "@/lib/rate-limit";
import { resolveRole, isSeededSuperAdmin } from "@/lib/auth/roles";
import { readMeCache, writeMeCache } from "@/lib/auth/me-cache";
import { isPasswordValid, passwordStrengthLabel } from "@/lib/validation/password";
import { pickAllowedProfileFields } from "@/lib/profiles/allowlist";

describe("rateLimit", () => {
  beforeEach(() => {
    __resetRateLimitForTests();
  });

  it("allows requests under the limit", async () => {
    const first = await rateLimit("test:a", 2, 60_000);
    const second = await rateLimit("test:a", 2, 60_000);
    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(0);
  });

  it("blocks when the limit is exceeded", async () => {
    await rateLimit("test:b", 1, 60_000);
    const blocked = await rateLimit("test:b", 1, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });
});

describe("resolveRole", () => {
  it("maps api and metadata roles", () => {
    expect(resolveRole("admin")).toBe("admin");
    expect(resolveRole("trainer")).toBe("trainer");
    expect(resolveRole(null, "staff")).toBe("staff");
    expect(resolveRole(null, null)).toBe("customer");
  });
});

describe("isSeededSuperAdmin", () => {
  it("detects the bootstrap super admin email", () => {
    expect(isSeededSuperAdmin("superadmin@forge.test")).toBe(true);
    expect(isSeededSuperAdmin("other@forge.test")).toBe(false);
  });
});

describe("me cache", () => {
  it("returns cached payloads within TTL", () => {
    const entry = writeMeCache("u1", {
      id: "u1",
      email: "a@b.c",
      name: "A",
      role: "customer",
      admin_approved: true,
      avatar: null,
    });
    expect(readMeCache(entry, "u1")?.name).toBe("A");
    expect(readMeCache(entry, "other")).toBeNull();
  });
});

describe("password validation", () => {
  it("validates strength rules", () => {
    expect(isPasswordValid("Abc123")).toBe(true);
    expect(isPasswordValid("abc123")).toBe(false);
    expect(passwordStrengthLabel("Abc123!xyz")).toBe("strong");
  });
});

describe("profile allowlist", () => {
  it("strips privileged fields", () => {
    const picked = pickAllowedProfileFields({
      full_name: "Sam",
      is_super_admin: true,
      admin_approved: true,
      gym_owner_id: "evil",
      phone: "123",
    });
    expect(picked).toEqual({ full_name: "Sam", phone: "123" });
    expect(picked).not.toHaveProperty("is_super_admin");
    expect(picked).not.toHaveProperty("gym_owner_id");
  });
});
