import { AttendanceSession, AttendanceRecord, Lecturer, TeachingAssignment, Enrollment } from '../types';
import { areClassesMatching, normalizeClassCode } from './classHelper';

export type RosterCountSource = 'SNAPSHOT' | 'LEGACY_DYNAMIC' | 'EMPTY';

export interface AttendanceMetrics {
  targetCount: number;
  attendancePercent: number;
  source: RosterCountSource;
}

/**
 * Validates whether a lecturer or administrator is authorized to access a session.
 * 
 * Rules enforced:
 * 1. Administrator maintains full oversight access.
 * 2. Authenticated lecturer must match session owner (lecturerId or verified email).
 * 3. Lecturer CANNOT access another lecturer's session (explicit lecturerId mismatch returns false).
 * 4. For sessions without explicit lecturerId (legacy), lecturer must have an active teaching assignment
 *    matching BOTH the subject course code AND the specific class set.
 * 5. Client-side name matching is STRICTLY FORBIDDEN from being used as the sole authorization method.
 */
export function isLecturerAuthorizedForSession(
  session: AttendanceSession | null | undefined,
  lecturer: Lecturer | null | undefined,
  isAdmin: boolean,
  teachingAssignments: TeachingAssignment[] = []
): boolean {
  if (!session) return false;

  // 1. Admin retains authorized oversight access
  if (isAdmin) return true;

  // 2. Unauthenticated or invalid lecturer identity is rejected
  if (!lecturer || !lecturer.id) return false;

  // 3. Check direct ownership by secure lecturer ID
  if (session.lecturerId && session.lecturerId.trim() !== '') {
    if (session.lecturerId === lecturer.id) {
      return true;
    }
    // If session explicitly belongs to another lecturer ID, access is strictly denied
    return false;
  }

  // 4. Check direct ownership by verified official lecturer email
  if (session.lecturerEmail && lecturer.email) {
    const cleanSessionEmail = session.lecturerEmail.trim().toLowerCase();
    const cleanLecturerEmail = lecturer.email.trim().toLowerCase();
    if (cleanSessionEmail === cleanLecturerEmail) {
      return true;
    }
  }

  // 5. Check official Teaching Assignment authorization for legacy / unassigned lecturerId sessions
  // Ensures lecturer cannot access an unauthorized class or subject
  const hasAuthorizedAssignment = teachingAssignments.some((ta) => {
    const isLecturerAssigned =
      ta.lecturerId === lecturer.id ||
      Boolean(
        ta.lecturerEmail &&
        lecturer.email &&
        ta.lecturerEmail.trim().toLowerCase() === lecturer.email.trim().toLowerCase()
      );

    if (!isLecturerAssigned) return false;

    // Must match subject code
    const isSubjectMatch =
      (ta.subjectCode || '').trim().toUpperCase() === (session.subjectCode || '').trim().toUpperCase();

    // Must match class set (e.g. DIA3A matches DIA_3A, prevents accessing another class)
    const isClassMatch = areClassesMatching(ta.className, session.className);

    return isSubjectMatch && isClassMatch;
  });

  if (hasAuthorizedAssignment) {
    return true;
  }

  // 6. Fail-Safe: Client-side name matching ALONE is NEVER used as authorization
  return false;
}

/**
 * Filters sessions strictly to those the user is authorized to inspect.
 * Automatically sorts newest first based on createdAt or scheduled date/time.
 */
export function filterAuthorizedSessions(
  sessions: AttendanceSession[],
  lecturer: Lecturer | null | undefined,
  isAdmin: boolean,
  teachingAssignments: TeachingAssignment[] = []
): AttendanceSession[] {
  return sessions
    .filter((session) => isLecturerAuthorizedForSession(session, lecturer, isAdmin, teachingAssignments))
    .sort((a, b) => {
      const timeA = new Date(a.createdAt || `${a.date}T${a.startTime || '00:00'}`).getTime() || 0;
      const timeB = new Date(b.createdAt || `${b.date}T${b.startTime || '00:00'}`).getTime() || 0;
      return timeB - timeA;
    });
}

/**
 * Filters attendance records strictly for a specific authorized session.
 * Deduplicates multiple scans for the exact same student so records are not counted twice.
 */
export function filterAuthorizedAttendanceRecords(
  records: AttendanceRecord[],
  sessionId: string
): AttendanceRecord[] {
  if (!sessionId) return [];

  const rawSessionRecords = records.filter(
    (r) => r.sessionId === sessionId && r.status === 'PRESENT'
  );

  // Deduplicate by studentId (keeping the earliest scan record)
  const seenStudentIds = new Set<string>();
  const uniqueRecords: AttendanceRecord[] = [];

  for (const record of rawSessionRecords) {
    const cleanStudentId = (record.studentId || '').trim().toUpperCase();
    if (!cleanStudentId) {
      uniqueRecords.push(record);
    } else if (!seenStudentIds.has(cleanStudentId)) {
      seenStudentIds.add(cleanStudentId);
      uniqueRecords.push(record);
    }
  }

  return uniqueRecords;
}

