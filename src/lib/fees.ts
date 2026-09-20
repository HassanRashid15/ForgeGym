/** Parse a fee label like "Rs 5,000" or "5000" into a number. */
export function parseFeeAmount(fee: string | null | undefined): number {
  if (!fee) return 0;
  const n = Number(String(fee).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Prefer currency/symbol from the gym monthly fee when combining. */
export function formatCombinedFee(
  monthlyFee: string | null | undefined,
  trainerFee: string | null | undefined,
  withTrainer: boolean,
): string | null {
  const monthly = (monthlyFee || "").trim();
  const trainer = (trainerFee || "").trim();

  if (!withTrainer) return monthly || null;
  if (!monthly && !trainer) return null;
  if (!monthly) return trainer || null;
  if (!trainer) return monthly;

  const total = parseFeeAmount(monthly) + parseFeeAmount(trainer);
  const symbol = monthly.replace(/[0-9.,\s]/g, "").trim();
  if (symbol) {
    return `${symbol} ${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}`.trim();
  }
  return String(total);
}

export function feeBreakdownLabel(
  monthlyFee: string | null | undefined,
  trainerFee: string | null | undefined,
  withTrainer: boolean,
  feeConcession?: string | null,
): string {
  const concession = (feeConcession || "").trim();
  if (concession) return `Concession ${concession}`;
  const monthly = (monthlyFee || "").trim() || "—";
  if (!withTrainer) return monthly;
  const trainer = (trainerFee || "").trim() || "—";
  return `${monthly} + trainer ${trainer}`;
}

/** Effective member fee — admin concession overrides gym + trainer formula. */
export function formatMemberFee(
  monthlyFee: string | null | undefined,
  trainerFee: string | null | undefined,
  withTrainer: boolean,
  feeConcession?: string | null,
): string | null {
  const concession = (feeConcession || "").trim();
  if (concession) return concession;
  return formatCombinedFee(monthlyFee, trainerFee, withTrainer);
}
