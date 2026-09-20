/** Compute BMI from kg + cm, rounded to 1 decimal. */
export function computeBmi(
  weightKg: number | null | undefined,
  heightCm: number | null | undefined,
): number | null {
  const w = Number(weightKg);
  const h = Number(heightCm);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  const meters = h / 100;
  if (meters <= 0) return null;
  return Math.round((w / (meters * meters)) * 10) / 10;
}

export function bmiCategoryLabel(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Healthy Baseline";
  if (bmi < 30) return "Overweight Tier";
  return "High BMI";
}
