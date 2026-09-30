import { Student, Enrollment, AttendanceRecord } from '../types';
import { normalizeClassCode, areClassesMatching } from './classHelper';

/**
 * Formats a date string (e.g. '2026-09-28') to Malaysian display format '28/09/2026'.
 */
export function formatDisplayDate(dateStr?: string): string {
  if (!dateStr || !dateStr.trim()) {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    return `${d}/${m}/${y}`;
  }

  const clean = dateStr.trim();
  if (clean.includes('-')) {
    const parts = clean.split('T')[0].split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }

  return clean;
}

/**
 * Generates the clean, standardized copy text for absent students per SES v4.4 Phase 3 standards.
 * Format:
 * Tidak hadir — DIA4B
 * 28/09/2026
 *
 * 1. Muhammad Firdaus — PDA-2502-012
 * 2. Nur Aisyah — PDA-2502-019
 */
export function formatAbsentListText(
  className: string,
  dateStr: string | undefined,
  students: Array<{ name: string; studentId: string }>,
  isClosed = true
): string {
  const label = isClosed ? 'Tidak hadir' : 'Belum hadir';
  const cleanClass = className || 'Kelas';
  const displayDate = formatDisplayDate(dateStr);

  if (!students || students.length === 0) {
    return `${label} — ${cleanClass}\n${displayDate}\n\n(Semua pelajar hadir)`;
  }

  const listItems = students
    .map((s, idx) => `${idx + 1}. ${s.name} — ${s.studentId}`)
    .join('\n');

  return `${label} — ${cleanClass}\n${displayDate}\n\n${listItems}`;
}

/**
 * Authoritatively resolves the target student roster for a session from active enrollments or class.
 */
export function deriveSessionTargetStudents(
  session: { subjectCode?: string; className?: string } | null | undefined,
  students: Student[],
  enrollments?: Enrollment[]
): Student[] {
  if (!session) return students;

  // 1. If subject-specific enrollments exist, resolve by active subject enrollments
  if (enrollments && enrollments.length > 0 && session.subjectCode) {
    const cleanSub = session.subjectCode.trim().toUpperCase();
    const normClass = session.className ? normalizeClassCode(session.className) : '';

    const activeEnrollments = enrollments.filter((e) => {
      const matchSub = (e.subjectCode || '').trim().toUpperCase() === cleanSub;
      const matchClass = !session.className || session.className === 'ALL' || session.className === 'SEMUA' || areClassesMatching(e.className, session.className);
      const isActive = e.status === 'ACTIVE' || (!e.status && e.status !== 'DROPPED');
      return matchSub && matchClass && isActive;
    });

    if (activeEnrollments.length > 0) {
      const enrolledStudentIds = new Set(activeEnrollments.map((e) => (e.studentId || '').trim().toUpperCase()));
      const enrolled = students.filter((s) => {
        const sId = (s.studentId || '').trim().toUpperCase();
        const id = (s.id || '').trim().toUpperCase();
        return enrolledStudentIds.has(sId) || enrolledStudentIds.has(id);
      });
      if (enrolled.length > 0) {
        return enrolled;
      }
    }
  }

  // 2. Class-level fallback
  if (session.className && session.className !== 'Semua' && session.className !== 'ALL') {
    const classStudents = students.filter((s) => areClassesMatching(s.className, session.className));
    if (classStudents.length > 0) {
      return classStudents;
    }
  }

  return students;
}

/**
 * Deterministically derives absent students by subtracting present student IDs from target roster.
 * Accepts a Set of student IDs, an array of student IDs, or an array of AttendanceRecord objects.
 */
export function deriveAbsentStudents(
  targetStudents: Student[],
  presentStudentsOrRecords: Set<string> | AttendanceRecord[] | string[]
): Student[] {
  let presentSet: Set<string>;
  if (presentStudentsOrRecords instanceof Set) {
    presentSet = presentStudentsOrRecords;
  } else if (Array.isArray(presentStudentsOrRecords)) {
    presentSet = new Set(
      presentStudentsOrRecords.map((item: any) =>
        typeof item === 'string'
          ? item.trim().toUpperCase()
          : (item.studentId || item.id || '').trim().toUpperCase()
      )
    );
  } else {
    presentSet = new Set();
  }

  return targetStudents.filter((st) => {
    const idUpper = (st.id || '').trim().toUpperCase();
    const codeUpper = (st.studentId || '').trim().toUpperCase();
    const isPresent =
      (idUpper && presentSet.has(idUpper)) ||
      (codeUpper && presentSet.has(codeUpper));
    return !isPresent;
  });
}
