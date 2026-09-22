import React, { useState, useMemo } from 'react';
import {
  Subject,
  AttendanceSession,
  Student,
  AttendanceRecord,
  TeachingAssignment,
  Enrollment,
  Lecturer
} from '../types';
import {
  QrCode,
  Users,
  CheckCircle2,
  Calendar,
  Clock,
  Sparkles,
  Search,
  BookOpen,
  GraduationCap,
  Play,
  Maximize2,
  Minimize2,
  X,
  AlertTriangle,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { attendanceEngine } from '../services/attendanceEngine';
import {
  normalizeClassCode
} from '../utils/classHelper';
import {
  filterAuthorizedSessions,
  calculateAttendanceMetrics,
  formatSafeEndTime,
  isLecturerAuthorizedForSession
} from '../utils/sessionAuth';
import { SessionDetailView } from './SessionDetailView';

interface LecturerWorkspaceViewProps {
  activeLecturer: Lecturer;
  isAdmin: boolean;
  subjects: Subject[];
  sessions: AttendanceSession[];
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  teachingAssignments: TeachingAssignment[];
  enrollments: Enrollment[];
  activeSession: AttendanceSession | null;
  onOpenScanner: () => void;
  onOpenScannerForSession: (sessionId: string) => void;
  onCreateSession: (session: AttendanceSession) => void;
  onSetSessionStatus: (sessionId: string, status: 'OPEN' | 'CLOSED' | 'ARCHIVED') => void;
  onCloseActiveSession: (sessionId: string) => void;
  onGoToStudents: () => void;
  onGoToReports: () => void;
}

export const LecturerWorkspaceView: React.FC<LecturerWorkspaceViewProps> = ({
  activeLecturer,
  isAdmin,
  subjects,
  sessions,
  students,
  attendanceRecords,
  teachingAssignments,
  enrollments,
  activeSession: propActiveSession,
  onOpenScanner,
  onOpenScannerForSession,
  onCreateSession: _onCreateSession,
  onSetSessionStatus,
  onCloseActiveSession: _onCloseActiveSession,
  onGoToStudents: _onGoToStudents,
  onGoToReports: _onGoToReports
}) => {
  // 1. Identify Lecturer's ACTIVE teaching assignments (SES v4.5 Authoritative Source)
  const myAssignments = useMemo(() => {
    return teachingAssignments.filter((ta) => {
      const isActive = ta.status === 'ACTIVE';
      const matchId = ta.lecturerId === activeLecturer.id;
      const matchEmail = Boolean(
        ta.lecturerEmail &&
        activeLecturer.email &&
        ta.lecturerEmail.trim().toLowerCase() === activeLecturer.email.trim().toLowerCase()
      );
      const matchName = Boolean(
        ta.lecturerName &&
        activeLecturer.name &&
        ta.lecturerName.trim().toLowerCase() === activeLecturer.name.trim().toLowerCase()
      );
      return isActive && (matchId || matchEmail || matchName);
    });
  }, [teachingAssignments, activeLecturer]);

  // Assigned subject codes derived strictly from ACTIVE assignments
  const myAssignedSubjectCodes = useMemo(() => {
    const codes = new Set<string>();
    myAssignments.forEach((ta) => {
      if (ta.subjectCode) codes.add(ta.subjectCode.trim().toUpperCase());
    });
    // Fallback: If no explicit assignment, give access to college subjects
    if (codes.size === 0) {
      subjects.forEach((s) => codes.add(s.code.trim().toUpperCase()));
    }
    return codes;
  }, [myAssignments, subjects]);

  // Available subjects for this lecturer
  const availableSubjects = useMemo(() => {
    const filtered = subjects.filter((s) => myAssignedSubjectCodes.has(s.code.toUpperCase()));
    return filtered.length > 0 ? filtered : subjects;
  }, [subjects, myAssignedSubjectCodes]);

  // State: Selection
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>(() => {
    return availableSubjects[0]?.code || '';
  });

  const selectedSubject = useMemo(() => {
    return availableSubjects.find((s) => s.code.toUpperCase() === selectedSubjectCode.toUpperCase()) || availableSubjects[0];
  }, [availableSubjects, selectedSubjectCode]);

  // Authorized Classes for the selected subject: Strictly derived from ACTIVE teaching assignments (SES v4.5 Phase 4B.2-C)
  const availableClassesForSubject = useMemo(() => {
    if (!selectedSubject) return [];

    const normSubjCode = selectedSubject.code.trim().toUpperCase();
    const authorizedClasses = new Set<string>();

    myAssignments
      .filter((ta) => ta.status === 'ACTIVE' && ta.subjectCode && ta.subjectCode.trim().toUpperCase() === normSubjCode)
      .forEach((ta) => {
        if (ta.className && ta.className.trim()) {
          authorizedClasses.add(ta.className.trim());
        }
      });

    return Array.from(authorizedClasses);
  }, [selectedSubject, myAssignments]);

  const [selectedClass, setSelectedClass] = useState<string>(() => {
    return availableClassesForSubject[0] || '';
  });

  // Keep selectedClass synchronized if available classes change or subject switches
  React.useEffect(() => {
    if (availableClassesForSubject.length === 0) {
      if (selectedClass !== '') {
        setSelectedClass('');
      }
    } else if (!availableClassesForSubject.includes(selectedClass)) {
      setSelectedClass(availableClassesForSubject[0]);
    }
  }, [availableClassesForSubject, selectedClass]);

  // Subject selection handler: recalculates authorized classes and clears/updates selected class
  const handleSelectSubject = (code: string) => {
    setSelectedSubjectCode(code);
    const normCode = code.trim().toUpperCase();
    const authorizedForNewSubject = Array.from(
      new Set(
        myAssignments
          .filter((ta) => ta.status === 'ACTIVE' && ta.subjectCode && ta.subjectCode.trim().toUpperCase() === normCode)
          .map((ta) => ta.className?.trim())
          .filter((cls): cls is string => Boolean(cls))
      )
    );

    if (authorizedForNewSubject.includes(selectedClass)) {
      // Retain selection if authorized for the new subject
    } else if (authorizedForNewSubject.length > 0) {
      setSelectedClass(authorizedForNewSubject[0]);
    } else {
      setSelectedClass('');
    }
  };

  // Active Session Detection (Check if ANY session is OPEN for this lecturer)
  const currentOpenSession = useMemo(() => {
    if (
      propActiveSession &&
      propActiveSession.status === 'OPEN' &&
      isLecturerAuthorizedForSession(propActiveSession, activeLecturer, isAdmin, teachingAssignments)
    ) {
      return propActiveSession;
    }
    const openSessions = sessions.filter((s) => s.status === 'OPEN');
    const authorizedOpen = filterAuthorizedSessions(openSessions, activeLecturer, isAdmin, teachingAssignments);
    return authorizedOpen[0] || null;
  }, [propActiveSession, sessions, activeLecturer, isAdmin, teachingAssignments]);

  // Does selected subject and class match an active session?
  const isSelectedActive = useMemo(() => {
    if (!currentOpenSession || !selectedSubject) return false;
    const subjMatch = currentOpenSession.subjectCode === selectedSubject.code || currentOpenSession.subjectId === selectedSubject.id;
    const classMatch = normalizeClassCode(currentOpenSession.className) === normalizeClassCode(selectedClass);
    return subjMatch && classMatch;
  }, [currentOpenSession, selectedSubject, selectedClass]);

  // Is there another session OPEN for a different subject/class?
  const isAnotherSessionOpen = useMemo(() => {
    if (!currentOpenSession || !selectedSubject) return false;
    return !isSelectedActive;
  }, [currentOpenSession, isSelectedActive, selectedSubject]);

  // Persistent Detail Session across refresh and URL navigation
  const DETAIL_SESSION_STORAGE_KEY = 'syncrozz_active_detail_session_id';

  const getInitialDetailSessionId = (): string | null => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.startsWith('#session-detail')) {
        const q = hash.includes('?') ? hash.substring(hash.indexOf('?') + 1) : '';
        const params = new URLSearchParams(q);
        const id = params.get('id');
        if (id) return id;
      }
      const stored = sessionStorage.getItem(DETAIL_SESSION_STORAGE_KEY);
      if (stored) return stored;
    }
    return null;
  };

  // Modal & Subview states
  const [selectedSessionIdForDetail, setSelectedSessionIdForDetail] = useState<string | null>(getInitialDetailSessionId);
  const [isQrProjectorOpen, setIsQrProjectorOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [inspectSession, setInspectSession] = useState<AttendanceSession | null>(null);
  const [confirmEndSessionId, setConfirmEndSessionId] = useState<string | null>(null);
  const [confirmCloseOtherSessionId, setConfirmCloseOtherSessionId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  const handleOpenSessionDetail = (sessionId: string) => {
    setSelectedSessionIdForDetail(sessionId);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(DETAIL_SESSION_STORAGE_KEY, sessionId);
      window.location.hash = `#session-detail?id=${sessionId}`;
    }
  };

  const handleCloseSessionDetail = () => {
    setSelectedSessionIdForDetail(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(DETAIL_SESSION_STORAGE_KEY);
      if (window.location.hash.startsWith('#session-detail')) {
        window.location.hash = '';
      }
    }
  };

  // Synchronize hash back/forward button navigation
  React.useEffect(() => {
    const handleHashChange = () => {
      if (typeof window === 'undefined') return;
      const hash = window.location.hash;
      if (hash.startsWith('#session-detail')) {
        const q = hash.includes('?') ? hash.substring(hash.indexOf('?') + 1) : '';
        const params = new URLSearchParams(q);
        const id = params.get('id');
        if (id) {
          setSelectedSessionIdForDetail(id);
          sessionStorage.setItem(DETAIL_SESSION_STORAGE_KEY, id);
          return;
        }
      } else if (selectedSessionIdForDetail && !hash.startsWith('#session-detail')) {
        setSelectedSessionIdForDetail(null);
        sessionStorage.removeItem(DETAIL_SESSION_STORAGE_KEY);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [selectedSessionIdForDetail]);

  // Active session statistics
  const activeSessionRecords = useMemo(() => {
    if (!currentOpenSession) return [];
    return attendanceRecords.filter((r) => r.sessionId === currentOpenSession.id && r.status === 'PRESENT');
  }, [currentOpenSession, attendanceRecords]);

  // Active session statistics:
  // SES v4.5 Authoritative Denominator: Uses session.targetCount snapshot, or dynamically resolves
  // from authoritative ACTIVE enrollments for (subjectCode, className). Never uses class capacity or 30 fallback.
  const { targetCount: activeTargetCount, attendancePercent: activePercent } = useMemo(() => {
    if (!currentOpenSession) return { targetCount: 0, attendancePercent: 0 };
    return calculateAttendanceMetrics(
      activeSessionRecords.length,
      currentOpenSession.targetCount,
      enrollments,
      currentOpenSession
    );
  }, [currentOpenSession, activeSessionRecords.length, enrollments]);

  // Attendance History: sorted descending newest first, strictly respecting lecturer identity & authorized teaching assignments
  // SES v4.5 Separation: History contains completed/closed historical sessions (status !== 'OPEN')
  const historySessions = useMemo(() => {
    const historicalOnly = sessions.filter((s) => s.status !== 'OPEN');
    return filterAuthorizedSessions(historicalOnly, activeLecturer, isAdmin, teachingAssignments);
  }, [sessions, activeLecturer, isAdmin, teachingAssignments]);

  const selectedSessionForDetail = useMemo(() => {
    if (!selectedSessionIdForDetail) return null;
    const found = sessions.find((s) => s.id === selectedSessionIdForDetail);
    if (!found) return null;
    if (!isLecturerAuthorizedForSession(found, activeLecturer, isAdmin, teachingAssignments)) {
      return null;
    }
    return found;
  }, [selectedSessionIdForDetail, sessions, activeLecturer, isAdmin, teachingAssignments]);

  const recentSessions = historySessions;

  // 1-Tap Activation Handler (SES v4.5 Authoritative Invariant Enforcement)
  const handleActivateSession = () => {
    if (!selectedSubject || !selectedClass) {
      setActionNotice({ type: 'error', message: 'Sila pilih subjek dan kelas terlebih dahulu.' });
      return;
    }

    // Authoritative verification: Must correspond to an ACTIVE teaching assignment
    const matchingAssignment = myAssignments.find((ta) => {
      const isActive = ta.status === 'ACTIVE';
      const isSubjMatch = ta.subjectCode && ta.subjectCode.trim().toUpperCase() === selectedSubject.code.trim().toUpperCase();
      const isClassMatch = normalizeClassCode(ta.className) === normalizeClassCode(selectedClass);
      return isActive && isSubjMatch && isClassMatch;
    });

    if (!matchingAssignment && !isAdmin) {
      setActionNotice({
        type: 'error',
        message: `Kombinasi ${selectedSubject.code} dan ${selectedClass} tidak dibenarkan kerana tiada penetapan pengajaran aktif.`
      });
      return;
    }

    // 1. If this exact session is already open -> Resume it!
    if (isSelectedActive && currentOpenSession) {
      onOpenScannerForSession(currentOpenSession.id);
      return;
    }

    // 2. If another session is OPEN -> Do NOT automatically close it!
    // Offer warning to let lecturer resume or explicitly close first
    if (isAnotherSessionOpen && currentOpenSession) {
      setActionNotice({
        type: 'warning',
        message: `Sesi "${currentOpenSession.subjectCode} - ${currentOpenSession.className}" sedang dibuka. Sistem tidak menutup sesi tersebut secara automatik untuk memelihara integriti data.`
      });
      return;
    }

    // 3. Activate session via authoritative engine
    try {
      const res = attendanceEngine.activateClassSession(
        selectedSubject,
        selectedClass,
        activeLecturer,
        matchingAssignment?.id
      );
      setActionNotice({
        type: 'success',
        message: `Sesi kehadiran untuk ${selectedSubject.code} (${selectedClass}) berjaya diaktifkan!`
      });
      // Seamlessly navigate to scanner
      onOpenScannerForSession(res.session.id);
    } catch (err) {
      console.error('Failed to activate session:', err);
      setActionNotice({ type: 'error', message: 'Ralat mengaktifkan sesi. Sila cuba lagi.' });
    }
  };

  // Explicit End Session Confirmation Handler
  const handleConfirmEndSession = () => {
    if (!confirmEndSessionId) return;
    onSetSessionStatus(confirmEndSessionId, 'CLOSED');
    setConfirmEndSessionId(null);
    setActionNotice({ type: 'success', message: 'Sesi kehadiran berjaya ditamatkan dan rekod disimpan.' });
  };

  // Explicit Close Other Session to proceed
  const handleExplicitCloseOtherSession = () => {
    if (!confirmCloseOtherSessionId) return;
    onSetSessionStatus(confirmCloseOtherSessionId, 'CLOSED');
    setConfirmCloseOtherSessionId(null);
    setActionNotice({ type: 'success', message: 'Sesi terdahulu telah ditamatkan. Anda kini boleh memulakan sesi baharu.' });
  };

  // SUBVIEW: SESSION DETAIL VIEW
  if (selectedSessionForDetail) {
    return (
      <SessionDetailView
        session={selectedSessionForDetail}
        activeLecturer={activeLecturer}
        isAdmin={isAdmin}
        attendanceRecords={attendanceRecords}
        students={students}
        teachingAssignments={teachingAssignments}
        myAssignedSubjectCodes={myAssignedSubjectCodes}
        enrollments={enrollments}
        onBack={handleCloseSessionDetail}
        onOpenScannerForSession={onOpenScannerForSession}
      />
    );
  }

  return (
    <div id="lecturer-workspace-view" className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. LECTURER IDENTITY BAR (Compact, ≤64px height) */}
      <header
        id="lecturer-identity-bar"
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md backdrop-blur-sm"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-inner flex-shrink-0">
            {activeLecturer.name?.charAt(0) || 'P'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {activeLecturer.name}
              </h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {activeLecturer.department || 'Jabatan Perakaunan'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              {activeLecturer.email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="header-open-scanner-btn"
            type="button"
            onClick={onOpenScanner}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[48px] rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/20 active:scale-[0.98]"
          >
            <QrCode className="w-5 h-5 text-indigo-200" />
            <span>Buka Pengimbas</span>
          </button>
        </div>
      </header>

      {/* Action Notification / Feedback Banner */}
      {actionNotice && (
        <div
          className={`p-3.5 rounded-xl border text-sm flex items-center justify-between gap-3 animate-fadeIn ${
            actionNotice.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
              : actionNotice.type === 'warning'
              ? 'bg-amber-950/60 border-amber-500/40 text-amber-200'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            )}
            <span>{actionNotice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="p-1 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. ACTIVE ATTENDANCE SESSION HERO BANNER (Visible whenever a session is OPEN) */}
      {currentOpenSession && (
        <section
          id="active-session-banner"
          aria-label="Sesi Kehadiran Aktif"
          className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border-2 border-emerald-500/50 shadow-xl shadow-emerald-950/20 relative overflow-hidden"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>SESI SEDANG DIBUKA</span>
              </div>

              <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  {currentOpenSession.subjectCode || currentOpenSession.subjectName}
                </h2>
                <span className="text-base sm:text-lg font-bold text-emerald-300 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  {currentOpenSession.className}
                </span>
                <span className="text-xs text-slate-300">
                  ({currentOpenSession.subjectName || 'Subjek'})
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {currentOpenSession.date}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Mula: {currentOpenSession.startTime || '11:00 AM'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  Pensyarah: {currentOpenSession.lecturerName}
                </span>
              </div>
            </div>

            {/* Attendance Progress & Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-center min-w-[140px]">
                <div className="flex justify-between items-baseline text-xs mb-1">
                  <span className="text-slate-400 font-medium">Kehadiran</span>
                  <span className="text-emerald-400 font-bold">{activePercent}%</span>
                </div>
                <div className="text-base font-extrabold text-white">
                  {activeSessionRecords.length} <span className="text-xs text-slate-400 font-normal">/ {activeTargetCount} Pelajar</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${activePercent}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  id="active-session-scan-btn"
                  type="button"
                  onClick={() => onOpenScannerForSession(currentOpenSession.id)}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all active:scale-[0.98]"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Imbas Sekarang</span>
                </button>

                <button
                  id="active-session-projector-btn"
                  type="button"
                  onClick={() => setIsQrProjectorOpen(true)}
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 min-h-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-slate-200 font-medium text-xs border border-slate-700 transition-all"
                  title="Papar QR Projektor untuk paparan kelas"
                >
                  <Maximize2 className="w-4 h-4 text-slate-400" />
                  <span className="hidden sm:inline">Papar QR</span>
                </button>

                <button
                  id="active-session-end-btn"
                  type="button"
                  onClick={() => setConfirmEndSessionId(currentOpenSession.id)}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[48px] rounded-xl bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 text-rose-300 font-semibold text-xs border border-rose-500/30 transition-all"
                  title="Tamatkan sesi dan simpan rekod kehadiran"
                >
                  <span>Tamatkan Sesi</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Warning Banner if ANOTHER session is open while viewing a different subject/class */}
      {isAnotherSessionOpen && currentOpenSession && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                Perhatian: Sesi "{currentOpenSession.subjectCode} - {currentOpenSession.className}" sedang dibuka.
              </p>
              <p className="text-xs text-amber-300/80 mt-0.5">
                Sistem tidak menutup sesi tersebut secara automatik untuk melindungi integriti rekod kehadiran.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => onOpenScannerForSession(currentOpenSession.id)}
              className="px-3 py-1.5 min-h-[44px] rounded-lg bg-amber-600/30 hover:bg-amber-600/40 text-amber-200 text-xs font-bold border border-amber-500/40"
            >
              Sambung Sesi Tersebut
            </button>
            <button
              type="button"
              onClick={() => setConfirmCloseOtherSessionId(currentOpenSession.id)}
              className="px-3 py-1.5 min-h-[44px] rounded-lg bg-rose-600/30 hover:bg-rose-600/40 text-rose-200 text-xs font-bold border border-rose-500/40"
            >
              Tutup Sesi Tersebut
            </button>
          </div>
        </div>
      )}

      {/* 3. PUSAT AKTIVASI SESI PANTAS (2-Step Direct Selector) */}
      <section
        id="quick-session-activation-hub"
        aria-label="Pusat Aktivasi Sesi Pantas"
        className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-6"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Play className="w-4 h-4 text-indigo-400 fill-indigo-400" />
              <span>Aktivasi Sesi Kehadiran</span>
            </h3>
            <p className="text-xs text-slate-400">
              Pilih subjek dan kelas, kemudian klik butang pengaktifan di bawah.
            </p>
          </div>
        </div>

        {/* STEP 1: SUBJEK SAYA */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span>Langkah 1: Pilih Subjek</span>
          </label>

          {availableSubjects.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 text-center text-slate-400 text-sm">
              Tiada subjek ditugaskan. Sila hubungi pentadbir untuk penetapan jadual subjek.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {availableSubjects.map((sub) => {
                const isSelected = selectedSubject?.code.toUpperCase() === sub.code.toUpperCase();
                return (
                  <button
                    key={sub.id || sub.code}
                    type="button"
                    onClick={() => handleSelectSubject(sub.code)}
                    className={`text-left p-3.5 rounded-xl transition-all min-h-[56px] border flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-950/40 text-white shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500'
                        : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm tracking-wide">
                        {sub.code}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      )}
                    </div>
                    <span className="text-xs text-slate-400 truncate mt-1">
                      {sub.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* STEP 2: KELAS SAYA */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
              <span>Langkah 2: Pilih Kelas</span>
            </label>
          </div>

          {/* Class Badges / Chips */}
          {availableClassesForSubject.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>Tiada kelas aktif yang ditugaskan untuk subjek ini. Sila hubungi pentadbir untuk penetapan pengajaran.</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {availableClassesForSubject.map((cls) => {
                const isSelected = normalizeClassCode(selectedClass) === normalizeClassCode(cls);

                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setSelectedClass(cls)}
                    className={`px-4 py-2.5 min-h-[48px] rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400'
                        : 'bg-slate-950/80 text-slate-300 border border-slate-800 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <span>{cls}</span>
                    <span
                      title="Kelas Ditugaskan oleh Pentadbir"
                      className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 font-semibold"
                    >
                      ⭐ Ditugaskan
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* STEP 3: THE PRIMARY ACTIVATION BAR (Min 52-56px height, Mobile-First) */}
        <div className="pt-2">
          {isSelectedActive && currentOpenSession ? (
            <button
              id="resume-active-session-btn"
              type="button"
              onClick={() => onOpenScannerForSession(currentOpenSession.id)}
              className="w-full min-h-[56px] px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 active:from-emerald-700 text-white font-extrabold text-base shadow-lg shadow-emerald-600/30 transition-all flex flex-col sm:flex-row items-center justify-center gap-2 active:scale-[0.99]"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-100" />
                <span>Sambung Sesi Sedang Berjalan: {selectedSubject?.code} ({selectedClass})</span>
              </div>
              <span className="text-xs text-emerald-100 font-normal opacity-90">
                (Sesi aktif sejak {currentOpenSession.startTime})
              </span>
            </button>
          ) : (
            <button
              id="activate-session-primary-btn"
              type="button"
              onClick={handleActivateSession}
              disabled={!selectedSubject || !selectedClass}
              className="w-full min-h-[56px] px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 active:from-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-base shadow-lg shadow-indigo-600/30 transition-all flex flex-col sm:flex-row items-center justify-center gap-2 active:scale-[0.99]"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-200" />
                <span>
                  Aktifkan Sesi Kehadiran:{' '}
                  {selectedSubject ? `${selectedSubject.code} — ${selectedClass || 'Tiada Kelas Dipilih'}` : 'Sila Pilih Subjek'}
                </span>
              </div>
              <span className="text-xs text-indigo-100 font-normal opacity-85">
                (Buka Imbasan QR Langsung)
              </span>
            </button>
          )}
        </div>
      </section>

      {/* 4. RECENT ATTENDANCE HISTORY (Compact, Non-Weekly, Preserving All Records) */}
      <section
        id="recent-attendance-history-section"
        aria-label="Sejarah Kehadiran Terkini"
        className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Sejarah Sesi Kehadiran Terkini</span>
            </h3>
            <p className="text-xs text-slate-400">
              Paparan 10 sesi terakhir bagi kelas dan subjek anda.
            </p>
          </div>
        </div>

        {historySessions.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm space-y-2">
            <Clock className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="font-semibold text-slate-400">Tiada rekod sesi terdahulu dijumpai.</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Mulakan sesi baharu dengan memilih subjek dan kelas di atas, kemudian klik butang "Aktifkan Sesi Kehadiran".
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Tarikh & Masa</th>
                    <th className="py-3 px-4">Subjek</th>
                    <th className="py-3 px-4">Kelas</th>
                    <th className="py-3 px-4">Pensyarah</th>
                    <th className="py-3 px-4">Kehadiran</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {historySessions.map((s) => {
                    const records = attendanceRecords.filter((r) => r.sessionId === s.id && r.status === 'PRESENT');
                    const { targetCount: target, attendancePercent: percent } = calculateAttendanceMetrics(
                      records.length,
                      s.targetCount,
                      enrollments,
                      s
                    );
                    const isOpen = s.status === 'OPEN';
                    const safeEndTime = formatSafeEndTime(s.endTime, s.status);

                    return (
                      <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-200">
                          <div className="font-bold text-white">{s.date}</div>
                          <div className="text-[11px] text-slate-400">
                            {s.startTime || '-'} &rarr; {safeEndTime}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-white">{s.subjectCode}</span>
                          <span className="text-slate-400 block truncate max-w-[180px]">{s.subjectName || s.sessionName}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 rounded bg-slate-800 font-semibold text-indigo-300 border border-slate-700">
                            {s.className}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          <span className="font-medium text-white">{s.lecturerName || activeLecturer.name}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-white">{records.length}</span>
                          <span className="text-slate-400"> / {target} ({percent}%)</span>
                        </td>
                        <td className="py-3 px-4">
                          {isOpen ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              AKTIF
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 font-medium">
                              SELESAI
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isOpen && (
                              <button
                                type="button"
                                onClick={() => onOpenScannerForSession(s.id)}
                                className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs min-h-[48px] flex items-center gap-1.5"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                                <span>Imbas</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenSessionDetail(s.id)}
                              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold min-h-[48px] border border-slate-700 transition-colors"
                            >
                              Butiran Sesi
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="md:hidden space-y-3">
              {historySessions.map((s) => {
                const records = attendanceRecords.filter((r) => r.sessionId === s.id && r.status === 'PRESENT');
                const { targetCount: target, attendancePercent: percent } = calculateAttendanceMetrics(
                  records.length,
                  s.targetCount,
                  enrollments,
                  s
                );
                const isOpen = s.status === 'OPEN';
                const safeEndTime = formatSafeEndTime(s.endTime, s.status);

                return (
                  <div
                    key={s.id}
                    className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-base">{s.subjectCode}</span>
                          <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 text-xs font-semibold border border-indigo-500/20">
                            {s.className}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium">
                          {s.subjectName || s.sessionName}
                        </p>
                      </div>

                      {isOpen ? (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          AKTIF
                        </span>
                      ) : (
                        <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 font-medium shrink-0">
                          SELESAI
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-1 border-t border-slate-800/60">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase">Pensyarah</span>
                        <span className="text-slate-200 font-medium truncate block">
                          {s.lecturerName || activeLecturer.name}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase">Kehadiran</span>
                        <span className="text-emerald-400 font-bold">
                          {records.length} / {target} ({percent}%)
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase">Tarikh</span>
                        <span className="text-slate-300 font-mono">{s.date}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase">Masa</span>
                        <span className="text-slate-300 font-mono">
                          {s.startTime || '-'} &rarr; {safeEndTime}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800/60">
                      {isOpen && (
                        <button
                          type="button"
                          onClick={() => onOpenScannerForSession(s.id)}
                          className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs min-h-[48px] flex items-center justify-center gap-1.5"
                        >
                          <QrCode className="w-4 h-4" />
                          <span>Imbas Kehadiran</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenSessionDetail(s.id)}
                        className="flex-1 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold min-h-[48px] border border-slate-700 flex items-center justify-center transition-colors"
                      >
                        Lihat Butiran Sesi
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* CONFIRMATION MODAL: END SESSION */}
      {confirmEndSessionId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h4 className="text-lg font-bold text-white">Tamatkan Sesi Kehadiran?</h4>
            </div>
            <p className="text-sm text-slate-300">
              Adakah anda pasti untuk menamatkan sesi ini? Masa tamat akan disimpan dan sesi akan ditandakan sebagai SELESAI. Semua rekod imbasan pelajar kekal terpelihara.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmEndSessionId(null)}
                className="px-4 py-2.5 min-h-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmEndSession}
                className="px-4 py-2.5 min-h-[48px] rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold shadow-lg shadow-rose-600/30"
              >
                Sahkan Tamatkan Sesi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: CLOSE OTHER SESSION FIRST */}
      {confirmCloseOtherSessionId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6" />
              <h4 className="text-lg font-bold text-white">Tutup Sesi Terdahulu?</h4>
            </div>
            <p className="text-sm text-slate-300">
              Sesi terdahulu akan ditutup secara eksplisit. Rekod kehadiran yang telah diimbas tetap selamat dalam pangkalan data.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmCloseOtherSessionId(null)}
                className="px-4 py-2.5 min-h-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExplicitCloseOtherSession}
                className="px-4 py-2.5 min-h-[48px] rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold shadow-lg shadow-amber-600/30"
              >
                Tutup Sesi Tersebut
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT ATTENDANCE LIST INSPECT MODAL */}
      {inspectSession && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-base font-bold text-white">
                  Senarai Hadir: {inspectSession.subjectCode} ({inspectSession.className})
                </h4>
                <p className="text-xs text-slate-400">
                  {inspectSession.date} • {inspectSession.startTime || '11:00'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectSession(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {attendanceRecords.filter((r) => r.sessionId === inspectSession.id && r.status === 'PRESENT').length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">
                  Tiada rekod pelajar hadir direkodkan bagi sesi ini.
                </div>
              ) : (
                attendanceRecords
                  .filter((r) => r.sessionId === inspectSession.id && r.status === 'PRESENT')
                  .map((rec, idx) => {
                    const st = students.find((s) => s.id === rec.studentId || s.studentId === rec.studentId);
                    return (
                      <div
                        key={rec.id || idx}
                        className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-white">{st?.name || rec.studentName || 'Pelajar'}</div>
                          <div className="text-slate-400 font-mono">{st?.studentId || rec.studentId} • {st?.className || inspectSession.className}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-emerald-400 font-bold">HADIR</span>
                          <div className="text-slate-500 text-[10px]">{rec.timestamp?.split('T')[1]?.substring(0, 5) || ''}</div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 text-right">
              <button
                type="button"
                onClick={() => setInspectSession(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN PROJECTOR QR MODAL */}
      {isQrProjectorOpen && currentOpenSession && (
        <div className={`fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 ${isFullscreen ? 'p-0' : ''}`}>
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={() => setIsQrProjectorOpen(false)}
              className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="max-w-md w-full text-center space-y-6">
            <div className="space-y-1">
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase">
                Imbas Kod QR Kehadiran
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
                {currentOpenSession.subjectCode} — {currentOpenSession.className}
              </h2>
              <p className="text-sm text-slate-400">{currentOpenSession.subjectName}</p>
            </div>

            <div className="p-8 rounded-3xl bg-white shadow-2xl flex items-center justify-center mx-auto w-64 h-64 sm:w-72 sm:h-72">
              {/* QR Code Payload Representation */}
              <div className="flex flex-col items-center justify-center text-slate-900 space-y-2">
                <QrCode className="w-44 h-44 text-slate-900" />
                <span className="text-[10px] font-mono text-slate-500 truncate max-w-[200px]">
                  {currentOpenSession.id}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-slate-400">
                Buka aplikasi Class Attend atau imbas menggunakan kamera telefon pintar.
              </p>
              <div className="text-base font-bold text-emerald-400">
                {activeSessionRecords.length} Pelajar Telah Diimbas
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
