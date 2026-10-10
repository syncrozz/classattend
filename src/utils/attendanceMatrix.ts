import {
  Student,
  AttendanceSession,
  AttendanceRecord,
  Subject,
  Lecturer,
  TeachingAssignment
} from '../types';
import { areClassesMatching } from './classHelper';

export interface MatrixSessionColumn {
  session: AttendanceSession;
  dateFormatted: string; // e.g. "10-Oct"
  subLabel?: string;     // e.g. "S1", "S2" if multiple sessions on the same date
  isDuplicateDate: boolean;
}

export type MatrixCellStatus = 'PRESENT' | 'LATE' | 'EXCUSED' | 'ABSENT' | 'OPEN_EMPTY';

export interface MatrixCellData {
  sessionId: string;
  studentId: string;
  status: MatrixCellStatus;
  symbol: string;      // '✓' | 'L' | 'E' | 'A' | ''
  label: string;       // Text description (Hadir, Lewat, etc.)
  colorClass: string;  // CSS text color
  bgClass: string;     // CSS bg color
  record?: AttendanceRecord;
}

export interface StudentMatrixRow {
  no: number;
  student: Student;
  className: string;
  name: string;
  studentId: string;
  cells: Record<string, MatrixCellData>;
  presentCount: number;
  totalSessions: number;
  percentage: number;
  isWarning: boolean;
}

export interface AttendanceMatrixData {
  selectedClass: string;
  selectedSubjectCode: string;
  selectedSubjectName: string;
  columns: MatrixSessionColumn[];
  rows: StudentMatrixRow[];
  classAveragePercentage: number;
  studentsBelow80Count: number;
}

const MONTH_NAMES_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Format date string (YYYY-MM-DD or ISO) into "10-Oct" (DD-MMM English format)
 */
export function formatSessionColumnDate(dateStr: string): string {
  if (!dateStr) return '-';
  
  // Format standard YYYY-MM-DD
  const cleanDate = dateStr.split('T')[0].trim();
  const parts = cleanDate.split('-');
  if (parts.length === 3) {
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(day) && monthIdx >= 0 && monthIdx < 12) {
      return `${String(day).padStart(2, '0')}-${MONTH_NAMES_EN[monthIdx]}`;
    }
  }

  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const day = d.getDate();
    const monthIdx = d.getMonth();
    return `${String(day).padStart(2, '0')}-${MONTH_NAMES_EN[monthIdx]}`;
  }

  return dateStr;
}

/**
 * Process and sort sessions chronologically, generating matrix columns with disambiguation labels (S1, S2)
 * for sessions on the same date.
 */
export function getMatrixSessionColumns(sessions: AttendanceSession[]): MatrixSessionColumn[] {
  // 1. Sort sessions chronologically (earliest to latest)
  const sortedSessions = [...sessions].sort((a, b) => {
    const dateComp = (a.date || '').localeCompare(b.date || '');
    if (dateComp !== 0) return dateComp;
    const timeComp = (a.startTime || '').localeCompare(b.startTime || '');
    if (timeComp !== 0) return timeComp;
    return (a.id || '').localeCompare(b.id || '');
  });

  // 2. Count sessions per formatted date to determine if sublabels (S1, S2) are needed
  const dateCounts: Record<string, number> = {};
  sortedSessions.forEach((s) => {
    const dateKey = formatSessionColumnDate(s.date);
    dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1;
  });

  // 3. Track index per date
  const dateSeenIndex: Record<string, number> = {};

  return sortedSessions.map((session) => {
    const dateFormatted = formatSessionColumnDate(session.date);
    const hasMultiple = (dateCounts[dateFormatted] || 0) > 1;

    let subLabel: string | undefined;
    if (hasMultiple) {
      const idx = (dateSeenIndex[dateFormatted] || 0) + 1;
      dateSeenIndex[dateFormatted] = idx;
      subLabel = `S${idx}`;
    }

    return {
      session,
      dateFormatted,
      subLabel,
      isDuplicateDate: hasMultiple
    };
  });
}

/**
 * Evaluate attendance cell for a student in a specific session.
 * Match criteria: studentId or id.
 */
