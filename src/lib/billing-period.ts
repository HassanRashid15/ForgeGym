/** Shared monthly billing period helpers (join-anniversary cycle). */

export function daysUntil(date: Date, now = new Date()): number {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

/** Next monthly renewal after join, and days remaining in the current period. */
export function monthlyPeriod(anchorIso: string | null | undefined, now = new Date()) {
  if (!anchorIso) {
    return {
      periodStart: null as string | null,
      periodEnd: null as string | null,
      daysLeft: null as number | null,
    };
  }

  const anchor = new Date(anchorIso);
  if (Number.isNaN(anchor.getTime())) {
    return { periodStart: null, periodEnd: null, daysLeft: null };
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

  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    daysLeft: Math.max(0, daysUntil(periodEnd, now)),
  };
}
