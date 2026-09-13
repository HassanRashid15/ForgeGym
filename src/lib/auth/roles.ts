import type { UserRole } from "@/types/auth";

/** Seeded platform super-admin used in local/dev bootstrap scripts. */
export const SEEDED_SUPER_ADMIN_EMAIL = "superadmin@forge.test";

export function isSeededSuperAdmin(email: string | null | undefined): boolean {
  return (email || "").trim().toLowerCase() === SEEDED_SUPER_ADMIN_EMAIL;
}

export function resolveRole(
  apiRole?: string | null,
  metaRole?: string | null,
): UserRole {
  if (apiRole === "admin") return "admin";
  if (apiRole === "trainer") return "trainer";
  if (apiRole === "staff") return "staff";
  if (apiRole === "moderator") return "moderator";

  const meta = String(metaRole || "").toLowerCase();
  if (meta === "admin") return "admin";
  if (meta === "trainer") return "trainer";
  if (meta === "staff") return "staff";

  return "customer";
}