export function evaluateMatrixCell(
  student: Student,
  session: AttendanceSession,
  recordMap: Map<string, AttendanceRecord>
): MatrixCellData {
  const normStudentId = (student.studentId || '').trim().toUpperCase();
  const normId = (student.id || '').trim().toUpperCase();

  // Try finding record by studentId or id
  const record = 
    recordMap.get(`${session.id}_${normStudentId}`) ||
    recordMap.get(`${session.id}_${normId}`) ||
    recordMap.get(`${session.id}_${student.studentId}`) ||
    recordMap.get(`${session.id}_${student.id}`);

  if (record) {
    if (record.status === 'PRESENT') {
      return {
        sessionId: session.id,
        studentId: student.id,
        status: 'PRESENT',
        symbol: '✓',
        label: 'Hadir',
        colorClass: 'text-emerald-700 font-bold',
        bgClass: 'bg-emerald-50/60',
        record
      };
    }
    if (record.status === 'LATE') {
      return {
        sessionId: session.id,
        studentId: student.id,
        status: 'LATE',
        symbol: 'L',
        label: 'Lewat',
        colorClass: 'text-amber-700 font-bold',
        bgClass: 'bg-amber-50/60',
        record
      };
    }
    if (record.status === 'EXCUSED') {
      return {
        sessionId: session.id,
        studentId: student.id,
        status: 'EXCUSED',
        symbol: 'E',
        label: 'Kebenaran',
        colorClass: 'text-blue-700 font-bold',
        bgClass: 'bg-blue-50/60',
        record
      };
    }
    if (record.status === 'ABSENT') {
      return {
        sessionId: session.id,
        studentId: student.id,
        status: 'ABSENT',
        symbol: 'A',
        label: 'Tidak Hadir',
        colorClass: 'text-rose-700 font-bold',
        bgClass: 'bg-rose-50/60',
        record
      };
    }
  }

  // No record found:
  // If session is closed/archived -> ABSENT ('A')
  // If session is still OPEN -> empty cell ('')
  if (session.status === 'CLOSED' || session.status === 'ARCHIVED') {
    return {
      sessionId: session.id,
      studentId: student.id,
      status: 'ABSENT',
      symbol: 'A',
      label: 'Tidak Hadir',
      colorClass: 'text-rose-700 font-bold',
      bgClass: 'bg-rose-50/50'
    };
  }

  // Sesi masih OPEN
  return {
    sessionId: session.id,
    studentId: student.id,
    status: 'OPEN_EMPTY',
    symbol: '',
    label: 'Belum Diimbas / Sesi Aktif',
    colorClass: 'text-slate-400',
    bgClass: ''
  };
}

/**
 * Builds the complete matrix data structure with pre-indexed lookups for peak performance.
 */
export function buildAttendanceMatrix(
  students: Student[],
  sessions: AttendanceSession[],
  attendanceRecords: AttendanceRecord[],
  selectedClass: string,
  selectedSubjectCode: string,
  selectedSubjectName: string
): AttendanceMatrixData {
  const columns = getMatrixSessionColumns(sessions);

  // Fast compound key map: `${sessionId}_${normStudentId}` -> record
  const recordMap = new Map<string, AttendanceRecord>();
  attendanceRecords.forEach((r) => {
    if (!r.sessionId || !r.studentId) return;
    const norm = r.studentId.trim().toUpperCase();
    recordMap.set(`${r.sessionId}_${norm}`, r);
    recordMap.set(`${r.sessionId}_${r.studentId}`, r);
  });

  // Sort students alphabetically by name
  const sortedStudents = [...students].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', 'ms', { sensitivity: 'base' })
  );

  const totalSessionsCount = columns.length;
  let totalPercentagesSum = 0;
  let studentsBelow80 = 0;

  const rows: StudentMatrixRow[] = sortedStudents.map((st, idx) => {
    const cells: Record<string, MatrixCellData> = {};
    let presentCount = 0;

    columns.forEach((col) => {
      const cellData = evaluateMatrixCell(st, col.session, recordMap);
      cells[col.session.id] = cellData;

      // Count PRESENT and LATE as attending
      if (cellData.status === 'PRESENT' || cellData.status === 'LATE') {
        presentCount++;
      }
    });

    const percentage = totalSessionsCount > 0
      ? Math.round((presentCount / totalSessionsCount) * 100)
      : 0;

    const isWarning = totalSessionsCount > 0 && percentage < 80;
    if (isWarning) {
      studentsBelow80++;
    }
    totalPercentagesSum += percentage;

    return {
      no: idx + 1,
      student: st,
      className: st.className || selectedClass,
      name: (st.name || '').toUpperCase().trim(),
      studentId: st.studentId || st.id,
      cells,
      presentCount,
      totalSessions: totalSessionsCount,
      percentage,
      isWarning
    };
  });

  const classAveragePercentage = rows.length > 0
    ? Math.round(totalPercentagesSum / rows.length)
    : 0;

  return {
    selectedClass,
    selectedSubjectCode,
    selectedSubjectName,
    columns,
    rows,
    classAveragePercentage,
    studentsBelow80Count: studentsBelow80
  };
}

export interface ScopedSubjectOption {
  code: string;
  name: string;
}

/**
 * Derives the subjects available for a class.
 * CRITICAL PRIVACY & RBAC ENFORCEMENT:
 * When a lecturer is logged in (and not an Administrator), strictly filter to ONLY the subjects
 * assigned to that specific lecturer for the selected class. Subjects taught by other lecturers
 * or unassigned subjects MUST NEVER be displayed.
 */
