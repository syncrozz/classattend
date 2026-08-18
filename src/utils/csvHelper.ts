import { Student, AttendanceRecord, AttendanceSession } from '../types';

/**
 * Generate standard CSV template for lecturer to download and fill in
 */
export const generateClassTemplateCSV = (sampleClassName: string = 'DIA_4A'): string => {
  const headers = ['Bil', 'No_Pelajar', 'Nama_Pelajar', 'Kelas_Seksyen', 'No_Telefon', 'Email', 'Program'];
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

export const exportStudentsToCSV = (students: Student[]): string => {
  const headers = ['Bil', 'No_Pelajar', 'Nama_Pelajar', 'Kelas_Seksyen', 'No_Telefon', 'Email', 'Program'];
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
    'Kelas_Seksyen',
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

