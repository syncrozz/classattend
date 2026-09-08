import React, { useState } from 'react';
import {
  Lecturer,
  Subject,
  AttendanceSession,
  AttendanceRecord,
  Student,
  TeachingAssignment,
  ScanResult
} from '../types';
import {
  BookOpen,
  QrCode,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Plus,
  Layers,
  CalendarCheck,
  Search,
  FileSpreadsheet,
  AlertCircle,
  ExternalLink,
  GraduationCap,
  Play,
  Download,
  HardDrive,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { soundService } from '../services/soundService';
import { getClassBadgeColor, getInitials, getStudentColor } from '../utils/studentUtils';
import {
  exportScannedAttendeesOnlyToCSV,
  exportAllAttendanceRecordsToCSV,
  generateAttendanceBackupJSON,
  downloadCSV,
  downloadJSON
} from '../utils/csvHelper';
import { StartAttendanceModal } from './StartAttendanceModal';
import { LecturerManageSubjectsModal } from './LecturerManageSubjectsModal';

interface LecturerWorkspaceViewProps {
  activeLecturer?: Lecturer | null;
  lecturer?: Lecturer | null;
  isAdmin?: boolean;
  subjects: Subject[];
  sessions: AttendanceSession[];
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  teachingAssignments: TeachingAssignment[];
  onOpenScanner: () => void;
  onGoToActivities: () => void;
  onGoToStudents?: () => void;
  onGoToReports: () => void;
  onGoToGuide?: () => void;
  onCloseActiveSession: (sessionId: string) => void;
  onQuickSimulateScan?: (studentId: string) => ScanResult;
  onCreateSession?: (session: AttendanceSession) => void;
  onStartSessionForClass?: (subjectCode: string, subjectName: string, className: string) => void;
  onSwitchToAdminMode?: () => void;
}

export const LecturerWorkspaceView: React.FC<LecturerWorkspaceViewProps> = ({
  activeLecturer,
  lecturer: propLecturer,
  isAdmin = false,
  subjects,
  sessions,
  students,
  attendanceRecords,
  teachingAssignments,
  onOpenScanner,
  onGoToActivities,
  onGoToStudents,
  onGoToReports,
  onGoToGuide,
  onCloseActiveSession,
  onQuickSimulateScan,
  onCreateSession,
  onStartSessionForClass,
  onSwitchToAdminMode
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [backupToast, setBackupToast] = useState<string | null>(null);
  const [startModalContext, setStartModalContext] = useState<{
    subjectCode: string;
    subjectName: string;
    className: string;
    studentCount: number;
    availableClasses: string[];
  } | null>(null);
  const [selectedClassMap, setSelectedClassMap] = useState<Record<string, string>>({});
  const [isManageSubjectsModalOpen, setIsManageSubjectsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'READY' | 'RUNNING'>('ALL');
  const [expandedCodes, setExpandedCodes] = useState<Record<string, boolean>>({});

  const toggleExpand = (subjectCode: string) => {
    soundService.playClick();
    setExpandedCodes((prev) => ({
      ...prev,
      [subjectCode]: !prev[subjectCode]
    }));
  };

  // Resolve current active lecturer with safe fallback
  const lecturer: Lecturer = activeLecturer || propLecturer || {
    id: 'LEC-ACTIVE',
    name: 'PENSYARAH KPM',
    email: 'pensyarah@bpenawar.kpm.edu.my',
    icNumber: '861115-01-5305',
    pin: '5305',
    department: 'Jabatan Perakaunan',
    role: 'LECTURER',
    status: 'ACTIVE',
    assignedClasses: ['DIA_4A', 'DIA_4B'],
    assignedSubjects: ['FAR210 - Financial Accounting 2']
  };

  // 1. Filter teaching assignments for this lecturer
  const myAssignments = teachingAssignments.filter(
    (ta) =>
      ta.lecturerId === lecturer.id ||
      ta.lecturerEmail?.toLowerCase() === lecturer.email.toLowerCase() ||
      ta.lecturerName?.toLowerCase().includes(lecturer.name.toLowerCase())
  );

  // Group assignments by Subject Code
  const mySubjectsMap = new Map<string, { subjectCode: string; subjectName: string; classes: string[] }>();

  myAssignments.forEach((ta) => {
    const code = ta.subjectCode.toUpperCase();
    if (!mySubjectsMap.has(code)) {
      mySubjectsMap.set(code, {
        subjectCode: code,
        subjectName: ta.subjectName,
        classes: [ta.className]
      });
    } else {
      const existing = mySubjectsMap.get(code)!;
      if (!existing.classes.includes(ta.className)) {
        existing.classes.push(ta.className);
      }
    }
  });

  // Fallback: If no teaching assignments table records, derive from lecturer.assignedSubjects & assignedClasses
  if (mySubjectsMap.size === 0) {
    const defaultClasses = lecturer.assignedClasses && lecturer.assignedClasses.length > 0 ? lecturer.assignedClasses : ['DIA_4A'];
    (lecturer.assignedSubjects || []).forEach((sub) => {
      const code = sub.includes('-') ? sub.split('-')[0].trim().toUpperCase() : sub.trim().toUpperCase();
      const name = sub.includes('-') ? sub.split('-')[1].trim() : sub;
      mySubjectsMap.set(code, {
        subjectCode: code,
        subjectName: name,
        classes: defaultClasses
      });
    });
  }

  const mySubjectsList = Array.from(mySubjectsMap.values());
  const myClassNamesSet = new Set<string>();
  mySubjectsList.forEach((s) => s.classes.forEach((c) => myClassNamesSet.add(c.toUpperCase())));

  // Dynamic counts for top control bar
  const countAllSubjects = mySubjectsList.length;
  const countRunningSubjects = mySubjectsList.filter((sub) =>
    sessions.some(
      (s) =>
        s.status === 'OPEN' &&
        (s.subjectCode || '').toUpperCase() === sub.subjectCode.toUpperCase()
    )
  ).length;
  const countReadySubjects = countAllSubjects - countRunningSubjects;

  // Filter subjects by search and status
  const filteredSubjectsList = mySubjectsList.filter((sub) => {
    if (searchFilter.trim()) {
      const q = searchFilter.trim().toLowerCase();
      const matchCode = sub.subjectCode.toLowerCase().includes(q);
      const matchName = sub.subjectName.toLowerCase().includes(q);
      const matchClass = sub.classes.some((c) => c.toLowerCase().includes(q));
      if (!matchCode && !matchName && !matchClass) {
        return false;
      }
    }

    const isRunning = sessions.some(
      (s) =>
        s.status === 'OPEN' &&
        (s.subjectCode || '').toUpperCase() === sub.subjectCode.toUpperCase()
    );

    if (statusFilter === 'RUNNING') return isRunning;
    if (statusFilter === 'READY') return !isRunning;
    return true;
  });

  // 2. Active Session for this Lecturer's classes or opened by this Lecturer
  const activeSession = sessions.find((s) => {
    if (s.status !== 'OPEN') return false;
    const sessionClass = (s.className || '').toUpperCase();
    const sessionSubCode = (s.subjectCode || '').toUpperCase();
    const matchClass = !sessionClass || sessionClass === 'ALL' || myClassNamesSet.has(sessionClass);
    const matchSub = !sessionSubCode || mySubjectsMap.has(sessionSubCode);
    const matchLecturer = (s.lecturerEmail && s.lecturerEmail.toLowerCase() === lecturer.email.toLowerCase()) ||
                          (s.lecturerName && s.lecturerName.toLowerCase().includes(lecturer.name.toLowerCase()));
    return matchLecturer || (matchClass && matchSub);
  }) || null;

  // Active session stats
  const activeSessionRecords = activeSession
    ? attendanceRecords.filter((r) => r.sessionId === activeSession.id && r.status === 'PRESENT')
    : [];

  const targetStudentsForActive = activeSession
    ? activeSession.className && activeSession.className !== 'ALL'
      ? students.filter((s) => s.className.toUpperCase() === activeSession.className?.toUpperCase())
      : students.filter((s) => myClassNamesSet.has(s.className.toUpperCase()))
    : [];

  const activePercent =
    targetStudentsForActive.length > 0
      ? Math.round((activeSessionRecords.length / targetStudentsForActive.length) * 100)
      : 0;

  // 3. Filter recent records for my classes/subjects
  const myRecentRecords = attendanceRecords
    .filter((r) => {
      const st = students.find((s) => s.id === r.studentId);
      if (!st) return false;
      const classMatch = myClassNamesSet.has(st.className.toUpperCase());
      const session = sessions.find((sess) => sess.id === r.sessionId);
      const subMatch = session?.subjectCode && mySubjectsMap.has(session.subjectCode.toUpperCase());
      return classMatch || subMatch;
    })
    .slice(-10)
    .reverse();

  return (
    <div id="lecturer-workspace" className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Lecturer Workspace Greeting Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Ruang Kerja Pensyarah</span>
            </div>
            <h1 id="lecturer-greeting-heading" className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Hi, {lecturer.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 flex items-center gap-2">
              <span>{lecturer.department || 'Jabatan Perakaunan'}</span>
              <span className="text-slate-500">•</span>
              <span className="text-indigo-400 font-mono">{lecturer.email}</span>
            </p>
          </div>

          {/* Quick Action to Start or View Sessions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-workspace-open-scanner"
              onClick={onOpenScanner}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <QrCode className="w-4 h-4" />
              <span>Buka Pengimbas</span>
            </button>
            <button
              type="button"
              id="btn-workspace-new-session"
              onClick={onGoToActivities}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Sesi Baharu</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Active Class / Attendance Banner */}
      {activeSession ? (
        <div
          id="lecturer-active-session-card"
          className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border-2 border-emerald-500/60 shadow-2xl shadow-emerald-950/50 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
                    {activeSession.subjectCode || 'SUBJEK'}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-bold">
                    Kelas {activeSession.className || 'Semua'}
                  </span>
                  <span className="text-[10px] uppercase font-extrabold text-emerald-400 tracking-wider">
                    SEDANG BERLANGSUNG (LIVE)
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1">
                  {activeSession.sessionName}
                </h3>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                id="btn-workspace-backup-active-csv"
                onClick={() => {
                  const csvContent = exportScannedAttendeesOnlyToCSV(activeSession, students, attendanceRecords);
                  const dateStr = activeSession.date || new Date().toISOString().split('T')[0];
                  const subStr = (activeSession.subjectCode || activeSession.sessionName || 'Kelas').replace(/[\s/]/g, '_');
                  downloadCSV(csvContent, `Backup_Kehadiran_${subStr}_${dateStr}.csv`);
                  setBackupToast(`Backup CSV (${activeSessionRecords.length} pelajar hadir) berjaya dimuat turun!`);
                  setTimeout(() => setBackupToast(null), 4000);
                }}
                disabled={activeSessionRecords.length === 0}
                className="px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Backup rekod pelajar hadir sesi ini (.CSV)"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Backup CSV</span>
              </button>

              <button
                type="button"
                id="btn-workspace-continue-attendance"
                onClick={onOpenScanner}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <QrCode className="w-4 h-4" />
                <span>MULA / SAMBUNG KEHADIRAN</span>
              </button>
              <button
                type="button"
                onClick={() => onCloseActiveSession(activeSession.id)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
                title="Tutup sesi kelas ini"
              >
                Tutup Sesi
              </button>
            </div>
          </div>

          {/* Progress Bar & Stats */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-300">
                Kehadiran: <strong className="text-emerald-400">{activeSessionRecords.length}</strong> / {targetStudentsForActive.length} Pelajar Hadir
              </span>
              <span className="text-emerald-400 font-mono font-bold text-sm">
                {activePercent}%
              </span>
            </div>
            <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, activePercent)}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Tiada Sesi Kehadiran Sedang Dibuka</h3>
              <p className="text-xs text-slate-400">
                Pilih subjek di bawah atau klik butang untuk memulakan sesi kelas hari ini.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onGoToActivities}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Mula Sesi Kelas Baharu</span>
          </button>
        </div>
      )}

      {/* 3. Subjek & Seksyen Kelas Ditugaskan (RC ZONE-Style Operational List) */}
      <div className="space-y-3">
        {/* Section Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Subjek & Kelas ({mySubjectsList.length})
            </h2>
          </div>
          {mySubjectsList.length > 0 && (
            <div className="text-xs text-slate-400">
              Menunjukkan <span className="font-bold text-white">{filteredSubjectsList.length}</span> daripada {mySubjectsList.length} subjek
            </div>
          )}
        </div>

        {/* RC ZONE-Style Control Bar (Filters + Search) */}
        {mySubjectsList.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => {
                  soundService.playClick();
                  setStatusFilter('ALL');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer select-none whitespace-nowrap ${
                  statusFilter === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span>ALL SUBJECTS</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                  statusFilter === 'ALL' ? 'bg-indigo-700/80 text-white' : 'bg-slate-900 text-slate-400'
                }`}>
                  {countAllSubjects}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundService.playClick();
                  setStatusFilter('READY');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer select-none whitespace-nowrap ${
                  statusFilter === 'READY'
                    ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/30'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                <span>READY</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                  statusFilter === 'READY' ? 'bg-teal-700/80 text-white' : 'bg-slate-900 text-slate-400'
                }`}>
                  {countReadySubjects}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundService.playClick();
                  setStatusFilter('RUNNING');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer select-none whitespace-nowrap ${
                  statusFilter === 'RUNNING'
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>RUNNING</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                  statusFilter === 'RUNNING' ? 'bg-emerald-700/80 text-white' : 'bg-slate-900 text-slate-400'
                }`}>
                  {countRunningSubjects}
                </span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Cari subjek / kod / kelas..."
                className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              {searchFilter && (
                <button
                  type="button"
                  onClick={() => setSearchFilter('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        )}

        {/* Operational List / Table Body */}
        {mySubjectsList.length > 0 ? (
          filteredSubjectsList.length > 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-lg divide-y divide-slate-800/80">
              {/* Desktop Table Header */}
              <div className="hidden lg:grid grid-cols-12 gap-3 px-4 py-3 bg-slate-950/90 text-[11px] font-bold text-slate-400 uppercase tracking-wider items-center border-b border-slate-800">
                <div className="col-span-2">KOD SUBJEK</div>
                <div className="col-span-4">SUBJEK / KURSUS</div>
                <div className="col-span-2">KELAS</div>
                <div className="col-span-1 text-center">PELAJAR</div>
                <div className="col-span-1 text-center">STATUS</div>
                <div className="col-span-2 text-right">TINDAKAN</div>
              </div>

              {/* Subject Operational Rows */}
              {filteredSubjectsList.map((sub) => {
                const enrolledCount = students.filter((st) =>
                  sub.classes.some((c) => c.toUpperCase() === st.className.toUpperCase())
                ).length;
                const rawClasses = Array.from(new Set(sub.classes || []));
                const currentSelectedClass = selectedClassMap[sub.subjectCode] || (rawClasses.length > 0 ? rawClasses[0] : 'ALL');
                const selectedClassStudentCount = currentSelectedClass === 'ALL'
                  ? students.filter((st) =>
                      rawClasses.some((c) => c.toUpperCase() === st.className?.toUpperCase())
                    ).length
                  : students.filter(
                      (st) => st.className?.toUpperCase() === currentSelectedClass.toUpperCase()
                    ).length;

                const isRunning = sessions.some(
                  (s) =>
                    s.status === 'OPEN' &&
                    (s.subjectCode || '').toUpperCase() === sub.subjectCode.toUpperCase()
                );
                const isExpanded = Boolean(expandedCodes[sub.subjectCode]);

                return (
                  <div
                    key={sub.subjectCode}
                    className="transition-colors hover:bg-slate-800/20"
                  >
                    {/* Desktop View Row: lg:grid */}
                    <div className="hidden lg:grid grid-cols-12 gap-3 px-4 py-3.5 items-center">
                      {/* 1. Kod Subjek */}
                      <div className="col-span-2 flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-600/90 text-white font-mono font-black text-xs shadow-sm tracking-wide border border-indigo-500/40">
                          {sub.subjectCode}
                        </span>
                      </div>

                      {/* 2. Subjek / Kursus */}
                      <div className="col-span-4 min-w-0 pr-2">
                        <h4 className="text-sm font-bold text-white truncate" title={sub.subjectName}>
                          {sub.subjectName}
                        </h4>
                        <div className="text-[11px] text-slate-400">
                          {rawClasses.length > 1 ? `${rawClasses.length} Kelas` : '1 Kelas'}
                        </div>
                      </div>

                      {/* 3. Kelas */}
                      <div className="col-span-2 flex items-center gap-1.5">
                        {rawClasses.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => toggleExpand(sub.subjectCode)}
                            className={`group/cls inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                              currentSelectedClass === 'ALL'
                                ? 'bg-amber-500/15 text-amber-200 border-amber-500/40 hover:bg-amber-500/25'
                                : 'bg-teal-500/15 text-teal-200 border-teal-500/40 hover:bg-teal-500/25'
                            }`}
                            title="Klik untuk memilih kelas sasaran lain"
                          >
                            <span className="font-mono">
                              {currentSelectedClass === 'ALL' ? 'SEMUA KELAS' : currentSelectedClass.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({rawClasses.length})
                            </span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 text-slate-400 group-hover/cls:text-white transition-transform ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 text-xs font-mono font-bold">
                            {rawClasses[0] ? rawClasses[0].replace('_', ' ') : '-'}
                          </span>
                        )}
                      </div>

                      {/* 4. Pelajar */}
                      <div className="col-span-1 text-center">
                        <span className="text-xs font-mono font-bold text-slate-200">
                          {selectedClassStudentCount}
                        </span>
                        {rawClasses.length > 1 && currentSelectedClass !== 'ALL' && (
                          <span className="text-[10px] text-slate-500 block font-normal font-mono">
                            /{enrolledCount}
                          </span>
                        )}
                      </div>

                      {/* 5. Status */}
                      <div className="col-span-1 flex items-center justify-center">
                        {isRunning ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span>RUNNING</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-teal-300 text-[11px] font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                            <span>READY</span>
                          </span>
                        )}
                      </div>

                      {/* 6. Tindakan */}
                      <div className="col-span-2 flex items-center justify-end gap-1.5">
                        {rawClasses.length > 1 && (
                          <button
                            type="button"
                            onClick={() => toggleExpand(sub.subjectCode)}
                            className={`w-8 h-8 rounded-xl border transition-colors flex items-center justify-center cursor-pointer shrink-0 ${
                              isExpanded
                                ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300'
                                : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                            }`}
                            title={isExpanded ? 'Tutup pemilihan kelas' : 'Pilih kelas sasaran'}
                            aria-label={isExpanded ? 'Tutup pemilihan kelas' : 'Pilih kelas sasaran'}
                          >
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-200 ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            soundService.playClick();
                            setStartModalContext({
                              subjectCode: sub.subjectCode,
                              subjectName: sub.subjectName,
                              className: currentSelectedClass,
                              studentCount: selectedClassStudentCount,
                              availableClasses: rawClasses
                            });
                          }}
                          className={`w-8 h-8 rounded-xl text-white transition-all flex items-center justify-center cursor-pointer shadow-md active:scale-95 shrink-0 ${
                            currentSelectedClass === 'ALL'
                              ? 'bg-gradient-to-r from-amber-600 via-indigo-600 to-purple-600 hover:from-amber-500 hover:to-purple-500 shadow-amber-950/50'
                              : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-950/50'
                          }`}
                          title={`Mulakan sesi kehadiran untuk ${currentSelectedClass === 'ALL' ? 'Semua Kelas' : currentSelectedClass}`}
                          aria-label={`Mulakan sesi kehadiran untuk ${currentSelectedClass === 'ALL' ? 'Semua Kelas' : currentSelectedClass}`}
                        >
                          <Play className="w-3.5 h-3.5 fill-white shrink-0" />
                        </button>
                      </div>
                    </div>

                    {/* Mobile / Tablet Operational Row: lg:hidden */}
                    <div className="lg:hidden p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="px-2 py-0.5 rounded-lg bg-indigo-600 text-white font-mono font-black text-xs shadow-sm">
                            {sub.subjectCode}
                          </span>
                          <span className="text-xs text-slate-400 font-medium truncate">
                            {rawClasses.length > 1 ? `${rawClasses.length} Kelas` : '1 Kelas'} · {enrolledCount} Pelajar
                          </span>
                        </div>

                        {isRunning ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>RUNNING</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-teal-300 text-[10px] font-semibold shrink-0 border border-slate-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                            <span>READY</span>
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-white">
                        {sub.subjectName}
                      </h4>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[11px] text-slate-400">Kelas:</span>
                          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border ${
                            currentSelectedClass === 'ALL'
                              ? 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                              : 'bg-teal-500/20 text-teal-200 border-teal-500/40'
                          }`}>
                            {currentSelectedClass === 'ALL' ? 'Semua (Khas)' : currentSelectedClass.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-slate-400">({selectedClassStudentCount})</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {rawClasses.length > 1 && (
                            <button
                              type="button"
                              onClick={() => toggleExpand(sub.subjectCode)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1"
                            >
                              <span>{isExpanded ? 'Tutup' : 'Tukar'}</span>
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              soundService.playClick();
                              setStartModalContext({
                                subjectCode: sub.subjectCode,
                                subjectName: sub.subjectName,
                                className: currentSelectedClass,
                                studentCount: selectedClassStudentCount,
                                availableClasses: rawClasses
                              });
                            }}
                            className={`px-3 py-1.5 rounded-xl text-white text-xs font-bold flex items-center gap-1 shadow-md active:scale-95 ${
                              currentSelectedClass === 'ALL'
                                ? 'bg-gradient-to-r from-amber-600 to-purple-600'
                                : 'bg-gradient-to-r from-emerald-600 to-teal-600'
                            }`}
                          >
                            <Play className="w-3 h-3 fill-white" />
                            <span>MULA</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Multiple-Choice Class Selection Level (Expandable Detail Interaction) */}
                    {isExpanded && (
                      <div className="p-4 sm:p-5 bg-slate-950/80 border-t border-slate-800 space-y-3.5 animate-fadeIn">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-teal-400"></div>
                            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                              Pilih Kelas Sasaran
                            </span>
                            <span className="text-[11px] text-slate-400">
                              (Pilih satu kelas untuk kehadiran harian)
                            </span>
                          </div>
                          <span className="text-xs text-slate-400">
                            Jumlah Sasaran: <strong className="text-emerald-400 font-mono">{selectedClassStudentCount}</strong> Pelajar
                          </span>
                        </div>

                        {/* Multiple-Choice Selectable Option List */}
                        <div className="space-y-1.5">
                          {rawClasses.map((cls) => {
                            const isSelected = currentSelectedClass.toUpperCase() === cls.toUpperCase();
                            const count = students.filter(
                              (st) => st.className?.trim().toUpperCase() === cls.trim().toUpperCase()
                            ).length;

                            return (
                              <div
                                key={`mc-cls-${sub.subjectCode}-${cls}`}
                                role="radio"
                                aria-checked={isSelected}
                                tabIndex={0}
                                onClick={() => {
                                  soundService.playClick();
                                  setSelectedClassMap((prev) => ({
                                    ...prev,
                                    [sub.subjectCode]: cls
                                  }));
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    soundService.playClick();
                                    setSelectedClassMap((prev) => ({
                                      ...prev,
                                      [sub.subjectCode]: cls
                                    }));
                                  }
                                }}
                                className={`w-full p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer select-none active:scale-[0.99] ${
                                  isSelected
                                    ? 'bg-gradient-to-r from-teal-500/15 via-emerald-500/10 to-transparent border-teal-400/80 ring-1 ring-teal-400/40 shadow-sm shadow-teal-950'
                                    : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800/80 hover:border-slate-700 text-slate-300'
                                }`}
                              >
                                {/* Left: Radio Indicator + Class Name */}
                                <div className="flex items-center gap-3 min-w-0">
                                  <div
                                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                                      isSelected
                                        ? 'border-teal-400 bg-teal-500/20'
                                        : 'border-slate-600 bg-slate-900'
                                    }`}
                                  >
                                    {isSelected && (
                                      <div className="w-2 h-2 rounded-full bg-teal-400 animate-scaleIn" />
                                    )}
                                  </div>

                                  <div className="min-w-0">
                                    <span className={`text-xs sm:text-sm font-mono font-extrabold tracking-wide ${
                                      isSelected ? 'text-teal-200 font-black' : 'text-slate-200 font-bold'
                                    }`}>
                                      {cls.replace('_', ' ')}
                                    </span>
                                  </div>
                                </div>

                                {/* Right: Student Count & Checkmark */}
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className={`text-xs px-2.5 py-0.5 rounded-lg font-mono font-bold ${
                                    isSelected
                                      ? 'bg-teal-500/20 text-teal-200 border border-teal-500/40'
                                      : 'bg-slate-800 text-slate-400 border border-slate-700/60'
                                  }`}>
                                    {count} Pelajar
                                  </span>

                                  {isSelected && (
                                    <div className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center">
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Separator for Sesi Khas: Gabung Semua Kelas */}
                        {rawClasses.length > 1 && (
                          <div className="pt-2 border-t border-slate-800/80 space-y-2">
                            <div
                              role="radio"
                              aria-checked={currentSelectedClass === 'ALL'}
                              tabIndex={0}
                              onClick={() => {
                                soundService.playClick();
                                setSelectedClassMap((prev) => ({
                                  ...prev,
                                  [sub.subjectCode]: currentSelectedClass === 'ALL' ? (rawClasses[0] || 'ALL') : 'ALL'
                                }));
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  soundService.playClick();
                                  setSelectedClassMap((prev) => ({
                                    ...prev,
                                    [sub.subjectCode]: currentSelectedClass === 'ALL' ? (rawClasses[0] || 'ALL') : 'ALL'
                                  }));
                                }
                              }}
                              className={`w-full p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer select-none active:scale-[0.99] ${
                                currentSelectedClass === 'ALL'
                                  ? 'bg-gradient-to-r from-amber-500/20 via-indigo-500/15 to-purple-500/20 border-amber-500/80 ring-1 ring-amber-400/40 shadow-sm shadow-amber-950'
                                  : 'bg-slate-900/40 hover:bg-slate-900/80 border-slate-800/80 hover:border-slate-700 text-slate-400'
                              }`}
                            >
                              {/* Left: Radio indicator + Title + Subtitle */}
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                                    currentSelectedClass === 'ALL'
                                      ? 'border-amber-400 bg-amber-500/20'
                                      : 'border-slate-600 bg-slate-900'
                                  }`}
                                >
                                  {currentSelectedClass === 'ALL' && (
                                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-scaleIn" />
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Layers className={`w-3.5 h-3.5 shrink-0 ${currentSelectedClass === 'ALL' ? 'text-amber-400' : 'text-slate-400'}`} />
                                    <span className={`text-xs sm:text-sm font-extrabold uppercase tracking-wide ${
                                      currentSelectedClass === 'ALL' ? 'text-amber-200' : 'text-slate-300'
                                    }`}>
                                      SEMUA KELAS (GABUNGAN)
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-400 pl-5.5">
                                    Sesi khas — Ujian / Peperiksaan / Taklimat Program
                                  </div>
                                </div>
                              </div>

                              {/* Right: Enrolled Count + Checkmark */}
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-xs px-2.5 py-0.5 rounded-lg font-mono font-bold ${
                                  currentSelectedClass === 'ALL'
                                    ? 'bg-amber-500/30 text-amber-200 border border-amber-500/40'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700/60'
                                }`}>
                                  {enrolledCount} Pelajar
                                </span>

                                {currentSelectedClass === 'ALL' && (
                                  <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center">
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Expanded Action Footer */}
                        <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-3">
                          <div className="text-xs text-slate-400">
                            Kelas sasaran aktif:{' '}
                            <strong className={`font-bold ${currentSelectedClass === 'ALL' ? 'text-amber-300' : 'text-teal-300'}`}>
                              {currentSelectedClass === 'ALL' ? 'Semua Kelas (Sesi Khas)' : currentSelectedClass.replace('_', ' ')}
                            </strong>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              soundService.playClick();
                              setStartModalContext({
                                subjectCode: sub.subjectCode,
                                subjectName: sub.subjectName,
                                className: currentSelectedClass,
                                studentCount: selectedClassStudentCount,
                                availableClasses: rawClasses
                              });
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-2 cursor-pointer shadow-md active:scale-95 ${
                              currentSelectedClass === 'ALL'
                                ? 'bg-gradient-to-r from-amber-600 via-indigo-600 to-purple-600 hover:from-amber-500 hover:to-purple-500 shadow-amber-950/50'
                                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-950/50'
                            }`}
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>
                              MULA SESI: {currentSelectedClass === 'ALL' ? 'SEMUA KELAS' : currentSelectedClass.replace('_', ' ')}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
              <Search className="w-8 h-8 text-slate-500 mx-auto" />
              <h4 className="text-sm font-bold text-white">Tiada Subjek Ditemui</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Tiada subjek sepadan dengan kriteria carian "{searchFilter}" atau penapis status "{statusFilter}".
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchFilter('');
                  setStatusFilter('ALL');
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-indigo-300 font-semibold transition cursor-pointer"
              >
                Set Semula Penapis
              </button>
            </div>
          )
        ) : (
          <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white">Tiada Subjek Ditetapkan oleh Pentadbir</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Subjek dan kelas pengajaran anda diagihkan secara berpusat oleh Pentadbir Kolej melalui fail CSV Induk atau pengagihan pentadbir. Sila hubungi Admin KPM jika agihan subjek anda memerlukan penyelarasan.
            </p>
            {isAdmin && activeLecturer?.role === 'ADMIN' && (
              <button
                type="button"
                id="btn-empty-manage-subjects"
                onClick={() => setIsManageSubjectsModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition shadow-lg shadow-teal-600/30 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tetapkan Subjek & Kelas (Admin)</span>
              </button>
            )}
          </div>
        )}

        {/* Elemen tindakan disusun di bahagian bawah section dalam row berbeza */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {isAdmin && activeLecturer?.role === 'ADMIN' ? (
            <button
              type="button"
              id="btn-workspace-manage-subjects"
              onClick={() => setIsManageSubjectsModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 hover:text-white border border-teal-500/40 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 text-teal-400" />
              <span>Pilih / Urus Subjek Pengajaran (Admin)</span>
            </button>
          ) : (
            <div className="text-[11px] text-slate-500 italic">
              * Agihan subjek & kelas dikendalikan oleh Pentadbir Sistem
            </div>
          )}
          <button
            type="button"
            onClick={onGoToActivities}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold cursor-pointer px-2 py-1 hover:underline"
          >
            <span>Semua Kelas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4. Quick Actions Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={onOpenScanner}
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/50 transition-all text-left space-y-2 group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <QrCode className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Imbas QR Kelas</div>
            <div className="text-[11px] text-slate-400">Imbas kehadiran langsung</div>
          </div>
        </button>

        <button
          type="button"
          onClick={onGoToActivities}
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/50 transition-all text-left space-y-2 group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <CalendarCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Pengurusan Sesi</div>
            <div className="text-[11px] text-slate-400">Buka & tutup sesi kelas</div>
          </div>
        </button>

        <button
          type="button"
          onClick={onGoToReports}
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/50 transition-all text-left space-y-2 group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Rekod Kehadiran</div>
            <div className="text-[11px] text-slate-400">Laporan & analisis kelas</div>
          </div>
        </button>

        <button
          type="button"
          onClick={onGoToGuide}
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/50 transition-all text-left space-y-2 group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Panduan Penggunaan</div>
            <div className="text-[11px] text-slate-400">Tatacara & panduan SOP</div>
          </div>
        </button>
      </div>

      {/* 5. Rekod Terkini Kelas Saya */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Rekod Kehadiran Terkini ({myRecentRecords.length})
            </h2>
          </div>
          {myRecentRecords.length > 0 && (
            <button
              type="button"
              onClick={onGoToReports}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
            >
              Lihat Semua Rekod
            </button>
          )}
        </div>

        {myRecentRecords.length > 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800/80">
            {myRecentRecords.map((rec) => {
              const student = students.find((s) => s.id === rec.studentId);
              const session = sessions.find((sess) => sess.id === rec.sessionId);
              const timeFormatted = new Date(rec.timestamp).toLocaleTimeString('ms-MY', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });

              return (
                <div
                  key={rec.id}
                  className="p-3 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-950 border border-indigo-500/30 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                      {student ? getInitials(student.name) : 'P'}
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-white leading-tight">
                        {student?.name || rec.studentId}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {student?.studentId || rec.studentId} • <span className="text-slate-300 font-semibold">{student?.className}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <div className="hidden sm:block">
                      <div className="text-[11px] font-semibold text-slate-300">
                        {session?.subjectCode || session?.sessionName || 'Sesi Kelas'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">{timeFormatted}</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase">
                      HADIR
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-1 text-slate-400">
            <Users className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-xs">Belum ada rekod kehadiran bagi kelas anda hari ini.</p>
          </div>
        )}
      </div>

      {/* Start Attendance Confirmation Modal */}
      {startModalContext && (
        <StartAttendanceModal
          isOpen={Boolean(startModalContext)}
          onClose={() => setStartModalContext(null)}
          subjectCode={startModalContext.subjectCode}
          subjectName={startModalContext.subjectName}
          className={startModalContext.className}
          lecturerName={lecturer.name}
          studentCount={startModalContext.studentCount}
          availableClasses={startModalContext.availableClasses}
          classStudentCounts={(startModalContext.availableClasses || []).reduce((acc, cls) => {
            acc[cls] = students.filter(
              (st) => st.className?.trim().toUpperCase() === cls.trim().toUpperCase()
            ).length;
            return acc;
          }, {} as Record<string, number>)}
          totalStudentsCount={students.filter((st) =>
            (startModalContext.availableClasses || []).some(
              (c) => c.trim().toUpperCase() === st.className?.trim().toUpperCase()
            )
          ).length}
          onSelectClass={(newCls) => {
            const count = newCls === 'ALL'
              ? students.filter((st) =>
                  (startModalContext.availableClasses || []).some(
                    (c) => c.toUpperCase() === st.className?.toUpperCase()
                  )
                ).length
              : students.filter((st) => st.className?.toUpperCase() === newCls.toUpperCase()).length;
            setStartModalContext({
              ...startModalContext,
              className: newCls,
              studentCount: count
            });
            setSelectedClassMap((prev) => ({
              ...prev,
              [startModalContext.subjectCode]: newCls
            }));
          }}
          onConfirmStart={() => {
            const ctx = startModalContext;
            setStartModalContext(null);
            if (onStartSessionForClass) {
              onStartSessionForClass(ctx.subjectCode, ctx.subjectName, ctx.className);
            } else {
              onOpenScanner();
            }
          }}
        />
      )}

      {/* Lecturer Manage Subjects Modal */}
      {isManageSubjectsModalOpen && (
        <LecturerManageSubjectsModal
          isOpen={isManageSubjectsModalOpen}
          onClose={() => setIsManageSubjectsModalOpen(false)}
          lecturer={lecturer}
          allSubjects={subjects}
          onSaved={() => {
            setBackupToast('Subjek dan kelas pengajaran anda berjaya dikemaskini!');
            setTimeout(() => setBackupToast(null), 4000);
          }}
        />
      )}

      {/* Backup Toast Notification */}
      {backupToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-950 border-2 border-emerald-500/60 text-emerald-200 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{backupToast}</span>
        </div>
      )}
    </div>
  );
};
