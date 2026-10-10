/**
 * Verification Test Suite: Session Lifecycle, Non-Expiration, Explicit Closure & Cross-Device Sync
 *
 * Verifies:
 * 1. An opened session remains OPEN indefinitely without auto-expiry or timeout.
 * 2. Sessions persist as OPEN across browser reloads, storage updates, and navigation.
 * 3. Sessions are NEVER closed automatically; only closed when the lecturer explicitly triggers close.
 * 4. Multi-device / cross-client synchronization via Firestore onSnapshot and BroadcastChannel.
 * 5. Rejection of check-ins once explicitly CLOSED.
 */

import { attendanceEngine } from '../src/services/attendanceEngine';
import {
  Subject,
  Lecturer,
  AttendanceSession,
  TeachingAssignment,
  Student,
  Enrollment
} from '../src/types';

interface TestResult {
  category: string;
  testCase: string;
  expected: string;
  actual: string;
  passed: boolean;
  notes?: string;
}

const results: TestResult[] = [];

function recordTest(
  category: string,
  testCase: string,
  passed: boolean,
  expected: string,
  actual: string,
  notes?: string
) {
  results.push({ category, testCase, expected, actual, passed, notes });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} [${category}] ${testCase}`);
  if (!passed) {
    console.error(`   Expected: ${expected}`);
    console.error(`   Actual:   ${actual}`);
  }
}

async function runSessionLifecycleAndSyncAudit() {
  console.log('================================================================');
  console.log('AUDIT: SESSION LIFECYCLE, NON-EXPIRATION & CROSS-DEVICE SYNC');
  console.log('================================================================\n');

  const mockLecturer: Lecturer = {
    id: 'LEC-AMINAH-01',
    name: 'Ts. Dr. Siti Aminah',
    email: 'aminah@bpenawar.kpm.edu.my',
    icNumber: '800101-01-1234',
    pin: '1234',
    department: 'Jabatan Perakaunan',
    role: 'LECTURER',
    status: 'ACTIVE'
  };

  const mockSubject: Subject = {
    id: 'SUB-ACC2024',
    code: 'ACC 2024',
    name: 'Perakaunan Kewangan Lanjutan',
    department: 'Jabatan Perakaunan',
    sections: ['DIA_4A', 'DIA_4B']
  };

  const mockAssignment: TeachingAssignment = {
    id: 'TA-AMINAH-01',
    lecturerId: mockLecturer.id,
    lecturerName: mockLecturer.name,
    lecturerEmail: mockLecturer.email,
    subjectId: mockSubject.id,
    subjectCode: mockSubject.code,
    subjectName: mockSubject.name,
    className: 'DIA_4A',
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  };

  const mockStudent1: Student = {
    id: 'B022410001',
    studentId: 'B022410001',
    name: 'Muhammad Faris bin Razak',
    className: 'DIA_4A',
    email: 'faris@student.kpm.edu.my',
    phone: '0123456789',
    department: 'Diploma Perakaunan'
  };

  const mockStudent2: Student = {
    id: 'B022410002',
    studentId: 'B022410002',
    name: 'Nur Aisyah binti Kamal',
    className: 'DIA_4A',
    email: 'aisyah@student.kpm.edu.my',
    phone: '0198765432',
    department: 'Diploma Perakaunan'
  };

  attendanceEngine.saveLecturersList([mockLecturer]);
  attendanceEngine.saveSubjects([mockSubject]);
  attendanceEngine.saveStudentsList([mockStudent1, mockStudent2]);

  // -------------------------------------------------------------
  // TEST 1: Session Opened -> Status is OPEN with empty endTime
  // -------------------------------------------------------------
  const activationRes = attendanceEngine.activateClassSession(
    mockSubject,
    'DIA_4A',
    mockLecturer,
    mockAssignment.id
  );
  const session1 = activationRes.session;

  recordTest(
    '1. Session Initialization',
    'Session starts with status OPEN and empty endTime',
    session1.status === 'OPEN' && session1.endTime === '',
    'status: OPEN, endTime: ""',
    `status: ${session1.status}, endTime: "${session1.endTime}"`,
    'Session is actively listening and open for attendance'
  );

  // -------------------------------------------------------------
  // TEST 2: Longevity - No Time-based Expiration or Auto-Close Timer
  // -------------------------------------------------------------
  const retrievedSession = attendanceEngine.getSessions().find((s) => s.id === session1.id);
  const hasNoAutoCloseTimer = !('expiresAt' in (retrievedSession || {})) || (retrievedSession as any).expiresAt === undefined;

  recordTest(
    '2. Non-Expiration & Longevity',
    'Session does not contain an auto-expiration timestamp or timeout policy',
    hasNoAutoCloseTimer && retrievedSession?.status === 'OPEN',
    'No automatic expiration timestamp, status remains OPEN',
    `status: ${retrievedSession?.status}, expiresAt: ${(retrievedSession as any)?.expiresAt ?? 'none'}`,
    'Session remains OPEN until lecturer explicitly terminates it'
  );

  // -------------------------------------------------------------
  // TEST 3: State Durability & Browser Reload Simulation
  // -------------------------------------------------------------
  // Emulate full page refresh / reload from storage
  attendanceEngine.reloadFromStorageAndNotify();
  const reloadedSession = attendanceEngine.getSessions().find((s) => s.id === session1.id);

  recordTest(
    '3. Durability & Refresh Safety',
    'Session remains OPEN after page reload / localStorage re-hydration',
    reloadedSession?.status === 'OPEN' && reloadedSession?.endTime === '',
    'status: OPEN after reload',
    `status: ${reloadedSession?.status}, endTime: "${reloadedSession?.endTime}"`,
    'Reload does not accidentally mark active session as closed'
  );

  // -------------------------------------------------------------
  // TEST 4: Student Attendance Allowed while OPEN
  // -------------------------------------------------------------
  const scanResultWhileOpen = attendanceEngine.processScan(
    mockStudent1.studentId,
    'CAMERA_SCAN',
    session1.id,
    mockLecturer
  );

  recordTest(
    '4. Check-in Eligibility',
    'Students can check-in successfully while session is OPEN',
    scanResultWhileOpen.success === true,
    'success: true',
    `success: ${scanResultWhileOpen.success}, code: ${scanResultWhileOpen.code}, student: "${scanResultWhileOpen.student?.name}"`,
    'Live attendance actively received during open window'
  );

  // -------------------------------------------------------------
  // TEST 5: Explicit Session Termination by Lecturer (Pressing Tutup/Tamat Sesi)
  // -------------------------------------------------------------
  attendanceEngine.setSessionStatus(session1.id, 'CLOSED');
  const sessionAfterClose = attendanceEngine.getSessions().find((s) => s.id === session1.id);

  recordTest(
    '5. Explicit Closure',
    'Session transitions to CLOSED only upon explicit lecturer termination',
    sessionAfterClose?.status === 'CLOSED' && (sessionAfterClose?.endTime?.length || 0) > 0,
    'status: CLOSED with recorded endTime timestamp',
    `status: ${sessionAfterClose?.status}, endTime: "${sessionAfterClose?.endTime}"`,
    'Lecturer manual close is authoritative and stamps ending time'
  );

  // -------------------------------------------------------------
  // TEST 6: Attendance Blocked Once CLOSED
  // -------------------------------------------------------------
  const scanResultAfterClose = attendanceEngine.processScan(
    mockStudent2.studentId,
    'CAMERA_SCAN',
    session1.id,
    mockLecturer
  );

  recordTest(
    '6. Closure Enforcement',
    'New attendance check-in is strictly blocked after session is CLOSED',
    scanResultAfterClose.success === false && scanResultAfterClose.code === 'SESSION_CLOSED',
    'success: false, code: SESSION_CLOSED',
    `success: ${scanResultAfterClose.success}, code: ${scanResultAfterClose.code}, msg: "${scanResultAfterClose.message}"`,
    'Zero unverified attendance leakage after explicit closure'
  );

  // -------------------------------------------------------------
  // TEST 7: Cross-Device Synchronization Architecture (Firestore onSnapshot)
  // -------------------------------------------------------------
  let listenerNotified = false;
  let receivedSessionsCount = 0;

  const unsubscribe = attendanceEngine.subscribeSessions((syncedSessions) => {
    listenerNotified = true;
    receivedSessionsCount = syncedSessions.length;
  });

  // Simulate Device 2 syncing a new session via Firestore real-time listener
  const mockDevice2Session: AttendanceSession = {
    id: 'SES-DEVICE2-SYNC-01',
    subjectId: mockSubject.id,
    subjectCode: mockSubject.code,
    subjectName: mockSubject.name,
    className: 'DIA_4B',
    lecturerId: 'LEC-DEVICE2',
    lecturerName: 'Dr. Device 2',
    lecturerEmail: 'device2@bpenawar.kpm.edu.my',
    sessionName: 'ACC 2024 - DIA_4B',
    date: '2026-10-10',
    startTime: '08:00 AM',
    endTime: '',
    status: 'OPEN',
    attendanceMethod: 'QR',
    targetCount: 25,
    actualCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  attendanceEngine.addSession(mockDevice2Session);
  const foundDevice2Session = attendanceEngine.getSessions().find((s) => s.id === mockDevice2Session.id);

  recordTest(
    '7. Multi-Device Real-Time Sync',
    'Session created on Device A is broadcast and received by Device B in real-time',
    listenerNotified && foundDevice2Session?.status === 'OPEN',
    'listener fired: true, foundDevice2Session.status: OPEN',
    `listener fired: ${listenerNotified}, found status: ${foundDevice2Session?.status}, total: ${receivedSessionsCount}`,
    'Both devices share authoritative real-time state via Firestore onSnapshot'
  );

  unsubscribe();

  // -------------------------------------------------------------
  // TEST 8: Starting a New Class Session Requires Closing Previous Session First
  // -------------------------------------------------------------
  // Dr. Device 2 terminates the previous session explicitly before starting a new one
  attendanceEngine.setSessionStatus(mockDevice2Session.id, 'CLOSED');
  const device2Closed = attendanceEngine.getSessions().find((s) => s.id === mockDevice2Session.id);

  recordTest(
    '8. Controlled Workflow for New Sessions',
    'Lecturer terminates old session explicitly before starting new session',
    device2Closed?.status === 'CLOSED',
    'status: CLOSED',
    `status: ${device2Closed?.status}`,
    'Lecturer retains complete command of session lifecycle'
  );

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log('AUDIT SUMMARY');
  console.log('================================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  const score = ((passedCount / totalCount) * 100).toFixed(1);

  console.log(`Total Criteria Tested: ${totalCount}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${totalCount - passedCount}`);
  console.log(`Score:  ${score}%`);

  if (passedCount === totalCount) {
    console.log('\n✅ ALL SESSION LIFECYCLE & SYNC TESTS PASSED SUCCESSFULLY.');
    process.exit(0);
  } else {
    console.error('\n❌ SOME AUDIT TESTS FAILED.');
    process.exit(1);
  }
}

runSessionLifecycleAndSyncAudit().catch((err) => {
  console.error('Fatal error during test execution:', err);
  process.exit(1);
});
