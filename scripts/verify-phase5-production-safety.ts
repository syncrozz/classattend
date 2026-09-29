/**
 * CLASS ATTEND — PHASE 5 PRODUCTION SAFETY & OPERATIONAL READINESS SUITE
 * Standard: SYNCROZZ ENGINEERING STANDARD (SES) v4.4
 * Scope: Session Safety, Data Integrity, Idempotency, Authorization Boundaries,
 *        Backup/Recovery, Import Safety, and Network/Failure Resilience.
 */

// Polyfill localStorage for Node test environment
const store: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, val: string) => {
    store[key] = val;
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    Object.keys(store).forEach((k) => delete store[k]);
  }
};

import {
  AttendanceSession,
  Lecturer,
  Subject,
  TeachingAssignment,
  Student,
  Enrollment,
  AttendanceRecord
} from '../src/types';
import { attendanceEngine } from '../src/services/attendanceEngine';
import { accessManager } from '../src/services/accessManager';
import { trustedAuthService } from '../src/services/trustedAuthService';
import {
  isLecturerAuthorizedForSession,
  filterAuthorizedSessions,
  filterAuthorizedAttendanceRecords,
  calculateAttendanceMetrics,
  formatSafeEndTime
} from '../src/utils/sessionAuth';
import {
  deriveSessionTargetStudents,
  deriveAbsentStudents,
  formatAbsentListText
} from '../src/utils/absentHelper';
import {
  parseStudentCSVWithReport,
  parseSubjectCSVWithReport,
  exportSessionAttendanceToCSV,
  exportScannedAttendeesOnlyToCSV,
  exportAllAttendanceRecordsToCSV,
  generateAttendanceBackupJSON
} from '../src/utils/csvHelper';

interface SafetyVerificationResult {
  category: string;
  test: string;
  expected: string;
  actual: string;
  status: 'PASS' | 'FAIL';
  evidence: string;
}

const results: SafetyVerificationResult[] = [];

function assert(
  category: string,
  test: string,
  condition: boolean,
  expected: string,
  actual: string,
  evidence: string
) {
  results.push({
    category,
    test,
    expected,
    actual,
    status: condition ? 'PASS' : 'FAIL',
    evidence
  });
}

console.log('================================================================');
console.log('SES v4.4 | PHASE 5 OPERATIONAL READINESS & PRODUCTION SAFETY AUDIT');
console.log('================================================================\n');

// ---------------------------------------------------------------------------
// 1. SETUP AUTHORITATIVE TEST ENVIRONMENT
// ---------------------------------------------------------------------------
const mockLecturerKhairi: Lecturer = {
  id: 'LEC-KHAIRI-001',
  name: 'Ahmad Khairi bin Mohd',
  email: 'khairi@bpenawar.kpm.edu.my',
  department: 'Pengajian Am',
  phone: '0123456789',
  role: 'LECTURER',
  status: 'ACTIVE',
  pin: '1234',
  icNumber: '800101-01-1234'
};

const mockLecturerSiti: Lecturer = {
  id: 'LEC-SITI-002',
  name: 'Siti Aminah binti Zulkifli',
  email: 'siti@bpenawar.kpm.edu.my',
  department: 'Jabatan Perakaunan',
  phone: '0198765432',
  role: 'LECTURER',
  status: 'ACTIVE',
  pin: '5678',
  icNumber: '850505-01-5678'
};

const mockAdminUser: Lecturer = {
  id: 'ADMIN-001',
  name: 'Pentadbir Sistem',
  email: 'admin@bpenawar.kpm.edu.my',
  department: 'Pentadbiran',
  phone: '01122334455',
  role: 'ADMIN',
  status: 'ACTIVE',
  pin: '9999',
  icNumber: '750303-01-9999'
};

const mockSubjectMPU: Subject = {
  id: 'SUB-MPU2162',
  code: 'MPU2162',
  name: 'Pengajian Malaysia 2',
  department: 'Pengajian Am',
  sections: ['DIA4B']
};

const mockSubjectACC: Subject = {
  id: 'SUB-ACC1013',
  code: 'ACC1013',
  name: 'Financial Accounting 1',
  department: 'Jabatan Perakaunan',
  sections: ['DIA4A']
};

