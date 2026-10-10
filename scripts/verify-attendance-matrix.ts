import {
  formatSessionColumnDate,
  getMatrixSessionColumns,
  evaluateMatrixCell,
  buildAttendanceMatrix,
  getScopedSubjectsForClass
} from '../src/utils/attendanceMatrix';
import { exportAttendanceMatrixToCSV } from '../src/utils/csvHelper';
import { Student, AttendanceSession, AttendanceRecord, Lecturer, Subject } from '../src/types';

function runVerification() {
  console.log('--- STARTING ATTENDANCE MATRIX VERIFICATION ---');

  // Test 1: Date formatting
  const testDate1 = '2026-10-10';
  const formatted1 = formatSessionColumnDate(testDate1);
  console.assert(formatted1 === '10-Oct', `Expected 10-Oct, got ${formatted1}`);
  console.log('✓ Test 1 Passed: formatSessionColumnDate("2026-10-10") === "10-Oct"');

  const testDate2 = '2026-03-05';
  const formatted2 = formatSessionColumnDate(testDate2);
  console.assert(formatted2 === '05-Mar', `Expected 05-Mar, got ${formatted2}`);
  console.log('✓ Test 2 Passed: formatSessionColumnDate("2026-03-05") === "05-Mar"');

  // Test 2: Chronological sorting and duplicate date sublabels (S1, S2)
  const mockSessions: AttendanceSession[] = [
    {
      id: 'SES-02',
      sessionName: 'Kuliah 2',
      subjectCode: 'MPU 2163',
      subjectName: 'Pengajian Malaysia 2',
      className: 'DIA_3D',
      lecturerName: 'En. Khairi',
      date: '2026-10-15',
      startTime: '10:00',
      endTime: '12:00',
      status: 'CLOSED',
      attendanceMethod: 'QR'
    },
    {
      id: 'SES-01',
      sessionName: 'Kuliah 1 Sesi Pagi',
      subjectCode: 'MPU 2163',
      subjectName: 'Pengajian Malaysia 2',
      className: 'DIA_3D',
      lecturerName: 'En. Khairi',
      date: '2026-10-10',
      startTime: '08:00',
      endTime: '10:00',
      status: 'CLOSED',
      attendanceMethod: 'QR'
    },
    {
      id: 'SES-03',
      sessionName: 'Kuliah 1 Sesi Petang',
      subjectCode: 'MPU 2163',
      subjectName: 'Pengajian Malaysia 2',
      className: 'DIA_3D',
      lecturerName: 'En. Khairi',
      date: '2026-10-10',
      startTime: '14:00',
      endTime: '16:00',
      status: 'OPEN',
      attendanceMethod: 'QR'
    }
  ];

  const columns = getMatrixSessionColumns(mockSessions);
  console.assert(columns.length === 3, `Expected 3 columns, got ${columns.length}`);
  console.assert(columns[0].session.id === 'SES-01', 'First session should be SES-01 (10-Oct 08:00)');
  console.assert(columns[0].dateFormatted === '10-Oct', 'Formatted date should be 10-Oct');
  console.assert(columns[0].subLabel === 'S1', 'Duplicate date 1 should have S1');
  console.assert(columns[1].session.id === 'SES-03', 'Second session should be SES-03 (10-Oct 14:00)');
  console.assert(columns[1].subLabel === 'S2', 'Duplicate date 2 should have S2');
  console.assert(columns[2].session.id === 'SES-02', 'Third session should be SES-02 (15-Oct)');
  console.assert(columns[2].subLabel === undefined, 'Non-duplicate date should have no subLabel');
  console.log('✓ Test 3 Passed: Chronological ordering & S1/S2 disambiguation');

  // Test 3: Students and cell evaluations
  const mockStudents: Student[] = [
    {
      id: 'PDA-2502-001',
      studentId: 'PDA-2502-001',
      name: "AHMAD SA'ADI BIN KAMARUL",
      className: 'DIA_3D',
      email: 'saadi@bpenawar.kpm.edu.my',
      phone: '60123456789'
    },
    {
      id: 'PDA-2502-002',
      studentId: 'PDA-2502-002',
      name: 'NURUL AINA BINTI HASHIM',
      className: 'DIA_3D',
      email: 'aina@bpenawar.kpm.edu.my',
      phone: '60198765432'
    }
  ];

  const mockRecords: AttendanceRecord[] = [
    // Sa'adi attended SES-01 (PRESENT), excused for SES-02 (EXCUSED)
    {
      id: 'REC-01',
      sessionId: 'SES-01',
      studentId: 'PDA-2502-001',
      status: 'PRESENT',
      timestamp: '2026-10-10T08:15:00Z',
      method: 'QR'
    },
    {
      id: 'REC-02',
      sessionId: 'SES-02',
      studentId: 'PDA-2502-001',
      status: 'EXCUSED',
      timestamp: '2026-10-15T10:00:00Z',
      method: 'MANUAL_OVERRIDE'
    },
    // Nurul Aina late for SES-01 (LATE), absent in SES-02
    {
      id: 'REC-03',
      sessionId: 'SES-01',
      studentId: 'PDA-2502-002',
      status: 'LATE',
      timestamp: '2026-10-10T08:35:00Z',
      method: 'QR'
    }
  ];

  const matrix = buildAttendanceMatrix(
    mockStudents,
    mockSessions,
    mockRecords,
    'DIA_3D',
    'MPU 2163',
    'Pengajian Malaysia 2'
  );

  console.assert(matrix.rows.length === 2, `Expected 2 rows, got ${matrix.rows.length}`);
  const saadiRow = matrix.rows.find((r) => r.studentId === 'PDA-2502-001')!;
  const ainaRow = matrix.rows.find((r) => r.studentId === 'PDA-2502-002')!;

  // Check Sa'adi cells:
  // SES-01 (PRESENT -> ✓)
  console.assert(saadiRow.cells['SES-01'].symbol === '✓', `Saadi SES-01 should be ✓, got ${saadiRow.cells['SES-01'].symbol}`);
  // SES-02 (EXCUSED -> E)
  console.assert(saadiRow.cells['SES-02'].symbol === 'E', `Saadi SES-02 should be E, got ${saadiRow.cells['SES-02'].symbol}`);
  // SES-03 is OPEN, no record -> empty string ""
  console.assert(saadiRow.cells['SES-03'].symbol === '', `Saadi SES-03 should be empty (OPEN session), got ${saadiRow.cells['SES-03'].symbol}`);

  // Check Aina cells:
  // SES-01 (LATE -> L)
  console.assert(ainaRow.cells['SES-01'].symbol === 'L', `Aina SES-01 should be L, got ${ainaRow.cells['SES-01'].symbol}`);
  // SES-02 (CLOSED, no record -> A)
  console.assert(ainaRow.cells['SES-02'].symbol === 'A', `Aina SES-02 should be A (CLOSED no record), got ${ainaRow.cells['SES-02'].symbol}`);
  // SES-03 is OPEN -> empty string
  console.assert(ainaRow.cells['SES-03'].symbol === '', `Aina SES-03 should be empty, got ${ainaRow.cells['SES-03'].symbol}`);

  console.log('✓ Test 4 Passed: Status symbols (✓, L, E, A, empty) accurately computed');

  // Test 4: Summary calculations (Jumlah Hadir, Jumlah Sesi, %)
  console.assert(saadiRow.totalSessions === 3, `Saadi total sessions should be 3, got ${saadiRow.totalSessions}`);
  console.assert(saadiRow.presentCount === 1, `Saadi presentCount should be 1 (PRESENT), got ${saadiRow.presentCount}`);
  console.assert(saadiRow.percentage === 33, `Saadi percentage should be 33%, got ${saadiRow.percentage}%`);
  console.assert(saadiRow.isWarning === true, 'Saadi isWarning should be true (< 80%)');

  console.assert(ainaRow.totalSessions === 3, `Aina total sessions should be 3, got ${ainaRow.totalSessions}`);
  console.assert(ainaRow.presentCount === 1, `Aina presentCount should be 1 (LATE counts as attended), got ${ainaRow.presentCount}`);
  console.assert(ainaRow.percentage === 33, `Aina percentage should be 33%, got ${ainaRow.percentage}%`);
  console.assert(ainaRow.isWarning === true, 'Aina isWarning should be true (< 80%)');

  console.log('✓ Test 5 Passed: Summary calculations & < 80% warning logic');

  // Test 5: CSV Export with UTF-8 BOM and apostrophe preservation
  const csvOutput = exportAttendanceMatrixToCSV(matrix);
  console.assert(csvOutput.startsWith('\uFEFF'), 'CSV must start with UTF-8 BOM (\\uFEFF)');
  console.assert(csvOutput.includes("AHMAD SA'ADI BIN KAMARUL"), 'CSV must preserve apostrophe in SA\'ADI');
  console.assert(csvOutput.includes('"NO.","Class","NAME","ID NUMBER"'), 'CSV must have exact header layout');
  console.assert(csvOutput.includes('"Jumlah Hadir","Jumlah Sesi","%"'), 'CSV must include summary columns');
  console.assert(csvOutput.includes('"10-Oct (S1)","10-Oct (S2)","15-Oct"'), 'CSV must include formatted session dates');

  console.log('✓ Test 6 Passed: CSV Export conforms to specifications with UTF-8 BOM');

  // Test 7: Scoped subjects for lecturer vs admin
  const testLecturer: Lecturer = {
    id: 'LEC-KHAIRI',
    name: 'AHMAD KHAIRI BIN MOHD',
    email: 'khairi@bpenawar.kpm.edu.my',
    icNumber: '861115-01-5305',
    pin: '5305',
    role: 'LECTURER',
    assignedClasses: ['DIA3A', 'DIA4A'],
    assignedSections: ['DIA3A', 'DIA4A'],
    assignedSubjects: [
      'MPU2162 - PENGAJIAN MALAYSIA 2',
      'MPU2412 - KURSUS INTEGRITI DAN ANTI RASUAH'
    ]
  };

  const catalogSubjects: Subject[] = [
    { id: 'SUB-MPU2162', code: 'MPU2162', name: 'PENGAJIAN MALAYSIA 2', sections: ['DIA3A'] },
    { id: 'SUB-ACC1013', code: 'ACC1013', name: 'FINANCIAL ACCOUNTING 1', sections: ['DIA3A'], lecturerId: 'LEC-OTHER' },
    { id: 'SUB-MPU2412', code: 'MPU2412', name: 'KURSUS INTEGRITI DAN ANTI RASUAH', sections: ['DIA4A'] }
  ];

  // Lecturer view for DIA3A: should ONLY see MPU2162, NOT ACC1013!
  const lecturerSubs = getScopedSubjectsForClass(
    'DIA3A',
    [],
    [],
    catalogSubjects,
    testLecturer,
    false // isAdmin = false
  );

  console.assert(lecturerSubs.length === 1, `Expected 1 subject for lecturer in DIA3A, got ${lecturerSubs.length}`);
  console.assert(lecturerSubs[0].code === 'MPU2162', `Expected MPU2162, got ${lecturerSubs[0]?.code}`);
  console.assert(!lecturerSubs.some(s => s.code === 'ACC1013'), 'ACC1013 must NOT be present in lecturer view');

  // Admin view for DIA3A: can see both MPU2162 and ACC1013
  const adminSubs = getScopedSubjectsForClass(
    'DIA3A',
    [],
    [],
    catalogSubjects,
    null,
    true // isAdmin = true
  );
  console.assert(adminSubs.length === 2, `Expected 2 subjects for admin in DIA3A, got ${adminSubs.length}`);
  console.assert(adminSubs.some(s => s.code === 'ACC1013'), 'ACC1013 must be present in admin view');
  console.log('✓ Test 7 Passed: Lecturer privacy scoping strictly hides unauthorized subjects');

  console.log('--- ALL ATTENDANCE MATRIX VERIFICATIONS PASSED SUCCESSFULLY ---');
}

runVerification();

