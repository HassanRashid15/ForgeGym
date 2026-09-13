import {
  isPasswordValid as checkPasswordValid,
  passwordStrengthLabel,
} from "@/lib/validation/password";

/** Password strength / match metrics for the register form. */
export function useRegisterPassword(password: string, confirmPassword: string) {
  const hasMinLength = password.length >= 6;
  const hasUpperLower = /(?=.*[a-z])(?=.*[A-Z])/.test(password);
  const hasNumber = /(?=.*\d)/.test(password);
  const isPasswordValid = checkPasswordValid(password);
  const isConfirmFilled = confirmPassword.length > 0;
  const doPasswordsMatch = isConfirmFilled && password === confirmPassword;
  const passwordMismatch = isConfirmFilled && password !== confirmPassword;
  const passwordStrength = passwordStrengthLabel(password) || "weak";

  return {
    hasMinLength,
    hasUpperLower,
    hasNumber,
    isPasswordValid,
    isConfirmFilled,
    doPasswordsMatch,
    passwordMismatch,
    passwordStrength,
  };
}
