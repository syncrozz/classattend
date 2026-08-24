import {
  Student,
  AttendanceSession,
  AttendanceRecord,
  EventStatus,
  ScanResult,
  AttendanceMethod,
  Lecturer,
  Subject
} from '../types';
import {
  INITIAL_STUDENTS,
  INITIAL_LECTURERS,
  INITIAL_SUBJECTS,
  INITIAL_SESSIONS,
  INITIAL_ATTENDANCE_RECORDS
} from '../data/mockData';
import { db, sanitizeForFirestore } from './firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';

const STORAGE_KEYS = {
  STUDENTS: 'classattend_students_v5',
  LECTURERS: 'classattend_lecturers_v5',
  SUBJECTS: 'classattend_subjects_v5',
  SESSIONS: 'classattend_sessions_v5',
  RECORDS: 'classattend_records_v5',
  ACTIVE_LECTURER: 'classattend_active_lecturer_v5',
  INITIALIZED: 'classattend_initialized_v5'
};

const DUMMY_SESSION_IDS = ['SES-CLS-MPU2163-01', 'SES-CLS-ACC2103-01', 'SES-CLS-MGT2013-01', 'SES-CLS-TAX3013-01'];
const DUMMY_RECORD_PREFIXES = ['REC-MPU-', 'REC-ACC-', 'REC-TAX-'];
const DUMMY_SUBJECT_IDS = ['SUB-MPU2163', 'SUB-ACC2103', 'SUB-MGT2013', 'SUB-TAX3013'];
const DUMMY_LECTURER_IDS = ['LEC-KHAIRI', 'LEC-ROHANI', 'LEC-FAIZAL', 'LEC-IZZATI'];

class AttendanceEngine {
  private students: Student[] = [];
  private lecturers: Lecturer[] = [];
  private subjects: Subject[] = [];
  private sessions: AttendanceSession[] = [];
  private attendanceRecords: AttendanceRecord[] = [];
  private activeLecturer: Lecturer | null = null;

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
        const storedActiveLecturer = localStorage.getItem(STORAGE_KEYS.ACTIVE_LECTURER);

        if (storedStudents) {
          const parsed = JSON.parse(storedStudents);
          const existingIds = new Set(parsed.map((s: Student) => s.id));
          const missingStudents = INITIAL_STUDENTS.filter((s) => !existingIds.has(s.id));
          this.students = [...parsed, ...missingStudents];
        } else {
          this.students = INITIAL_STUDENTS;
        }
        this.lecturers = storedLecturers
          ? JSON.parse(storedLecturers).filter((l: Lecturer) => !DUMMY_LECTURER_IDS.includes(l.id))
          : [];
        this.subjects = storedSubjects ? JSON.parse(storedSubjects) : [];
        this.sessions = storedSessions ? JSON.parse(storedSessions) : [];
        this.attendanceRecords = storedRecords ? JSON.parse(storedRecords) : [];
        this.activeLecturer = storedActiveLecturer ? JSON.parse(storedActiveLecturer) : null;
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
    this.saveSessionsLocally();
    this.saveRecordsLocally();
    this.saveSubjectsLocally();
    this.saveLecturersLocally();

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
    this.lecturers = [];
    this.subjects = [];
    this.sessions = [];
    this.attendanceRecords = [];
    this.activeLecturer = null;

    this.saveStudentsLocally();
    this.saveLecturersLocally();
    this.saveSubjectsLocally();
    this.saveSessionsLocally();
    this.saveRecordsLocally();
    this.saveActiveLecturerLocally();
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');

