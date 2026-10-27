import { describe, it, expect } from "vitest";
import { resolveRole } from "../roles";

describe("resolveRole", () => {
  it("should return admin for API admin role", () => {
    expect(resolveRole("admin", undefined)).toBe("admin");
  });

  it("should return customer for API customer role even if metadata is admin", () => {
    // API role takes priority over metadata - explicit customer should not be upgraded
    expect(resolveRole("customer", "admin")).toBe("customer");
  });

  it("should return customer for API customer role even if metadata is super_admin", () => {
    expect(resolveRole("customer", "super_admin")).toBe("customer");
  });

  it("should return customer for no API or metadata role", () => {
    expect(resolveRole(undefined, undefined)).toBe("customer");
  });

  it("should prioritize API role over metadata role", () => {
    expect(resolveRole("admin", "customer")).toBe("admin");
  });

  it("should return trainer for API trainer role", () => {
    expect(resolveRole("trainer", undefined)).toBe("trainer");
  });

  it("should return staff for API staff role", () => {
    expect(resolveRole("staff", undefined)).toBe("staff");
  });

  it("should return admin for metadata admin when API role is not customer", () => {
    expect(resolveRole(undefined, "admin")).toBe("admin");
  });
});
