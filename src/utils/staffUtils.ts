export * from './studentUtils';

/**
 * Official Lecturer & Admin Email Domain
 */
export const LECTURER_EMAIL_DOMAIN = '@mara.gov.my';
export const LEGACY_LECTURER_EMAIL_DOMAIN = '@bpenawar.kpm.edu.my';
export const LEGACY_LECTURER_EMAIL_DOMAIN_ALT = '@bpenawar.kpmbp.edu.my';
export const DEFAULT_LECTURER_PIN = '1234';

/**
 * Validates whether an email belongs to the official lecturer domain (@mara.gov.my)
 */
export const isLecturerEmail = (email?: string): boolean => {
  if (!email) return false;
  return email.trim().toLowerCase().endsWith(LECTURER_EMAIL_DOMAIN);
};

/**
 * Validates whether an email belongs to the legacy lecturer domain (@bpenawar.kpm.edu.my or @bpenawar.kpmbp.edu.my)
 */
export const isLegacyLecturerEmail = (email?: string): boolean => {
  if (!email) return false;
  const lower = email.trim().toLowerCase();
  return lower.endsWith(LEGACY_LECTURER_EMAIL_DOMAIN) || lower.endsWith(LEGACY_LECTURER_EMAIL_DOMAIN_ALT);
};

/**
 * Converts a legacy @bpenawar.kpm.edu.my or @bpenawar.kpmbp.edu.my lecturer email to official @mara.gov.my format.
 * E.g. 'khairi@bpenawar.kpm.edu.my' -> 'khairi.mohd@mara.gov.my'
 * E.g. 'shah@bpenawar.kpmbp.edu.my' -> 'shah@mara.gov.my'
 */
export const convertLegacyLecturerEmail = (email?: string): string => {
  if (!email) return '';
  const trimmed = email.trim().toLowerCase();
  if (
    trimmed === 'khairi@bpenawar.kpm.edu.my' ||
    trimmed === 'khairi.mohd@bpenawar.kpm.edu.my' ||
    trimmed === 'khairi@bpenawar.kpmbp.edu.my' ||
    trimmed === 'khairi.mohd@bpenawar.kpmbp.edu.my' ||
    trimmed === 'khairi@mara.gov.my'
  ) {
    return 'khairi.mohd@mara.gov.my';
  }
  if (trimmed.endsWith(LEGACY_LECTURER_EMAIL_DOMAIN)) {
    const user = trimmed.slice(0, -LEGACY_LECTURER_EMAIL_DOMAIN.length);
    return `${user}${LECTURER_EMAIL_DOMAIN}`;
  }
  if (trimmed.endsWith(LEGACY_LECTURER_EMAIL_DOMAIN_ALT)) {
    const user = trimmed.slice(0, -LEGACY_LECTURER_EMAIL_DOMAIN_ALT.length);
    return `${user}${LECTURER_EMAIL_DOMAIN}`;
  }
  return trimmed;
};

/**
 * Normalizes lecturer full name for deduplication / fuzzy matching:
 * Removes titles, bin/binti, punctuation, and extra whitespace.
 */
export const normalizeLecturerName = (name?: string): string => {
  if (!name) return '';
  return name
    .toUpperCase()
    .replace(/\b(BIN|BINTI|BT|AL|A\/L|A\/P|ANAK|ENCIK|EN|PUAN|PN|CIK|USTAZ|USTAZAH|DR|PROF|TN|TUAN|HJ|HAJI)\b/g, '')
    .replace(/[^A-Z0-9]/g, '')
    .trim();
};

