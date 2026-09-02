/**
 * Phone Number Normalization & Scientific Notation Handling Utility
 * Ensures No_Telefon is treated strictly as TEXT with zero floating-point digit loss.
 */

/**
 * Pure string-based conversion of scientific notation to exact integer digit string.
 * Completely avoids floating-point numbers (`Number()`, `parseFloat()`) to guarantee zero digit loss.
 *
 * Examples:
 *  - "6.01111E+11" -> "601111000000"
 *  - "6.01994E+11" -> "601994000000"
 *  - "6.0103705759E+10" -> "60103705759"
 *  - "6.0197123001E+10" -> "60197123001"
 *  - "6.0145313756E+10" -> "60145313756"
 *  - "6.01111177844E+11" -> "601111177844"
 */
export function parseScientificNotationToExactString(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null;

  // Clean quotes, formulas, whitespace
  const trimmed = raw.trim().replace(/^['"=]+|['"]+$/g, '').trim();
  if (!trimmed) return null;

  // Scientific notation regex: e.g. +6.01111E+11, 6.01994e11, 6.01E+10
  const match = trimmed.match(/^([+-])?(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/i);
  if (!match) return null;

  const sign = match[1] || '';
  const intPart = match[2];
  const fracPart = match[3] || '';
  const exp = parseInt(match[4], 10);

  // Negative sign or negative exponent cannot be a valid telephone number
  if (sign === '-' || isNaN(exp) || exp < 0) {
    return null;
  }

  if (exp === 0) {
    // If there is a non-zero fractional part, not an integer number
    if (fracPart.length > 0 && !/^0+$/.test(fracPart)) {
      return null;
    }
    return intPart;
  }

  // Move decimal point to the right by `exp` places using pure string operations
  if (exp >= fracPart.length) {
    const padZeros = '0'.repeat(exp - fracPart.length);
    return intPart + fracPart + padZeros;
  } else {
    // If exponent is smaller than fraction length, check if remainder is non-zero
    const intCombined = intPart + fracPart.slice(0, exp);
    const remainingFrac = fracPart.slice(exp);
    if (!/^0+$/.test(remainingFrac)) {
      return null; // Not a whole integer
    }
    return intCombined;
  }
}

/**
 * Validates whether a normalized phone number string represents a plausible phone number.
 * Malaysian numbers with country code: 10-12 digits starting with 60 (e.g. 60197123001, 601111029018)
 * Standard international: 8-15 digits
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const digits = phone.replace(/\D/g, '');

  // Must be between 8 and 15 digits
  if (digits.length < 8 || digits.length > 15) {
    return false;
  }

  // Cannot be all repeating identical digits (e.g. 00000000, 11111111)
  if (/^(\d)\1+$/.test(digits) && digits.length >= 8) {
    return false;
  }

  return true;
}

/**
 * Normalizes phone numbers from CSV, text, or user input into standard string format.
 *
 * Handles:
 * 1. String treatment (never numeric)
 * 2. Scientific notation resolution (e.g. 6.01111E+11 -> 601111000000)
 * 3. Excel formula wrappers (e.g. ="60197123001", '0145313756)
 * 4. Malaysian prefixes (01x -> 601x, +601x -> 601x, 1x -> 601x)
 * 5. Formatting removal (spaces, hyphens, brackets, dots)
 * 6. Empty / invalid string handling (returns empty string)
 */
export function normalizePhoneNumber(rawPhone: unknown): string {
  if (rawPhone === null || rawPhone === undefined) return '';

  // 1. Force string conversion
  let str = String(rawPhone).trim();
  if (!str) return '';

  // 2. Strip Excel formulas, apostrophes, and surrounding quotes
  str = str.replace(/^[='"]+|['"]+$/g, '').trim();
  if (!str) return '';

  // Check for common non-number text placeholders
  const lower = str.toLowerCase();
  if (
    lower === 'n/a' ||
    lower === 'na' ||
    lower === 'tiada' ||
    lower === 'none' ||
    lower === 'nil' ||
    lower === 'null' ||
    lower === '-' ||
    lower === '--' ||
    lower === 'undefined'
  ) {
    return '';
  }

  // 3. Detect and resolve scientific notation without floating-point math
  if (/[eE]/.test(str)) {
    const resolvedScientific = parseScientificNotationToExactString(str);
    if (resolvedScientific) {
      str = resolvedScientific;
    }
  }

  // 4. Extract digits while checking for international + prefix
  const hasPlus = str.startsWith('+');
  const digits = str.replace(/\D/g, '');

  if (!digits) return '';

  // 5. Malaysian Phone Standardization
  // Case A: Starts with '0' (Local format: e.g. 0145313756 -> 60145313756, 01111177844 -> 601111177844)
  if (digits.startsWith('0') && digits.length >= 9) {
    const normalized = '60' + digits.slice(1);
    return isValidPhoneNumber(normalized) ? normalized : digits;
  }

  // Case B: Already starts with '60' (e.g. 60197123001, 60103705759, 601111029018)
  if (digits.startsWith('60') && digits.length >= 10) {
    return isValidPhoneNumber(digits) ? digits : '';
  }

  // Case C: Mobile number without 0 or 60 (e.g. 197123001 -> 9 digits or 1111029018 -> 10 digits)
  if (digits.startsWith('1') && (digits.length === 9 || digits.length === 10)) {
    const normalized = '60' + digits;
    return isValidPhoneNumber(normalized) ? normalized : digits;
  }

  // Case D: General international or other valid numeric string
  if (hasPlus) {
    const withCode = digits;
    return isValidPhoneNumber(withCode) ? withCode : digits;
  }

  // Fallback validation
  return isValidPhoneNumber(digits) ? digits : '';
}

/**
 * Format phone number for clean UI presentation (e.g. +60 19-712 3001)
 */
export function formatPhoneDisplay(phone?: string): string {
  if (!phone) return '-';
  const clean = normalizePhoneNumber(phone);
  if (!clean) return phone;

  if (clean.startsWith('601') && clean.length === 11) {
    // 60 1x-xxx xxxx
    return `+60 ${clean.slice(2, 4)}-${clean.slice(4, 7)} ${clean.slice(7)}`;
  }

  if (clean.startsWith('601') && clean.length === 12) {
    // 60 11-xxxx xxxx
    return `+60 ${clean.slice(2, 4)}-${clean.slice(4, 8)} ${clean.slice(8)}`;
  }

  if (clean.startsWith('60')) {
    return `+60 ${clean.slice(2)}`;
  }

  return clean;
}
