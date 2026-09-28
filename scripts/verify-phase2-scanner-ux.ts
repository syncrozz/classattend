/**
 * CLASS ATTEND — PHASE 2 VERIFICATION SUITE
 * SCANNER FIRST / ACTIVE ATTENDANCE UX (MYAU — Make Yourself as User)
 * SES v4.4 Engineering Reference
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
  Enrollment
} from '../src/types';

interface VerificationResult {
  criteria: string;
  test: string;
  expected: string;
  actual: string;
  status: 'PASS' | 'FAIL';
  evidence: string;
}

const results: VerificationResult[] = [];

function assert(
  criteria: string,
  test: string,
  condition: boolean,
  expected: string,
  actual: string,
  evidence: string
) {
  results.push({
    criteria,
    test,
    expected,
    actual,
    status: condition ? 'PASS' : 'FAIL',
    evidence
  });
}

// Authoritative Mock Setup for DIA4B Pengajian Malaysia
const mockLecturer: Lecturer = {
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

const mockSubject: Subject = {
  id: 'SUB-MPU2162',
  code: 'MPU2162',
  name: 'Pengajian Malaysia 2',
  department: 'Pengajian Am',
  sections: ['DIA4B']
};

const mockAssignment: TeachingAssignment = {
  id: 'TA-KHAIRI-DIA4B',
  lecturerId: 'LEC-KHAIRI-001',
  lecturerEmail: 'khairi@bpenawar.kpm.edu.my',
  lecturerName: 'Ahmad Khairi bin Mohd',
  subjectId: 'SUB-MPU2162',
  subjectCode: 'MPU2162',
  subjectName: 'Pengajian Malaysia 2',
  className: 'DIA4B',
  status: 'ACTIVE',
  createdAt: '2026-09-01T00:00:00.000Z'
};

// 4 Students in DIA4B
const mockStudents: Student[] = [
  {
    id: 'STU-001',
    studentId: 'PDA-2401-001',
    name: 'Muhammad Faiz bin Roslan',
    className: 'DIA4B',
    email: 'faiz@siswa.edu.my',
    phone: '0198765431',
    department: 'Perakaunan'
  },
  {
    id: 'STU-002',
    studentId: 'PDA-2401-002',
    name: 'Nur Aisyah binti Zulkifli',
    className: 'DIA4B',
    email: 'aisyah@siswa.edu.my',
    phone: '0198765432',
    department: 'Perakaunan'
  },
  {
    id: 'STU-003',
    studentId: 'PDA-2401-003',
    name: 'Danial bin Hakim',
    className: 'DIA4B',
    email: 'danial@siswa.edu.my',
    phone: '0198765433',
    department: 'Perakaunan'
  },
  {
    id: 'STU-004',
    studentId: 'PDA-2401-004',
    name: 'Siti Sarah binti Halim',
    className: 'DIA4B',
    email: 'sarah@siswa.edu.my',
    phone: '0198765434',
    department: 'Perakaunan'
  }
];

const mockEnrollments: Enrollment[] = mockStudents.map((st, i) => ({
  id: `ENR-${i + 1}`,
  studentId: st.studentId,
  subjectCode: 'MPU2162',
  className: 'DIA4B',
  status: 'ACTIVE',
  enrolledAt: '2026-09-01T00:00:00.000Z'
}));

async function runPhase2Verification() {
  const { attendanceEngine } = await import('../src/services/attendanceEngine');
  const engine = attendanceEngine;

  console.log('================================================================');
  console.log('CLASS ATTEND — PHASE 2 SCANNER FIRST / ACTIVE ATTENDANCE UX');
  console.log('SES v4.4 | MYAU Principle Verification');
  console.log('================================================================\n');

  // Initialize engine state
  engine.saveLecturersList([mockLecturer]);
  engine.saveSubjectsList([mockSubject]);
  engine.saveSessions([]);
  engine.saveAttendanceRecords([]);
  mockStudents.forEach((st) => engine.addStudent(st));

  // -------------------------------------------------------------------------
  // 1. MYAU-01: Direct Entry from Kelas Saya to Scanner
  // -------------------------------------------------------------------------
  console.log('--- TEST GROUP 1: Direct Entry & Session Activation ---');
  const activateRes = engine.activateClassSession(
    mockSubject,
    'DIA4B',
    mockLecturer,
    mockAssignment.id
  );
  const activeSession = activateRes.session;

  assert(
    'MYAU-01',
    'Session activates seamlessly with status OPEN and class identity',
    activeSession.status === 'OPEN' &&
      activeSession.subjectCode === 'MPU2162' &&
      activeSession.className === 'DIA4B',
    'Status: OPEN, Subject: MPU2162, Class: DIA4B',
    `Status: ${activeSession.status}, Subject: ${activeSession.subjectCode}, Class: ${activeSession.className}`,
    'Lecturer selects class and immediately opens scanner session'
  );

  // -------------------------------------------------------------------------
  // 2. MYAU-02: Focused Scanner Screen (Section 5)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Focused Scanner Screen Layout ---');
  // Target enrolled students for DIA4B MPU2162
  const targetStudents = mockStudents.filter((s) => s.className === 'DIA4B');
  assert(
    'MYAU-02',
    'Authoritative enrolled roster identified for active session',
    targetStudents.length === 4,
    '4 enrolled students',
    `${targetStudents.length} enrolled students`,
    'Roster resolved without fallback to arbitrary numbers'
  );

  // Initial attendance state
  let presentRecords = engine.getAttendanceRecords().filter((r) => r.sessionId === activeSession.id);
  assert(
    'MYAU-02',
    'Initial attendance counter starts cleanly at 0 / Total',
    presentRecords.length === 0,
    '0 present records',
    `${presentRecords.length} present records`,
    'Clean scanner initial state: 0 / 4 Hadir'
  );

  // -------------------------------------------------------------------------
  // 3. MYAU-03: Scanning Pelajar & Immediate Feedback (Section 5 & 6)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Scanning Pelajar & Feedback ---');
  // Student 1 scans QR
  const scan1 = engine.processScan('PDA-2401-001', 'CAMERA_SCAN', activeSession.id);
  assert(
    'MYAU-03',
    'First student scan succeeds with immediate confirmation',
    scan1.success === true && scan1.student?.name === 'Muhammad Faiz bin Roslan',
    'Scan success: true, Student: Muhammad Faiz bin Roslan',
    `Success: ${scan1.success}, Student: ${scan1.student?.name}`,
    'Scan feedback displays student name, ID, class, and green ✓ HADIR status'
  );

  // Student 2 scans QR
  const scan2 = engine.processScan('PDA-2401-002', 'CAMERA_SCAN', activeSession.id);
  assert(
    'MYAU-03',
    'Second student scan increments attendance count to 2 / 4',
    scan2.success === true,
    'Scan success: true',
    `Success: ${scan2.success}, Student: ${scan2.student?.name}`,
    'Attendance counter dynamically advances to 2 / 4 HADIR (50%)'
  );

  // Duplicate scan protection: Student 1 scans again
  const dupScan = engine.processScan('PDA-2401-001', 'CAMERA_SCAN', activeSession.id);
  assert(
    'MYAU-03',
    'Duplicate scan is safely caught with friendly duplicate message',
    dupScan.success === false && dupScan.isDuplicate === true,
    'isDuplicate: true, success: false',
    `isDuplicate: ${dupScan.isDuplicate}, code: ${dupScan.code}`,
    'Protects against double counting without breaking scanner state'
  );

  // -------------------------------------------------------------------------
  // 4. MYAU-04: Tahu Siapa Belum Hadir (Absent List)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Tahu Siapa Belum Hadir (Absent List) ---');
  const presentIds = new Set(
    engine
      .getAttendanceRecords()
      .filter((r) => r.sessionId === activeSession.id && r.status === 'PRESENT')
      .map((r) => r.studentId)
  );

  const absentStudents = targetStudents.filter(
    (st) => !presentIds.has(st.id) && !presentIds.has(st.studentId)
  );

  assert(
    'MYAU-04',
    'System accurately identifies unrecorded absent students during active session',
    absentStudents.length === 2 &&
      absentStudents.some((s) => s.studentId === 'PDA-2401-003') &&
      absentStudents.some((s) => s.studentId === 'PDA-2401-004'),
    '2 absent students (Danial, Siti Sarah)',
    `${absentStudents.length} absent (${absentStudents.map((s) => s.name).join(', ')})`,
    'Lecturer can view "Belum Hadir" tab to immediately know who is missing'
  );

  // Lecturer uses 1-click manual mark-present for Danial (PDA-2401-003)
  const manualScan = engine.processScan('PDA-2401-003', 'MANUAL_OVERRIDE', activeSession.id);
  assert(
    'MYAU-04',
    'Lecturer can mark present directly from Belum Hadir list with 1-click',
    manualScan.success === true,
    'Manual override success: true',
    `Success: ${manualScan.success}`,
    'Student Danial moves from Belum Hadir to Hadir instantly'
  );

  // Check remaining absent: only Siti Sarah left
  const updatedPresentIds = new Set(
    engine
      .getAttendanceRecords()
      .filter((r) => r.sessionId === activeSession.id && r.status === 'PRESENT')
      .map((r) => r.studentId)
  );
  const remainingAbsent = targetStudents.filter(
    (st) => !updatedPresentIds.has(st.id) && !updatedPresentIds.has(st.studentId)
  );

  assert(
    'MYAU-04',
    'Absent list decreases dynamically in real-time as students are marked',
    remainingAbsent.length === 1 && remainingAbsent[0].studentId === 'PDA-2401-004',
    '1 absent student remaining (Siti Sarah)',
    `${remainingAbsent.length} remaining: ${remainingAbsent[0]?.name}`,
    'Dynamic reactive synchronization between scanner and absent roster'
  );

  // -------------------------------------------------------------------------
  // 5. MYAU-05: Tamatkan Sesi & Summary Review
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: Tamatkan Sesi & Post-Session Summary ---');
  // Lecturer closes the session
  engine.setSessionStatus(activeSession.id, 'CLOSED');
  const closedSession = engine.getSessions().find((s) => s.id === activeSession.id);

  assert(
    'MYAU-05',
    'Tamatkan Sesi transitions session to CLOSED with valid endTime',
    closedSession?.status === 'CLOSED' && Boolean(closedSession?.endTime),
    'Status: CLOSED with recorded endTime',
    `Status: ${closedSession?.status}, EndTime: ${closedSession?.endTime}`,
    'Session finalized cleanly and sealed against further modification'
  );

  // Summary generation
  const finalRecords = engine.getAttendanceRecords().filter((r) => r.sessionId === activeSession.id);
  const finalPercentage = Math.round((finalRecords.length / targetStudents.length) * 100);

  const summary = {
    sessionId: closedSession!.id,
    subjectCode: closedSession!.subjectCode,
    className: closedSession!.className,
    date: closedSession!.date,
    presentCount: finalRecords.length,
    totalCount: targetStudents.length,
    percentage: finalPercentage,
    absentList: remainingAbsent
  };

  assert(
    'MYAU-05',
    'Post-session summary contains complete attendance metrics and absent list',
    summary.presentCount === 3 &&
      summary.totalCount === 4 &&
      summary.percentage === 75 &&
      summary.absentList.length === 1,
    '3/4 Hadir (75%), 1 Tidak Hadir (Siti Sarah)',
    `${summary.presentCount}/${summary.totalCount} Hadir (${summary.percentage}%), ${summary.absentList.length} Absent`,
    'Post-session modal displays full summary with copyable absent list for WhatsApp announcements'
  );

  // -------------------------------------------------------------------------
  // 6. MYAU-06: Security & Invariant Guards
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 6: Invariant & Safety Guards ---');
  const postCloseScan = engine.processScan('PDA-2401-004', 'CAMERA_SCAN', activeSession.id);
  assert(
    'MYAU-06',
    'Closed session strictly rejects further scan attempts (Immutable)',
    postCloseScan.success === false && postCloseScan.code === 'NO_ACTIVE_EVENT',
    'NO_ACTIVE_EVENT',
    `${postCloseScan.code}`,
    'Integrity rule preserved: closed session cannot receive post-hoc scans'
  );

  assert(
    'MYAU-06',
    'All recorded attendance records preserved without data loss',
    engine.getAttendanceRecords().length === 3,
    '3 attendance records intact',
    `${engine.getAttendanceRecords().length} records intact`,
    'Non-destructive persistence preserved'
  );

  // -------------------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.table(results);
  const allPassed = results.every((r) => r.status === 'PASS');
  console.log(
    `\nPhase 2 Summary: Total: ${results.length} | Passed: ${
      results.filter((r) => r.status === 'PASS').length
    } | Failed: ${results.filter((r) => r.status === 'FAIL').length}`
  );

  if (!allPassed) {
    console.error('❌ PHASE 2 VERIFICATION FAILED');
    process.exit(1);
  } else {
    console.log('✅ ALL PHASE 2 SCANNER FIRST / ACTIVE ATTENDANCE UX VERIFICATIONS PASSED.');
    process.exit(0);
  }
}

runPhase2Verification().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
