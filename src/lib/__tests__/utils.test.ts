import { describe, it, expect } from "vitest";
import { getNameInitials, formatRoleName } from "../utils";

describe("getNameInitials", () => {
  it("should extract initials from full name", () => {
    expect(getNameInitials("John Doe")).toBe("JD");
    expect(getNameInitials("Jane Marie Smith")).toBe("JS"); // First and last name only
  });

  it("should handle single name", () => {
    expect(getNameInitials("John")).toBe("JO"); // First 2 characters
  });

  it("should handle empty string", () => {
    expect(getNameInitials("")).toBe("U"); // Default to "U"
  });

  it("should handle extra spaces", () => {
    expect(getNameInitials("  John   Doe  ")).toBe("JD");
  });
});

describe("formatRoleName", () => {
  it("should format admin role", () => {
    expect(formatRoleName("admin", false)).toBe("Admin");
  });

  it("should format super admin role", () => {
    expect(formatRoleName("admin", true)).toBe("Super Admin");
  });

  it("should format trainer role", () => {
    expect(formatRoleName("trainer", false)).toBe("Trainer");
  });

  it("should format customer role", () => {
    expect(formatRoleName("customer", false)).toBe("Member");
  });

  it("should format staff role", () => {
    expect(formatRoleName("staff", false)).toBe("Staff");
  });

  it("should handle unknown role", () => {
    expect(formatRoleName("unknown", false)).toBe("unknown"); // Returns the role as-is
  });
});
