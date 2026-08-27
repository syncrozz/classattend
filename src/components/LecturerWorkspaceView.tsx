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
  Play
} from 'lucide-react';
import { getClassBadgeColor, getInitials, getStudentColor } from '../utils/studentUtils';
import { StartAttendanceModal } from './StartAttendanceModal';

interface LecturerWorkspaceViewProps {
  activeLecturer?: Lecturer | null;
  lecturer?: Lecturer | null;
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
  const [startModalContext, setStartModalContext] = useState<{
    subjectCode: string;
    subjectName: string;
    className: string;
    studentCount: number;
  } | null>(null);

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
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Selamat Bertugas, {lecturer.name}
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
              <span>Buka Pengimbas QR</span>
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

            <div className="flex items-center gap-2">
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Subjek & Seksyen Kelas Ditugaskan ({mySubjectsList.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={onGoToActivities}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold cursor-pointer"
          >
            <span>Semua Kelas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {mySubjectsList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {mySubjectsList.map((sub) => {
              // Count students in these classes
              const enrolledCount = students.filter((st) =>
                sub.classes.some((c) => c.toUpperCase() === st.className.toUpperCase())
              ).length;

              return (
                <div
                  key={sub.subjectCode}
                  className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-3 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono font-bold text-xs">
                        {sub.subjectCode}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span>{enrolledCount} Pelajar</span>
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white group-hover:text-indigo-200 transition-colors line-clamp-1">
                      {sub.subjectName}
                    </h4>

                    {/* Classes badges */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {sub.classes.map((cls) => (
                        <span
                          key={cls}
                          className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px] font-bold border border-slate-700"
                        >
                          {cls}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500">
                      {sub.classes.length} Seksyen Kelas
                    </span>
                    <div className="flex items-center gap-1.5">
                      {sub.classes.length === 1 ? (
                        <button
                          type="button"
                          onClick={() => {
                            const cls = sub.classes[0];
                            const count = students.filter(
                              (st) => st.className.toUpperCase() === cls.toUpperCase()
                            ).length;
                            setStartModalContext({
                              subjectCode: sub.subjectCode,
                              subjectName: sub.subjectName,
                              className: cls,
                              studentCount: count
                            });
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm active:scale-95"
                        >
                          <Play className="w-3 h-3 fill-white" />
                          <span>Mula Kehadiran</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const defaultCls = sub.classes[0] || 'DIA_4A';
                            const count = students.filter(
                              (st) => st.className.toUpperCase() === defaultCls.toUpperCase()
                            ).length;
                            setStartModalContext({
                              subjectCode: sub.subjectCode,
                              subjectName: sub.subjectName,
                              className: defaultCls,
                              studentCount: count
                            });
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm active:scale-95"
                        >
                          <Play className="w-3 h-3 fill-white" />
                          <span>Mula Kehadiran</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
            <p className="text-xs text-slate-400">Tiada subjek ditugaskan secara khusus.</p>
            <button
              type="button"
              onClick={onGoToActivities}
              className="text-xs text-indigo-400 hover:text-indigo-300 underline font-semibold cursor-pointer"
            >
              Urus dan daftarkan subjek anda di Pengurusan Kelas
            </button>
          </div>
        )}
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
    </div>
  );
};
