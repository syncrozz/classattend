import React, { useState, useMemo } from 'react';
import { AttendanceSession, AttendanceRecord, Student, Lecturer, TeachingAssignment } from '../types';
import {
  ArrowLeft,
  Search,
  CheckCircle2,
  Clock,
  Calendar,
  User,
  GraduationCap,
  ShieldAlert,
  ShieldCheck,
  QrCode,
  X,
  AlertCircle
} from 'lucide-react';
import {
  isLecturerAuthorizedForSession,
  filterAuthorizedAttendanceRecords,
  calculateAttendanceMetrics,
  formatSafeEndTime
} from '../utils/sessionAuth';

interface SessionDetailViewProps {
  session: AttendanceSession;
  activeLecturer: Lecturer;
  isAdmin: boolean;
  attendanceRecords: AttendanceRecord[];
  students: Student[];
  teachingAssignments?: TeachingAssignment[];
  myAssignedSubjectCodes?: Set<string>;
  onBack: () => void;
  onOpenScannerForSession?: (sessionId: string) => void;
}

export const SessionDetailView: React.FC<SessionDetailViewProps> = ({
  session,
  activeLecturer,
  isAdmin,
  attendanceRecords,
  students,
  teachingAssignments = [],
  onBack,
  onOpenScannerForSession
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Authoritative Authorization Guard
  // Validates lecturer identity and authorized teaching assignments
  // Client-side name matching is NOT used as the sole authorization method
  const isAuthorized = useMemo(() => {
    return isLecturerAuthorizedForSession(session, activeLecturer, isAdmin, teachingAssignments);
  }, [session, activeLecturer, isAdmin, teachingAssignments]);

  // 2. Safe Time Formatting (Handling missing / legacy endTime safely)
  const safeEndTime = useMemo(() => {
    return formatSafeEndTime(session.endTime, session.status);
  }, [session.endTime, session.status]);

  // 3. Filter and Deduplicate Attendance Records for this Session
  // Guards against duplicate scans or mismatched session IDs
  const sessionRecords = useMemo(() => {
    if (!isAuthorized) return [];
    return filterAuthorizedAttendanceRecords(attendanceRecords, session.id);
  }, [attendanceRecords, session.id, isAuthorized]);

  // 4. Target count & Attendance Percentage calculation with zero-division protection
  const { targetCount, attendancePercent } = useMemo(() => {
    return calculateAttendanceMetrics(sessionRecords.length, session.targetCount);
  }, [sessionRecords.length, session.targetCount]);

  // 5. Search Filter (Student Name or Student ID)
  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sessionRecords;

    return sessionRecords.filter((rec) => {
      const student = students.find((s) => s.id === rec.studentId || s.studentId === rec.studentId);
      const name = (student?.name || rec.studentName || '').toLowerCase();
      const stId = (student?.studentId || rec.studentId || '').toLowerCase();
      const cls = (student?.className || rec.className || session.className || '').toLowerCase();
      return name.includes(q) || stId.includes(q) || cls.includes(q);
    });
  }, [sessionRecords, searchQuery, students, session.className]);

  // --- UNAUTHORIZED ACCESS VIEW ---
  if (!isAuthorized) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
        <div className="p-6 sm:p-8 rounded-2xl bg-rose-950/40 border border-rose-800 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-full bg-rose-900/60 border border-rose-700 flex items-center justify-center mx-auto text-rose-400 shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">Akses Sesi Disekat</h3>
            <p className="text-sm text-rose-300 max-w-md mx-auto leading-relaxed">
              Anda tidak mempunyai kebenaran untuk mengakses butiran sesi ini ({session.subjectCode || 'Subjek'} - {session.className || 'Kelas'}).
              Sesi ini didaftarkan di bawah pensyarah atau agihan kelas yang berlainan.
            </p>
          </div>
          <div className="pt-3">
            <button
              type="button"
              onClick={onBack}
              id="btn-unauthorized-back"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold transition-colors border border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Ruang Kerja</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- AUTHORIZED SESSION DETAIL VIEW ---
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 px-2 sm:px-4">
      {/* Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <button
          type="button"
          onClick={onBack}
          id="btn-back-to-history"
          className="inline-flex items-center gap-2.5 px-4 py-2.5 min-h-[48px] rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white text-sm font-bold transition-colors w-fit focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <ArrowLeft className="w-5 h-5 text-indigo-400" />
          <span>Kembali ke Sejarah & Ruang Kerja</span>
        </button>

        <div className="flex items-center gap-2">
          {session.status === 'OPEN' && onOpenScannerForSession && (
            <button
              type="button"
              onClick={() => onOpenScannerForSession(session.id)}
              id="btn-open-scanner-from-detail"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-600/20 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <QrCode className="w-4 h-4" />
              <span>Buka Pengimbas QR Sesi Ini</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Session Information Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-slate-800/80 pb-6">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider">
                {session.subjectCode || 'SUBJEK'}
              </span>
              <span className="px-3 py-1 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold">
                Kelas: {session.className || '-'}
              </span>
              {session.status === 'OPEN' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  SESI SEDANG DIBUKA
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-xs font-semibold">
                  SESI SELESAI
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {session.subjectName || session.sessionName || 'Sesi Kuliah'}
            </h2>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm text-slate-400 pt-1">
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-slate-400" />
                <span>Pensyarah: <strong className="text-slate-200">{session.lecturerName || activeLecturer.name}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-slate-500">
                <span>ID Sesi: {session.id}</span>
              </div>
            </div>
          </div>

          {/* Time & Date Metric Box */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2.5 min-w-[220px] self-stretch md:self-auto">
            <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>Tarikh:</span>
              </span>
              <strong className="text-slate-200 font-mono">{session.date || '-'}</strong>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>Masa Mula:</span>
              </span>
              <strong className="text-slate-200 font-mono">{session.startTime || '-'}</strong>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>Masa Tamat:</span>
              </span>
              <strong className="text-slate-200 font-mono">{safeEndTime}</strong>
            </div>
          </div>
        </div>

        {/* Attendance Progress & Summary */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Ringkasan Kehadiran Pelajar</span>
            </span>
            <span className="font-mono text-xs text-slate-300">
              <strong className="text-emerald-400 text-base">{sessionRecords.length}</strong> / {targetCount} Hadir ({attendancePercent}%)
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-950 rounded-full h-3.5 p-0.5 border border-slate-800 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${attendancePercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Student Attendance Records Section */}
      <div className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-400" />
              <span>Senarai Pelajar Hadir ({filteredRecords.length})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Rekod imbasan rasmi. Dilindungi dan diselaraskan secara langsung ke Firestore.
            </p>
          </div>

          {/* Search Input with minimum 48px touch target */}
          <div className="relative min-w-[260px] sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau No. Matrik..."
              id="input-search-student-history"
              className="w-full min-h-[48px] pl-10 pr-12 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                id="btn-clear-student-search"
                aria-label="Kosongkan carian"
                className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Records Display */}
        {filteredRecords.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="text-sm font-semibold text-slate-400">
              {searchQuery
                ? `Tiada rekod pelajar sepadan dengan carian "${searchQuery}".`
                : 'Tiada rekod pelajar hadir bagi sesi ini.'}
            </div>
            <p className="text-xs text-slate-500">
              {searchQuery
                ? 'Cuba cari dengan kata kunci lain seperti nombor matrik atau nama.'
                : 'Imbas kod QR pelajar untuk mencatat rekod kehadiran.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Bil</th>
                    <th className="py-3 px-4">Nama Pelajar</th>
                    <th className="py-3 px-4">No. Matrik / ID</th>
                    <th className="py-3 px-4">Kelas</th>
                    <th className="py-3 px-4">Masa Imbasan</th>
                    <th className="py-3 px-4">Kaedah</th>
                    <th className="py-3 px-4 text-right">Status Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredRecords.map((rec, index) => {
                    const student = students.find((s) => s.id === rec.studentId || s.studentId === rec.studentId);
                    const formattedTime = rec.timestamp
                      ? new Date(rec.timestamp).toLocaleTimeString('ms-MY', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: true
                        })
                      : '-';

                    const displayName = student?.name || rec.studentName || rec.studentId || 'Pelajar Tanpa Nama';
                    const displayId = student?.studentId || rec.studentId || '-';
                    const displayClass = student?.className || rec.className || session.className || '-';

                    return (
                      <tr key={rec.id || `${rec.studentId}-${index}`} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-slate-500">
                          {index + 1}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-white text-sm block">
                            {displayName}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-indigo-300">
                          {displayId}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
                            {displayClass}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          {formattedTime}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {rec.method || 'CAMERA_SCAN'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            HADIR
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Cards */}
            <div className="md:hidden space-y-2.5">
              {filteredRecords.map((rec, index) => {
                const student = students.find((s) => s.id === rec.studentId || s.studentId === rec.studentId);
                const formattedTime = rec.timestamp
                  ? new Date(rec.timestamp).toLocaleTimeString('ms-MY', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true
                    })
                  : '-';

                const displayName = student?.name || rec.studentName || rec.studentId || 'Pelajar Tanpa Nama';
                const displayId = student?.studentId || rec.studentId || '-';
                const displayClass = student?.className || rec.className || session.className || '-';

                return (
                  <div
                    key={rec.id || `${rec.studentId}-${index}`}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="text-[11px] text-slate-500 font-mono">#{index + 1}</div>
                        <h4 className="font-bold text-white text-sm">
                          {displayName}
                        </h4>
                        <p className="text-xs font-mono text-indigo-300 font-semibold">
                          {displayId}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 text-[11px] shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        HADIR
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                      <span>Kelas: <strong className="text-slate-300">{displayClass}</strong></span>
                      <span className="font-mono text-slate-300">{formattedTime}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Read-Only Protection Notice */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center gap-3 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>
            Rekod kehadiran ini dilindungi sebagai rekod audit rasmi kolej. Sebarang perubahan manual dilarang untuk memastikan kebolehpercayaan data.
          </span>
        </div>
      </div>
    </div>
  );
};
