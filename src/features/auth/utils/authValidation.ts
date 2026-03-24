const SPECIAL_CHAR_PATTERN = /[^a-zA-Z0-9]/;

export type PasswordChecks = {
  minLength: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function getPasswordChecks(value: string): PasswordChecks {
  return {
    minLength: value.length >= 8,
    hasNumber: /\d/.test(value),
    hasSpecial: SPECIAL_CHAR_PATTERN.test(value),
  };
}

export function allPasswordChecksMet(checks: PasswordChecks): boolean {
  return checks.minLength && checks.hasNumber && checks.hasSpecial;
}
