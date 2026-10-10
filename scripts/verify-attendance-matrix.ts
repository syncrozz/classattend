/**
 * Verification Test Suite: Attendance Matrix View & CSV Export
 */

import { buildAttendanceMatrix, formatSessionMatrixDate } from '../src/utils/attendanceMatrix';
import { exportAttendanceMatrixToCSV } from '../src/utils/csvHelper';
import { Student, AttendanceSession, AttendanceRecord, Subject } from '../src/types';

interface TestResult {
  category: string;
  testCase: string;
  passed: boolean;
  expected: string;
  actual: string;
}

const results: TestResult[] = [];

function assert(
  category: string,
  testCase: string,
  condition: boolean,
  expected: string,
  actual: string
) {
  results.push({ category, testCase, passed: condition, expected, actual });
  const icon = condition ? '✅' : '❌';
  console.log(`${icon} [${category}] ${testCase}`);
  if (!condition) {
    console.error(`   Expected: ${expected}`);
    console.error(`   Actual:   ${actual}`);
  }
}

async function runAttendanceMatrixAudit() {
  console.log('================================================================');
  console.log('AUDIT: ATTENDANCE MATRIX REPORT & EXCEL CSV EXPORT');
  console.log('================================================================\n');

  // 1. Mock Data Setup
  const mockStudents: Student[] = [
    {
      id: 'STU-001',
      studentId: 'PDA-2502-006',
      name: 'MUHAMMAD DANISH BIN SHAMSUDDIN',
      className: 'DIA_3D',
      email: 'danish@student.kpm.edu.my',
      phone: '0123456781'
    },
    {
      id: 'STU-002',
      studentId: 'PDA-2502-079',
      name: "AININ SOFIYA BINTI MD SAIFUL SA'ADI", // Special apostrophe character
      className: 'DIA_3D',
      email: 'ainin@student.kpm.edu.my',
      phone: '0123456782'
    },
    {
      id: 'STU-003',
      studentId: 'PDA-2502-099',
      name: 'AMIRUL HAKIM BIN DAUD',
      className: 'DIA_3D',
      email: 'amirul@student.kpm.edu.my',
      phone: '0123456783'
    }
  ];

  const mockSessions: AttendanceSession[] = [
    {
      id: 'SES-01',
      sessionName: 'MPU 2163 - DIA_3D',
      subjectCode: 'MPU 2163',
      subjectName: 'Pengajian Malaysia 2',
      className: 'DIA_3D',
      lecturerName: 'Dr. Siti Aminah',
      date: '2026-10-10',
      startTime: '08:00 AM',
      endTime: '10:00 AM',
      status: 'CLOSED',
      attendanceMethod: 'QR',
      targetCount: 3,
      actualCount: 2,
      createdAt: '2026-10-10T08:00:00Z',
      updatedAt: '2026-10-10T10:00:00Z'
    },
    {
      id: 'SES-02',
      sessionName: 'MPU 2163 - DIA_3D (S2)',
      subjectCode: 'MPU 2163',
      subjectName: 'Pengajian Malaysia 2',
      className: 'DIA_3D',
      lecturerName: 'Dr. Siti Aminah',
      date: '2026-10-10', // Same date to test S1/S2 sublabel!
      startTime: '02:00 PM',
      endTime: '04:00 PM',
      status: 'CLOSED',
      attendanceMethod: 'QR',
      targetCount: 3,
      actualCount: 2,
      createdAt: '2026-10-10T14:00:00Z',
      updatedAt: '2026-10-10T16:00:00Z'
    },
    {
      id: 'SES-03',
      sessionName: 'MPU 2163 - DIA_3D',
      subjectCode: 'MPU 2163',
      subjectName: 'Pengajian Malaysia 2',
      className: 'DIA_3D',
      lecturerName: 'Dr. Siti Aminah',
      date: '2026-10-12',
      startTime: '10:00 AM',
      endTime: '12:00 PM',
      status: 'CLOSED',
      attendanceMethod: 'QR',
      targetCount: 3,
      actualCount: 3,
      createdAt: '2026-10-12T10:00:00Z',
      updatedAt: '2026-10-12T12:00:00Z'
    },
    {
      id: 'SES-04',
      sessionName: 'MPU 2163 - DIA_3D',
      subjectCode: 'MPU 2163',
      subjectName: 'Pengajian Malaysia 2',
      className: 'DIA_3D',
      lecturerName: 'Dr. Siti Aminah',
      date: '2026-10-15',
      startTime: '09:00 AM',
      endTime: '',
      status: 'OPEN', // Still open session
      attendanceMethod: 'QR',
      targetCount: 3,
      actualCount: 1,
      createdAt: '2026-10-15T09:00:00Z',
      updatedAt: '2026-10-15T09:00:00Z'
    }
  ];

  const mockRecords: AttendanceRecord[] = [
    // Session 1
    {
      id: 'REC-01',
      sessionId: 'SES-01',
      studentId: 'STU-001',
      status: 'PRESENT',
      timestamp: '2026-10-10T08:05:00Z',
      method: 'QR'
    },
    {
      id: 'REC-02',
      sessionId: 'SES-01',
      studentId: 'STU-002',
      status: 'LATE',
      timestamp: '2026-10-10T08:35:00Z',
      method: 'QR'
    },
    // STU-003 has no record in SES-01 (should be 'A' because SES-01 is CLOSED)

    // Session 2
    {
      id: 'REC-03',
      sessionId: 'SES-02',
      studentId: 'STU-001',
      status: 'PRESENT',
      timestamp: '2026-10-10T14:02:00Z',
      method: 'QR'
    },
    {
      id: 'REC-04',
      sessionId: 'SES-02',
      studentId: 'STU-002',
      status: 'EXCUSED',
      timestamp: '2026-10-10T14:00:00Z',
      method: 'QR'
    },

    // Session 3
    {
      id: 'REC-05',
      sessionId: 'SES-03',
      studentId: 'STU-001',
      status: 'PRESENT',
      timestamp: '2026-10-12T10:01:00Z',
      method: 'QR'
    },
    {
      id: 'REC-06',
      sessionId: 'SES-03',
      studentId: 'STU-002',
      status: 'PRESENT',
      timestamp: '2026-10-12T10:02:00Z',
      method: 'QR'
    },
    {
      id: 'REC-07',
      sessionId: 'SES-03',
      studentId: 'STU-003',
      status: 'PRESENT',
      timestamp: '2026-10-12T10:03:00Z',
      method: 'QR'
    },

    // Session 4 (OPEN)
    {
      id: 'REC-08',
      sessionId: 'SES-04',
      studentId: 'STU-001',
      status: 'PRESENT',
      timestamp: '2026-10-15T09:05:00Z',
      method: 'QR'
    }
    // STU-002 and STU-003 have no record in SES-04 (should be '' empty because SES-04 is OPEN)
  ];

  // -------------------------------------------------------------
  // TEST 1: Date Formatting (DD-MMM, English 3-letter months)
  // -------------------------------------------------------------
  const dateFormatted1 = formatSessionMatrixDate('2026-10-10');
  const dateFormatted2 = formatSessionMatrixDate('2026-03-05');
  assert(
    'Date Formatting',
    'Converts YYYY-MM-DD into DD-MMM format (e.g. 10-Oct, 5-Mar)',
    dateFormatted1 === '10-Oct' && dateFormatted2 === '5-Mar',
    '10-Oct and 5-Mar',
    `${dateFormatted1} and ${dateFormatted2}`
  );

  // -------------------------------------------------------------
  // TEST 2: Build Matrix Structure
  // -------------------------------------------------------------
  const matrix = buildAttendanceMatrix({
    selectedClass: 'DIA_3D',
    selectedSubjectCode: 'MPU 2163',
    students: mockStudents,
    sessions: mockSessions,
    attendanceRecords: mockRecords
  });

  assert(
    'Matrix Structure',
    'Matrix contains exactly 4 session columns and 3 student rows',
    matrix.sessionColumns.length === 4 && matrix.rows.length === 3,
    '4 columns, 3 rows',
    `${matrix.sessionColumns.length} columns, ${matrix.rows.length} rows`
  );

  // -------------------------------------------------------------
  // TEST 3: Duplicate Date Sublabels (S1, S2)
  // -------------------------------------------------------------
  const col1 = matrix.sessionColumns[0];
  const col2 = matrix.sessionColumns[1];
  assert(
    'Multiple Sessions Same Date',
    'Sessions on 2026-10-10 are tagged with sublabels S1 and S2',
    col1.displayDate === '10-Oct' && col1.subLabel === 'S1' &&
    col2.displayDate === '10-Oct' && col2.subLabel === 'S2',
    '10-Oct (S1) and 10-Oct (S2)',
    `${col1.displayDate} (${col1.subLabel}) and ${col2.displayDate} (${col2.subLabel})`
  );

  // -------------------------------------------------------------
  // TEST 4: Status Mapping (PRESENT, LATE, EXCUSED, ABSENT, OPEN_EMPTY)
  // -------------------------------------------------------------
  // Student 1 (Danish):
  // SES-01: PRESENT -> "/"
  // SES-02: PRESENT -> "/"
  // SES-03: PRESENT -> "/"
  // SES-04: PRESENT -> "/"
  const rowDanish = matrix.rows.find((r) => r.student.id === 'STU-001')!;
  assert(
    'Cell Values: Present',
    'Student with PRESENT status displays "/" symbol',
    rowDanish.cells['SES-01']?.symbol === '/' && rowDanish.cells['SES-01']?.status === 'PRESENT',
    'symbol: "/", status: "PRESENT"',
    `symbol: "${rowDanish.cells['SES-01']?.symbol}", status: "${rowDanish.cells['SES-01']?.status}"`
  );

  // Student 2 (Ainin Sofiya):
  // SES-01: LATE -> "L"
  // SES-02: EXCUSED -> "E"
  // SES-04: OPEN without scan -> "" (empty)
  const rowAinin = matrix.rows.find((r) => r.student.id === 'STU-002')!;
  assert(
    'Cell Values: Late & Excused',
    'Student with LATE status displays "L", EXCUSED displays "E"',
    rowAinin.cells['SES-01']?.symbol === 'L' && rowAinin.cells['SES-02']?.symbol === 'E',
    'SES-01: "L", SES-02: "E"',
    `SES-01: "${rowAinin.cells['SES-01']?.symbol}", SES-02: "${rowAinin.cells['SES-02']?.symbol}"`
  );

  assert(
    'Cell Values: Open Session Empty Cell',
    'Student with no record in an OPEN session displays empty cell ""',
    rowAinin.cells['SES-04']?.symbol === '' && rowAinin.cells['SES-04']?.status === 'OPEN_EMPTY',
    'symbol: "", status: "OPEN_EMPTY"',
    `symbol: "${rowAinin.cells['SES-04']?.symbol}", status: "${rowAinin.cells['SES-04']?.status}"`
  );

  // Student 3 (Amirul Hakim):
  // SES-01: CLOSED without scan -> "A" (Absent)
  const rowAmirul = matrix.rows.find((r) => r.student.id === 'STU-003')!;
  assert(
    'Cell Values: Absent in Closed Session',
    'Student with no record in a CLOSED session displays "A"',
    rowAmirul.cells['SES-01']?.symbol === 'A' && rowAmirul.cells['SES-01']?.status === 'ABSENT',
    'symbol: "A", status: "ABSENT"',
    `symbol: "${rowAmirul.cells['SES-01']?.symbol}", status: "${rowAmirul.cells['SES-01']?.status}"`
  );

  // -------------------------------------------------------------
  // TEST 5: Summary Calculations (Jumlah Hadir, Jumlah Sesi, %, KPI < 80%)
  // -------------------------------------------------------------
  // Danish: 4 present out of 4 sessions = 100%
  // Ainin: 3 attended (LATE + EXCUSED + PRESENT) out of 4 = 75% -> isBelowKPI: true
  // Amirul: 1 attended out of 4 = 25% -> isBelowKPI: true
  assert(
    'Summary Metrics',
    'Calculates present count and % attendance accurately',
    rowDanish.presentCount === 4 && rowDanish.rate === 100 && !rowDanish.isBelowKPI,
    'presentCount: 4, rate: 100%, isBelowKPI: false',
    `presentCount: ${rowDanish.presentCount}, rate: ${rowDanish.rate}%, isBelowKPI: ${rowDanish.isBelowKPI}`
  );

  assert(
    'KPI Threshold Alert (< 80%)',
    'Flags students below 80% attendance (isBelowKPI: true)',
    rowAinin.isBelowKPI === true && rowAmirul.isBelowKPI === true,
    'Ainin & Amirul isBelowKPI: true',
    `Ainin: ${rowAinin.isBelowKPI} (${rowAinin.rate}%), Amirul: ${rowAmirul.isBelowKPI} (${rowAmirul.rate}%)`
  );

  // -------------------------------------------------------------
  // TEST 6: CSV Export Generation & UTF-8 BOM Integrity
  // -------------------------------------------------------------
  const csvContent = exportAttendanceMatrixToCSV({
    className: matrix.className,
    subjectCode: matrix.subjectCode,
    subjectName: matrix.subjectName,
    sessionColumns: matrix.sessionColumns,
    rows: matrix.rows
  });

  const hasBOM = csvContent.startsWith('\uFEFF');
  const hasExpectedHeaders = csvContent.includes('NO.,Class,NAME,ID NUMBER,"10-Oct (S1)","10-Oct (S2)","12-Oct","15-Oct",Jumlah Hadir,Jumlah Sesi,%');
  const preservesApostrophe = csvContent.includes("AININ SOFIYA BINTI MD SAIFUL SA'ADI");

  assert(
    'CSV UTF-8 BOM Prefix',
    'CSV file strictly begins with UTF-8 BOM (\\uFEFF) for Excel compatibility',
    hasBOM,
    'Begins with \\uFEFF',
    hasBOM ? 'Begins with \\uFEFF' : 'Missing BOM'
  );

  assert(
    'CSV Header Columns Alignment',
    'CSV includes NO., Class, NAME, ID NUMBER, session dates, and summary columns',
    hasExpectedHeaders,
    'Contains exact required header format',
    csvContent.split('\n')[0].replace('\uFEFF', '')
  );

  assert(
    'CSV Special Character Preservation',
    'Preserves Malay apostrophes (e.g. SA\'ADI) without corruption',
    preservesApostrophe,
    "Contains \"AININ SOFIYA BINTI MD SAIFUL SA'ADI\"",
    preservesApostrophe ? 'Preserved intact' : 'Corrupted'
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
    console.log('\n✅ ALL ATTENDANCE MATRIX & CSV EXPORT AUDITS PASSED WITH ZERO REGRESSIONS.');
    process.exit(0);
  } else {
    console.error('\n❌ SOME AUDIT TESTS FAILED.');
    process.exit(1);
  }
}

runAttendanceMatrixAudit().catch((err) => {
  console.error('Fatal error during test execution:', err);
  process.exit(1);
});
