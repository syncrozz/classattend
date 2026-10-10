import { Student, AttendanceSession, AttendanceRecord, Subject, Enrollment, TeachingAssignment, Lecturer } from '../types';
import { areClassesMatching, normalizeClassCode } from './classHelper';

export const MONTH_NAMES_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Format date string (YYYY-MM-DD or ISO) to "DD-MMM" (e.g. "10-Oct", "12-Oct")
 */
export function formatSessionMatrixDate(dateStr?: string): string {
  if (!dateStr) return '-';
  const clean = dateStr.trim();
  
  // Try YYYY-MM-DD
  const parts = clean.split('-');
  if (parts.length === 3) {
    const day = parseInt(parts[2], 10);
    const monthIdx = parseInt(parts[1], 10) - 1;
    if (!isNaN(day) && monthIdx >= 0 && monthIdx < 12) {
      return `${day}-${MONTH_NAMES_EN[monthIdx]}`;
    }
  }

  // Fallback to Date object parsing
  const d = new Date(clean);
  if (!isNaN(d.getTime())) {
    const day = d.getDate();
    const month = MONTH_NAMES_EN[d.getMonth()];
    return `${day}-${month}`;
  }

  return clean;
}

export interface MatrixSessionColumn {
  session: AttendanceSession;
  dateKey: string;
  displayDate: string; // e.g. "10-Oct"
  subLabel?: string; // e.g. "S1", "S2" if multiple sessions on same date
}

export type MatrixAttendanceStatus = 'PRESENT' | 'LATE' | 'EXCUSED' | 'ABSENT' | 'OPEN_EMPTY';

export interface MatrixCell {
  status: MatrixAttendanceStatus;
  symbol: string; // "/", "L", "E", "A", ""
  colorClass: string;
  tooltipText: string;
}

export interface MatrixStudentRow {
  index: number;
  student: Student;
  className: string;
  cells: Record<string, MatrixCell>; // sessionId -> MatrixCell
  presentCount: number;
  totalSessions: number;
  rate: number; // 0 - 100
  isBelowKPI: boolean; // rate < 80%
}

export interface AttendanceMatrixData {
  className: string;
  subjectCode: string;
  subjectName: string;
  sessionColumns: MatrixSessionColumn[];
  rows: MatrixStudentRow[];
  totalSessions: number;
  totalStudents: number;
  averageAttendanceRate: number;
  belowKpiCount: number;
}

export interface BuildMatrixParams {
  selectedClass: string;
  selectedSubjectCode: string;
  startDate?: string;
  endDate?: string;
  students: Student[];
  sessions: AttendanceSession[];
  attendanceRecords: AttendanceRecord[];
  enrollments?: Enrollment[];
}

/**
 * Builds authoritative attendance matrix data
 */
