import { attendanceEngine } from '../src/services/attendanceEngine';
import {
  stripStudentId,
  normalizeStudentId,
  findStudentById
} from '../src/utils/studentUtils';
import { Student, AttendanceSession } from '../src/types';

console.log('================================================================');
console.log('VERIFYING STUDENT CHECKIN MODAL AUTO-SUGGEST & ID MATCHING');
console.log('================================================================\n');

const students = attendanceEngine.getStudents();
const targetStudent = students.find((s) => s.studentId === 'PDA-2502-075');

if (!targetStudent) {
  console.error('Target student PDA-2502-075 not found in database!');
  process.exit(1);
}

console.log(`Target student found: ${targetStudent.name} (${targetStudent.studentId})\n`);

// The 6 test inputs specified in user request
const testInputs = [
  'PDA-2502-075',
  'PDA2502075',
  'pda2502075',
  'pda 2502 075',
  'PDA_2502_075',
  'PDA-2502075'
];

// Test 1: quickStudentMatches logic
console.log('--- TEST 1: quickStudentMatches Auto-Suggest Filter ---');
testInputs.forEach((input) => {
  const q = input.toLowerCase().trim();
  const qStripped = stripStudentId(input);

  const matches = students
    .filter((s) => {
      if (!q || q.length < 2) return false;
      const studentIdMatch = qStripped.length >= 2 && stripStudentId(s.studentId).includes(qStripped);
      return (
        studentIdMatch ||
        s.name.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q)
      );
    })
    .slice(0, 5);

  const foundTarget = matches.some((s) => s.studentId === 'PDA-2502-075');
  console.log(`Input "${input}" (stripped: "${qStripped}"): ${foundTarget ? '✅ MATCHED' : '❌ FAILED'}`);
  if (!foundTarget) {
    console.error(`FAILED for input "${input}"`);
    process.exit(1);
  }
});

// Test 2: Name and Class match in quickStudentMatches
console.log('\n--- TEST 2: Name & Class in quickStudentMatches ---');
const nameMatches = students
  .filter((s) => {
    const q = 'faizzudin';
    const qStripped = stripStudentId(q);
    const studentIdMatch = qStripped.length >= 2 && stripStudentId(s.studentId).includes(qStripped);
    return (
      studentIdMatch ||
      s.name.toLowerCase().includes(q) ||
      s.className.toLowerCase().includes(q)
    );
  })
  .slice(0, 5);
console.log(`Search by name "faizzudin": ${nameMatches.some((s) => s.studentId === 'PDA-2502-075') ? '✅ MATCHED' : '❌ FAILED'}`);

// Test 3: Lookup / Submit resolution for all 6 inputs
console.log('\n--- TEST 3: Sahkan Kehadiran Lookup Resolution ---');
testInputs.forEach((input) => {
  const rawInput = input.trim();
  const normalizedInput = normalizeStudentId(rawInput);

  const found =
    findStudentById(students, rawInput) ||
    attendanceEngine.getStudentById(rawInput) ||
    (normalizedInput ? findStudentById(students, normalizedInput) : null) ||
    (normalizedInput ? attendanceEngine.getStudentById(normalizedInput) : null);

  const isCorrect = found !== null && found !== undefined && found.studentId === 'PDA-2502-075';
  console.log(`Lookup "${input}": ${isCorrect ? `✅ Resolved to ${found?.studentId} (${found?.name})` : '❌ FAILED'}`);
  if (!isCorrect) {
    console.error(`Lookup failed for input "${input}"`);
    process.exit(1);
  }
});

// Test 4: End-to-end Session Attendance Recording & Duplicate Prevention across input formats
console.log('\n--- TEST 4: End-to-end Session Attendance Recording ---');
const testSession: AttendanceSession = {
  id: `SESS_FUZZY_${Date.now()}`,
  sessionName: 'Test Fuzzy Attendance Checkin',
  date: new Date().toISOString().split('T')[0],
  startTime: '09:00',
  endTime: '11:00',
  status: 'OPEN',
  attendanceMethod: 'CAMERA_SCAN',
  subjectCode: 'ACC1013',
  subjectName: 'FINANCIAL ACCOUNTING 1',
  className: 'DIA_4B',
  lecturerName: 'AHMAD KHAIRI BIN MOHD',
  createdAt: new Date().toISOString()
};

attendanceEngine.addSession(testSession);

// First scan with unhyphenated input: 'pda2502075'
const scan1 = attendanceEngine.processScan('pda2502075', 'QR', testSession.id);
console.log(`Scan 1 ('pda2502075'): success=${scan1.success}, record=${scan1.record?.studentId}`);
if (!scan1.success || scan1.record?.studentId !== 'PDA-2502-075') {
  console.error('Scan 1 failed to record attendance for PDA-2502-075');
  process.exit(1);
}

// Second scan with spaced input: 'pda 2502 075' -> Must detect duplicate
const scan2 = attendanceEngine.processScan('pda 2502 075', 'QR', testSession.id);
console.log(`Scan 2 ('pda 2502 075'): success=${scan2.success}, isDuplicate=${scan2.isDuplicate}`);
if (scan2.success !== false || !scan2.isDuplicate) {
  console.error('Scan 2 failed to detect duplicate across input formats');
  process.exit(1);
}

// Clean up
attendanceEngine.deleteSession(testSession.id);

console.log('\n================================================================');
console.log('✅ ALL AUTO-SUGGEST & FUZZY ID NORMALIZATION VERIFICATIONS PASSED!');
console.log('================================================================\n');

process.exit(0);
