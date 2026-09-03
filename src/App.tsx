import React, { useState, useEffect } from 'react';
import {
  ActiveTab,
  Student,
  Subject,
  Lecturer,
  AttendanceActivity,
  AttendanceSession,
  AttendanceRecord,
  EventStatus,
  ScanResult,
  AttendanceMethod,
  UserRole,
  Enrollment,
  EnrollmentContext,
  TeachingAssignment
} from './types';
import { attendanceEngine } from './services/attendanceEngine';
import { soundService } from './services/soundService';

import { Header } from './components/Header';
import { SidebarNav } from './components/SidebarNav';
import { DashboardView } from './components/DashboardView';
import { AdminControlCenterView } from './components/AdminControlCenterView';
import { LecturerWorkspaceView } from './components/LecturerWorkspaceView';
import { FirstTimeLecturerModal } from './components/FirstTimeLecturerModal';
import { ScannerView } from './components/ScannerView';
import { EventManagementView } from './components/EventManagementView';
import { StaffDirectoryView } from './components/StaffDirectoryView';
import { MyAttendanceView } from './components/MyAttendanceView';
import { ReportsView } from './components/ReportsView';
import { ConceptGuideView } from './components/ConceptGuideView';
import { SupportInnovationView } from './components/SupportInnovationView';
import { Footer } from './components/Footer';
import { AdminPinModal } from './components/AdminPinModal';
import { CSVImportModal } from './components/CSVImportModal';
import { PWAInstallModal } from './components/PWAInstallModal';
import { StudentSelfRegistrationModal } from './components/StudentSelfRegistrationModal';
import { LecturerSelfRegistrationModal } from './components/LecturerSelfRegistrationModal';
import { StudentCheckinModal, StudentCheckinContext } from './components/StudentCheckinModal';
import { StudentQrPortalView } from './components/StudentQrPortalView';
import { accessManager } from './services/accessManager';
import { auditLogger } from './services/auditLogger';

