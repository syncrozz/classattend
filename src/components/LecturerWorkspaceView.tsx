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
  Check
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

      {/* 3. Subjek & Kelas Yang Ditugaskan (Teaching Assignments Grid) */}
      <div className="space-y-3">
        {/* Section Header: Tajuk Sahaja */}
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Subjek & Seksyen Kelas Ditugaskan ({mySubjectsList.length})
          </h2>
        </div>

        {mySubjectsList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {mySubjectsList.map((sub) => {
              // Count students in these classes
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

              return (
                <div
                  key={sub.subjectCode}
                  className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-indigo-500/30 hover:border-indigo-500/60 shadow-lg transition-all flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-mono font-black text-xs shadow-sm">
                          {sub.subjectCode}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700 flex items-center gap-1">
                        <Users className="w-3 h-3 text-indigo-400" />
                        <span>{enrolledCount} Pelajar</span>
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-white group-hover:text-indigo-200 transition-colors line-clamp-2">
                      {sub.subjectName}
                    </h4>

                    {/* Classes badges (Pilih kelas untuk tapis sesi kehadiran) */}
                    <div className="pt-1.5 space-y-1.5">
                      <p className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-medium">Pilih kelas sasaran:</span>
                        <span className="text-[10px] text-teal-400 font-semibold">
                          {rawClasses.length > 1 ? 'Klik untuk tapis kehadiran' : '1 Kelas'}
                        </span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {rawClasses.map((cls, clsIdx) => {
                          const isSelected = currentSelectedClass.toUpperCase() === cls.toUpperCase();
                          const count = students.filter(
                            (st) => st.className?.trim().toUpperCase() === cls.trim().toUpperCase()
                          ).length;
                          return (
                            <span
                              key={`lec-ws-sub-${sub.subjectCode}-${cls}-${clsIdx}`}
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
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
                              className={`group/badge inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer select-none active:scale-95 ${
                                isSelected
                                  ? 'bg-gradient-to-r from-teal-500/25 to-emerald-500/25 border-teal-400 text-teal-200 ring-2 ring-teal-400/40 shadow-sm shadow-teal-950 font-extrabold scale-105'
                                  : 'bg-slate-800/90 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700 hover:border-slate-500 hover:scale-[1.02]'
                              }`}
                              title={`Pilih ${cls} (${count} Pelajar)`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full transition-colors ${
                                  isSelected ? 'bg-teal-400 ring-2 ring-teal-400/30 animate-pulse' : 'bg-slate-500'
                                }`}
                              />
                              <span>{cls.replace('_', ' ')}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                                  isSelected
                                    ? 'bg-teal-500/30 text-teal-100 border border-teal-400/40 font-black'
                                    : 'bg-slate-900 text-slate-400'
                                }`}
                              >
                                {count}
                              </span>
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-teal-300 stroke-[3]" />
                              )}
                            </span>
                          );
                        })}

                        {rawClasses.length > 1 && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              soundService.playClick();
                              setSelectedClassMap((prev) => ({
                                ...prev,
                                [sub.subjectCode]: 'ALL'
                              }));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                soundService.playClick();
                                setSelectedClassMap((prev) => ({
                                  ...prev,
                                  [sub.subjectCode]: 'ALL'
                                }));
                              }
                            }}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer select-none active:scale-95 ${
                              currentSelectedClass === 'ALL'
                                ? 'bg-gradient-to-r from-indigo-500/25 to-purple-500/25 border-indigo-400 text-indigo-200 ring-2 ring-indigo-400/40 shadow-sm shadow-indigo-950 font-extrabold scale-105'
                                : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700/80 hover:border-slate-600'
                            }`}
                            title="Pilih semua kelas gabungan serentak"
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                currentSelectedClass === 'ALL' ? 'bg-indigo-400 ring-2 ring-indigo-400/30 animate-pulse' : 'bg-slate-600'
                              }`}
                            />
                            <span>Semua Kelas</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                                currentSelectedClass === 'ALL'
                                  ? 'bg-indigo-500/30 text-indigo-100 border border-indigo-400/40 font-black'
                                  : 'bg-slate-900 text-slate-400'
                              }`}
                            >
                              {enrolledCount}
                            </span>
                            {currentSelectedClass === 'ALL' && (
                              <Check className="w-3.5 h-3.5 text-indigo-300 stroke-[3]" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span>Kelas:</span>
                      <span className="font-bold text-teal-300 bg-teal-950/70 border border-teal-500/40 px-2 py-0.5 rounded-md">
                        {currentSelectedClass === 'ALL' ? 'Semua (Gabungan)' : currentSelectedClass.replace('_', ' ')}
                      </span>
                      <span className="text-slate-500 text-[10px]">({selectedClassStudentCount} Pelajar)</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setStartModalContext({
                          subjectCode: sub.subjectCode,
                          subjectName: sub.subjectName,
                          className: currentSelectedClass,
                          studentCount: selectedClassStudentCount,
                          availableClasses: rawClasses
                        });
                      }}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/60 active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>
                        Mula: {currentSelectedClass === 'ALL' ? 'Semua' : currentSelectedClass.replace('_', ' ')}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
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
