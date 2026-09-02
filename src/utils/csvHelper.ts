import { Student, AttendanceRecord, AttendanceSession, Lecturer, Subject } from '../types';
import { normalizePhoneNumber } from './phoneHelper';

export * from './phoneHelper';

/**
 * Generate standard CSV template for Kursus / Subjek
 */
export const generateSubjectTemplateCSV = (): string => {
  const headers = ['Bil', 'Kod_Kursus', 'Nama_Kursus', 'Jabatan', 'Kelas_Seksyen'];
  const sampleRows = [
    [1, 'ACC1013', 'FINANCIAL ACCOUNTING 1', 'Jabatan Perakaunan', 'DIA_1A, DIA_1B, DIA_2A, DIA_2B'],
    [2, 'COM2512', 'MEETING AND INTERVIEW SKILLS', 'Jabatan Pengajian Am', 'DIA_3A, DIA_3B, DIA_4A, DIA_4B'],
    [3, 'MGT1013', 'PRINCIPLES OF MANAGEMENT', 'Jabatan Pengurusan Perniagaan', 'DIA_1A, DIA_1B, DIA_2A, DIA_2B'],
    [4, 'ITE1133', 'INTRODUCTION OF INFORMATION TECHNOLOGY APPLICATIONS', 'Jabatan Teknologi Maklumat', 'DIA_1A, DIA_1B, DIA_2A, DIA_2B']
  ];

  const content = [
    headers.join(','),
    ...sampleRows.map((r) => r.map((cell) => `"${cell}"`).join(','))
  ].join('\n');

  return content;
};

/**
 * Export Subject List to CSV
 */