const mockAssignmentKhairi: TeachingAssignment = {
  id: 'TA-KHAIRI-DIA4B',
  lecturerId: 'LEC-KHAIRI-001',
  lecturerEmail: 'khairi@bpenawar.kpm.edu.my',
  lecturerName: 'Ahmad Khairi bin Mohd',
  subjectId: 'SUB-MPU2162',
  subjectCode: 'MPU2162',
  subjectName: 'Pengajian Malaysia 2',
  className: 'DIA4B',
  status: 'ACTIVE',
  createdAt: '2026-09-01T08:00:00Z'
};

const mockAssignmentSiti: TeachingAssignment = {
  id: 'TA-SITI-DIA4A',
  lecturerId: 'LEC-SITI-002',
  lecturerEmail: 'siti@bpenawar.kpm.edu.my',
  lecturerName: 'Siti Aminah binti Zulkifli',
  subjectId: 'SUB-ACC1013',
  subjectCode: 'ACC1013',
  subjectName: 'Financial Accounting 1',
  className: 'DIA4A',
  status: 'ACTIVE',
  createdAt: '2026-09-01T08:00:00Z'
};

const studentA: Student = {
  id: 'PDA-2502-001',
  studentId: 'PDA-2502-001',
  name: 'Muhammad Arif bin Farhan',
  className: 'DIA4B',
  email: 'arif@student.kpm.edu.my',
  phone: '0123450001',
  department: 'Diploma Perakaunan'
};

const studentB: Student = {
  id: 'PDA-2502-002',
  studentId: 'PDA-2502-002',
  name: 'Nurul Huda binti Rosli',
  className: 'DIA4B',
  email: 'huda@student.kpm.edu.my',
  phone: '0123450002',
  department: 'Diploma Perakaunan'
};

const studentC: Student = {
  id: 'PDA-2502-003',
  studentId: 'PDA-2502-003',
  name: 'Amirul Hakim bin Daud',
  className: 'DIA4B',
  email: 'amirul@student.kpm.edu.my',
  phone: '0123450003',
  department: 'Diploma Perakaunan'
};

const studentOtherClass: Student = {
  id: 'PDA-2502-099',
  studentId: 'PDA-2502-099',
  name: 'Zulhilmi bin Osman',
  className: 'DIA4A',
  email: 'zul@student.kpm.edu.my',
  phone: '0123450099',
  department: 'Diploma Perakaunan'
};

// Seed engine for testing
attendanceEngine.saveStudentsList([studentA, studentB, studentC, studentOtherClass]);
attendanceEngine.saveSubjects([mockSubjectMPU, mockSubjectACC]);

// ---------------------------------------------------------------------------
// 2. AUDIT: SESSION LIFECYCLE & SAFETY (Section 4)
// ---------------------------------------------------------------------------
// 2A: Activate OPEN session
const activation = attendanceEngine.activateClassSession(
  mockSubjectMPU,
  'DIA4B',
  mockLecturerKhairi,
  mockAssignmentKhairi.id
);
const openSession = activation.session;

assert(
  'Session Safety',
  'Activate class session sets status to OPEN with timestamp',
  openSession.status === 'OPEN' && openSession.startTime.length > 0 && openSession.endTime === '',
  'status: OPEN, startTime present, endTime: ""',
  `status: ${openSession.status}, startTime: "${openSession.startTime}", endTime: "${openSession.endTime}"`,
  'Class session opens cleanly with authoritative metadata'
);

// 2B: Record attendance during OPEN session
const scanResult1 = attendanceEngine.processScan(
  studentA.studentId,
  'CAMERA_SCAN',
  openSession.id,
  mockLecturerKhairi
);

assert(
  'Session Safety',
  'Attendance is successfully recorded during OPEN session',
  scanResult1.success === true && scanResult1.code === 'RECORDED',
  'success: true, code: RECORDED',
  `success: ${scanResult1.success}, code: ${scanResult1.code}`,
  'Valid QR scanned and recorded when session is OPEN'
);

// 2C: Close session and verify status & endTime freeze
const initialClosedEndTime = '10:30 AM';
const closedSessions = attendanceEngine.setSessionStatus(openSession.id, 'CLOSED');
const closedSession = closedSessions.find((s) => s.id === openSession.id)!;

assert(
  'Session Safety',
  'Closing session sets status to CLOSED and records endTime',
  closedSession.status === 'CLOSED' && closedSession.endTime.length > 0,
  'status: CLOSED, endTime set',
  `status: ${closedSession.status}, endTime: "${closedSession.endTime}"`,
  'Session transitioned to CLOSED with locked endTime'
);

