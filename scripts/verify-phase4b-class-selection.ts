/**
 * CLASS ATTEND — PHASE 4B.2-C VERIFICATION SUITE
 * LECTURER WORKSPACE CLASS SELECTION AUTHORIZATION & DATA SOURCE INTEGRITY
 * SES v4.5
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

import { INITIAL_TEACHING_ASSIGNMENTS, INITIAL_LECTURERS } from '../src/data/mockData';
import { TeachingAssignment, Lecturer, Subject } from '../src/types';

async function runVerification() {
  const { attendanceEngine } = await import('../src/services/attendanceEngine');

interface TestResult {
  scenario: string;
  test: string;
  expected: string;
  actual: string;
  status: 'PASS' | 'FAIL';
  evidence: string;
}

const results: TestResult[] = [];

function assert(scenario: string, test: string, condition: boolean, expected: string, actual: string, evidence: string) {
  results.push({
    scenario,
    test,
    expected,
    actual,
    status: condition ? 'PASS' : 'FAIL',
    evidence
  });
}

// Helper to simulate the exact authoritative derive logic in LecturerWorkspaceView
function deriveAvailableClasses(
  teachingAssignments: TeachingAssignment[],
  lecturer: Lecturer,
  subjectCode: string
): string[] {
  const normSubjCode = subjectCode.trim().toUpperCase();
  const authorizedClasses = new Set<string>();

  teachingAssignments
    .filter((ta) => {
      const isActive = ta.status === 'ACTIVE';
      const matchId = ta.lecturerId === lecturer.id;
      const matchEmail = Boolean(
        ta.lecturerEmail &&
        lecturer.email &&
        ta.lecturerEmail.trim().toLowerCase() === lecturer.email.trim().toLowerCase()
      );
      const matchName = Boolean(
        ta.lecturerName &&
        lecturer.name &&
        ta.lecturerName.trim().toLowerCase() === lecturer.name.trim().toLowerCase()
      );
      const matchSubj = ta.subjectCode && ta.subjectCode.trim().toUpperCase() === normSubjCode;
      return isActive && (matchId || matchEmail || matchName) && matchSubj;
    })
    .forEach((ta) => {
      if (ta.className && ta.className.trim()) {
        authorizedClasses.add(ta.className.trim());
      }
    });

  return Array.from(authorizedClasses);
}

// 1. Scenario A: Khairi selects MPU2162
const khairi = INITIAL_LECTURERS.find(
  (l) => l.id === 'LEC-KHAIRI' || l.name.toUpperCase().includes('AHMAD KHAIRI')
)!;

const classesMPU2162 = deriveAvailableClasses(INITIAL_TEACHING_ASSIGNMENTS, khairi, 'MPU2162');
assert(
  'Scenario A',
  'Khairi selects MPU2162: Available classes list',
  classesMPU2162.length === 1 && classesMPU2162[0] === 'DIA3A',
  'ONLY [DIA3A]',
  JSON.stringify(classesMPU2162),
  'Authoritative teaching_assignments for MPU2162 produces only DIA3A'
);

assert(
  'Scenario A',
  'Khairi selects MPU2162: Disallowed classes DIA_4A / DIA_4B are NOT shown',
  !classesMPU2162.includes('DIA_4A') && !classesMPU2162.includes('DIA_4B') && !classesMPU2162.includes('DIA3B'),
  'DIA_4A, DIA_4B, DIA3B excluded',
  `Found: ${classesMPU2162.join(', ')}`,
  'No unauthorized or obsolete classes appear in MPU2162 selection'
);

// 2. Scenario B: Khairi selects MPU2412
const classesMPU2412 = deriveAvailableClasses(INITIAL_TEACHING_ASSIGNMENTS, khairi, 'MPU2412');
assert(
  'Scenario B',
  'Khairi selects MPU2412: Available classes list',
  classesMPU2412.length === 1 && classesMPU2412[0] === 'DIA4A',
  'ONLY [DIA4A]',
  JSON.stringify(classesMPU2412),
  'Authoritative teaching_assignments for MPU2412 produces only DIA4A'
);

assert(
  'Scenario B',
  'Khairi selects MPU2412: DIA3A and DIA_4A are NOT shown',
  !classesMPU2412.includes('DIA3A') && !classesMPU2412.includes('DIA_4A'),
  'DIA3A and DIA_4A excluded',
  `Found: ${classesMPU2412.join(', ')}`,
  'Class selection strictly switches to DIA4A when selecting MPU2412'
);

// 3. Scenario C: Subject with multiple active assignments
const multiAssignments: TeachingAssignment[] = [
  {
    id: 'TA-TEST-1',
    lecturerId: khairi.id,
    lecturerName: khairi.name,
    lecturerEmail: khairi.email,
    subjectId: 'SUB-MPU2162',
    subjectCode: 'MPU2162',
    subjectName: 'PENGAJIAN MALAYSIA 2',
    className: 'DIA3A',
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  },
  {
    id: 'TA-TEST-2',
    lecturerId: khairi.id,
    lecturerName: khairi.name,
    lecturerEmail: khairi.email,
    subjectId: 'SUB-MPU2162',
    subjectCode: 'MPU2162',
    subjectName: 'PENGAJIAN MALAYSIA 2',
    className: 'DIA4A',
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  },
  {
    id: 'TA-TEST-3',
    lecturerId: khairi.id,
    lecturerName: khairi.name,
    lecturerEmail: khairi.email,
    subjectId: 'SUB-MPU2162',
    subjectCode: 'MPU2162',
    subjectName: 'PENGAJIAN MALAYSIA 2',
    className: 'DIA4B',
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  }
];

const classesMulti = deriveAvailableClasses(multiAssignments, khairi, 'MPU2162');
assert(
  'Scenario C',
  'Subject with multiple active assignments shows all authorized classes',
  classesMulti.length === 3 &&
    classesMulti.includes('DIA3A') &&
    classesMulti.includes('DIA4A') &&
    classesMulti.includes('DIA4B'),
  '[DIA3A, DIA4A, DIA4B]',
  JSON.stringify(classesMulti),
  'All ACTIVE teaching assignments for the subject are displayed'
);

// 4. Scenario D: Subject with NO active assignments for current lecturer
const classesNoAssign = deriveAvailableClasses(INITIAL_TEACHING_ASSIGNMENTS, khairi, 'ACC1013');
assert(
  'Scenario D',
  'Subject with no active assignments returns empty class list (No global fallback)',
  classesNoAssign.length === 0,
  'Empty array []',
  JSON.stringify(classesNoAssign),
  'Zero classes available for unassigned subject; no fallback to global catalogue'
);

// 5. Scenario E: Inactive / Rejected / Non-Active assignment is rejected
const inactiveAssignments: TeachingAssignment[] = [
  {
    id: 'TA-INACTIVE-1',
    lecturerId: khairi.id,
    lecturerName: khairi.name,
    lecturerEmail: khairi.email,
    subjectId: 'SUB-MPU2162',
    subjectCode: 'MPU2162',
    subjectName: 'PENGAJIAN MALAYSIA 2',
    className: 'DIA3A',
    status: 'PENDING',
    createdAt: new Date().toISOString()
  },
  {
    id: 'TA-REJECTED-2',
    lecturerId: khairi.id,
    lecturerName: khairi.name,
    lecturerEmail: khairi.email,
    subjectId: 'SUB-MPU2162',
    subjectCode: 'MPU2162',
    subjectName: 'PENGAJIAN MALAYSIA 2',
    className: 'DIA4A',
    status: 'REJECTED',
    createdAt: new Date().toISOString()
  }
];

const classesInactive = deriveAvailableClasses(inactiveAssignments, khairi, 'MPU2162');
assert(
  'Scenario E',
  'PENDING / REJECTED teaching assignments are excluded from available classes',
  classesInactive.length === 0,
  'Empty array []',
  JSON.stringify(classesInactive),
  'Only status == ACTIVE teaching assignments are authorized'
);

// 6. Scenario F: Session Activation Binding & Deterministic teachingAssignmentId
const testSubject: Subject = {
  id: 'SUB-MPU2162',
  code: 'MPU2162',
  name: 'PENGAJIAN MALAYSIA 2',
  sections: ['DIA3A']
};

const activationResult = attendanceEngine.activateClassSession(
  testSubject,
  'DIA3A',
  khairi,
  'TA-KHAIRI-MPU2162-DIA3A'
);

assert(
  'Scenario F',
  'Activated session contains valid teachingAssignmentId',
  Boolean(activationResult.session.teachingAssignmentId),
  'teachingAssignmentId string present',
  String(activationResult.session.teachingAssignmentId),
  'Session is bound to an active teaching assignment ID'
);

assert(
  'Scenario F',
  'Session subjectCode, className, and teachingAssignmentId align consistently',
  activationResult.session.subjectCode === 'MPU2162' &&
    activationResult.session.className === 'DIA3A' &&
    activationResult.session.lecturerId === khairi.id,
  'subjectCode: MPU2162, className: DIA3A, lecturerId: LEC-KHAIRI',
  `subjectCode: ${activationResult.session.subjectCode}, className: ${activationResult.session.className}, lecturerId: ${activationResult.session.lecturerId}`,
  'All attributes in activated session conform to authorized teaching assignment'
);

// Summary & Display
console.log('================================================================');
console.log('SES v4.5 | PHASE 4B.2-C CLASS SELECTION AUTHORIZATION GATE');
console.log('================================================================');
console.table(results);

const passedCount = results.filter((r) => r.status === 'PASS').length;
const failedCount = results.filter((r) => r.status === 'FAIL').length;
console.log(`Summary: Total: ${results.length} | Passed: ${passedCount} | Failed: ${failedCount}`);

if (failedCount > 0) {
    console.error('❌ SOME VERIFICATIONS FAILED');
    process.exit(1);
  } else {
    console.log('✅ ALL PHASE 4B.2-C CLASS SELECTION VERIFICATIONS PASSED.');
    process.exit(0);
  }
}

runVerification().catch((err) => {
  console.error('Verification error:', err);
  process.exit(1);
});
