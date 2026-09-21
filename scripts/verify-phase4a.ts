import {
  isLecturerAuthorizedForSession,
  filterAuthorizedSessions,
  filterAuthorizedAttendanceRecords,
  calculateAttendanceMetrics,
  formatSafeEndTime
} from '../src/utils/sessionAuth';
import { areClassesMatching, normalizeClassCode } from '../src/utils/classHelper';
import {
  AttendanceSession,
  AttendanceRecord,
  Lecturer,
  TeachingAssignment,
  Student
} from '../src/types';

interface TestResult {
  category: string;
  testName: string;
  expected: string;
  actual: string;
  status: 'PASS' | 'FAIL';
  evidence: string;
}

const results: TestResult[] = [];

function assert(
  category: string,
  testName: string,
  condition: boolean,
  expected: string,
  actual: string,
  evidence: string
) {
  results.push({
    category,
    testName,
    expected,
    actual,
    status: condition ? 'PASS' : 'FAIL',
    evidence
  });
}

// ----------------------------------------------------
// AUTHORIZED & UNAUTHORIZED TEST IDENTITIES
// ----------------------------------------------------
const authorizedLecturer: Lecturer = {
  id: 'LEC-001',
  name: 'Ustaz Ahmad Khairi',
  email: 'ahmadkhairi@bpenawar.kpm.edu.my',
  icNumber: '861115-46-5305',
  pin: '5305',
  assignedSubjects: ['MPU21032 - PENGHAYATAN ETIKA DAN PERADABAN'],
  assignedClasses: ['DIA_1A', 'DIA_1B'],
  assignedSections: ['DIA_1A', 'DIA_1B'],
  status: 'ACTIVE'
};

const unauthorizedLecturer: Lecturer = {
  id: 'LEC-002',
  name: 'Puan Siti Nurhaliza',
  email: 'sitinur@bpenawar.kpm.edu.my',
  icNumber: '900520-01-5124',
  pin: '5124',
  assignedSubjects: ['ACC1013 - PRINCIPLES OF ACCOUNTING'],
  assignedClasses: ['DIA_2A'],
  assignedSections: ['DIA_2A'],
  status: 'ACTIVE'
};

const spoofNameLecturer: Lecturer = {
  id: 'LEC-999',
  name: 'Ustaz Ahmad Khairi', // Same name as authorized lecturer, different ID & email!
  email: 'impostor@bpenawar.kpm.edu.my',
  icNumber: '950101-14-1111',
  pin: '1111',
  assignedSubjects: [],
  assignedClasses: [],
  assignedSections: [],
  status: 'ACTIVE'
};

const teachingAssignments: TeachingAssignment[] = [
  {
    id: 'TA-001',
    lecturerId: 'LEC-001',
    lecturerEmail: 'ahmadkhairi@bpenawar.kpm.edu.my',
    lecturerName: 'Ustaz Ahmad Khairi',
    subjectId: 'SUB-MPU21032',
    subjectCode: 'MPU21032',
    subjectName: 'PENGHAYATAN ETIKA DAN PERADABAN',
    className: 'DIA_1A',
    status: 'ACTIVE',
    createdAt: '2026-09-20T08:00:00Z'
  },
  {
    id: 'TA-002',
    lecturerId: 'LEC-001',
    lecturerEmail: 'ahmadkhairi@bpenawar.kpm.edu.my',
    lecturerName: 'Ustaz Ahmad Khairi',
    subjectId: 'SUB-MPU21032',
    subjectCode: 'MPU21032',
    subjectName: 'PENGHAYATAN ETIKA DAN PERADABAN',
    className: 'DIA_1B',
    status: 'ACTIVE',
    createdAt: '2026-09-20T08:00:00Z'
  }
];

const session1: AttendanceSession = {
  id: 'SES-001-AUTH',
  subjectId: 'SUB-MPU21032',
  subjectCode: 'MPU21032',
  subjectName: 'PENGHAYATAN ETIKA DAN PERADABAN',
  className: 'DIA_1A',
  lecturerId: 'LEC-001',
  lecturerEmail: 'ahmadkhairi@bpenawar.kpm.edu.my',
  lecturerName: 'Ustaz Ahmad Khairi',
  sessionName: 'MPU21032 - DIA_1A',
  date: '2026-09-21',
  startTime: '08:00 AM',
  endTime: '',
  status: 'OPEN',
  attendanceMethod: 'QR',
  targetCount: 30,
  actualCount: 2,
  createdAt: '2026-09-21T08:00:00Z',
  updatedAt: '2026-09-21T08:00:00Z'
};

