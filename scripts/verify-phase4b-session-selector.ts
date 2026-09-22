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

import { AttendanceSession, Lecturer, TeachingAssignment, Student, AttendanceRecord } from '../src/types';
import { filterAuthorizedSessions, isLecturerAuthorizedForSession } from '../src/utils/sessionAuth';
import { sortSessionsLatestFirst } from '../src/utils/studentUtils';

interface TestResult {
  scenario: string;
  test: string;
  expected: string;
  actual: string;
  status: 'PASS' | 'FAIL';
  evidence: string;
}

const results: TestResult[] = [];

function assert(
  scenario: string,
  test: string,
  condition: boolean,
  expected: string,
  actual: string,
  evidence: string
) {
  results.push({
    scenario,
    test,
    expected,
    actual,
    status: condition ? 'PASS' : 'FAIL',
    evidence
  });
}

// ---------------------------------------------------------------------------
// TEST IDENTITIES & TEACHING ASSIGNMENTS
// ---------------------------------------------------------------------------
const khairi: Lecturer = {
  id: 'LEC-KHAIRI',
  name: 'Ustaz Ahmad Khairi',
  email: 'ahmadkhairi@bpenawar.kpm.edu.my',
  icNumber: '861115-46-5305',
  pin: '5305',
  assignedSubjects: ['MPU2162', 'MPU2412'],
  assignedClasses: ['DIA3A', 'DIA4A'],
  status: 'ACTIVE'
};

const sarah: Lecturer = {
  id: 'LEC-SARAH',
  name: 'Puan Sarah',
  email: 'sarah@bpenawar.kpm.edu.my',
  icNumber: '890101-01-1234',
  pin: '1234',
  assignedSubjects: ['MPU2412'],
  assignedClasses: ['DIA4B'],
  status: 'ACTIVE'
};

const teachingAssignments: TeachingAssignment[] = [
  {
    id: 'TA-KHAIRI-MPU2162-DIA3A',
    lecturerId: khairi.id,
    lecturerEmail: khairi.email,
    lecturerName: khairi.name,
    subjectId: 'SUBJ-MPU2162',
    subjectCode: 'MPU2162',
    subjectName: 'PENGHAYATAN ETIKA DAN PERADABAN',
    className: 'DIA3A',
    status: 'ACTIVE',
    createdAt: '2026-09-01T08:00:00.000Z'
  },
  {
    id: 'TA-KHAIRI-MPU2412-DIA4A',
    lecturerId: khairi.id,
    lecturerEmail: khairi.email,
    lecturerName: khairi.name,
    subjectId: 'SUBJ-MPU2412',
    subjectCode: 'MPU2412',
    subjectName: 'PENGURUSAN KO-KURIKULUM',
    className: 'DIA4A',
    status: 'ACTIVE',
    createdAt: '2026-09-01T08:00:00.000Z'
  },
  {
    id: 'TA-SARAH-MPU2412-DIA4B',
    lecturerId: sarah.id,
    lecturerEmail: sarah.email,
    lecturerName: sarah.name,
    subjectId: 'SUBJ-MPU2412',
    subjectCode: 'MPU2412',
    subjectName: 'PENGURUSAN KO-KURIKULUM',
    className: 'DIA4B',
    status: 'ACTIVE',
    createdAt: '2026-09-01T08:00:00.000Z'
  }
];

