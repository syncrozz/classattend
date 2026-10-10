import React, { useState, useMemo } from 'react';
import {
  Student,
  AttendanceSession,
  AttendanceRecord,
  Subject,
  Lecturer,
  TeachingAssignment
} from '../types';
import { areClassesMatching } from '../utils/classHelper';
import {
  buildAttendanceMatrix,
  AttendanceMatrixData,
  getScopedSubjectsForClass
} from '../utils/attendanceMatrix';
import {
  exportAttendanceMatrixToCSV,
  downloadCSV
} from '../utils/csvHelper';
import {
  Printer,
  Download,
  Calendar,
  BookOpen,
  Users,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

interface AttendanceMatrixViewProps {
  students: Student[];
  sessions: AttendanceSession[];
  subjects?: Subject[];
  attendanceRecords: AttendanceRecord[];
  uniqueClasses: string[];
  teachingAssignments?: TeachingAssignment[];
  isAdmin?: boolean;
  activeLecturer?: Lecturer | null;
  onRequestAdminAccess?: (actionName?: string) => void;
}

export const AttendanceMatrixView: React.FC<AttendanceMatrixViewProps> = ({
  students,
  sessions,
  subjects = [],
  attendanceRecords,
  uniqueClasses,
  teachingAssignments = [],
  isAdmin = false,
  activeLecturer = null,
  onRequestAdminAccess
}) => {
  // Class selection state (defaults to first available class)
  const [selectedClass, setSelectedClass] = useState<string>(() => uniqueClasses[0] || 'DIA_4A');

  // Sync selectedClass if uniqueClasses change
  React.useEffect(() => {
    if (uniqueClasses.length > 0 && !uniqueClasses.includes(selectedClass)) {
      setSelectedClass(uniqueClasses[0]);
    }
  }, [uniqueClasses, selectedClass]);

  // Determine if lecturer privacy scoping is active
  const isLecturerRestricted = Boolean(activeLecturer && !isAdmin && activeLecturer.role !== 'ADMIN');

  // Derive subjects available for the selected class, strictly filtered by lecturer permissions
  const classSubjects = useMemo(() => {
    return getScopedSubjectsForClass(
      selectedClass,
      sessions,
      teachingAssignments,
      subjects,
      activeLecturer,
      isAdmin
    );
  }, [selectedClass, sessions, teachingAssignments, subjects, activeLecturer, isAdmin]);

  // Selected subject state
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>(() => classSubjects[0]?.code || '');

  // Keep selectedSubjectCode in sync when class changes
  React.useEffect(() => {
    if (classSubjects.length > 0) {
      const exists = classSubjects.some((s) => s.code === selectedSubjectCode);
      if (!exists) {
        setSelectedSubjectCode(classSubjects[0].code);
      }
    } else {
      setSelectedSubjectCode('');
    }
  }, [classSubjects, selectedSubjectCode]);

  // Date range filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Search filter for students
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected subject name
  const selectedSubject = classSubjects.find((s) => s.code === selectedSubjectCode);
  const selectedSubjectName = selectedSubject?.name || selectedSubjectCode;

  // Filter sessions matching class, subject, and date range
  const filteredSessions = useMemo(() => {
    // If lecturer is restricted and has no assigned subjects for this class, strictly return empty
    if (isLecturerRestricted && (!selectedSubjectCode || classSubjects.length === 0)) {
      return [];
    }

    return sessions.filter((s) => {
      const matchClass = areClassesMatching(s.className, selectedClass);
      const matchSubject = !selectedSubjectCode
        ? !isLecturerRestricted
        : (s.subjectCode || '').trim().toUpperCase() === selectedSubjectCode.trim().toUpperCase();
      
      const sDate = s.date ? s.date.split('T')[0] : '';
      const matchStart = !startDate || (sDate && sDate >= startDate);
      const matchEnd = !endDate || (sDate && sDate <= endDate);

      return matchClass && matchSubject && matchStart && matchEnd;
    });
  }, [sessions, selectedClass, selectedSubjectCode, startDate, endDate, isLecturerRestricted, classSubjects]);

  // Target students for the selected class (with optional search query filter)
  const targetStudents = useMemo(() => {
    return students.filter((st) => {
      const matchClass = areClassesMatching(st.className, selectedClass);
      if (!matchClass) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const name = (st.name || '').toLowerCase();
      const id = (st.studentId || st.id || '').toLowerCase();
      return name.includes(q) || id.includes(q);
    });
  }, [students, selectedClass, searchQuery]);

  // Calculate complete Attendance Matrix data
  const matrixData: AttendanceMatrixData = useMemo(() => {
    return buildAttendanceMatrix(
      targetStudents,
      filteredSessions,
      attendanceRecords,
      selectedClass,
      selectedSubjectCode,
      selectedSubjectName
    );
  }, [
    targetStudents,
    filteredSessions,
    attendanceRecords,
    selectedClass,
    selectedSubjectCode,
    selectedSubjectName
  ]);

  // Print Handler: Automatically sets landscape format
  const handlePrint = () => {
    const style = document.createElement('style');
    style.id = 'matrix-print-page-style';
    style.textContent = `
      @media print {
        @page {
          size: A4 landscape !important;
          margin: 6mm 8mm !important;
        }
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `;
    document.head.appendChild(style);

    window.print();

    setTimeout(() => {
      const el = document.getElementById('matrix-print-page-style');
      if (el) el.remove();
    }, 1200);
  };

  // CSV Export Handler with UTF-8 BOM
  const handleExportCSV = () => {
    if (!isAdmin && !activeLecturer && onRequestAdminAccess) {
      onRequestAdminAccess(`Eksport Matriks Kehadiran (Kelas ${selectedClass} - ${selectedSubjectCode})`);
      return;
    }

    const csvContent = exportAttendanceMatrixToCSV(matrixData);
    const safeClass = selectedClass.replace(/[\s/]/g, '_');
    const safeSubject = (selectedSubjectCode || 'Subjek').replace(/[\s/]/g, '_');
    downloadCSV(csvContent, `Matriks_Kehadiran_${safeClass}_${safeSubject}.csv`);
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
  };

  return (
    <div className="space-y-5 printable-report-container">
      {/* Printable Official Header (Visible ONLY on print) */}
      <div className="hidden print:block mb-4 pb-3 border-b-2 border-slate-900 text-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-extrabold tracking-tight uppercase">
              Kolej Profesional MARA Bandar Penawar
            </h1>
            <h2 className="text-sm font-bold text-slate-800 uppercase mt-0.5">
              Laporan Matriks Kehadiran Kuliah Pelajar
            </h2>
          </div>
          <div className="text-right text-[10px] text-slate-600 font-mono">
            <div>Dicetak Pada: {new Date().toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            <div>Sistem: ClassAttend KPMBP</div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mt-2 pt-2 border-t border-slate-300 text-xs">
          <div>
            <span className="text-slate-500 font-medium">Kelas:</span>{' '}
            <strong className="font-bold">{selectedClass}</strong>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Kod & Kursus:</span>{' '}
            <strong className="font-bold">{selectedSubjectCode} — {selectedSubjectName}</strong>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Jumlah Sesi Kuliah:</span>{' '}
            <strong className="font-bold">{matrixData.columns.length} Sesi</strong>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Jumlah Pelajar:</span>{' '}
            <strong className="font-bold">{matrixData.rows.length} Orang</strong>
          </div>
        </div>
      </div>

      {/* Control Panel: Filters, Actions & Summary (Hidden in print) */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4 shadow-lg no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold tracking-wide">
                Jadual Penuh Kehadiran
              </span>
              <span className="text-xs text-slate-400">• Satu Jadual Merangkumi Semua Sesi</span>
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight mt-1">
              Matriks Kehadiran Kuliah & Seksyen
            </h3>
            {isLecturerRestricted && activeLecturer ? (
              <p className="text-xs text-indigo-300/90 mt-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 inline shrink-0" />
                <span>
                  Mod Pensyarah: Hanya memaparkan subjek yang ditugaskan kepada <strong>{activeLecturer.name}</strong> bagi kelas yang dipilih.
                </span>
              </p>
            ) : (
              <p className="text-xs text-slate-400 mt-0.5">
                Paparan grid visual status kehadiran setiap pelajar bagi setiap sesi kuliah secara bersiri mengikut tarikh.
              </p>
            )}
          </div>

          {/* Action Buttons: Cetak PDF & Eksport CSV */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              id="btn-print-matrix-pdf"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-bold transition-all shadow-sm cursor-pointer hover:border-slate-600"
              title="Cetak jadual matriks ini dalam saiz kertas A4 Landskap atau simpan sebagai PDF"
            >
              <Printer className="w-4 h-4 text-indigo-400" />
              <span>Cetak / PDF (A4 Landskap)</span>
            </button>

            <button
              type="button"
              id="btn-export-matrix-csv"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm shadow-emerald-950/40 cursor-pointer"
              title="Eksport data jadual matriks ini ke fail CSV format Excel dengan sokongan UTF-8 BOM"
            >
              <Download className="w-4 h-4 text-emerald-100" />
              <span>Eksport CSV</span>
            </button>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-800">
          {/* Dropdown 1: Kelas */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>1. Pilih Kelas / Seksyen</span>
            </label>
            <select
              id="matrix-select-class"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-indigo-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {uniqueClasses.map((cls) => (
                <option key={`matrix-class-${cls}`} value={cls}>
                  Kelas {cls}
                </option>
              ))}
            </select>
          </div>

          {/* Dropdown 2: Subjek */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center justify-between gap-1.5">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                <span>2. Pilih Kursus / Subjek</span>
              </span>
              {isLecturerRestricted && (
                <span className="text-[10px] text-indigo-300 font-semibold bg-indigo-950/80 border border-indigo-500/30 px-1.5 py-0.5 rounded">
                  Subjek Anda
                </span>
              )}
            </label>
            <select
              id="matrix-select-subject"
              value={selectedSubjectCode}
              onChange={(e) => setSelectedSubjectCode(e.target.value)}
              disabled={classSubjects.length === 0}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500 cursor-pointer truncate disabled:opacity-50"
            >
              {classSubjects.length === 0 ? (
                <option value="">Tiada Subjek Ditugaskan</option>
              ) : (
                classSubjects.map((sub) => (
                  <option key={`matrix-sub-${sub.code}`} value={sub.code}>
                    {sub.code} — {sub.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Date Range: Dari & Hingga */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>3. Julat Tarikh (Pilihan)</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="Dari"
                className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                title="Tarikh Mula"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="Hingga"
                className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                title="Tarikh Hingga"
              />
            </div>
          </div>

          {/* Search Box & Reset */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-indigo-400" />
              <span>4. Cari Pelajar</span>
            </label>
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nama / No. ID..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              </div>
              {(startDate || endDate || searchQuery) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs cursor-pointer shrink-0"
                  title="Set semula penapis"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Matrix Overview Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-slate-800/90 text-slate-300 border border-slate-700 font-medium">
              Pelajar: <strong className="text-white">{matrixData.rows.length} orang</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-800/90 text-slate-300 border border-slate-700 font-medium">
              Sesi Kuliah: <strong className="text-indigo-300">{matrixData.columns.length} sesi</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-800/90 text-slate-300 border border-slate-700 font-medium">
              Purata Kelas:{' '}
              <strong className={matrixData.classAveragePercentage >= 80 ? 'text-emerald-400' : 'text-rose-400'}>
                {matrixData.classAveragePercentage}%
              </strong>
            </span>
            {matrixData.studentsBelow80Count > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>{matrixData.studentsBelow80Count} pelajar bawah 80%</span>
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-400">
            Subjek: <strong className="text-slate-200">{selectedSubjectCode}</strong> — {selectedSubjectName}
          </div>
        </div>
      </div>

      {/* Main Excel-Style Matrix Table */}
      {matrixData.rows.length === 0 ? (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-12 text-center text-slate-400 space-y-3">
          <Users className="w-12 h-12 text-slate-600 mx-auto" />
          <h4 className="text-base font-bold text-white">Tiada Rekod Pelajar Ditemui</h4>
          <p className="text-xs max-w-md mx-auto">
            Tiada pelajar yang sepadan dengan kelas <strong>{selectedClass}</strong> atau penapis carian yang anda masukkan.
          </p>
        </div>
      ) : classSubjects.length === 0 ? (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-12 text-center text-slate-400 space-y-3">
          <BookOpen className="w-12 h-12 text-indigo-400/80 mx-auto" />
          <h4 className="text-base font-bold text-white">Tiada Subjek Ditugaskan</h4>
          <p className="text-xs max-w-md mx-auto">
            {isLecturerRestricted ? (
              <>Anda tidak mempunyai sebarang subjek yang ditugaskan untuk kelas <strong>{selectedClass}</strong>. Hanya subjek di bawah ketetapan pengajaran anda sahaja yang dipaparkan dalam ruang akaun anda.</>
            ) : (
              <>Tiada subjek ditemui bagi kelas <strong>{selectedClass}</strong>.</>
            )}
          </p>
        </div>
      ) : matrixData.columns.length === 0 ? (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-12 text-center text-slate-400 space-y-3">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
          <h4 className="text-base font-bold text-white">Tiada Sesi Kuliah Direkodkan</h4>
          <p className="text-xs max-w-md mx-auto">
            Belum ada sebarang sesi kuliah yang didaftarkan untuk subjek <strong>{selectedSubjectCode}</strong> bagi kelas <strong>{selectedClass}</strong>. Sila cipta sesi baharu di menu Pengurusan Acara atau semak julat tarikh.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-700 bg-white shadow-xl overflow-hidden">
          {/* Scrollable Container with sticky headers and sticky left columns */}
          <div className="overflow-x-auto max-w-full max-h-[72vh] relative">
            <table className="w-full border-collapse text-xs text-slate-900 border border-slate-400">
              <thead className="sticky top-0 z-20 bg-slate-100 uppercase text-[11px] font-bold text-slate-800 select-none shadow-sm">
                <tr>
                  {/* Sticky Column 1: NO. */}
                  <th
                    scope="col"
                    style={{ left: 0 }}
                    className="sticky z-30 bg-slate-200 border border-slate-400 px-2 py-3 text-center min-w-[46px] w-[46px] font-black"
                  >
                    NO.
                  </th>

                  {/* Sticky Column 2: Class (Pink background header) */}
                  <th
                    scope="col"
                    style={{ left: 46 }}
                    className="sticky z-30 bg-pink-200 text-pink-950 border border-slate-400 px-2.5 py-3 text-center min-w-[76px] w-[76px] font-black tracking-wider"
                  >
                    Class
                  </th>

                  {/* Sticky Column 3: NAME */}
                  <th
                    scope="col"
                    style={{ left: 122 }}
                    className="sticky z-30 bg-slate-200 border border-slate-400 px-3.5 py-3 text-left min-w-[220px] max-w-[320px] font-black"
                  >
                    NAME
                  </th>

                  {/* Sticky Column 4: ID NUMBER */}
                  <th
                    scope="col"
                    style={{ left: 342 }}
                    className="sticky z-30 bg-slate-200 border border-slate-400 px-2.5 py-3 text-center min-w-[125px] w-[125px] font-black whitespace-nowrap"
                  >
                    ID NUMBER
                  </th>

                  {/* Dynamic Session Date Columns */}
                  {matrixData.columns.map((col, cIdx) => (
                    <th
                      key={`matrix-col-${col.session.id}-${cIdx}`}
                      scope="col"
                      className="border border-slate-400 px-2 py-2 text-center min-w-[64px] max-w-[72px] bg-slate-100 font-bold text-slate-900"
                      title={`${col.session.sessionName} (${col.session.date} ${col.session.startTime || ''}) - Status: ${col.session.status}`}
                    >
                      <div className="font-extrabold text-[11px] tracking-tight">{col.dateFormatted}</div>
                      {col.subLabel ? (
                        <div className="text-[10px] font-bold text-indigo-800 bg-indigo-100 rounded px-1.5 py-0.2 mt-0.5 inline-block border border-indigo-200">
                          {col.subLabel}
                        </div>
                      ) : (
                        <div className="text-[9px] font-normal text-slate-500 mt-0.5">
                          {col.session.status === 'OPEN' ? '🟢 Aktif' : 'Kuliah'}
                        </div>
                      )}
                    </th>
                  ))}

                  {/* Right Summary Columns */}
                  <th
                    scope="col"
                    className="border border-slate-400 px-2.5 py-3 text-center min-w-[80px] bg-slate-200 font-black text-slate-900"
                  >
                    Jumlah Hadir
                  </th>
                  <th
                    scope="col"
                    className="border border-slate-400 px-2.5 py-3 text-center min-w-[75px] bg-slate-200 font-black text-slate-900"
                  >
                    Jumlah Sesi
                  </th>
                  <th
                    scope="col"
                    className="border border-slate-400 px-2.5 py-3 text-center min-w-[65px] bg-slate-300 font-black text-slate-950"
                  >
                    %
                  </th>
                </tr>
              </thead>

              <tbody>
                {matrixData.rows.map((row, rIdx) => {
                  const isEven = rIdx % 2 === 0;
                  const rowBg = isEven ? 'bg-white' : 'bg-slate-50/60';

                  return (
                    <tr
                      key={`matrix-row-${row.student.id}-${rIdx}`}
                      className="hover:bg-amber-50/40 transition-colors"
                    >
                      {/* Sticky 1: NO. */}
                      <td
                        style={{ left: 0 }}
                        className={`sticky z-10 ${rowBg} border border-slate-400 px-2 py-2 text-center font-bold text-slate-700 min-w-[46px] w-[46px]`}
                      >
                        {row.no}
                      </td>

                      {/* Sticky 2: Class (Soft Pink Background / Merah Jambu Lembut) */}
                      <td
                        style={{ left: 46 }}
                        className="sticky z-10 bg-[#fce7f3] text-pink-950 border border-slate-400 px-2.5 py-2 text-center font-black min-w-[76px] w-[76px] tracking-wide"
                      >
                        {row.className}
                      </td>

                      {/* Sticky 3: NAME (Uppercase, does not cut off) */}
                      <td
                        style={{ left: 122 }}
                        className={`sticky z-10 ${rowBg} border border-slate-400 px-3 py-2 text-left font-bold text-slate-950 min-w-[220px] max-w-[320px] break-words uppercase leading-tight`}
                      >
                        {row.name}
                      </td>

                      {/* Sticky 4: ID NUMBER */}
                      <td
                        style={{ left: 342 }}
                        className={`sticky z-10 ${rowBg} border border-slate-400 px-2.5 py-2 text-center font-mono text-[11px] font-bold text-slate-800 min-w-[125px] w-[125px] whitespace-nowrap`}
                      >
                        {row.studentId}
                      </td>

                      {/* Dynamic Session Cells */}
                      {matrixData.columns.map((col, cIdx) => {
                        const cell = row.cells[col.session.id];
                        if (!cell) {
                          return (
                            <td
                              key={`cell-${row.student.id}-${cIdx}`}
                              className="border border-slate-400 px-1.5 py-2 text-center text-slate-300"
                            >
                              -
                            </td>
                          );
                        }

                        return (
                          <td
                            key={`cell-${row.student.id}-${col.session.id}`}
                            className={`border border-slate-400 px-1 py-1 text-center select-none ${cell.bgClass}`}
                            title={`${row.name} - ${col.dateFormatted}: ${cell.label}`}
                          >
                            <span
                              className={`inline-block ${
                                cell.symbol === '✓'
                                  ? 'text-emerald-700 font-black text-sm'
                                  : cell.symbol === 'L'
                                  ? 'text-amber-700 font-black text-xs'
                                  : cell.symbol === 'E'
                                  ? 'text-blue-700 font-black text-xs'
                                  : cell.symbol === 'A'
                                  ? 'text-rose-700 font-black text-xs'
                                  : 'text-slate-300 font-normal'
                              }`}
                            >
                              {cell.symbol}
                            </span>
                          </td>
                        );
                      })}

                      {/* Summary Cell: Jumlah Hadir */}
                      <td className="border border-slate-400 px-2 py-2 text-center font-black text-slate-900 bg-slate-100">
                        {row.presentCount}
                      </td>

                      {/* Summary Cell: Jumlah Sesi */}
                      <td className="border border-slate-400 px-2 py-2 text-center font-bold text-slate-700 bg-slate-100">
                        {row.totalSessions}
                      </td>

                      {/* Summary Cell: % Kehadiran (Red if < 80%) */}
                      <td
                        className={`border border-slate-400 px-2 py-2 text-center font-black ${
                          row.isWarning
                            ? 'text-rose-700 bg-rose-100 font-black text-[12px]'
                            : 'text-emerald-800 bg-emerald-50'
                        }`}
                      >
                        {row.percentage}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend & Summary Notes */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4.5 space-y-3 text-xs text-slate-300 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
          <div className="font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Petunjuk Status Kehadiran (Legend):</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Format Pengepala Tarikh: <strong>DD-MMM</strong> (Contoh: 10-Oct, 12-Oct). Penanda <strong>S2</strong> menunjukkan sesi kedua pada tarikh yang sama.
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800">
            <span className="w-6 h-6 flex items-center justify-center font-black text-emerald-700 bg-emerald-100 rounded-lg border border-emerald-300 text-sm">
              ✓
            </span>
            <div>
              <div className="font-bold text-emerald-300">Hadir (Present)</div>
              <div className="text-[10px] text-slate-400">Diimbas / Direkod</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800">
            <span className="w-6 h-6 flex items-center justify-center font-black text-amber-700 bg-amber-100 rounded-lg border border-amber-300 text-xs">
              L
            </span>
            <div>
              <div className="font-bold text-amber-300">Lewat (Late)</div>
              <div className="text-[10px] text-slate-400">Hadir Selepas Masa</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800">
            <span className="w-6 h-6 flex items-center justify-center font-black text-blue-700 bg-blue-100 rounded-lg border border-blue-300 text-xs">
              E
            </span>
            <div>
              <div className="font-bold text-blue-300">Kebenaran (Excused)</div>
              <div className="text-[10px] text-slate-400">MC / Surat Kebenaran</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800">
            <span className="w-6 h-6 flex items-center justify-center font-black text-rose-700 bg-rose-100 rounded-lg border border-rose-300 text-xs">
              A
            </span>
            <div>
              <div className="font-bold text-rose-300">Tidak Hadir (Absent)</div>
              <div className="text-[10px] text-slate-400">Tiada Rekod (Sesi Closed)</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800">
            <span className="w-6 h-6 flex items-center justify-center font-bold text-slate-400 bg-slate-800 rounded-lg border border-slate-700 text-xs">
              -
            </span>
            <div>
              <div className="font-bold text-slate-300">(Kosong)</div>
              <div className="text-[10px] text-slate-400">Sesi Masih Aktif (OPEN)</div>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            <strong>Perhatian:</strong> Peratusan kehadiran pelajar yang berada di bawah <strong>80%</strong> ditandakan merah mengikut syarat ketetapan peperiksaan Kolej Profesional MARA.
          </span>
        </div>
      </div>
    </div>
  );
};