/**
 * Resolves the authoritative attendance denominator (targetCount) for a session.
 * 
 * Rules:
 * 1. Stored Snapshot: If session.targetCount is explicitly defined (number >= 0),
 *    preserve and return that snapshot value without mutation. (source: 'SNAPSHOT')
 * 2. Legacy Fallback: If session.targetCount is missing (undefined/null),
 *    resolve from the count of ACTIVE enrollments matching session's subjectCode and className.
 *    (source: 'LEGACY_DYNAMIC')
 * 3. Safe zero: If no targetCount exists and no enrollments match, return 0 (source: 'EMPTY').
 *    NEVER fallback to 30 or assume generic class capacity.
 */
export function resolveSessionRosterCount(
  session: AttendanceSession | { subjectCode?: string; className?: string; targetCount?: number | null },
  enrollments?: Enrollment[]
): { targetCount: number; source: RosterCountSource } {
  // 1. Snapshot check: preserves historical session semantics
  if (typeof session.targetCount === 'number' && !Number.isNaN(session.targetCount) && session.targetCount >= 0) {
    return {
      targetCount: session.targetCount,
      source: 'SNAPSHOT'
    };
  }

  // 2. Legacy Dynamic Fallback: resolve from authoritative ACTIVE enrollments
  if (enrollments && enrollments.length > 0 && session.subjectCode && session.className) {
    const cleanSub = session.subjectCode.trim().toUpperCase();
    const normClass = normalizeClassCode(session.className);

    const activeEnrollments = enrollments.filter((e) => {
      const matchSub = (e.subjectCode || '').trim().toUpperCase() === cleanSub;
      const matchClass = normalizeClassCode(e.className) === normClass;
      const isActive = e.status === 'ACTIVE' || (!e.status && e.status !== 'DROPPED');
      return matchSub && matchClass && isActive;
    });

    return {
      targetCount: activeEnrollments.length,
      source: 'LEGACY_DYNAMIC'
    };
  }

  return {
    targetCount: 0,
    source: 'EMPTY'
  };
}

/**
 * Calculates attendance metrics with complete division-by-zero protection.
 * Ensures targetCount = 0 NEVER produces NaN or Infinity.
 * Standardizes attendance percentage calculation across views.
 * 
 * @param presentCount Number of unique verified PRESENT attendance records for the session
 * @param rawTargetCount Stored session targetCount snapshot (if any)
 * @param fallbackEnrollments Optional enrollments list to resolve legacy sessions missing targetCount
 * @param session Optional session context (subjectCode, className)
 */
export function calculateAttendanceMetrics(
  presentCount: number,
  rawTargetCount?: number | null,
  fallbackEnrollments?: Enrollment[],
  session?: AttendanceSession | { subjectCode?: string; className?: string }
): AttendanceMetrics {
  const safePresent = Math.max(0, presentCount || 0);

  let targetCount = 0;
  let source: RosterCountSource = 'EMPTY';

  // 1. Explicit snapshot targetCount provided
  if (typeof rawTargetCount === 'number' && !Number.isNaN(rawTargetCount) && rawTargetCount >= 0) {
    targetCount = rawTargetCount;
    source = 'SNAPSHOT';
  } else if (fallbackEnrollments && fallbackEnrollments.length > 0 && session?.subjectCode && session?.className) {
    // 2. Legacy Dynamic Fallback from authoritative ACTIVE enrollments
    const cleanSub = session.subjectCode.trim().toUpperCase();
    const normClass = normalizeClassCode(session.className);

    const activeEnrollments = fallbackEnrollments.filter((e) => {
      const matchSub = (e.subjectCode || '').trim().toUpperCase() === cleanSub;
      const matchClass = normalizeClassCode(e.className) === normClass;
      const isActive = e.status === 'ACTIVE' || (!e.status && e.status !== 'DROPPED');
      return matchSub && matchClass && isActive;
    });

    targetCount = activeEnrollments.length;
    source = 'LEGACY_DYNAMIC';
  }

  // Edge case: targetCount = 0 (Safe Zero Protection)
  if (targetCount <= 0) {
    return {
      targetCount: 0,
      attendancePercent: safePresent > 0 ? 100 : 0,
      source
    };
  }

  const attendancePercent = Math.min(100, Math.round((safePresent / targetCount) * 100));

  return {
    targetCount,
    attendancePercent: Number.isFinite(attendancePercent) ? attendancePercent : 0,
    source
  };
}

/**
 * Formats end time safely without modifying legacy records.
 */
export function formatSafeEndTime(endTime?: string | null, status?: string | null): string {
  if (endTime && endTime.trim().length > 0) {
    return endTime.trim();
  }
  if (status === 'OPEN') {
    return 'Sedang Berlangsung';
  }
  return '-';
}
