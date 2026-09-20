/** Digits-only phone key for comparison (ignores spaces, +, dashes). */
export function phoneDigits(value: string | null | undefined): string {
  return String(value || "").replace(/\D/g, "");
}

/** True when both numbers have enough digits and match. */
export function phonesMatch(
  a: string | null | undefined,
  b: string | null | undefined,
  minDigits = 7,
): boolean {
  const da = phoneDigits(a);
  const db = phoneDigits(b);
  return da.length >= minDigits && db.length >= minDigits && da === db;
}

export function isUsablePhone(value: string | null | undefined, minDigits = 7): boolean {
  return phoneDigits(value).length >= minDigits;
}

type PhoneProfileRow = { user_id: string; phone: string | null };

/** Scan profiles for a duplicate phone (digit match). */
export async function findDuplicatePhone(
  supabase: {
    from: (table: string) => {
      select: (cols: string) => {
        not: (
          col: string,
          op: string,
          val: null,
        ) => PromiseLike<{ data: PhoneProfileRow[] | null; error: { message: string } | null }>;
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
    console.warn("findDuplicatePhone:", error.message);
    return false;
  }
  return (data || []).some((p) => {
    if (excludeUserId && p.user_id === excludeUserId) return false;
    return phonesMatch(p.phone, phone);
  });
}
