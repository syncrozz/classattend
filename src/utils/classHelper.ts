/**
 * Class and Section Normalization & Matching Utilities
 * Ensures classes like "DIA4A", "DIA_4A", "DIA 4A", "DLM 4E", "DLM_4E"
 * match seamlessly across the system without formatting discrepancies.
 */

/**
 * Normalizes class code to stripped alphanumeric uppercase.
 * Examples:
 *  - "DIA_4A" -> "DIA4A"
 *  - "DIA 4A" -> "DIA4A"
 *  - "DLM 4E" -> "DLM4E"
 *  - "DLM_4E" -> "DLM4E"
 *  - "DLC 1B" -> "DLC1B"
 */
export const normalizeClassCode = (cls: string): string => {
  return (cls || '').trim().toUpperCase().replace(/[\s_–-]+/g, '');
};

/**
 * Splits raw class string into clean deduplicated array of classes.
 * Handles comma, semicolon, slash, pipe separators and trailing commas.
 * Examples:
 *  - "DIA4A, DIA4B, DIA4C, DIA3A" -> ["DIA4A", "DIA4B", "DIA4C", "DIA3A"]
 *  - "DLM 4E, DLC 1B, DLC 1A, DLC 1A, DLC 1C" -> ["DLM 4E", "DLC 1B", "DLC 1A", "DLC 1C"]
 *  - "DLM 6A, DLM6B, DLM4F, DLM6C," -> ["DLM 6A", "DLM6B", "DLM4F", "DLM6C"]
 */
export const splitClassNames = (raw: string): string[] => {
  if (!raw || typeof raw !== 'string') return [];
  const parts = raw
    .split(/[,;|/]/)
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s.length > 0);

  // Deduplicate while preserving original order
  const seen = new Set<string>();
  const result: string[] = [];
  for (const p of parts) {
    const norm = normalizeClassCode(p);
    if (!seen.has(norm)) {
      seen.add(norm);
      result.push(p);
    }
  }
  return result;
};

/**
 * Robust class matcher that compares two class identifiers or lists.
 * Returns true if:
 *  - Either is "ALL" or "SEMUA"
 *  - Exact string match (case-insensitive)
 *  - Normalized code match ("DIA_4A" matches "DIA4A", "DLM 4E" matches "DLM_4E")
 *  - Any item in a comma-separated list matches
 */
export const areClassesMatching = (classA?: string | null, classB?: string | null): boolean => {
  if (!classA || !classB) return false;
  const a = classA.trim().toUpperCase();
  const b = classB.trim().toUpperCase();

  if (a === 'ALL' || a === 'SEMUA' || b === 'ALL' || b === 'SEMUA') {
    return true;
  }

  if (a === b) return true;

  // Split lists if comma-separated
  const aList = a.includes(',') ? a.split(',').map((c) => c.trim()) : [a];
  const bList = b.includes(',') ? b.split(',').map((c) => c.trim()) : [b];

  for (const itemA of aList) {
    const normA = normalizeClassCode(itemA);
    for (const itemB of bList) {
      if (itemA === itemB) return true;
      if (normA && normA === normalizeClassCode(itemB)) return true;
    }
  }

  return false;
};

/**
 * Checks if a specific student class is included in an array of target classes.
 */
export const isStudentInClasses = (studentClass: string, targetClasses: string[]): boolean => {
  if (!studentClass || !targetClasses || targetClasses.length === 0) return false;
  if (targetClasses.includes('ALL') || targetClasses.includes('SEMUA')) return true;

  const sNorm = normalizeClassCode(studentClass);
  return targetClasses.some((tc) => {
    if (tc.toUpperCase() === 'ALL' || tc.toUpperCase() === 'SEMUA') return true;
    return tc.toUpperCase() === studentClass.toUpperCase() || normalizeClassCode(tc) === sNorm;
  });
};

/**
 * Standard College Class Catalogue fallback if not yet loaded from DB
 */
export const STANDARD_CLASS_CATALOGUE = [
  'DIA3A', 'DIA3B', 'DIA3C', 'DIA3D',
  'DIA4A', 'DIA4B', 'DIA4C', 'DIA4D',
  'DLM4A', 'DLM4B', 'DLM4C', 'DLM4E',
  'DLC1A', 'DLC1B', 'DLC1C',
  'DLS2A', 'DLS2B'
];

export interface ClassValidationResult {
  isValid: boolean;
  exactMatch?: string;
  suggestions: string[];
  message?: string;
}

/**
 * Validates a class code against the official class catalogue.
 * Strictly avoids silent auto-mutation of invalid codes like "D1A3A".
 * Instead, identifies closest official matches and requires explicit user confirmation.
 */
export const validateClassCode = (
  rawCode: string,
  officialCatalogue: string[] = STANDARD_CLASS_CATALOGUE
): ClassValidationResult => {
  if (!rawCode || !rawCode.trim()) {
    return { isValid: false, suggestions: [], message: 'Kod kelas diperlukan.' };
  }

  const trimmed = rawCode.trim();
  const upper = trimmed.toUpperCase();
  const normalized = normalizeClassCode(trimmed);

  // 1. Direct exact or case-insensitive match against catalogue
  const exact = officialCatalogue.find((c) => c.toUpperCase() === upper);
  if (exact) {
    return { isValid: true, exactMatch: exact, suggestions: [] };
  }

  // 2. Normalized match (e.g. DIA_4A against DIA4A - preserving formatting conventions)
  const normMatch = officialCatalogue.find((c) => normalizeClassCode(c) === normalized);
  if (normMatch && (normMatch.toUpperCase() === upper || normalizeClassCode(normMatch) === normalized)) {
    return { isValid: true, exactMatch: normMatch, suggestions: [] };
  }

  // 3. Not valid: Find potential typo matches (e.g. D1A3A -> DIA3A, 0 vs O)
  // We DO NOT silently convert; we surface them as explicit suggestions.
  const typoAlternative = upper.replace(/1/g, 'I').replace(/0/g, 'O').replace(/5/g, 'S');
  const suggestions: string[] = [];

  officialCatalogue.forEach((catClass) => {
    const catNorm = normalizeClassCode(catClass);
    // Check if typo alternative matches
    if (normalizeClassCode(typoAlternative) === catNorm) {
      if (!suggestions.includes(catClass)) suggestions.push(catClass);
    }
    // Prefix / Suffix similarities
    else if (catNorm.length === normalized.length && (
      catNorm.substring(0, 3) === normalized.substring(0, 3) ||
      catNorm.substring(catNorm.length - 2) === normalized.substring(normalized.length - 2)
    )) {
      if (!suggestions.includes(catClass)) suggestions.push(catClass);
    }
  });

  return {
    isValid: false,
    suggestions: suggestions.slice(0, 4),
    message: suggestions.length > 0
      ? `Kod kelas "${trimmed}" tidak dijumpai dalam katalog rasmi. Adakah anda bermaksud: ${suggestions.join(', ')}?`
      : `Kod kelas "${trimmed}" tidak dijumpai dalam katalog kelas rasmi kolej.`
  };
};