export function getScopedSubjectsForClass(
  selectedClass: string,
  sessions: AttendanceSession[],
  teachingAssignments: TeachingAssignment[] = [],
  subjects: Subject[] = [],
  activeLecturer: Lecturer | null | undefined,
  isAdmin: boolean = false
): ScopedSubjectOption[] {
  const subjectMap = new Map<string, string>(); // code -> name
  const isLecturerRestricted = Boolean(activeLecturer && !isAdmin && activeLecturer.role !== 'ADMIN');

  if (isLecturerRestricted && activeLecturer) {
    const lecId = (activeLecturer.id || '').trim().toLowerCase();
    const lecEmail = (activeLecturer.email || '').trim().toLowerCase();
    const lecName = (activeLecturer.name || '').trim().toLowerCase();

    // 1. From authorized sessions for this class (sessions already filtered & authorized for this lecturer)
    sessions.forEach((s) => {
      if (areClassesMatching(s.className, selectedClass) && s.subjectCode) {
        const code = s.subjectCode.trim().toUpperCase();
        const name = s.subjectName || code;
        subjectMap.set(code, name);
      }
    });

    // 2. From teaching assignments belonging to this lecturer for this class
    (teachingAssignments || []).forEach((ta) => {
      const isActive = ta.status === 'ACTIVE' || !ta.status;
      const matchId = Boolean(ta.lecturerId && ta.lecturerId.trim().toLowerCase() === lecId);
      const matchEmail = Boolean(ta.lecturerEmail && lecEmail && ta.lecturerEmail.trim().toLowerCase() === lecEmail);
      const matchName = Boolean(ta.lecturerName && lecName && ta.lecturerName.trim().toLowerCase() === lecName);
      const isLecturerMatch = matchId || matchEmail || matchName;
      const isClassMatch = areClassesMatching(ta.className, selectedClass);

      if (isActive && isLecturerMatch && isClassMatch && ta.subjectCode) {
        const code = ta.subjectCode.trim().toUpperCase();
        const name = ta.subjectName || code;
        if (!subjectMap.has(code)) {
          subjectMap.set(code, name);
        }
      }
    });

    // 3. From activeLecturer.assignedSubjects (only if lecturer is assigned to selectedClass)
    const lecturerAssignedClasses = [
      ...(activeLecturer.assignedClasses || []),
      ...(activeLecturer.assignedSections || [])
    ];
    const isClassAssignedToLecturer =
      lecturerAssignedClasses.length === 0 ||
      lecturerAssignedClasses.some((c) => areClassesMatching(c, selectedClass));

    if (isClassAssignedToLecturer && activeLecturer.assignedSubjects) {
      activeLecturer.assignedSubjects.forEach((subStr) => {
        if (!subStr || !subStr.trim()) return;
        let code = subStr.trim();
        let name = '';
        if (subStr.includes('-')) {
          const parts = subStr.split('-');
          code = parts[0].trim();
          name = parts.slice(1).join('-').trim();
        }
        const cleanCode = code.toUpperCase();

        // Check if catalog lists this subject for this class
        const catalogSub = subjects.find(
          (s) => (s.code || '').trim().toUpperCase() === cleanCode
        );
        const matchClassSection = !catalogSub ||
          (catalogSub.sections || []).length === 0 ||
          (catalogSub.sections || []).some((sec) => areClassesMatching(sec, selectedClass));

        if (matchClassSection && !subjectMap.has(cleanCode)) {
          subjectMap.set(cleanCode, name || catalogSub?.name || cleanCode);
        }
      });
    }

    // 4. From subjects catalog where this lecturer is explicitly assigned
    subjects.forEach((sub) => {
      const matchId = Boolean(sub.lecturerId && sub.lecturerId.trim().toLowerCase() === lecId);
      const matchEmail = Boolean(sub.lecturerEmail && lecEmail && sub.lecturerEmail.trim().toLowerCase() === lecEmail);
      const matchName = Boolean(sub.lecturerName && lecName && sub.lecturerName.trim().toLowerCase() === lecName);
      const isLecOwner = matchId || matchEmail || matchName;
      const matchSection = (sub.sections || []).some((sec) => areClassesMatching(sec, selectedClass));

      if (isLecOwner && matchSection && sub.code) {
        const cleanCode = sub.code.trim().toUpperCase();
        if (!subjectMap.has(cleanCode)) {
          subjectMap.set(cleanCode, sub.name || cleanCode);
        }
      }
    });
  } else {
    // Admin Mode: Institutional oversight across all college subjects for this class
    // 1. From sessions for this class
    sessions.forEach((s) => {
      if (areClassesMatching(s.className, selectedClass) && s.subjectCode) {
        const code = s.subjectCode.trim().toUpperCase();
        const name = s.subjectName || code;
        if (!subjectMap.has(code)) {
          subjectMap.set(code, name);
        }
      }
    });

    // 2. From teaching assignments for this class
    (teachingAssignments || []).forEach((ta) => {
      if (areClassesMatching(ta.className, selectedClass) && ta.subjectCode) {
        const code = ta.subjectCode.trim().toUpperCase();
        const name = ta.subjectName || code;
        if (!subjectMap.has(code)) {
          subjectMap.set(code, name);
        }
      }
    });

    // 3. From subjects catalog matching sections
    subjects.forEach((sub) => {
      const matchSection = (sub.sections || []).some((sec) => areClassesMatching(sec, selectedClass));
      if (matchSection && sub.code) {
        const code = sub.code.trim().toUpperCase();
        const name = sub.name || code;
        if (!subjectMap.has(code)) {
          subjectMap.set(code, name);
        }
      }
    });
  }

  return Array.from(subjectMap.entries())
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.code.localeCompare(b.code));
}