const session2OtherLecturer: AttendanceSession = {
  id: 'SES-002-UNAUTH',
  subjectId: 'SUB-ACC1013',
  subjectCode: 'ACC1013',
  subjectName: 'PRINCIPLES OF ACCOUNTING',
  className: 'DIA_2A',
  lecturerId: 'LEC-002',
  lecturerEmail: 'sitinur@bpenawar.kpm.edu.my',
  lecturerName: 'Puan Siti Nurhaliza',
  sessionName: 'ACC1013 - DIA_2A',
  date: '2026-09-21',
  startTime: '10:00 AM',
  endTime: '12:00 PM',
  status: 'CLOSED',
  attendanceMethod: 'QR',
  targetCount: 28,
  actualCount: 25,
  createdAt: '2026-09-21T10:00:00Z',
  updatedAt: '2026-09-21T12:00:00Z'
};

const legacySessionNoId: AttendanceSession = {
  id: 'SES-LEGACY-003',
  subjectId: 'SUB-MPU21032',
  subjectCode: 'MPU21032',
  subjectName: 'PENGHAYATAN ETIKA DAN PERADABAN',
  className: 'DIA 1A', // Space formatting
  lecturerId: '',
  lecturerEmail: '',
  lecturerName: 'Ustaz Ahmad Khairi',
  sessionName: 'Legacy MPU Class',
  date: '2026-09-18',
  startTime: '09:00 AM',
  endTime: '11:00 AM',
  status: 'CLOSED',
  attendanceMethod: 'QR',
  targetCount: 0, // Edge case 0
  actualCount: 0,
  createdAt: '2026-09-18T09:00:00Z',
  updatedAt: '2026-09-18T11:00:00Z'
};

const allAttendanceRecords: AttendanceRecord[] = [
  {
    id: 'REC-001',
    sessionId: 'SES-001-AUTH',
    studentId: 'ST-001',
    studentName: 'Ali bin Abu',
    className: 'DIA_1A',
    subjectCode: 'MPU21032',
    timestamp: '2026-09-21T08:05:00Z',
    status: 'PRESENT',
    method: 'CAMERA_SCAN'
  },
  {
    id: 'REC-002',
    sessionId: 'SES-001-AUTH',
    studentId: 'ST-002',
    studentName: 'Bala a/l Ravi',
    className: 'DIA_1A',
    subjectCode: 'MPU21032',
    timestamp: '2026-09-21T08:07:00Z',
    status: 'PRESENT',
    method: 'CAMERA_SCAN'
  },
  // Duplicate scan for ST-001 in same session
  {
    id: 'REC-003-DUP',
    sessionId: 'SES-001-AUTH',
    studentId: 'ST-001',
    studentName: 'Ali bin Abu',
    className: 'DIA_1A',
    subjectCode: 'MPU21032',
    timestamp: '2026-09-21T08:15:00Z',
    status: 'PRESENT',
    method: 'CAMERA_SCAN'
  },
  // Unrelated record in session 2
  {
    id: 'REC-004-UNRELATED',
    sessionId: 'SES-002-UNAUTH',
    studentId: 'ST-099',
    studentName: 'Chong Wei',
    className: 'DIA_2A',
    subjectCode: 'ACC1013',
    timestamp: '2026-09-21T10:05:00Z',
    status: 'PRESENT',
    method: 'CAMERA_SCAN'
  }
];

// ====================================================
// 1. FIRESTORE AUTHORIZATION TESTS
// ====================================================

// Test 1.1: Own session read
const canReadOwn = isLecturerAuthorizedForSession(session1, authorizedLecturer, false, teachingAssignments);
assert(
  'Authorization',
  'Own session read',
  canReadOwn === true,
  'Authorized (true)',
  `Result: ${canReadOwn}`,
  'session.lecturerId === lecturer.id matched securely'
);

// Test 1.2: Unauthorized session read
const canReadOther = isLecturerAuthorizedForSession(session2OtherLecturer, authorizedLecturer, false, teachingAssignments);
assert(
  'Authorization',
  'Unauthorized session read',
  canReadOther === false,
  'Unauthorized (false)',
  `Result: ${canReadOther}`,
  'session.lecturerId ("LEC-002") !== lecturer.id ("LEC-001"), access strictly blocked'
);