export const exportSubjectsToCSV = (subjects: Subject[]): string => {
  const headers = ['Bil', 'Kod_Kursus', 'Nama_Kursus', 'Jabatan', 'Kelas_Seksyen'];
  const rows = subjects.map((sub, idx) => [
    idx + 1,
    `"${(sub.code || '').toUpperCase().trim()}"`,
    `"${(sub.name || '').replace(/"/g, '""').toUpperCase().trim()}"`,
    `"${(sub.department || 'Jabatan Perakaunan').replace(/"/g, '""')}"`,
    `"${(sub.sections || []).join(', ')}"`
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
};

/**
 * Helper to deduce department from course code
 */
export const deduceDepartmentFromCode = (code: string): string => {
  const upper = code.toUpperCase().trim();
  if (/^(ACC|TAX|AUD|FAR|MAF|FIN|QBM)/.test(upper)) {
    return 'Jabatan Perakaunan';
  }
  if (/^(MPU|ENG|FLG|ISL|COM|PEN)/.test(upper)) {
    return 'Jabatan Pengajian Am';
  }
  if (/^(ITE|CSC|ICT|BIT)/.test(upper)) {
    return 'Jabatan Teknologi Maklumat';
  }
  if (/^(ECO|MGT|MKT|LOG|BUS|LAW|ETR|MAT|HLC|HRM|OPM)/.test(upper)) {
    return 'Jabatan Pengurusan Perniagaan';
  }
  return 'Jabatan Pengajian Am';
};

export interface SubjectCSVParseResult {
  subjects: Subject[];
  totalRowsRead: number;
  duplicateCount: number;
  skippedCount: number;
}

/**
 * Robust Subject CSV and Plain Text Parser
 * Supports:
 * - Comma / Semicolon / Tab separated CSV
 * - Plain lines like "COM2512 MEETING AND INTERVIEW SKILLS"
 * - Headers with Code / Kursus / Name / Subjek / Jabatan / Kelas
 */
export const parseSubjectCSVWithReport = (csvText: string): SubjectCSVParseResult => {
  const rawLines = csvText
    .split(/\r\n|\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (rawLines.length === 0) {
    return { subjects: [], totalRowsRead: 0, duplicateCount: 0, skippedCount: 0 };
  }

  // Detect if first line is a header
  const firstLine = rawLines[0];
  const isHeader = /bil|kod|code|kursus|nama|name|subjek|subject|jabatan|dept|kelas|section/i.test(firstLine);
  
  let headerIndex = -1;
  let codeCol = -1;
  let nameCol = -1;
  let deptCol = -1;
  let sectionCol = -1;

  if (isHeader) {
    headerIndex = 0;
    const headerCols = splitCSVRow(firstLine).map((h) => h.toLowerCase().trim());
    codeCol = headerCols.findIndex((h) => h.includes('kod') || h.includes('code'));
    nameCol = headerCols.findIndex((h) => h.includes('nama') || h.includes('name') || h.includes('tajuk') || h.includes('title'));
    deptCol = headerCols.findIndex((h) => h.includes('jabatan') || h.includes('dept') || h.includes('department') || h.includes('program'));
    sectionCol = headerCols.findIndex((h) => h.includes('kelas') || h.includes('seksyen') || h.includes('section') || h.includes('class'));
  }

  const resultSubjects: Subject[] = [];
  const seenCodes = new Set<string>();
  let duplicates = 0;
  let skipped = 0;

  const startLine = headerIndex >= 0 ? headerIndex + 1 : 0;

  for (let i = startLine; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (!line || line.startsWith('#')) {
      skipped++;
      continue;
    }

    let code = '';
    let name = '';
    let department = '';
    let sections: string[] = ['DIA_1A', 'DIA_1B', 'DIA_2A', 'DIA_2B', 'DIA_3A', 'DIA_3B', 'DIA_3C', 'DIA_3D', 'DIA_4A', 'DIA_4B', 'DIA_4C', 'DIA_4D'];

    // Check if line is CSV separated or simple text like "COM2512 MEETING AND INTERVIEW SKILLS"
    const cols = splitCSVRow(line);

    if (cols.length >= 2 && (codeCol >= 0 || nameCol >= 0 || cols[0].length <= 15)) {
      // CSV column based
      if (codeCol >= 0 && cols[codeCol]) {
        code = cols[codeCol].trim().toUpperCase();
      } else if (cols[1] && /^[A-Z]{2,4}\s?[0-9]{3,5}/i.test(cols[1].trim())) {
        code = cols[1].trim().toUpperCase();
      } else if (cols[0] && /^[A-Z]{2,4}\s?[0-9]{3,5}/i.test(cols[0].trim())) {
        code = cols[0].trim().toUpperCase();
      }

      if (nameCol >= 0 && cols[nameCol]) {
        name = cols[nameCol].trim().toUpperCase();
      } else if (cols[2] && code) {
        name = cols[2].trim().toUpperCase();
      } else if (cols[1] && cols[0] === code) {
        name = cols[1].trim().toUpperCase();
      }

      if (deptCol >= 0 && cols[deptCol]) {
        department = cols[deptCol].trim();
      }

      if (sectionCol >= 0 && cols[sectionCol]) {
        const secList = cols[sectionCol]
          .split(/[,;|]/)
          .map((s) => s.trim().toUpperCase().replace(/\s+/g, '_'))
          .filter((s) => s.length > 0);
        if (secList.length > 0) sections = secList;
      }
    }

    // Fallback: Check if line matches Regex format "CODE NAME..."
    if (!code || !name) {
      // Regex matches: [3-4 Letters][3-5 Digits] followed by space and name
      const match = line.match(/^([A-Za-z]{2,5}\s?[0-9]{3,5})\s*[:\-\t, ]\s*(.+)$/);
      if (match) {
        code = match[1].replace(/\s+/g, '').toUpperCase();
        name = match[2].trim().toUpperCase();
      } else {
        // Try simple split by first space
        const firstSpaceIdx = line.indexOf(' ');
        if (firstSpaceIdx > 2 && firstSpaceIdx <= 10) {
          const possibleCode = line.slice(0, firstSpaceIdx).trim().toUpperCase();
          if (/^[A-Za-z0-9]+$/.test(possibleCode)) {
            code = possibleCode;
            name = line.slice(firstSpaceIdx + 1).trim().toUpperCase();
          }
        }
      }
    }

    // Clean up code & name
    code = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    name = name.replace(/^["']|["']$/g, '').trim().toUpperCase();

    if (!code || code.length < 3) {
      skipped++;
      continue;
    }

    if (!name) {
      name = `KURSUS ${code}`;
    }

    if (seenCodes.has(code)) {
      duplicates++;
      continue;
    }

    seenCodes.add(code);

    if (!department) {
      department = deduceDepartmentFromCode(code);
    }

    resultSubjects.push({
      id: `SUB-${code}`,
      code: code,
      name: name,
      department: department,
      sections: sections,
      status: 'ACTIVE'
    });
  }

  return {
    subjects: resultSubjects,
    totalRowsRead: rawLines.length - (headerIndex >= 0 ? 1 : 0),
    duplicateCount: duplicates,
    skippedCount: skipped
  };
};

export const parseSubjectCSV = (csvText: string): Subject[] => {
  return parseSubjectCSVWithReport(csvText).subjects;
};

/**
 * Generate standard CSV template for lecturer to download and fill in (Students)
 */
export const generateClassTemplateCSV = (sampleClassName: string = 'DIA_4A'): string => {
  const headers = ['Bil', 'No_Pelajar', 'Nama_Pelajar', 'Kelas', 'No_Telefon', 'Email', 'Program'];
  const sampleRows = [
    [1, 'PDA-2502-001', 'NUR AISYAH BINTI ABDUL RAZAK', sampleClassName, '601110571550', 'aisyah.razak@bpenawar.kpm.edu.my', 'Diploma Perakaunan']
  ];

  const content = [
    headers.join(','),
    ...sampleRows.map((r) => r.map((cell) => `"${cell}"`).join(','))
  ].join('\n');

  return content;
};

/**
 * Generate standard CSV template for Lecturers list (Senarai Pensyarah)
 */
export const generateLecturerTemplateCSV = (): string => {
  const headers = ['Bil', 'Nama_Pensyarah', 'Email_KPM', 'No_IC', 'Kelas', 'Subjek_Diajar', 'Jabatan', 'Peranan'];
  const sampleRows = [
    [
      1,
      'EN. KHAIRI BIN ABDUL RAHMAN',
      'khairi@bpenawar.kpm.edu.my',
      '861115-46-5305',
      'DIA_4A, DIA_4B',
      'MPU 2163 - Pengajian Malaysia 2, QMT 2023 - Statistik Perniagaan',
      'Pengajian Am',
      'ADMIN'
    ]
  ];

  const content = [
    headers.join(','),
    ...sampleRows.map((r) => r.map((cell) => `"${cell}"`).join(','))
  ].join('\n');

  return content;
};

export const exportLecturersToCSV = (lecturers: Lecturer[]): string => {
  const headers = ['Bil', 'Nama_Pensyarah', 'Email_KPM', 'No_IC', 'PIN_4Digit', 'Kelas', 'Subjek_Diajar', 'Jabatan', 'Peranan'];
  const rows = lecturers.map((l, idx) => [
    idx + 1,
    `"${l.name.replace(/"/g, '""')}"`,
    `"${l.email.toLowerCase()}"`,
    `"${l.icNumber || ''}"`,
    `"${l.pin || (l.icNumber ? l.icNumber.replace(/[^0-9]/g, '').slice(-4) : '')}"`,
    `"${(l.assignedSections || l.assignedClasses || []).join(', ')}"`,
    `"${(l.assignedSubjects || []).join(', ')}"`,
    `"${l.department || 'Perakaunan'}"`,
    `"${l.role || 'LECTURER'}"`
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
};

export const parseLecturerCSV = (csvText: string): Lecturer[] => {
  const lines = csvText
    .split(/\r\n|\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length <= 1) return [];

  const headers = lines[0].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());

  let nameIndex = headers.findIndex((h) => h.includes('nama'));
  let emailIndex = headers.findIndex((h) => h.includes('email') || h.includes('emel') || h.includes('mel'));
  let icIndex = headers.findIndex((h) => h.includes('ic') || h.includes('kad_pengenalan') || h.includes('kp') || h.includes('nric'));
  let phoneIndex = headers.findIndex((h) => h.includes('telefon') || h.includes('phone') || h.includes('tel') || h.includes('hp'));
  let pinIndex = headers.findIndex((h) => h.includes('pin'));
  let sectionIndex = headers.findIndex((h) => h.includes('kelas') || h.includes('seksyen') || h.includes('section'));
  let subjectIndex = headers.findIndex((h) => h.includes('subjek') || h.includes('kursus') || h.includes('subject'));
  let deptIndex = headers.findIndex((h) => h.includes('jabatan') || h.includes('dept') || h.includes('department'));
  let roleIndex = headers.findIndex((h) => h.includes('peranan') || h.includes('role'));

  // Positional fallbacks if headers are simple
  if (nameIndex === -1 && headers.length >= 2) nameIndex = 1;
  if (emailIndex === -1 && headers.length >= 3) emailIndex = 2;
  if (icIndex === -1 && headers.length >= 4) icIndex = 3;

  const resultLecturers: Lecturer[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawCols = splitCSVRow(lines[i]);
    if (rawCols.length < 2) continue;

    const name = nameIndex >= 0 && rawCols[nameIndex] ? rawCols[nameIndex].trim().toUpperCase() : `Pensyarah ${i}`;
    const email = emailIndex >= 0 && rawCols[emailIndex] ? rawCols[emailIndex].trim().toLowerCase() : '';
    const icNumber = icIndex >= 0 && rawCols[icIndex] ? rawCols[icIndex].trim() : '';
    const rawPhone = phoneIndex >= 0 && rawCols[phoneIndex] ? rawCols[phoneIndex] : '';
    const phone = normalizePhoneNumber(rawPhone);
    const customPin = pinIndex >= 0 && rawCols[pinIndex] ? rawCols[pinIndex].trim() : '';
    const sectionsRaw = sectionIndex >= 0 && rawCols[sectionIndex] ? rawCols[sectionIndex].trim() : 'DIA_4A';
    const subjectsRaw = subjectIndex >= 0 && rawCols[subjectIndex] ? rawCols[subjectIndex].trim() : '';
    const department = deptIndex >= 0 && rawCols[deptIndex] ? rawCols[deptIndex].trim() : 'Perakaunan';
    const roleRaw = roleIndex >= 0 && rawCols[roleIndex] ? rawCols[roleIndex].trim().toUpperCase() : 'LECTURER';

    if (!name || !email) continue;

    const numericIC = icNumber.replace(/[^0-9]/g, '');
    const derivedPin = customPin.length === 4 ? customPin : (numericIC.length >= 4 ? numericIC.slice(-4) : '5305');

    const sections = sectionsRaw
      .split(/[,;|]/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0);

    const subjects = subjectsRaw
      .split(/[,;|]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const lecturerId = `LEC-${email.split('@')[0].toUpperCase()}`;

    resultLecturers.push({
      id: lecturerId,
      name,
      email,
      icNumber: icNumber || `${derivedPin}`,
      pin: derivedPin,
      phone: phone || undefined,
      department,
      assignedSections: sections.length > 0 ? sections : ['DIA_4A'],
      assignedClasses: sections.length > 0 ? sections : ['DIA_4A'],
      assignedSubjects: subjects.length > 0 ? subjects : ['MPU 2163 - Pengajian Malaysia 2'],
      role: roleRaw === 'ADMIN' ? 'ADMIN' : 'LECTURER'
    });
  }

  return resultLecturers;
};

export const exportStudentsToCSV = (students: Student[]): string => {
  const headers = ['Bil', 'No_Pelajar', 'Nama_Pelajar', 'Kelas', 'No_Telefon', 'Email', 'Program'];
  const rows = students.map((s, idx) => [
    idx + 1,
    `"${s.studentId || s.id}"`,
    `"${s.name.replace(/"/g, '""')}"`,
    `"${s.className || ''}"`,
    `"${s.phone || ''}"`,
    `"${s.email || ''}"`,
    `"${s.department || 'Diploma Perakaunan'}"`
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
};

export const exportSessionAttendanceToCSV = (
  session: AttendanceSession,
  students: Student[],
  records: AttendanceRecord[]
): string => {
  const headers = [
    'Bil',
    'No_Pelajar',
    'Nama_Pelajar',
    'Kelas',
    'Kod_Subjek',
    'Nama_Subjek',
    'Pensyarah',
    'Tarikh_Kelas',
    'Status_Kehadiran',
    'Masa_Imbasan',
    'Kaedah'
  ];

  const recordMap = new Map<string, AttendanceRecord>();
  records.filter((r) => r.sessionId === session.id).forEach((r) => recordMap.set(r.studentId, r));

  let targetStudents = students;
  if (session.className && session.className !== 'ALL' && session.className !== 'SEMUA') {
    const allowed = session.className.split(',').map((c) => c.trim().toUpperCase());
    targetStudents = students.filter((s) => allowed.includes(s.className.trim().toUpperCase()));
  }

  const rows = targetStudents.map((s, idx) => {
    const rec = recordMap.get(s.id);
    const status = rec ? rec.status : 'ABSENT';
    const scanTime = rec ? new Date(rec.timestamp).toLocaleTimeString('ms-MY') : '-';
    const method = rec ? rec.method : '-';

    return [
      idx + 1,
      `"${s.studentId || s.id}"`,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.className}"`,
      `"${session.subjectCode || ''}"`,
      `"${session.subjectName || ''}"`,
      `"${session.lecturerName || ''}"`,
      `"${session.date}"`,
      `"${status === 'PRESENT' ? 'HADIR' : 'TIDAK HADIR'}"`,
      `"${scanTime}"`,
      `"${method}"`
    ];
  });

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
};

/**
 * Backup only successfully scanned attendees (Status HADIR) for a specific session
 */
export const exportScannedAttendeesOnlyToCSV = (
  session: AttendanceSession,
  students: Student[],
  records: AttendanceRecord[]
): string => {
  const headers = [
    'Bil',
    'No_Pelajar',
    'Nama_Pelajar',
    'Kelas',
    'No_Telefon',
    'Email',
    'Kod_Subjek',
    'Nama_Subjek',
    'Pensyarah',
    'Tarikh_Kelas',
    'Masa_Imbasan',
    'Kaedah_Imbasan',
    'Status',
    'ID_Rekod'
  ];

  const sessionRecords = records.filter(
    (r) => r.sessionId === session.id && (r.status === 'PRESENT' || !r.status)
  );

  const studentMap = new Map<string, Student>();
  students.forEach((s) => studentMap.set(s.id, s));

  const rows = sessionRecords.map((rec, idx) => {
    const s = studentMap.get(rec.studentId);
    const scanDate = new Date(rec.timestamp);
    const scanTimeStr = !isNaN(scanDate.getTime())
      ? scanDate.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : '-';

    return [
      idx + 1,
      `"${s?.studentId || rec.studentId}"`,
      `"${(s?.name || rec.studentId).replace(/"/g, '""')}"`,
      `"${s?.className || rec.className || session.className || ''}"`,
      `"${s?.phone || ''}"`,
      `"${s?.email || ''}"`,
      `"${session.subjectCode || rec.subjectCode || ''}"`,
      `"${session.subjectName || ''}"`,
      `"${session.lecturerName || ''}"`,
      `"${session.date || ''}"`,
      `"${scanTimeStr}"`,
      `"${rec.method === 'CAMERA_SCAN' ? 'Imbasan Kamera' : rec.method === 'QR' ? 'Imbasan QR Kendiri' : rec.method === 'MANUAL' ? 'Manual' : rec.method || 'Imbasan'}"`,
      `"HADIR"`,
      `"${rec.id}"`
    ];
  });

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
};

/**
 * Backup ALL successfully recorded attendances college-wide to CSV
 */
export const exportAllAttendanceRecordsToCSV = (
  records: AttendanceRecord[],
  students: Student[],
  sessions: AttendanceSession[]
): string => {
  const headers = [
    'Bil',
    'No_Pelajar',
    'Nama_Pelajar',
    'Kelas_Pelajar',
    'No_Telefon',
    'Email',
    'Kod_Subjek',
    'Nama_Subjek',
    'Nama_Sesi',
    'Pensyarah',
    'Tarikh_Sesi',
    'Masa_Imbasan',
    'Kaedah_Imbasan',
    'Status_Kehadiran',
    'ID_Sesi',
    'ID_Rekod'
  ];

  const studentMap = new Map<string, Student>();
  students.forEach((s) => studentMap.set(s.id, s));

  const sessionMap = new Map<string, AttendanceSession>();
  sessions.forEach((sess) => sessionMap.set(sess.id, sess));

  const sortedRecords = [...records].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const rows = sortedRecords.map((rec, idx) => {
    const s = studentMap.get(rec.studentId);
    const sess = sessionMap.get(rec.sessionId);
    const scanDate = new Date(rec.timestamp);
    const scanTimeStr = !isNaN(scanDate.getTime())
      ? scanDate.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : '-';

    return [
      idx + 1,
      `"${s?.studentId || rec.studentId}"`,
      `"${(s?.name || rec.studentId).replace(/"/g, '""')}"`,
      `"${s?.className || rec.className || sess?.className || ''}"`,
      `"${s?.phone || ''}"`,
      `"${s?.email || ''}"`,
      `"${sess?.subjectCode || rec.subjectCode || ''}"`,
      `"${sess?.subjectName || ''}"`,
      `"${(sess?.sessionName || '').replace(/"/g, '""')}"`,
      `"${sess?.lecturerName || ''}"`,
      `"${sess?.date || ''}"`,
      `"${scanTimeStr}"`,
      `"${rec.method === 'CAMERA_SCAN' ? 'Imbasan Kamera' : rec.method === 'QR' ? 'Imbasan QR Kendiri' : rec.method === 'MANUAL' ? 'Manual' : rec.method || 'Imbasan'}"`,
      `"${rec.status === 'PRESENT' ? 'HADIR' : rec.status || 'HADIR'}"`,
      `"${rec.sessionId}"`,
      `"${rec.id}"`
    ];
  });

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
};

/**
 * Generate full JSON Backup file of attendance records with metadata
 */
export const generateAttendanceBackupJSON = (
  records: AttendanceRecord[],
  students: Student[],
  sessions: AttendanceSession[],
  lecturerName?: string
): string => {
  const studentMap = new Map<string, Student>();
  students.forEach((s) => studentMap.set(s.id, s));

  const sessionMap = new Map<string, AttendanceSession>();
  sessions.forEach((sess) => sessionMap.set(sess.id, sess));

  const detailedRecords = records.map((rec) => {
    const student = studentMap.get(rec.studentId);
    const session = sessionMap.get(rec.sessionId);
    return {
      recordId: rec.id,
      timestamp: rec.timestamp,
      method: rec.method,
      status: rec.status,
      student: {
        id: rec.studentId,
        studentId: student?.studentId || rec.studentId,
        name: student?.name || '',
        className: student?.className || rec.className || '',
        phone: student?.phone || '',
        email: student?.email || ''
      },
      session: {
        id: rec.sessionId,
        sessionName: session?.sessionName || '',
        subjectCode: session?.subjectCode || rec.subjectCode || '',
        subjectName: session?.subjectName || '',
        className: session?.className || '',
        lecturerName: session?.lecturerName || '',
        date: session?.date || ''
      }
    };
  });

  const backupData = {
    app: 'ClassAttend — Sistem Kehadiran Pelajar',
    version: '4.4',
    exportedAt: new Date().toISOString(),
    exportedBy: lecturerName || 'Pentadbir Kolej',
    totalRecords: records.length,
    totalSessions: sessions.length,
    records: detailedRecords
  };

  return JSON.stringify(backupData, null, 2);
};

/**
 * Helper to auto-detect delimiter from CSV line (, ; \t |)
 */
function detectDelimiter(text: string): string {
  const firstLines = text.split(/\r\n|\n/).slice(0, 5).join('\n');
  const commaCount = (firstLines.match(/,/g) || []).length;
  const semiCount = (firstLines.match(/;/g) || []).length;
  const tabCount = (firstLines.match(/\t/g) || []).length;
  const pipeCount = (firstLines.match(/\|/g) || []).length;

  if (semiCount > commaCount && semiCount > tabCount) return ';';
  if (tabCount > commaCount && tabCount > semiCount) return '\t';
  if (pipeCount > commaCount && pipeCount > semiCount) return '|';
  return ',';
}

/**
 * Universal CSV row splitter handling quotes and custom delimiters
 */
export function splitCSVRow(rowText: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < rowText.length; i++) {
    const char = rowText[i];
    if (char === '"') {
      if (inQuotes && rowText[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^["']|["']$/g, ''));
  return result;
}

export interface StudentCSVParseResult {
  students: Student[];
  totalRowsRead: number;
  duplicateCount: number;
  skippedCount: number;
  detectedDelimiter: string;
  headerRowIndex: number;
}

export const parseStudentCSVWithReport = (csvText: string): StudentCSVParseResult => {
  // Strip BOM if present
  const cleanText = csvText.replace(/^\uFEFF/, '').trim();
  const rawLines = cleanText
    .split(/\r\n|\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (rawLines.length === 0) {
    return {
      students: [],
      totalRowsRead: 0,
      duplicateCount: 0,
      skippedCount: 0,
      detectedDelimiter: ',',
      headerRowIndex: -1
    };
  }

  const delimiter = detectDelimiter(cleanText);

  // Search for the true header row among first 15 lines
  let headerIndex = -1;
  let headers: string[] = [];

  for (let idx = 0; idx < Math.min(15, rawLines.length); idx++) {
    const cols = splitCSVRow(rawLines[idx], delimiter).map((c) => c.toLowerCase().trim());
    const hasHeaderKeywords = cols.some((c) =>
      c.includes('nama') ||
      c.includes('pelajar') ||
      c.includes('name') ||
      c.includes('matrik') ||
      c.includes('student') ||
      c.includes('id') ||
      c.includes('kelas') ||
      c.includes('seksyen')
    );

    if (hasHeaderKeywords) {
      headerIndex = idx;
      headers = cols;
      break;
    }
  }

  // Fallback if no explicit header row was detected
  if (headerIndex === -1) {
    headerIndex = 0;
    headers = splitCSVRow(rawLines[0], delimiter).map((c) => c.toLowerCase().trim());
  }

  // Column matching with all Malaysian & International synonyms
  let idIndex = headers.findIndex(
    (h) =>
      (h.includes('no_pelajar') ||
        h.includes('no.pelajar') ||
        h.includes('no pelajar') ||
        h.includes('matrik') ||
        h.includes('matric') ||
        h.includes('student_id') ||
        h.includes('student id') ||
        h.includes('no_pendaftaran') ||
        h.includes('angka_giliran') ||
        h.includes('no_kp') ||
        h.includes('nric') ||
        (h === 'id' || h === 'studentId')) &&
      !h.startsWith('bil')
  );

  let nameIndex = headers.findIndex(
    (h) =>
      h.includes('nama_pelajar') ||
      h.includes('nama pelajar') ||
      h.includes('nama_penuh') ||
      h.includes('nama penuh') ||
      h.includes('student_name') ||
      h.includes('student name') ||
      h.includes('nama') ||
      h.includes('name')
  );

  let setIndex = headers.findIndex(
    (h) =>
      h.includes('kelas') ||
      h.includes('seksyen') ||
      h.includes('section') ||
      h.includes('class') ||
      h.includes('kumpulan') ||
      h.includes('group') ||
      h.includes('nama_set') ||
      h.includes('set') ||
      h.includes('sem')
  );

  let phoneIndex = headers.findIndex(
    (h) =>
      h.includes('telefon') ||
      h.includes('phone') ||
      h.includes('tel') ||
      h.includes('no_tel') ||
      h.includes('no_telefon') ||
      h.includes('hp') ||
      h.includes('no_hp') ||
      h.includes('mobile') ||
      h.includes('contact')
  );

  let emailIndex = headers.findIndex(
    (h) =>
      h.includes('email') ||
      h.includes('emel') ||
      h.includes('e-mel') ||
      h.includes('e_mel') ||
      h.includes('mail')
  );

  let deptIndex = headers.findIndex(
    (h) =>
      h.includes('program') ||
      h.includes('kursus') ||
      h.includes('jabatan') ||
      h.includes('department') ||
      h.includes('dept') ||
      h.includes('bidang') ||
      h.includes('course')
  );

  // Positional fallbacks based on standard template: Bil (0), No_Pelajar (1), Nama (2), Kelas (3), Tel (4), Email (5), Program (6)
  if (idIndex === -1) {
    if (headers.length >= 2 && nameIndex !== 1) idIndex = 1;
    else if (headers.length >= 1) idIndex = 0;
  }
  if (nameIndex === -1) {
    if (headers.length >= 3 && idIndex !== 2) nameIndex = 2;
    else if (headers.length >= 2 && idIndex !== 1) nameIndex = 1;
    else nameIndex = 0;
  }
  if (setIndex === -1 && headers.length >= 4) setIndex = 3;
  if (phoneIndex === -1 && headers.length >= 5) phoneIndex = 4;
  if (emailIndex === -1 && headers.length >= 6) emailIndex = 5;

  const resultStudents: Student[] = [];
  const seenIds = new Set<string>();
  let duplicates = 0;
  let skipped = 0;

  for (let i = headerIndex + 1; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (!line || line.trim().length === 0) {
      skipped++;
      continue;
    }

    const rawCols = splitCSVRow(line, delimiter);
    if (rawCols.length < 1) {
      skipped++;
      continue;
    }

    // Ignore potential footer / summary rows
    const firstCol = (rawCols[0] || '').toLowerCase();
    if (firstCol.includes('jumlah') || firstCol.includes('total') || firstCol.includes('disediakan')) {
      skipped++;
      continue;
    }

    let rawId = idIndex >= 0 && rawCols[idIndex] ? rawCols[idIndex].trim() : '';
    let rawName = nameIndex >= 0 && rawCols[nameIndex] ? rawCols[nameIndex].trim() : '';

    // If ID is actually empty but name is present, synthesize a stable ID so row is not lost
    if (!rawId && rawName) {
      rawId = `PDA-ST-${i}`;
    }

    // If name is empty, fallback to ID
    if (!rawName && rawId) {
      rawName = `Pelajar ${rawId}`;
    }

    // If both empty, skip row
    if (!rawId && !rawName) {
      skipped++;
      continue;
    }

    const className = setIndex >= 0 && rawCols[setIndex] && rawCols[setIndex].trim() ? rawCols[setIndex].trim() : 'DIA_4A';
    const rawPhone = phoneIndex >= 0 && rawCols[phoneIndex] !== undefined ? rawCols[phoneIndex] : '';
    const phone = normalizePhoneNumber(rawPhone);
    const email = emailIndex >= 0 && rawCols[emailIndex] ? rawCols[emailIndex].trim() : '';
    const department = deptIndex >= 0 && rawCols[deptIndex] && rawCols[deptIndex].trim() ? rawCols[deptIndex].trim() : 'Diploma Perakaunan';

    let cleanId = rawId.toUpperCase();
    const cleanName = rawName.toUpperCase();
    const cleanClass = className.toUpperCase().replace(/\s+/g, '_');
    
    // Check for exact duplicate (same ID AND same Name) vs different student sharing a non-unique ID
    if (seenIds.has(cleanId)) {
      const existingStudent = resultStudents.find((s) => s.id === cleanId);
      const isSamePerson = existingStudent && (existingStudent.name === cleanName || !cleanName);

      if (isSamePerson) {
        duplicates++;
        const existingIndex = resultStudents.findIndex((s) => s.id === cleanId);
        if (existingIndex >= 0) {
          resultStudents[existingIndex] = {
            ...resultStudents[existingIndex],
            name: cleanName || resultStudents[existingIndex].name,
            className: cleanClass || resultStudents[existingIndex].className,
            phone: phone || resultStudents[existingIndex].phone,
            email: email || resultStudents[existingIndex].email,
            department: department || resultStudents[existingIndex].department
          };
        }
        continue;
      } else {
        // Different student sharing the same non-unique ID field (e.g. course code or generic text)
        cleanId = `${cleanId}_${i}`;
      }
    }
    seenIds.add(cleanId);

    resultStudents.push({
      id: cleanId,
      studentId: cleanId,
      name: cleanName,
      className: cleanClass,
      phone,
      email,
      department
    });
  }

  return {
    students: resultStudents,
    totalRowsRead: rawLines.length - (headerIndex + 1),
    duplicateCount: duplicates,
    skippedCount: skipped,
    detectedDelimiter: delimiter,
    headerRowIndex: headerIndex
  };
};

export const parseStudentCSV = (csvText: string): Student[] => {
  return parseStudentCSVWithReport(csvText).students;
};

export const downloadCSV = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const downloadJSON = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};


