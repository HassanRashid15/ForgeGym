import {
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";
import { logger } from "@/lib/logger";

/** Digits-only phone key for comparison (ignores spaces, +, dashes). */
export function phoneDigits(value: string | null | undefined): string {
  return String(value || "").replace(/\D/g, "");
}

/** Normalize to E.164 when possible (defaults to Pakistan). */
export function toE164(
  value: string | null | undefined,
  defaultCountry: CountryCode = "PK",
): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    const parsed = parsePhoneNumberFromString(raw, defaultCountry);
    if (parsed?.isValid()) return parsed.number;
  } catch {
    /* ignore */
  }
  if (raw.startsWith("+") && isValidPhoneNumber(raw)) return raw;
  return null;
}

/** Strict ITU / libphonenumber validation (E.164 or national with default country). */
export function isValidE164Phone(
  value: string | null | undefined,
  defaultCountry: CountryCode = "PK",
): boolean {
  const raw = String(value || "").trim();
  if (!raw) return false;
  try {
    if (raw.startsWith("+")) return isValidPhoneNumber(raw);
    return isValidPhoneNumber(raw, defaultCountry);
  } catch {
    return false;
  }
}

/**
 * True when the value is a usable phone for duplicate checks.
 * Prefers strict validation; falls back to digit length for legacy rows.
 */
export function isUsablePhone(
  value: string | null | undefined,
  minDigits = 7,
): boolean {
  if (isValidE164Phone(value)) return true;
  return phoneDigits(value).length >= minDigits;
}

/** True when both numbers have enough digits and match (E.164-aware). */
export function phonesMatch(
  a: string | null | undefined,
  b: string | null | undefined,
  minDigits = 7,
): boolean {
  const ea = toE164(a);
  const eb = toE164(b);
  if (ea && eb) return ea === eb;
  const da = phoneDigits(a);
  const db = phoneDigits(b);
  return da.length >= minDigits && db.length >= minDigits && da === db;
}

type PhoneProfileRow = { user_id: string; phone: string | null };

/** Scan profiles for a duplicate phone (digit / E.164 match). */
export async function findDuplicatePhone(
  supabase: {
    from: (table: string) => {
      select: (cols: string) => {
        not: (
          col: string,
          op: string,
          val: null,
        ) => PromiseLike<{
          data: PhoneProfileRow[] | null;
          error: { message: string } | null;
        }>;
      };
    };
  },
  phone: string | null | undefined,
  excludeUserId?: string | null,
): Promise<boolean> {
  if (!isUsablePhone(phone)) return false;
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, phone")
    .not("phone", "is", null);
  if (error) {
    logger.warn("findDuplicatePhone error", { error: error.message });
    return false;
  }
  return (data || []).some((p) => {
    if (excludeUserId && p.user_id === excludeUserId) return false;
    return phonesMatch(p.phone, phone);
  });
}