// 2D: Illegal transition CLOSED -> OPEN must be rejected
const illegalReopened = attendanceEngine.setSessionStatus(closedSession.id, 'OPEN');
const sessionAfterIllegalOpen = illegalReopened.find((s) => s.id === closedSession.id)!;

assert(
  'Session Safety',
  'Illegal transition CLOSED -> OPEN is strictly rejected',
  sessionAfterIllegalOpen.status === 'CLOSED',
  'status remains CLOSED (OPEN rejected)',
  `status: ${sessionAfterIllegalOpen.status}`,
  'CLOSED session cannot be transitioned back to OPEN'
);

// 2E: Illegal transition via updateSession must also be rejected
const illegalUpdate = attendanceEngine.updateSession({
  ...closedSession,
  status: 'OPEN'
});
const sessionAfterIllegalUpdate = illegalUpdate.find((s) => s.id === closedSession.id)!;

assert(
  'Session Safety',
  'Illegal transition CLOSED -> OPEN via updateSession is strictly rejected',
  sessionAfterIllegalUpdate.status === 'CLOSED',
  'status remains CLOSED',
  `status: ${sessionAfterIllegalUpdate.status}`,
  'Direct object mutation cannot bypass CLOSED lock'
);

// 2F: Rejection of new attendance on CLOSED session
const scanOnClosed = attendanceEngine.processScan(
  studentB.studentId,
  'CAMERA_SCAN',
  closedSession.id,
  mockLecturerKhairi
);

assert(
  'Session Safety',
  'New attendance scanning on CLOSED session is rejected with SESSION_CLOSED code',
  scanOnClosed.success === false && scanOnClosed.code === 'SESSION_CLOSED',
  'success: false, code: SESSION_CLOSED',
  `success: ${scanOnClosed.success}, code: ${scanOnClosed.code}, msg: "${scanOnClosed.message}"`,
  'CLOSED session rejects new check-ins with clear operational message'
);

// 2G: Direct addAttendanceRecord on CLOSED session is rejected
const prevRecordCount = attendanceEngine.getAttendanceRecords().length;
attendanceEngine.addAttendanceRecord({
  id: `REC-ILLEGAL-${Date.now()}`,
  sessionId: closedSession.id,
  studentId: studentC.id,
  timestamp: new Date().toISOString(),
  status: 'PRESENT',
  method: 'MANUAL'
});
const newRecordCount = attendanceEngine.getAttendanceRecords().length;

assert(
  'Session Safety',
  'Direct addAttendanceRecord on CLOSED session is blocked (defense in depth)',
  newRecordCount === prevRecordCount,
  `Records count unchanged (${prevRecordCount})`,
  `Records count: ${newRecordCount}`,
  'attendanceEngine rejects low-level writes to CLOSED sessions'
);

// 2H: Single Active Session Invariant (1 Pensyarah = Maksimum 1 Sesi Aktif)
// Open session 1 for Khairi
const khairiSess1 = attendanceEngine.activateClassSession(
  mockSubjectMPU,
  'DIA4B',
  mockLecturerKhairi,
  mockAssignmentKhairi.id
).session;

// Open session 2 for Khairi with another class (DIA3A) -> Session 1 must be auto-closed
const khairiSess2Activation = attendanceEngine.activateClassSession(
  mockSubjectMPU,
  'DIA3A',
  mockLecturerKhairi,
  mockAssignmentKhairi.id
);
const khairiSess2 = khairiSess2Activation.session;

const allKhairiOpenSessions = attendanceEngine
  .getSessions()
  .filter((s) => s.status === 'OPEN' && s.lecturerId === mockLecturerKhairi.id);

const sess1AfterAutoClose = attendanceEngine.getSessions().find((s) => s.id === khairiSess1.id)!;

assert(
  'Session Safety',
  'Opening a new session for a lecturer automatically closes the previous session (1 Pensyarah = 1 Sesi Aktif)',
  allKhairiOpenSessions.length === 1 &&
    allKhairiOpenSessions[0].id === khairiSess2.id &&
    sess1AfterAutoClose.status === 'CLOSED' &&
    sess1AfterAutoClose.endTime.length > 0,
  'Exactly 1 OPEN session for lecturer; previous session transitioned to CLOSED',
  `Open sessions count: ${allKhairiOpenSessions.length}, Previous session status: ${sess1AfterAutoClose.status}, endTime: "${sess1AfterAutoClose.endTime}"`,
  'Single active session invariant strictly enforced'
);