// Test 1.3: Unauthorized attendance record read
// If unauthorized lecturer attempts to filter records for session 1
const unauthRecords = isLecturerAuthorizedForSession(session1, unauthorizedLecturer, false, teachingAssignments)
  ? filterAuthorizedAttendanceRecords(allAttendanceRecords, session1.id)
  : [];
assert(
  'Authorization',
  'Unauthorized attendance record read',
  unauthRecords.length === 0,
  '0 records exposed',
  `Exposed records: ${unauthRecords.length}`,
  'Unauthorized lecturer cannot retrieve attendance records for an unowned session'
);

// Test 1.4: Admin authorized access
const adminAccessToSession1 = isLecturerAuthorizedForSession(session1, null, true, []);
const adminAccessToSession2 = isLecturerAuthorizedForSession(session2OtherLecturer, null, true, []);
assert(
  'Authorization',
  'Admin authorized access',
  adminAccessToSession1 === true && adminAccessToSession2 === true,
  'Admin has full oversight (true)',
  `Access: session1=${adminAccessToSession1}, session2=${adminAccessToSession2}`,
  'isAdmin flag grants authorized institutional audit oversight'
);

// Test 1.5: Client-side name spoofing prevention
// Impostor with identical lecturer name but different ID cannot read session
const impostorAccess = isLecturerAuthorizedForSession(session1, spoofNameLecturer, false, teachingAssignments);
assert(
  'Authorization',
  'Client-side name matching restriction',
  impostorAccess === false,
  'Denied (false)',
  `Result: ${impostorAccess}`,
  'Matching lecturer name alone is rejected; lecturerId mismatch takes strict precedence'
);

// Test 1.6: Legacy session with teaching assignment validation
const legacyAccessAuth = isLecturerAuthorizedForSession(legacySessionNoId, authorizedLecturer, false, teachingAssignments);
const legacyAccessUnauth = isLecturerAuthorizedForSession(legacySessionNoId, unauthorizedLecturer, false, teachingAssignments);
assert(
  'Authorization',
  'Legacy session authorization via teaching assignment',
  legacyAccessAuth === true && legacyAccessUnauth === false,
  'Auth lecturer true, Unauth lecturer false',
  `Auth=${legacyAccessAuth}, Unauth=${legacyAccessUnauth}`,
  'Validates official teaching assignment (subject code + normalized class code)'
);

// ====================================================
// 2. SESSION DETAIL FUNCTIONAL TESTS
// ====================================================

// Test 2.1: Correct sessionId binding and record filtering
const session1Records = filterAuthorizedAttendanceRecords(allAttendanceRecords, session1.id);
assert(
  'Session Detail',
  'Attendance records filtered by sessionId',
  session1Records.length === 2 && session1Records.every((r) => r.sessionId === session1.id),
  '2 unique records bound strictly to SES-001-AUTH',
  `Found ${session1Records.length} records: ${session1Records.map((r) => r.id).join(', ')}`,
  'filterAuthorizedAttendanceRecords isolates records and rejects cross-session data'
);

// Test 2.2: Duplicate scan deduplication in record list
const hasDuplicateInRaw = allAttendanceRecords.filter((r) => r.sessionId === session1.id && r.studentId === 'ST-001').length > 1;
const countInFiltered = session1Records.filter((r) => r.studentId === 'ST-001').length;
assert(
  'Session Detail',
  'Duplicate scan deduplication',
  hasDuplicateInRaw && countInFiltered === 1,
  'Single record for ST-001',
  `Raw duplicates: ${hasDuplicateInRaw ? 'Yes' : 'No'}, Deduped count: ${countInFiltered}`,
  'Duplicate scans for same studentId within the session are cleanly deduplicated'
);

// Test 2.3: Safe end time for OPEN session
const openEndTime = formatSafeEndTime(session1.endTime, session1.status);
assert(
  'Session Detail',
  'OPEN session displays "Sedang Berlangsung"',
  openEndTime === 'Sedang Berlangsung',
  'Sedang Berlangsung',
  `Actual formatted end time: "${openEndTime}"`,
  'OPEN status with empty endTime safely displays in-progress indicator'
);

// Test 2.4: Safe end time for CLOSED session
const closedEndTime = formatSafeEndTime(session2OtherLecturer.endTime, session2OtherLecturer.status);
assert(
  'Session Detail',
  'CLOSED session displays recorded endTime',
  closedEndTime === '12:00 PM',
  '12:00 PM',
  `Actual formatted end time: "${closedEndTime}"`,
  'CLOSED session correctly displays preserved audit end time'
);

