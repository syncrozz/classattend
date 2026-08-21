import { Student, AttendanceRecord, AttendanceSession, Lecturer } from '../types';

/**
 * Generate standard CSV template for lecturer to download and fill in (Students)
 */
export const generateClassTemplateCSV = (sampleClassName: string = 'DIA_4A'): string => {
  const headers = ['Bil', 'No_Pelajar', 'Nama_Pelajar', 'Kelas', 'No_Telefon', 'Email', 'Program'];
  const sampleRows = [
    [1, 'PDA-2502-001', 'NUR AISYAH BINTI ABDUL RAZAK', sampleClassName, '601110571550', 'aisyah.razak@bpenawar.kpm.edu.my', 'Diploma Perakaunan'],
    [2, 'PDA-2502-002', 'MUHAMMAD RAIYAN DARWISY BIN MOHD ZALANI', sampleClassName, '60122187981', 'raiyan.mohd@bpenawar.kpm.edu.my', 'Diploma Perakaunan'],
    [3, 'PDA-2502-005', 'MUHAMMAD AIMAN BIN MUHAMMAD ARIFF', sampleClassName, '60166982011', 'aiman.ariff@bpenawar.kpm.edu.my', 'Diploma Perakaunan']
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
      'Jabatan Pengajian Am',
      'ADMIN'
    ],
    [
      2,
      'PN. SITI ROHANI BINTI AHMAD',
      'rohani@bpenawar.kpm.edu.my',
      '880520-01-5214',
      'DIA_4A, DIA_4C',
      'ACC 2103 - Perakaunan Kewangan 2',
      'Jabatan Perakaunan',
      'LECTURER'
    ],
    [
      3,
      'EN. MOHD FAIZAL BIN HARUN',
      'faizal@bpenawar.kpm.edu.my',
      '840912-08-5432',
      'DIA_4B, DIA_4D',
      'MGT 2013 - Prinsip Pengurusan',
      'Jabatan Pengurusan Perniagaan',
      'LECTURER'
    ],
    [
      4,
      'PN. NURUL IZZATI BINTI ISMAIL',
      'izzati@bpenawar.kpm.edu.my',
      '910304-01-6128',
      'DIA_4C, DIA_4D',
      'TAX 3013 - Percukaian Malaysia',
      'Jabatan Perakaunan',
      'LECTURER'
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
    `"${l.department || 'Jabatan Perakaunan'}"`,
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
    const department = deptIndex >= 0 && rawCols[deptIndex] ? rawCols[deptIndex].trim() : 'Jabatan Perakaunan';
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

export const parseStudentCSV = (csvText: string): Student[] => {
  const lines = csvText
    .split(/\r\n|\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length <= 1) return [];

  const headers = lines[0].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());

  // Find column indices
  let idIndex = headers.findIndex((h) => h.includes('no_pelajar') || h.includes('id') || h.includes('matric') || h.includes('student'));
  let nameIndex = headers.findIndex((h) => h.includes('nama_pelajar') || h.includes('nama') || h.includes('name'));
  let setIndex = headers.findIndex((h) => h.includes('kelas') || h.includes('seksyen') || h.includes('nama_set') || h.includes('set') || h.includes('class'));
  let phoneIndex = headers.findIndex((h) => h.includes('telefon') || h.includes('phone') || h.includes('tel'));
  let emailIndex = headers.findIndex((h) => h.includes('email') || h.includes('e-mel') || h.includes('mel'));
  let deptIndex = headers.findIndex((h) => h.includes('program') || h.includes('jabatan') || h.includes('kursus') || h.includes('department'));

  // Fallbacks by position if not found by name
  if (idIndex === -1 && headers.length >= 2) idIndex = 1;
  if (nameIndex === -1 && headers.length >= 3) nameIndex = 2;
  if (setIndex === -1 && headers.length >= 4) setIndex = 3;
  if (phoneIndex === -1 && headers.length >= 5) phoneIndex = 4;
  if (emailIndex === -1 && headers.length >= 6) emailIndex = 5;

  const resultStudents: Student[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawCols = splitCSVRow(lines[i]);
    if (rawCols.length < 2) continue;

    const studentId = (idIndex >= 0 && rawCols[idIndex] ? rawCols[idIndex] : `PDA-${Date.now()}-${i}`);
    const name = (nameIndex >= 0 && rawCols[nameIndex] ? rawCols[nameIndex] : `Pelajar ${i}`);
    const className = (setIndex >= 0 && rawCols[setIndex] ? rawCols[setIndex] : 'DIA_4A');
    const phone = (phoneIndex >= 0 && rawCols[phoneIndex] ? rawCols[phoneIndex] : '');
    const email = (emailIndex >= 0 && rawCols[emailIndex] ? rawCols[emailIndex] : '');
    const department = (deptIndex >= 0 && rawCols[deptIndex] ? rawCols[deptIndex] : 'Diploma Perakaunan');

    if (!studentId || !name) continue;

    resultStudents.push({
      id: studentId.trim().toUpperCase(),
      studentId: studentId.trim().toUpperCase(),
      name: name.trim().toUpperCase(),
      className: className.trim().toUpperCase(),
      phone: phone.trim(),
      email: email.trim(),
      department: department.trim()
    });
  }

  return resultStudents;
};

function splitCSVRow(rowText: string): string[] {
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
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

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

