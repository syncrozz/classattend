import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Student,
  AttendanceSession,
  Subject,
  AttendanceRecord,
  OFFICIAL_STUDENT_ATTEND_ICON
} from '../types';
import {
  getClassBadgeColor,
  getInitials,
  getStudentColor,
  sortSessionsLatestFirst
} from '../utils/studentUtils';
import {
  GraduationCap,
  QrCode,
  CheckCircle2,
  XCircle,
  Printer,
  X,
  BookOpen,
  UserCheck,
  Camera,
  FileText,
  FileCheck,
  ShieldCheck
} from 'lucide-react';

interface MyAttendanceViewProps {
  students: Student[];
  sessions: AttendanceSession[];
  subjects?: Subject[];
  attendanceRecords: AttendanceRecord[];
  onOpenStudentCheckin?: (context?: any) => void;
}

export const MyAttendanceView: React.FC<MyAttendanceViewProps> = ({
  students,
  sessions,
  subjects = [],
  attendanceRecords,
  onOpenStudentCheckin
}) => {
  // Check if student identity was saved in local storage
  const savedStudentId = typeof window !== 'undefined' ? localStorage.getItem('classattend_saved_student_id') : null;

  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    if (savedStudentId) {
      const match = students.find(
        (s) => s.studentId.toUpperCase() === savedStudentId.toUpperCase() || s.id.toUpperCase() === savedStudentId.toUpperCase()
      );
      if (match) return match.id;
    }
    return students.find((s) => s.studentId === 'PDA-2502-005')?.id || students[0]?.id || '';
  });

  const [filterSubject, setFilterSubject] = useState<string>('ALL');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState<boolean>(false);
  const [isSuratModalOpen, setIsSuratModalOpen] = useState<boolean>(false);

  const currentStudent = students.find((s) => s.id === selectedStudentId) || students[0];

  if (!currentStudent) {
    return <div className="text-center py-12 text-slate-400">Tiada profil pelajar ditemui.</div>;
  }

  // Save selection for returning zero-friction experience
  const handleSelectStudent = (id: string) => {
    setSelectedStudentId(id);
    const found = students.find((s) => s.id === id);
    if (found) {
      try {
        localStorage.setItem('classattend_saved_student_id', found.studentId);
      } catch {}
    }
  };

  // Applicable sessions for this student's class (sorted latest first)
  const applicableSessions = sortSessionsLatestFirst(
    sessions.filter((s) => !s.className || s.className === currentStudent.className || s.className === 'ALL')
  );

  // Student's records
  const studentRecords = attendanceRecords.filter(
    (r) => r.studentId === currentStudent.id && r.status === 'PRESENT'
  );

  const totalSessions = applicableSessions.length;
  const presentCount = studentRecords.length;
  const absentCount = Math.max(0, totalSessions - presentCount);
  const overallPercentage = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

  // Active open session for student's class if any
  const openSessionForClass = sessions.find(
    (s) => s.status === 'OPEN' && (!s.className || s.className === currentStudent.className || s.className === 'ALL')
  );

  // Subject breakdown stats
  const subjectStats = subjects.map((subj) => {
    const subjSessions = applicableSessions.filter((s) => s.subjectCode === subj.code || s.subjectId === subj.id);
    const subjPresent = subjSessions.filter((s) => studentRecords.some((r) => r.sessionId === s.id)).length;
    const rate = subjSessions.length > 0 ? Math.round((subjPresent / subjSessions.length) * 100) : 0;
    return {
      id: subj.id,
      code: subj.code,
      name: subj.name,
      total: subjSessions.length,
      present: subjPresent,
      rate
    };
  }).filter((s) => s.total > 0);

  // Filtered session timeline (sorted latest first)
  const filteredTimeline = sortSessionsLatestFirst(
    applicableSessions.filter((session) => {
      if (filterSubject === 'ALL') return true;
      return session.subjectCode === filterSubject || session.subjectId === filterSubject;
    })
  );

  return (
    <div className="space-y-6">
      {/* Main Student Portal Content */}
      <div className={`space-y-6 ${isPrintModalOpen || isSlipModalOpen || isSuratModalOpen ? 'no-print' : ''}`}>
        
        {/* 1. TOP LIVE CLASS CHECKIN BANNER (IF ACTIVE SESSION EXISTS) */}
        {openSessionForClass && (
          <div className="rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-indigo-950/80 border border-emerald-500/40 p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <QrCode className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                    🟢 SESI KELAS DIBUKA SEKARANG
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    [{openSessionForClass.subjectCode}]
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-white">
                  {openSessionForClass.sessionName}
                </h3>
                <p className="text-xs text-slate-300">
                  Pensyarah: <strong className="text-white">{openSessionForClass.lecturerName}</strong> • Kelas {openSessionForClass.className}
                </p>
              </div>
            </div>

            {onOpenStudentCheckin && (
              <button
                type="button"
                id="btn-portal-scan-live-session"
                onClick={() => onOpenStudentCheckin({
                  sessionId: openSessionForClass.id,
                  sessionName: openSessionForClass.sessionName,
                  subjectCode: openSessionForClass.subjectCode,
                  subjectName: openSessionForClass.subjectName,
                  className: openSessionForClass.className,
                  lecturerName: openSessionForClass.lecturerName
                })}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 active:scale-95"
              >
                <Camera className="w-4 h-4" />
                <span>✓ Sahkan Kehadiran Saya Sekarang</span>
              </button>
            )}
          </div>
        )}

        {/* 2. STUDENT IDENTITY BANNER & SELECTOR */}
        <div className="rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 border border-indigo-500/30 p-4 sm:p-5 shadow-xl space-y-3.5">
          {/* Header Row: Portal Badge + Class Badge */}
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-indigo-500/15">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>PORTAL KEHADIRAN PELAJAR</span>
              </span>
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border ${getClassBadgeColor(currentStudent.className)}`}>
              Kelas {currentStudent.className}
            </span>
          </div>

          {/* Student Profile Block: Avatar, Name & Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 sm:gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0 shadow-lg ${getStudentColor(currentStudent.id)}`}>
                {getInitials(currentStudent.name)}
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug">
                  {currentStudent.name}
                </h2>

                <p className="text-xs text-slate-300 font-mono flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span>No. Pelajar: <strong className="text-indigo-400">{currentStudent.studentId}</strong></span>
                  <span className="text-slate-500 hidden sm:inline">•</span>
                  <span className="text-slate-400">{currentStudent.department || 'Diploma Perakaunan'}</span>
                </p>
              </div>
            </div>

            {/* Quick Action Buttons for Student Documents */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSlipModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <FileCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Slip Rasmi</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSuratModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Surat Tunjuk Sebab</span>
              </button>
            </div>
          </div>

          {/* Profile Selector Row */}
          <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <label className="text-[11px] font-semibold text-slate-400 shrink-0 uppercase tracking-wider">
              PROFIL PELAJAR AKTIF:
            </label>
            <div className="flex-1">
              <select
                value={selectedStudentId}
                onChange={(e) => handleSelectStudent(e.target.value)}
                className="w-full px-3 py-1.5 sm:py-2 rounded-xl bg-slate-950/70 border border-slate-700/80 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
              >
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.studentId} — {st.name} ({st.className})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 3. STATS OVERVIEW & PERSONAL DIGITAL QR BADGE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Attendance KPI & Subject breakdown */}
          <div className="lg:col-span-2 space-y-4">
            {/* Overall Percentage Card */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                    Kadar Kehadiran Kelas Keseluruhan
                  </h3>
                  <p className="text-xs text-slate-500">Merangkumi semua kuliah & tutorial mengikut kelas {currentStudent.className}</p>
                </div>
                <div className="text-right">
                  <span className={`text-3xl sm:text-4xl font-black ${overallPercentage >= 80 ? 'text-emerald-400' : overallPercentage >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {overallPercentage}%
                  </span>
                </div>
              </div>

              {/* Visual Progress Bar */}
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    overallPercentage >= 80
                      ? 'bg-gradient-to-r from-indigo-500 via-emerald-400 to-teal-400'
                      : overallPercentage >= 60
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                      : 'bg-gradient-to-r from-rose-500 to-red-400'
                  }`}
                  style={{ width: `${overallPercentage}%` }}
                ></div>
              </div>

              {/* Quick Metrics */}
              <div className="grid grid-cols-3 gap-3 pt-2 text-center">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-lg font-bold text-white">{presentCount}</div>
                  <div className="text-[11px] text-emerald-400 font-semibold">Hadir</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-lg font-bold text-white">{absentCount}</div>
                  <div className="text-[11px] text-rose-400 font-semibold">Tidak Hadir</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-lg font-bold text-white">{totalSessions}</div>
                  <div className="text-[11px] text-slate-400 font-semibold">Jumlah Sesi Kelas</div>
                </div>
              </div>
            </div>

            {/* Subject Analytics Breakdown */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Prestasi Mengikut Kursus / Subjek</h3>
              </div>

              {subjectStats.length === 0 ? (
                <p className="text-xs text-slate-500 py-2">Tiada data subjek untuk kelas ini.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {subjectStats.map((s) => (
                    <div key={s.id} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-indigo-400 block">{s.code}</span>
                          <span className="text-xs font-semibold text-slate-300 truncate max-w-[150px] block" title={s.name}>{s.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-white block">{s.present}/{s.total}</span>
                          <span className={`text-[10px] font-bold ${s.rate >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>{s.rate}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${s.rate >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                          style={{ width: `${s.rate}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Col: Personal QR Code for in-class scanning */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 flex flex-col items-center justify-between text-center space-y-4 shadow-xl">
            <div>
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                <QrCode className="w-4 h-4" />
                <span>Kod QR Kehadiran Kelas</span>
              </div>
              <h4 className="text-base font-bold text-white">Kad ID Pelajar Digital</h4>
              <p className="text-xs text-slate-400 mt-1">
                Pamerkan kod ini kepada pensyarah semasa sesi imbasan kehadiran kelas bermula.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white shadow-2xl inline-block">
              <QRCodeSVG
                value={`STUDENT|${currentStudent.studentId}`}
                size={170}
                level="H"
              />
            </div>

            <div className="space-y-0.5">
              <div className="text-sm font-bold text-white">{currentStudent.name}</div>
              <div className="text-xs font-mono font-bold text-indigo-400">{currentStudent.studentId}</div>
              <div className="text-[10px] text-slate-400">Kelas {currentStudent.className}</div>
            </div>

            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-2 no-print"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Kad ID Pelajar</span>
            </button>
          </div>
        </div>

        {/* 4. TIMELINE OF CLASS SESSIONS */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">Jadual & Rekod Sesi Kelas</h3>
              <p className="text-xs text-slate-400">Senarai semua kuliah dan tutorial mengikut subjek yang didaftarkan</p>
            </div>

            {/* Subject Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => setFilterSubject('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  filterSubject === 'ALL'
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                Semua Kursus
              </button>
              {subjects.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setFilterSubject(sub.code)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    filterSubject === sub.code
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {sub.code}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline List */}
          <div className="space-y-2.5">
            {filteredTimeline.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                Tiada sesi kelas dijadualkan bagi kursus ini.
              </div>
            ) : (
              filteredTimeline.map((session) => {
                const rec = attendanceRecords.find(
                  (r) => r.sessionId === session.id && r.studentId === currentStudent.id
                );
                const isAttended = rec?.status === 'PRESENT';

                return (
                  <div
                    key={session.id}
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                      isAttended
                        ? 'bg-emerald-950/20 border-emerald-500/30'
                        : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {session.subjectCode && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                            {session.subjectCode}
                          </span>
                        )}
                        {session.status === 'OPEN' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                            🟢 KELAS SEDANG BERLANGSUNG
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-white">
                        {session.sessionName}
                      </h4>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 pt-0.5">
                        {session.lecturerName && (
                          <span className="text-slate-300 flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-slate-500" />
                            <span>Pensyarah: {session.lecturerName}</span>
                          </span>
                        )}
                        <span>{session.date} {session.startTime ? `• ${session.startTime} - ${session.endTime}` : ''}</span>
                      </div>
                    </div>

                    {/* Status Outcome */}
                    <div className="flex items-center gap-3 shrink-0">
                      {isAttended ? (
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/40 shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>HADIR</span>
                          </span>
                          <div className="text-[10px] text-slate-400 mt-1 font-mono">
                            {new Date(rec.timestamp).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })} ({rec.method})
                          </div>
                        </div>
                      ) : (
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-semibold border border-slate-700">
                            <XCircle className="w-3.5 h-3.5 text-slate-500" />
                            <span>TIDAK HADIR</span>
                          </span>
                          <div className="text-[10px] text-slate-500 mt-1">
                            {session.status === 'OPEN' ? 'Sesi sedang buka' : 'Sesi telah ditutup'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 5. SLIP KEHADIRAN RASMI MODAL */}
      {isSlipModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center no-print">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck className="w-4 h-4" />
                <span>Slip Rasmi Kehadiran Pelajar</span>
              </span>
              <button
                onClick={() => setIsSlipModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Slip Paper Format */}
            <div className="p-6 rounded-2xl bg-white text-slate-900 border border-slate-300 shadow-xl space-y-4 text-xs">
              <div className="text-center border-b pb-3 border-slate-300 space-y-1">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900">
                  KOLEJ PROFESIONAL MARA BANDAR PENAWAR
                </h3>
                <p className="text-[11px] text-slate-600 font-semibold">
                  SLIP PENGESAHAN KEHADIRAN KULIAH & TUTORIAL
                </p>
                <p className="text-[10px] text-slate-500">
                  Tarikh Cetakan: {new Date().toLocaleDateString('ms-MY')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500">Nama Pelajar:</span>
                  <div className="font-bold text-slate-900">{currentStudent.name}</div>
                </div>
                <div>
                  <span className="text-slate-500">No. Matrik:</span>
                  <div className="font-mono font-bold text-slate-900">{currentStudent.studentId}</div>
                </div>
                <div>
                  <span className="text-slate-500">Kelas / Seksyen:</span>
                  <div className="font-bold text-slate-900">{currentStudent.className}</div>
                </div>
                <div>
                  <span className="text-slate-500">Program:</span>
                  <div className="font-bold text-slate-900">{currentStudent.department || 'Diploma Perakaunan'}</div>
                </div>
              </div>

              <div className="border-t border-b border-slate-200 py-2 space-y-1">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>Kadar Kehadiran Keseluruhan:</span>
                  <span className="text-sm">{overallPercentage}% ({presentCount}/{totalSessions} Sesi)</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  {overallPercentage >= 80 ? 'Status: MEMENUHI SYARAT PEPERIKSAAN (≥80%)' : 'Status: AMARAN KEHADIRAN (<80%)'}
                </div>
              </div>

              <div className="pt-4 flex justify-between text-[10px] text-slate-500">
                <div className="text-center">
                  <div className="w-28 border-b border-slate-400 pb-8"></div>
                  <span className="mt-1 block">Tandatangan Pelajar</span>
                </div>
                <div className="text-center">
                  <div className="w-28 border-b border-slate-400 pb-8"></div>
                  <span className="mt-1 block">Pengesahan Pensyarah</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2 no-print"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Slip Kehadiran (PDF)</span>
            </button>
          </div>
        </div>
      )}

      {/* 6. SURAT TUNJUK SEBAB GENERATOR */}
      {isSuratModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center no-print">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                <span>Surat Tunjuk Sebab Ketidakhadiran</span>
              </span>
              <button
                onClick={() => setIsSuratModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-white text-slate-900 border border-slate-300 shadow-xl space-y-3 text-xs">
              <div className="border-b pb-2 text-slate-800">
                <div className="font-bold">Daripada: {currentStudent.name} ({currentStudent.studentId})</div>
                <div>Kelas: {currentStudent.className}</div>
                <div>Kepada: Pensyarah / Penyelaras Kursus KPM Bandar Penawar</div>
              </div>

              <div className="font-bold uppercase text-[11px] text-slate-900">
                PERKARA: SURAT TUNJUK SEBAB TIDAK HADIR KE KULIAH / TUTORIAL
              </div>

              <p className="text-slate-700 leading-relaxed text-[11px]">
                Saya seperti nama di atas ingin memaklumkan sebab ketidakhadiran saya bagi sesi kelas yang berkenaan adalah disebabkan alasan rasmi / kecemasan.
              </p>

              <div className="p-2 rounded bg-slate-100 border border-slate-200 space-y-1 text-[10px]">
                <div>Jumlah Kelas Tidak Hadir: <strong>{absentCount} Sesi</strong></div>
                <div>Kadar Kehadiran Semasa: <strong>{overallPercentage}%</strong></div>
              </div>

              <div className="pt-4 flex justify-between text-[10px] text-slate-500">
                <div className="text-center">
                  <div className="w-28 border-b border-slate-400 pb-8"></div>
                  <span className="mt-1 block">Tandatangan Pelajar</span>
                </div>
                <div className="text-center">
                  <div className="w-28 border-b border-slate-400 pb-8"></div>
                  <span className="mt-1 block">Tindakan Pensyarah</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => window.print()}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2 no-print"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Surat Tunjuk Sebab (PDF)</span>
            </button>
          </div>
        </div>
      )}

      {/* 7. STUDENT DIGITAL QR BADGE PRINT MODAL */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 printable-modal-wrapper">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-center space-y-5 printable-modal-content">
            <div className="flex justify-between items-center no-print">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Kad Pengenalan Digital Pelajar
              </span>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ID Card Front - Strict 9:16 Aspect Ratio */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 shadow-xl flex flex-col justify-between items-center text-center aspect-[9/16] w-full max-w-[280px] mx-auto printable-id-card">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 w-full">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-indigo-400" />
                  <div className="text-left">
                    <span className="text-xs font-bold text-white block">ClassAttend ID</span>
                    <span className="text-[9px] text-slate-400 block tracking-tight">KPM BANDAR PENAWAR</span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border badge-student-set ${getClassBadgeColor(currentStudent.className)}`}>
                  {currentStudent.className}
                </span>
              </div>

              {/* QR Code */}
              <div className="p-3 bg-white rounded-xl inline-block shadow-lg mx-auto my-auto qr-code-wrapper">
                <QRCodeSVG
                  value={`STUDENT|${currentStudent.studentId}`}
                  size={150}
                  level="H"
                  includeMargin={false}
                />
              </div>

              <div className="space-y-0.5 w-full pb-1">
                <h4 className="text-sm font-extrabold text-white line-clamp-2">
                  {currentStudent.name}
                </h4>
                <div className="text-xs font-mono font-bold text-indigo-400 student-id-text">
                  {currentStudent.studentId}
                </div>
                <div className="text-[10px] text-slate-400">
                  {currentStudent.department || 'Diploma Perakaunan'}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 no-print">
              Pelajar boleh memaparkan QR ini pada telefon atau kad bercetak untuk sebarang sesi kehadiran kelas pensyarah.
            </p>

            <button
              onClick={() => window.print()}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/30 cursor-pointer flex items-center justify-center gap-2 no-print"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Kad ID Pelajar (PDF)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
