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
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Users,
  QrCode,
  CalendarCheck,
  TrendingUp,
  Clock,
  Sparkles,
  ArrowRight,
  Plus,
  Layers,
  FileSpreadsheet,
  Download,
  Search,
  BookOpen,
  GraduationCap,
  AlertCircle
} from 'lucide-react';
import { getInitials } from '../utils/studentUtils';
import { GenerateLecturerQRModal } from './GenerateLecturerQRModal';

interface AdminControlCenterViewProps {
  lecturers: Lecturer[];
  teachingAssignments: TeachingAssignment[];
  subjects: Subject[];
  sessions: AttendanceSession[];
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  onOpenScanner: () => void;
  onGoToActivities: () => void;
  onGoToStudents: () => void;
  onGoToReports: () => void;
  onCloseActiveSession: (sessionId: string) => void;
  onApproveLecturer: (lecturerId: string) => void;
  onRejectLecturer: (lecturerId: string) => void;
  onQuickSimulateScan?: (studentId: string) => ScanResult;
}

export const AdminControlCenterView: React.FC<AdminControlCenterViewProps> = ({
  lecturers,
  teachingAssignments,
  subjects,
  sessions,
  students,
  attendanceRecords,
  onOpenScanner,
  onGoToActivities,
  onGoToStudents,
  onGoToReports,
  onCloseActiveSession,
  onApproveLecturer,
  onRejectLecturer,
  onQuickSimulateScan
}) => {
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // 1. Pending Lecturers for Approval
  const pendingLecturers = lecturers.filter((l) => l.status === 'PENDING');

  // 2. Active Session College-Wide
  const activeSession = sessions.find((s) => s.status === 'OPEN') || null;

  const activeSessionRecords = activeSession
    ? attendanceRecords.filter((r) => r.sessionId === activeSession.id && r.status === 'PRESENT')
    : [];

  const targetStudentsForActive = activeSession
    ? activeSession.className && activeSession.className !== 'ALL'
      ? students.filter((s) => s.className.toUpperCase() === activeSession.className?.toUpperCase())
      : students
    : [];

  const activePercent =
    targetStudentsForActive.length > 0
      ? Math.round((activeSessionRecords.length / targetStudentsForActive.length) * 100)
      : 0;

  // 3. College Operational Metrics (Real Data Computations)
  const activeLecturersCount = lecturers.filter((l) => l.status !== 'REJECTED' && l.status !== 'PENDING').length;
  const totalStudentsCount = students.length;
  const totalSubjectsCount = subjects.length;
  const totalSessionsCount = sessions.length;
  const totalRecordsCount = attendanceRecords.length;

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    await onApproveLecturer(id);
    setProcessingId(null);
  };

  const handleReject = async (id: string) => {
    if (window.confirm('Adakah anda pasti untuk menolak permohonan pendaftaran pensyarah ini?')) {
      setProcessingId(id);
      await onRejectLecturer(id);
      setProcessingId(null);
    }
  };

  // Recent 10 scans college-wide
  const recentRecords = attendanceRecords.slice(-10).reverse();

  return (
    <div id="admin-control-center" className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Admin Control Center Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>Pusat Kawalan Pentadbir Kolej (Admin)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Pusat Kawalan Operasi Kehadiran
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Kolej Profesional MARA Bandar Penawar • Pengawasan Sistem & Kelulusan Pensyarah
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-admin-generate-qr"
              onClick={() => setIsQRModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <QrCode className="w-4 h-4" />
              <span>Jana QR Pendaftaran</span>
            </button>
            <button
              type="button"
              onClick={onGoToStudents}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>Master Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Perlu Perhatian (Pending Approvals & Notifications) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Perlu Perhatian Pentadbir ({pendingLecturers.length})
            </h2>
          </div>
          {pendingLecturers.length > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30 animate-pulse">
              {pendingLecturers.length} Menunggu Kelulusan
            </span>
          )}
        </div>

        {pendingLecturers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingLecturers.map((lec) => {
              const lecAssignments = teachingAssignments.filter((ta) => ta.lecturerId === lec.id);
              const requestedSubjects = Array.from(new Set(lecAssignments.map((ta) => ta.subjectCode)));
              const requestedClasses = Array.from(new Set(lecAssignments.map((ta) => ta.className)));

              return (
                <div
                  key={lec.id}
                  className="p-4 rounded-2xl bg-slate-900 border-2 border-amber-500/50 shadow-lg shadow-amber-950/20 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 border border-amber-500/30">
                        {getInitials(lec.name)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white leading-tight">{lec.name}</h4>
                        <div className="text-xs text-amber-300 font-mono">{lec.email}</div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold uppercase border border-amber-500/30">
                      PENDING
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 bg-slate-950/80 p-2.5 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">No. Kad Pengenalan:</span>
                      <span className="font-mono font-bold text-slate-200">{lec.icNumber || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Jabatan:</span>
                      <span className="font-semibold text-slate-200">{lec.department || 'Perakaunan'}</span>
                    </div>
                    {requestedSubjects.length > 0 && (
                      <div className="pt-1 border-t border-slate-800 text-[11px]">
                        <span className="text-slate-400 block mb-1">Subjek & Seksyen Dipohon:</span>
                        <div className="flex flex-wrap gap-1">
                          {requestedSubjects.map((s) => (
                            <span key={s} className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold">
                              {s}
                            </span>
                          ))}
                          {requestedClasses.map((c) => (
                            <span key={c} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-1 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={processingId === lec.id}
                      onClick={() => handleReject(lec.id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Tolak</span>
                    </button>

                    <button
                      type="button"
                      disabled={processingId === lec.id}
                      onClick={() => handleApprove(lec.id)}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Luluskan Akaun</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-3 text-slate-400 text-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Semua permohonan pendaftaran pensyarah telah disahkan & aktif. Tiada tindakan tertunggak.</span>
          </div>
        )}
      </div>

      {/* 3. Sedang Berlangsung (Active College Session) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CalendarCheck className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Sesi Kelas Sedang Berlangsung Kolej
          </h2>
        </div>

        {activeSession ? (
          <div className="p-5 rounded-3xl bg-slate-900 border-2 border-emerald-500/60 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                      {activeSession.subjectCode || 'SUBJEK'}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-bold">
                      {activeSession.className || 'Semua Seksyen'}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase">
                      LIVE
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                    {activeSession.sessionName}
                  </h3>
                  <div className="text-xs text-slate-400">
                    Pensyarah: <strong className="text-slate-200">{activeSession.lecturerName || 'Pentadbir'}</strong>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenScanner}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Urus / Buka Pengimbas</span>
                </button>
                <button
                  type="button"
                  onClick={() => onCloseActiveSession(activeSession.id)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
                >
                  Tutup Sesi
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-300">
                  {activeSessionRecords.length} / {targetStudentsForActive.length} Pelajar Hadir
                </span>
                <span className="text-emerald-400 font-mono font-bold text-sm">
                  {activePercent}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, activePercent)}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Tiada sesi kelas dibuka pada masa ini.</span>
            <button
              type="button"
              onClick={onGoToActivities}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
            >
              + Buka Sesi Baharu
            </button>
          </div>
        )}
      </div>

      {/* 4. Operasi Hari Ini (College Metrics from Real Data) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Metrik Operasi Kolej Hari Ini
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase">Pensyarah Aktif</div>
            <div className="text-2xl font-black text-white font-mono">{activeLecturersCount}</div>
            <div className="text-[10px] text-emerald-400">Tersedia dalam sistem</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase">Jumlah Pelajar</div>
            <div className="text-2xl font-black text-indigo-400 font-mono">{totalStudentsCount}</div>
            <div className="text-[10px] text-slate-500">Master Data Pelajar</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase">Jumlah Subjek</div>
            <div className="text-2xl font-black text-purple-400 font-mono">{totalSubjectsCount}</div>
            <div className="text-[10px] text-slate-500">Kurikulum DIA & MPU</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase">Rekod Kehadiran</div>
            <div className="text-2xl font-black text-emerald-400 font-mono">{totalRecordsCount}</div>
            <div className="text-[10px] text-emerald-400 font-semibold">Tersimpan di Cloud</div>
          </div>
        </div>
      </div>

      {/* 5. Tindakan Pantas Pentadbir (Admin Actions) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setIsQRModalOpen(true)}
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-800/50 transition-all text-left space-y-2 group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <QrCode className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">QR Pendaftaran</div>
            <div className="text-[11px] text-slate-400">Papar kod pendaftaran pensyarah</div>
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
            <div className="text-xs font-bold text-white">Sesi & Subjek</div>
            <div className="text-[11px] text-slate-400">Buka / pantau kelas kolej</div>
          </div>
        </button>

        <button
          type="button"
          onClick={onGoToStudents}
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/50 transition-all text-left space-y-2 group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Master Data</div>
            <div className="text-[11px] text-slate-400">Direktori pelajar & pensyarah</div>
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
            <div className="text-xs font-bold text-white">Laporan Kehadiran</div>
            <div className="text-[11px] text-slate-400">Analisis & muat turun CSV</div>
          </div>
        </button>
      </div>

      {/* 6. Aktiviti Terkini (College-Wide Activity Stream) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Aktiviti Kehadiran Terkini Kolej ({recentRecords.length})
            </h2>
          </div>
          {recentRecords.length > 0 && (
            <button
              type="button"
              onClick={onGoToReports}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
            >
              Lihat Semua
            </button>
          )}
        </div>

        {recentRecords.length > 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800/80">
            {recentRecords.map((rec) => {
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
                        {session?.subjectCode || session?.sessionName || 'Sesi Kolej'}
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
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-xs">
            Tiada rekod kehadiran direkodkan lagi.
          </div>
        )}
      </div>

      {/* Generate Lecturer QR Modal */}
      <GenerateLecturerQRModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
      />
    </div>
  );
};
