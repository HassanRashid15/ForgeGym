/** Shared monthly billing period helpers (join-anniversary cycle). */

export function daysUntil(date: Date, now = new Date()): number {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

/**
 * Parse join_date / created_at into a stable local Date.
 * Date-only values (YYYY-MM-DD) prefer created_at for the real membership time.
 */
export function parseMembershipAnchor(
  joinDate: string | null | undefined,
  createdAt?: string | null,
): Date | null {
  const join = (joinDate || "").trim();
  const created = (createdAt || "").trim();

  // Date-only join_date → use created_at time when available (authentic member-since)
  if (/^\d{4}-\d{2}-\d{2}$/.test(join)) {
    if (created) {
      const fromCreated = new Date(created);
      if (!Number.isNaN(fromCreated.getTime())) return fromCreated;
    }
    const [y, m, d] = join.split("-").map(Number);
    const local = new Date(y, m - 1, d, 0, 0, 0, 0);
    return Number.isNaN(local.getTime()) ? null : local;
  }

  const raw = join || created;
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Next monthly renewal after join, and time remaining in the current period. */
export function monthlyPeriod(
  anchorIso: string | null | undefined,
  now = new Date(),
  createdAt?: string | null,
) {
  const anchor = parseMembershipAnchor(anchorIso, createdAt);
  if (!anchor) {
    return {
      periodStart: null as string | null,
      periodEnd: null as string | null,
      daysLeft: null as number | null,
      msLeft: null as number | null,
      joinedAt: null as string | null,
    };
  }

  const periodStart = new Date(anchor);
  while (true) {
    const next = new Date(periodStart);
    next.setMonth(next.getMonth() + 1);
    if (next > now) break;
    periodStart.setMonth(periodStart.getMonth() + 1);
  }

  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const msLeft = Math.max(0, periodEnd.getTime() - now.getTime());
  // Same unit as the live countdown day digit (whole days remaining)
  const daysLeft = Math.floor(msLeft / 86_400_000);

  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    daysLeft,
    msLeft,
    joinedAt: anchor.toISOString(),
  };
}
