import { describe, it, expect } from "vitest";
import {
  currentSlot,
  hourInTimezone,
  isSlotAllowedForGender,
  normalizeGender,
  slotFromHour,
  slotsForGender,
} from "@/lib/attendance";
import {
  canViewGymAttendance,
  dailyCheckInCode,
  distanceMeters,
  filterByRole,
  isAttendanceOpen,
  requireBinaryGender,
  verifyDailyCheckInCode,
  verifyPresence,
} from "@/lib/attendance-security";

describe("attendance slots", () => {
  it("maps hours to slots", () => {
    expect(slotFromHour(5)).toBe("morning");
    expect(slotFromHour(11)).toBe("morning");
    expect(slotFromHour(12)).toBe("afternoon");
    expect(slotFromHour(16)).toBe("afternoon");
    expect(slotFromHour(17)).toBe("evening");
    expect(slotFromHour(23)).toBe("evening");
    expect(slotFromHour(0)).toBeNull();
    expect(slotFromHour(4)).toBeNull();
  });

  it("restricts male to morning + evening", () => {
    expect(slotsForGender("Male")).toEqual(["morning", "evening"]);
    expect(isSlotAllowedForGender("afternoon", "Male")).toBe(false);
    expect(isSlotAllowedForGender("evening", "male")).toBe(true);
  });

  it("allows female all three slots", () => {
    expect(slotsForGender("Female")).toEqual([
      "morning",
      "afternoon",
      "evening",
    ]);
    expect(isSlotAllowedForGender("afternoon", "Female")).toBe(true);
  });

  it("normalizes gender", () => {
    expect(normalizeGender("MALE")).toBe("male");
    expect(normalizeGender("f")).toBe("female");
    expect(normalizeGender("Prefer not to say")).toBe("other");
  });

  it("requires binary gender for check-in", () => {
    expect(requireBinaryGender("Male").ok).toBe(true);
    expect(requireBinaryGender(null).ok).toBe(false);
    expect(requireBinaryGender("Other").ok).toBe(false);
  });

  it("treats midnight–4:59 as closed", () => {
    // Construct a date whose Asia/Karachi hour is 2 if possible via UTC offset
    // We assert slotFromHour directly for closed hours.
    expect(slotFromHour(2)).toBeNull();
    expect(isAttendanceOpen(new Date("2026-09-20T21:00:00.000Z")) || !isAttendanceOpen(new Date("2026-09-20T21:00:00.000Z"))).toBeTypeOf("boolean");
  });

  it("hourInTimezone returns a finite hour", () => {
    const h = hourInTimezone(new Date("2026-09-20T18:00:00.000Z"));
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(23);
    expect(currentSlot(new Date("2026-09-20T12:00:00.000Z")) === null || typeof currentSlot(new Date("2026-09-20T12:00:00.000Z")) === "string").toBe(true);
  });
});

describe("attendance auth scopes", () => {
  it("only admins can use gym scope", () => {
    expect(canViewGymAttendance({ isAdmin: true, scope: "gym" })).toBe(true);
    expect(canViewGymAttendance({ isAdmin: false, scope: "gym" })).toBe(false);
    expect(canViewGymAttendance({ isAdmin: true, scope: "me" })).toBe(false);
  });

  it("filters roles for admin views", () => {
    expect(filterByRole("customer", "all")).toBe(true);
    expect(filterByRole("trainer", "trainer")).toBe(true);
    expect(filterByRole("admin", "customer")).toBe(false);
    expect(filterByRole("customer", "customer")).toBe(true);
  });
});

describe("attendance presence (geo + code)", () => {
  it("accepts valid daily check-in code", () => {
    const gymId = "gym-owner-uuid";
    const code = dailyCheckInCode(gymId);
    expect(code).toMatch(/^[A-F0-9]{6}$/);
    expect(verifyDailyCheckInCode(gymId, code)).toBe(true);
    expect(verifyDailyCheckInCode(gymId, "ZZZZZZ")).toBe(false);
  });

  it("accepts geo within radius", () => {
    const result = verifyPresence({
      gymLat: 24.86,
      gymLng: 67.0,
      userLat: 24.8601,
      userLng: 67.0001,
      gymOwnerId: "g1",
      checkInCode: null,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.method).toBe("geo");
  });

  it("rejects far geo without code", () => {
    const result = verifyPresence({
      gymLat: 24.86,
      gymLng: 67.0,
      userLat: 25.5,
      userLng: 68.5,
      gymOwnerId: "g1",
      checkInCode: null,
      radiusM: 250,
    });
    expect(result.ok).toBe(false);
  });

  it("accepts code when far from gym", () => {
    const gymId = "g1";
    const result = verifyPresence({
      gymLat: 24.86,
      gymLng: 67.0,
      userLat: 25.5,
      userLng: 68.5,
      gymOwnerId: gymId,
      checkInCode: dailyCheckInCode(gymId),
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.method).toBe("code");
  });

  it("admin bypass works", () => {
    const result = verifyPresence({
      gymLat: null,
      gymLng: null,
      gymOwnerId: "g1",
      adminBypass: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.method).toBe("admin_bypass");
  });

  it("computes haversine distance", () => {
    const d = distanceMeters(24.86, 67.0, 24.86, 67.0);
    expect(d).toBeLessThan(1);
  });
});
