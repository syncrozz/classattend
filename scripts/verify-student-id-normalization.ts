import { attendanceEngine } from '../src/services/attendanceEngine';
import {
  normalizeStudentId,
  stripStudentId,
  isValidStudentIdFormat,
  findStudentById
} from '../src/utils/studentUtils';
import { INITIAL_STUDENTS } from '../src/data/mockData';
import { AttendanceSession } from '../src/types';

interface TestResult {
  step: number;
  category: string;
  testCase: string;
  expected: string;
  actual: string;
  status: 'PASS' | 'FAIL';
  notes: string;
}

const results: TestResult[] = [];

function assert(
  step: number,
  category: string,
  testCase: string,
  expected: string,
  actual: string,
  condition: boolean,
  notes: string
) {
  results.push({
    step,
    category,
    testCase,
    expected,
    actual,
    status: condition ? 'PASS' : 'FAIL',
    notes
  });
}

console.log('================================================================');
console.log('CLASSATTEND AUTOMATED VERIFICATION: STUDENT ID NORMALIZATION');
console.log('Testing Automatic Format Normalization: PDA2502032 -> PDA-2502-032');
console.log('================================================================\n');

// --- 1. Unit Normalization Tests ---
console.log('1. UNIT NORMALIZATION TESTS');
assert(
  1,
  'Normalization',
  'normalizeStudentId("PDA2502032") produces standard "PDA-2502-032"',
  'PDA-2502-032',
  normalizeStudentId('PDA2502032'),
  normalizeStudentId('PDA2502032') === 'PDA-2502-032',
  'Standard format produced without hyphens in input'
);

assert(
  2,
  'Normalization',
  'normalizeStudentId("PDA-2502-032") preserves standard "PDA-2502-032"',
  'PDA-2502-032',
  normalizeStudentId('PDA-2502-032'),
  normalizeStudentId('PDA-2502-032') === 'PDA-2502-032',
  'Hyphenated input remains consistent'
);

assert(
  3,
  'Normalization',
  'normalizeStudentId("pda2502032") (lowercase) normalizes to "PDA-2502-032"',
  'PDA-2502-032',
  normalizeStudentId('pda2502032'),
  normalizeStudentId('pda2502032') === 'PDA-2502-032',
  'Lowercase input properly capitalized'
);

assert(
  4,
  'Normalization',
  'normalizeStudentId("pda 2502 032") (spaces) normalizes to "PDA-2502-032"',
  'PDA-2502-032',
  normalizeStudentId('pda 2502 032'),
  normalizeStudentId('pda 2502 032') === 'PDA-2502-032',
  'Spaced input normalized'
);

assert(
  5,
  'Normalization',
  'normalizeStudentId("pda_2502_032") (underscores) normalizes to "PDA-2502-032"',
  'PDA-2502-032',
  normalizeStudentId('pda_2502_032'),
  normalizeStudentId('pda_2502_032') === 'PDA-2502-032',
  'Underscore input normalized'
);

assert(
  6,
  'Normalization',
  'normalizeStudentId("PDA-2502032") (partial delimiter) normalizes to "PDA-2502-032"',
  'PDA-2502-032',
  normalizeStudentId('PDA-2502032'),
  normalizeStudentId('PDA-2502032') === 'PDA-2502-032',
  'Partial hyphen normalized'
);

assert(
  7,
  'Normalization',
  'normalizeStudentId("PDA2402001") normalizes to "PDA-2402-001"',
  'PDA-2402-001',
  normalizeStudentId('PDA2402001'),
  normalizeStudentId('PDA2402001') === 'PDA-2402-001',
  'Other batches supported'
);

assert(
  8,
  'Integrity',
  'Unrelated ID "ST001" and "LEC-KHAIRI" remain uncorrupted',
  'ST001, LEC-KHAIRI',
  `${normalizeStudentId('ST001')}, ${normalizeStudentId('LEC-KHAIRI')}`,
  normalizeStudentId('ST001') === 'ST001' && normalizeStudentId('LEC-KHAIRI') === 'LEC-KHAIRI',
  'Unrelated IDs untouched'
);

