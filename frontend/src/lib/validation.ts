// Shared client-side field validation. The backend is still the source of truth —
// these checks just give fast, friendly feedback before a request is sent.

/** RFC-5322-lite: something@something.tld, no whitespace. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Digits with optional leading +, spaces, hyphens, dots and parentheses; 7–15 digits. */
export const PHONE_RE = /^\+?[\d][\d\s().-]{5,17}\d$/;

/** A plain decimal amount: "1200", "1200.50" (no thousands separators, no sign). */
export const AMOUNT_RE = /^\d+(\.\d{1,2})?$/;

/** ISO calendar date as produced by <input type="date">. */
export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

export function isEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function isPhone(value: string): boolean {
  return PHONE_RE.test(value.trim());
}

export function isAmount(value: string): boolean {
  return AMOUNT_RE.test(value.trim());
}

export function isIsoDate(value: string): boolean {
  return ISO_DATE_RE.test(value.trim()) && !Number.isNaN(Date.parse(value));
}

/**
 * Run a list of checks and return the first failure message, or null if all pass.
 * Usage:
 *   const err = firstError([
 *     [isNonEmpty(form.name), "Name is required."],
 *     [isEmail(form.email), "Enter a valid email address."],
 *   ]);
 */
export function firstError(checks: Array<[boolean, string]>): string | null {
  for (const [ok, message] of checks) {
    if (!ok) return message;
  }
  return null;
}
