import React, { useState } from 'react';
import {
  Student,
  Subject,
  AttendanceSession,
  AttendanceRecord,
  ScanResult,
  Lecturer
} from '../types';
import { getClassBadgeColor, getInitials, getStudentColor } from '../utils/studentUtils';
import {
  Users,
  QrCode,
  CalendarCheck,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  Search,
  BookOpen,
  UserCheck,
  Award,
  Layers,
  BarChart3,
  Filter
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

interface DashboardViewProps {
  activeSession: AttendanceSession | null;
  subjects: Subject[];
  sessions: AttendanceSession[];
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  lecturers?: Lecturer[];
  activeLecturer?: Lecturer | null;
  onOpenScanner: () => void;
  onGoToActivities: () => void;
  onGoToStudents: () => void;
  onGoToReports: () => void;
  onCloseActiveSession: (sessionId: string) => void;
  onQuickSimulateScan: (studentId: string) => ScanResult;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  activeSession,
  subjects,
  sessions,
  students,
  attendanceRecords,
  lecturers = [],
  activeLecturer,
  onOpenScanner,
  onGoToActivities,
  onGoToStudents,
  onGoToReports,
  onCloseActiveSession,
  onQuickSimulateScan
}) => {
  const [searchSimulate, setSearchSimulate] = useState('');
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [classStatScope, setClassStatScope] = useState<'CUMULATIVE' | 'ACTIVE_SESSION'>('CUMULATIVE');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('ALL');

  // Current session stats
  const activeSessionRecords = activeSession
    ? attendanceRecords.filter((r) => r.sessionId === activeSession.id && r.status === 'PRESENT')
    : [];

  const targetStudentsForActive = activeSession
    ? activeSession.className
      ? students.filter((s) => s.className === activeSession.className)
      : students
    : [];

  const matchingActiveRecords = activeSession?.className
    ? activeSessionRecords.filter((r) => {
        const st = students.find((s) => s.id === r.studentId);
        return st?.className === activeSession.className;
      })
    : activeSessionRecords;

  const activePercent =
    targetStudentsForActive.length > 0
      ? Math.round((matchingActiveRecords.length / targetStudentsForActive.length) * 100)
      : 0;

  // Dynamic Class Sets Distribution
  const availableClassSets: string[] = (Array.from(
    new Set(students.map((s) => s.className).filter(Boolean))
  ) as string[]).sort();

  const classList = availableClassSets.length > 0 ? availableClassSets : ['DIA_3A', 'DIA_3B', 'DIA_3C', 'DIA_3D', 'DIA_4A', 'DIA_4B', 'DIA_4C', 'DIA_4D'];

  // Filter sessions by selected subject
  const filteredSessions = selectedSubjectFilter === 'ALL'
    ? sessions
    : sessions.filter((s) => s.subjectId === selectedSubjectFilter || s.subjectCode === selectedSubjectFilter);

  // Comprehensive Class Statistics calculation (both cumulative and active)
  const detailedClassStats = classList.map((className) => {
    const classStudents = students.filter((s) => s.className === className);
    const studentCount = classStudents.length;

    // Active session presence for this class
    const presentInActive = activeSession
      ? classStudents.filter((s) =>
          activeSessionRecords.some((r) => r.studentId === s.id)
        ).length
      : 0;
    const activeRate = studentCount > 0 ? Math.round((presentInActive / studentCount) * 100) : 0;

    // Cumulative stats across filtered sessions
    const relevantSessions = filteredSessions.filter(
      (s) => !s.className || s.className === className
    );
    const sessionCount = relevantSessions.length;
    const totalPossibleAttendances = studentCount * sessionCount;

    let presentAttendances = 0;
    if (totalPossibleAttendances > 0) {
      presentAttendances = attendanceRecords.filter(
        (r) =>
          r.status === 'PRESENT' &&
          classStudents.some((st) => st.id === r.studentId) &&
          relevantSessions.some((sess) => sess.id === r.sessionId)
      ).length;
    }

    const cumulativeRate =
      totalPossibleAttendances > 0
        ? Math.round((presentAttendances / totalPossibleAttendances) * 100)
        : activeRate;

    // Determine current display percentage based on selected scope
    const displayRate = classStatScope === 'ACTIVE_SESSION' && activeSession ? activeRate : cumulativeRate;
    const displayPresent = classStatScope === 'ACTIVE_SESSION' && activeSession ? presentInActive : presentAttendances;
    const displayTotal = classStatScope === 'ACTIVE_SESSION' && activeSession ? studentCount : (totalPossibleAttendances || studentCount);

    const isTargeted = activeSession?.className === className;

    return {
      name: className,
      totalStudents: studentCount,
      presentInActive,
      activeRate,
      sessionCount,
      totalPossibleAttendances,
      presentAttendances,
      cumulativeRate,
      displayRate,
      displayPresent,
      displayTotal,
      isTargeted
    };
  });

  // Chart data for class % comparison
  const classChartData = detailedClassStats.map((cls) => ({
    name: `Kelas ${cls.name}`,
    shortName: cls.name,
    Peratus: cls.displayRate,
    Pelajar: cls.totalStudents,
    Hadir: cls.displayPresent
  }));

  // Sort for top performing class
  const sortedByRate = [...detailedClassStats].sort((a, b) => b.displayRate - a.displayRate);
  const bestClass = sortedByRate[0];

  // Recent 8 live scans
  const recentRecords = attendanceRecords
    .slice(0, 8)
    .map((record) => {
      const student = students.find((s) => s.id === record.studentId);
      const session = sessions.find((s) => s.id === record.sessionId);
      return { record, student, session };
    });

  // Filter students for quick simulate
  const filteredSimulateStudents = students
    .filter((s) => {
      const q = searchSimulate.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.studentId.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q)
      );
    })
    .slice(0, 6);

  const handleSimulate = (studentId: string) => {
    const res = onQuickSimulateScan(studentId);
    setLastScanResult(res);
  };

  return (
    <div className="space-y-6">
      {/* 1. HERO / ACTIVE SESSION ACTION BANNER */}
      {activeSession ? (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 border border-indigo-500/30 p-5 sm:p-6 shadow-xl">
          <div className="flex flex-col gap-5 w-full">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  SESI KELAS SEDANG DIBUKA
                </span>
                {activeSession.subjectCode && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                    {activeSession.subjectCode}
                  </span>
                )}
                {activeSession.className && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
                    Kelas {activeSession.className}
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {activeSession.sessionName}
              </h2>
              {activeSession.subjectName && (
                <p className="text-xs text-indigo-300 font-medium flex items-center gap-1.5">
                  <span className="text-slate-400">Subjek:</span>
                  <span className="text-white font-semibold">{activeSession.subjectCode ? `${activeSession.subjectCode} - ` : ''}{activeSession.subjectName}</span>
                </p>
              )}
              <p className="text-xs sm:text-sm text-slate-300 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>👨‍🏫 {activeSession.lecturerName ? `Pensyarah: ${activeSession.lecturerName}` : (activeSession.organizer || 'Pensyarah Kursus')}</span>
              </p>
            </div>

            {/* Quick Metrics & Actions */}
            <div className="w-full flex flex-col gap-3.5 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              {/* Row 1: Key Session Metrics & Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Kehadiran Semasa:</span>
                    <span className="text-xl sm:text-2xl font-black text-white font-mono">
                      {activePercent}%
                    </span>
                  </div>
                  <div className="h-6 w-px bg-slate-800 hidden sm:block"></div>
                  <div className="text-xs text-slate-300">
                    <span className="font-bold text-emerald-400">{activeSessionRecords.length}</span> daripada{' '}
                    <span className="font-semibold text-slate-200">{targetStudentsForActive.length}</span> Pelajar Direkod
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    id="dashboard-btn-open-scanner"
                    onClick={onOpenScanner}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Buka Kamera QR</span>
                  </button>
                  {activeLecturer && (
                    <button
                      id="dashboard-btn-close-session"
                      onClick={() => onCloseActiveSession(activeSession.id)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 text-xs font-semibold text-slate-300 transition-all cursor-pointer"
                      title="Tutup Sesi Kuliah Ini"
                    >
                      Tutup Sesi
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs text-slate-400 font-medium">
                  <span>{activeSession.className ? `Kemajuan Kelas ${activeSession.className}` : 'Kemajuan Kehadiran Keseluruhan'}</span>
                  <span>{activePercent}% Capai</span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      activePercent >= 80 ? 'bg-emerald-400' : activePercent >= 50 ? 'bg-indigo-500' : 'bg-amber-400'
                    }`}
                    style={{ width: `${activePercent}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs font-medium mb-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-500"></span>
              <span>Status Kehadiran Semasa</span>
            </div>
            <h3 className="text-lg font-bold text-white">Tiada Sesi Kuliah / Kelas Sedang Dibuka</h3>
            <p className="text-xs text-slate-400 mt-1">
              Imbasan kehadiran QR dibuka semasa waktu kuliah oleh pensyarah kursus masing-masing.
            </p>
          </div>
          <button
            id="dashboard-btn-goto-activities"
            onClick={onGoToActivities}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer shrink-0"
          >
            <BookOpen className="w-4 h-4" />
            <span>{activeLecturer ? 'Pilih Subjek & Buka Sesi' : 'Lihat Jadual Sesi & Kursus'}</span>
          </button>
        </div>
      )}

      {/* 2. STATS CARDS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={onGoToStudents}
          className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Jumlah Pelajar</span>
            <Users className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">{students.length}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span>{availableClassSets.length} Kelas</span>
            <ArrowUpRight className="w-3 h-3 text-indigo-400" />
          </div>
        </div>

        <div
          onClick={onGoToActivities}
          className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Subjek Kursus</span>
            <BookOpen className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">{subjects.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            <span>{sessions.length} Sesi Kuliah Terjadual</span>
          </div>
        </div>

        <div
          onClick={onGoToReports}
          className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Transaksi Imbasan</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">{attendanceRecords.length}</div>
          <div className="text-[11px] text-emerald-400 mt-1">
            <span>Rekod Disahkan</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Pensyarah Berdaftar</span>
            <UserCheck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">{lecturers.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            <span>@bpenawar.kpm.edu.my</span>
          </div>
        </div>
      </div>

      {/* 3. DEDICATED SECTION: STATISTIK % KEHADIRAN MENGIKUT SETIAP KELAS */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 sm:p-6 space-y-6 shadow-xl">
        <div className="w-full flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2.5">
              <BarChart3 className="w-5 h-5 text-indigo-400 shrink-0" />
              <h3 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
                Statistik % Kehadiran Mengikut Setiap Kelas
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-3xl">
              Analisis kadar kehadiran (%) terperinci mengikut kelas masing-masing bagi pemantauan pensyarah
            </p>
          </div>

          {/* Controls: Scope & Subject Filter */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Scope Switcher */}
            <div className="p-1 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setClassStatScope('CUMULATIVE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  classStatScope === 'CUMULATIVE'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                📊 Kumulatif Semua Sesi
              </button>
              <button
                type="button"
                onClick={() => setClassStatScope('ACTIVE_SESSION')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  classStatScope === 'ACTIVE_SESSION'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ⚡ Sesi Semasa
              </button>
            </div>

            {/* Subject Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={selectedSubjectFilter}
                onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Semua Subjek</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.code}>
                    {sub.code} - {sub.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Highlight Card: Best performing class */}
        {bestClass && (
          <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <span>Kelas Paling Cemerlang:</span>
                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-white font-mono font-bold">
                    Kelas {bestClass.name}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Mencatatkan rekod kehadiran tertinggi iaitu <strong>{bestClass.displayRate}%</strong> dengan {bestClass.totalStudents} orang pelajar berdaftar.
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xl font-black text-emerald-400">{bestClass.displayRate}%</span>
              <div className="text-[10px] text-slate-400">Kadar Purata</div>
            </div>
          </div>
        )}

        {/* Visual Cards Grid for Each Class */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {detailedClassStats.map((st, idx) => {
            const isHigh = st.displayRate >= 90;
            const isMedium = st.displayRate >= 75 && st.displayRate < 90;
            const isLow = st.displayRate < 75;

            const badgeColor = isHigh
              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
              : isMedium
              ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30'
              : 'text-amber-400 bg-amber-500/10 border-amber-500/30';

            const badgeText = isHigh ? 'Cemerlang' : isMedium ? 'Baik' : 'Perlu Perhatian';

            return (
              <div
                key={`detailed-card-${st.name}-${idx}`}
                className={`p-4 rounded-xl bg-slate-950/70 border transition-all hover:border-slate-700 space-y-3 ${
                  st.isTargeted ? 'border-indigo-500/50 shadow-md shadow-indigo-500/10' : 'border-slate-800'
                }`}
              >
                {/* Baris 1: Kelas */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${getClassBadgeColor(st.name)}`}>
                    Kelas {st.name}
                  </span>
                  {st.isTargeted && (
                    <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/20 px-1.5 py-0.5 rounded border border-indigo-500/30">
                      Sesi Dibuka
                    </span>
                  )}
                </div>

                {/* Baris 2: Status Tahap Prestasi */}
                <div className="flex items-center">
                  <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded border ${badgeColor}`}>
                    {badgeText}
                  </span>
                </div>

                {/* Big percentage number */}
                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <div className="text-3xl font-black text-white tracking-tight">
                      {st.displayRate}<span className="text-xl text-indigo-400">%</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                      Peratus Kehadiran
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="font-bold text-slate-200">
                      {st.totalStudents} Pelajar
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {classStatScope === 'ACTIVE_SESSION'
                        ? `${st.presentInActive} Hadir Hari Ini`
                        : `${st.sessionCount} Sesi Kuliah`}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isHigh ? 'bg-emerald-400' : isMedium ? 'bg-indigo-400' : 'bg-amber-400'
                      }`}
                      style={{ width: `${st.displayRate}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-400">
                    <span>Sasaran: 80% KPM</span>
                    <span>{st.displayRate >= 80 ? '✅ Capai KPI' : '❌ Bawah KPI'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Side-by-Side Comparison Chart and Breakdown */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 pt-2">
          {/* Comparison Bar Chart */}
          <div className="xl:col-span-2 p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Graf Perbandingan % Kehadiran Antara Kelas
              </h4>
              <span className="text-[10px] text-slate-500">Skala 0 - 100%</span>
            </div>

            <div className="h-52 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="shortName" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: any) => [`${value}% Kehadiran`, 'Kadar']}
                  />
                  <Bar dataKey="Peratus" radius={[6, 6, 0, 0]}>
                    {classChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.Peratus >= 90 ? '#10b981' : entry.Peratus >= 75 ? '#6366f1' : '#f59e0b'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Class Summary Table */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
                Ringkasan Prestasi Kelas
              </h4>
              <div className="space-y-2.5">
                {detailedClassStats.map((st, idx) => (
                  <div key={`summary-row-${st.name}-${idx}`} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/60 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">Kelas {st.name}</span>
                      <span className="text-[10px] text-slate-500">({st.totalStudents} Pelajar)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white">{st.displayRate}%</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          st.displayRate >= 90 ? 'bg-emerald-400' : st.displayRate >= 75 ? 'bg-indigo-400' : 'bg-amber-400'
                        }`}
                      ></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={onGoToReports}
              className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-indigo-300 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Jana Laporan Penuh Mengikut Kelas</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. MIDDLE SECTION: SUBJECTS & QUICK SIMULATOR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subjects Overview */}
        <div className="lg:col-span-2 rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Senarai Subjek & Agihan Kelas Pensyarah</h3>
              <p className="text-xs text-slate-400">Subjek akademik KPM Bandar Penawar dan kelas yang diajar</p>
            </div>
            <button
              onClick={onGoToActivities}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>Urus Subjek</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {subjects.map((sub) => (
              <div key={sub.id} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    {sub.code}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {(sub.sections || []).length > 0 ? `${sub.sections.length} Kelas Terlibat` : 'Katalog Terbuka'}
                  </span>
                </div>
                <div className="text-xs font-bold text-white truncate">{sub.name}</div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-indigo-400" />
                  <span>{sub.lecturerName || 'Pensyarah Kursus'}</span>
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {(sub.sections || []).length > 0 ? (
                    Array.from(new Set<string>(sub.sections || [])).map((sec, secIdx) => (
                      <span key={`dash-sub-${sub.id}-sec-${sec}-${secIdx}`} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono">
                        {sec}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-teal-400/80 font-medium">
                      Ditentukan oleh Pensyarah
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Simulator / Fast Scan Drawer for instant testing */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 mb-1 font-semibold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Simulasi Ujian Imbasan Pantas</span>
            </div>
            <h3 className="text-base font-bold text-white">Uji Imbas Pelajar</h3>
            <p className="text-xs text-slate-400 mt-1">
              Klik nama pelajar untuk simulasi imbasan QR tanpa memerlukan kamera.
            </p>

            <div className="mt-3 relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Cari nama, ID, atau kelas..."
                value={searchSimulate}
                onChange={(e) => setSearchSimulate(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Student list */}
            <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {filteredSimulateStudents.map((st) => {
                const isAttended = activeSession
                  ? activeSessionRecords.some((r) => r.studentId === st.id)
                  : false;

                return (
                  <button
                    key={st.id}
                    id={`simulate-btn-${st.id}`}
                    onClick={() => handleSimulate(st.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all border cursor-pointer ${
                      isAttended
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-slate-950/60 border-slate-800 hover:border-indigo-500/40 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${getStudentColor(st.id)}`}>
                        {getInitials(st.name)}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-semibold truncate">{st.name}</div>
                        <div className="text-[10px] text-slate-400">{st.studentId} • {st.className}</div>
                      </div>
                    </div>
                    <div className="shrink-0 text-[10px] font-bold">
                      {isAttended ? (
                        <span className="text-emerald-400">HADIR ✓</span>
                      ) : (
                        <span className="text-indigo-400">Imbas +</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feedback result */}
          {lastScanResult && (
            <div
              className={`p-2.5 rounded-lg text-xs border ${
                lastScanResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : lastScanResult.isDuplicate
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5">
                {lastScanResult.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                <span>{lastScanResult.code}</span>
              </div>
              <p className="text-[11px] mt-0.5 text-slate-300">{lastScanResult.message}</p>
            </div>
          )}
        </div>
      </div>

      {/* 5. RECENT LIVE SCANS STREAM */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Log Kehadiran Terkini</h3>
          </div>
          <button
            onClick={onGoToReports}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>Lihat Semua ({attendanceRecords.length})</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentRecords.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            Belum ada rekod imbasan pada hari ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {recentRecords.map(({ record, student, session }) => (
              <div
                key={record.id}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${student ? getStudentColor(student.id) : 'bg-slate-800'}`}>
                    {student ? getInitials(student.name) : 'ST'}
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-semibold text-white truncate">
                      {student ? student.name : record.studentId}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {student?.className} • {session?.sessionName || record.sessionId}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    HADIR
                  </span>
                  <div className="text-[9px] text-slate-500 mt-1">
                    {new Date(record.timestamp).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};