assert(
  9,
  'Validation',
  'isValidStudentIdFormat validates collegiate IDs and rejects invalid ones',
  'true, true, false, false',
  `${isValidStudentIdFormat('PDA2502032')}, ${isValidStudentIdFormat('PDA-2502-032')}, ${isValidStudentIdFormat('PDA123')}, ${isValidStudentIdFormat('INVALID')}`,
  isValidStudentIdFormat('PDA2502032') &&
    isValidStudentIdFormat('PDA-2502-032') &&
    !isValidStudentIdFormat('PDA123') &&
    !isValidStudentIdFormat('INVALID'),
  'Validation guard active'
);

// --- 2. Database Lookup & Identity Matching ---
console.log('\n2. DATABASE LOOKUP & IDENTITY MATCHING TESTS');
const studentUnhyphenated = attendanceEngine.getStudentById('PDA2502032');
const studentHyphenated = attendanceEngine.getStudentById('PDA-2502-032');

assert(
  10,
  'DB Lookup',
  'attendanceEngine.getStudentById("PDA2502032") finds student in database',
  'NURIRDINA NADIA BINTI MOHAMD AIROLNIZAM',
  studentUnhyphenated ? studentUnhyphenated.name : 'NOT_FOUND',
  studentUnhyphenated !== undefined && studentUnhyphenated.id === 'PDA-2502-032',
  'Found student record from unhyphenated input'
);

assert(
  11,
  'DB Lookup',
  'attendanceEngine.getStudentById("PDA-2502-032") finds identical student in database',
  'NURIRDINA NADIA BINTI MOHAMD AIROLNIZAM',
  studentHyphenated ? studentHyphenated.name : 'NOT_FOUND',
  studentHyphenated !== undefined && studentHyphenated.id === 'PDA-2502-032',
  'Found student record from hyphenated input'
);

assert(
  12,
  'DB Lookup',
  'Both queries resolve to the exact same student record reference and ID',
  studentHyphenated?.id || '',
  studentUnhyphenated?.id || '',
  studentUnhyphenated !== undefined && studentHyphenated !== undefined && studentUnhyphenated.id === studentHyphenated.id,
  'Both inputs refer to identical student'
);

const findUnhyphenated = findStudentById(INITIAL_STUDENTS, 'PDA2502032');
const findHyphenated = findStudentById(INITIAL_STUDENTS, 'PDA-2502-032');

assert(
  13,
  'Utility Lookup',
  'findStudentById resolves both "PDA2502032" and "PDA-2502-032" to student',
  'PDA-2502-032',
  `${findUnhyphenated?.studentId} === ${findHyphenated?.studentId}`,
  findUnhyphenated !== null && findHyphenated !== null && findUnhyphenated.id === findHyphenated.id,
  'findStudentById utility matches correctly'
);

const nonExistent = attendanceEngine.getStudentById('PDA9999999');
const invalidQuery = attendanceEngine.getStudentById('INVALID_INPUT');

assert(
  14,
  'Rejection',
  'Invalid/non-existent student IDs return undefined (no phantom match)',
  'undefined, undefined',
  `${String(nonExistent)}, ${String(invalidQuery)}`,
  nonExistent === undefined && invalidQuery === undefined,
  'Invalid inputs rejected safely'
);

// --- 3. Attendance Workflow & Duplicate Prevention ---
console.log('\n3. ATTENDANCE WORKFLOW & DUPLICATE PREVENTION TESTS');

// Create test session for DIA_4B
const testSession: AttendanceSession = {
  id: `SESS_TEST_${Date.now()}`,
  sessionName: 'Kelas Akaun DIA 4B Test Normalization',
  date: new Date().toISOString().split('T')[0],
  startTime: '08:00',
  endTime: '10:00',
  status: 'OPEN',
  attendanceMethod: 'CAMERA_SCAN',
  subjectCode: 'ACC1013',
  subjectName: 'FINANCIAL ACCOUNTING 1',
  className: 'DIA_4B',
  lecturerName: 'AHMAD KHAIRI BIN MOHD',
  createdAt: new Date().toISOString()
};

attendanceEngine.addSession(testSession);

// First scan with unhyphenated input: 'PDA2502032'
const scan1 = attendanceEngine.processScan('PDA2502032', 'MANUAL', testSession.id);

assert(
  15,
  'Attendance Workflow',
  'processScan("PDA2502032") succeeds and records student',
  'success: true, code: RECORDED',
  `success: ${scan1.success}, code: ${scan1.code}`,
  scan1.success === true && scan1.code === 'RECORDED',
  'First scan with unhyphenated ID recorded successfully'
);

