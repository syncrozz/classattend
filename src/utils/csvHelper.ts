import { Student, AttendanceRecord, AttendanceSession, Lecturer } from '../types';

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
    const phone = phoneIndex >= 0 && rawCols[phoneIndex] ? rawCols[phoneIndex].trim() : '';
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