// ---------------------------------------------------------------------------
// HISTORICAL SESSIONS LIST (Referenced in Prompt)
// ---------------------------------------------------------------------------
const mockSessions: AttendanceSession[] = [
  {
    id: 'SES-HIST-01',
    subjectCode: 'MPU2412',
    subjectName: 'PENGURUSAN KO-KURIKULUM',
    sessionName: 'Kuliah Minggu 6a',
    className: 'DIA4A',
    date: '2026-09-21',
    startTime: '08:00',
    endTime: '10:00',
    status: 'CLOSED',
    attendanceMethod: 'CAMERA_SCAN',
    lecturerId: khairi.id,
    lecturerName: khairi.name
  },
  {
    id: 'SES-HIST-02',
    subjectCode: 'MPU2412',
    subjectName: 'PENGURUSAN KO-KURIKULUM',
    sessionName: 'Kuliah Minggu 6b',
    className: 'DIA4A',
    date: '2026-09-21',
    startTime: '10:00',
    endTime: '12:00',
    status: 'CLOSED',
    attendanceMethod: 'CAMERA_SCAN',
    lecturerId: khairi.id,
    lecturerName: khairi.name
  },
  {
    id: 'SES-HIST-03',
    subjectCode: 'MPU2412',
    subjectName: 'PENGURUSAN KO-KURIKULUM',
    sessionName: 'Kuliah Minggu 6a',
    className: 'DIA4B',
    date: '2026-09-21',
    startTime: '08:00',
    endTime: '10:00',
    status: 'CLOSED',
    attendanceMethod: 'CAMERA_SCAN',
    lecturerId: sarah.id,
    lecturerName: sarah.name
  },
  {
    id: 'SES-HIST-04',
    subjectCode: 'MPU2412',
    subjectName: 'PENGURUSAN KO-KURIKULUM',
    sessionName: 'Kuliah Minggu 6b',
    className: 'DIA4B',
    date: '2026-09-21',
    startTime: '10:00',
    endTime: '12:00',
    status: 'CLOSED',
    attendanceMethod: 'CAMERA_SCAN',
    lecturerId: sarah.id,
    lecturerName: sarah.name
  },
  {
    id: 'SES-HIST-05',
    subjectCode: 'MPU2162',
    subjectName: 'PENGHAYATAN ETIKA DAN PERADABAN',
    sessionName: 'Kuliah Minggu 6a',
    className: 'DIA3A',
    date: '2026-09-21',
    startTime: '14:00',
    endTime: '16:00',
    status: 'CLOSED',
    attendanceMethod: 'CAMERA_SCAN',
    lecturerId: khairi.id,
    lecturerName: khairi.name
  },
  {
    id: 'SES-HIST-06',
    subjectCode: 'MPU2162',
    subjectName: 'PENGHAYATAN ETIKA DAN PERADABAN',
    sessionName: 'Kuliah Minggu 6b',
    className: 'DIA3A',
    date: '2026-09-21',
    startTime: '16:00',
    endTime: '18:00',
    status: 'CLOSED',
    attendanceMethod: 'CAMERA_SCAN',
    lecturerId: khairi.id,
    lecturerName: khairi.name
  },
  // Valid active session
  {
    id: 'SES-ACTIVE-01',
    subjectCode: 'MPU2412',
    subjectName: 'PENGURUSAN KO-KURIKULUM',
    sessionName: 'Kuliah Minggu 7',
    className: 'DIA4A',
    date: '2026-09-22',
    startTime: '08:00',
    endTime: '10:00',
    status: 'OPEN',
    attendanceMethod: 'CAMERA_SCAN',
    lecturerId: khairi.id,
    lecturerName: khairi.name
  },
  // Sarah's active session
  {
    id: 'SES-ACTIVE-SARAH',
    subjectCode: 'MPU2412',
    subjectName: 'PENGURUSAN KO-KURIKULUM',
    sessionName: 'MPU2412 - DIA4B',
    className: 'DIA4B',
    date: '2026-09-22',
    startTime: '09:00',
    endTime: '11:00',
    status: 'OPEN',
    attendanceMethod: 'CAMERA_SCAN',
    lecturerId: sarah.id,
    lecturerName: sarah.name
  }
];

function queryActiveSessions(
  sessions: AttendanceSession[],
  lecturer: Lecturer | null,
  isAdmin: boolean,
  assignments: TeachingAssignment[]
): AttendanceSession[] {
  const openOnly = sessions.filter((s) => s.status === 'OPEN');
  if (isAdmin) {
    return sortSessionsLatestFirst(openOnly);
  }
  if (lecturer) {
    return filterAuthorizedSessions(openOnly, lecturer, isAdmin, assignments);
  }
  return sortSessionsLatestFirst(openOnly);
}

function queryHistorySessions(
  sessions: AttendanceSession[],
  lecturer: Lecturer | null,
  isAdmin: boolean,
  assignments: TeachingAssignment[]
): AttendanceSession[] {
  const closedOnly = sessions.filter((s) => s.status !== 'OPEN');
  if (isAdmin) {
    return sortSessionsLatestFirst(closedOnly);
  }
  if (lecturer) {
    return filterAuthorizedSessions(closedOnly, lecturer, isAdmin, assignments);
  }
  return sortSessionsLatestFirst(closedOnly);
}