assert(
  16,
  'Attendance Record Integrity',
  'Created attendance record contains standardized ID "PDA-2502-032"',
  'PDA-2502-032',
  scan1.record ? scan1.record.studentId : 'NO_RECORD',
  scan1.record !== undefined && scan1.record.studentId === 'PDA-2502-032',
  'Standard format preserved in attendance record'
);

// Second scan with hyphenated input: 'PDA-2502-032'
const scan2 = attendanceEngine.processScan('PDA-2502-032', 'CAMERA_SCAN', testSession.id);

assert(
  17,
  'Duplicate Prevention',
  'processScan("PDA-2502-032") detects duplicate and does not create second record',
  'success: false, code: ALREADY_RECORDED, isDuplicate: true',
  `success: ${scan2.success}, code: ${scan2.code}, isDuplicate: ${scan2.isDuplicate}`,
  scan2.success === false && scan2.code === 'ALREADY_RECORDED' && scan2.isDuplicate === true,
  'Duplicate strictly prevented when using different ID format'
);

// Verify records count for this session
const allRecords = attendanceEngine.getAttendanceRecords().filter((r) => r.sessionId === testSession.id);

assert(
  18,
  'Duplicate Prevention',
  'Exactly 1 attendance record exists for the session (no duplicate created)',
  '1 record',
  `${allRecords.length} record(s)`,
  allRecords.length === 1,
  'Single record invariant maintained'
);

// Third scan with QR prefix format: 'CLASSATTEND|PDA2502032'
const scan3 = attendanceEngine.processScan('CLASSATTEND|PDA2502032', 'CAMERA_SCAN', testSession.id);

assert(
  19,
  'QR Format Normalization',
  'processScan("CLASSATTEND|PDA2502032") recognizes ID and identifies duplicate',
  'ALREADY_RECORDED',
  scan3.code,
  scan3.code === 'ALREADY_RECORDED',
  'Prefix string parsed and normalized properly'
);

// Scan non-existent ID
const scanInvalid = attendanceEngine.processScan('PDA9999999', 'MANUAL', testSession.id);

assert(
  20,
  'Rejection',
  'processScan("PDA9999999") rejects unknown student with STUDENT_NOT_FOUND',
  'STUDENT_NOT_FOUND',
  scanInvalid.code,
  scanInvalid.code === 'STUDENT_NOT_FOUND' && scanInvalid.success === false,
  'Unknown student rejected'
);

// Clean up test session
attendanceEngine.deleteSession(testSession.id);

// --- 4. Enrollment & Registration Deduplication Test ---
console.log('\n4. ENROLLMENT REGISTRATION DEDUPLICATION TEST');

async function testRegistration() {
  const existingCount = attendanceEngine.getStudents().length;
  const regResult = await attendanceEngine.registerStudentEnrollment({
    studentId: 'PDA2502032', // input without hyphen
    name: 'NURIRDINA NADIA BINTI MOHAMD AIROLNIZAM',
    className: 'DIA_4B',
    subjectCode: 'MPU2162'
  });

  const finalCount = attendanceEngine.getStudents().length;

  assert(
    21,
    'Enrollment Safety',
    'registerStudentEnrollment("PDA2502032") detects existing student and sets isNewStudent=false',
    'isNewStudent: false',
    `isNewStudent: ${regResult.isNewStudent}`,
    regResult.isNewStudent === false,
    'Existing student recognized without creating duplicate record'
  );

  assert(
    22,
    'Enrollment Safety',
    'Total student count remains unchanged (no duplicate student added)',
    `${existingCount}`,
    `${finalCount}`,
    existingCount === finalCount,
    'Student master directory integrity intact'
  );

  // Print results table
  console.log('\n================================================================');
  console.log('VERIFICATION TEST RESULTS TABLE');
  console.log('================================================================');
  console.table(
    results.map((r) => ({
      Step: r.step,
      Category: r.category,
      TestCase: r.testCase,
      Expected: r.expected,
      Actual: r.actual,
      Status: r.status
    }))
  );

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`\nTOTAL: ${results.length} | PASSED: ${passed} | FAILED: ${failed}`);

  if (failed > 0) {
    console.error('❌ SOME TESTS FAILED!');
    process.exit(1);
  } else {
    console.log('✅ ALL 22 VERIFICATION AUDIT TESTS PASSED WITH 100% SUCCESS!');
    process.exit(0);
  }
}

testRegistration().catch((e) => {
  console.error('Test execution error:', e);
  process.exit(1);
});