// ---------------------------------------------------------------------------
// 3. AUDIT: DUPLICATE SCAN & IDEMPOTENCY (Section 6)
// ---------------------------------------------------------------------------
// Open a new test session to test rapid duplicate scans
const dupSessionActivation = attendanceEngine.activateClassSession(
  mockSubjectMPU,
  'DIA4B',
  mockLecturerKhairi,
  mockAssignmentKhairi.id
);
const dupSession = dupSessionActivation.session;

// Scan 1: First scan
const scan1 = attendanceEngine.processScan(studentA.studentId, 'CAMERA_SCAN', dupSession.id, mockLecturerKhairi);
// Scan 2: Rapid second scan
const scan2 = attendanceEngine.processScan(studentA.studentId, 'CAMERA_SCAN', dupSession.id, mockLecturerKhairi);
// Scan 3: Third scan
const scan3 = attendanceEngine.processScan(studentA.studentId, 'CAMERA_SCAN', dupSession.id, mockLecturerKhairi);
// Scan 4: Fourth scan
const scan4 = attendanceEngine.processScan(studentA.studentId, 'CAMERA_SCAN', dupSession.id, mockLecturerKhairi);

const recordsForStudentA = attendanceEngine
  .getAttendanceRecords()
  .filter((r) => r.sessionId === dupSession.id && r.studentId === studentA.id);

assert(
  'Duplicate & Idempotency',
  '4 rapid scans for Student A produce exactly 1 attendance record and 3 ALREADY_RECORDED responses',
  scan1.success === true &&
    scan2.success === false &&
    scan2.isDuplicate === true &&
    scan3.isDuplicate === true &&
    scan4.isDuplicate === true &&
    recordsForStudentA.length === 1,
  '1 valid record, 3 duplicate rejections',
  `Records: ${recordsForStudentA.length}, Scan 2 code: ${scan2.code}, Scan 3 code: ${scan3.code}, Scan 4 code: ${scan4.code}`,
  'Idempotent scanning strictly prevents duplicate attendance records'
);

// Low-level addAttendanceRecord idempotency
attendanceEngine.addAttendanceRecord({
  id: `REC-MANUAL-DUP-${Date.now()}`,
  sessionId: dupSession.id,
  studentId: studentA.id,
  timestamp: new Date().toISOString(),
  status: 'PRESENT',
  method: 'MANUAL'
});
const recordsAfterManualAttempt = attendanceEngine
  .getAttendanceRecords()
  .filter((r) => r.sessionId === dupSession.id && r.studentId === studentA.id);

assert(
  'Duplicate & Idempotency',
  'Low-level addAttendanceRecord idempotency check blocks duplicate PRESENT record',
  recordsAfterManualAttempt.length === 1,
  'Records count remains 1',
  `Records count: ${recordsAfterManualAttempt.length}`,
  'Direct write deduplication guarantees idempotency'
);

// ---------------------------------------------------------------------------
// 4. AUDIT: AUTHORIZATION BOUNDARIES (Section 7)
// ---------------------------------------------------------------------------
// 4A: Lecturer Khairi is authorized for his DIA4B session
const khairiAuth = isLecturerAuthorizedForSession(
  dupSession,
  mockLecturerKhairi,
  false,
  [mockAssignmentKhairi, mockAssignmentSiti]
);

assert(
  'Authorization Boundary',
  'Lecturer is authorized for their assigned class and session',
  khairiAuth === true,
  'true (authorized)',
  `khairiAuth: ${khairiAuth}`,
  'Lecturer can access their own session'
);

// 4B: Lecturer Siti CANNOT access Lecturer Khairi's DIA4B session
const sitiAuthOnKhairiSession = isLecturerAuthorizedForSession(
  dupSession,
  mockLecturerSiti,
  false,
  [mockAssignmentKhairi, mockAssignmentSiti]
);

assert(
  'Authorization Boundary',
  'Lecturer Siti cannot access Lecturer Khairi\'s session',
  sitiAuthOnKhairiSession === false,
  'false (unauthorized)',
  `sitiAuthOnKhairiSession: ${sitiAuthOnKhairiSession}`,
  'Cross-lecturer session access is strictly blocked'
);

