import React, { useState, useMemo, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Subject,
  AttendanceSession,
  AttendanceRecord,
  Lecturer,
  Student,
  EventStatus,
  Enrollment,
  TeachingAssignment
} from '../types';
import { getClassBadgeColor, sortSessionsLatestFirst } from '../utils/studentUtils';
import { GenerateEnrollmentQRModal } from './GenerateEnrollmentQRModal';
import { EnrolledStudentsModal } from './EnrolledStudentsModal';
import { LecturerManageSubjectsModal } from './LecturerManageSubjectsModal';
import {
  BookOpen,
  Plus,
  QrCode,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  Play,
  Square,
  Search,
  Filter,
  Eye,
  X,
  Sparkles,
  Maximize2,
  Trash2,
  GraduationCap,
  Layers,
  UserCheck,
  User,
  BookMarked,
  AlertTriangle,
  Upload,
  Radio,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Calendar,
  CalendarPlus,
  Settings
} from 'lucide-react';
import { attendanceEngine } from '../services/attendanceEngine';

interface ClassManagementViewProps {
  subjects: Subject[];
  sessions: AttendanceSession[];
  attendanceRecords: AttendanceRecord[];
  students?: Student[];
  lecturers?: Lecturer[];
  enrollments?: Enrollment[];
  teachingAssignments?: TeachingAssignment[];
  activeLecturer: Lecturer | null;
  isAdmin: boolean;
  onSetSessionStatus: (sessionId: string, newStatus: EventStatus) => void;
  onCreateSubject: (subject: Subject) => void;
  onCreateSession: (session: AttendanceSession) => void;
  onDeleteSession?: (sessionId: string) => void;
  onDeleteSubject?: (subjectId: string) => void;
  onOpenScannerForSession: (sessionId: string) => void;
  onRequestAdminAccess: (actionName?: string) => void;
  onOpenCSVImport?: () => void;
  onNavigateToStudents?: () => void;
  onOpenSelfRegistrationTest?: (context: {
    subjectCode: string;
    subjectName: string;
    className: string;
    lecturerName?: string;
    lecturerEmail?: string;
  }) => void;
}