    if (db) {
      this.syncInitialToFirestore();
    }
  }

  private async syncInitialToFirestore() {
    if (!db) return;
    try {
      const batch = writeBatch(db);
      
      for (const student of this.students) {
        batch.set(doc(db, 'students', student.id), sanitizeForFirestore(student), { merge: true });
      }
      for (const lecturer of this.lecturers) {
        batch.set(doc(db, 'lecturers', lecturer.id), sanitizeForFirestore(lecturer), { merge: true });
      }
      for (const subject of this.subjects) {
        batch.set(doc(db, 'subjects', subject.id), sanitizeForFirestore(subject), { merge: true });
      }
      for (const session of this.sessions) {
        batch.set(doc(db, 'sessions', session.id), sanitizeForFirestore(session), { merge: true });
      }
      for (const rec of this.attendanceRecords) {
        batch.set(doc(db, 'attendance_records', rec.id), sanitizeForFirestore(rec), { merge: true });
      }

      await batch.commit();
    } catch (e: any) {
      if (e?.code === 'unavailable' || e?.message?.includes('offline')) {
        console.info('[Firestore] ClassAttend operating in offline-first mode.');
      } else {
        console.warn('Firestore initial sync notice:', e?.message || e);
      }
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
          if (!snapshot.empty) {
            const data = snapshot.docs.map((docSnap) => docSnap.data() as Student);
            this.students = data;
            this.saveStudentsLocally();
            callback(this.students);
          } else {
            callback(this.students);
          }
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
          if (!snapshot.empty) {
            const data = snapshot.docs
              .map((docSnap) => docSnap.data() as Lecturer)
              .filter((lec) => !DUMMY_LECTURER_IDS.includes(lec.id));
            this.lecturers = data;
            this.saveLecturersLocally();
            callback(this.lecturers);
          } else {
            callback(this.lecturers);
          }
        },
        () => {
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
          if (!snapshot.empty) {
            const data = snapshot.docs
              .map((docSnap) => docSnap.data() as Subject)
              .filter((subj) => !DUMMY_SUBJECT_IDS.includes(subj.id));
            this.subjects = data;
            this.saveSubjectsLocally();
            callback(this.subjects);
          } else {
            callback(this.subjects);
          }
        },
        () => {
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
      callback(this.sessions);
      return () => {};
    }

    try {
      const q = collection(db, 'sessions');
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const data = snapshot.docs
              .map((docSnap) => docSnap.data() as AttendanceSession)
              .filter((sess) => !DUMMY_SESSION_IDS.includes(sess.id));
            this.sessions = data;
            this.saveSessionsLocally();
            callback(this.sessions);
          } else {
            callback(this.sessions);
          }
        },
        (error) => {
          console.warn('Firestore sessions sync error, using local data:', error);
          callback(this.sessions);
        }
      );
      return unsubscribe;
    } catch (e) {
      callback(this.sessions);
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
          if (!snapshot.empty) {
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
          } else {
            callback(this.attendanceRecords);
          }
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
    return [...this.sessions];
  }

  public getAttendanceRecords(): AttendanceRecord[] {
    return [...this.attendanceRecords];
  }

  public getActiveSession(): AttendanceSession | null {
    return this.sessions.find((s) => s.status === 'OPEN') || null;
  }

  public getAvailableClasses(): string[] {
    const classSet = new Set<string>();
    this.students.forEach((s) => {
      if (s.className) classSet.add(s.className);
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

  // --- Mutation Methods ---
  public saveStudentsList(students: Student[]) {
    this.students = students;
    this.saveStudentsLocally();

    if (db && students.length > 0) {
      try {
        const batch = writeBatch(db);
        students.forEach((student) => {
          batch.set(doc(db, 'students', student.id), sanitizeForFirestore(student), { merge: true });
        });
        batch.commit().catch((err) => {
          console.warn('Error batch-saving students list to Firestore:', err?.message || err);
        });
      } catch (err) {
        console.warn('Batch students write notice:', err);
      }
    }
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

  public addSubject(subject: Subject) {
    this.subjects = [subject, ...this.subjects.filter((s) => s.id !== subject.id)];
    this.saveSubjectsLocally();

    if (db) {
      setDoc(doc(db, 'subjects', subject.id), sanitizeForFirestore(subject), { merge: true }).catch(console.warn);
    }
  }

  public deleteSubject(subjectId: string) {
    this.subjects = this.subjects.filter((s) => s.id !== subjectId);
    this.saveSubjectsLocally();

    if (db) {
      deleteDoc(doc(db, 'subjects', subjectId)).catch(console.warn);
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
      
      if (!allowedClasses.includes(studentClass)) {
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

