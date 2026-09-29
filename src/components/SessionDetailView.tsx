import React, { useState, useMemo } from 'react';
import { AttendanceSession, AttendanceRecord, Student, Lecturer, TeachingAssignment, Enrollment } from '../types';
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
  AlertCircle,
  UserX,
  Copy,
  MessageSquare,
  Award,
  Check
} from 'lucide-react';
import {
  isLecturerAuthorizedForSession,
  filterAuthorizedAttendanceRecords,
  calculateAttendanceMetrics,
  formatSafeEndTime
} from '../utils/sessionAuth';
import {
  deriveSessionTargetStudents,
  deriveAbsentStudents,
  formatAbsentListText,
  formatDisplayDate
} from '../utils/absentHelper';
import { formatWhatsAppPhone } from '../utils/whatsappHelper';

interface SessionDetailViewProps {
  session: AttendanceSession;
  activeLecturer: Lecturer;
  isAdmin: boolean;
  attendanceRecords: AttendanceRecord[];
  students: Student[];
  teachingAssignments?: TeachingAssignment[];
  myAssignedSubjectCodes?: Set<string>;
  enrollments?: Enrollment[];
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
  enrollments = [],
  onBack,
  onOpenScannerForSession
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDetailTab, setActiveDetailTab] = useState<'PRESENT' | 'ABSENT'>('PRESENT');
  const [copiedAbsent, setCopiedAbsent] = useState<boolean>(false);

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
  // Authoritative: respects session targetCount snapshot, or dynamically resolves from active enrollments
  const { targetCount, attendancePercent } = useMemo(() => {
    return calculateAttendanceMetrics(sessionRecords.length, session.targetCount, enrollments, session);
  }, [sessionRecords.length, session.targetCount, enrollments, session]);

  // 5. Authoritative Target Roster & Absent Students Derivation (Phase 3 SES v4.4)
  const targetStudents = useMemo(() => {
    return deriveSessionTargetStudents(session, students, enrollments);
  }, [session, students, enrollments]);

  const presentStudentIdsSet = useMemo(() => {
    const set = new Set<string>();
    sessionRecords.forEach((r) => {
      if (r.studentId) set.add(r.studentId.trim().toUpperCase());
      const stu = students.find((s) => s.id === r.studentId || s.studentId === r.studentId);
      if (stu) {
        if (stu.id) set.add(stu.id.trim().toUpperCase());
        if (stu.studentId) set.add(stu.studentId.trim().toUpperCase());
      }
    });
    return set;
  }, [sessionRecords, students]);

  const absentStudents = useMemo(() => {
    return deriveAbsentStudents(targetStudents, presentStudentIdsSet);
  }, [targetStudents, presentStudentIdsSet]);

  // Session status-based terminology (Phase 3 Standard)
  const isSessionClosed = session.status !== 'OPEN';
  const absentLabel = isSessionClosed ? 'Tidak Hadir' : 'Belum Hadir';

  // 6. Search Filter (Student Name or Student ID)
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

  const filteredAbsentStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return absentStudents;

    return absentStudents.filter((st) => {
      const name = (st.name || '').toLowerCase();
      const stId = (st.studentId || '').toLowerCase();
      const cls = (st.className || '').toLowerCase();
      return name.includes(q) || stId.includes(q) || cls.includes(q);
    });
  }, [absentStudents, searchQuery]);

  // Handle Copy Absent List
  const handleCopyAbsentList = () => {
    const text = formatAbsentListText(session.className || 'Kelas', session.date, absentStudents, isSessionClosed);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedAbsent ? setCopiedAbsent(true) : null;
      setTimeout(() => setCopiedAbsent(false), 3000);
    }
  };

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
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Ringkasan Kehadiran Pelajar</span>
            </span>
            <div className="flex items-center gap-3 font-mono text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold">
                {sessionRecords.length} Hadir
              </span>
              <span className={`px-2.5 py-1 rounded-lg border font-bold ${
                absentStudents.length > 0
                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {absentStudents.length} {absentLabel}
              </span>
              <span className="text-slate-400 font-sans">
                ({attendancePercent}%)
              </span>
            </div>
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

      {/* Student Attendance Records Section with Tabs */}
      <div className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        {/* Navigation Tabs: Hadir vs Tidak Hadir / Belum Hadir */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 w-full sm:w-auto">
            <button
              type="button"
              id="tab-detail-present"
              onClick={() => setActiveDetailTab('PRESENT')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeDetailTab === 'PRESENT'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Hadir ({sessionRecords.length})</span>
            </button>

            <button
              type="button"
              id="tab-detail-absent"
              onClick={() => setActiveDetailTab('ABSENT')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeDetailTab === 'ABSENT'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <UserX className="w-3.5 h-3.5" />
              <span>{absentLabel} ({absentStudents.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeDetailTab === 'ABSENT' && absentStudents.length > 0 && (
              <button
                type="button"
                id="btn-copy-absent-detail"
                onClick={handleCopyAbsentList}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Salin senarai nama pelajar tidak hadir"
              >
                {copiedAbsent ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-indigo-400" />}
                <span>{copiedAbsent ? 'Disalin!' : 'Salin Senarai'}</span>
              </button>
            )}

            {/* Search Input */}
            <div className="relative min-w-[220px] sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama atau No. Matrik..."
                id="input-search-student-history"
                className="w-full min-h-[42px] pl-10 pr-10 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  id="btn-clear-student-search"
                  aria-label="Kosongkan carian"
                  className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* TAB 1: SENARAI PELAJAR HADIR */}
        {activeDetailTab === 'PRESENT' && (
          <div>
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
          </div>
        )}

        {/* TAB 2: SENARAI PELAJAR TIDAK HADIR / BELUM HADIR */}
        {activeDetailTab === 'ABSENT' && (
          <div className="space-y-4">
            {absentStudents.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-3 bg-emerald-950/20 border border-dashed border-emerald-500/30 rounded-2xl">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <Award className="w-6 h-6" />
                </div>
                <h4 className="text-base font-extrabold text-white">SEMUA PELAJAR HADIR ✓</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Kesemua {targetStudents.length} pelajar yang berdaftar telah direkodkan hadir bagi sesi kuliah ini ({session.subjectCode || ''} - {session.className || ''}).
                </p>
                <div className="font-mono text-emerald-400 font-bold text-sm">
                  {targetStudents.length} / {targetStudents.length} (100%)
                </div>
              </div>
            ) : filteredAbsentStudents.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-2">
                <Search className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="text-sm font-semibold text-slate-400">
                  Tiada pelajar {absentLabel.toLowerCase()} sepadan dengan carian "{searchQuery}".
                </div>
              </div>
            ) : (
              <>
                {/* Desktop Table for Absent Students */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Bil</th>
                        <th className="py-3 px-4">Nama Pelajar</th>
                        <th className="py-3 px-4">No. Matrik / ID</th>
                        <th className="py-3 px-4">Kelas</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Tindakan Sekunder</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredAbsentStudents.map((st, index) => (
                        <tr key={st.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-slate-500">
                            {index + 1}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-white text-sm block">
                              {st.name}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-semibold text-indigo-300">
                            {st.studentId}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
                              {st.className}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 text-xs">
                              <span className="text-[10px]">❌</span>
                              <span>{absentLabel.toUpperCase()}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {st.phone ? (
                              <a
                                href={`https://wa.me/${formatWhatsAppPhone(st.phone)}?text=${encodeURIComponent(
                                  `Assalamualaikum / Salam Sejahtera ${st.name}, makluman ketidakhadiran bagi sesi ${session.subjectCode || ''} (${session.className || ''}) pada ${formatDisplayDate(session.date)}.`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Hantar Makluman WhatsApp"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600/20 text-slate-300 hover:text-emerald-300 border border-slate-700 transition-colors text-xs font-semibold cursor-pointer"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                                <span>WhatsApp</span>
                              </a>
                            ) : (
                              <span className="text-slate-600 text-[11px]">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Responsive Cards for Absent Students */}
                <div className="md:hidden space-y-2.5">
                  {filteredAbsentStudents.map((st, index) => (
                    <div
                      key={st.id}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="text-[11px] text-slate-500 font-mono">#{index + 1}</div>
                          <h4 className="font-bold text-white text-sm">
                            {st.name}
                          </h4>
                          <p className="text-xs font-mono text-indigo-300 font-semibold">
                            {st.studentId}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 text-[11px] shrink-0">
                          <span>❌</span>
                          <span>{absentLabel.toUpperCase()}</span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                        <span>Kelas: <strong className="text-slate-300">{st.className}</strong></span>
                        {st.phone && (
                          <a
                            href={`https://wa.me/${formatWhatsAppPhone(st.phone)}?text=${encodeURIComponent(
                              `Assalamualaikum / Salam Sejahtera ${st.name}, makluman ketidakhadiran bagi sesi ${session.subjectCode || ''} (${session.className || ''}) pada ${formatDisplayDate(session.date)}.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Read-Only Protection Notice */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center gap-3 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>
            {isSessionClosed
              ? 'Sesi ini telah tamat. Status kehadiran dan ketidakhadiran dimuktamatkan secara rasmi.'
              : 'Sesi ini sedang aktif. Pelajar yang belum mengimbas kod QR dilabelkan sebagai Belum Hadir.'}
          </span>
        </div>
      </div>
    </div>
  );
};
