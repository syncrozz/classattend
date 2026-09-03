import {
  Student,
  AttendanceSession,
  AttendanceRecord,
  EventStatus,
  ScanResult,
  AttendanceMethod,
  Lecturer,
  Subject,
  Enrollment,
  TeachingAssignment
} from '../types';
import {
  INITIAL_STUDENTS,
  INITIAL_LECTURERS,
  INITIAL_SUBJECTS,
  INITIAL_TEACHING_ASSIGNMENTS,
  INITIAL_SESSIONS,
  INITIAL_ATTENDANCE_RECORDS
} from '../data/mockData';
import { sortSessionsLatestFirst } from '../utils/studentUtils';
import { db, sanitizeForFirestore } from './firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDocs
} from 'firebase/firestore';

const STORAGE_KEYS = {
  STUDENTS: 'classattend_students_v5',
  LECTURERS: 'classattend_lecturers_v5',
  SUBJECTS: 'classattend_subjects_v5',
  SESSIONS: 'classattend_sessions_v5',
  RECORDS: 'classattend_records_v5',
  ENROLLMENTS: 'classattend_enrollments_v5',
  TEACHING_ASSIGNMENTS: 'classattend_teaching_assignments_v5',
  ACTIVE_LECTURER: 'classattend_active_lecturer_v5',
  INITIALIZED: 'classattend_initialized_v5'
};

const DUMMY_SESSION_IDS: string[] = [];
const DUMMY_RECORD_PREFIXES: string[] = [];
const DUMMY_SUBJECT_IDS: string[] = [];
const DUMMY_LECTURER_IDS: string[] = [];

class AttendanceEngine {
  private students: Student[] = [];
  private lecturers: Lecturer[] = [];
  private subjects: Subject[] = [];
  private sessions: AttendanceSession[] = [];
  private attendanceRecords: AttendanceRecord[] = [];
  private enrollments: Enrollment[] = [];
  private teachingAssignments: TeachingAssignment[] = [];
  private activeLecturer: Lecturer | null = null;
  private enrollmentListeners: Set<(enrollments: Enrollment[]) => void> = new Set();

  private isFirestoreConnected: boolean = false;

  constructor() {
    this.initializeData();
  }

  private initializeData() {
    const isInitialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);

    if (isInitialized) {
      try {
        const storedStudents = localStorage.getItem(STORAGE_KEYS.STUDENTS);
        const storedLecturers = localStorage.getItem(STORAGE_KEYS.LECTURERS);
        const storedSubjects = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
        const storedSessions = localStorage.getItem(STORAGE_KEYS.SESSIONS);
        const storedRecords = localStorage.getItem(STORAGE_KEYS.RECORDS);
        const storedEnrollments = localStorage.getItem(STORAGE_KEYS.ENROLLMENTS);
        const storedAssignments = localStorage.getItem(STORAGE_KEYS.TEACHING_ASSIGNMENTS);
        const storedActiveLecturer = localStorage.getItem(STORAGE_KEYS.ACTIVE_LECTURER);

        if (storedStudents) {
          const parsed: Student[] = JSON.parse(storedStudents);
          const dedupedMap = new Map<string, Student>();
          parsed.forEach((s) => {
            const rawId = (s.studentId || s.id || '').trim().toUpperCase();
            if (rawId && !dedupedMap.has(rawId)) {
              dedupedMap.set(rawId, {
                ...s,
                id: rawId,
                studentId: rawId,
                name: (s.name || '').trim().toUpperCase(),
                className: (s.className || 'DIA_4A').trim().toUpperCase().replace(/\s+/g, '_')
              });
            }
          });
          this.students = Array.from(dedupedMap.values());
        } else {
          this.students = [];
        }
        this.lecturers = storedLecturers
          ? JSON.parse(storedLecturers).filter((l: Lecturer) => !DUMMY_LECTURER_IDS.includes(l.id))
          : [];
        if (this.lecturers.length === 0 && INITIAL_LECTURERS.length > 0) {
          this.lecturers = [...INITIAL_LECTURERS];
          this.saveLecturersLocally();
        } else {
          // Always ensure Ahmad Khairi Bin Mohd exists in lecturers
          const khairiInList = this.lecturers.find(
            (l) => l.id === 'LEC-KHAIRI' || l.name.toUpperCase().includes('AHMAD KHAIRI')
          );
          if (!khairiInList && INITIAL_LECTURERS.length > 0) {
            this.lecturers.push(...INITIAL_LECTURERS);
            this.saveLecturersLocally();
          } else if (khairiInList) {
            khairiInList.assignedSubjects = [
              'MPU2162 - PENGAJIAN MALAYSIA 2',
              'MPU2412 - KURSUS INTEGRITI DAN ANTI RASUAH'
            ];
            khairiInList.assignedClasses = ['DIA_4A', 'DIA_4B'];
            khairiInList.assignedSections = ['DIA_4A', 'DIA_4B'];
            this.saveLecturersLocally();
          }
        }
        this.subjects = storedSubjects ? JSON.parse(storedSubjects) : [];
        if (this.subjects.length === 0 && INITIAL_SUBJECTS.length > 0) {
          this.subjects = [...INITIAL_SUBJECTS];
          this.saveSubjectsLocally();
        } else {
          // Ensure all 47 standard courses from INITIAL_SUBJECTS are available
          const existingCodes = new Set(this.subjects.map((s) => s.code.toUpperCase()));
          const missing = INITIAL_SUBJECTS.filter((s) => !existingCodes.has(s.code.toUpperCase()));
          if (missing.length > 0) {
            this.subjects.push(...missing);
          }
          // Do not automatically allocate sections to master course list; lecturers decide what they teach
          const initialCodesSet = new Set(INITIAL_SUBJECTS.map((s) => s.code.toUpperCase()));
          this.subjects = this.subjects.map((sub) => {
            if (initialCodesSet.has(sub.code.toUpperCase()) && (sub.sections || []).length > 0) {
              return { ...sub, sections: [] };
            }
            return sub;
          });
          this.saveSubjectsLocally();
        }
        this.sessions = storedSessions ? JSON.parse(storedSessions) : [];
        if (this.sessions.length === 0 && INITIAL_SESSIONS.length > 0) {
          this.sessions = [...INITIAL_SESSIONS];
          this.saveSessionsLocally();
        }
        this.attendanceRecords = storedRecords ? JSON.parse(storedRecords) : [];
        this.enrollments = storedEnrollments ? JSON.parse(storedEnrollments) : [];
        this.teachingAssignments = storedAssignments ? JSON.parse(storedAssignments) : [];
        if (this.teachingAssignments.length === 0 && INITIAL_TEACHING_ASSIGNMENTS.length > 0) {
          this.teachingAssignments = [...INITIAL_TEACHING_ASSIGNMENTS];
          this.saveTeachingAssignmentsLocally();
        } else {
          const hasKhairiTa = this.teachingAssignments.some(
            (ta) => ta.lecturerId === 'LEC-KHAIRI' || ta.lecturerName.toUpperCase().includes('AHMAD KHAIRI')
          );
          if (!hasKhairiTa && INITIAL_TEACHING_ASSIGNMENTS.length > 0) {
            this.teachingAssignments.push(...INITIAL_TEACHING_ASSIGNMENTS);
            this.saveTeachingAssignmentsLocally();
          }
        }
        const rawTrusted = localStorage.getItem('classattend_trusted_access_session');
        if (rawTrusted) {
          try {
            const sess = JSON.parse(rawTrusted);
            if (sess && sess.expiresAt && Date.now() < sess.expiresAt) {
              this.activeLecturer = storedActiveLecturer ? JSON.parse(storedActiveLecturer) : null;
            } else {
              this.activeLecturer = null;
            }
          } catch {
            this.activeLecturer = null;
          }
        } else {
          this.activeLecturer = null;
        }
      } catch (e) {
        console.warn('Error reading from localStorage, resetting to clean ClassAttend data', e);
        this.resetToDefaultData();
      }
    } else {
      this.resetToDefaultData();
    }

    // Clean any legacy dummy data
    this.cleanLegacyDummyData();