// 4C: Unauthorized scan attempt rejected by engine
const unauthorizedScan = attendanceEngine.processScan(
  studentB.studentId,
  'CAMERA_SCAN',
  dupSession.id,
  mockLecturerSiti
);

assert(
  'Authorization Boundary',
  'Scan attempt by unauthorized lecturer is rejected with UNAUTHORIZED_LECTURER code',
  unauthorizedScan.success === false && unauthorizedScan.code === 'UNAUTHORIZED_LECTURER',
  'success: false, code: UNAUTHORIZED_LECTURER',
  `success: ${unauthorizedScan.success}, code: ${unauthorizedScan.code}`,
  'Real engine-level authorization boundary enforced'
);

// 4D: Admin has full oversight access
const adminAuthOnKhairiSession = isLecturerAuthorizedForSession(
  dupSession,
  mockAdminUser,
  true,
  [mockAssignmentKhairi, mockAssignmentSiti]
);

assert(
  'Authorization Boundary',
  'Administrator retains full oversight authorization for any session',
  adminAuthOnKhairiSession === true,
  'true (admin oversight granted)',
  `adminAuthOnKhairiSession: ${adminAuthOnKhairiSession}`,
  'Admin oversight intact'
);

// 4E: Roster / Class mismatch check: Student from DIA4A scanned in DIA4B session
const mismatchScan = attendanceEngine.processScan(
  studentOtherClass.studentId,
  'CAMERA_SCAN',
  dupSession.id,
  mockLecturerKhairi
);

assert(
  'Authorization Boundary',
  'Student from different class (DIA4A) scanned in DIA4B session returns CLASS_MISMATCH',
  mismatchScan.success === false && mismatchScan.code === 'CLASS_MISMATCH',
  'success: false, code: CLASS_MISMATCH',
  `success: ${mismatchScan.success}, code: ${mismatchScan.code}, msg: "${mismatchScan.message}"`,
  'Class boundary strictly enforced'
);

// ---------------------------------------------------------------------------
// 5. AUDIT: DATA INTEGRITY & ABSENT CALCULATION (Section 5)
// ---------------------------------------------------------------------------
// Test enrollment and absent calculation
const enrollmentA: Enrollment = {
  id: 'ENR-001',
  studentId: studentA.studentId,
  subjectCode: 'MPU2162',
  className: 'DIA4B',
  enrolledAt: '2026-09-01T00:00:00Z',
  status: 'ACTIVE'
};
const enrollmentB: Enrollment = {
  id: 'ENR-002',
  studentId: studentB.studentId,
  subjectCode: 'MPU2162',
  className: 'DIA4B',
  enrolledAt: '2026-09-01T00:00:00Z',
  status: 'ACTIVE'
};
const enrollmentC: Enrollment = {
  id: 'ENR-003',
  studentId: studentC.studentId,
  subjectCode: 'MPU2162',
  className: 'DIA4B',
  enrolledAt: '2026-09-01T00:00:00Z',
  status: 'ACTIVE'
};

const dia4bRoster = [studentA, studentB, studentC];
const dia4bEnrollments = [enrollmentA, enrollmentB, enrollmentC];

const targetStudents = deriveSessionTargetStudents(
  dupSession,
  dia4bRoster,
  dia4bEnrollments
);

// Student A is PRESENT, Student B & C have not scanned
const sessionRecords = attendanceEngine
  .getAttendanceRecords()
  .filter((r) => r.sessionId === dupSession.id);

const absentStudents = deriveAbsentStudents(targetStudents, sessionRecords);

assert(
  'Data Integrity',
  'Target roster matches active enrollments (3 students)',
  targetStudents.length === 3,
  '3 target students',
  `${targetStudents.length} target students derived`,
  'Roster derived from authoritative enrollments and students'
);

assert(
  'Data Integrity',
  'Derived absent strictly equals Roster minus Present (3 - 1 = 2)',
  absentStudents.length === 2 &&
    absentStudents.some((s) => s.id === studentB.id) &&
    absentStudents.some((s) => s.id === studentC.id) &&
    !absentStudents.some((s) => s.id === studentA.id),
  '2 absent students (Student B, Student C)',
  `${absentStudents.length} absent students: [${absentStudents.map((s) => s.name).join(', ')}]`,
  'Authoritative calculation without phantom records'
);