export function buildAttendanceMatrix({
  selectedClass,
  selectedSubjectCode,
  startDate,
  endDate,
  students,
  sessions,
  attendanceRecords,
  enrollments = []
}: BuildMatrixParams): AttendanceMatrixData {
  const normTargetClass = normalizeClassCode(selectedClass);
  const cleanSubjCode = (selectedSubjectCode || '').trim().toUpperCase();

  // 1. Filter sessions for this class and subject within date range
  const matchedSessions = sessions.filter((s) => {
    // Subject matching: subjectCode or subjectId
    const isSubjMatch =
      cleanSubjCode.length > 0 &&
      ((s.subjectCode && s.subjectCode.trim().toUpperCase() === cleanSubjCode) ||
        (s.subjectId && s.subjectId.trim().toUpperCase() === cleanSubjCode));

    if (!isSubjMatch) return false;

    // Class matching
    const isClassMatch =
      !s.className ||
      s.className === 'ALL' ||
      s.className === 'SEMUA' ||
      areClassesMatching(s.className, selectedClass);

    if (!isClassMatch) return false;

    // Date range filter (optional)
    if (startDate && startDate.trim().length > 0) {
      if (s.date && s.date < startDate.trim()) return false;
    }
    if (endDate && endDate.trim().length > 0) {
      if (s.date && s.date > endDate.trim()) return false;
    }

    return true;
  });

  // Sort sessions chronologically from earliest to latest
  matchedSessions.sort((a, b) => {
    const dateComp = (a.date || '').localeCompare(b.date || '');
    if (dateComp !== 0) return dateComp;
    const timeComp = (a.startTime || '').localeCompare(b.startTime || '');
    if (timeComp !== 0) return timeComp;
    return (a.createdAt || '').localeCompare(b.createdAt || '');
  });

  // Count occurrences of each date to assign S1, S2 sublabels
  const dateCounts = new Map<string, number>();
  matchedSessions.forEach((s) => {
    const formatted = formatSessionMatrixDate(s.date);
    dateCounts.set(formatted, (dateCounts.get(formatted) || 0) + 1);
  });

  const dateRunningIndex = new Map<string, number>();
  const sessionColumns: MatrixSessionColumn[] = matchedSessions.map((s) => {
    const displayDate = formatSessionMatrixDate(s.date);
    const totalOnDate = dateCounts.get(displayDate) || 1;
    let subLabel: string | undefined = undefined;

    if (totalOnDate > 1) {
      const currentIdx = (dateRunningIndex.get(displayDate) || 0) + 1;
      dateRunningIndex.set(displayDate, currentIdx);
      subLabel = `S${currentIdx}`;
    }

    return {
      session: s,
      dateKey: s.date || '',
      displayDate,
      subLabel
    };
  });

  // 2. Identify students for this class and subject
  // Filter students from scoped roster
  let targetStudents = students.filter((st) => areClassesMatching(st.className, selectedClass));

  // If active enrollments exist for this subject & class, prioritize enrollments
  if (enrollments && enrollments.length > 0 && cleanSubjCode) {
    const activeEnrollments = enrollments.filter((e) => {
      const matchSub = (e.subjectCode || '').trim().toUpperCase() === cleanSubjCode;
      const matchClass =
        !e.className ||
        e.className === 'ALL' ||
        areClassesMatching(e.className, selectedClass);
      const isActive = e.status === 'ACTIVE' || (!e.status && e.status !== 'DROPPED');
      return matchSub && matchClass && isActive;
    });

    if (activeEnrollments.length > 0) {
      const enrolledIdSet = new Set(
        activeEnrollments.map((e) => (e.studentId || '').trim().toUpperCase())
      );
      const matchedEnrolled = students.filter((s) => {
        const sid = (s.studentId || '').trim().toUpperCase();
        const id = (s.id || '').trim().toUpperCase();
        return enrolledIdSet.has(sid) || enrolledIdSet.has(id);
      });
      if (matchedEnrolled.length > 0) {
        targetStudents = matchedEnrolled;
      }
    }
  }

  // Sort students alphabetically by name
  targetStudents.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  // 3. Pre-index attendance records for fast O(1) lookup: `${sessionId}_${studentId}`
  const recordLookup = new Map<string, AttendanceRecord>();
  attendanceRecords.forEach((r) => {
    if (r.sessionId && r.studentId) {
      const key = `${r.sessionId}_${r.studentId.trim().toUpperCase()}`;
      recordLookup.set(key, r);
    }
  });

  // Subject title resolution
  const firstSession = matchedSessions[0];
  const subjectName = firstSession?.subjectName || '';

  // 4. Build student rows
  let totalClassRateSum = 0;
  let belowKpiCount = 0;

  const rows: MatrixStudentRow[] = targetStudents.map((student, idx) => {
    const cells: Record<string, MatrixCell> = {};
    let presentCount = 0;

    const sIdUpper = (student.studentId || '').trim().toUpperCase();
    const idUpper = (student.id || '').trim().toUpperCase();

    sessionColumns.forEach(({ session }) => {
      // Find matching record
      const rec =
        recordLookup.get(`${session.id}_${sIdUpper}`) ||
        recordLookup.get(`${session.id}_${idUpper}`);

      let cell: MatrixCell;

      if (rec) {
        if (rec.status === 'PRESENT') {
          cell = {
            status: 'PRESENT',
            symbol: '/',
            colorClass: 'text-emerald-700 font-black text-base',
            tooltipText: `Hadir (${session.date} ${session.startTime || ''})`
          };
          presentCount++;
        } else if (rec.status === 'LATE') {
          cell = {
            status: 'LATE',
            symbol: 'L',
            colorClass: 'text-amber-700 font-black text-sm',
            tooltipText: `Hadir Lewat (${session.date})`
          };
          presentCount++;
        } else if (rec.status === 'EXCUSED') {
          cell = {
            status: 'EXCUSED',
            symbol: 'E',
            colorClass: 'text-blue-700 font-black text-sm',
            tooltipText: `Kebenaran / Excused (${session.date})`
          };
          // Excused counts towards attendance rate
          presentCount++;
        } else {
          // ABSENT record explicitly created
          cell = {
            status: 'ABSENT',
            symbol: 'A',
            colorClass: 'text-rose-600 font-black text-sm',
            tooltipText: `Tidak Hadir (${session.date})`
          };
        }
      } else {
        // No record exists
        if (session.status === 'CLOSED') {
          cell = {
            status: 'ABSENT',
            symbol: 'A',
            colorClass: 'text-rose-600 font-black text-sm',
            tooltipText: `Tidak Hadir (Sesi Ditutup)`
          };
        } else {
          // Session is still OPEN -> cell remains empty
          cell = {
            status: 'OPEN_EMPTY',
            symbol: '',
            colorClass: 'text-slate-400 font-normal text-xs',
            tooltipText: `Sesi Sedang Berlangsung (Belum Ditamatkan)`
          };
        }
      }

      cells[session.id] = cell;
    });

    const totalSessions = sessionColumns.length;
    const rate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;
    const isBelowKPI = totalSessions > 0 && rate < 80;

    if (isBelowKPI) {
      belowKpiCount++;
    }
    totalClassRateSum += rate;

    return {
      index: idx + 1,
      student,
      className: student.className || selectedClass,
      cells,
      presentCount,
      totalSessions,
      rate,
      isBelowKPI
    };
  });

  const totalStudents = rows.length;
  const averageAttendanceRate = totalStudents > 0 ? Math.round(totalClassRateSum / totalStudents) : 0;

  return {
    className: selectedClass,
    subjectCode: cleanSubjCode,
    subjectName,
    sessionColumns,
    rows,
    totalSessions: sessionColumns.length,
    totalStudents,
    averageAttendanceRate,
    belowKpiCount
  };
}
