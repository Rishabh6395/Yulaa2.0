import { parsePhoneNumber, isValidPhoneNumber, AsYouType } from 'libphonenumber-js';

/**
 * Validates a phone number string.
 * Accepts bare 10-digit Indian numbers (prefixed with +91 internally) and
 * any E.164 number with a country code (e.g. +14155552671).
 * Returns { valid, e164, error }.
 */
export function validatePhone(raw: string): { valid: boolean; e164: string | null; error: string | null } {
  const input = raw.trim();
  if (!input) return { valid: false, e164: null, error: 'Phone number is required' };

  // Try parsing as-is first, then with Indian default country
  for (const attempt of [input, input.startsWith('+') ? null : `+91${input}`]) {
    if (!attempt) continue;
    try {
      if (isValidPhoneNumber(attempt)) {
        const parsed = parsePhoneNumber(attempt);
        return { valid: true, e164: parsed.format('E.164'), error: null };
      }
    } catch {}
  }

  // Give a friendlier message for common Indian bare-number mistakes
  const digits = input.replace(/\D/g, '');
  if (digits.length < 10) return { valid: false, e164: null, error: `Phone number too short (${digits.length} digits entered)` };
  if (digits.length === 10) return { valid: false, e164: null, error: 'Invalid phone number — check the number and try again' };
  return { valid: false, e164: null, error: 'Invalid phone number format' };
}

/**
 * Formats a phone number for display as the user types.
 * Returns the formatted string or the raw input if it can't be parsed.
 */
export function formatPhoneAsYouType(raw: string, defaultCountry: 'IN' | 'US' = 'IN'): string {
  return new AsYouType(defaultCountry).input(raw);
}
