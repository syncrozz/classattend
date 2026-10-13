import { Student } from '../types';
import { normalizePhoneNumber } from './phoneHelper';

export function formatWhatsAppPhone(rawPhone?: string): string {
  if (!rawPhone) return '';
  return normalizePhoneNumber(rawPhone);
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

// ============================================================================
// ADMIN SUPPORT & SMART SCREENSHOT INTEGRATION (SES v4.5)
// Official Admin Contact: 60145313756
// ============================================================================
export const ADMIN_WHATSAPP_PHONE = '60145313756';
export const ADMIN_WHATSAPP_URL = 'https://wa.me/60145313756';

export interface AdminSupportMessageParams {
  studentId?: string;
  studentName?: string;
  courseCode?: string;
  courseName?: string;
  className?: string;
  sessionName?: string;
  lecturerName?: string;
  issueDescription?: string;
}

export function generateAdminSupportMessage(params: AdminSupportMessageParams): string {
  const {
    studentId,
    studentName,
    courseCode,
    courseName,
    className,
    sessionName,
    lecturerName,
    issueDescription
  } = params;

  const courseDisplay =
    courseCode && courseName
      ? `${courseCode} - ${courseName}`
      : courseCode || courseName || 'Subjek KPM';

  const issue = issueDescription || 'No. Pelajar tidak dijumpai / ralat pendaftaran kehadiran';

  const lines = [
    `*BANTUAN KEHADIRAN PELAJAR — CLASSATTEND*`,
    `Kolej Profesional MARA Bandar Penawar`,
    ``,
    `Salam sejahtera Pentadbir Sistem ClassAttend,`,
    `Saya memerlukan bantuan teknikal berkaitan pendaftaran/pengesahan kehadiran:`,
    ``,
    `📌 *Maklumat Sesi:*`,
    `• Subjek: ${courseDisplay}`,
    `• Kelas: ${className || '-'}`,
    ...(sessionName ? [`• Sesi: ${sessionName}`] : []),
    ...(lecturerName ? [`• Pensyarah: ${lecturerName}`] : []),
    ...(studentId ? [`• No. Pelajar: ${studentId}`] : []),
    ...(studentName ? [`• Nama Pelajar: ${studentName}`] : []),
    `• Isu/Masalah: ${issue}`,
    ``,
    `📎 Bersama ini saya sertakan tangkapan skrin (screenshot) paparan ClassAttend saya untuk semakan pihak admin.`,
    ``,
    `Terima kasih.`
  ];

  return lines.join('\n');
}

export function generateAdminSupportLink(params: AdminSupportMessageParams): string {
  const text = generateAdminSupportMessage(params);
  return `https://wa.me/${ADMIN_WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`;
}

