/** Shared password helpers used across auth forms. */
export function getPasswordIssues(password: string): string[] {
  const issues: string[] = [];
  if (password.length < 6) issues.push("At least 6 characters");
  if (!/[A-Z]/.test(password)) issues.push("One uppercase letter");
  if (!/[a-z]/.test(password)) issues.push("One lowercase letter");
  if (!/[0-9]/.test(password)) issues.push("One number");
  return issues;
}

export function isPasswordValid(password: string): boolean {
  return (
    password.length >= 6 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

export function passwordStrengthLabel(
  password: string,
): "weak" | "medium" | "strong" | null {
  if (!password) return null;
  const hasMinLength = password.length >= 6;
  const hasUpperLower = /(?=.*[a-z])(?=.*[A-Z])/.test(password);
  const hasNumber = /(?=.*\d)/.test(password);
  const valid = hasMinLength && hasUpperLower && hasNumber;
  if (valid && password.length >= 8 && /[^A-Za-z0-9]/.test(password)) {
    return "strong";
  }
  if (hasMinLength && (hasUpperLower || hasNumber)) return "medium";
  return "weak";
}

export function passwordsMatch(password: string, confirm: string): boolean {
  return password.length > 0 && password === confirm;
}
