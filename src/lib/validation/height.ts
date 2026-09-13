/** Convert height input in feet or inches to centimeters. */
export function heightToCm(value: string, unit: "ft" | "inch"): number {
  if (unit === "inch") return parseFloat(value) * 2.54;
  // ft format: "5.10" => 5 ft 10 in
  if (value.includes(".")) {
    const [ft, inch] = value.split(".");
    return ((parseInt(ft) || 0) * 12 + (parseInt(inch) || 0)) * 2.54;
  }
  return parseFloat(value) * 30.48;
}