// Safe Metrics calculation (Division-by-zero protection)
const metricsZero = calculateAttendanceMetrics(0, 0, [], { subjectCode: 'TEST', className: 'NONE' });
assert(
  'Data Integrity',
  'calculateAttendanceMetrics protects against division-by-zero when targetCount is 0',
  metricsZero.attendancePercent === 0 && !isNaN(metricsZero.attendancePercent),
  'attendancePercent: 0 (not NaN)',
  `attendancePercent: ${metricsZero.attendancePercent}`,
  'Zero division safety verified'
);

// ---------------------------------------------------------------------------
// 6. AUDIT: DATA RECOVERY & BACKUP (Section 9)
// ---------------------------------------------------------------------------
// 6A: Session CSV Export
const sessionCsv = exportSessionAttendanceToCSV(
  dupSession,
  targetStudents,
  sessionRecords
);

assert(
  'Data Recovery',
  'Session attendance CSV export generates structured headers and rows',
  sessionCsv.includes('No_Pelajar') &&
    sessionCsv.includes('Nama_Pelajar') &&
    sessionCsv.includes('Status_Kehadiran') &&
    sessionCsv.includes('HADIR') &&
    sessionCsv.includes('TIDAK HADIR'),
  'CSV containing standard headers, HADIR, and TIDAK HADIR statuses',
  `CSV length: ${sessionCsv.length} chars`,
  'Export mechanism produces complete and uncorrupted tabular data'
);

// 6B: Scanned Attendees Only CSV Export
const attendeesOnlyCsv = exportScannedAttendeesOnlyToCSV(
  dupSession,
  targetStudents,
  sessionRecords
);

assert(
  'Data Recovery',
  'Scanned attendees only CSV includes exclusively verified PRESENT attendees',
  attendeesOnlyCsv.includes(studentA.studentId) && !attendeesOnlyCsv.includes(studentB.studentId),
  'Contains Student A, excludes Student B',
  `Contains Student A: ${attendeesOnlyCsv.includes(studentA.studentId)}, Contains Student B: ${attendeesOnlyCsv.includes(studentB.studentId)}`,
  'Attendees-only export accurately filters verified attendees'
);

// 6C: JSON Full Backup Generation
const jsonBackup = generateAttendanceBackupJSON(
  sessionRecords,
  targetStudents,
  [dupSession],
  mockLecturerKhairi.name
);
const parsedBackup = JSON.parse(jsonBackup);

assert(
  'Data Recovery',
  'JSON Backup produces valid JSON with metadata and intact records',
  parsedBackup.totalRecords === sessionRecords.length &&
    parsedBackup.totalSessions === 1 &&
    parsedBackup.records.length === sessionRecords.length,
  'Valid JSON with totalRecords and records array',
  `Total records in backup: ${parsedBackup.totalRecords}, exportedBy: "${parsedBackup.exportedBy}"`,
  'Full recovery JSON payload is syntactically sound and complete'
);

// ---------------------------------------------------------------------------
// 7. AUDIT: IMPORT & RESTORE SAFETY (Section 10)
// ---------------------------------------------------------------------------
// 7A: Empty File Safety
const emptyParse = parseStudentCSVWithReport('');
assert(
  'Import Safety',
  'Empty student CSV string safely returns empty result without throwing',
  emptyParse.students.length === 0 && emptyParse.totalRowsRead === 0,
  'students: [], totalRowsRead: 0',
  `students: ${emptyParse.students.length}, totalRowsRead: ${emptyParse.totalRowsRead}`,
  'Zero-length inputs handled gracefully'
);

// 7B: Malformed / Duplicate rows handling
const dirtyCsv = `
No_Pelajar,Nama_Pelajar,Kelas,No_Telefon
PDA-2502-010,SITI AISYAH,DIA_4B,0123456789
PDA-2502-010,SITI AISYAH,DIA_4B,0123456789
PDA-2502-011,,DIA_4B,0123456781
,PELAJAR TANPA ID,DIA_4B,0123456782
# Comment line to be skipped
JUMLAH PELAJAR: 4
`;
const dirtyParse = parseStudentCSVWithReport(dirtyCsv);

assert(
  'Import Safety',
  'Dirty CSV with duplicate rows, missing name, missing ID, and summary footer parses safely',
  dirtyParse.students.length >= 3 && dirtyParse.duplicateCount >= 1 && dirtyParse.skippedCount >= 1,
  'Sanitized rows >= 3, duplicate detected, comment/summary skipped',
  `students parsed: ${dirtyParse.students.length}, duplicates: ${dirtyParse.duplicateCount}, skipped: ${dirtyParse.skippedCount}`,
  'Sanitization and deduplication pipeline protects authoritative data'
);