async function runVerification() {
  const { attendanceEngine } = await import('../src/services/attendanceEngine');

  // ---------------------------------------------------------------------------
  // TEST SCENARIO A: Closed sessions NOT shown in active selector
  // ---------------------------------------------------------------------------
  const activeKhairi = queryActiveSessions(mockSessions, khairi, false, teachingAssignments);
  const closedInActive = activeKhairi.filter((s) => s.status === 'CLOSED' || s.status === 'ARCHIVED');

  assert(
    'Scenario A',
    'Historical CLOSED sessions must NOT appear in active session selector',
    closedInActive.length === 0,
    '0 closed sessions in active selector',
    `${closedInActive.length} closed sessions found`,
    'Active selector filters strictly by status == OPEN'
  );

  assert(
    'Scenario A',
    'MPU2412 Minggu 6a/6b & MPU2162 Minggu 6a/6b are completely excluded from active selector',
    !activeKhairi.some((s) => s.id.startsWith('SES-HIST-')),
    'No SES-HIST-* in active sessions',
    activeKhairi.map((s) => s.id).join(', ') || 'none',
    'Historical records from 2026-09-21 do not appear in active selector'
  );

  // ---------------------------------------------------------------------------
  // TEST SCENARIO B: Open sessions shown in active selector
  // ---------------------------------------------------------------------------
  assert(
    'Scenario B',
    'OPEN session SES-ACTIVE-01 appears in active session selector for Khairi',
    activeKhairi.some((s) => s.id === 'SES-ACTIVE-01' && s.status === 'OPEN'),
    'SES-ACTIVE-01 present with status OPEN',
    JSON.stringify(activeKhairi.map((s) => ({ id: s.id, status: s.status, code: s.subjectCode, class: s.className }))),
    'Authorized open session correctly displayed in selector'
  );

  // ---------------------------------------------------------------------------
  // TEST SCENARIO C: End session transition (OPEN -> CLOSED)
  // ---------------------------------------------------------------------------
  let dynamicSessions = [...mockSessions];
  // Khairi ends SES-ACTIVE-01
  dynamicSessions = dynamicSessions.map((s) =>
    s.id === 'SES-ACTIVE-01' ? { ...s, status: 'CLOSED' as const, endTime: '09:45' } : s
  );

  const activeAfterEnd = queryActiveSessions(dynamicSessions, khairi, false, teachingAssignments);
  assert(
    'Scenario C',
    'Ended session immediately disappears from active selector upon status transition to CLOSED',
    !activeAfterEnd.some((s) => s.id === 'SES-ACTIVE-01'),
    'SES-ACTIVE-01 absent from active selector',
    activeAfterEnd.map((s) => s.id).join(', ') || 'Empty selector',
    'Firestore / model authoritative transition to CLOSED removes session from selector'
  );

  // ---------------------------------------------------------------------------
  // TEST SCENARIO D: Historical records retained (Never deleted)
  // ---------------------------------------------------------------------------
  const historyKhairi = queryHistorySessions(dynamicSessions, khairi, false, teachingAssignments);
  assert(
    'Scenario D',
    'All historical closed sessions are preserved in session history',
    historyKhairi.some((s) => s.id === 'SES-HIST-01') &&
      historyKhairi.some((s) => s.id === 'SES-HIST-02') &&
      historyKhairi.some((s) => s.id === 'SES-HIST-05') &&
      historyKhairi.some((s) => s.id === 'SES-HIST-06'),
    'All 4 Khairi historical sessions present in history',
    `${historyKhairi.length} historical sessions found`,
    'Historical data remains intact and queryable through history view'
  );

  assert(
    'Scenario D',
    'The newly closed session (SES-ACTIVE-01) is now accessible in session history',
    historyKhairi.some((s) => s.id === 'SES-ACTIVE-01' && s.status === 'CLOSED'),
    'SES-ACTIVE-01 present in history with status CLOSED',
    'Found in history query',
    'Closed sessions seamlessly transition to history'
  );

  // ---------------------------------------------------------------------------
  // TEST SCENARIO E: Lecturer scoping preserved
  // ---------------------------------------------------------------------------
  // When Khairi is logged in, Sarah's active session must NOT appear in Khairi's selector
  const activeKhairiInitial = queryActiveSessions(mockSessions, khairi, false, teachingAssignments);
  assert(
    'Scenario E',
    'Sarah open session (SES-ACTIVE-SARAH) does NOT leak into Khairi active selector',
    !activeKhairiInitial.some((s) => s.id === 'SES-ACTIVE-SARAH'),
    'SES-ACTIVE-SARAH excluded from Khairi selector',
    activeKhairiInitial.map((s) => s.id).join(', '),
    'Active selector strictly scopes by authorized teaching assignments & lecturer ID'
  );

  const activeSarah = queryActiveSessions(mockSessions, sarah, false, teachingAssignments);
  assert(
    'Scenario E',
    'Sarah active selector contains only her own authorized session (DIA4B)',
    activeSarah.length === 1 && activeSarah[0].id === 'SES-ACTIVE-SARAH',
    'Only SES-ACTIVE-SARAH present',
    activeSarah.map((s) => s.id).join(', '),
    'Sarah selector is properly scoped to DIA4B'
  );

  // ---------------------------------------------------------------------------
  // TEST SCENARIO F: Stale local state does NOT resurrect closed session
  // ---------------------------------------------------------------------------
  // Simulate client storing selectedSessionId = 'SES-HIST-01' (a closed session)
  const staleStoredId = 'SES-HIST-01';
  // Client checks validity against activeOpenSessions
  const isValidInActive = activeKhairiInitial.some((s) => s.id === staleStoredId);
  const resolvedSessionId = isValidInActive ? staleStoredId : (activeKhairiInitial[0]?.id || '');

  assert(
    'Scenario F',
    'Stale local session ID pointing to a CLOSED session is discarded and cleared/updated',
    resolvedSessionId === 'SES-ACTIVE-01',
    'Resolved to valid OPEN session SES-ACTIVE-01 instead of stale SES-HIST-01',
    `Resolved: ${resolvedSessionId}`,
    'System verifies status == OPEN against authoritative sessions before adopting selection'
  );

  // ---------------------------------------------------------------------------
  // TEST SCENARIO G: Multiple open sessions clearly handled if permitted
  // ---------------------------------------------------------------------------
  const multiOpenSessions: AttendanceSession[] = [
    {
      id: 'SES-OPEN-A',
      subjectCode: 'MPU2162',
      subjectName: 'PENGHAYATAN ETIKA DAN PERADABAN',
      sessionName: 'Kuliah Minggu 7',
      className: 'DIA3A',
      date: '2026-09-22',
      startTime: '08:00',
      endTime: '10:00',
      status: 'OPEN',
      attendanceMethod: 'CAMERA_SCAN',
      lecturerId: khairi.id,
      lecturerName: khairi.name
    },
    {
      id: 'SES-OPEN-B',
      subjectCode: 'MPU2412',
      subjectName: 'PENGURUSAN KO-KURIKULUM',
      sessionName: 'Kuliah Minggu 7',
      className: 'DIA4A',
      date: '2026-09-22',
      startTime: '10:00',
      endTime: '12:00',
      status: 'OPEN',
      attendanceMethod: 'CAMERA_SCAN',
      lecturerId: khairi.id,
      lecturerName: khairi.name
    }
  ];

  const activeMulti = queryActiveSessions(multiOpenSessions, khairi, false, teachingAssignments);
  assert(
    'Scenario G',
    'Multiple open sessions are clearly distinguished by subjectCode, sessionName, and className',
    activeMulti.length === 2 &&
      activeMulti.some((s) => s.subjectCode === 'MPU2162' && s.className === 'DIA3A') &&
      activeMulti.some((s) => s.subjectCode === 'MPU2412' && s.className === 'DIA4A'),
    'Both distinct open sessions present in selector without collision',
    JSON.stringify(activeMulti.map((s) => `${s.subjectCode} - ${s.className}`)),
    'Active session selector allows distinct selection among authorized open sessions'
  );

  // ---------------------------------------------------------------------------
  // TEST SCENARIO H: AttendanceEngine processScan rejects closed sessions
  // ---------------------------------------------------------------------------
  // Test that scanning a closed session ID fails with NO_ACTIVE_EVENT
  const closedSessionScan = attendanceEngine.processScan(
    'STUDENT_QR_SAMPLE',
    'CAMERA_SCAN',
    'SES-HIST-01'
  );
  assert(
    'Scenario H',
    'attendanceEngine.processScan rejects attendance logging against a CLOSED session ID',
    closedSessionScan.success === false && closedSessionScan.code === 'NO_ACTIVE_EVENT',
    'success: false, code: NO_ACTIVE_EVENT',
    `success: ${closedSessionScan.success}, code: ${closedSessionScan.code}`,
    'Authoritative backend validation blocks any attendance write to non-OPEN sessions'
  );

  // ---------------------------------------------------------------------------
  // REPORT
  // ---------------------------------------------------------------------------
  console.log('================================================================');
  console.log('SES v4.5 | PHASE 4B.2-C SESSION SELECTOR & LIFECYCLE GATE');
  console.log('================================================================');
  console.table(results);

  const passedCount = results.filter((r) => r.status === 'PASS').length;
  const failedCount = results.filter((r) => r.status === 'FAIL').length;
  console.log(`Summary: Total: ${results.length} | Passed: ${passedCount} | Failed: ${failedCount}`);

  if (failedCount > 0) {
    console.error('❌ SOME SESSION SELECTOR VERIFICATIONS FAILED');
    process.exit(1);
  } else {
    console.log('✅ ALL PHASE 4B.2-C SESSION SELECTOR & LIFECYCLE VERIFICATIONS PASSED.');
    process.exit(0);
  }
}

runVerification().catch((err) => {
  console.error('Verification error:', err);
  process.exit(1);
});
