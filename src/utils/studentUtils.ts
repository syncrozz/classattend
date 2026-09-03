import { ActivityCategory, AttendanceSession, Student } from '../types';

export const sortSessionsLatestFirst = (sessions: AttendanceSession[]): AttendanceSession[] => {
  return [...sessions].sort((a, b) => {
    // 1. Prioritize OPEN / Active sessions
    if (a.status === 'OPEN' && b.status !== 'OPEN') return -1;
    if (a.status !== 'OPEN' && b.status === 'OPEN') return 1;

    // 2. Prioritize most recent date + startTime
    const dateA = a.date ? `${a.date}T${a.startTime || '00:00'}` : (a.createdAt || '');
    const dateB = b.date ? `${b.date}T${b.startTime || '00:00'}` : (b.createdAt || '');

    if (dateA && dateB && dateA !== dateB) {
      return dateB.localeCompare(dateA);
    }

    // 3. Prioritize createdAt
    const createdA = a.createdAt || '';
    const createdB = b.createdAt || '';
    if (createdA && createdB && createdA !== createdB) {
      return createdB.localeCompare(createdA);
    }

    // 4. Prioritize higher ID / descending
    return b.id.localeCompare(a.id);
  });
};

export const getInitials = (name: string): string => {
  if (!name) return 'ST';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

export const getStudentColor = (id: string): string => {
  const colors = [
    'bg-indigo-600 text-indigo-100',
    'bg-emerald-600 text-emerald-100',
    'bg-blue-600 text-blue-100',
    'bg-amber-600 text-amber-100',
    'bg-rose-600 text-rose-100',
    'bg-teal-600 text-teal-100',
    'bg-purple-600 text-purple-100',
    'bg-cyan-600 text-cyan-100'
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const getCategoryLabel = (cat?: ActivityCategory | string): string => {
  switch (cat) {
    case 'CLASS':
      return 'Kuliah / Kelas';
    case 'ASSEMBLY':
      return 'Perhimpunan Pelajar';
    case 'OFFICIAL_PROGRAMME':
      return 'Program Rasmi Kolej';
    case 'SEMINAR':
      return 'Seminar';
    case 'WORKSHOP':
      return 'Bengkel';
    case 'BRIEFING':
      return 'Taklimat';
    case 'CO_CURRICULAR':
      return 'Kokurikulum';
    case 'STUDENT_PROGRAMME':
      return 'Program Pelajar';
    case 'CLUB_ACTIVITY':
      return 'Persatuan / Kelab';
    case 'SPECIAL_EVENT':
      return 'Acara Khas';
    case 'OTHER':
    default:
      return 'Aktiviti Umum';
  }
};

export const getCategoryBadgeColor = (cat?: ActivityCategory | string): string => {
  switch (cat) {
    case 'ASSEMBLY':
      return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    case 'CLASS':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    case 'OFFICIAL_PROGRAMME':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    case 'WORKSHOP':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    case 'SEMINAR':
      return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    case 'CO_CURRICULAR':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    case 'CLUB_ACTIVITY':
      return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
    default:
      return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
  }
};

export const getClassBadgeColor = (className?: string): string => {
  switch (className) {
    case 'DIA_3A':
      return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
    case 'DIA_3B':
      return 'bg-teal-500/10 text-teal-300 border-teal-500/30';
    case 'DIA_3C':
      return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
    case 'DIA_3D':
      return 'bg-sky-500/10 text-sky-300 border-sky-500/30';
    case 'DIA_4A':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    case 'DIA_4B':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    case 'DIA_4C':
      return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
    case 'DIA_4D':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    default:
      return 'bg-slate-500/10 text-slate-300 border-slate-500/30';
  }
};

// Aliases for backward compatibility
export const getStaffColor = getStudentColor;

/**
 * Extracts 3-digit suffix for student ID
 * e.g., 'PDA-2502-001' -> '001'
 * e.g., '001' -> '001'
 */
export const getStudentIdSuffix = (studentId?: string): string => {
  if (!studentId) return '';
  const digits = studentId.replace(/\D/g, '');
  if (digits.length >= 3) {
    return digits.slice(-3);
  }
  return digits.padStart(3, '0');
};

/**
 * Extracts 3-digit suffix for phone number
 * e.g., '601110571550' -> '550'
 * e.g., '+60 11-1057 1550' -> '550'
 */
export const getStudentPhoneSuffix = (phone?: string): string => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 3) {
    return digits.slice(-3);
  }
  return digits;
};

/**
 * Matches a 6-digit access code (3-digit Student ID suffix + 3-digit Phone suffix)
 * to an existing student in the database.
 */
export const findStudentByAccessCode = (students: Student[], code: string): Student | null => {
  const sanitized = (code || '').trim().replace(/\D/g, '');
  if (sanitized.length !== 6) return null;

  const targetIdSuffix = sanitized.slice(0, 3);
  const targetPhoneSuffix = sanitized.slice(3, 6);

  const matched = students.find((s) => {
    const idDigits = (s.studentId || s.id || '').replace(/\D/g, '');
    const phoneDigits = (s.phone || '').replace(/\D/g, '');

    const idSuffix = idDigits.length >= 3 ? idDigits.slice(-3) : idDigits.padStart(3, '0');
    const rawIdSuffix = (s.studentId || s.id || '').trim().slice(-3);
    const phoneSuffix = phoneDigits.length >= 3 ? phoneDigits.slice(-3) : '';

    const idMatches = idSuffix === targetIdSuffix || rawIdSuffix === targetIdSuffix;
    const phoneMatches = phoneSuffix === targetPhoneSuffix;

    return idMatches && phoneMatches;
  });

  return matched || null;
};
