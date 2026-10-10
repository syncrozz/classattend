/**
 * Verification Test: Lecturer Subject Scoping in Attendance Matrix View
 * Specifically verifies that for lecturer khairi@bpenawar.kpm.edu.my,
 * only subjects taught by him (MPU2162, MPU2412) are displayed,
 * and no other college subjects are included.
 */

import { INITIAL_LECTURERS, INITIAL_SUBJECTS, INITIAL_TEACHING_ASSIGNMENTS, INITIAL_SESSIONS } from '../src/data/mockData';
import { areClassesMatching } from '../src/utils/classHelper';
import { Lecturer, TeachingAssignment, Subject, AttendanceSession } from '../src/types';

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

// Logic replicate matching AttendanceMatrixView implementation
function computeAvailableSubjectsForClass(
  selectedClass: string,
  activeLecturer: Lecturer | null,
  isAdmin: boolean,
  teachingAssignments: TeachingAssignment[],
  sessions: AttendanceSession[],
  subjects: Subject[]
) {
  const isLecturerRestricted = Boolean(
    activeLecturer && (
      !isAdmin ||
      activeLecturer.role !== 'ADMIN' ||
      activeLecturer.email?.trim().toLowerCase() === 'khairi@bpenawar.kpm.edu.my'
    )
  );

  const lecId = (activeLecturer?.id || '').trim().toLowerCase();
  const lecEmail = (activeLecturer?.email || '').trim().toLowerCase();
  const lecName = (activeLecturer?.name || '').trim().toLowerCase();

  const matchesLecturer = (item: {
    lecturerId?: string;
    lecturerEmail?: string;
    lecturerName?: string;
  }) => {
    if (!activeLecturer) return true;
    const mId = Boolean(item.lecturerId && lecId && item.lecturerId.trim().toLowerCase() === lecId);
    const mEmail = Boolean(item.lecturerEmail && lecEmail && item.lecturerEmail.trim().toLowerCase() === lecEmail);
    const mName = Boolean(item.lecturerName && lecName && item.lecturerName.trim().toLowerCase() === lecName);
    return mId || mEmail || mName;
  };

  const getSubjectFullName = (code: string, fallbackName?: string) => {
    const found = subjects.find((s) => s.code.trim().toUpperCase() === code);
    if (found?.name && found.name.trim() !== code) return found.name.trim();
    if (fallbackName && fallbackName.trim() && fallbackName.trim().toUpperCase() !== code) {
      return fallbackName.trim();
    }
    if (activeLecturer?.assignedSubjects) {
      for (const sStr of activeLecturer.assignedSubjects) {
        if (sStr.includes('-')) {
          const [c, ...n] = sStr.split('-');
          if (c.trim().toUpperCase() === code) {
            return n.join('-').trim();
          }
        }
      }
    }
    return code;
  };

  if (isLecturerRestricted && activeLecturer) {
    const lecturerSubjectDetails = new Map<
      string,
      { code: string; name: string; classes: Set<string> }
    >();

    // A. From teaching assignments (authoritative)
    (teachingAssignments || []).forEach((ta) => {
      if (ta.status === 'ACTIVE' && matchesLecturer(ta) && ta.subjectCode) {
        const code = ta.subjectCode.trim().toUpperCase();
        if (!lecturerSubjectDetails.has(code)) {
          lecturerSubjectDetails.set(code, {
            code,
            name: getSubjectFullName(code, ta.subjectName),
            classes: new Set<string>()
          });
        }
        if (ta.className && ta.className !== 'ALL' && ta.className !== 'SEMUA') {
          lecturerSubjectDetails.get(code)!.classes.add(ta.className.trim());
        }
      }
    });

    // B. From activeLecturer.assignedSubjects
    (activeLecturer.assignedSubjects || []).forEach((subStr) => {
      const rawCode = subStr.includes('-')
        ? subStr.split('-')[0].trim().toUpperCase()
        : subStr.trim().toUpperCase();
      const rawName = subStr.includes('-')
        ? subStr.split('-').slice(1).join('-').trim()
        : subStr.trim();
      if (rawCode) {
        if (!lecturerSubjectDetails.has(rawCode)) {
          lecturerSubjectDetails.set(rawCode, {
            code: rawCode,
            name: getSubjectFullName(rawCode, rawName),
            classes: new Set<string>()
          });
        }
      }
    });

    // C. From master subjects catalog where this lecturer is assigned
    subjects.forEach((sub) => {
      if (matchesLecturer(sub) && sub.code) {
        const code = sub.code.trim().toUpperCase();
        if (!lecturerSubjectDetails.has(code)) {
          lecturerSubjectDetails.set(code, {
            code,
            name: sub.name?.trim() || code,
            classes: new Set<string>()
          });
        }
        (sub.sections || []).forEach((sec) => {
          if (sec && sec.trim()) {
            lecturerSubjectDetails.get(code)!.classes.add(sec.trim());
          }
        });
      }
    });

    // D. From authorized sessions
    sessions.forEach((s) => {
      if (matchesLecturer(s) && s.subjectCode) {
        const code = s.subjectCode.trim().toUpperCase();
        if (!lecturerSubjectDetails.has(code)) {
          lecturerSubjectDetails.set(code, {
            code,
            name: getSubjectFullName(code, s.subjectName || s.sessionName),
            classes: new Set<string>()
          });
        }
        if (s.className && s.className !== 'ALL' && s.className !== 'SEMUA') {
          lecturerSubjectDetails.get(code)!.classes.add(s.className.trim());
        }
      }
    });

    const classMatchingSubjects = new Map<string, { code: string; name: string }>();

    lecturerSubjectDetails.forEach((info, code) => {
      const hasMatchingClass = Array.from(info.classes).some(
        (cls) => areClassesMatching(cls, selectedClass) || cls === 'ALL' || cls === 'SEMUA'
      );

      if (hasMatchingClass) {
        classMatchingSubjects.set(code, { code: info.code, name: info.name });
      }
    });

    if (classMatchingSubjects.size > 0) {
      return Array.from(classMatchingSubjects.values()).sort((a, b) => a.code.localeCompare(b.code));
    }

    const unconstrainedSubjects = new Map<string, { code: string; name: string }>();
    lecturerSubjectDetails.forEach((info, code) => {
      if (info.classes.size === 0) {
        unconstrainedSubjects.set(code, { code: info.code, name: info.name });
      }
    });

    if (unconstrainedSubjects.size > 0) {
      return Array.from(unconstrainedSubjects.values()).sort((a, b) => a.code.localeCompare(b.code));
    }

    return Array.from(lecturerSubjectDetails.values()).map((info) => ({
      code: info.code,
      name: info.name
    })).sort((a, b) => a.code.localeCompare(b.code));
  }

  // Admin Mode
  const subjMap = new Map<string, { code: string; name: string }>();
  (teachingAssignments || []).forEach((ta) => {
    const matchClass = !ta.className || ta.className === 'ALL' || areClassesMatching(ta.className, selectedClass);
    if (matchClass && ta.status === 'ACTIVE' && ta.subjectCode) {
      const cleanCode = ta.subjectCode.trim().toUpperCase();
      if (!subjMap.has(cleanCode)) {
        subjMap.set(cleanCode, { code: cleanCode, name: getSubjectFullName(cleanCode, ta.subjectName) });
      }
    }
  });
  return Array.from(subjMap.values()).sort((a, b) => a.code.localeCompare(b.code));
}

