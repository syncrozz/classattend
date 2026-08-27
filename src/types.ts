export type EventStatus = 'OPEN' | 'CLOSED' | 'ARCHIVED';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export type AttendanceMethod = 'QR' | 'MANUAL' | 'CAMERA_SCAN' | 'SIMULATOR' | 'MANUAL_OVERRIDE';

export type UserRole = 'ADMIN' | 'LECTURER' | 'STUDENT';

export type ActivityCategory =
  | 'CLASS'
  | 'ASSEMBLY'
  | 'OFFICIAL_PROGRAMME'
  | 'SEMINAR'
  | 'WORKSHOP'
  | 'BRIEFING'
  | 'CO_CURRICULAR'
  | 'STUDENT_PROGRAMME'
  | 'CLUB_ACTIVITY'
  | 'SPECIAL_EVENT'
  | 'OTHER';

export interface Lecturer {
  id: string;
  name: string;
  email: string; // Must end with @bpenawar.kpm.edu.my
  icNumber: string; // e.g. 861115-46-5305
  pin: string; // Last 4 digits of IC (e.g. 5305)
  phone?: string;
  department?: string;
  assignedSections?: string[]; // e.g. ['DIA_4A', 'DIA_4B']
  assignedClasses?: string[]; // Alias for assignedSections
  assignedSubjects?: string[]; // e.g. ['MPU 2163 - Pengajian Malaysia 2']
  role?: 'ADMIN' | 'LECTURER';
  status?: 'PENDING' | 'ACTIVE' | 'REJECTED';
  registeredAt?: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface TeachingAssignment {
  id: string; // e.g. TA_${lecturerId}_${subjectCode}_${className}
  lecturerId: string;
  lecturerEmail: string;
  lecturerName: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  className: string; // e.g. DIA_4A
  status: 'PENDING' | 'ACTIVE' | 'REJECTED';
  createdAt: string; // ISO String
  approvedAt?: string;
  approvedBy?: string;
}

export interface Subject {
  id: string;
  code: string; // e.g. MPU 2163
  name: string; // e.g. Pengajian Malaysia 2
  lecturerId?: string;
  lecturerEmail?: string;
  lecturerName?: string;
  department?: string;
  sections: string[]; // e.g. ['DIA_4A', 'DIA_4B']
  location?: string;
  description?: string;
  status?: 'ACTIVE' | 'ARCHIVED';
  createdAt?: string;
}

export interface Enrollment {
  id: string; // e.g. ENR_${studentId}_${subjectCode}_${className}
  studentId: string; // Unique student identifier (No. Pelajar e.g. PDA-2502-011)
  subjectCode: string; // e.g. MPU 2163
  subjectName?: string; // e.g. Pengajian Malaysia 2
  className: string; // e.g. DIA_4A
  section?: string;
  lecturerEmail?: string;
  lecturerName?: string;
  enrolledAt: string; // ISO String
  status?: 'ACTIVE' | 'DROPPED';
}

export interface EnrollmentContext {
  subjectCode: string;
  subjectName: string;
  className: string;
  lecturerName?: string;
  lecturerEmail?: string;
}

export interface Student {
  id: string; // Unique student identifier (e.g. PDA-2502-005)
  studentId: string; // Normalized No_Pelajar (e.g. PDA-2502-005)
  name: string;
  className: string; // e.g. DIA_4A, DIA_4B, DIA_4C, DIA_4D
  classId?: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  department?: string; // Programme (e.g. Diploma Perakaunan)
}

// Backward compatibility alias
export type Staff = Student;

export interface AttendanceSession {
  id: string; // Unique session ID (e.g. SES-CLS-01)
  sessionName: string; // e.g. "Kuliah Minggu 4: Pengenalan Cukai Pendapatan"
  subjectId?: string;
  subjectCode: string; // e.g. "MPU 2163" or "ACC 2103"
  subjectName: string; // e.g. "Pengajian Malaysia 2"
  className: string; // e.g. "DIA_4A" or "DIA_4B" or "ALL"
  section?: string;
  lecturerName: string; // e.g. "Khairi bin Abdul Rahman"
  lecturerEmail?: string; // e.g. "khairi@bpenawar.kpm.edu.my"
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: EventStatus; // OPEN | CLOSED | ARCHIVED
  attendanceMethod: AttendanceMethod;
  qrToken?: string;
  location?: string; // e.g. "Bilik Kuliah 3" / "Makmal Komputer"
  topic?: string;
  createdAt?: string;
  
  // Backward compatibility fields
  activityId?: string;
  activityName?: string;
  category?: string;
  organizer?: string;
}

// Backward compatibility alias
export type AttendanceActivity = AttendanceSession;
export type EventItem = AttendanceSession;

export interface AttendanceRecord {
  id: string; // Record ID (e.g. REC-172354890)
  sessionId: string; // Associated Session ID
  studentId: string; // Associated Student ID (No_Pelajar)
  timestamp: string; // ISO String
  status: AttendanceStatus; // PRESENT, ABSENT, etc.
  method: AttendanceMethod;
  notes?: string;
  verifiedBy?: string;
  subjectCode?: string;
  className?: string;
}

export interface ScanResult {
  code: 'RECORDED' | 'ALREADY_RECORDED' | 'INVALID_QR' | 'NO_ACTIVE_EVENT' | 'STUDENT_NOT_FOUND' | 'CLASS_MISMATCH' | 'ERROR';
  message: string;
  student?: Student;
  session?: AttendanceSession;
  timestamp: string;
  isDuplicate?: boolean;
  record?: AttendanceRecord;
  success: boolean;
}

export type ActiveTab =
  | 'dashboard'
  | 'scanner'
  | 'classes'
  | 'activities'
  | 'students'
  | 'my-attendance'
  | 'reports'
  | 'guide'
  | 'support';

export interface StudentAttendanceSummary {
  student: Student;
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  percentage: number;
  subjectBreakdown: Record<string, { total: number; present: number; percentage: number }>;
  recentRecords: Array<{
    record: AttendanceRecord;
    session: AttendanceSession;
  }>;
}

/**
 * Official ClassAttend App Icon — Single Source of Truth
 */
export const OFFICIAL_STUDENT_ATTEND_ICON =
  'https://raw.githubusercontent.com/syncrozz/syncrozz-assets/main/logo/ClassAttend/android-chrome-192x192.png';

/**
 * Official ClassAttend Open Graph Image (OGI) — Single Source of Truth
 */
export const OFFICIAL_STUDENT_ATTEND_OGI =
  'https://raw.githubusercontent.com/syncrozz/syncrozz-assets/main/logo/ClassAttend/OGI%20ClassAttend.jpg';

