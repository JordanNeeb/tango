import { type Messages } from "@tango/shared";

type ErrorMessages = Messages["auth"]["errors"];

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AuthField = "name" | "email" | "password";

export type FieldErrors = Partial<Record<AuthField, string>>;

export type ActionResult = {
  fieldErrors?: FieldErrors;
  formError?: string;
  notice?: string;
  // Lets the sign-in form offer "resend confirmation" only when it applies.
  unconfirmed?: boolean;
  // Submitted values to re-show after React resets the form. Never passwords.
  values?: { name?: string; email?: string };
};

export const ACCOUNT_TYPES = ["parent", "professional"] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export function isAccountType(value: unknown): value is AccountType {
  return (ACCOUNT_TYPES as readonly unknown[]).includes(value);
}

// Holds the account type chosen before a Google sign-up until /auth/callback
// can save it, because Google can't carry sign-up metadata.
export const ACCOUNT_TYPE_COOKIE = "tango_account_type";

export function readText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export function validateEmail(
  raw: string,
  errors: ErrorMessages,
): { email: string; error?: string } {
  const email = raw.trim();
  if (!email) return { email, error: errors.emailRequired };
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return { email, error: errors.emailInvalid };
  }
  return { email };
}

// Sign-in only checks presence; length rules apply when a password is set.
export function validateNewPassword(
  password: string,
  errors: ErrorMessages,
): string | undefined {
  if (password.length < 8 || password.length > 72) {
    return errors.passwordLength;
  }
  return undefined;
}

// Name: required when saved, 1-100 characters after trimming.
export function validateName(
  raw: string,
  error: string,
): { name: string; error?: string } {
  const name = raw.trim();
  if (name.length < 1 || name.length > 100) return { name, error };
  return { name };
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}
