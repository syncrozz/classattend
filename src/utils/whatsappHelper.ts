import { Student } from '../types';

export function formatWhatsAppPhone(rawPhone?: string): string {
  if (!rawPhone) return '';
  // Strip all non-numeric characters
  let cleaned = rawPhone.replace(/\D/g, '');
  if (!cleaned) return '';

  // Handle local Malaysian mobile numbers
  if (cleaned.startsWith('0')) {
    cleaned = '60' + cleaned.slice(1);
  } else if (cleaned.startsWith('60')) {
    // Already in international format
  } else if (cleaned.length >= 9 && !cleaned.startsWith('60')) {
    cleaned = '60' + cleaned;
  }
  return cleaned;
}

export interface WhatsAppAttendanceWarningParams {
  student: Student;
  courseCode?: string;
  courseName?: string;
  sessionName?: string;
  sessionDate?: string;
  sessionTime?: string;
  className?: string;
  presentCount?: number;
  totalSessions?: number;
  rate?: number;
  lecturerName?: string;
}

export function generateAttendanceWarningMessage(params: WhatsAppAttendanceWarningParams): string {
  const {
    student,
    courseCode,
    courseName,
    sessionName,
    sessionDate,
    sessionTime,
    className,
    presentCount,
    totalSessions,
    rate,
    lecturerName
  } = params;

  const targetClass = className || student.className || 'DIA';
  const courseDisplay =
    courseCode && courseName
      ? `${courseCode} - ${courseName}`
      : courseCode || courseName || sessionName || 'Kursus KPM';
  const sessionInfo = sessionName ? `\n📌 *Sesi Kuliah:* ${sessionName}` : '';
  const dateTimeInfo = sessionDate ? `\n📅 *Tarikh/Masa:* ${sessionDate} ${sessionTime ? `(${sessionTime})` : ''}` : '';
  const absentCount =
    totalSessions !== undefined && presentCount !== undefined
      ? Math.max(0, totalSessions - presentCount)
      : undefined;

  const rateDisplay =
    rate !== undefined
      ? `${rate}%`
      : totalSessions && presentCount !== undefined
      ? `${Math.round((presentCount / totalSessions) * 100)}%`
      : '-';
  const recordDisplay =
    totalSessions !== undefined && presentCount !== undefined ? `${presentCount} / ${totalSessions} Sesi` : '-';
  const absentText = absentCount !== undefined ? `\n❌ *Bilangan Tidak Hadir:* ${absentCount} Sesi` : '';

  const lecturerSignature = lecturerName
    ? `\n\nDaripada:\n*${lecturerName}*\nPensyarah Kursus`
    : '\n\nDaripada:\nPensyarah Kursus / Penyelaras Kelas';

  return `*PERINGATAN & REKOD MAKLUMAN KEHADIRAN KURSUS*
Kolej Profesional MARA Bandar Penawar

Assalamualaikum & Salam Sejahtera,

Kepada: *${student.name}*
No. Pelajar: *${student.studentId}*
Kelas: *${targetClass}*

Merujuk kepada rekod kehadiran sistem *ClassAttend KPM*:
📚 *Kursus:* ${courseDisplay}${sessionInfo}${dateTimeInfo}
📊 *Rekod Kehadiran Semasa:* ${recordDisplay} (${rateDisplay})${absentText}
⚠️ *Status:* DI BAWAH SASARAN KPI (80% MINIMUM KPM)

*Peringatan Penting:*
Kehadiran anda telah berada di bawah piawaian minimum 80% yang ditetapkan oleh KPM. Sila berhubung dengan pensyarah kursus dengan segera atau kemukakan bukti/Surat Cuti Sakit (MC) rasmi bagi mengelakkan pengeluaran *Surat Amaran Kehadiran* atau tindakan halangan menduduki peperiksaan akhir.${lecturerSignature}

_(Mesej ini dijana secara automatik melalui sistem ClassAttend KPM bagi tujuan pemantauan & rekod komunikasi pensyarah)._`;
}

export function generateWhatsAppWarningLink(params: WhatsAppAttendanceWarningParams): string {
  const phone = formatWhatsAppPhone(params.student.phone);
  if (!phone) return '';
  const text = generateAttendanceWarningMessage(params);
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