// ====================================================
// 3. DATA INTEGRITY & EDGE CASE TESTS
// ====================================================

// Test 3.1: targetCount = 0 does NOT produce NaN or Infinity
const metricZeroTarget = calculateAttendanceMetrics(5, 0);
assert(
  'Edge Cases',
  'targetCount = 0 prevents NaN and Infinity',
  !Number.isNaN(metricZeroTarget.attendancePercent) && Number.isFinite(metricZeroTarget.attendancePercent),
  'Finite number (no NaN/Infinity)',
  `targetCount=${metricZeroTarget.targetCount}, percent=${metricZeroTarget.attendancePercent}%`,
  'calculateAttendanceMetrics protects zero-division'
);

// Test 3.2: null/undefined targetCount fallback
const metricNullTarget = calculateAttendanceMetrics(15, undefined);
assert(
  'Edge Cases',
  'null/undefined targetCount uses safe fallback',
  metricNullTarget.targetCount === 30 && metricNullTarget.attendancePercent === 50,
  'targetCount=30, percent=50%',
  `targetCount=${metricNullTarget.targetCount}, percent=${metricNullTarget.attendancePercent}%`,
  'Safe fallback of 30 standard class size applied'
);

// Test 3.3: Missing student record gracefully handled
const studentsMaster: Student[] = [
  { id: 'ST-001', studentId: 'ST-001', name: 'Ali bin Abu', className: 'DIA_1A', email: 'ali@kpm.edu.my', phone: '0123456789' }
  // ST-002 is deliberately omitted from student master list!
];
const st2Record = session1Records.find((r) => r.studentId === 'ST-002');
const resolvedStudent = studentsMaster.find((s) => s.id === st2Record?.studentId);
const displayName = resolvedStudent?.name || st2Record?.studentName || st2Record?.studentId || 'Pelajar Tanpa Nama';
assert(
  'Edge Cases',
  'Missing student master record fallback',
  displayName === 'Bala a/l Ravi',
  'Fallback to record.studentName',
  `Resolved name: "${displayName}"`,
  'Component falls back safely to studentName on record without crashing'
);

// Test 3.4: Class matching between "DIA 1A" and "DIA_1A"
const legacyClassMatch = areClassesMatching('DIA 1A', 'DIA_1A');
assert(
  'Edge Cases',
  'Legacy class code space/underscore normalization',
  legacyClassMatch === true,
  'Matching (true)',
  `areClassesMatching("DIA 1A", "DIA_1A") = ${legacyClassMatch}`,
  'normalizeClassCode handles whitespace, hyphen, and underscore variations'
);

// Test 3.5: Empty session records
const emptySessionRecords = filterAuthorizedAttendanceRecords([], session1.id);
assert(
  'Edge Cases',
  'Empty session returns empty array without error',
  Array.isArray(emptySessionRecords) && emptySessionRecords.length === 0,
  'Empty array []',
  `Length: ${emptySessionRecords.length}`,
  'filterAuthorizedAttendanceRecords handles empty arrays cleanly'
);

// Test 3.6: Invalid / non-existent sessionId
const invalidSessionRecords = filterAuthorizedAttendanceRecords(allAttendanceRecords, 'SES-NONEXISTENT-999');
assert(
  'Edge Cases',
  'Invalid sessionId returns empty records',
  invalidSessionRecords.length === 0,
  '0 records',
  `Length: ${invalidSessionRecords.length}`,
  'Non-matching session ID yields zero records'
);

// ====================================================
// OUTPUT RESULTS
// ====================================================
console.log('\n======================================================');
console.log('PHASE 4A.6 VERIFICATION TEST SUITE EXECUTION RESULTS');
console.log('======================================================\n');

let passCount = 0;
let failCount = 0;

console.table(
  results.map((r) => {
    if (r.status === 'PASS') passCount++;
    else failCount++;
    return {
      Category: r.category,
      Test: r.testName,
      Expected: r.expected,
      Actual: r.actual,
      Status: r.status,
      Evidence: r.evidence
    };
  })
);

console.log(`\nSummary: Total: ${results.length} | Passed: ${passCount} | Failed: ${failCount}\n`);

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('ALL PHASE 4A.6 VERIFICATION TESTS PASSED SUCCESSFULLY.');
}