export default function App() {
  const checkIsQrRoute = (): boolean => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    return (
      path === '/qr' ||
      path === '/qr/' ||
      path.startsWith('/qr') ||
      hash === '#qr' ||
      hash === '#/qr' ||
      hash.startsWith('#qr') ||
      hash.startsWith('#/qr')
    );
  };

  const [isQrRoute, setIsQrRoute] = useState<boolean>(checkIsQrRoute);

  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#support') {
      return 'support';
    }
    return 'dashboard';
  });
  
  // Access Management & Roles
  const [accessState, setAccessState] = useState(() => accessManager.getAccessState());
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    const acc = accessManager.getAccessState();
    return acc.session ? acc.role : 'STUDENT';
  });
  const [isFirstTimeLecturerModalOpen, setIsFirstTimeLecturerModalOpen] = useState<boolean>(false);

  // Real-time state from Attendance Engine
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [teachingAssignments, setTeachingAssignments] = useState<TeachingAssignment[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [activeLecturer, setActiveLecturer] = useState<Lecturer | null>(() => {
    const acc = accessManager.getAccessState();
    return acc.session ? (acc.lecturer || attendanceEngine.getActiveLecturer()) : null;
  });
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Student Check-In Modal & Context (From QR Scan / Link / Hash)
  const [isStudentCheckinOpen, setIsStudentCheckinOpen] = useState<boolean>(false);
  const [studentCheckinContext, setStudentCheckinContext] = useState<StudentCheckinContext | null>(null);

  // Student Self Registration Modal & Context
  const [isSelfRegistrationOpen, setIsSelfRegistrationOpen] = useState<boolean>(false);
  const [selfRegistrationContext, setSelfRegistrationContext] = useState<EnrollmentContext | null>(null);

  // Lecturer Self Registration Modal (From QR / Link)
  const [isLecturerSelfRegOpen, setIsLecturerSelfRegOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.location.hash.startsWith('#lecturer-register')) {
      return true;
    }
    return false;
  });

  // Helper to parse URL hash (#enroll, #attend, #lecturer-register, #support)
  const parseHashRouting = () => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (hash.startsWith('#enroll')) {
      const queryString = hash.includes('?') ? hash.substring(hash.indexOf('?') + 1) : '';
      const params = new URLSearchParams(queryString);
      const subjectCode = params.get('subject') || 'MPU 2163';
      const subjectName = params.get('subjectName') || 'Pengajian Malaysia 2';
      const className = params.get('class') || 'DIA_4A';
      const lecturerName = params.get('lecturer') || undefined;
      const lecturerEmail = params.get('lecturerEmail') || undefined;

      setSelfRegistrationContext({
        subjectCode,
        subjectName,
        className,
        lecturerName,
        lecturerEmail
      });
      setIsSelfRegistrationOpen(true);
    } else if (hash.startsWith('#lecturer-register')) {
      setIsLecturerSelfRegOpen(true);
    } else if (hash.startsWith('#attend')) {
      const queryString = hash.includes('?') ? hash.substring(hash.indexOf('?') + 1) : '';
      const params = new URLSearchParams(queryString);
      const sessionId = params.get('session') || '';
      const subjectCode = params.get('subject') || '';
      const subjectName = params.get('subjectName') || undefined;
      const className = params.get('class') || 'DIA_4A';
      const lecturerName = params.get('lecturer') || undefined;
      const date = params.get('date') || undefined;

      setStudentCheckinContext({
        sessionId,
        subjectCode,
        subjectName,
        className,
        lecturerName,
        date
      });
      setIsStudentCheckinOpen(true);
    } else if (hash === '#support') {
      setActiveTab('support');
    }
  };

  useEffect(() => {
    parseHashRouting();
  }, []);

  // Admin Mode & Modal States
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    const acc = accessManager.getAccessState();
    return Boolean(acc.session && acc.role === 'ADMIN');
  });
  const [isAdminPinModalOpen, setIsAdminPinModalOpen] = useState<boolean>(false);
  const [adminActionTitle, setAdminActionTitle] = useState<string>('Pengesahan Identiti');
  const [isCSVModalOpen, setIsCSVModalOpen] = useState<boolean>(false);
  const [csvImportInitialMode, setCsvImportInitialMode] = useState<'STUDENT' | 'LECTURER'>('STUDENT');

  // PWA Installation state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPWAInstallModalOpen, setIsPWAInstallModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsPWAInstallModalOpen(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    const handleLocationChange = () => {
      setIsQrRoute(checkIsQrRoute());
      parseHashRouting();
    };

    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // Subscribe to real-time engine changes
  useEffect(() => {
    const unsubStudents = attendanceEngine.subscribeStudents((data) => setStudents(data));
    const unsubSubjects = attendanceEngine.subscribeSubjects((data) => setSubjects(data));
    const unsubLecturers = attendanceEngine.subscribeLecturers((data) => setLecturers(data));
    const unsubAssignments = attendanceEngine.subscribeTeachingAssignments((data) => setTeachingAssignments(data));
    const unsubEnrollments = attendanceEngine.subscribeEnrollments((data) => setEnrollments(data));
    const unsubSessions = attendanceEngine.subscribeSessions((data) => setSessions(data));
    const unsubRecords = attendanceEngine.subscribeRecords((data) => setAttendanceRecords(data));

    // Update active lecturer and permissions from access manager and engine
    const acc = accessManager.getAccessState();
    if (acc.session) {
      const currentActive = attendanceEngine.getActiveLecturer() || acc.lecturer;
      setActiveLecturer(currentActive);
      setIsAdmin(acc.role === 'ADMIN');
      setCurrentRole(acc.role);
    } else {
      setActiveLecturer(null);
      setIsAdmin(false);
      setCurrentRole('STUDENT');
    }

    return () => {
      unsubStudents();
      unsubSubjects();
      unsubLecturers();
      unsubAssignments();
      unsubEnrollments();
      unsubSessions();
      unsubRecords();
    };
  }, []);

  const activeSession = sessions.find((s) => s.status === 'OPEN') || null;

  // Toggle Admin / Lecturer Auth Mode
  const handleToggleAdminMode = () => {
    if (isAdmin || activeLecturer) {
      setAdminActionTitle('Pengesahan Identiti');
      setIsAdminPinModalOpen(true);
    } else {
      setAdminActionTitle('Pengesahan Identiti');
      setIsAdminPinModalOpen(true);
    }
  };

  // Logout Lecturer / Switch to Regular User Mode
  const handleLogoutLecturer = () => {
    attendanceEngine.logoutLecturer();
    accessManager.clearTrustedAccess();
    setAccessState(accessManager.getAccessState());
    setActiveLecturer(null);
    setIsAdmin(false);
    setCurrentRole('STUDENT');
    soundService.playClick();
  };

  // Approve Pending Lecturer Registration
  const handleApproveLecturer = async (lecturerId: string) => {
    const targetLec = lecturers.find((l) => l.id === lecturerId);
    const result = await attendanceEngine.approveLecturer(lecturerId, activeLecturer?.name || 'Pentadbir Utama');
    if (result.success) {
      setLecturers(attendanceEngine.getLecturers());
      setTeachingAssignments(attendanceEngine.getTeachingAssignments());
      soundService.playSuccess();
      auditLogger.log({
        category: 'LECTURER_STATUS',
        action: 'Kelulusan Pendaftaran Pensyarah',
        details: `Permohonan pendaftaran pensyarah ${targetLec?.name || lecturerId} (${targetLec?.email || ''}) telah diluluskan dan diaktifkan.`,
        performedBy: activeLecturer?.name || 'Pentadbir Utama',
        target: targetLec?.name || lecturerId,
        severity: 'SUCCESS'
      });
    }
  };

  // Reject Pending Lecturer Registration
  const handleRejectLecturer = async (lecturerId: string) => {
    const targetLec = lecturers.find((l) => l.id === lecturerId);
    const result = await attendanceEngine.rejectLecturer(lecturerId, activeLecturer?.name || 'Pentadbir Utama');
    if (result.success) {
      setLecturers(attendanceEngine.getLecturers());
      setTeachingAssignments(attendanceEngine.getTeachingAssignments());
      soundService.playClick();
      auditLogger.log({
        category: 'LECTURER_STATUS',
        action: 'Penolakan Pendaftaran Pensyarah',
        details: `Permohonan pendaftaran pensyarah ${targetLec?.name || lecturerId} (${targetLec?.email || ''}) telah ditolak.`,
        performedBy: activeLecturer?.name || 'Pentadbir Utama',
        target: targetLec?.name || lecturerId,
        severity: 'WARNING'
      });
    }
  };

  // Request Admin Access with Context
  const handleRequestAdminAccess = (actionName?: string) => {
    if (!isAdmin || !activeLecturer) {
      setAdminActionTitle(actionName ? `Akses Diperlukan: ${actionName}` : 'Pengesahan Pensyarah Diperlukan');
      setIsAdminPinModalOpen(true);
    }
  };

  // Session Status Change (OPEN / CLOSED / ARCHIVED)
  const handleSetSessionStatus = (sessionId: string, newStatus: EventStatus) => {
    const session = sessions.find((s) => s.id === sessionId);
    const updated = attendanceEngine.setSessionStatus(sessionId, newStatus);
    setSessions(updated);
    if (newStatus === 'CLOSED') {
      soundService.playClick();
    }
    auditLogger.log({
      category: 'SESSION_MGMT',
      action: `Perubahan Status Sesi (${newStatus})`,
      details: `Status sesi "${session?.sessionName || sessionId}" (${session?.subjectCode || ''} - ${session?.className || ''}) ditukar kepada ${newStatus}.`,
      performedBy: activeLecturer?.name || 'Pentadbir Sistem',
      target: session?.sessionName || sessionId,
      severity: newStatus === 'CLOSED' ? 'INFO' : 'SUCCESS'
    });
  };

  // Delete Session
  const handleDeleteSession = (sessionId: string) => {
    const sessionToDelete = sessions.find((s) => s.id === sessionId);
    const updated = attendanceEngine.deleteSession(sessionId);
    setSessions(updated);
    soundService.playClick();
    auditLogger.log({
      category: 'SESSION_MGMT',
      action: 'Pemadaman Sesi Kuliah',
      details: `Sesi "${sessionToDelete?.sessionName || sessionId}" bagi subjek ${sessionToDelete?.subjectCode || ''} (${sessionToDelete?.className || ''}) telah dipadamkan secara kekal.`,
      performedBy: activeLecturer?.name || 'Pentadbir Sistem',
      target: sessionToDelete?.sessionName || sessionId,
      severity: 'WARNING'
    });
  };

  // Create Subject
  const handleCreateSubject = (newSubject: Subject) => {
    attendanceEngine.addSubject(newSubject);
    setSubjects(attendanceEngine.getSubjects());
    soundService.playSuccess();
    auditLogger.log({
      category: 'MASTER_DATA',
      action: 'Penambahan Subjek Kursus',
      details: `Subjek baharu ${newSubject.code} - ${newSubject.name} (${newSubject.sections?.join(', ') || 'Semua Seksyen'}) berjaya didaftarkan.`,
      performedBy: activeLecturer?.name || 'Pentadbir Sistem',
      target: newSubject.code,
      severity: 'SUCCESS'
    });
  };


  // Delete Subject
  const handleDeleteSubject = (subjectId: string) => {
    const subjectToDelete = subjects.find((s) => s.id === subjectId || s.code === subjectId);
    attendanceEngine.deleteSubject(subjectId);
    setSubjects(attendanceEngine.getSubjects());
    soundService.playClick();
    auditLogger.log({
      category: 'MASTER_DATA',
      action: 'Pemadaman Subjek Kursus',
      details: `Subjek ${subjectToDelete?.code || subjectId} - ${subjectToDelete?.name || ''} telah dipadamkan daripada kurikulum.`,
      performedBy: activeLecturer?.name || 'Pentadbir Sistem',
      target: subjectToDelete?.code || subjectId,
      severity: 'WARNING'
    });
  };

  // Create Session
  const handleCreateSession = (session: AttendanceSession) => {
    const updated = attendanceEngine.addSession(session);
    setSessions(updated);
    soundService.playSuccess();
    auditLogger.log({
      category: 'SESSION_MGMT',
      action: 'Pembukaan Sesi Kuliah Baharu',
      details: `Sesi kuliah "${session.sessionName}" bagi subjek ${session.subjectCode} (${session.className}) berjaya dibuka oleh ${session.lecturerName || 'Pensyarah'}.`,
      performedBy: activeLecturer?.name || session.lecturerName || 'Pensyarah KPM',
      target: session.sessionName,
      severity: 'SUCCESS'
    });
  };

  // Sprint 9: Seamless Start Attendance Session for Class
  const handleStartSessionForClass = (subjectCode: string, subjectName: string, className: string) => {
    // 1. Check if there's already an existing OPEN session for this subject and class
    const existingOpen = sessions.find(
      (s) =>
        s.status === 'OPEN' &&
        s.subjectCode?.toUpperCase() === subjectCode.toUpperCase() &&
        (s.className?.toUpperCase() === className.toUpperCase() || s.className === 'ALL')
    );

    if (existingOpen) {
      handleTabChange('scanner');
      soundService.playSuccess();
      return;
    }

    // 2. Check if there is an existing session today for this subject & class, reopen it
    const todayStr = new Date().toISOString().split('T')[0];
    const existingToday = sessions.find(
      (s) =>
        s.date === todayStr &&
        s.subjectCode?.toUpperCase() === subjectCode.toUpperCase() &&
        s.className?.toUpperCase() === className.toUpperCase()
    );

    if (existingToday) {
      handleSetSessionStatus(existingToday.id, 'OPEN');
      handleTabChange('scanner');
      soundService.playSuccess();
      return;
    }

    // 3. Otherwise create a fresh new session
    const newSession: AttendanceSession = {
      id: `SESS-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sessionName: `Kuliah ${subjectCode} - ${className}`,
      subjectCode: subjectCode,
      subjectName: subjectName,
      className: className,
      date: todayStr,
      startTime: new Date().toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' }),
      endTime: '23:59',
      status: 'OPEN',
      attendanceMethod: 'QR',
      location: 'Bilik Kuliah / Dewan',
      lecturerName: activeLecturer?.name || 'PENSYARAH KPM',
      lecturerEmail: activeLecturer?.email || 'pensyarah@bpenawar.kpm.edu.my',
      category: 'CLASS'
    };

    const updatedSessions = attendanceEngine.addSession(newSession);
    setSessions(updatedSessions);
    handleTabChange('scanner');
    soundService.playSuccess();
    auditLogger.log({
      category: 'SESSION_MGMT',
      action: 'Pelancaran Sesi Pantas Kelas',
      details: `Sesi kehadiran "${newSession.sessionName}" dilancarkan untuk kelas ${className}.`,
      performedBy: activeLecturer?.name || 'Pensyarah KPM',
      target: newSession.sessionName,
      severity: 'SUCCESS'
    });
  };

  // Process Scan
  const handleProcessScan = (
    qrString: string,
    method: AttendanceMethod = 'CAMERA_SCAN',
    targetSessionId?: string
  ): ScanResult => {
    const result = attendanceEngine.processScan(qrString, method, targetSessionId);
    setAttendanceRecords(attendanceEngine.getAttendanceRecords());
    return result;
  };

  // Quick Simulator Scan
  const handleQuickSimulateScan = (studentId: string): ScanResult => {
    return handleProcessScan(`STUDENT|${studentId}`, 'SIMULATOR');
  };

  // Add Single Student
  const handleAddStudent = (newStudent: Student) => {
    attendanceEngine.addStudent(newStudent);
    setStudents(attendanceEngine.getStudents());
    auditLogger.log({
      category: 'STUDENT_MGMT',
      action: 'Pendaftaran Pelajar Individu',
      details: `Pelajar ${newStudent.name} (${newStudent.studentId || newStudent.id}) telah didaftarkan ke dalam kelas ${newStudent.className}.`,
      performedBy: activeLecturer?.name || 'Pentadbir Sistem',
      target: newStudent.name,
      severity: 'SUCCESS'
    });
  };

  // Delete Student
  const handleDeleteStudent = (studentId: string) => {
    const studentToDelete = students.find((s) => s.id === studentId || s.studentId === studentId);
    attendanceEngine.deleteStudent(studentId);
    setStudents(attendanceEngine.getStudents());
    auditLogger.log({
      category: 'STUDENT_MGMT',
      action: 'Pemadaman Rekod Pelajar',
      details: `Rekod pelajar ${studentToDelete?.name || studentId} (${studentToDelete?.studentId || studentId}) telah dipadamkan.`,
      performedBy: activeLecturer?.name || 'Pentadbir Sistem',
      target: studentToDelete?.name || studentId,
      severity: 'WARNING'
    });
  };

  // Import CSV Students
  const handleImportStudents = async (newStudentsList: Student[], replaceAll: boolean = true) => {
    let finalList: Student[] = [];

    if (replaceAll) {
      finalList = newStudentsList;
    } else {
      const existingMap = new Map<string, Student>(students.map((s) => [s.id, s]));
      newStudentsList.forEach((s) => existingMap.set(s.id, s));
      finalList = Array.from(existingMap.values());
    }

    await attendanceEngine.saveStudentsList(finalList, replaceAll);
    setStudents(attendanceEngine.getStudents());
    soundService.playSuccess();
    auditLogger.log({
      category: 'CSV_IMPORT',
      action: replaceAll ? 'Import Pelajar CSV (Ganti Semua)' : 'Import Pelajar CSV (Gabung Rekod)',
      details: `Berjaya memproses ${newStudentsList.length} rekod pelajar melalui import fail CSV. Jumlah pelajar terkini: ${finalList.length}. Mod: ${replaceAll ? 'Ganti Keseluruhan' : 'Gabung / Tambah'}.`,
      performedBy: activeLecturer?.name || 'Pentadbir Sistem',
      target: `${newStudentsList.length} Rekod Pelajar`,
      severity: 'SUCCESS'
    });
  };

  // Import CSV Lecturers
  const handleImportLecturers = (newLecturersList: Lecturer[]) => {
    const existingMap = new Map<string, Lecturer>(lecturers.map((l) => [l.email.toLowerCase(), l]));
    newLecturersList.forEach((l) => existingMap.set(l.email.toLowerCase(), l));
    const merged = Array.from(existingMap.values());

    attendanceEngine.saveLecturersList(merged);
    setLecturers(merged);
    soundService.playSuccess();
    auditLogger.log({
      category: 'CSV_IMPORT',
      action: 'Import Direktori Pensyarah (CSV)',
      details: `Berjaya memuat naik ${newLecturersList.length} rekod pensyarah daripada fail CSV. Jumlah pensyarah terkini: ${merged.length}.`,
      performedBy: activeLecturer?.name || 'Pentadbir Sistem',
      target: `${newLecturersList.length} Rekod Pensyarah`,
      severity: 'SUCCESS'
    });
  };

  // Import CSV Subjects
  const handleImportSubjects = (newSubjectsList: Subject[], replaceAll: boolean = false) => {
    let finalList: Subject[] = [];
    if (replaceAll) {
      finalList = newSubjectsList;
    } else {
      const existingMap = new Map<string, Subject>(subjects.map((s) => [s.code.toUpperCase(), s]));
      newSubjectsList.forEach((s) => existingMap.set(s.code.toUpperCase(), s));
      finalList = Array.from(existingMap.values());
    }

    attendanceEngine.saveSubjectsList(finalList);
    setSubjects(attendanceEngine.getSubjects());
    soundService.playSuccess();
    auditLogger.log({
      category: 'CSV_IMPORT',
      action: replaceAll ? 'Import Senarai Kursus CSV (Ganti Semua)' : 'Import Senarai Kursus CSV (Gabung Rekod)',
      details: `Berjaya memproses ${newSubjectsList.length} kursus melalui fail CSV. Jumlah kursus tersenarai: ${finalList.length}.`,
      performedBy: activeLecturer?.name || 'Pentadbir Sistem',
      target: `${newSubjectsList.length} Rekod Kursus`,
      severity: 'SUCCESS'
    });
  };

  // Reset Subjects to default 46 KPM subjects
  const handleResetSubjects = () => {
    attendanceEngine.resetSubjectsToDefault();
    setSubjects(attendanceEngine.getSubjects());
    soundService.playSuccess();
    auditLogger.log({
      category: 'MASTER_DATA',
      action: 'Reset Senarai Kursus KPM',
      details: 'Senarai subjek telah diset semula kepada 46 kursus rasmi KPM.',
      performedBy: activeLecturer?.name || 'Pentadbir Sistem',
      target: 'Senarai 46 Kursus KPM',
      severity: 'INFO'
    });
  };

  // Add Single Lecturer
  const handleAddLecturer = (newLecturer: Lecturer) => {
    const updated = [...lecturers.filter((l) => l.email.toLowerCase() !== newLecturer.email.toLowerCase()), newLecturer];
    attendanceEngine.saveLecturersList(updated);
    setLecturers(updated);
    auditLogger.log({
      category: 'LECTURER_STATUS',
      action: 'Penambahan Pensyarah Baharu',
      details: `Pensyarah ${newLecturer.name} (${newLecturer.email}) telah ditambah dengan status ${newLecturer.status || 'ACTIVE'}.`,
      performedBy: activeLecturer?.name || 'Pentadbir Sistem',
      target: newLecturer.name,
      severity: 'SUCCESS'
    });
  };

  // Delete Lecturer
  const handleDeleteLecturer = (lecturerId: string) => {
    const targetLec = lecturers.find((l) => l.id === lecturerId);
    attendanceEngine.deleteLecturer(lecturerId);
    setLecturers(attendanceEngine.getLecturers());
    auditLogger.log({
      category: 'LECTURER_STATUS',
      action: 'Pemadaman Akaun Pensyarah',
      details: `Akaun pensyarah ${targetLec?.name || lecturerId} (${targetLec?.email || ''}) telah dipadamkan.`,
      performedBy: activeLecturer?.name || 'Pentadbir Sistem',
      target: targetLec?.name || lecturerId,
      severity: 'WARNING'
    });
  };

  // Select/Activate Lecturer
  const handleSelectActiveLecturer = (lec: Lecturer) => {
    attendanceEngine.setActiveLecturer(lec);
    setActiveLecturer(lec);
    setIsAdmin(true);
    soundService.playSuccess();
    auditLogger.log({
      category: 'SECURITY_AUTH',
      action: 'Sesi Aktif Pensyarah Ditukar',
      details: `Sesi kerja aktif kini ditetapkan kepada ${lec.name} (${lec.department || 'KPM'}).`,
      performedBy: lec.name,
      target: lec.email,
      severity: 'INFO'
    });
  };

  // Reset Data to Default 95 Students
  const handleResetData = () => {
    if (window.confirm('Adakah anda pasti untuk mengeset semula data kepada Master 95 Pelajar asal?')) {
      attendanceEngine.resetToDefaultData();
      setStudents(attendanceEngine.getStudents());
      setSubjects(attendanceEngine.getSubjects());
      setLecturers(attendanceEngine.getLecturers());
      setSessions(attendanceEngine.getSessions());
      setAttendanceRecords(attendanceEngine.getAttendanceRecords());
      setActiveLecturer(attendanceEngine.getActiveLecturer());
      soundService.playSuccess();
      auditLogger.log({
        category: 'MASTER_DATA',
        action: 'Reset Data Penuh Sistem',
        details: 'Semua rekod pangkalan data telah diset semula kepada data master lalai (95 pelajar DIA dan kurikulum KPM).',
        performedBy: activeLecturer?.name || 'Pentadbir Sistem',
        target: 'Pangkalan Data Kolej',
        severity: 'CRITICAL'
      });
    }
  };


  // Open Support Innovation Page (#support)
  const handleOpenSupport = () => {
    try {
      window.location.hash = 'support';
    } catch (e) {}
    setActiveTab('support');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Return to Main Platform
  const handleReturnToPlatform = () => {
    try {
      if (window.location.hash === '#support') {
        history.pushState('', document.title, window.location.pathname + window.location.search);
      }
    } catch (e) {}
    setActiveTab('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTabChange = (tab: ActiveTab) => {
    if (tab !== 'support' && window.location.hash === '#support') {
      try {
        history.pushState('', document.title, window.location.pathname + window.location.search);
      } catch (e) {}
    }
    setActiveTab(tab);
  };

  const handleOpenQrPortal = () => {
    try {
      window.history.pushState(null, '', '/qr');
    } catch {
      window.location.hash = '#qr';
    }
    setIsQrRoute(true);
  };

  const handleReturnFromQr = () => {
    try {
      window.history.pushState(null, '', '/');
    } catch {
      window.location.hash = '';
    }
    setIsQrRoute(false);
    setActiveTab('dashboard');
  };

  if (isQrRoute) {
    return (
      <StudentQrPortalView
        students={students}
        onReturnToMain={handleReturnFromQr}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* App Header */}
      <Header
        activeSession={activeSession}
        activeLecturer={activeLecturer}
        soundEnabled={soundEnabled}
        isAdmin={isAdmin}
        currentRole={currentRole}
        onGoHome={handleReturnToPlatform}
        onRoleChange={(role) => setCurrentRole(role)}
        onToggleSound={(enabled) => setSoundEnabled(enabled)}
        onOpenScanner={() => handleTabChange('scanner')}
        onToggleAdminMode={handleToggleAdminMode}
        onLogoutLecturer={handleLogoutLecturer}
      />

      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row">
        {/* Sidebar Nav */}
        <SidebarNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          activeSessionName={activeSession?.sessionName}
          totalRecordsCount={attendanceRecords.length}
          totalStudentsCount={students.length}
          currentRole={currentRole}
          onOpenPWAInstall={() => setIsPWAInstallModalOpen(true)}
          onOpenQrPortal={handleOpenQrPortal}
        />

        {/* Main Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            currentRole === 'ADMIN' && (isAdmin || activeLecturer?.role === 'ADMIN') ? (
              <AdminControlCenterView
                subjects={subjects}
                sessions={sessions}
                students={students}
                lecturers={lecturers}
                attendanceRecords={attendanceRecords}
                teachingAssignments={teachingAssignments}
                activeSession={activeSession}
                onOpenScanner={() => handleTabChange('scanner')}
                onGoToActivities={() => handleTabChange('activities')}
                onGoToStudents={() => handleTabChange('students')}
                onGoToReports={() => handleTabChange('reports')}
                onCloseActiveSession={(id) => handleSetSessionStatus(id, 'CLOSED')}
                onQuickSimulateScan={handleQuickSimulateScan}
                onApproveLecturer={handleApproveLecturer}
                onRejectLecturer={handleRejectLecturer}
                onOpenLecturerRegistration={() => setIsLecturerSelfRegOpen(true)}
              />
            ) : currentRole === 'LECTURER' && activeLecturer ? (
              <LecturerWorkspaceView
                activeLecturer={activeLecturer}
                subjects={subjects}
                sessions={sessions}
                students={students}
                attendanceRecords={attendanceRecords}
                teachingAssignments={teachingAssignments}
                onOpenScanner={() => handleTabChange('scanner')}
                onGoToActivities={() => handleTabChange('activities')}
                onGoToStudents={() => handleTabChange('students')}
                onGoToReports={() => handleTabChange('reports')}
                onCloseActiveSession={(id) => handleSetSessionStatus(id, 'CLOSED')}
                onQuickSimulateScan={handleQuickSimulateScan}
                onCreateSession={handleCreateSession}
                onStartSessionForClass={handleStartSessionForClass}
                onSwitchToAdminMode={handleToggleAdminMode}
              />
            ) : (
              <DashboardView
                activeSession={activeSession}
                subjects={subjects}
                sessions={sessions}
                students={students}
                attendanceRecords={attendanceRecords}
                lecturers={lecturers}
                activeLecturer={activeLecturer}
                onOpenScanner={() => handleTabChange('scanner')}
                onGoToActivities={() => handleTabChange('activities')}
                onGoToStudents={() => handleTabChange('students')}
                onGoToReports={() => handleTabChange('reports')}
                onCloseActiveSession={(id) => handleSetSessionStatus(id, 'CLOSED')}
                onQuickSimulateScan={handleQuickSimulateScan}
              />
            )
          )}

          {activeTab === 'scanner' && (
            <ScannerView
              activeSession={activeSession}
              allSessions={sessions}
              students={students}
              attendanceRecords={attendanceRecords}
              isAdmin={isAdmin}
              onRequestAdminAccess={handleRequestAdminAccess}
              onProcessScan={handleProcessScan}
              onGoToActivities={() => handleTabChange('activities')}
              onCloseSession={(sessionId) => handleSetSessionStatus(sessionId, 'CLOSED')}
              onGoToLecturerWorkspace={() => handleTabChange('dashboard')}
              onGoToReports={() => handleTabChange('reports')}
              soundEnabled={soundEnabled}
              onToggleSound={(enabled) => setSoundEnabled(enabled)}
            />
          )}

          {(activeTab === 'activities' || activeTab === 'classes') && (
            <EventManagementView
              subjects={subjects}
              sessions={sessions}
              attendanceRecords={attendanceRecords}
              students={students}
              lecturers={lecturers}
              enrollments={enrollments}
              teachingAssignments={teachingAssignments}
              activeLecturer={activeLecturer}
              isAdmin={isAdmin}
              onSetSessionStatus={handleSetSessionStatus}
              onCreateSubject={handleCreateSubject}
              onCreateSession={handleCreateSession}
              onDeleteSession={handleDeleteSession}
              onDeleteSubject={handleDeleteSubject}
              onOpenScannerForSession={(sessionId) => {
                handleSetSessionStatus(sessionId, 'OPEN');
                handleTabChange('scanner');
              }}
              onRequestAdminAccess={handleRequestAdminAccess}
              onOpenCSVImport={() => setIsCSVModalOpen(true)}
              onNavigateToStudents={() => handleTabChange('students')}
              onOpenSelfRegistrationTest={(ctx) => {
                setSelfRegistrationContext(ctx);
                setIsSelfRegistrationOpen(true);
              }}
            />
          )}

          {activeTab === 'students' && (
            <StaffDirectoryView
              students={students}
              sessions={sessions}
              subjects={subjects}
              lecturers={lecturers}
              teachingAssignments={teachingAssignments}
              activeLecturer={activeLecturer}
              attendanceRecords={attendanceRecords}
              isAdmin={isAdmin}
              onAddStudent={handleAddStudent}
              onDeleteStudent={handleDeleteStudent}
              onAddLecturer={handleAddLecturer}
              onDeleteLecturer={handleDeleteLecturer}
              onAddSubject={handleCreateSubject}
              onDeleteSubject={handleDeleteSubject}
              onResetSubjects={handleResetSubjects}
              onSelectActiveLecturer={handleSelectActiveLecturer}
              onOpenCSVImport={() => {
                setCsvImportInitialMode('STUDENT');
                setIsCSVModalOpen(true);
              }}
              onOpenLecturerCSVImport={() => {
                setCsvImportInitialMode('LECTURER');
                setIsCSVModalOpen(true);
              }}
              onOpenSubjectCSVImport={() => {
                setCsvImportInitialMode('SUBJECT');
                setIsCSVModalOpen(true);
              }}
              onRequestAdminAccess={handleRequestAdminAccess}
              onQuickSimulateScan={handleQuickSimulateScan}
            />
          )}

          {activeTab === 'my-attendance' && (
            <MyAttendanceView
              students={students}
              sessions={sessions}
              subjects={subjects}
              attendanceRecords={attendanceRecords}
              onOpenStudentCheckin={(ctx) => {
                setStudentCheckinContext(ctx || null);
                setIsStudentCheckinOpen(true);
              }}
              onOpenQrPortal={handleOpenQrPortal}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              students={students}
              sessions={sessions}
              subjects={subjects}
              attendanceRecords={attendanceRecords}
              isAdmin={isAdmin}
              activeLecturer={activeLecturer}
              onRequestAdminAccess={handleRequestAdminAccess}
            />
          )}

          {activeTab === 'guide' && <ConceptGuideView />}

          {activeTab === 'support' && (
            <SupportInnovationView onReturnToPlatform={handleReturnToPlatform} />
          )}
        </main>
      </div>

      {/* Footer Support CTA & Developer Credit */}
      <Footer onOpenSupport={handleOpenSupport} />

      {/* Student Self-Check-in Modal (1-Tap & QR Attendance) */}
      <StudentCheckinModal
        isOpen={isStudentCheckinOpen}
        onClose={() => {
          setIsStudentCheckinOpen(false);
          setStudentCheckinContext(null);
          if (window.location.hash.startsWith('#attend')) {
            try {
              history.pushState('', document.title, window.location.pathname + window.location.search);
            } catch (e) {}
          }
        }}
        context={studentCheckinContext}
        sessions={sessions}
        students={students}
        attendanceRecords={attendanceRecords}
        onSuccess={(student, record) => {
          // Re-sync attendance records from engine
          setAttendanceRecords(attendanceEngine.getAttendanceRecords());
        }}
        onViewMyAttendance={(studentId) => {
          setIsStudentCheckinOpen(false);
          handleTabChange('my-attendance');
        }}
      />

      {/* Lecturer PIN / IC Verification Modal */}
      <AdminPinModal
        isOpen={isAdminPinModalOpen}
        onClose={() => setIsAdminPinModalOpen(false)}
        onSuccess={(lec, role) => {
          const effectiveRole = role || (lec?.role === 'ADMIN' ? 'ADMIN' : 'LECTURER');
          setIsAdmin(effectiveRole === 'ADMIN');
          const updatedAccess = accessManager.getAccessState();
          setAccessState(updatedAccess);
          setCurrentRole(effectiveRole);
          if (lec) {
            setActiveLecturer(lec);
            if (accessManager.isFirstTimeLecturer(lec.id)) {
              setIsFirstTimeLecturerModalOpen(true);
            }
          } else {
            setActiveLecturer(attendanceEngine.getActiveLecturer());
          }
        }}
        actionTitle={adminActionTitle}
        onOpenSelfRegistration={() => {
          setIsAdminPinModalOpen(false);
          setIsLecturerSelfRegOpen(true);
        }}
      />

      {/* First-Time Lecturer Onboarding & Subject Association Modal */}
      {activeLecturer && (
        <FirstTimeLecturerModal
          isOpen={isFirstTimeLecturerModalOpen}
          onClose={() => {
            setIsFirstTimeLecturerModalOpen(false);
            accessManager.markLecturerOnboarded(activeLecturer.id);
          }}
          lecturer={activeLecturer}
          teachingAssignments={teachingAssignments}
          subjects={subjects}
          onStartTeaching={() => {
            setIsFirstTimeLecturerModalOpen(false);
            accessManager.markLecturerOnboarded(activeLecturer.id);
            handleTabChange('activities');
          }}
        />
      )}

      {/* CSV Import Modal (Tri-mode: Students, Lecturers & Subjects) */}
      <CSVImportModal
        isOpen={isCSVModalOpen}
        onClose={() => setIsCSVModalOpen(false)}
        initialMode={csvImportInitialMode}
        onImport={handleImportStudents}
        onImportLecturers={handleImportLecturers}
        onImportSubjects={handleImportSubjects}
      />

      {/* PWA Install Modal */}
      <PWAInstallModal
        isOpen={isPWAInstallModalOpen}
        onClose={() => setIsPWAInstallModalOpen(false)}
        deferredPrompt={deferredPrompt}
        onInstalled={() => setDeferredPrompt(null)}
      />

      {/* Student Self-Registration Modal (Triggered by QR Scan or Direct Link) */}
      <StudentSelfRegistrationModal
        isOpen={isSelfRegistrationOpen}
        onClose={() => {
          setIsSelfRegistrationOpen(false);
          setSelfRegistrationContext(null);
          if (window.location.hash.startsWith('#enroll')) {
            try {
              history.pushState('', document.title, window.location.pathname + window.location.search);
            } catch (e) {}
          }
        }}
        context={selfRegistrationContext}
        onSuccess={(student, enrollment) => {
          // Re-sync local states
          setStudents(attendanceEngine.getStudents());
          setEnrollments(attendanceEngine.getEnrollments());
        }}
      />

      {/* Lecturer Self-Registration Modal (Triggered by Admin QR Scan or Direct Link) */}
      <LecturerSelfRegistrationModal
        isOpen={isLecturerSelfRegOpen}
        onClose={() => {
          setIsLecturerSelfRegOpen(false);
          if (window.location.hash.startsWith('#lecturer-register')) {
            try {
              history.pushState('', document.title, window.location.pathname + window.location.search);
            } catch (e) {}
          }
        }}
        subjects={subjects}
      />
    </div>
  );
}