export const EventManagementView: React.FC<ClassManagementViewProps> = ({
  subjects,
  sessions,
  attendanceRecords,
  students: propStudents,
  lecturers: propLecturers,
  enrollments: propEnrollments,
  teachingAssignments: propTeachingAssignments,
  activeLecturer,
  isAdmin,
  onSetSessionStatus,
  onCreateSubject,
  onCreateSession,
  onDeleteSession,
  onDeleteSubject,
  onOpenScannerForSession,
  onRequestAdminAccess,
  onOpenCSVImport,
  onNavigateToStudents,
  onOpenSelfRegistrationTest
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Enrollments from props or engine
  const activeEnrollments = propEnrollments || attendanceEngine.getEnrollments();

  // QR Modal & Enrolled Modal State
  const [isGenerateQRModalOpen, setIsGenerateQRModalOpen] = useState<boolean>(false);
  const [qrModalSubject, setQrModalSubject] = useState<Subject | null>(null);
  const [qrModalClass, setQrModalClass] = useState<string>('DIA_4A');

  const [isEnrolledModalOpen, setIsEnrolledModalOpen] = useState<boolean>(false);
  const [enrolledModalSubject, setEnrolledModalSubject] = useState<Subject | null>(null);
  const [enrolledModalClass, setEnrolledModalClass] = useState<string>('ALL');

  // Lecturers list from props or engine
  const availableLecturers = propLecturers && propLecturers.length > 0
    ? propLecturers
    : attendanceEngine.getLecturers();

  // Students list from props or engine
  const availableStudents = propStudents && propStudents.length > 0
    ? propStudents
    : attendanceEngine.getStudents();

  // Calculate student count per class to strictly only allow classes with student data
  const studentCountByClass = useMemo(() => {
    const counts: Record<string, number> = {};
    availableStudents.forEach((s) => {
      const cls = (s.className || '').trim().toUpperCase();
      if (cls) {
        counts[cls] = (counts[cls] || 0) + 1;
      }
    });
    return counts;
  }, [availableStudents]);

  // ONLY classes that actually have student data in database
  const classesWithData = useMemo(() => {
    return Object.keys(studentCountByClass).sort();
  }, [studentCountByClass]);

  // Modal States
  const [isCreateSubjectOpen, setIsCreateSubjectOpen] = useState<boolean>(false);
  const [isCreateSessionOpen, setIsCreateSessionOpen] = useState<boolean>(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [projectorSession, setProjectorSession] = useState<AttendanceSession | null>(null);

  // New Subject Form State
  const [newSubCode, setNewSubCode] = useState<string>('');
  const [newSubName, setNewSubName] = useState<string>('');
  const [newSubLecturer, setNewSubLecturer] = useState<string>(
    activeLecturer?.name || (availableLecturers[0]?.name) || 'PENSYARAH'
  );
  const [newSubSections, setNewSubSections] = useState<string[]>([]);
  const [newSubDesc, setNewSubDesc] = useState<string>('');

  // New Session Form State
  const [newSessionName, setNewSessionName] = useState<string>('');
  const [newSessionClass, setNewSessionClass] = useState<string>('');

  // Lecturer Manage Subjects Modal
  const [isManageSubjectsModalOpen, setIsManageSubjectsModalOpen] = useState<boolean>(false);

  // Active lecturer teaching assignment codes
  const myAssignedCodes = useMemo(() => {
    if (!activeLecturer) return new Set<string>();
    const codes = new Set<string>();
    const lecName = (activeLecturer.name || '').trim().toLowerCase();
    const lecEmail = (activeLecturer.email || '').trim().toLowerCase();
    const lecId = (activeLecturer.id || '').trim().toLowerCase();

    // 1. From teaching assignments prop or engine
    const assignments = (propTeachingAssignments && propTeachingAssignments.length > 0)
      ? propTeachingAssignments
      : attendanceEngine.getTeachingAssignmentsForLecturer(activeLecturer.id || activeLecturer.email);

    assignments.forEach((ta) => {
      const matchId = ta.lecturerId && ta.lecturerId.toLowerCase() === lecId;
      const matchEmail = ta.lecturerEmail && ta.lecturerEmail.toLowerCase() === lecEmail;
      const matchName = ta.lecturerName && ta.lecturerName.toLowerCase().includes(lecName);
      if (matchId || matchEmail || matchName) {
        if (ta.subjectCode) codes.add(ta.subjectCode.trim().toUpperCase());
      }
    });

    // 2. From activeLecturer.assignedSubjects
    (activeLecturer.assignedSubjects || []).forEach((subStr) => {
      const code = subStr.includes('-') ? subStr.split('-')[0].trim().toUpperCase() : subStr.trim().toUpperCase();
      if (code) codes.add(code);
    });

    // 3. From subjects list where lecturer matches
    subjects.forEach((s) => {
      const matchId = s.lecturerId && s.lecturerId.toLowerCase() === lecId;
      const matchEmail = s.lecturerEmail && s.lecturerEmail.toLowerCase() === lecEmail;
      const matchName = s.lecturerName && s.lecturerName.toLowerCase().includes(lecName);
      if (matchId || matchEmail || matchName) {
        codes.add(s.code.trim().toUpperCase());
      }
    });

    return codes;
  }, [activeLecturer, propTeachingAssignments, subjects]);

  // Determine subject view scope:
  // When a lecturer is authenticated (login access), default strictly to lecturer's own subjects ('MY_SUBJECTS') instead of 'ALL_SUBJECTS'
  const [subjectViewScope, setSubjectViewScope] = useState<'MY_SUBJECTS' | 'ALL_SUBJECTS'>(
    activeLecturer ? 'MY_SUBJECTS' : 'ALL_SUBJECTS'
  );

  // Sync default scope strictly to 'MY_SUBJECTS' whenever activeLecturer is present
  useEffect(() => {
    if (activeLecturer) {
      setSubjectViewScope('MY_SUBJECTS');
    }
  }, [activeLecturer]);

  // Scoped subjects list based on active view scope, sorted A-Z by course code
  const scopedSubjects = useMemo(() => {
    let list: Subject[] = [];
    if (!activeLecturer || subjectViewScope === 'ALL_SUBJECTS') {
      list = [...subjects];
    } else {
      // Strictly return only subjects taught by this lecturer (by individu sahaja)
      list = subjects.filter((s) => myAssignedCodes.has(s.code.trim().toUpperCase()));
    }
    return list.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));
  }, [subjects, activeLecturer, subjectViewScope, myAssignedCodes]);

  // Filtered Subjects with search query
  const filteredSubjects = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return scopedSubjects.filter((sub) => {
      if (!q) return true;
      return (
        sub.code.toLowerCase().includes(q) ||
        sub.name.toLowerCase().includes(q) ||
        (sub.lecturerName && sub.lecturerName.toLowerCase().includes(q)) ||
        (sub.sections && sub.sections.some((sec) => sec.toLowerCase().includes(q)))
      );
    });
  }, [scopedSubjects, searchQuery]);

  // Handle Submit New Subject
  const handleSubmitSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubCode.trim() || !newSubName.trim()) return;

    if (classesWithData.length === 0) {
      alert('Tiada data kelas pelajar. Sila muat naik fail CSV data pelajar terlebih dahulu.');
      return;
    }

    if (newSubSections.length === 0) {
      alert('Sila pilih sekurang-kurangnya satu kelas yang mengambil subjek ini.');
      return;
    }

    const matchedLec = availableLecturers.find((l) => l.name === newSubLecturer) || activeLecturer;

    const newSub: Subject = {
      id: `SUB-${newSubCode.trim().toUpperCase().replace(/\s+/g, '')}`,
      code: newSubCode.trim().toUpperCase(),
      name: newSubName.trim(),
      lecturerId: matchedLec?.id || activeLecturer?.id || 'LEC-001',
      lecturerName: newSubLecturer.trim() || matchedLec?.name || activeLecturer?.name || 'Pensyarah',
      department: matchedLec?.department || 'Perakaunan',
      sections: newSubSections,
      description: newSubDesc.trim(),
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    onCreateSubject(newSub);
    setIsCreateSubjectOpen(false);
    setNewSubCode('');
    setNewSubName('');
    setNewSubDesc('');
    setNewSubSections(classesWithData.slice(0, 1));
  };

  // Open Create Session modal for specific subject
  const handleOpenAddSession = (subId: string) => {
    const sub = subjects.find((s) => s.id === subId);
    setSelectedSubjectId(subId);
    if (sub) {
      const existingSubSessions = sessions.filter((s) => s.subjectId === subId || s.activityId === subId);
      const nextWeekNum = existingSubSessions.length + 1;
      setNewSessionName(`Kuliah Minggu ${nextWeekNum}`);
      const validClass = (sub.sections || []).find((sec) => classesWithData.includes(sec)) || sub.sections[0] || classesWithData[0] || 'ALL';
      setNewSessionClass(validClass);
    }
    setIsCreateSessionOpen(true);
  };

  // Handle Submit New Session
  const handleSubmitSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim() || !selectedSubjectId) return;

    const parentSub = subjects.find((s) => s.id === selectedSubjectId);

    const newSes: AttendanceSession = {
      id: `SES-${Date.now().toString(36).toUpperCase()}`,
      activityId: selectedSubjectId,
      activityName: parentSub ? `[${parentSub.code}] ${parentSub.name}` : 'Kelas',
      subjectId: selectedSubjectId,
      subjectCode: parentSub?.code || '',
      subjectName: parentSub?.name || '',
      category: 'CLASS',
      sessionName: newSessionName.trim(),
      date: new Date().toISOString().split('T')[0],
      startTime: '',
      endTime: '',
      status: 'OPEN',
      attendanceMethod: 'QR',
      organizer: parentSub?.lecturerName || activeLecturer?.name || 'Pensyarah',
      lecturerName: parentSub?.lecturerName || activeLecturer?.name || 'Pensyarah',
      className: newSessionClass,
      createdAt: new Date().toISOString()
    };

    onCreateSession(newSes);
    setIsCreateSessionOpen(false);
  };

  // Handle Delete Session
  const handleDeleteSessionClick = (session: AttendanceSession) => {
    if (!isAdmin && !activeLecturer) {
      onRequestAdminAccess(`Padam Sesi Kelas (${session.sessionName})`);
      return;
    }
    const confirmed = window.confirm(
      `Adakah anda pasti untuk MEMADAM sesi kelas "${session.sessionName}"?`
    );
    if (confirmed && onDeleteSession) {
      onDeleteSession(session.id);
    }
  };

  // Handle Delete Subject
  const handleDeleteSubjectClick = (subject: Subject) => {
    if (!isAdmin && !activeLecturer) {
      onRequestAdminAccess(`Padam Subjek (${subject.code})`);
      return;
    }
    const confirmed = window.confirm(
      `Adakah anda pasti untuk MEMADAM subjek "${subject.code} - ${subject.name}" dan semua rekod sesi kelasnya?`
    );
    if (confirmed && onDeleteSubject) {
      onDeleteSubject(subject.id);
    }
  };

  const toggleSectionSelect = (sec: string) => {
    if (newSubSections.includes(sec)) {
      if (newSubSections.length > 1) {
        setNewSubSections(newSubSections.filter((s) => s !== sec));
      }
    } else {
      setNewSubSections([...newSubSections, sec]);
    }
  };

  const handleOpenCreateSubjectModal = () => {
    if (activeLecturer) {
      setNewSubLecturer(activeLecturer.name);
    }
    if (classesWithData.length > 0 && newSubSections.length === 0) {
      setNewSubSections(classesWithData.slice(0, 1));
    }
    setIsCreateSubjectOpen(true);
  };

  // Global Active Sessions (Level 1: NOW / ACTIVE)
  const activeSessionsList = useMemo(() => {
    const openSessions = sessions.filter((s) => s.status === 'OPEN');
    if (!activeLecturer || subjectViewScope === 'ALL_SUBJECTS') {
      return openSessions;
    }
    const lecName = (activeLecturer.name || '').trim().toLowerCase();
    const lecEmail = (activeLecturer.email || '').trim().toLowerCase();
    return openSessions.filter((s) => {
      const matchSubject = s.subjectCode && myAssignedCodes.has(s.subjectCode.trim().toUpperCase());
      const matchEmail = s.lecturerEmail && s.lecturerEmail.toLowerCase() === lecEmail;
      const matchName = s.lecturerName && s.lecturerName.toLowerCase().includes(lecName);
      return matchSubject || matchEmail || matchName;
    });
  }, [sessions, activeLecturer, subjectViewScope, myAssignedCodes]);

  // State to toggle past sessions for subjects (Progressive Disclosure)
  const [expandedPastSubjects, setExpandedPastSubjects] = useState<Record<string, boolean>>({});

  const togglePastSessions = (subjectId: string) => {
    setExpandedPastSubjects((prev) => ({
      ...prev,
      [subjectId]: !prev[subjectId]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Search Bar */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
        {/* Row 1: Title, Metadata & Main Create Action */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                PENGURUSAN KELAS & SUBJEK
              </span>
              {activeLecturer && (
                <span className="text-[11px] text-slate-300 font-mono flex items-center gap-1">
                  <User className="w-3 h-3 text-indigo-400" />
                  {activeLecturer.name}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight mt-1">
              Subjek & Sesi Kuliah
            </h2>
            <p className="text-xs text-slate-400">
              Urus subjek pensyarah, kelas yang diajar, dan buka sesi imbasan mingguan.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
            <button
              id="btn-create-new-subject"
              onClick={handleOpenCreateSubjectModal}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer shrink-0 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Daftar Subjek Baharu</span>
            </button>
          </div>
        </div>

        {/* Row 2: Search & Quick Enrollment QR Button */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Cari kod atau nama subjek..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              id="btn-open-global-enrollment-qr"
              onClick={() => {
                setQrModalSubject(subjects[0] || null);
                setQrModalClass(subjects[0]?.sections?.[0] || 'DIA_4A');
                setIsGenerateQRModalOpen(true);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold shadow-sm transition-all cursor-pointer"
              title="Jana Kod QR Pendaftaran Kelas untuk dipancarkan kepada pelajar"
            >
              <QrCode className="w-4 h-4 text-indigo-400" />
              <span>Jana QR Pendaftaran Kelas</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================
          LEVEL 1: NOW / ACTIVE SESSIONS (DOMINANT VISUAL PRIORITY)
          ======================================================== */}
      {activeSessionsList.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
              Sedang Berlangsung Sekarang (Live)
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {activeSessionsList.map((activeSes) => {
              const matchedSub = subjects.find((s) => s.id === activeSes.subjectId || s.id === activeSes.activityId);
              const presentCount = attendanceRecords.filter(
                (r) => r.sessionId === activeSes.id && r.status === 'PRESENT'
              ).length;
              const targetClassCount = activeSes.className && activeSes.className !== 'ALL'
                ? (studentCountByClass[activeSes.className.toUpperCase()] || 0)
                : (matchedSub?.sections || []).reduce((acc, sec) => acc + (studentCountByClass[sec.toUpperCase()] || 0), 0) || availableStudents.length;

              const percent = targetClassCount > 0
                ? Math.min(100, Math.round((presentCount / targetClassCount) * 100))
                : 0;

              return (
                <div
                  key={`active-banner-${activeSes.id}`}
                  className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border-2 border-emerald-500 shadow-xl shadow-emerald-950/40 relative overflow-hidden"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    {/* Left: Live Identity & Class info */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-extrabold">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          🔴 SEDANG BERLANGSUNG (LIVE)
                        </span>

                        {activeSes.className && (
                          <span className="text-xs px-2.5 py-0.5 rounded-lg bg-slate-800 text-white font-bold border border-slate-700">
                            Kelas {activeSes.className}
                          </span>
                        )}

                        <span className="text-xs text-slate-400 font-mono">
                          {activeSes.subjectCode || matchedSub?.code}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                          {activeSes.sessionName}
                        </h3>
                        <p className="text-xs text-slate-300 mt-0.5">
                          {activeSes.subjectName || matchedSub?.name || 'Sesi Kuliah'} • Pensyarah: <strong className="text-white">{activeSes.lecturerName || matchedSub?.lecturerName}</strong>
                        </p>
                      </div>

                      {/* Real Progress Bar */}
                      <div className="pt-2 max-w-md space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 font-bold">
                            <strong className="text-emerald-400 text-sm">{presentCount}</strong> / {targetClassCount} Pelajar Hadir
                          </span>
                          <span className="text-emerald-400 font-mono font-bold text-xs">
                            {percent}%
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right: Primary Single Dominant Action + Secondary Contextual Controls */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800/80">
                      <button
                        id={`btn-live-resume-scan-${activeSes.id}`}
                        onClick={() => onOpenScannerForSession(activeSes.id)}
                        className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                      >
                        <QrCode className="w-4 h-4 text-slate-950" />
                        <span>SAMBUNG KEHADIRAN</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          id={`btn-live-projector-${activeSes.id}`}
                          onClick={() => setProjectorSession(activeSes)}
                          className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          title="Papar kod QR sesi di projektor kelas"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span>Projektor</span>
                        </button>

                        <button
                          id={`btn-live-close-${activeSes.id}`}
                          onClick={() => onSetSessionStatus(activeSes.id, 'CLOSED')}
                          className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-500/30 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          title="Tutup sesi kelas ini"
                        >
                          <Square className="w-3.5 h-3.5" />
                          <span>Tutup Sesi</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================
          LECTURER PERSONAL FILTER & SCOPE BANNER
          ======================================================== */}
      {activeLecturer && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-white">Paparan Khusus Pensyarah:</span>
                <span className="text-xs font-black text-indigo-300 font-mono bg-indigo-900/60 px-2 py-0.5 rounded border border-indigo-500/30">
                  {activeLecturer.name}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {subjectViewScope === 'MY_SUBJECTS'
                  ? `Memaparkan ${scopedSubjects.length} subjek pengajaran anda sahaja (by individu) bagi memudahkan capaian sesi kuliah.`
                  : `Memaparkan katalog keseluruhan (${subjects.length} subjek) kolej.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center flex-wrap">
            <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-xl border border-slate-750/80 shadow-inner">
              <button
                type="button"
                id="btn-scope-my-subjects"
                onClick={() => setSubjectViewScope('MY_SUBJECTS')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  subjectViewScope === 'MY_SUBJECTS'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <BookMarked className="w-3.5 h-3.5 text-indigo-200" />
                <span>Subjek Saya ({myAssignedCodes.size})</span>
              </button>
              <button
                type="button"
                id="btn-scope-all-subjects"
                onClick={() => setSubjectViewScope('ALL_SUBJECTS')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  subjectViewScope === 'ALL_SUBJECTS'
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                <span>Semua Subjek ({subjects.length})</span>
              </button>
            </div>

            <button
              type="button"
              id="btn-open-manage-subjects-from-event-view"
              onClick={() => setIsManageSubjectsModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Pilih atau tetapkan subjek pengajaran anda"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Pilih / Urus Subjek</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          LEVEL 2-4: SUBJECTS LIST WITH PROGRESSIVE DISCLOSURE
          ======================================================== */}
      <div className="space-y-4">
        {filteredSubjects.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/60 rounded-2xl border border-slate-800 p-6 flex flex-col items-center justify-center space-y-3">
            <BookOpen className="w-10 h-10 text-indigo-500/40" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">
                {activeLecturer && subjectViewScope === 'MY_SUBJECTS'
                  ? `Tiada Subjek Ditugaskan untuk ${activeLecturer.name}`
                  : 'Tiada Subjek Dijumpai'}
              </h4>
              <p className="text-xs text-slate-400 max-w-md">
                {activeLecturer && subjectViewScope === 'MY_SUBJECTS'
                  ? 'Anda belum menetapkan subjek pengajaran bagi semester ini. Klik butang di bawah untuk memilih subjek yang anda ajar daripada senarai master kolej.'
                  : 'Gunakan butang "Daftar Subjek Baharu" di bahagian atas untuk mula mendaftarkan subjek dan membuka sesi kuliah.'}
              </p>
            </div>
            {activeLecturer && subjectViewScope === 'MY_SUBJECTS' && (
              <button
                type="button"
                onClick={() => setIsManageSubjectsModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Pilih Subjek Pengajaran Anda Sekarang
              </button>
            )}
          </div>
        ) : (
          filteredSubjects.map((subject) => {
            const subjectSessions = sortSessionsLatestFirst(
              sessions.filter(
                (s) => s.subjectId === subject.id || s.activityId === subject.id
              )
            );

            // Separate into Active, Next/Available, and Past Sessions
            const activeInSub = subjectSessions.filter((s) => s.status === 'OPEN');
            const nonActiveInSub = subjectSessions.filter((s) => s.status !== 'OPEN');
            const nextSession = nonActiveInSub[0] || null;
            const pastSessions = nonActiveInSub.slice(1);
            const isPastExpanded = expandedPastSubjects[subject.id] || false;

            // Calculate total students in subject's assigned classes
            const totalSubjectStudents = (subject.sections || []).reduce(
              (acc, sec) => acc + (studentCountByClass[sec.toUpperCase()] || 0),
              0
            );

            // Self-registered enrollments via QR
            const subjectEnrCount = activeEnrollments.filter(
              (e) => e.subjectCode.toUpperCase() === subject.code.toUpperCase() && e.status !== 'DROPPED'
            ).length;

            return (
              <div
                key={subject.id}
                className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-lg"
              >
                {/* ========================================================
                    MAIN KATEGORI: SUBJEK / KURSUS UTAMA
                    ======================================================== */}
                <div className="p-5 sm:p-6 bg-gradient-to-r from-indigo-950/90 via-slate-900 to-slate-900 border-b-2 border-indigo-500/40 flex flex-col md:flex-row md:items-center justify-between gap-5 relative">
                  <div className="space-y-2 flex-1">
                    {/* Main Category Identifier Badge */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-mono font-black px-3 py-1 rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
                        {subject.code}
                      </span>
                      <span className="text-xs font-semibold text-slate-300 bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-700">
                        {subject.department || 'Jabatan Perakaunan'}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                        {subject.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-300 mt-1 flex flex-wrap items-center gap-2">
                        <span>Pensyarah: <strong className="text-white font-bold">{subject.lecturerName}</strong></span>
                        <span className="text-slate-600">•</span>
                        <span>Kelas: <strong className="text-indigo-300 font-bold">{(subject.sections || []).join(', ') || 'Semua'}</strong> ({totalSubjectStudents} Pelajar)</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400 font-medium">{subjectSessions.length} Sesi Terjadual</span>
                      </p>
                    </div>
                  </div>

                  {/* Level 4: Subject Management Actions (Clean Button Hierarchy) */}
                  <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0">
                    {/* Primary Action for this Subject: Add a new session schedule */}
                    <button
                      id={`btn-add-session-${subject.id}`}
                      onClick={() => handleOpenAddSession(subject.id)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all cursor-pointer active:scale-95 border border-indigo-500/50"
                      title="Cipta & jadualkan sesi kuliah/amali baharu untuk subjek ini"
                    >
                      <CalendarPlus className="w-3.5 h-3.5 text-indigo-200" />
                      <span>+ Jadualkan Sesi</span>
                    </button>

                    {/* Secondary: Enrolled Students List */}
                    <button
                      id={`btn-view-enrolled-${subject.id}`}
                      onClick={() => {
                        setEnrolledModalSubject(subject);
                        setEnrolledModalClass('ALL');
                        setIsEnrolledModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
                      title="Lihat senarai pelajar berdaftar bagi subjek ini"
                    >
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{subjectEnrCount > 0 ? `${subjectEnrCount} Daftar QR` : 'Senarai Pelajar'}</span>
                    </button>

                    {/* Secondary: Generate QR */}
                    <button
                      id={`btn-qr-enroll-subject-${subject.id}`}
                      onClick={() => {
                        setQrModalSubject(subject);
                        setQrModalClass(subject.sections?.[0] || 'DIA_4A');
                        setIsGenerateQRModalOpen(true);
                      }}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition-all cursor-pointer"
                      title="Jana Kod QR Pendaftaran Pelajar"
                    >
                      <QrCode className="w-4 h-4 text-indigo-400" />
                    </button>

                    {/* Destructive / Subdued: Delete Subject (Only visible for Admin / Lecturer) */}
                    {(isAdmin || activeLecturer) && (
                      <button
                        id={`btn-delete-subject-${subject.id}`}
                        onClick={() => handleDeleteSubjectClick(subject)}
                        className="p-2.5 rounded-xl bg-slate-950/60 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 border border-slate-800/80 hover:border-rose-500/30 text-xs transition-all cursor-pointer"
                        title="Padam Maklumat Subjek Ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* ========================================================
                    SUB-KATEGORI: SESI & JADUAL KULIAH
                    ======================================================== */}
                <div className="p-4 sm:p-5 bg-slate-950/60 space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      <span>SESI & JADUAL KELAS</span>
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {subjectSessions.length} sesi dicipta
                    </span>
                  </div>
                  {subjectSessions.length === 0 ? (
                    <div className="p-6 rounded-xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-3">
                      <div className="w-9 h-9 mx-auto rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <Play className="w-4 h-4 fill-emerald-400/20 text-emerald-400 ml-0.5" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-slate-300">
                          Belum ada sesi kuliah atau amali dibuka bagi subjek ini.
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Mulakan sesi pertama sekarang untuk jana rekod kehadiran dan imbasan QR.
                        </p>
                      </div>
                      <button
                        id={`btn-empty-start-session-${subject.id}`}
                        onClick={() => handleOpenAddSession(subject.id)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 hover:text-emerald-200 border border-emerald-500/40 hover:border-emerald-400/60 text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
                        title="Buka dan mulakan sesi kuliah pertama bagi subjek ini"
                      >
                        <Play className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
                        <span>Buka Sesi Kuliah Pertama</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Active Sessions Inside this Subject */}
                      {activeInSub.map((session) => {
                        const count = attendanceRecords.filter(
                          (r) => r.sessionId === session.id && r.status === 'PRESENT'
                        ).length;
                        const classTarget = session.className && session.className !== 'ALL'
                          ? (studentCountByClass[session.className.toUpperCase()] || 0)
                          : totalSubjectStudents || availableStudents.length;

                        return (
                          <div
                            key={session.id}
                            className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                  🔴 LIVE SEKARANG
                                </span>
                                {session.className && (
                                  <span className="text-[11px] font-bold text-slate-300">
                                    Kelas {session.className}
                                  </span>
                                )}
                              </div>
                              <h4 className="text-sm font-bold text-white">
                                {session.sessionName}
                              </h4>
                              <div className="text-xs text-slate-400">
                                Kehadiran: <strong className="text-emerald-400">{count} / {classTarget} Hadir</strong>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                              <button
                                onClick={() => onOpenScannerForSession(session.id)}
                                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                                <span>Sambung Imbas</span>
                              </button>
                              <button
                                onClick={() => onSetSessionStatus(session.id, 'CLOSED')}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 text-xs font-medium border border-slate-700 transition-all cursor-pointer"
                              >
                                Tutup Sesi
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* LEVEL 2: NEXT AVAILABLE SESSION */}
                      {nextSession && (
                        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                                TERJADUAL
                              </span>
                              {nextSession.className && (
                                <span className="text-[11px] font-semibold text-slate-300">
                                  Kelas {nextSession.className}
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-bold text-white">
                              {nextSession.sessionName}
                            </h4>
                            <div className="text-xs text-slate-400">
                              Status: Sedia untuk diimbas • Sasaran: {nextSession.className && nextSession.className !== 'ALL' ? (studentCountByClass[nextSession.className.toUpperCase()] || 0) : totalSubjectStudents} Pelajar
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                            <button
                              id={`btn-open-session-${nextSession.id}`}
                              onClick={() => onSetSessionStatus(nextSession.id, 'OPEN')}
                              className="p-2 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 transition-all flex items-center justify-center cursor-pointer shadow-sm active:scale-95"
                              title="Mula imbasan kehadiran"
                              aria-label="Mula imbasan kehadiran"
                            >
                              <Play className="w-4 h-4 fill-current" />
                            </button>
                            {(isAdmin || activeLecturer) && (
                              <button
                                onClick={() => handleDeleteSessionClick(nextSession)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-all cursor-pointer"
                                title="Padam sesi ini"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* LEVEL 3: OTHER / PAST SESSIONS (COMPACT PRESENTATION WITH PROGRESSIVE DISCLOSURE) */}
                      {pastSessions.length > 0 && (
                        <div className="pt-2 border-t border-slate-800/80 space-y-2">
                          <button
                            type="button"
                            onClick={() => togglePastSessions(subject.id)}
                            className="text-xs font-semibold text-slate-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors cursor-pointer py-1"
                          >
                            <span>Sesi Terdahulu / Jadual Lain ({pastSessions.length})</span>
                            {isPastExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {isPastExpanded && (
                            <div className="space-y-1.5 pt-1">
                              {pastSessions.map((session) => {
                                const count = attendanceRecords.filter(
                                  (r) => r.sessionId === session.id && r.status === 'PRESENT'
                                ).length;
                                const classTarget = session.className && session.className !== 'ALL'
                                  ? (studentCountByClass[session.className.toUpperCase()] || 0)
                                  : totalSubjectStudents || availableStudents.length;

                                return (
                                  <div
                                    key={session.id}
                                    className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/60 flex items-center justify-between gap-3 text-xs"
                                  >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                                        {session.className || 'ALL'}
                                      </span>
                                      <span className="font-semibold text-slate-300 truncate">
                                        {session.sessionName}
                                      </span>
                                      <span className="text-slate-500 text-[11px] shrink-0">
                                        {count > 0 ? `${count} / ${classTarget} Hadir` : 'Belum berlangsung'}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <button
                                        onClick={() => onSetSessionStatus(session.id, 'OPEN')}
                                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white text-[11px] font-semibold transition-all cursor-pointer"
                                        title="Aktifkan sesi ini dan mula imbasan"
                                      >
                                        Mula Imbas
                                      </button>
                                      {(isAdmin || activeLecturer) && (
                                        <button
                                          onClick={() => handleDeleteSessionClick(session)}
                                          className="p-1 text-slate-500 hover:text-rose-400 transition-all cursor-pointer"
                                          title="Padam sesi ini"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE SUBJECT MODAL */}
      {isCreateSubjectOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <span>Daftar Subjek & Kelas Baharu</span>
              </h3>
              <button
                onClick={() => setIsCreateSubjectOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSubject} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="text-xs font-semibold text-slate-300">Kod Subjek *</label>
                  <input
                    type="text"
                    required
                    placeholder="cth: FAR210"
                    value={newSubCode}
                    onChange={(e) => setNewSubCode(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono uppercase font-bold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-300">Nama Subjek / Kursus *</label>
                  <input
                    type="text"
                    required
                    placeholder="cth: Financial Accounting 2"
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Pensyarah Mengajar *</label>
                <select
                  value={newSubLecturer}
                  onChange={(e) => setNewSubLecturer(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {availableLecturers.map((lec) => (
                    <option key={lec.id} value={lec.name}>
                      {lec.name} {lec.role === 'ADMIN' ? '(Pentadbir)' : ''} - {lec.department || 'Pensyarah'}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Dipilih terus daripada senarai pensyarah berdaftar dalam pangkalan data.
                </p>
              </div>

              {/* Section Toggles (Only classes with actual student data in database) */}
              <div>
                {classesWithData.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-amber-300">
                          Tiada Data Kelas Pelajar Dijumpai
                        </div>
                        <p className="text-[11px] leading-relaxed text-slate-300">
                          Sebelum mendaftarkan subjek baharu, pensyarah/pentadbir perlu memuat naik senarai data pelajar mengikut kelas terlebih dahulu melalui fail CSV di tab <strong>Pangkalan Data</strong>.
                        </p>
                      </div>
                    </div>
                    {onOpenCSVImport && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreateSubjectOpen(false);
                          onOpenCSVImport();
                        }}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Muat Naik CSV Data Pelajar Sekarang</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-300">
                        Kelas Terlibat (Mempunyai Data Pelajar) *
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {newSubSections.length} kelas dipilih
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {classesWithData.map((sec) => {
                        const isSelected = newSubSections.includes(sec);
                        const count = studentCountByClass[sec] || 0;
                        return (
                          <button
                            key={`new-sub-sec-${sec}`}
                            type="button"
                            onClick={() => toggleSectionSelect(sec)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/50'
                                : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <span>Kelas {sec}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                                isSelected
                                  ? 'bg-indigo-900/80 text-indigo-100'
                                  : 'bg-slate-800 text-emerald-400'
                              }`}
                            >
                              {count} Pelajar
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                      <span>💡 Sila daftarkan pelajar dahulu sebelum pilihan Kelas boleh muncul di sini.</span>
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Catatan Tambahan (Tidak Wajib)</label>
                <textarea
                  rows={2}
                  placeholder="Catatan kursus atau silibus..."
                  value={newSubDesc}
                  onChange={(e) => setNewSubDesc(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateSubjectOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={classesWithData.length === 0 || newSubSections.length === 0}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all ${
                    classesWithData.length === 0 || newSubSections.length === 0
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 cursor-pointer'
                  }`}
                >
                  Daftar Subjek
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE SESSION MODAL */}
      {isCreateSessionOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Cipta & Jadualkan Sesi Kuliah Baharu</h3>
                <p className="text-xs text-slate-400">
                  Subjek: {subjects.find((s) => s.id === selectedSubjectId)?.code} - {subjects.find((s) => s.id === selectedSubjectId)?.name}
                </p>
              </div>
              <button
                onClick={() => setIsCreateSessionOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSession} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300">Nama Sesi Kelas *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kuliah Minggu 3 / Tutorial Bab 2"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Kelas Sasaran *</label>
                <select
                  value={newSessionClass}
                  onChange={(e) => setNewSessionClass(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer font-medium"
                >
                  {/* Prioritize sections assigned to selected subject, then all available sections with student data */}
                  {Array.from(new Set([
                    ...(subjects.find((s) => s.id === selectedSubjectId)?.sections || []),
                    ...classesWithData
                  ])).map((sec) => (
                    <option key={`session-target-class-${sec}`} value={sec}>
                      Kelas {sec} {studentCountByClass[sec] ? `(${studentCountByClass[sec]} Pelajar)` : ''}
                    </option>
                  ))}
                  <option value="ALL">Semua Kelas (Gabungan)</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px]">
                💡 Sesi kelas ini akan dicipta serta-merta dan sedia untuk diimbas oleh pelajar bagi kelas yang dipilih.
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateSessionOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  Simpan & Cipta Sesi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROJECTOR / BIG SCREEN QR MODAL */}
      {projectorSession && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-8 shadow-2xl text-center space-y-6 text-white">
            <div className="flex justify-end">
              <button
                onClick={() => setProjectorSession(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/20 text-indigo-300 font-bold">
                KOD QR KEHADIRAN KELAS
              </span>
              <h3 className="text-xl font-extrabold text-white tracking-tight mt-2">
                {projectorSession.sessionName}
              </h3>
              <p className="text-xs text-slate-400">
                {projectorSession.subjectName || projectorSession.activityName} {projectorSession.className ? ` • Kelas ${projectorSession.className}` : ''}
              </p>
            </div>

            {/* BIG QR CODE */}
            <div className="p-6 rounded-2xl bg-white flex items-center justify-center inline-block shadow-2xl mx-auto">
              <QRCodeSVG
                value={`SESSION|${projectorSession.id}`}
                size={220}
                level="H"
                includeMargin={false}
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Halakan Kamera Aplikasi Untuk Imbas Kehadiran
              </div>
              <p className="text-[11px] text-slate-400">
                Pelajar imbas QR di atas, atau pensyarah imbas QR pada kad pelajar.
              </p>
            </div>

            <button
              onClick={() => {
                onOpenScannerForSession(projectorSession.id);
                setProjectorSession(null);
              }}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              Buka Kamera Pengimbas Sesi Ini
            </button>
          </div>
        </div>
      )}

      {/* LECTURER GENERATE CLASS ENROLLMENT QR MODAL */}
      <GenerateEnrollmentQRModal
        isOpen={isGenerateQRModalOpen}
        onClose={() => setIsGenerateQRModalOpen(false)}
        subjects={subjects}
        initialSubject={qrModalSubject}
        initialClass={qrModalClass}
        activeLecturer={activeLecturer}
        enrollments={activeEnrollments}
        students={availableStudents}
        onOpenSelfRegistrationTest={(context) => {
          setIsGenerateQRModalOpen(false);
          if (onOpenSelfRegistrationTest) {
            onOpenSelfRegistrationTest(context);
          }
        }}
      />

      {/* VIEW & MANAGE ENROLLED STUDENTS MODAL */}
      <EnrolledStudentsModal
        isOpen={isEnrolledModalOpen}
        onClose={() => setIsEnrolledModalOpen(false)}
        subject={enrolledModalSubject}
        className={enrolledModalClass}
        enrollments={activeEnrollments}
        students={availableStudents}
        onOpenGenerateQR={(subj, cls) => {
          setIsEnrolledModalOpen(false);
          setQrModalSubject(subj);
          if (cls) setQrModalClass(cls);
          setIsGenerateQRModalOpen(true);
        }}
      />

      {/* LECTURER MANAGE SUBJECTS MODAL */}
      {activeLecturer && (
        <LecturerManageSubjectsModal
          isOpen={isManageSubjectsModalOpen}
          onClose={() => setIsManageSubjectsModalOpen(false)}
          lecturer={activeLecturer}
          allSubjects={subjects}
          onSaved={() => {
            setIsManageSubjectsModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
