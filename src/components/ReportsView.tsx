import React, { useState } from 'react';
import {
  Student,
  AttendanceSession,
  Subject,
  AttendanceRecord,
  Lecturer
} from '../types';
import {
  getClassBadgeColor,
  getInitials,
  getStudentColor
} from '../utils/studentUtils';
import {
  exportSessionAttendanceToCSV,
  downloadCSV
} from '../utils/csvHelper';
import {
  generateWhatsAppWarningLink
} from '../utils/whatsappHelper';
import {
  Download,
  Printer,
  Search,
  CheckCircle2,
  XCircle,
  BookOpen,
  UserCheck,
  Award,
  Layers,
  BarChart3,
  Users,
  Lock
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell
} from 'recharts';

interface ReportsViewProps {
  students: Student[];
  sessions: AttendanceSession[];
  subjects?: Subject[];
  attendanceRecords: AttendanceRecord[];
  isAdmin?: boolean;
  activeLecturer?: Lecturer | null;
  onRequestAdminAccess?: (actionName?: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  students,
  sessions,
  subjects = [],
  attendanceRecords,
  isAdmin = false,
  activeLecturer = null,
  onRequestAdminAccess
}) => {
  const [reportPerspective, setReportPerspective] = useState<'SESSION' | 'CLASS' | 'STUDENT'>('CLASS');
  const [selectedSessionId, setSelectedSessionId] = useState<string>(sessions[0]?.id || '');
  const [selectedClassSection, setSelectedClassSection] = useState<string>('DIA_3A');
  const [filterSet, setFilterSet] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const currentSession = sessions.find((s) => s.id === selectedSessionId) || sessions[0];

  // Extract unique classes dynamically including standard cohorts
  const DEFAULT_CLASSES = ['DIA_3A', 'DIA_3B', 'DIA_3C', 'DIA_3D', 'DIA_4A', 'DIA_4B', 'DIA_4C', 'DIA_4D'];
  const uniqueClasses: string[] = Array.from(
    new Set([...DEFAULT_CLASSES, ...students.map((s) => s.className).filter(Boolean)])
  ).sort();

  // Records for current session
  const sessionRecords = currentSession
    ? attendanceRecords.filter((r) => r.sessionId === currentSession.id)
    : [];

  const recordMap = new Map<string, AttendanceRecord>();
  sessionRecords.forEach((r) => recordMap.set(r.studentId, r));

  // Determine target students for current session
  let targetStudents = students;
  if (currentSession?.className) {
    targetStudents = students.filter((s) => s.className === currentSession.className);
  }

  // Filtered by set & status & search
  const filteredSessionStudents = targetStudents.filter((student) => {
    const matchesSet = filterSet === 'ALL' || student.className === filterSet;
    const isPresent = recordMap.has(student.id) && recordMap.get(student.id)?.status === 'PRESENT';
    const matchesStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'PRESENT' && isPresent) ||
      (filterStatus === 'ABSENT' && !isPresent);

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      student.name.toLowerCase().includes(q) ||
      student.studentId.toLowerCase().includes(q);

    return matchesSet && matchesStatus && matchesSearch;
  });

  const totalTargetCount = targetStudents.length;
  const presentCount = targetStudents.filter((s) => recordMap.has(s.id) && recordMap.get(s.id)?.status === 'PRESENT').length;
  const absentCount = Math.max(0, totalTargetCount - presentCount);
  const sessionPercent = totalTargetCount > 0 ? Math.round((presentCount / totalTargetCount) * 100) : 0;

  // Chart Data: Class Section Performance for current session
  const setPerformanceData = uniqueClasses.map((setName) => {
    const classTotal = students.filter((s) => s.className === setName).length;
    const classPresent = students.filter(
      (s) => s.className === setName && recordMap.has(s.id) && recordMap.get(s.id)?.status === 'PRESENT'
    ).length;
    const rate = classTotal > 0 ? Math.round((classPresent / classTotal) * 100) : 0;
    return {
      name: setName,
      Hadir: classPresent,
      Jumlah: classTotal,
      Peratus: rate
    };
  });

  // Handle Export Session CSV
  const handleExportSessionCSV = () => {
    if (!currentSession) return;
    if (!isAdmin && !activeLecturer && onRequestAdminAccess) {
      onRequestAdminAccess(`Eksport Data Laporan Kehadiran (${currentSession.sessionName})`);
      return;
    }
    const csvContent = exportSessionAttendanceToCSV(currentSession, students, attendanceRecords);
    downloadCSV(csvContent, `Laporan_Kehadiran_Kelas_${currentSession.sessionName.replace(/\s+/g, '_')}.csv`);
  };

  // Class-Perspective Data Calculations
  const classSummaryStats = uniqueClasses.map((clsName) => {
    const classStudents = students.filter((s) => s.className === clsName);
    const applicableSessions = sessions.filter((s) => !s.className || s.className === clsName);
    const totalSlots = classStudents.length * applicableSessions.length;
    const presentSlots = attendanceRecords.filter(
      (r) =>
        r.status === 'PRESENT' &&
        classStudents.some((s) => s.id === r.studentId) &&
        applicableSessions.some((sess) => sess.id === r.sessionId)
    ).length;
    const rate = totalSlots > 0 ? Math.round((presentSlots / totalSlots) * 100) : 0;

    return {
      name: clsName,
      totalStudents: classStudents.length,
      sessionCount: applicableSessions.length,
      presentSlots,
      totalSlots,
      rate
    };
  });

  // Specific selected class student records
  const targetClassStudents = students.filter((s) => s.className === selectedClassSection);
  const targetClassSessions = sessions.filter((s) => !s.className || s.className === selectedClassSection);

  const selectedClassStudentStats = targetClassStudents
    .filter((st) => {
      const q = searchQuery.toLowerCase();
      return st.name.toLowerCase().includes(q) || st.studentId.toLowerCase().includes(q);
    })
    .map((st) => {
      const studentRecs = attendanceRecords.filter((r) => r.studentId === st.id && r.status === 'PRESENT');
      const rate = targetClassSessions.length > 0 ? Math.round((studentRecs.length / targetClassSessions.length) * 100) : 0;

      return {
        student: st,
        present: studentRecs.length,
        total: targetClassSessions.length,
        rate
      };
    });

  // Export Class Specific CSV
  const handleExportClassCSV = () => {
    if (!isAdmin && !activeLecturer && onRequestAdminAccess) {
      onRequestAdminAccess(`Eksport Laporan Kehadiran Kelas ${selectedClassSection}`);
      return;
    }
    const headers = 'Bil,No_Pelajar,Nama_Pelajar,Kelas,Jumlah_Sesi_Hadir,Jumlah_Sesi_Keseluruhan,Peratus_Kehadiran\n';
    const rows = selectedClassStudentStats.map((item, idx) =>
      `${idx + 1},"${item.student.studentId}","${item.student.name}","${item.student.className}",${item.present},${item.total},${item.rate}%`
    ).join('\n');
    downloadCSV(headers + rows, `Laporan_Kehadiran_Kelas_${selectedClassSection}.csv`);
  };

  // Student-Centric list calculations
  const studentReportsList = students
    .filter((st) => {
      const matchesSet = filterSet === 'ALL' || st.className === filterSet;
      const q = searchQuery.toLowerCase();
      const matchesSearch = st.name.toLowerCase().includes(q) || st.studentId.toLowerCase().includes(q);
      return matchesSet && matchesSearch;
    })
    .map((st) => {
      const applicableSessions = sessions.filter((s) => !s.className || s.className === st.className);
      const studentRecs = attendanceRecords.filter((r) => r.studentId === st.id && r.status === 'PRESENT');
      const rate = applicableSessions.length > 0 ? Math.round((studentRecs.length / applicableSessions.length) * 100) : 0;

      return {
        student: st,
        total: applicableSessions.length,
        present: studentRecs.length,
        rate
      };
    });

  return (
    <div className="space-y-6 printable-report-container">
      {/* Top Header & Perspective Switcher */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4 no-print shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Laporan & Analitik Kehadiran Kelas</h2>
            <p className="text-xs text-slate-400">
              Analisis peratus kehadiran mengikut kelas masing-masing, sesi kuliah, dan profil pelajar
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Perspective Toggle (3 Perspectives: CLASS, SESSION, STUDENT) */}
            <div className="p-1 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1">
              <button
                id="btn-report-perspective-class"
                onClick={() => setReportPerspective('CLASS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  reportPerspective === 'CLASS'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                👥 Mengikut Kelas
              </button>
              <button
                id="btn-report-perspective-session"
                onClick={() => setReportPerspective('SESSION')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  reportPerspective === 'SESSION'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                📅 Sesi Kuliah
              </button>
              <button
                id="btn-report-perspective-student"
                onClick={() => setReportPerspective('STUDENT')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  reportPerspective === 'STUDENT'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🎓 Pelajar
              </button>
            </div>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2.5">
            {reportPerspective === 'CLASS' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold">Pilih Kelas:</span>
                <select
                  value={selectedClassSection}
                  onChange={(e) => setSelectedClassSection(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-indigo-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {uniqueClasses.map((cls) => (
                    <option key={cls} value={cls}>Kelas {cls}</option>
                  ))}
                </select>
              </div>
            )}

            {reportPerspective === 'SESSION' && (
              <select
                id="report-select-session"
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 cursor-pointer max-w-md"
              >
                {sessions.map((s) => {
                  const subjectDetail = s.subjectCode ? `[${s.subjectCode}] ` : '';
                  const classDetail = s.className ? ` (${s.className})` : '';
                  const statusPrefix = s.status === 'OPEN' ? '🟢 ' : '🔵 ';

                  return (
                    <option key={s.id} value={s.id}>
                      {statusPrefix}{subjectDetail}{s.sessionName}{classDetail}
                    </option>
                  );
                })}
              </select>
            )}

            {reportPerspective !== 'CLASS' && (
              <select
                value={filterSet}
                onChange={(e) => setFilterSet(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="ALL">Semua Kelas</option>
                {uniqueClasses.map((cls) => (
                  <option key={cls} value={cls}>Kelas {cls}</option>
                ))}
              </select>
            )}

            {reportPerspective === 'SESSION' && (
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="ALL">Semua Status</option>
                <option value="PRESENT">Hadir Sahaja</option>
                <option value="ABSENT">Tidak Hadir Sahaja</option>
              </select>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Cari nama atau No. Pelajar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-48 sm:w-56"
              />
            </div>

            {reportPerspective === 'CLASS' ? (
              <button
                onClick={handleExportClassCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                title={!isAdmin && !activeLecturer ? 'Perlu pengesahan Pensyarah/Admin untuk eksport CSV' : 'Eksport Fail CSV Kelas Ini'}
              >
                {!isAdmin && !activeLecturer ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Download className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Eksport CSV Kelas</span>
              </button>
            ) : (
              <button
                onClick={handleExportSessionCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                title={!isAdmin && !activeLecturer ? 'Perlu pengesahan Pensyarah/Admin untuk eksport CSV' : 'Eksport Fail CSV'}
              >
                {!isAdmin && !activeLecturer ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Download className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Eksport CSV</span>
              </button>
            )}

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              title="Cetak Lembaran Laporan"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cetak</span>
            </button>
          </div>
        </div>
      </div>

      {/* PERSPECTIVE 1: CLASS-CENTRIC (MENGIKUT KELAS MASING-MASING) */}
      {reportPerspective === 'CLASS' && (
        <div className="space-y-6">
          {/* Class Section Overview Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {classSummaryStats.map((cls, clsIdx) => {
              const isSelected = cls.name === selectedClassSection;
              const isHigh = cls.rate >= 90;
              const isMedium = cls.rate >= 75 && cls.rate < 90;

              return (
                <button
                  key={`report-cls-tile-${cls.name}-${clsIdx}`}
                  type="button"
                  onClick={() => setSelectedClassSection(cls.name)}
                  className={`p-4 rounded-xl text-left transition-all cursor-pointer space-y-2 border ${
                    isSelected
                      ? 'bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Baris 1: Nama Kelas */}
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${getClassBadgeColor(cls.name)}`}>
                      Kelas {cls.name}
                    </span>
                  </div>

                  {/* Baris 2: Status KPI */}
                  <div className="flex items-center">
                    <span
                      className={`inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded border ${
                        cls.rate >= 80
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {cls.rate >= 80 ? '✅ KPI Dipenuhi' : '❌ Perlu Surat Amaran'}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <div>
                      <div className="text-3xl font-black text-white">
                        {cls.rate}<span className="text-lg text-indigo-400">%</span>
                      </div>
                      <div className="text-[10px] text-slate-400">Purata Kehadiran</div>
                    </div>
                    <div className="text-right text-xs text-slate-300">
                      <div className="font-bold">{cls.totalStudents} Pelajar</div>
                      <div className="text-[10px] text-slate-500">{cls.sessionCount} Sesi Kuliah</div>
                    </div>
                  </div>

                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isHigh ? 'bg-emerald-400' : isMedium ? 'bg-indigo-400' : 'bg-amber-400'
                      }`}
                      style={{ width: `${cls.rate}%` }}
                    ></div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Table of Students in the Selected Class */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-lg">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${getClassBadgeColor(selectedClassSection)}`}>
                  Kelas {selectedClassSection}
                </span>
                <span className="text-xs font-bold text-white">
                  Senarai Terperinci Pelajar ({selectedClassStudentStats.length} Pelajar)
                </span>
              </div>
              <div className="text-xs text-slate-400">
                Jumlah Sesi Terlibat: <strong className="text-white">{targetClassSessions.length} Sesi</strong>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Bil</th>
                    <th className="py-3 px-4">No. Pelajar</th>
                    <th className="py-3 px-4">Nama Pelajar</th>
                    <th className="py-3 px-4 text-center">Sesi Hadir</th>
                    <th className="py-3 px-4 text-center">Peratus % Kehadiran</th>
                    <th className="py-3 px-4 text-center">Status KPI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {selectedClassStudentStats.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        Tiada pelajar ditemui untuk kelas {selectedClassSection}.
                      </td>
                    </tr>
                  ) : (
                    selectedClassStudentStats.map((item, idx) => {
                      const isHigh = item.rate >= 90;
                      const isMedium = item.rate >= 75 && item.rate < 90;

                      return (
                        <tr key={item.student.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 text-slate-500 font-mono">{idx + 1}</td>
                          <td className="py-3 px-4 font-mono font-bold text-indigo-400">{item.student.studentId}</td>
                          <td className="py-3 px-4 font-semibold text-white">{item.student.name}</td>
                          <td className="py-3 px-4 text-center font-mono text-slate-300">
                            {item.present} / {item.total}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full font-bold text-xs ${
                                isHigh
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : isMedium
                                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {item.rate}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {item.rate >= 80 ? (
                              <span
                                className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm"
                                title="Lulus KPI (≥ 80%)"
                              >
                                ✅
                              </span>
                            ) : (() => {
                              const waUrl = generateWhatsAppWarningLink({
                                student: item.student,
                                className: selectedClassSection,
                                presentCount: item.present,
                                totalSessions: item.total,
                                rate: item.rate,
                                courseCode: targetClassSessions[0]?.subjectCode,
                                courseName: targetClassSessions[0]?.sessionName,
                                lecturerName: targetClassSessions[0]?.lecturerName
                              });

                              return waUrl ? (
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 hover:border-rose-400 shadow-sm hover:scale-105 transition-all cursor-pointer group"
                                  title={`❌ Perlu Surat Amaran (< 80%). Klik untuk buka WhatsApp & hantar rekod amaran kehadiran rasmi kepada ${item.student.name} (${item.student.phone})`}
                                >
                                  <span>❌</span>
                                  <span className="text-[10px] font-semibold text-rose-300 group-hover:text-white underline-offset-2 group-hover:underline">
                                    WhatsApp
                                  </span>
                                </a>
                              ) : (
                                <span
                                  className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-sm"
                                  title="Perlu Surat Amaran (< 80%) - No. telefon belum didaftarkan"
                                >
                                  ❌
                                </span>
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PERSPECTIVE 2: SESSION-CENTRIC */}
      {reportPerspective === 'SESSION' && !currentSession && (
        <div className="text-center py-16 bg-slate-900/60 rounded-2xl border border-slate-800 p-6 flex flex-col items-center justify-center space-y-3">
          <BookOpen className="w-10 h-10 text-indigo-500/40" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white">Tiada Sesi Kuliah Direkodkan</h4>
            <p className="text-xs text-slate-400 max-w-md">
              Sistem kini bersih daripada data demo. Sila cipta subjek dan sesi kuliah di tab "Pengurusan Kelas" untuk mula merekod dan melihat laporan kehadiran.
            </p>
          </div>
        </div>
      )}

      {reportPerspective === 'SESSION' && currentSession && (
        <div className="space-y-6 printable-report-container">
          {/* Summary KPIs & Set Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* KPI Box */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {currentSession.subjectCode && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                        {currentSession.subjectCode}
                      </span>
                    )}
                    {currentSession.className && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
                        Kelas {currentSession.className}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white">
                    {currentSession.sessionName}
                  </h3>
                  {currentSession.lecturerName && (
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-indigo-400" />
                      <span>Pensyarah: <strong className="text-slate-200">{currentSession.lecturerName}</strong></span>
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-black text-emerald-400">{sessionPercent}%</div>
                  <div className="text-[10px] text-slate-400">Kehadiran</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-base font-bold text-white">{presentCount}</div>
                  <div className="text-[10px] text-emerald-400 font-semibold">Hadir</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-base font-bold text-white">{absentCount}</div>
                  <div className="text-[10px] text-rose-400 font-semibold">Tidak Hadir</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-base font-bold text-white">{totalTargetCount}</div>
                  <div className="text-[10px] text-slate-400 font-semibold">Sasaran</div>
                </div>
              </div>

              <div className="text-xs text-slate-400 space-y-1 pt-1 border-t border-slate-800/80">
                <div>🕒 Masa & Tarikh: <strong className="text-slate-300">{currentSession.date} {currentSession.startTime ? `(${currentSession.startTime} - ${currentSession.endTime})` : ''}</strong></div>
              </div>
            </div>

            {/* Set Comparison Bar Chart */}
            <div className="lg:col-span-2 rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-2">
              <h3 className="text-sm font-bold text-white">Analitik Kehadiran Mengikut Kelas (%)</h3>
              <div className="h-44 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={setPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Bar dataKey="Peratus" radius={[6, 6, 0, 0]}>
                      {setPerformanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.Peratus >= 80 ? '#10b981' : entry.Peratus >= 50 ? '#6366f1' : '#f59e0b'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* TABLE OF STUDENTS FOR THIS SESSION */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-lg">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="text-xs font-bold text-white">
                Lembaran Kehadiran Kelas ({filteredSessionStudents.length} Pelajar)
              </div>
              <span className="text-[11px] text-slate-400">
                KPM Bandar Penawar
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Bil</th>
                    <th className="py-3 px-4">No. Pelajar</th>
                    <th className="py-3 px-4">Nama Penuh Pelajar</th>
                    <th className="py-3 px-4">Kelas</th>
                    <th className="py-3 px-4">Status Kehadiran</th>
                    <th className="py-3 px-4">Masa Imbasan</th>
                    <th className="py-3 px-4">Kaedah</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredSessionStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        Tiada pelajar ditemui mengikut tapisan semasa.
                      </td>
                    </tr>
                  ) : (
                    filteredSessionStudents.map((st, idx) => {
                      const rec = recordMap.get(st.id);
                      const isPresent = rec?.status === 'PRESENT';

                      return (
                        <tr key={st.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 text-slate-500 font-mono">{idx + 1}</td>
                          <td className="py-3 px-4 font-mono font-bold text-indigo-400">{st.studentId}</td>
                          <td className="py-3 px-4 font-semibold text-white">{st.name}</td>
                          <td className="py-3 px-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getClassBadgeColor(st.className)}`}>
                              {st.className}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {isPresent ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/40">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>HADIR</span>
                              </span>
                            ) : (() => {
                              const sessionWaUrl = generateWhatsAppWarningLink({
                                student: st,
                                sessionName: currentSession.sessionName,
                                sessionDate: currentSession.date,
                                sessionTime: currentSession.startTime ? `${currentSession.startTime} - ${currentSession.endTime}` : undefined,
                                courseCode: currentSession.subjectCode,
                                courseName: currentSession.sessionName,
                                className: currentSession.className || st.className,
                                lecturerName: currentSession.lecturerName
                              });

                              return sessionWaUrl ? (
                                <a
                                  href={sessionWaUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 hover:border-rose-400 text-[10px] font-bold transition-all cursor-pointer group"
                                  title={`Tidak Hadir Sesi Ini. Klik untuk hubungi ${st.name} via WhatsApp (${st.phone})`}
                                >
                                  <XCircle className="w-3 h-3 text-rose-400" />
                                  <span>TIDAK HADIR</span>
                                  <span className="text-[9px] px-1 rounded bg-rose-950/80 text-rose-300 group-hover:text-white underline-offset-2 group-hover:underline">
                                    WhatsApp
                                  </span>
                                </a>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-semibold border border-rose-500/30">
                                  <XCircle className="w-3 h-3" />
                                  <span>TIDAK HADIR</span>
                                </span>
                              );
                            })()}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                            {rec ? new Date(rec.timestamp).toLocaleTimeString('ms-MY') : '-'}
                          </td>
                          <td className="py-3 px-4 text-[10px] uppercase text-slate-500">
                            {rec ? rec.method : '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PERSPECTIVE 3: STUDENT-CENTRIC */}
      {reportPerspective === 'STUDENT' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-lg">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="text-xs font-bold text-white">
                Ringkasan Prestasi Kumulatif Pelajar ({studentReportsList.length} Pelajar)
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">No. Pelajar</th>
                    <th className="py-3 px-4">Nama Pelajar</th>
                    <th className="py-3 px-4">Kelas</th>
                    <th className="py-3 px-4 text-center">Kehadiran Kelas Keseluruhan</th>
                    <th className="py-3 px-4">Sesi Hadir / Jumlah</th>
                    <th className="py-3 px-4 text-center">Status KPI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {studentReportsList.map((item) => (
                    <tr key={item.student.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-400">{item.student.studentId}</td>
                      <td className="py-3 px-4 font-semibold text-white">{item.student.name}</td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getClassBadgeColor(item.student.className)}`}>
                          {item.student.className}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-xs ${
                            item.rate >= 80
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : item.rate >= 60
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {item.rate}%
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {item.present} / {item.total}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.rate >= 80 ? (
                          <span
                            className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm"
                            title="Lulus KPI (≥ 80%)"
                          >
                            ✅
                          </span>
                        ) : (() => {
                          const waUrl = generateWhatsAppWarningLink({
                            student: item.student,
                            className: item.student.className,
                            presentCount: item.present,
                            totalSessions: item.total,
                            rate: item.rate
                          });

                          return waUrl ? (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 hover:border-rose-400 shadow-sm hover:scale-105 transition-all cursor-pointer group"
                              title={`❌ Perlu Surat Amaran (< 80%). Klik untuk buka WhatsApp & hantar rekod amaran kehadiran rasmi kepada ${item.student.name} (${item.student.phone})`}
                            >
                              <span>❌</span>
                              <span className="text-[10px] font-semibold text-rose-300 group-hover:text-white underline-offset-2 group-hover:underline">
                                WhatsApp
                              </span>
                            </a>
                          ) : (
                            <span
                              className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-sm"
                              title="Perlu Surat Amaran (< 80%) - No. telefon belum didaftarkan"
                            >
                              ❌
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