// 7C: Subject CSV Parser with diverse delimiters
const semicolonCsv = `Kod;Nama;Jabatan\nACC1013;FINANCIAL ACCOUNTING 1;Jabatan Perakaunan\nMPU2162;PENGAJIAN MALAYSIA 2;Jabatan Pengajian Am`;
const subParse = parseSubjectCSVWithReport(semicolonCsv);

assert(
  'Import Safety',
  'Subject parser auto-detects delimiter (semicolon) and extracts valid subjects',
  subParse.subjects.length === 2 && subParse.subjects[0].code === 'ACC1013',
  '2 subjects parsed, delimiter auto-detected',
  `Parsed: ${subParse.subjects.length} subjects (first code: ${subParse.subjects[0]?.code})`,
  'Robust delimiter autodetection supports external spreadsheet exports'
);

// ---------------------------------------------------------------------------
// 8. AUDIT: STATE RESILIENCE & OFFLINE PERSISTENCE (Section 11)
// ---------------------------------------------------------------------------
// 8A: Verify LocalStorage persistence
const storedSessionsRaw = localStorage.getItem('classattend_sessions_v5');
const storedRecordsRaw = localStorage.getItem('classattend_records_v5');

assert(
  'Resilience & Persistence',
  'Sessions and attendance records are continuously persisted in localStorage',
  storedSessionsRaw !== null && storedRecordsRaw !== null,
  'LocalStorage contains session and record cache',
  `Stored sessions length: ${storedSessionsRaw?.length || 0} bytes, records length: ${storedRecordsRaw?.length || 0} bytes`,
  'Offline-first zero data-loss durability verified'
);

// 8B: Simulate browser reload by calling reloadFromStorageAndNotify
attendanceEngine.reloadFromStorageAndNotify();
const reloadedSessions = attendanceEngine.getSessions();
const reloadedRecords = attendanceEngine.getAttendanceRecords();

assert(
  'Resilience & Persistence',
  'Simulated page reload / restart restores sessions and attendance records without data loss',
  reloadedSessions.some((s) => s.id === dupSession.id) &&
    reloadedRecords.some((r) => r.sessionId === dupSession.id),
  'Sessions and records present after reload',
  `Reloaded sessions count: ${reloadedSessions.length}, reloaded records count: ${reloadedRecords.length}`,
  'Browser refresh / restart recovers complete active state'
);

// 8C: Safe End Time formatting helper
const formattedEndTimeOpen = formatSafeEndTime('', 'OPEN');
const formattedEndTimeClosed = formatSafeEndTime('10:45 AM', 'CLOSED');

assert(
  'Resilience & Persistence',
  'formatSafeEndTime displays "Sedang Berlangsung" for OPEN and actual time for CLOSED',
  formattedEndTimeOpen === 'Sedang Berlangsung' && formattedEndTimeClosed === '10:45 AM',
  'OPEN: "Sedang Berlangsung", CLOSED: "10:45 AM"',
  `OPEN: "${formattedEndTimeOpen}", CLOSED: "${formattedEndTimeClosed}"`,
  'Display formatting is resilient across session states'
);

// ---------------------------------------------------------------------------
// RESULTS SUMMARY
// ---------------------------------------------------------------------------
console.table(results);

const passedCount = results.filter((r) => r.status === 'PASS').length;
const failedCount = results.filter((r) => r.status === 'FAIL').length;

console.log(`\n================================================================`);
console.log(`PHASE 5 VERIFICATION AUDIT SUMMARY`);
console.log(`Total Criteria Tested: ${results.length}`);
console.log(`Passed: ${passedCount}`);
console.log(`Failed: ${failedCount}`);
console.log(`Score: ${((passedCount / results.length) * 100).toFixed(1)}%`);
console.log(`================================================================\n`);

if (failedCount > 0) {
  console.error('❌ PHASE 5 VERIFICATION AUDIT FAILED');
  process.exit(1);
} else {
  console.log('✅ ALL PHASE 5 OPERATIONAL READINESS & PRODUCTION SAFETY AUDITS PASSED WITH ZERO REGRESSIONS.');
  process.exit(0);
}
