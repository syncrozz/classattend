import { AttendanceSession, AttendanceRecord, Lecturer, TeachingAssignment } from '../types';
import { areClassesMatching } from './classHelper';

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
 * Calculates attendance metrics with complete division-by-zero protection.
 * Ensures targetCount = 0 NEVER produces NaN or Infinity.
 */
export function calculateAttendanceMetrics(
  presentCount: number,
  rawTargetCount: number | undefined | null
): { targetCount: number; attendancePercent: number } {
  const safePresent = Math.max(0, presentCount || 0);

  // Parse targetCount: If explicitly specified as 0 or a positive number, use it; otherwise fallback to 30
  let targetCount = 30;
  if (typeof rawTargetCount === 'number' && !Number.isNaN(rawTargetCount) && rawTargetCount >= 0) {
    targetCount = rawTargetCount;
  }

  // Edge case: targetCount = 0
  if (targetCount <= 0) {
    return {
      targetCount: 0,
      attendancePercent: safePresent > 0 ? 100 : 0
    };
  }

  const attendancePercent = Math.min(100, Math.round((safePresent / targetCount) * 100));

  return {
    targetCount,
    attendancePercent: Number.isFinite(attendancePercent) ? attendancePercent : 0
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
