import React, { useState, useMemo } from 'react';
import {
  Student,
  AttendanceSession,
  Subject,
  AttendanceRecord,
  Enrollment,
  TeachingAssignment,
  Lecturer
} from '../types';
import { areClassesMatching, normalizeClassCode } from '../utils/classHelper';
import {
  buildAttendanceMatrix,
  AttendanceMatrixData
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
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Sparkles,
  Layers,
  FileSpreadsheet
} from 'lucide-react';

interface AttendanceMatrixViewProps {
  students: Student[];
  sessions: AttendanceSession[];
  subjects?: Subject[];
  attendanceRecords: AttendanceRecord[];
  enrollments?: Enrollment[];
  teachingAssignments?: TeachingAssignment[];
  isAdmin?: boolean;
  activeLecturer?: Lecturer | null;
  onRequestAdminAccess?: (actionName?: string) => void;
  uniqueClasses: string[];
}

export const AttendanceMatrixView: React.FC<AttendanceMatrixViewProps> = ({
  students,
  sessions,
  subjects = [],
  attendanceRecords,
  enrollments = [],
  teachingAssignments = [],
  isAdmin = false,
  activeLecturer = null,
  onRequestAdminAccess,
  uniqueClasses
}) => {
  // 1. Initial State: Class, Subject, Date Range, Search
  const [selectedClass, setSelectedClass] = useState<string>(() => uniqueClasses[0] || 'DIA_4A');
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Synchronize selectedClass if uniqueClasses changes
  React.useEffect(() => {
    if (uniqueClasses.length > 0 && !uniqueClasses.some((c) => areClassesMatching(c, selectedClass))) {
      setSelectedClass(uniqueClasses[0]);
    }
  }, [uniqueClasses, selectedClass]);

  // 2. Discover available subjects taught for the selected class (respecting lecturer scoping)
  const availableSubjectsForClass = useMemo(() => {
    // Determine if lecturer privacy scoping is active
    const isLecturerRestricted = Boolean(
      activeLecturer && (
        !isAdmin ||
        activeLecturer.role !== 'ADMIN' ||
        activeLecturer.email?.trim().toLowerCase() === 'khairi@bpenawar.kpm.edu.my'
      )
    );

    const lecId = (activeLecturer?.id || '').trim().toLowerCase();
    const lecEmail = (activeLecturer?.email || '').trim().toLowerCase();
    const lecName = (activeLecturer?.name || '').trim().toLowerCase();

    // Check if an entity belongs to this lecturer
    const matchesLecturer = (item: {
      lecturerId?: string;
      lecturerEmail?: string;
      lecturerName?: string;
    }) => {
      if (!activeLecturer) return true;
      const mId = Boolean(item.lecturerId && lecId && item.lecturerId.trim().toLowerCase() === lecId);
      const mEmail = Boolean(item.lecturerEmail && lecEmail && item.lecturerEmail.trim().toLowerCase() === lecEmail);
      const mName = Boolean(item.lecturerName && lecName && item.lecturerName.trim().toLowerCase() === lecName);
      return mId || mEmail || mName;
    };

    // Helper to get course full name from subjects list or lecturer profiles
    const getSubjectFullName = (code: string, fallbackName?: string) => {
      const found = subjects.find((s) => s.code.trim().toUpperCase() === code);
      if (found?.name && found.name.trim() !== code) return found.name.trim();
      if (fallbackName && fallbackName.trim() && fallbackName.trim().toUpperCase() !== code) {
        return fallbackName.trim();
      }
      if (activeLecturer?.assignedSubjects) {
        for (const sStr of activeLecturer.assignedSubjects) {
          if (sStr.includes('-')) {
            const [c, ...n] = sStr.split('-');
            if (c.trim().toUpperCase() === code) {
              return n.join('-').trim();
            }
          }
        }
      }
      return code;
    };

    // When lecturer is restricted, build their authoritative catalog of taught subjects and classes
    if (isLecturerRestricted && activeLecturer) {
      const lecturerSubjectDetails = new Map<
        string,
        { code: string; name: string; classes: Set<string> }
      >();

      // A. From teaching assignments (authoritative)
      (teachingAssignments || []).forEach((ta) => {
        if (ta.status === 'ACTIVE' && matchesLecturer(ta) && ta.subjectCode) {
          const code = ta.subjectCode.trim().toUpperCase();
          if (!lecturerSubjectDetails.has(code)) {
            lecturerSubjectDetails.set(code, {
              code,
              name: getSubjectFullName(code, ta.subjectName),
              classes: new Set<string>()
            });
          }
          if (ta.className && ta.className !== 'ALL' && ta.className !== 'SEMUA') {
            lecturerSubjectDetails.get(code)!.classes.add(ta.className.trim());
          }
        }
      });

      // B. From activeLecturer.assignedSubjects (e.g. 'MPU2162 - PENGAJIAN MALAYSIA 2')
      (activeLecturer.assignedSubjects || []).forEach((subStr) => {
        const rawCode = subStr.includes('-')
          ? subStr.split('-')[0].trim().toUpperCase()
          : subStr.trim().toUpperCase();
        const rawName = subStr.includes('-')
          ? subStr.split('-').slice(1).join('-').trim()
          : subStr.trim();
        if (rawCode) {
          if (!lecturerSubjectDetails.has(rawCode)) {
            lecturerSubjectDetails.set(rawCode, {
              code: rawCode,
              name: getSubjectFullName(rawCode, rawName),
              classes: new Set<string>()
            });
          }
        }
      });

      // C. From master subjects catalog where this lecturer is assigned
      subjects.forEach((sub) => {
        if (matchesLecturer(sub) && sub.code) {
          const code = sub.code.trim().toUpperCase();
          if (!lecturerSubjectDetails.has(code)) {
            lecturerSubjectDetails.set(code, {
              code,
              name: sub.name?.trim() || code,
              classes: new Set<string>()
            });
          }
          (sub.sections || []).forEach((sec) => {
            if (sec && sec.trim()) {
              lecturerSubjectDetails.get(code)!.classes.add(sec.trim());
            }
          });
        }
      });

      // D. From authorized sessions
      sessions.forEach((s) => {
        if (matchesLecturer(s) && s.subjectCode) {
          const code = s.subjectCode.trim().toUpperCase();
          if (!lecturerSubjectDetails.has(code)) {
            lecturerSubjectDetails.set(code, {
              code,
              name: getSubjectFullName(code, s.subjectName || s.sessionName),
              classes: new Set<string>()
            });
          }
          if (s.className && s.className !== 'ALL' && s.className !== 'SEMUA') {
            lecturerSubjectDetails.get(code)!.classes.add(s.className.trim());
          }
        }
      });

      // Filter down to subjects taught for the selectedClass
      const classMatchingSubjects = new Map<string, { code: string; name: string }>();

      lecturerSubjectDetails.forEach((info, code) => {
        // If subject has explicit classes registered, check if any matches selectedClass
        const hasMatchingClass = Array.from(info.classes).some(
          (cls) => areClassesMatching(cls, selectedClass) || cls === 'ALL' || cls === 'SEMUA'
        );

        if (hasMatchingClass) {
          classMatchingSubjects.set(code, { code: info.code, name: info.name });
        }
      });

      // 1. If we have subjects specifically matched to this selected class, return strictly those!
      if (classMatchingSubjects.size > 0) {
        return Array.from(classMatchingSubjects.values()).sort((a, b) => a.code.localeCompare(b.code));
      }

      // 2. If no explicit class mapping exists, check if there are subjects with unrestricted classes
      const unconstrainedSubjects = new Map<string, { code: string; name: string }>();
      lecturerSubjectDetails.forEach((info, code) => {
        if (info.classes.size === 0) {
          unconstrainedSubjects.set(code, { code: info.code, name: info.name });
        }
      });

      if (unconstrainedSubjects.size > 0) {
        return Array.from(unconstrainedSubjects.values()).sort((a, b) => a.code.localeCompare(b.code));
      }

      // 3. Fallback strictly to all subjects taught by this lecturer (NEVER any other lecturer's subjects)
      return Array.from(lecturerSubjectDetails.values()).map((info) => ({
        code: info.code,
        name: info.name
      })).sort((a, b) => a.code.localeCompare(b.code));
    }

    // Admin / Unrestricted Mode: Collect all subjects available for selectedClass
    const subjMap = new Map<string, { code: string; name: string }>();

    // A. From teaching assignments (authoritative)
    (teachingAssignments || []).forEach((ta) => {
      const matchClass =
        !ta.className ||
        ta.className === 'ALL' ||
        areClassesMatching(ta.className, selectedClass);
      const isActive = ta.status === 'ACTIVE';

      if (matchClass && isActive && ta.subjectCode) {
        const cleanCode = ta.subjectCode.trim().toUpperCase();
        if (!subjMap.has(cleanCode)) {
          subjMap.set(cleanCode, {
            code: cleanCode,
            name: getSubjectFullName(cleanCode, ta.subjectName)
          });
        }
      }
    });

    // B. From sessions for this class
    sessions.forEach((s) => {
      const matchClass =
        !s.className ||
        s.className === 'ALL' ||
        areClassesMatching(s.className, selectedClass);
      if (matchClass && s.subjectCode) {
        const cleanCode = s.subjectCode.trim().toUpperCase();
        if (!subjMap.has(cleanCode)) {
          subjMap.set(cleanCode, {
            code: cleanCode,
            name: getSubjectFullName(cleanCode, s.subjectName || s.sessionName)
          });
        }
      }
    });

    // C. From general subjects list with matching sections
    subjects.forEach((sub) => {
      const matchClass = (sub.sections || []).some((sec) => areClassesMatching(sec, selectedClass));
      if (matchClass && sub.code) {
        const cleanCode = sub.code.trim().toUpperCase();
        if (!subjMap.has(cleanCode)) {
          subjMap.set(cleanCode, {
            code: cleanCode,
            name: sub.name || cleanCode
          });
        }
      }
    });

    return Array.from(subjMap.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [selectedClass, teachingAssignments, sessions, subjects, activeLecturer, isAdmin]);

  // Synchronize selectedSubjectCode when available subjects change
  React.useEffect(() => {
    if (availableSubjectsForClass.length > 0) {
      const exists = availableSubjectsForClass.some((s) => s.code === selectedSubjectCode);
      if (!exists) {
        setSelectedSubjectCode(availableSubjectsForClass[0].code);
      }
    } else {
      setSelectedSubjectCode('');
    }
  }, [availableSubjectsForClass, selectedSubjectCode]);

  // 3. Compute Attendance Matrix using useMemo
  const matrixData: AttendanceMatrixData = useMemo(() => {
    return buildAttendanceMatrix({
      selectedClass,
      selectedSubjectCode,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      students,
      sessions,
      attendanceRecords,
      enrollments
    });
  }, [
    selectedClass,
    selectedSubjectCode,
    startDate,
    endDate,
    students,
    sessions,
    attendanceRecords,
    enrollments
  ]);

  // Filter rows by search query
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return matrixData.rows;
    const q = searchQuery.toLowerCase().trim();
    return matrixData.rows.filter(
      (r) =>
        (r.student.name || '').toLowerCase().includes(q) ||
        (r.student.studentId || '').toLowerCase().includes(q) ||
        (r.student.id || '').toLowerCase().includes(q)
    );
  }, [matrixData.rows, searchQuery]);

  // Current Subject Display Name
  const selectedSubjectObj = availableSubjectsForClass.find((s) => s.code === selectedSubjectCode);
  const currentSubjectName = selectedSubjectObj?.name || matrixData.subjectName || selectedSubjectCode;

  // 4. Export CSV Action
  const handleExportCSV = () => {
    if (!isAdmin && !activeLecturer && onRequestAdminAccess) {
      onRequestAdminAccess(`Eksport Matriks Kehadiran (${selectedClass} - ${selectedSubjectCode})`);
      return;
    }

    if (matrixData.rows.length === 0) {
      setExportNotice('Tiada data pelajar untuk dieksport.');
      setTimeout(() => setExportNotice(null), 3000);
      return;
    }

    try {
      const csvContent = exportAttendanceMatrixToCSV({
        className: matrixData.className,
        subjectCode: matrixData.subjectCode,
        subjectName: currentSubjectName,
        sessionColumns: matrixData.sessionColumns,
        rows: matrixData.rows
      });

      const dateStr = new Date().toISOString().split('T')[0];
      const safeClass = matrixData.className.replace(/[\s/]/g, '_');
      const safeSub = (matrixData.subjectCode || 'Subjek').replace(/[\s/]/g, '_');
      const filename = `Matriks_Kehadiran_${safeClass}_${safeSub}_${dateStr}.csv`;

      downloadCSV(csvContent, filename);
      setExportNotice(`Fail CSV (${matrixData.rows.length} pelajar) berjaya dimuat turun!`);
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err) {
      console.error('Error exporting matrix CSV:', err);
      setExportNotice('Ralat semasa mengeksport fail CSV.');
      setTimeout(() => setExportNotice(null), 4000);
    }
  };

  // 5. Print Action
  const handlePrint = () => {
    window.print();
  };

  const handleResetDates = () => {
    setStartDate('');
    setEndDate('');
  };

  return (
    <div id="attendance-matrix-view-container" className="space-y-6 animate-fadeIn pb-12">
      {/* =========================================================================
          PRINT-ONLY BANNER HEADER (Visible exclusively when printing / PDF export)
          ========================================================================= */}
      <div className="hidden print:block mb-4 border-b-2 border-black pb-3 text-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">
              KOLEJ PROFESIONAL MARA BANDAR PENAWAR
            </h1>
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide mt-0.5">
              LAPORAN MATRIKS KEHADIRAN KULIAH
            </h2>
          </div>
          <div className="text-right text-[11px] font-mono">
            <div>Tarikh Cetak: {new Date().toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            <div>Masa: {new Date().toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 mt-2 pt-2 border-t border-slate-300 text-xs">
          <div>
            <span className="font-bold text-slate-700">Kelas:</span>{' '}
            <strong className="text-slate-900 font-extrabold">{selectedClass}</strong>
          </div>
          <div className="col-span-2">
            <span className="font-bold text-slate-700">Subjek:</span>{' '}
            <strong className="text-slate-900 font-extrabold">{selectedSubjectCode} {currentSubjectName ? `- ${currentSubjectName}` : ''}</strong>
          </div>
          <div className="text-right">
            <span className="font-bold text-slate-700">Jumlah Sesi:</span>{' '}
            <strong className="text-slate-900 font-extrabold">{matrixData.totalSessions}</strong> |{' '}
            <span className="font-bold text-slate-700">Pelajar:</span>{' '}
            <strong className="text-slate-900 font-extrabold">{matrixData.totalStudents}</strong>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SCREEN HEADER & EXPORT ACTIONS (Hidden during print)
          ========================================================================= */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-teal-500/20 to-emerald-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center shrink-0 shadow-inner">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white tracking-tight">
                Laporan Matriks Kehadiran Kuliah
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-500/20 text-teal-300 border border-teal-500/40 uppercase tracking-wider">
                Format Lembaran
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Paparan matriks semua sesi kuliah dalam satu jadual menyeluruh (Gaya Lembaran Excel).
            </p>
          </div>
        </div>

        {/* Action Buttons: Print & CSV Export */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            id="btn-print-matrix-report"
            onClick={handlePrint}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 text-xs font-bold border border-slate-700 transition-all shadow-sm cursor-pointer active:scale-95"
            title="Cetak jadual matriks ini dalam kertas A4 Landscape atau simpan sebagai fail PDF"
          >
            <Printer className="w-4 h-4 text-slate-300" />
            <span>Cetak / PDF (A4 Landscape)</span>
          </button>

          <button
            type="button"
            id="btn-export-matrix-csv"
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold shadow-lg shadow-teal-900/30 border border-teal-500/40 transition-all cursor-pointer active:scale-95"
            title="Eksport data matriks ini ke fail CSV dengan pengekodan UTF-8 BOM untuk Microsoft Excel"
          >
            <Download className="w-4 h-4" />
            <span>Eksport CSV (Excel)</span>
          </button>
        </div>
      </div>

      {/* Export Toast Notification */}
      {exportNotice && (
        <div className="no-print p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{exportNotice}</span>
          </div>
        </div>
      )}

      {/* =========================================================================
          FILTERS SECTION (Hidden during print)
          ========================================================================= */}
      <div className="no-print p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-teal-400" />
            <span>Penapis Matriks Kehadiran</span>
          </span>
          {(startDate || endDate || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                handleResetDates();
                setSearchQuery('');
              }}
              className="text-[11px] font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Semua Penapis</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. Dropdown Pilih Kelas */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>Pilih Kelas:</span>
            </label>
            <select
              id="select-matrix-class"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 hover:border-slate-600 focus:border-teal-500 text-white rounded-xl px-3.5 py-2 text-xs font-semibold outline-none transition-colors"
            >
              {uniqueClasses.map((cls) => (
                <option key={`matrix-cls-opt-${cls}`} value={cls}>
                  Kelas {cls}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Dropdown Pilih Subjek */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span>Pilih Subjek / Kursus:</span>
            </label>
            <select
              id="select-matrix-subject"
              value={selectedSubjectCode}
              onChange={(e) => setSelectedSubjectCode(e.target.value)}
              disabled={availableSubjectsForClass.length === 0}
              className="w-full bg-slate-950 border border-slate-700 hover:border-slate-600 focus:border-teal-500 text-white rounded-xl px-3.5 py-2 text-xs font-semibold outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {availableSubjectsForClass.length === 0 ? (
                <option value="">Tiada Subjek Ditugaskan</option>
              ) : (
                availableSubjectsForClass.map((sub) => (
                  <option key={`matrix-sub-opt-${sub.code}`} value={sub.code}>
                    {sub.code} — {sub.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* 3. Dari Tarikh (Pilihan) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Dari Tarikh (Pilihan):</span>
            </label>
            <input
              type="date"
              id="input-matrix-start-date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 hover:border-slate-600 focus:border-teal-500 text-white rounded-xl px-3.5 py-2 text-xs outline-none transition-colors"
            />
          </div>

          {/* 4. Hingga Tarikh (Pilihan) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Hingga Tarikh (Pilihan):</span>
            </label>
            <input
              type="date"
              id="input-matrix-end-date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 hover:border-slate-600 focus:border-teal-500 text-white rounded-xl px-3.5 py-2 text-xs outline-none transition-colors"
            />
          </div>
        </div>

        {/* Search bar inside filter box */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              id="input-search-matrix-student"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau no. matrik pelajar dalam matriks..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 text-white rounded-xl pl-9 pr-3.5 py-1.5 text-xs outline-none transition-colors placeholder:text-slate-500"
            />
          </div>

          <div className="text-xs text-slate-400">
            <span>Memaparkan: </span>
            <strong className="text-white font-bold">{filteredRows.length}</strong>
            <span> daripada {matrixData.totalStudents} pelajar</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SUMMARY METRIC CARDS (Hidden during print)
          ========================================================================= */}
      <div className="no-print grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Subjek & Kelas</div>
          <div className="text-sm font-extrabold text-white truncate" title={`${selectedSubjectCode} (${selectedClass})`}>
            {selectedSubjectCode || 'Tiada Subjek'} <span className="text-teal-400 font-mono">({selectedClass})</span>
          </div>
          <div className="text-[10px] text-slate-500 truncate">{currentSubjectName}</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Jumlah Sesi Kuliah</div>
          <div className="text-xl font-black text-white">
            {matrixData.totalSessions} <span className="text-xs text-slate-400 font-normal">Sesi</span>
          </div>
          <div className="text-[10px] text-slate-500">
            {matrixData.totalSessions > 0
              ? `${matrixData.sessionColumns[0]?.displayDate} — ${matrixData.sessionColumns[matrixData.sessionColumns.length - 1]?.displayDate}`
              : 'Tiada sesi'}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Purata Kehadiran</div>
          <div className="text-xl font-black text-white flex items-baseline gap-1.5">
            <span className={matrixData.averageAttendanceRate >= 80 ? 'text-emerald-400' : 'text-rose-400'}>
              {matrixData.averageAttendanceRate}%
            </span>
          </div>
          <div className="text-[10px] text-slate-500">
            {matrixData.averageAttendanceRate >= 80 ? '✅ Melepasi KPI Kolej' : '⚠️ Di Bawah Sasaran KPI'}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Amaran Kehadiran</div>
          <div className="text-xl font-black text-white">
            <span className={matrixData.belowKpiCount > 0 ? 'text-rose-400' : 'text-slate-300'}>
              {matrixData.belowKpiCount}
            </span>
            <span className="text-xs text-slate-400 font-normal"> Pelajar (&lt; 80%)</span>
          </div>
          <div className="text-[10px] text-slate-500">
            {matrixData.belowKpiCount > 0 ? 'Perlu tindakan / surat amaran' : 'Semua pelajar memenuhi KPI'}
          </div>
        </div>
      </div>

      {/* =========================================================================
          THE EXCEL-STYLE MATRIX TABLE
          ========================================================================= */}
      {availableSubjectsForClass.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Tiada Subjek Didaftarkan Bagi Kelas {selectedClass}</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Sila pastikan jadual pengajaran telah ditetapkan untuk kelas ini atau pilih kelas lain daripada senarai.
          </p>
        </div>
      ) : matrixData.totalStudents === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Tiada Pelajar Dijumpai Bagi Kelas {selectedClass}</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Tiada senarai nama pelajar aktif yang dipadankan dengan kelas ini dalam pangkalan data.
          </p>
        </div>
      ) : matrixData.totalSessions === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">
            Tiada Sesi Kuliah Direkodkan untuk {selectedSubjectCode} ({selectedClass})
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Belum ada sesi kehadiran yang dibuka bagi kombinasi kelas dan subjek ini dalam julat tarikh yang dipilih.
            {startDate || endDate ? ' Cuba bersihkan julat tarikh untuk melihat semua sesi.' : ''}
          </p>
          {(startDate || endDate) && (
            <button
              type="button"
              onClick={handleResetDates}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Reset Julat Tarikh
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Table Container: Horizontal & Vertical Scrolling with Sticky Header & 4 Left Columns */}
          <div
            id="matrix-scroll-wrapper"
            className="overflow-x-auto overflow-y-auto max-h-[72vh] border border-black rounded-xl bg-white shadow-lg printable-report-container"
          >
            <table
              id="attendance-matrix-table"
              className="w-full text-slate-900 border-collapse select-text text-xs"
              style={{
                fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}
            >
              {/* =============================================================
                  TABLE HEADER (STICKY TOP & LEFT)
                  ============================================================= */}
              <thead className="sticky top-0 z-20 bg-slate-100 text-slate-900">
                <tr className="border-b border-black">
                  {/* 1. NO. (Sticky Col 1, width: 48px) */}
                  <th
                    scope="col"
                    className="sticky left-0 z-30 bg-slate-100 border-r border-black p-2 text-center font-extrabold w-12 min-w-[48px] max-w-[48px]"
                  >
                    NO.
                  </th>

                  {/* 2. Class (Sticky Col 2, width: 88px) */}
                  <th
                    scope="col"
                    className="sticky left-[48px] z-30 bg-slate-100 border-r border-black p-2 text-center font-extrabold w-22 min-w-[88px] max-w-[88px]"
                  >
                    Class
                  </th>

                  {/* 3. NAME (Sticky Col 3, width: 260px) */}
                  <th
                    scope="col"
                    className="sticky left-[136px] z-30 bg-slate-100 border-r border-black px-3 py-2 text-left font-extrabold w-64 min-w-[260px] max-w-[340px]"
                  >
                    NAME
                  </th>

                  {/* 4. ID NUMBER (Sticky Col 4, width: 130px) */}
                  <th
                    scope="col"
                    className="sticky left-[396px] z-30 bg-slate-100 border-r border-black p-2 text-center font-extrabold w-32 min-w-[130px] max-w-[130px]"
                  >
                    ID NUMBER
                  </th>

                  {/* 5. DYNAMIC SESSION DATES (Scrollable Horizontally) */}
                  {matrixData.sessionColumns.map((col, cIdx) => (
                    <th
                      key={`matrix-col-header-${col.session.id}-${cIdx}`}
                      scope="col"
                      className="border-r border-black px-2 py-2 text-center font-extrabold w-16 min-w-[62px] max-w-[70px] bg-slate-100 whitespace-nowrap"
                      title={`Sesi: ${col.session.sessionName || col.session.subjectCode} (${col.session.date} ${col.session.startTime || ''}) - Status: ${col.session.status}`}
                    >
                      <div className="font-extrabold leading-tight text-slate-900">{col.displayDate}</div>
                      {col.subLabel && (
                        <div className="text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-1 mt-0.5 inline-block">
                          {col.subLabel}
                        </div>
                      )}
                    </th>
                  ))}

                  {/* 6. SUMMARY HEADERS */}
                  <th
                    scope="col"
                    className="border-r border-black px-3 py-2 text-center font-black w-24 min-w-[85px] bg-slate-100 text-slate-900"
                    title="Jumlah Sesi Hadir bagi pelajar ini"
                  >
                    Jumlah Hadir
                  </th>
                  <th
                    scope="col"
                    className="border-r border-black px-3 py-2 text-center font-black w-24 min-w-[85px] bg-slate-100 text-slate-900"
                    title="Jumlah Keseluruhan Sesi Kuliah"
                  >
                    Jumlah Sesi
                  </th>
                  <th
                    scope="col"
                    className="border-r border-black px-3 py-2 text-center font-black w-20 min-w-[70px] bg-slate-100 text-slate-900"
                    title="Peratusan Kehadiran (KPI ≥ 80%)"
                  >
                    %
                  </th>
                </tr>
              </thead>

              {/* =============================================================
                  TABLE BODY
                  ============================================================= */}
              <tbody className="divide-y divide-black">
                {filteredRows.map((row) => (
                  <tr
                    key={`matrix-row-${row.student.id}`}
                    className="hover:bg-amber-50/50 transition-colors"
                  >
                    {/* 1. NO. (Sticky Col 1) */}
                    <td
                      className="sticky left-0 z-10 bg-white border-r border-black p-2 text-center font-mono font-bold text-slate-800 text-xs w-12 min-w-[48px] max-w-[48px]"
                    >
                      {row.index}
                    </td>

                    {/* 2. Class (Sticky Col 2, Soft Pink Background as requested!) */}
                    <td
                      className="sticky left-[48px] z-10 border-r border-black p-2 text-center font-extrabold text-slate-900 text-xs w-22 min-w-[88px] max-w-[88px]"
                      style={{
                        backgroundColor: '#ffe4e6' /* Soft pink matching sample image */
                      }}
                    >
                      {row.className}
                    </td>

                    {/* 3. NAME (Sticky Col 3) */}
                    <td
                      className="sticky left-[136px] z-10 bg-white border-r border-black px-3 py-2 text-left font-bold text-slate-900 text-xs uppercase w-64 min-w-[260px] max-w-[340px] whitespace-normal leading-snug"
                    >
                      {row.student.name}
                    </td>

                    {/* 4. ID NUMBER (Sticky Col 4) */}
                    <td
                      className="sticky left-[396px] z-10 bg-white border-r border-black p-2 text-center font-mono font-bold text-slate-800 text-xs w-32 min-w-[130px] max-w-[130px]"
                    >
                      {row.student.studentId || row.student.id}
                    </td>

                    {/* 5. SESSION ATTENDANCE CELLS */}
                    {matrixData.sessionColumns.map((col, cIdx) => {
                      const cell = row.cells[col.session.id];
                      const symbol = cell ? cell.symbol : '';
                      const colorClass = cell ? cell.colorClass : '';
                      const tooltip = cell ? cell.tooltipText : '';

                      return (
                        <td
                          key={`matrix-cell-${row.student.id}-${col.session.id}-${cIdx}`}
                          className="border-r border-black p-1 text-center align-middle w-16 min-w-[62px] max-w-[70px] select-none"
                          title={`${row.student.name}: ${tooltip}`}
                          style={{
                            backgroundColor:
                              cell?.status === 'ABSENT'
                                ? '#fff1f2' /* Light soft rose tint for absent */
                                : cell?.status === 'PRESENT'
                                ? '#f0fdf4' /* Light soft emerald tint for present */
                                : undefined
                          }}
                        >
                          <span className={colorClass}>{symbol}</span>
                        </td>
                      );
                    })}

                    {/* 6. SUMMARY CELLS */}
                    {/* Jumlah Hadir */}
                    <td className="border-r border-black px-3 py-2 text-center font-black text-slate-900 text-xs">
                      {row.presentCount}
                    </td>

                    {/* Jumlah Sesi */}
                    <td className="border-r border-black px-3 py-2 text-center font-semibold text-slate-700 text-xs">
                      {row.totalSessions}
                    </td>

                    {/* % Kehadiran */}
                    <td
                      className={`border-r border-black px-3 py-2 text-center text-xs font-black ${
                        row.isBelowKPI
                          ? 'text-rose-600 bg-rose-50 font-black'
                          : 'text-emerald-700 font-black'
                      }`}
                      style={{
                        backgroundColor: row.isBelowKPI ? '#ffe4e6' : undefined
                      }}
                    >
                      {row.rate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* =========================================================================
              PETUNJUK / LEGEND SECTION
              ========================================================================= */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-teal-400" />
                <span>Petunjuk Simbol:</span>
              </span>

              <div className="flex items-center gap-1.5">
                <span className="w-6 h-6 rounded border border-emerald-500/40 bg-emerald-500/20 text-emerald-400 font-black flex items-center justify-center text-sm shadow-sm">
                  /
                </span>
                <span className="text-slate-300 font-medium">Hadir (Present)</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-6 h-6 rounded border border-amber-500/40 bg-amber-500/20 text-amber-400 font-black flex items-center justify-center text-xs shadow-sm">
                  L
                </span>
                <span className="text-slate-300 font-medium">Hadir Lewat (Late)</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-6 h-6 rounded border border-blue-500/40 bg-blue-500/20 text-blue-400 font-black flex items-center justify-center text-xs shadow-sm">
                  E
                </span>
                <span className="text-slate-300 font-medium">Kebenaran (Excused)</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-6 h-6 rounded border border-rose-500/40 bg-rose-500/20 text-rose-400 font-black flex items-center justify-center text-xs shadow-sm">
                  A
                </span>
                <span className="text-slate-300 font-medium">Tidak Hadir (Absent)</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-6 h-6 rounded border border-slate-700 bg-slate-800 text-slate-500 font-bold flex items-center justify-center text-xs">
                  -
                </span>
                <span className="text-slate-400 font-medium">Sesi Sedang Berlangsung (OPEN)</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400">
              <span className="text-rose-400 font-bold">* % Merah</span> menandakan kehadiran di bawah sasaran KPI (80%).
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