    if (db) {
      this.isFirestoreConnected = true;
    }
  }

  public cleanLegacyDummyData() {
    // Filter out dummy sessions and records from memory and local storage
    this.sessions = this.sessions.filter((s) => !DUMMY_SESSION_IDS.includes(s.id));
    this.attendanceRecords = this.attendanceRecords.filter(
      (r) => !DUMMY_RECORD_PREFIXES.some((prefix) => r.id.startsWith(prefix)) && !DUMMY_SESSION_IDS.includes(r.sessionId)
    );
    this.subjects = this.subjects.filter((sub) => !DUMMY_SUBJECT_IDS.includes(sub.id));
    this.lecturers = this.lecturers.filter((lec) => !DUMMY_LECTURER_IDS.includes(lec.id));

    this.saveSessionsLocally();
    this.saveRecordsLocally();
    this.saveSubjectsLocally();
    this.saveLecturersLocally();
    this.saveEnrollmentsLocally();
    this.saveTeachingAssignmentsLocally();

    // Also delete dummy documents from Firestore if present
    if (db) {
      DUMMY_SESSION_IDS.forEach((id) => deleteDoc(doc(db!, 'sessions', id)).catch(() => {}));
      DUMMY_SUBJECT_IDS.forEach((id) => deleteDoc(doc(db!, 'subjects', id)).catch(() => {}));
      DUMMY_LECTURER_IDS.forEach((id) => deleteDoc(doc(db!, 'lecturers', id)).catch(() => {}));
      ['REC-MPU-01', 'REC-MPU-02', 'REC-MPU-03', 'REC-MPU-04', 'REC-MPU-05', 'REC-MPU-06',
       'REC-ACC-01', 'REC-ACC-02', 'REC-ACC-03', 'REC-ACC-04',
       'REC-TAX-01', 'REC-TAX-02', 'REC-TAX-03', 'REC-TAX-04'].forEach((id) => {
        deleteDoc(doc(db!, 'attendance_records', id)).catch(() => {});
      });
    }
  }

  public clearAllDummyData() {
    this.sessions = [];
    this.attendanceRecords = [];
    this.subjects = [];
    this.lecturers = [];
    this.enrollments = [];
    this.teachingAssignments = [];
    this.saveSessionsLocally();
    this.saveRecordsLocally();
    this.saveSubjectsLocally();
    this.saveLecturersLocally();
    this.saveEnrollmentsLocally();
    this.saveTeachingAssignmentsLocally();

    if (db) {
      try {
        const batch = writeBatch(db);
        DUMMY_SESSION_IDS.forEach((id) => batch.delete(doc(db!, 'sessions', id)));
        DUMMY_SUBJECT_IDS.forEach((id) => batch.delete(doc(db!, 'subjects', id)));
        DUMMY_LECTURER_IDS.forEach((id) => batch.delete(doc(db!, 'lecturers', id)));
        ['REC-MPU-01', 'REC-MPU-02', 'REC-MPU-03', 'REC-MPU-04', 'REC-MPU-05', 'REC-MPU-06',
         'REC-ACC-01', 'REC-ACC-02', 'REC-ACC-03', 'REC-ACC-04',
         'REC-TAX-01', 'REC-TAX-02', 'REC-TAX-03', 'REC-TAX-04'].forEach((id) => {
          batch.delete(doc(db!, 'attendance_records', id));
        });
        batch.commit().catch(console.warn);
      } catch (err) {
        console.warn('Clear dummy data notice:', err);
      }
    }
  }

  public resetToDefaultData() {
    this.students = [...INITIAL_STUDENTS];
    this.lecturers = [...INITIAL_LECTURERS];
    this.subjects = [...INITIAL_SUBJECTS];
    this.sessions = [...INITIAL_SESSIONS];
    this.attendanceRecords = [];
    this.enrollments = [];
    this.teachingAssignments = [...INITIAL_TEACHING_ASSIGNMENTS];
    this.activeLecturer = null;

    this.saveStudentsLocally();
    this.saveLecturersLocally();
    this.saveSubjectsLocally();
    this.saveSessionsLocally();
    this.saveRecordsLocally();
    this.saveEnrollmentsLocally();
    this.saveTeachingAssignmentsLocally();
    this.saveActiveLecturerLocally();
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  }

  public async syncInitialStudentsToFirestore() {
    if (!db || this.students.length === 0) return;
    try {
      const batch = writeBatch(db);
      for (const student of this.students) {
        batch.set(doc(db, 'students', student.id), sanitizeForFirestore(student), { merge: true });
      }
      await batch.commit();
    } catch (e: any) {
      console.warn('Firestore initial students seed notice:', e?.message || e);
    }
  }

  // --- Subscriptions ---
  public subscribeStudents(callback: (students: Student[]) => void): () => void {
    if (!db) {
      callback(this.students);
      return () => {};
    }

    try {
      const q = collection(db, 'students');
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map((docSnap) => docSnap.data() as Student);
          const dedupedMap = new Map<string, Student>();
          data.forEach((s) => {
            const rawId = (s.studentId || s.id || '').trim().toUpperCase();
            if (rawId && !dedupedMap.has(rawId)) {
              dedupedMap.set(rawId, {
                ...s,
                id: rawId,
                studentId: rawId,
                name: (s.name || '').trim().toUpperCase(),
                className: (s.className || 'DIA_4A').trim().toUpperCase().replace(/\s+/g, '_')
              });
            }
          });
          this.students = Array.from(dedupedMap.values());
          this.saveStudentsLocally();
          callback(this.students);
        },
        (error) => {
          console.warn('Firestore students sync error, using local data:', error);
          callback(this.students);
        }
      );
      return unsubscribe;
    } catch (e) {
      callback(this.students);
      return () => {};
    }
  }

  public subscribeEnrollments(callback: (enrollments: Enrollment[]) => void): () => void {
    this.enrollmentListeners.add(callback);
    callback(this.enrollments);

    if (!db) {
      return () => {
        this.enrollmentListeners.delete(callback);
      };
    }

    try {
      const q = collection(db, 'enrollments');
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map((docSnap) => docSnap.data() as Enrollment);
          this.enrollments = data;
          this.saveEnrollmentsLocally();
          callback(this.enrollments);
        },
        (error) => {
          console.warn('Firestore enrollments sync error, using local data:', error);
          callback(this.enrollments);
        }
      );
      return () => {
        this.enrollmentListeners.delete(callback);
        unsubscribe();
      };
    } catch (e) {
      callback(this.enrollments);
      return () => {
        this.enrollmentListeners.delete(callback);
      };
    }
  }

  public subscribeLecturers(callback: (lecturers: Lecturer[]) => void): () => void {
    if (!db) {
      callback(this.lecturers);
      return () => {};
    }

    try {
      const q = collection(db, 'lecturers');
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs
            .map((docSnap) => docSnap.data() as Lecturer)
            .filter((lec) => !DUMMY_LECTURER_IDS.includes(lec.id));
          this.lecturers = data;
          this.saveLecturersLocally();
          callback(this.lecturers);
        },
        (error) => {
          console.warn('Firestore lecturers sync error, using local data:', error);
          callback(this.lecturers);
        }
      );
      return unsubscribe;
    } catch {
      callback(this.lecturers);
      return () => {};
    }
  }

  public subscribeSubjects(callback: (subjects: Subject[]) => void): () => void {
    if (!db) {
      callback(this.subjects);
      return () => {};
    }

    try {
      const q = collection(db, 'subjects');
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (snapshot.empty) {
            this.resetSubjectsToDefault();
            callback(this.subjects);
            return;
          }
          let data = snapshot.docs
            .map((docSnap) => docSnap.data() as Subject)
            .filter((subj) => !DUMMY_SUBJECT_IDS.includes(subj.id));

          const initialCodesSet = new Set(INITIAL_SUBJECTS.map((s) => s.code.toUpperCase()));
          const existingCodes = new Set(data.map((d) => d.code.toUpperCase()));
          const missing = INITIAL_SUBJECTS.filter((s) => !existingCodes.has(s.code.toUpperCase()));
          if (missing.length > 0) {
            data = [...data, ...missing];
          }

          // Ensure standard catalog courses have sections: [] (not automatically pre-assigned to classes)
          data = data.map((sub) => {
            if (initialCodesSet.has(sub.code.toUpperCase()) && (sub.sections || []).length > 0) {
              return { ...sub, sections: [] };
            }
            return sub;
          });

          this.subjects = data;
          this.saveSubjectsLocally();
          callback(this.subjects);
        },
        (error) => {
          console.warn('Firestore subjects sync error, using local data:', error);
          callback(this.subjects);
        }
      );
      return unsubscribe;
    } catch {
      callback(this.subjects);
      return () => {};
    }
  }

  public subscribeSessions(callback: (sessions: AttendanceSession[]) => void): () => void {
    if (!db) {
      callback(sortSessionsLatestFirst(this.sessions));
      return () => {};
    }

    try {
      const q = collection(db, 'sessions');
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs
            .map((docSnap) => docSnap.data() as AttendanceSession)
            .filter((sess) => !DUMMY_SESSION_IDS.includes(sess.id));
          this.sessions = sortSessionsLatestFirst(data);
          this.saveSessionsLocally();
          callback(this.sessions);
        },
        (error) => {
          console.warn('Firestore sessions sync error, using local data:', error);
          callback(sortSessionsLatestFirst(this.sessions));
        }
      );
      return unsubscribe;
    } catch (e) {
      callback(sortSessionsLatestFirst(this.sessions));
      return () => {};
    }
  }

  public subscribeRecords(callback: (records: AttendanceRecord[]) => void): () => void {
    if (!db) {
      callback(this.attendanceRecords);
      return () => {};
    }

    try {
      const q = collection(db, 'attendance_records');
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs
            .map((docSnap) => docSnap.data() as AttendanceRecord)
            .filter(
              (rec) =>
                !DUMMY_RECORD_PREFIXES.some((prefix) => rec.id.startsWith(prefix)) &&
                !DUMMY_SESSION_IDS.includes(rec.sessionId)
            );
          this.attendanceRecords = data;
          this.saveRecordsLocally();
          callback(this.attendanceRecords);
        },
        (error) => {
          console.warn('Firestore records sync error, using local data:', error);
          callback(this.attendanceRecords);
        }
      );
      return unsubscribe;
    } catch (e) {
      callback(this.attendanceRecords);
      return () => {};
    }
  }

  public subscribeTeachingAssignments(callback: (assignments: TeachingAssignment[]) => void): () => void {
    if (!db) {
      callback(this.teachingAssignments);
      return () => {};
    }

    try {
      const q = collection(db, 'teaching_assignments');
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map((docSnap) => docSnap.data() as TeachingAssignment);
          this.teachingAssignments = data;
          this.saveTeachingAssignmentsLocally();
          callback(this.teachingAssignments);
        },
        (error) => {
          console.warn('Firestore teaching_assignments sync error, using local data:', error);
          callback(this.teachingAssignments);
        }
      );
      return unsubscribe;
    } catch (e) {
      callback(this.teachingAssignments);
      return () => {};
    }
  }

  // --- Local Persistence Helpers ---
  private saveStudentsLocally() {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(this.students));
  }

  private saveLecturersLocally() {
    localStorage.setItem(STORAGE_KEYS.LECTURERS, JSON.stringify(this.lecturers));
  }

  private saveSubjectsLocally() {
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(this.subjects));
  }

  private saveSessionsLocally() {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(this.sessions));
  }

  private saveRecordsLocally() {
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(this.attendanceRecords));
  }

  private saveEnrollmentsLocally() {
    localStorage.setItem(STORAGE_KEYS.ENROLLMENTS, JSON.stringify(this.enrollments));
    this.notifyEnrollmentListeners();
  }

  public notifyEnrollmentListeners() {
    const list = [...this.enrollments];
    this.enrollmentListeners.forEach((cb) => {
      try {
        cb(list);
      } catch (err) {
        console.warn('Enrollment callback error:', err);
      }
    });
  }

  private saveTeachingAssignmentsLocally() {
    localStorage.setItem(STORAGE_KEYS.TEACHING_ASSIGNMENTS, JSON.stringify(this.teachingAssignments));
  }

  private saveActiveLecturerLocally() {
    if (this.activeLecturer) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_LECTURER, JSON.stringify(this.activeLecturer));
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_LECTURER);
    }
  }

  // --- Lecturer Authentication & Verification ---
  public verifyAdminPin(pin: string): { success: boolean; lecturer?: Lecturer; message: string } {
    const raw = pin.trim();
    if (raw === '5313') {
      const adminLecturer = this.lecturers.find((l) => l.role === 'ADMIN') || {
        id: 'ADMIN-MASTER',
        name: 'PENTADBIR SISTEM (ADMIN)',
        email: 'admin@bpenawar.kpm.edu.my',
        icNumber: '******-**-5313',
        pin: '5313',
        department: 'Pentadbiran Kolej',
        role: 'ADMIN' as const,
        assignedClasses: ['DIA_4A', 'DIA_4B'],
        assignedSubjects: ['ALL']
      };

      this.activeLecturer = adminLecturer;
      this.saveActiveLecturerLocally();
      return {
        success: true,
        lecturer: adminLecturer,
        message: 'Akses Pentadbir (Admin) Berjaya Disahkan!'
      };
    }

    return {
      success: false,
      message: 'PIN Keselamatan Pentadbir (Admin) tidak sah!'
    };
  }

  public verifyLecturer(email: string, icOrPin: string): { success: boolean; lecturer?: Lecturer; message: string } {
    const cleanEmail = email.trim().toLowerCase();
    const rawInput = icOrPin.trim();
    const cleanInputNumeric = rawInput.replace(/[^0-9]/g, '');

    // Master Admin PIN direct verification if entered
    if (rawInput === '5313') {
      const foundAdmin = this.lecturers.find((l) => l.email.toLowerCase() === cleanEmail) || this.lecturers.find((l) => l.role === 'ADMIN');
      if (foundAdmin) {
        this.activeLecturer = foundAdmin;
        this.saveActiveLecturerLocally();
        return {
          success: true,
          lecturer: foundAdmin,
          message: `Akses Pentadbir Berjaya! Selamat bertugas, ${foundAdmin.name}.`
        };
      }
    }

    // 1. Validate email domain
    if (!cleanEmail.endsWith('@bpenawar.kpm.edu.my')) {
      return {
        success: false,
        message: 'Domain emel tidak sah! Sila gunakan domain rasmi kolej (@bpenawar.kpm.edu.my).'
      };
    }

    // 2. Look up lecturer in registered list
    const foundLecturer = this.lecturers.find((l) => l.email.toLowerCase() === cleanEmail);

    if (!foundLecturer) {
      return {
        success: false,
        message: `Emel pensyarah [${cleanEmail}] belum didaftarkan dalam senarai. Sila import atau daftarkan profil pensyarah dahulu.`
      };
    }

    // 3. Extract last 4 digits of IC as PIN and normalized IC
    const normalizedRegisteredIC = (foundLecturer.icNumber || '').replace(/[^0-9]/g, '');
    const expectedPin = foundLecturer.pin || (normalizedRegisteredIC.length >= 4 ? normalizedRegisteredIC.slice(-4) : '');

    // Check matches:
    // a) Exact 4-digit PIN match
    const isPinMatch = rawInput === expectedPin;
    // b) Full IC match (raw input without dashes matches registered IC without dashes)
    const isICMatch = cleanInputNumeric.length >= 6 && cleanInputNumeric === normalizedRegisteredIC;
    // c) Input is full IC and its last 4 digits match
    const isLast4Match = cleanInputNumeric.length >= 4 && cleanInputNumeric.slice(-4) === expectedPin;
    // d) Master admin emergency bypass
    const isMasterBypass = rawInput === '5313';

    if (isPinMatch || isICMatch || isLast4Match || isMasterBypass) {
      // Check status: if PENDING or REJECTED, block login unless admin bypass
      if (!isMasterBypass && foundLecturer.role !== 'ADMIN') {
        if (foundLecturer.status === 'PENDING') {
          return {
            success: false,
            message: `Pendaftaran akaun bagi ${foundLecturer.name} sedang MENUNGGU KELULUSAN Pentadbir (Status: PENDING). Sila hubungi Admin untuk pengesahan.`
          };
        }
        if (foundLecturer.status === 'REJECTED') {
          return {
            success: false,
            message: `Pendaftaran akaun pensyarah ini telah DITOLAK (Status: REJECTED). Sila hubungi Pentadbir Kolej.`
          };
        }
      }

      this.activeLecturer = foundLecturer;
      this.saveActiveLecturerLocally();
      return {
        success: true,
        lecturer: foundLecturer,
        message: `Pengesahan Berjaya! Selamat bertugas, ${foundLecturer.name}.`
      };
    }

    return {
      success: false,
      message: `Padanan Emel dan No. IC / PIN tidak sah! Sila masukkan No. IC sah atau 4 digit terakhir IC bagi ${foundLecturer.name}.`
    };
  }

  // --- Lecturer Self-Registration Engine via Admin QR ---
  public async registerLecturerSelf(params: {
    name: string;
    icNumber: string;
    email: string;
    phone?: string;
    department?: string;
    subjectAssignments: Array<{
      subjectCode: string;
      subjectName: string;
      subjectId?: string;
      classes: string[];
    }>;
  }): Promise<{
    success: boolean;
    isNewLecturer: boolean;
    lecturer: Lecturer;
    assignments: TeachingAssignment[];
    message: string;
  }> {
    const rawName = (params.name || '').trim().toUpperCase();
    const rawEmail = (params.email || '').trim().toLowerCase();
    const rawIC = (params.icNumber || '').trim();
    const rawPhone = (params.phone || '').trim();
    const rawDept = (params.department || '').trim() || 'Jabatan Perakaunan';

    if (!rawName) throw new Error('Nama penuh pensyarah diperlukan.');
    if (!rawEmail) throw new Error('Emel rasmi pensyarah diperlukan.');
    if (!rawEmail.endsWith('@bpenawar.kpm.edu.my')) {
      throw new Error('Emel mestilah menggunakan domain rasmi kolej (@bpenawar.kpm.edu.my).');
    }
    if (!rawIC) throw new Error('No. Kad Pengenalan diperlukan.');

    const cleanNumericIC = rawIC.replace(/[^0-9]/g, '');
    if (cleanNumericIC.length < 4) {
      throw new Error('Sila masukkan No. Kad Pengenalan yang sah.');
    }
    const derivedPin = cleanNumericIC.slice(-4);

    if (!params.subjectAssignments || params.subjectAssignments.length === 0) {
      throw new Error('Sila pilih sekurang-kurangnya satu subjek yang diajar.');
    }

    // 1. Deduplicate or lookup Lecturer Master
    const existingIndex = this.lecturers.findIndex((l) => {
      const lNumericIC = (l.icNumber || '').replace(/[^0-9]/g, '');
      const matchIC = cleanNumericIC.length >= 6 && lNumericIC.length >= 6 && lNumericIC === cleanNumericIC;
      const matchEmail = l.email.toLowerCase() === rawEmail;
      return matchIC || matchEmail;
    });

    const isNewLecturer = existingIndex === -1;
    let lecturerId = isNewLecturer ? `LEC-${Date.now()}` : this.lecturers[existingIndex].id;

    // Collect all assigned classes & subjects across all chosen subjects
    const allAssignedClassesSet = new Set<string>();
    const allAssignedSubjectsSet = new Set<string>();

    // If existing, retain previous classes/subjects as base
    if (!isNewLecturer) {
      (this.lecturers[existingIndex].assignedClasses || []).forEach((c) => allAssignedClassesSet.add(c));
      (this.lecturers[existingIndex].assignedSubjects || []).forEach((s) => allAssignedSubjectsSet.add(s));
    }

    // Process new teaching assignments
    const newAssignments: TeachingAssignment[] = [];
    const createdTimestamp = new Date().toISOString();

    params.subjectAssignments.forEach((subGroup) => {
      const subCode = subGroup.subjectCode.trim().toUpperCase();
      const subName = subGroup.subjectName.trim() || subCode;
      const subId = subGroup.subjectId || `SUB-${subCode.replace(/\s+/g, '_')}`;
      const fullSubLabel = `${subCode} - ${subName}`;
      allAssignedSubjectsSet.add(fullSubLabel);

      subGroup.classes.forEach((rawClass) => {
        const cleanClass = rawClass.trim().toUpperCase().replace(/\s+/g, '_');
        allAssignedClassesSet.add(cleanClass);

        const assignmentId = `TA_${lecturerId}_${subCode.replace(/\s+/g, '_')}_${cleanClass}`;

        const existingAssignmentIndex = this.teachingAssignments.findIndex((ta) => ta.id === assignmentId);

        const assignmentObj: TeachingAssignment = {
          id: assignmentId,
          lecturerId,
          lecturerEmail: rawEmail,
          lecturerName: rawName,
          subjectId: subId,
          subjectCode: subCode,
          subjectName: subName,
          className: cleanClass,
          status: 'PENDING',
          createdAt: createdTimestamp
        };

        if (existingAssignmentIndex >= 0) {
          // Update existing
          this.teachingAssignments[existingAssignmentIndex] = {
            ...this.teachingAssignments[existingAssignmentIndex],
            ...assignmentObj
          };
          newAssignments.push(this.teachingAssignments[existingAssignmentIndex]);
        } else {
          // Add new assignment
          this.teachingAssignments.push(assignmentObj);
          newAssignments.push(assignmentObj);
        }
      });
    });

    const assignedClasses = Array.from(allAssignedClassesSet);
    const assignedSubjects = Array.from(allAssignedSubjectsSet);

    const lecturerData: Lecturer = {
      id: lecturerId,
      name: rawName,
      email: rawEmail,
      icNumber: rawIC,
      pin: derivedPin,
      phone: rawPhone,
      department: rawDept,
      assignedClasses,
      assignedSections: assignedClasses,
      assignedSubjects,
      role: isNewLecturer ? 'LECTURER' : this.lecturers[existingIndex].role || 'LECTURER',
      status: 'PENDING', // All self-registrations require Admin Approval
      registeredAt: isNewLecturer ? createdTimestamp : this.lecturers[existingIndex].registeredAt || createdTimestamp
    };

    if (isNewLecturer) {
      this.lecturers.push(lecturerData);
    } else {
      this.lecturers[existingIndex] = lecturerData;
    }

    // Persist locally
    this.saveLecturersLocally();
    this.saveTeachingAssignmentsLocally();

    // Persist to Firestore
    if (db) {
      try {
        const batch = writeBatch(db);
        batch.set(doc(db, 'lecturers', lecturerId), sanitizeForFirestore(lecturerData), { merge: true });
        newAssignments.forEach((ta) => {
          batch.set(doc(db, 'teaching_assignments', ta.id), sanitizeForFirestore(ta), { merge: true });
        });
        await batch.commit();
      } catch (err) {
        console.warn('Firestore self-registration sync notice:', err);
      }
    }

    return {
      success: true,
      isNewLecturer,
      lecturer: lecturerData,
      assignments: newAssignments,
      message: `Pendaftaran kendiri berjaya dihantar! Status: MENUNGGU KELULUSAN ADMIN. Sila maklumkan kepada Pentadbir untuk pengaktifan.`
    };
  }

  // --- Admin Approval & Rejection Engine ---
  public async approveLecturer(lecturerId: string, approvedBy: string = 'Pentadbir Sistem'): Promise<{ success: boolean; message: string }> {
    const idx = this.lecturers.findIndex((l) => l.id === lecturerId);
    if (idx === -1) {
      return { success: false, message: 'Pensyarah tidak dijumpai.' };
    }

    const timestamp = new Date().toISOString();
    const targetLecturer = this.lecturers[idx];
    targetLecturer.status = 'ACTIVE';
    targetLecturer.approvedAt = timestamp;
    targetLecturer.approvedBy = approvedBy;

    // Approve all their pending teaching assignments
    this.teachingAssignments = this.teachingAssignments.map((ta) => {
      if (ta.lecturerId === lecturerId) {
        return {
          ...ta,
          status: 'ACTIVE' as const,
          approvedAt: timestamp,
          approvedBy
        };
      }
      return ta;
    });

    this.saveLecturersLocally();
    this.saveTeachingAssignmentsLocally();

    if (db) {
      try {
        const batch = writeBatch(db);
        batch.set(doc(db, 'lecturers', lecturerId), sanitizeForFirestore(targetLecturer), { merge: true });
        this.teachingAssignments
          .filter((ta) => ta.lecturerId === lecturerId)
          .forEach((ta) => {
            batch.set(doc(db, 'teaching_assignments', ta.id), sanitizeForFirestore(ta), { merge: true });
          });
        await batch.commit();
      } catch (err) {
        console.warn('Firestore approve lecturer sync notice:', err);
      }
    }

    return {
      success: true,
      message: `Pensyarah [${targetLecturer.name}] telah BERJAYA DILULUSKAN (Status: ACTIVE). Akaun kini sedia digunakan!`
    };
  }

  public async rejectLecturer(lecturerId: string, reason?: string): Promise<{ success: boolean; message: string }> {
    const idx = this.lecturers.findIndex((l) => l.id === lecturerId);
    if (idx === -1) {
      return { success: false, message: 'Pensyarah tidak dijumpai.' };
    }

    const targetLecturer = this.lecturers[idx];
    targetLecturer.status = 'REJECTED';

    this.teachingAssignments = this.teachingAssignments.map((ta) => {
      if (ta.lecturerId === lecturerId) {
        return {
          ...ta,
          status: 'REJECTED' as const
        };
      }
      return ta;
    });

    this.saveLecturersLocally();
    this.saveTeachingAssignmentsLocally();

    if (db) {
      try {
        const batch = writeBatch(db);
        batch.set(doc(db, 'lecturers', lecturerId), sanitizeForFirestore(targetLecturer), { merge: true });
        this.teachingAssignments
          .filter((ta) => ta.lecturerId === lecturerId)
          .forEach((ta) => {
            batch.set(doc(db, 'teaching_assignments', ta.id), sanitizeForFirestore(ta), { merge: true });
          });
        await batch.commit();
      } catch (err) {
        console.warn('Firestore reject lecturer sync notice:', err);
      }
    }

    return {
      success: true,
      message: `Pendaftaran pensyarah [${targetLecturer.name}] telah DITOLAK (REJECTED).`
    };
  }

  public deleteTeachingAssignment(assignmentId: string) {
    this.teachingAssignments = this.teachingAssignments.filter((ta) => ta.id !== assignmentId);
    this.saveTeachingAssignmentsLocally();
    if (db) {
      deleteDoc(doc(db, 'teaching_assignments', assignmentId)).catch(console.warn);
    }
  }

  /**
   * Allows a lecturer to configure and save which subjects and classes they teach.
   * Eliminates automatic system assignment - autonomy given to lecturers.
   */
  public async updateLecturerTeachingAssignments(
    lecturerId: string,
    subjectAssignments: {
      subjectCode: string;
      subjectName: string;
      department?: string;
      classes: string[];
    }[]
  ): Promise<{ success: boolean; message: string }> {
    const targetLecturerIndex = this.lecturers.findIndex((l) => l.id === lecturerId);
    if (targetLecturerIndex < 0) {
      return { success: false, message: 'Rekod pensyarah tidak dijumpai.' };
    }

    const lecturer = this.lecturers[targetLecturerIndex];
    const oldAssignments = this.teachingAssignments.filter((ta) => ta.lecturerId === lecturerId);

    // Filter out old assignments for this lecturer
    this.teachingAssignments = this.teachingAssignments.filter((ta) => ta.lecturerId !== lecturerId);

    const newAssignments: TeachingAssignment[] = [];
    const allAssignedClasses = new Set<string>();
    const allAssignedSubjects = new Set<string>();
    const createdTimestamp = new Date().toISOString();

    subjectAssignments.forEach((sg) => {
      const subCode = sg.subjectCode.trim().toUpperCase();
      const subName = sg.subjectName.trim() || subCode;
      const fullSubLabel = `${subCode} - ${subName}`;
      allAssignedSubjects.add(fullSubLabel);

      sg.classes.forEach((cls) => {
        const cleanClass = cls.trim().toUpperCase().replace(/\s+/g, '_');
        allAssignedClasses.add(cleanClass);
        const assignmentId = `TA_${lecturerId}_${subCode.replace(/\s+/g, '_')}_${cleanClass}`;
        const assignmentObj: TeachingAssignment = {
          id: assignmentId,
          lecturerId,
          lecturerEmail: lecturer.email,
          lecturerName: lecturer.name,
          subjectId: `SUB-${subCode.replace(/\s+/g, '_')}`,
          subjectCode: subCode,
          subjectName: subName,
          className: cleanClass,
          status: 'ACTIVE',
          createdAt: createdTimestamp
        };
        newAssignments.push(assignmentObj);
        this.teachingAssignments.push(assignmentObj);
      });
    });

    const updatedLecturer: Lecturer = {
      ...lecturer,
      assignedClasses: Array.from(allAssignedClasses),
      assignedSections: Array.from(allAssignedClasses),
      assignedSubjects: Array.from(allAssignedSubjects)
    };

    this.lecturers[targetLecturerIndex] = updatedLecturer;
    if (this.activeLecturer?.id === lecturerId) {
      this.activeLecturer = updatedLecturer;
      this.saveActiveLecturerLocally();
    }

    this.saveLecturersLocally();
    this.saveTeachingAssignmentsLocally();

    if (db) {
      try {
        const batch = writeBatch(db);
        // Remove old assignments from Firestore
        oldAssignments.forEach((ta) => {
          batch.delete(doc(db!, 'teaching_assignments', ta.id));
        });
        // Save new assignments to Firestore
        newAssignments.forEach((ta) => {
          batch.set(doc(db!, 'teaching_assignments', ta.id), sanitizeForFirestore(ta), { merge: true });
        });
        // Update lecturer profile with their assigned subjects & classes
        batch.set(doc(db!, 'lecturers', lecturerId), sanitizeForFirestore(updatedLecturer), { merge: true });
        await batch.commit();
      } catch (err) {
        console.warn('Firestore update teaching assignments error:', err);
      }
    }

    return {
      success: true,
      message: 'Penugasan subjek dan kelas pengajaran anda berjaya disimpan.'
    };
  }

  public getTeachingAssignments(): TeachingAssignment[] {
    return [...this.teachingAssignments];
  }

  public getTeachingAssignmentsForLecturer(lecturerIdOrEmail: string): TeachingAssignment[] {
    const query = lecturerIdOrEmail.trim().toLowerCase();
    return this.teachingAssignments.filter(
      (ta) =>
        ta.lecturerId.toLowerCase() === query ||
        ta.lecturerEmail.toLowerCase() === query ||
        ta.lecturerName.toLowerCase().includes(query)
    );
  }

  public getLecturerAssignedSubjectCodes(lecturer: Lecturer | null | undefined): string[] {
    if (!lecturer) return [];
    const codes = new Set<string>();
    const lecId = (lecturer.id || '').trim().toLowerCase();
    const lecEmail = (lecturer.email || '').trim().toLowerCase();
    const lecName = (lecturer.name || '').trim().toLowerCase();

    // 1. From teaching assignments
    this.teachingAssignments.forEach((ta) => {
      const matchId = ta.lecturerId && ta.lecturerId.toLowerCase() === lecId;
      const matchEmail = ta.lecturerEmail && ta.lecturerEmail.toLowerCase() === lecEmail;
      const matchName = ta.lecturerName && ta.lecturerName.toLowerCase().includes(lecName);
      if (matchId || matchEmail || matchName) {
        if (ta.subjectCode) codes.add(ta.subjectCode.trim().toUpperCase());
      }
    });

    // 2. From lecturer.assignedSubjects
    (lecturer.assignedSubjects || []).forEach((subStr) => {
      const code = subStr.includes('-') ? subStr.split('-')[0].trim().toUpperCase() : subStr.trim().toUpperCase();
      if (code) codes.add(code);
    });

    // 3. From subjects master list matching lecturer
    this.subjects.forEach((s) => {
      const matchId = s.lecturerId && s.lecturerId.toLowerCase() === lecId;
      const matchEmail = s.lecturerEmail && s.lecturerEmail.toLowerCase() === lecEmail;
      const matchName = s.lecturerName && s.lecturerName.toLowerCase().includes(lecName);
      if (matchId || matchEmail || matchName) {
        codes.add(s.code.trim().toUpperCase());
      }
    });

    return Array.from(codes);
  }

  public getSubjectsForLecturer(lecturer: Lecturer | null | undefined): Subject[] {
    if (!lecturer) return [];
    const codes = new Set(this.getLecturerAssignedSubjectCodes(lecturer));
    return this.subjects.filter((s) => codes.has(s.code.trim().toUpperCase()));
  }

  public getPendingLecturers(): Lecturer[] {
    return this.lecturers.filter((l) => l.status === 'PENDING');
  }

  public registerLecturer(lecturer: Lecturer): { success: boolean; message: string } {
    const cleanEmail = lecturer.email.trim().toLowerCase();
    if (!cleanEmail.endsWith('@bpenawar.kpm.edu.my')) {
      return {
        success: false,
        message: 'Emel mestilah menggunakan domain rasmi @bpenawar.kpm.edu.my'
      };
    }

    const cleanIC = lecturer.icNumber.trim();
    const numericIC = cleanIC.replace(/[^0-9]/g, '');
    if (numericIC.length < 4) {
      return {
        success: false,
        message: 'Sila masukkan No. Kad Pengenalan yang sah.'
      };
    }

    // Automatically derive PIN from last 4 digits of IC
    const derivedPin = numericIC.slice(-4);
    const newLecturer: Lecturer = {
      ...lecturer,
      email: cleanEmail,
      pin: derivedPin
    };

    const existingIdx = this.lecturers.findIndex((l) => l.email.toLowerCase() === cleanEmail);
    if (existingIdx >= 0) {
      this.lecturers[existingIdx] = newLecturer;
    } else {
      this.lecturers.push(newLecturer);
    }

    this.saveLecturersLocally();
    if (db) {
      setDoc(doc(db, 'lecturers', newLecturer.id), sanitizeForFirestore(newLecturer), { merge: true }).catch(console.warn);
    }

    return {
      success: true,
      message: `Pensyarah berjaya didaftarkan. PIN keselamatan anda adalah [${derivedPin}].`
    };
  }

  public saveLecturersList(lecturers: Lecturer[]) {
    this.lecturers = lecturers;
    this.saveLecturersLocally();

    if (db && lecturers.length > 0) {
      try {
        const batch = writeBatch(db);
        lecturers.forEach((lecturer) => {
          batch.set(doc(db, 'lecturers', lecturer.id), sanitizeForFirestore(lecturer), { merge: true });
        });
        batch.commit().catch((err) => {
          console.warn('Error batch-saving lecturers to Firestore:', err?.message || err);
        });
      } catch (err) {
        console.warn('Batch lecturers write notice:', err);
      }
    }
  }

  public saveSubjectsList(newSubjects: Subject[], replaceAll: boolean = true) {
    if (replaceAll) {
      this.subjects = newSubjects;
    } else {
      const existingMap = new Map<string, Subject>(this.subjects.map((s) => [(s.code || s.id).toUpperCase(), s]));
      newSubjects.forEach((s) => existingMap.set((s.code || s.id).toUpperCase(), s));
      this.subjects = Array.from(existingMap.values());
    }
    this.saveSubjectsLocally();

    if (db && this.subjects.length > 0) {
      try {
        const batch = writeBatch(db);
        this.subjects.forEach((subject) => {
          batch.set(doc(db, 'subjects', subject.id), sanitizeForFirestore(subject), { merge: true });
        });
        batch.commit().catch((err) => {
          console.warn('Error batch-saving subjects to Firestore:', err?.message || err);
        });
      } catch (err) {
        console.warn('Batch subjects write notice:', err);
      }
    }
  }

  public saveSubject(subject: Subject) {
    const existingIdx = this.subjects.findIndex((s) => s.id === subject.id || s.code === subject.code);
    if (existingIdx >= 0) {
      this.subjects[existingIdx] = subject;
    } else {
      this.subjects.push(subject);
    }
    this.saveSubjectsLocally();

    if (db) {
      setDoc(doc(db, 'subjects', subject.id), sanitizeForFirestore(subject), { merge: true }).catch(console.warn);
    }
  }

  public addSubject(subject: Subject) {
    this.saveSubject(subject);
  }

  public deleteSubject(subjectId: string) {
    this.subjects = this.subjects.filter((s) => s.id !== subjectId);
    this.saveSubjectsLocally();

    if (db) {
      deleteDoc(doc(db, 'subjects', subjectId)).catch(console.warn);
    }
  }

  public resetSubjectsToDefault() {
    this.subjects = [...INITIAL_SUBJECTS];
    this.saveSubjectsLocally();

    if (db) {
      try {
        const batch = writeBatch(db);
        INITIAL_SUBJECTS.forEach((sub) => {
          batch.set(doc(db, 'subjects', sub.id), sanitizeForFirestore(sub), { merge: true });
        });
        batch.commit().catch(console.warn);
      } catch (e) {
        console.warn('Reset subjects batch error:', e);
      }
    }
  }

  public deleteLecturer(lecturerId: string) {
    this.lecturers = this.lecturers.filter((l) => l.id !== lecturerId);
    this.saveLecturersLocally();

    if (db) {
      deleteDoc(doc(db, 'lecturers', lecturerId)).catch(console.warn);
    }
  }

  public getActiveLecturer(): Lecturer | null {
    return this.activeLecturer;
  }

  public setActiveLecturer(lecturer: Lecturer | null) {
    this.activeLecturer = lecturer;
    this.saveActiveLecturerLocally();
  }

  public logoutLecturer() {
    this.activeLecturer = null;
    this.saveActiveLecturerLocally();
  }

  // --- Getters ---
  public getStudents(): Student[] {
    return [...this.students];
  }

  public getLecturers(): Lecturer[] {
    return [...this.lecturers];
  }

  public getSubjects(): Subject[] {
    return [...this.subjects];
  }

  public getSessions(): AttendanceSession[] {
    return sortSessionsLatestFirst(this.sessions);
  }

  public getAttendanceRecords(): AttendanceRecord[] {
    return [...this.attendanceRecords];
  }

  public getActiveSession(): AttendanceSession | null {
    return this.sessions.find((s) => s.status === 'OPEN') || null;
  }

  public getEnrollments(): Enrollment[] {
    return [...this.enrollments];
  }

  public getEnrollmentsForStudent(studentId: string): Enrollment[] {
    const cleanId = studentId.trim().toUpperCase();
    return this.enrollments.filter(
      (e) => e.studentId.toUpperCase() === cleanId && e.status !== 'DROPPED'
    );
  }

  public getEnrollmentsForSubjectClass(subjectCode: string, className?: string): Enrollment[] {
    const cleanSub = subjectCode.trim().toUpperCase();
    const cleanClass = className ? className.trim().toUpperCase() : null;
    return this.enrollments.filter((e) => {
      const matchSub = e.subjectCode.toUpperCase() === cleanSub;
      const matchClass = !cleanClass || cleanClass === 'ALL' || e.className.toUpperCase() === cleanClass;
      return matchSub && matchClass && e.status !== 'DROPPED';
    });
  }

  public getEnrollmentsForLecturer(lecturerEmailOrName: string): Enrollment[] {
    const term = lecturerEmailOrName.trim().toUpperCase();
    return this.enrollments.filter(
      (e) =>
        (e.lecturerEmail?.toUpperCase() === term || e.lecturerName?.toUpperCase().includes(term)) &&
        e.status !== 'DROPPED'
    );
  }

  public getStudentsForSubjectClass(subjectCode: string, className?: string): Student[] {
    const enrollments = this.getEnrollmentsForSubjectClass(subjectCode, className);
    const studentIds = new Set(enrollments.map((e) => e.studentId.toUpperCase()));
    
    // Also include students who belong to this class in master data
    return this.students.filter((s) => {
      if (studentIds.has(s.studentId.toUpperCase()) || studentIds.has(s.id.toUpperCase())) {
        return true;
      }
      if (className && className !== 'ALL') {
        return s.className.trim().toUpperCase() === className.trim().toUpperCase();
      }
      return false;
    });
  }

  public getAvailableClasses(): string[] {
    const classSet = new Set<string>();
    this.students.forEach((s) => {
      if (s.className) classSet.add(s.className);
    });
    this.enrollments.forEach((e) => {
      if (e.className) classSet.add(e.className);
    });
    // Default fallback
    if (classSet.size === 0) {
      return ['DIA_4A', 'DIA_4B', 'DIA_4C', 'DIA_4D'];
    }
    return Array.from(classSet).sort();
  }

  public getStudentById(studentId: string): Student | undefined {
    const cleanId = studentId.trim().toUpperCase();
    return this.students.find(
      (s) =>
        s.id.toUpperCase() === cleanId ||
        s.studentId.toUpperCase() === cleanId ||
        s.phone.includes(cleanId) ||
        s.email.toUpperCase() === cleanId
    );
  }

  // --- Student Master & Enrollment Registration Engine ---
  public async registerStudentEnrollment(params: {
    studentId: string;
    name: string;
    email?: string;
    phone?: string;
    className: string;
    department?: string;
    subjectCode: string;
    subjectName?: string;
    lecturerName?: string;
    lecturerEmail?: string;
    section?: string;
  }): Promise<{
    success: boolean;
    isNewStudent: boolean;
    isNewEnrollment: boolean;
    student: Student;
    enrollment: Enrollment;
    message: string;
  }> {
    const rawStudentId = (params.studentId || '').trim().toUpperCase();
    const rawName = (params.name || '').trim().toUpperCase();
    const rawClassName = (params.className || '').trim().toUpperCase().replace(/\s+/g, '_');
    const rawSubCode = (params.subjectCode || '').trim().toUpperCase();
    const rawSubName = (params.subjectName || '').trim();
    const rawEmail = (params.email || '').trim().toLowerCase();
    const rawPhone = (params.phone || '').trim();
    const rawDept = (params.department || '').trim() || 'Diploma Perakaunan';

    if (!rawStudentId) {
      throw new Error('No. Pelajar (Student ID) diperlukan.');
    }
    if (!rawName) {
      throw new Error('Nama Pelajar diperlukan.');
    }
    if (!rawSubCode) {
      throw new Error('Kod Subjek diperlukan.');
    }
    if (!rawClassName) {
      throw new Error('Kelas / Seksyen diperlukan.');
    }

    // 1. Search existing Student Master by studentId / id
    const existingStudent = this.students.find(
      (s) => s.studentId.toUpperCase() === rawStudentId || s.id.toUpperCase() === rawStudentId
    );

    let studentRecord: Student;
    let isNewStudent = false;

    if (!existingStudent) {
      isNewStudent = true;
      studentRecord = {
        id: rawStudentId,
        studentId: rawStudentId,
        name: rawName,
        className: rawClassName,
        email: rawEmail || `${rawStudentId.toLowerCase()}@bpenawar.kpm.edu.my`,
        phone: rawPhone || '',
        department: rawDept
      };
      this.students = [studentRecord, ...this.students.filter((s) => s.id !== rawStudentId)];
      this.saveStudentsLocally();
      if (db) {
        setDoc(doc(db, 'students', rawStudentId), sanitizeForFirestore(studentRecord), { merge: true }).catch(console.warn);
      }
    } else {
      isNewStudent = false;
      // Do not duplicate or overwrite core identity; update non-conflicting empty contact fields if provided
      let hasUpdates = false;
      const updatedStudent: Student = { ...existingStudent };
      if (!updatedStudent.phone && rawPhone) {
        updatedStudent.phone = rawPhone;
        hasUpdates = true;
      }
      if (!updatedStudent.email && rawEmail) {
        updatedStudent.email = rawEmail;
        hasUpdates = true;
      }
      if (hasUpdates) {
        studentRecord = updatedStudent;
        this.students = this.students.map((s) => (s.id === existingStudent.id ? updatedStudent : s));
        this.saveStudentsLocally();
        if (db) {
          setDoc(doc(db, 'students', updatedStudent.id), sanitizeForFirestore(updatedStudent), { merge: true }).catch(console.warn);
        }
      } else {
        studentRecord = existingStudent;
      }
    }

    // 2. Create / Update Enrollment
    const cleanSubCodeKey = rawSubCode.replace(/[^A-Z0-9]/g, '');
    const cleanClassKey = rawClassName.replace(/[^A-Z0-9]/g, '');
    const cleanStudentKey = rawStudentId.replace(/[^A-Z0-9]/g, '');
    const enrollmentId = `ENR_${cleanStudentKey}_${cleanSubCodeKey}_${cleanClassKey}`;

    const existingEnrollmentIndex = this.enrollments.findIndex(
      (e) =>
        e.id === enrollmentId ||
        (e.studentId.toUpperCase() === rawStudentId &&
          e.subjectCode.toUpperCase() === rawSubCode &&
          e.className.toUpperCase() === rawClassName)
    );

    let enrollmentRecord: Enrollment;
    let isNewEnrollment = false;

    if (existingEnrollmentIndex >= 0) {
      isNewEnrollment = false;
      enrollmentRecord = {
        ...this.enrollments[existingEnrollmentIndex],
        status: 'ACTIVE',
        subjectName: rawSubName || this.enrollments[existingEnrollmentIndex].subjectName,
        lecturerName: params.lecturerName || this.enrollments[existingEnrollmentIndex].lecturerName,
        lecturerEmail: params.lecturerEmail || this.enrollments[existingEnrollmentIndex].lecturerEmail
      };
      this.enrollments[existingEnrollmentIndex] = enrollmentRecord;
    } else {
      isNewEnrollment = true;
      enrollmentRecord = {
        id: enrollmentId,
        studentId: rawStudentId,
        subjectCode: rawSubCode,
        subjectName: rawSubName,
        className: rawClassName,
        section: params.section || rawClassName,
        lecturerEmail: params.lecturerEmail || '',
        lecturerName: params.lecturerName || '',
        enrolledAt: new Date().toISOString(),
        status: 'ACTIVE'
      };
      this.enrollments = [enrollmentRecord, ...this.enrollments];
    }

    this.saveEnrollmentsLocally();
    if (db) {
      await setDoc(doc(db, 'enrollments', enrollmentRecord.id), sanitizeForFirestore(enrollmentRecord), { merge: true }).catch(console.warn);
    }

    return {
      success: true,
      isNewStudent,
      isNewEnrollment,
      student: studentRecord,
      enrollment: enrollmentRecord,
      message: isNewEnrollment
        ? `Pendaftaran berjaya! Pelajar ${studentRecord.name} telah didaftarkan ke dalam subjek ${rawSubCode} (${rawClassName}).`
        : `Maklumat pendaftaran disahkan untuk ${studentRecord.name} dalam subjek ${rawSubCode}.`
    };
  }

  public async deleteEnrollment(enrollmentId: string) {
    this.enrollments = this.enrollments.filter((e) => e.id !== enrollmentId);
    this.saveEnrollmentsLocally();
    if (db) {
      await deleteDoc(doc(db, 'enrollments', enrollmentId)).catch(console.warn);
    }
  }

  /**
   * Batch enroll students from master roster into a subject based on their class.
   * Enables 1-click sync between master student records (83 students) and subject enrollment.
   * Optimized with instant local cache commitment and fast writeBatch Firestore syncing.
   */
  public async batchEnrollStudentsForSubject(params: {
    subjectCode: string;
    subjectName: string;
    classNames?: string[];
    lecturerName?: string;
    lecturerEmail?: string;
  }): Promise<{ count: number; message: string }> {
    const rawSubCode = (params.subjectCode || '').trim().toUpperCase();
    const rawSubName = (params.subjectName || '').trim();
    const targetClasses = (params.classNames || []).map((c) => c.trim().toUpperCase());

    // Filter students from master list
    const candidateStudents = this.students.filter((s) => {
      if (!s.className) return false;
      const sClass = s.className.trim().toUpperCase();
      if (targetClasses.length === 0 || targetClasses.includes('ALL')) return true;
      return targetClasses.some((tc) => tc === sClass || tc.replace(/_/g, ' ') === sClass.replace(/_/g, ' '));
    });

    if (candidateStudents.length === 0) {
      return {
        count: 0,
        message: 'Tiada rekod pelajar induk dijumpai bagi kelas yang dipilih.'
      };
    }

    const now = new Date().toISOString();
    const recordsToSave: Enrollment[] = [];

    for (const student of candidateStudents) {
      const rawStudentId = (student.studentId || student.id).trim().toUpperCase();
      const rawClassName = (student.className || 'DIA_4A').trim().toUpperCase();
      const cleanSubCodeKey = rawSubCode.replace(/[^A-Z0-9]/g, '');
      const cleanClassKey = rawClassName.replace(/[^A-Z0-9]/g, '');
      const cleanStudentKey = rawStudentId.replace(/[^A-Z0-9]/g, '');
      const enrollmentId = `ENR_${cleanStudentKey}_${cleanSubCodeKey}_${cleanClassKey}`;

      const existingIndex = this.enrollments.findIndex(
        (e) =>
          e.id === enrollmentId ||
          (e.studentId.toUpperCase() === rawStudentId &&
            e.subjectCode.toUpperCase() === rawSubCode &&
            e.className.toUpperCase() === rawClassName)
      );

      const record: Enrollment = {
        id: enrollmentId,
        studentId: rawStudentId,
        subjectCode: rawSubCode,
        subjectName: rawSubName,
        className: rawClassName,
        section: rawClassName,
        lecturerEmail: params.lecturerEmail || '',
        lecturerName: params.lecturerName || '',
        enrolledAt: existingIndex >= 0 ? this.enrollments[existingIndex].enrolledAt : now,
        status: 'ACTIVE'
      };

      if (existingIndex >= 0) {
        this.enrollments[existingIndex] = record;
      } else {
        this.enrollments = [record, ...this.enrollments];
      }
      recordsToSave.push(record);
    }

    // 1. Instantly commit to local cache and notify all UI listeners (0ms perceived latency)
    this.saveEnrollmentsLocally();
    this.notifyEnrollmentListeners();

    // 2. Perform fast non-blocking Firestore writeBatch in chunks of 400 with a timeout safeguard
    if (db && recordsToSave.length > 0) {
      try {
        const batchPromise = (async () => {
          for (let i = 0; i < recordsToSave.length; i += 400) {
            const batch = writeBatch(db!);
            const chunk = recordsToSave.slice(i, i + 400);
            chunk.forEach((rec) => {
              batch.set(doc(db!, 'enrollments', rec.id), sanitizeForFirestore(rec), { merge: true });
            });
            await batch.commit();
          }
        })();

        // Race with a 2.5 second timeout safeguard so UI never stalls if network or cloud is slow
        const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2500));
        await Promise.race([batchPromise, timeoutPromise]);
      } catch (err) {
        console.warn('Firestore batch enrollment sync warning (local cache retained):', err);
      }
    }

    return {
      count: candidateStudents.length,
      message: `Berjaya menyelaraskan & mendaftarkan ${candidateStudents.length} pelajar induk ke dalam subjek ${rawSubCode}.`
    };
  }

  // --- Mutation Methods ---
  public async saveStudentsList(students: Student[], replaceAll: boolean = true) {
    // Deduplicate by clean ID so each student has exactly 1 record and 1 QR code
    const dedupedMap = new Map<string, Student>();
    students.forEach((s, idx) => {
      const rawId = (s.studentId || s.id || `PDA-ST-${idx + 1}`).trim().toUpperCase();
      if (!dedupedMap.has(rawId)) {
        dedupedMap.set(rawId, {
          ...s,
          id: rawId,
          studentId: rawId,
          name: (s.name || `PELAJAR ${idx + 1}`).trim().toUpperCase(),
          className: (s.className || 'DIA_4A').trim().toUpperCase().replace(/\s+/g, '_')
        });
      }
    });

    const cleanStudents = Array.from(dedupedMap.values());
    this.students = cleanStudents;
    this.saveStudentsLocally();

    if (db) {
      try {
        if (replaceAll) {
          // 1. Fetch all currently existing student documents in Firestore and delete those not in new set
          const snapshot = await getDocs(collection(db, 'students'));
          const newIds = new Set(cleanStudents.map((s) => s.id));
          const toDelete = snapshot.docs.filter((docSnap) => !newIds.has(docSnap.id));

          // Batch delete in chunks of 400
          for (let i = 0; i < toDelete.length; i += 400) {
            const batch = writeBatch(db);
            const chunk = toDelete.slice(i, i + 400);
            chunk.forEach((docSnap) => {
              batch.delete(doc(db!, 'students', docSnap.id));
            });
            await batch.commit();
          }
        }

        // 2. Write/Upsert current students in chunks of 400
        for (let i = 0; i < cleanStudents.length; i += 400) {
          const batch = writeBatch(db);
          const chunk = cleanStudents.slice(i, i + 400);
          chunk.forEach((student) => {
            batch.set(doc(db!, 'students', student.id), sanitizeForFirestore(student), { merge: true });
          });
          await batch.commit();
        }
      } catch (err) {
        console.warn('Firestore students save/replace error:', err);
      }
    }
  }

  /**
   * Admin Utility: Automatically detect and clean any redundant or duplicate student entries
   */
  public async cleanupRedundantStudents(): Promise<{ removedCount: number; finalCount: number }> {
    const originalCount = this.students.length;
    const dedupedMap = new Map<string, Student>();

    // Deduplicate in-memory by studentId
    this.students.forEach((s, idx) => {
      const rawId = (s.studentId || s.id || `PDA-ST-${idx + 1}`).trim().toUpperCase();
      if (!dedupedMap.has(rawId)) {
        dedupedMap.set(rawId, {
          ...s,
          id: rawId,
          studentId: rawId,
          name: (s.name || `PELAJAR ${idx + 1}`).trim().toUpperCase(),
          className: (s.className || 'DIA_4A').trim().toUpperCase().replace(/\s+/g, '_')
        });
      }
    });

    const cleanStudents = Array.from(dedupedMap.values());
    this.students = cleanStudents;
    this.saveStudentsLocally();

    let removedFromDb = 0;
    if (db) {
      try {
        const snapshot = await getDocs(collection(db, 'students'));
        const validIds = new Set(cleanStudents.map((s) => s.id));
        const toDelete = snapshot.docs.filter((docSnap) => !validIds.has(docSnap.id));

        for (let i = 0; i < toDelete.length; i += 400) {
          const batch = writeBatch(db);
          const chunk = toDelete.slice(i, i + 400);
          chunk.forEach((docSnap) => {
            batch.delete(doc(db!, 'students', docSnap.id));
            removedFromDb++;
          });
          await batch.commit();
        }
      } catch (err) {
        console.warn('Cleanup Firestore error:', err);
      }
    }

    return {
      removedCount: Math.max(originalCount - cleanStudents.length, removedFromDb),
      finalCount: cleanStudents.length
    };
  }

  public addStudent(student: Student) {
    this.students = [student, ...this.students.filter((s) => s.id !== student.id)];
    this.saveStudentsLocally();

    if (db) {
      setDoc(doc(db, 'students', student.id), sanitizeForFirestore(student), { merge: true }).catch(console.warn);
    }
  }

  public deleteStudent(studentId: string) {
    this.students = this.students.filter((s) => s.id !== studentId);
    this.saveStudentsLocally();

    if (db) {
      deleteDoc(doc(db, 'students', studentId)).catch(console.warn);
    }
  }

  public saveSubjects(subjects: Subject[]) {
    this.subjects = subjects;
    this.saveSubjectsLocally();

    if (db && subjects.length > 0) {
      try {
        const batch = writeBatch(db);
        subjects.forEach((subj) => {
          batch.set(doc(db, 'subjects', subj.id), sanitizeForFirestore(subj), { merge: true });
        });
        batch.commit().catch(console.warn);
      } catch (err) {
        console.warn('Batch subjects write notice:', err);
      }
    }
  }

  public saveSessions(sessions: AttendanceSession[]) {
    this.sessions = sessions;
    this.saveSessionsLocally();

    if (db && sessions.length > 0) {
      try {
        const batch = writeBatch(db);
        sessions.forEach((session) => {
          batch.set(doc(db, 'sessions', session.id), sanitizeForFirestore(session), { merge: true });
        });
        batch.commit().catch(console.warn);
      } catch (err) {
        console.warn('Batch sessions write notice:', err);
      }
    }
  }

  public addSession(session: AttendanceSession) {
    let updated = [...this.sessions];
    const sessionsToUpdate: AttendanceSession[] = [session];

    if (session.status === 'OPEN') {
      updated = updated.map((s) => {
        if (s.id !== session.id && s.status === 'OPEN') {
          const closed = { ...s, status: 'CLOSED' as EventStatus };
          sessionsToUpdate.push(closed);
          return closed;
        }
        return s;
      });
    }
    
    const index = updated.findIndex((s) => s.id === session.id);
    if (index >= 0) {
      updated[index] = session;
    } else {
      updated = [session, ...updated];
    }

    this.sessions = updated;
    this.saveSessionsLocally();

    if (db) {
      sessionsToUpdate.forEach((s) => {
        setDoc(doc(db, 'sessions', s.id), sanitizeForFirestore(s), { merge: true }).catch(console.warn);
      });
    }

    return updated;
  }

  public deleteSession(sessionId: string): AttendanceSession[] {
    const updated = this.sessions.filter((s) => s.id !== sessionId);
    this.sessions = updated;
    this.saveSessionsLocally();

    if (db) {
      deleteDoc(doc(db, 'sessions', sessionId)).catch(console.warn);
    }

    return updated;
  }

  public setSessionStatus(sessionId: string, newStatus: EventStatus): AttendanceSession[] {
    const sessionsToUpdate: AttendanceSession[] = [];
    const updated = this.sessions.map((session) => {
      if (session.id === sessionId) {
        const modified = { ...session, status: newStatus };
        sessionsToUpdate.push(modified);
        return modified;
      }
      if (newStatus === 'OPEN' && session.status === 'OPEN') {
        const closed = { ...session, status: 'CLOSED' as EventStatus };
        sessionsToUpdate.push(closed);
        return closed;
      }
      return session;
    });

    this.sessions = updated;
    this.saveSessionsLocally();

    if (db) {
      sessionsToUpdate.forEach((s) => {
        setDoc(doc(db, 'sessions', s.id), sanitizeForFirestore(s), { merge: true }).catch(console.warn);
      });
    }

    return updated;
  }

  public addAttendanceRecord(record: AttendanceRecord) {
    this.attendanceRecords = [record, ...this.attendanceRecords.filter((r) => r.id !== record.id)];
    this.saveRecordsLocally();

    if (db) {
      setDoc(doc(db, 'attendance_records', record.id), sanitizeForFirestore(record), { merge: true }).catch(console.warn);
    }
  }

  public saveAttendanceRecords(records: AttendanceRecord[]) {
    this.attendanceRecords = records;
    this.saveRecordsLocally();

    if (db) {
      records.forEach((record) => {
        setDoc(doc(db, 'attendance_records', record.id), sanitizeForFirestore(record), { merge: true }).catch(console.warn);
      });
    }
  }

  // --- CORE ATTENDANCE SCANNING & VERIFICATION ENGINE ---
  public processScan(
    qrString: string,
    method: AttendanceMethod = 'CAMERA_SCAN',
    targetSessionId?: string
  ): ScanResult {
    const now = new Date().toISOString();

    // 1. Identify Target Class Session
    let activeSession: AttendanceSession | null = null;
    if (targetSessionId) {
      activeSession = this.sessions.find((s) => s.id === targetSessionId) || null;
    } else {
      activeSession = this.getActiveSession();
    }

    if (!activeSession) {
      return {
        success: false,
        code: 'NO_ACTIVE_EVENT',
        message: 'Tiada sesi kelas yang aktif atau dibuka pada masa ini.',
        timestamp: now
      };
    }

    // 2. Parse and validate student identifier from QR
    const studentId = this.parseStudentQR(qrString);
    if (!studentId) {
      return {
        success: false,
        code: 'INVALID_QR',
        message: 'Format kod QR tidak sah atau tidak dikenali.',
        timestamp: now,
        session: activeSession
      };
    }

    // 3. Find student in Master Data
    const student = this.getStudentById(studentId);
    if (!student) {
      return {
        success: false,
        code: 'STUDENT_NOT_FOUND',
        message: `Pelajar dengan No. ID [${studentId}] tiada dalam senarai kelas.`,
        timestamp: now,
        session: activeSession
      };
    }

    // 4. Check if student matches class if session is restricted to specific class
    if (activeSession.className && activeSession.className !== 'ALL' && activeSession.className !== 'SEMUA') {
      const allowedClasses = activeSession.className.split(',').map((c) => c.trim().toUpperCase());
      const studentClass = student.className.trim().toUpperCase();
      
      const isEnrolledInSession = this.enrollments.some(
        (e) =>
          e.studentId.toUpperCase() === student.id.toUpperCase() &&
          e.subjectCode.toUpperCase() === (activeSession!.subjectCode || '').toUpperCase() &&
          allowedClasses.includes(e.className.trim().toUpperCase()) &&
          e.status !== 'DROPPED'
      );

      if (!allowedClasses.includes(studentClass) && !isEnrolledInSession) {
        return {
          success: false,
          code: 'CLASS_MISMATCH',
          message: `Amaran: Pelajar ${student.name} dari kelas [${student.className}], bukan dalam senarai kelas sesi ini [${activeSession.className}].`,
          student,
          session: activeSession,
          timestamp: now
        };
      }
    }

    // 5. Duplicate Check: One student per class session
    const isAlreadyRecorded = this.attendanceRecords.some(
      (r) => r.sessionId === activeSession!.id && r.studentId === student.id && r.status === 'PRESENT'
    );

    if (isAlreadyRecorded) {
      const existingRecord = this.attendanceRecords.find(
        (r) => r.sessionId === activeSession!.id && r.studentId === student.id
      );
      return {
        success: false,
        code: 'ALREADY_RECORDED',
        isDuplicate: true,
        message: `Kehadiran ${student.name} telah direkodkan sebelum ini.`,
        student,
        session: activeSession,
        timestamp: now,
        record: existingRecord
      };
    }

    // 6. Create new Attendance Record
    const newRecord: AttendanceRecord = {
      id: `REC-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sessionId: activeSession.id,
      studentId: student.id,
      timestamp: now,
      status: 'PRESENT',
      method: method,
      subjectCode: activeSession.subjectCode,
      className: student.className
    };

    this.addAttendanceRecord(newRecord);

    return {
      success: true,
      code: 'RECORDED',
      message: `Kehadiran berjaya direkodkan: ${student.name} (${student.className})`,
      student,
      session: activeSession,
      timestamp: now,
      record: newRecord
    };
  }

  public parseStudentQR(rawString: string): string | null {
    if (!rawString) return null;
    const clean = rawString.trim();

    // Check for CLASSATTEND|PDA-2502-005 format
    if (clean.startsWith('CLASSATTEND|')) {
      const parts = clean.split('|');
      return parts[1]?.trim() || null;
    }

    // Check for STUDENT|PDA-2502-005 format
    if (clean.startsWith('STUDENT|')) {
      const parts = clean.split('|');
      return parts[1]?.trim() || null;
    }

    // Check for legacy STAFF|ST001 format
    if (clean.startsWith('STAFF|')) {
      const parts = clean.split('|');
      return parts[1]?.trim() || null;
    }

    // Check for JSON payload: { studentId: "PDA-2502-005" } or { id: "PDA-2502-005" }
    if (clean.startsWith('{') && clean.endsWith('}')) {
      try {
        const parsed = JSON.parse(clean);
        return parsed.studentId || parsed.id || parsed.noPelajar || null;
      } catch {
        // Not valid JSON
      }
    }

    // Direct PDA-2502-XXX format check
    if (/^[A-Za-z0-9\-_]{3,25}$/.test(clean)) {
      return clean;
    }

    return clean;
  }

  // --- CLASS ANALYTICS & REPORTING COMPUTATIONS ---
  public getSessionAttendanceSummary(sessionId: string) {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) return null;

    const sessionRecords = this.attendanceRecords.filter((r) => r.sessionId === sessionId);
    const presentStudentIds = new Set(sessionRecords.filter((r) => r.status === 'PRESENT').map((r) => r.studentId));

    let targetStudents = this.students;
    if (session.className && session.className !== 'ALL' && session.className !== 'SEMUA') {
      const allowedClasses = session.className.split(',').map((c) => c.trim().toUpperCase());
      targetStudents = this.students.filter((s) => allowedClasses.includes(s.className.trim().toUpperCase()));
    }

    const totalStudents = targetStudents.length;
    const presentCount = targetStudents.filter((s) => presentStudentIds.has(s.id)).length;
    const absentCount = Math.max(0, totalStudents - presentCount);
    const percentage = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

    return {
      session,
      totalStudents,
      presentCount,
      absentCount,
      percentage,
      records: sessionRecords
    };
  }

  public getStudentOverallSummary(studentId: string) {
    const student = this.getStudentById(studentId);
    if (!student) return null;

    // Find all sessions applicable to this student's class
    const applicableSessions = this.sessions.filter((session) => {
      if (session.status === 'ARCHIVED') return false;
      if (session.className && session.className !== 'ALL' && session.className !== 'SEMUA') {
        const allowed = session.className.split(',').map((c) => c.trim().toUpperCase());
        if (!allowed.includes(student.className.trim().toUpperCase())) return false;
      }
      return true;
    });

    const totalSessions = applicableSessions.length;
    const studentRecords = this.attendanceRecords.filter((r) => r.studentId === student.id && r.status === 'PRESENT');
    const presentCount = studentRecords.length;
    const absentCount = Math.max(0, totalSessions - presentCount);
    const percentage = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

    // Breakdown by subject
    const subjectBreakdown: Record<string, { total: number; present: number; percentage: number }> = {};

    applicableSessions.forEach((session) => {
      const subjKey = session.subjectCode || session.subjectName || 'AM';
      
      if (!subjectBreakdown[subjKey]) {
        subjectBreakdown[subjKey] = { total: 0, present: 0, percentage: 0 };
      }
      subjectBreakdown[subjKey].total += 1;

      const attended = studentRecords.some((r) => r.sessionId === session.id);
      if (attended) {
        subjectBreakdown[subjKey].present += 1;
      }
    });

    Object.keys(subjectBreakdown).forEach((key) => {
      const item = subjectBreakdown[key];
      item.percentage = item.total > 0 ? Math.round((item.present / item.total) * 100) : 0;
    });

    // Recent records
    const recentRecords = studentRecords.slice(0, 10).map((record) => {
      const session = this.sessions.find((s) => s.id === record.sessionId)!;
      return { record, session };
    });

    return {
      student,
      totalSessions,
      presentCount,
      absentCount,
      percentage,
      subjectBreakdown,
      recentRecords
    };
  }

  // --- Backward compatibility aliases ---
  public subscribeActivities(callback: (activities: any[]) => void) {
    return this.subscribeSessions(callback);
  }
  public getActivities() {
    return this.getSessions();
  }
  public addActivity(activity: any) {
    return this.addSession(activity);
  }
  public deleteActivity(id: string) {
    return this.deleteSession(id);
  }
  public subscribeStaff(callback: (staff: Student[]) => void) {
    return this.subscribeStudents(callback);
  }
  public subscribeEvents(callback: (events: AttendanceSession[]) => void) {
    return this.subscribeSessions(callback);
  }
  public getStaffList() {
    return this.getStudents();
  }
  public getEvents() {
    return this.getSessions();
  }
  public saveStaffList(staff: Student[]) {
    this.saveStudentsList(staff);
  }
  public saveEvents(events: AttendanceSession[]) {
    this.saveSessions(events);
  }
  public setEventStatus(eventId: string, newStatus: EventStatus) {
    return this.setSessionStatus(eventId, newStatus);
  }
  public deleteStaff(staffId: string) {
    this.deleteStudent(staffId);
  }
}

export const attendanceEngine = new AttendanceEngine();