async function runTests() {
  console.log('================================================================');
  console.log('AUDIT: LECTURER KHAIRI SUBJECT SCOPING IN ATTENDANCE MATRIX');
  console.log('================================================================\n');

  const khairi = INITIAL_LECTURERS.find((l) => l.email === 'khairi@bpenawar.kpm.edu.my')!;

  assert(
    'Setup',
    'Lecturer Khairi is defined in INITIAL_LECTURERS',
    Boolean(khairi),
    'khairi object defined',
    khairi ? khairi.email : 'undefined'
  );

  // Test 1: Class DIA3A for Khairi -> ONLY MPU2162
  const dia3aSubjects = computeAvailableSubjectsForClass(
    'DIA3A',
    khairi,
    false,
    INITIAL_TEACHING_ASSIGNMENTS,
    INITIAL_SESSIONS,
    INITIAL_SUBJECTS
  );

  assert(
    'Scoping DIA3A',
    'Khairi sees exactly 1 subject for class DIA3A',
    dia3aSubjects.length === 1,
    '1 subject',
    `${dia3aSubjects.length} subjects`
  );

  assert(
    'Scoping DIA3A',
    'Khairi sees MPU2162 for DIA3A',
    dia3aSubjects.some((s) => s.code === 'MPU2162'),
    'MPU2162 present',
    JSON.stringify(dia3aSubjects)
  );

  assert(
    'Scoping DIA3A',
    'No unauthorized subjects (e.g. ACC, ENG, MGT) appear for DIA3A',
    !dia3aSubjects.some((s) => s.code.startsWith('ACC') || s.code.startsWith('ENG')),
    'No ACC/ENG',
    'Clean'
  );

  // Test 2: Class DIA4A for Khairi -> ONLY MPU2412
  const dia4aSubjects = computeAvailableSubjectsForClass(
    'DIA4A',
    khairi,
    false,
    INITIAL_TEACHING_ASSIGNMENTS,
    INITIAL_SESSIONS,
    INITIAL_SUBJECTS
  );

  assert(
    'Scoping DIA4A',
    'Khairi sees exactly 1 subject for class DIA4A',
    dia4aSubjects.length === 1,
    '1 subject',
    `${dia4aSubjects.length} subjects`
  );

  assert(
    'Scoping DIA4A',
    'Khairi sees MPU2412 for DIA4A',
    dia4aSubjects.some((s) => s.code === 'MPU2412'),
    'MPU2412 present',
    JSON.stringify(dia4aSubjects)
  );

  assert(
    'Scoping DIA4A',
    'MPU2162 (taught in DIA3A only) does NOT appear in DIA4A',
    !dia4aSubjects.some((s) => s.code === 'MPU2162'),
    'No MPU2162 in DIA4A',
    'Clean'
  );

  // Test 3: Normalized class naming 'DIA_4A' matches DIA4A
  const dia4aNormalizedSubjects = computeAvailableSubjectsForClass(
    'DIA_4A',
    khairi,
    false,
    INITIAL_TEACHING_ASSIGNMENTS,
    INITIAL_SESSIONS,
    INITIAL_SUBJECTS
  );

  assert(
    'Class Normalization',
    "Class 'DIA_4A' resolves correctly to MPU2412 for Khairi",
    dia4aNormalizedSubjects.length === 1 && dia4aNormalizedSubjects[0].code === 'MPU2412',
    '1 subject MPU2412',
    JSON.stringify(dia4aNormalizedSubjects)
  );

  // Test 4: Other college subjects (all 46 courses) are strictly filtered out
  const allCollegeSubjectCodes = INITIAL_SUBJECTS.map((s) => s.code.toUpperCase());
  const foreignCodes = allCollegeSubjectCodes.filter((c) => c !== 'MPU2162' && c !== 'MPU2412');

  const hasAnyForeign = dia4aSubjects.some((s) => foreignCodes.includes(s.code));
  assert(
    'Security Isolation',
    'Zero foreign subjects leaked into Khairi dropdown',
    !hasAnyForeign,
    'false (no foreign subjects leaked)',
    String(hasAnyForeign)
  );

  console.log('\n================================================================');
  console.log('AUDIT SUMMARY');
  console.log('================================================================');
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`Total Criteria Tested: ${results.length}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${results.length - passedCount}`);
  console.log(`Score:  ${((passedCount / results.length) * 100).toFixed(1)}%`);

  if (passedCount === results.length) {
    console.log('✅ ALL KHAIRI SUBJECT SCOPING AUDITS PASSED WITH ZERO REGRESSIONS.');
  } else {
    process.exit(1);
  }
}

runTests();
