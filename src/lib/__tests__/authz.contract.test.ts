import { describe, it, expect } from "vitest";
import { pickAllowedProfileFields } from "@/lib/profiles/allowlist";
import { resolveRole } from "@/lib/auth/roles";

/**
 * Lightweight auth/RLS contract tests (no live DB).
 * Documents expected isolation rules for CI.
 */
describe("authz contracts", () => {
  it("never allows privilege fields through self-service allowlist", () => {
    const attack = pickAllowedProfileFields({
      is_super_admin: true,
      admin_approved: true,
      login_enabled: false,
      membership_status: "banned",
      system_permissions: ["*"],
      email: "attacker@evil.test",
      user_id: "other-user",
    });
    expect(Object.keys(attack)).toHaveLength(0);
  });

  it("maps customer default when role metadata is empty", () => {
    expect(resolveRole(undefined, undefined)).toBe("customer");
  });

  it("does not upgrade customer from JWT requested_role metadata", () => {
    expect(resolveRole("customer", "admin")).toBe("customer");
    expect(resolveRole("user", "admin")).toBe("customer");
  });

  it("uses metadata only when API role is missing", () => {
    expect(resolveRole(undefined, "admin")).toBe("admin");
    expect(resolveRole(null, "trainer")).toBe("trainer");
  });
});
