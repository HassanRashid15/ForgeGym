import type { UserRole } from "@/types/auth";

/**
 * Resolve app role.
 * Trust the database role from /api/auth/me when present.
 * Auth metadata (`requested_role`) is only a fallback when the API did not
 * return a role — never override a real DB role (prevents role flipping when
 * logging in against another server / env that has different user_roles rows).
 */
export function resolveRole(
  apiRole?: string | null,
  metaRole?: string | null,
): UserRole {
  if (apiRole === "admin") return "admin";
  if (apiRole === "trainer") return "trainer";
  if (apiRole === "staff") return "staff";
  if (apiRole === "moderator") return "moderator";
  // Explicit customer/user from API — do not upgrade via JWT metadata
  if (apiRole === "customer" || apiRole === "user") return "customer";

  const meta = String(metaRole || "").toLowerCase();
  if (meta === "admin") return "admin";
  if (meta === "trainer") return "trainer";
  if (meta === "staff") return "staff";

  return "customer";
}
