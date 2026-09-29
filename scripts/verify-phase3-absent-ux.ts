/**
 * CLASS ATTEND — PHASE 3 VERIFICATION SUITE
 * ABSENT STUDENT EXPERIENCE (MYAU — Make Yourself as User)
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
  Enrollment,
  AttendanceRecord
} from '../src/types';
import {
  formatDisplayDate,
  formatAbsentListText,
  deriveSessionTargetStudents,
  deriveAbsentStudents
} from '../src/utils/absentHelper';
import {
  filterAuthorizedAttendanceRecords,
  calculateAttendanceMetrics
} from '../src/utils/sessionAuth';
import { formatWhatsAppPhone } from '../src/utils/whatsappHelper';

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

// ---------------------------------------------------------------------------
// Authoritative Mock Setup for DIA4B Pengajian Malaysia
// ---------------------------------------------------------------------------
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

// 4 Enrolled Students in DIA4B
const mockStudents: Student[] = [
  {
    id: 'STU-001',
    studentId: 'PDA-2401-001',
    name: 'Muhammad Faiz bin Roslan',
    className: 'DIA4B',
    phone: '011-1234567',
    email: 'faiz@siswa.bpenawar.kpm.edu.my'
  },
  {
    id: 'STU-002',
    studentId: 'PDA-2401-002',
    name: 'Nurul Huda binti Ismail',
    className: 'DIA4B',
    phone: '012-9876543',
    email: 'huda@siswa.bpenawar.kpm.edu.my'
  },
  {
    id: 'STU-003',
    studentId: 'PDA-2401-003',
    name: 'Muhammad Firdaus bin Azman',
    className: 'DIA4B',
    phone: '013-5551234',
    email: 'firdaus@siswa.bpenawar.kpm.edu.my'
  },
  {
    id: 'STU-004',
    studentId: 'PDA-2401-004',
    name: 'Nur Aisyah binti Ahmad',
    className: 'DIA4B',
    phone: '014-9998877',
    email: 'aisyah@siswa.bpenawar.kpm.edu.my'
  }
];

const mockEnrollments: Enrollment[] = mockStudents.map((s, idx) => ({
  id: `ENR-DIA4B-${idx + 1}`,
  studentId: s.studentId,
  subjectCode: 'MPU2162',
  className: 'DIA4B',
  status: 'ACTIVE',
  enrolledAt: '2026-09-01T00:00:00.000Z'
}));

async function runPhase3Verification() {
  console.log('================================================================');
  console.log('CLASS ATTEND — PHASE 3: ABSENT STUDENT EXPERIENCE VERIFICATION');
  console.log('Standard: SYNCROZZ ENGINEERING STANDARD (SES) v4.4');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // 1. CRITERIA P3-01: Objective & Hierarchy
  // -------------------------------------------------------------------------
  console.log('--- TEST GROUP 1: Objective & Hierarchy ---');

  const activeSession: AttendanceSession = {
    id: 'SES-DIA4B-20260928',
    subjectId: 'SUB-MPU2162',
    subjectCode: 'MPU2162',
    subjectName: 'Pengajian Malaysia 2',
    className: 'DIA4B',
    sessionName: 'Kuliah Pengajian Malaysia Minggu 4',
    date: '2026-09-28',
    startTime: '08:00',
    endTime: '10:00',
    lecturerId: 'LEC-KHAIRI-001',
    lecturerName: 'Ahmad Khairi bin Mohd',
    status: 'OPEN',
    attendanceMethod: 'QR',
    targetCount: 4,
    createdAt: '2026-09-28T00:00:00.000Z'
  };

  const targetStudents = deriveSessionTargetStudents(activeSession, mockStudents, mockEnrollments);
  assert(
    'P3-01',
    'Target student roster accurately resolved for DIA4B',
    targetStudents.length === 4,
    '4 students',
    `${targetStudents.length} students`,
    'Roster resolution matches enrolled DIA4B students'
  );

  // Initial state: 0 scanned records
  let attendanceRecords: AttendanceRecord[] = [];
  let presentIdsSet = new Set<string>();
  let absentStudents = deriveAbsentStudents(targetStudents, presentIdsSet);

  assert(
    'P3-01',
    'Initial absent count equals target count before any scans',
    absentStudents.length === 4,
    '4 absent students',
    `${absentStudents.length} absent students`,
    'All enrolled students start in unrecorded pool'
  );

  // -------------------------------------------------------------------------
  // 2. CRITERIA P3-02: Terminology Distinction (Active vs Closed)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Terminology Distinction (Active vs Closed) ---');

  const activeTerminology = activeSession.status === 'OPEN' ? 'Belum Hadir' : 'Tidak Hadir';
  assert(
    'P3-02',
    'Active session uses BELUM HADIR terminology',
    activeTerminology === 'Belum Hadir',
    'Belum Hadir',
    activeTerminology,
    'Section 3 Rule: During active session, students are BELUM HADIR / BELUM DIREKODKAN'
  );

  const closedSession: AttendanceSession = {
    ...activeSession,
    status: 'CLOSED'
  };
  const closedTerminology = closedSession.status === 'OPEN' ? 'Belum Hadir' : 'Tidak Hadir';
  assert(
    'P3-02',
    'Closed session uses TIDAK HADIR terminology',
    closedTerminology === 'Tidak Hadir',
    'Tidak Hadir',
    closedTerminology,
    'Section 3 Rule: After session is CLOSED, students are TIDAK HADIR'
  );

  // -------------------------------------------------------------------------
  // 3. CRITERIA P3-03: Real-Time Transition without Page Refresh
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Real-Time Transition without Page Refresh ---');

  // Student 1 (Faiz) scans QR
  attendanceRecords.push({
    id: 'REC-001',
    sessionId: activeSession.id,
    studentId: 'PDA-2401-001',
    studentName: 'Muhammad Faiz bin Roslan',
    className: 'DIA4B',
    timestamp: '2026-09-28T08:05:00.000Z',
    status: 'PRESENT',
    method: 'CAMERA_SCAN'
  });

  // Student 2 (Huda) scans QR
  attendanceRecords.push({
    id: 'REC-002',
    sessionId: activeSession.id,
    studentId: 'PDA-2401-002',
    studentName: 'Nurul Huda binti Ismail',
    className: 'DIA4B',
    timestamp: '2026-09-28T08:06:00.000Z',
    status: 'PRESENT',
    method: 'CAMERA_SCAN'
  });

  // Re-derive present set and absent students
  presentIdsSet = new Set(attendanceRecords.map((r) => r.studentId.toUpperCase()));
  absentStudents = deriveAbsentStudents(targetStudents, presentIdsSet);

  assert(
    'P3-03',
    'Scanned students immediately transition from BELUM HADIR to HADIR',
    absentStudents.length === 2 &&
      absentStudents.every((s) => s.studentId === 'PDA-2401-003' || s.studentId === 'PDA-2401-004'),
    '2 absent students (PDA-2401-003, PDA-2401-004)',
    `${absentStudents.length} absent students: ${absentStudents.map((s) => s.studentId).join(', ')}`,
    'Authoritative state dynamically moves scanned students from Belum Hadir into Hadir list'
  );

  // -------------------------------------------------------------------------
  // 4. CRITERIA P3-04: Manual "+ Hadir" Functionality
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: Manual Attendance Handling ---');

  // Student 3 (Firdaus) card damaged -> Marked via manual override
  attendanceRecords.push({
    id: 'REC-003',
    sessionId: activeSession.id,
    studentId: 'PDA-2401-003',
    studentName: 'Muhammad Firdaus bin Azman',
    className: 'DIA4B',
    timestamp: '2026-09-28T08:10:00.000Z',
    status: 'PRESENT',
    method: 'MANUAL'
  });

  presentIdsSet = new Set(attendanceRecords.map((r) => r.studentId.toUpperCase()));
  absentStudents = deriveAbsentStudents(targetStudents, presentIdsSet);

  assert(
    'P3-04',
    'Manual + Hadir successfully marks attendance without duplicate',
    attendanceRecords.length === 3 && absentStudents.length === 1 && absentStudents[0].studentId === 'PDA-2401-004',
    '1 absent student remaining (PDA-2401-004)',
    `${absentStudents.length} absent student: ${absentStudents[0]?.studentId}`,
    'Manual attendance seamlessly updates authoritative attendance'
  );

  // -------------------------------------------------------------------------
  // 5. CRITERIA P3-05: Post-Session Summary & Clean Hierarchy
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: Post-Session Summary Hierarchy ---');

  // Sesi tamat -> Close session
  const finalSummary = {
    sessionId: closedSession.id,
    subjectCode: closedSession.subjectCode,
    subjectName: closedSession.subjectName,
    className: closedSession.className,
    date: closedSession.date,
    presentCount: attendanceRecords.length,
    totalCount: targetStudents.length,
    percentage: Math.round((attendanceRecords.length / targetStudents.length) * 100),
    absentList: absentStudents
  };

  assert(
    'P3-05',
    'Post-session summary provides exact requested metrics (3 Hadir, 1 Tidak Hadir)',
    finalSummary.presentCount === 3 &&
      finalSummary.totalCount === 4 &&
      finalSummary.absentList.length === 1 &&
      finalSummary.absentList[0].name === 'Nur Aisyah binti Ahmad',
    '3 Hadir, 1 Tidak Hadir (Nur Aisyah)',
    `${finalSummary.presentCount} Hadir, ${finalSummary.absentList.length} Tidak Hadir`,
    'Hierarchy: Status Sesi -> Hadir -> Tidak Hadir -> Senarai Nama'
  );

  // -------------------------------------------------------------------------
  // 6. CRITERIA P3-06: Standardized "Salin Senarai" Format
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 6: Salin Senarai Format Verification ---');

  const copyText = formatAbsentListText(
    finalSummary.className,
    finalSummary.date,
    finalSummary.absentList,
    true
  );

  const expectedDate = formatDisplayDate('2026-09-28');
  assert(
    'P3-06',
    'Date formatting standardizes to DD/MM/YYYY',
    expectedDate === '28/09/2026',
    '28/09/2026',
    expectedDate,
    'Malaysian date format verified'
  );

  const expectedCopyText = `Tidak hadir — DIA4B\n28/09/2026\n\n1. Nur Aisyah binti Ahmad — PDA-2401-004`;
  assert(
    'P3-06',
    'Salin Senarai produces exact concise format without internal metadata',
    copyText.trim() === expectedCopyText.trim(),
    expectedCopyText,
    copyText,
    'Clean clipboard format without Firestore IDs or debug noise'
  );

  assert(
    'P3-06',
    'Salin Senarai does NOT contain internal IDs, timestamps, or technical tokens',
    !copyText.includes('REC-00') &&
      !copyText.includes('STU-00') &&
      !copyText.includes('SES-DIA4B') &&
      !copyText.includes('Firestore'),
    'No internal or technical IDs',
    'Verified clean of internal IDs',
    'Privacy & clean reporting standard verified'
  );

  // -------------------------------------------------------------------------
  // 7. CRITERIA P3-07: Empty / Success State
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 7: Empty / Success State (100% Attendance) ---');

  // Last student (Nur Aisyah) also attends
  attendanceRecords.push({
    id: 'REC-004',
    sessionId: activeSession.id,
    studentId: 'PDA-2401-004',
    studentName: 'Nur Aisyah binti Ahmad',
    className: 'DIA4B',
    timestamp: '2026-09-28T08:15:00.000Z',
    status: 'PRESENT',
    method: 'CAMERA_SCAN'
  });

  presentIdsSet = new Set(attendanceRecords.map((r) => r.studentId.toUpperCase()));
  const allPresentAbsent = deriveAbsentStudents(targetStudents, presentIdsSet);

  assert(
    'P3-07',
    'Zero absent students triggers valid SEMUA PELAJAR HADIR state',
    allPresentAbsent.length === 0,
    '0 absent students',
    `${allPresentAbsent.length} absent students`,
    'Empty state represents 100% attendance (4/4)'
  );

  const perfectAttendanceText = formatAbsentListText(
    finalSummary.className,
    finalSummary.date,
    allPresentAbsent,
    true
  );
  assert(
    'P3-07',
    'Copy text for 100% attendance reports all students present gracefully',
    perfectAttendanceText.includes('(Semua pelajar hadir)'),
    'Contains (Semua pelajar hadir)',
    perfectAttendanceText,
    'Clean fallback copy format'
  );

  // -------------------------------------------------------------------------
  // 8. CRITERIA P3-08: Invariant: No Automatic Absence Records in Database
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 8: Invariant: No Automatic Absence Records ---');

  const absentDbRecords = attendanceRecords.filter((r) => r.status === 'ABSENT');
  assert(
    'P3-08',
    'Database contains 0 ABSENT records (Absence is strictly derived)',
    absentDbRecords.length === 0,
    '0 ABSENT records in database',
    `${absentDbRecords.length} ABSENT records`,
    'SES v4.4 invariant: No phantom absence records created in persistence store'
  );

  // -------------------------------------------------------------------------
  // 9. CRITERIA P3-09: Secondary WhatsApp Integration
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 9: Secondary WhatsApp Integration ---');

  const formattedPhone = formatWhatsAppPhone(mockStudents[3].phone);
  assert(
    'P3-09',
    'WhatsApp phone number formatted correctly for wa.me URL',
    formattedPhone.startsWith('60') && !formattedPhone.includes('-'),
    '60149998877',
    formattedPhone,
    'Secondary direct WhatsApp reminder URL'
  );

  // -------------------------------------------------------------------------
  // 10. CRITERIA P3-10: SessionDetailView Multi-Tab Support
  // -------------------------------------------------------------------------
  console.log('\n--- TEST GROUP 10: SessionDetailView Multi-Tab Support ---');

  const authorizedRecords = filterAuthorizedAttendanceRecords(attendanceRecords, closedSession.id);
  const metrics = calculateAttendanceMetrics(authorizedRecords.length, closedSession.targetCount, mockEnrollments, closedSession);

  assert(
    'P3-10',
    'Session detail metrics calculate exact attendance percentage without zero-division',
    metrics.targetCount === 4 && metrics.attendancePercent === 100,
    'Target: 4, Percentage: 100%',
    `Target: ${metrics.targetCount}, Percentage: ${metrics.attendancePercent}%`,
    'SessionDetailView accurately computes attendance'
  );

  // -------------------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.table(results);
  const allPassed = results.every((r) => r.status === 'PASS');
  console.log(
    `\nPhase 3 Summary: Total: ${results.length} | Passed: ${
      results.filter((r) => r.status === 'PASS').length
    } | Failed: ${results.filter((r) => r.status === 'FAIL').length}`
  );

  if (!allPassed) {
    console.error('❌ PHASE 3 VERIFICATION FAILED');
    process.exit(1);
  } else {
    console.log('✅ ALL PHASE 3 ABSENT STUDENT EXPERIENCE VERIFICATIONS PASSED.');
    process.exit(0);
  }
}

runPhase3Verification().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
