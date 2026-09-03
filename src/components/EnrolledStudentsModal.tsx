import React, { useState, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Subject, Enrollment, Student, Lecturer } from '../types';
import { attendanceEngine } from '../services/attendanceEngine';
import { getClassBadgeColor, getInitials, getStudentColor } from '../utils/studentUtils';
import {
  Users,
  X,
  Search,
  BookOpen,
  UserCheck,
  Trash2,
  QrCode,
  Download,
  Printer,
  GraduationCap,
  ShieldAlert,
  Layers,
  Phone,
  Mail,
  Calendar,
  Zap,
  CheckCircle2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

interface EnrolledStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: Subject | null;
  className?: string;
  enrollments: Enrollment[];
  students: Student[];
  onOpenGenerateQR: (subject: Subject, className?: string) => void;
}

export const EnrolledStudentsModal: React.FC<EnrolledStudentsModalProps> = ({
  isOpen,
  onClose,
  subject,
  className,
  enrollments,
  students,
  onOpenGenerateQR
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>(className || 'ALL');
  const [previewQrStudent, setPreviewQrStudent] = useState<Student | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Active Subject-Specific Enrollments (instant reactive merge with local engine cache)
  const subjectEnrollments = useMemo(() => {
    if (!subject) return [];
    const engineEnrollments = attendanceEngine.getEnrollments();
    const map = new Map<string, Enrollment>();
    enrollments.forEach((e) => {
      if (e.subjectCode.toUpperCase() === subject.code.toUpperCase() && e.status !== 'DROPPED') {
        map.set(e.id, e);
      }
    });
    engineEnrollments.forEach((e) => {
      if (e.subjectCode.toUpperCase() === subject.code.toUpperCase() && e.status !== 'DROPPED') {
        map.set(e.id, e);
      }
    });
    return Array.from(map.values());
  }, [enrollments, subject, isSyncing]);

  // Determine all available sections/classes from Subject or Master Students list
  const availableClassesInMaster = useMemo(() => {
    const clsSet = new Set<string>();
    students.forEach((s) => {
      if (s.className && s.className.trim()) {
        clsSet.add(s.className.trim().toUpperCase());
      }
    });
    return Array.from(clsSet).sort();
  }, [students]);

  const sectionsList = useMemo(() => {
    if (subject?.sections && subject.sections.length > 0) {
      return subject.sections.map((s) => s.trim().toUpperCase());
    }
    return availableClassesInMaster.length > 0
      ? availableClassesInMaster
      : ['DIA_4A', 'DIA_4B', 'DIA_4C', 'DIA_4D'];
  }, [subject, availableClassesInMaster]);

  // Master students matching the classes of this subject (or all if subject has no strict restriction)
  const masterStudentsForSubject = useMemo(() => {
    if (!subject) return [];
    return students.filter((s) => {
      if (!s.className) return false;
      const sCls = s.className.trim().toUpperCase();
      if (!subject.sections || subject.sections.length === 0) return true;
      return subject.sections.some((sec) => {
        const cleanSec = sec.trim().toUpperCase();
        return cleanSec === sCls || cleanSec.replace(/_/g, ' ') === sCls.replace(/_/g, ' ');
      });
    });
  }, [students, subject]);

  // Check which master students are NOT yet enrolled in this subject
  const enrolledStudentIdSet = useMemo(() => {
    return new Set(subjectEnrollments.map((e) => e.studentId.toUpperCase()));
  }, [subjectEnrollments]);

  const unenrolledMasterStudents = useMemo(() => {
    return masterStudentsForSubject.filter(
      (s) => !enrolledStudentIdSet.has(s.studentId.toUpperCase()) && !enrolledStudentIdSet.has(s.id.toUpperCase())
    );
  }, [masterStudentsForSubject, enrolledStudentIdSet]);

  // Filtered Subject Enrollments
  const filteredEnrollments = useMemo(() => {
    return subjectEnrollments.filter((enr) => {
      const student = students.find((s) => s.studentId === enr.studentId || s.id === enr.studentId);
      const matchesClass =
        selectedClassFilter === 'ALL' ||
        enr.className.toUpperCase() === selectedClassFilter.toUpperCase() ||
        enr.className.replace(/_/g, ' ').toUpperCase() === selectedClassFilter.replace(/_/g, ' ').toUpperCase();

      if (!matchesClass) return false;

      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const name = (student?.name || '').toLowerCase();
      const id = enr.studentId.toLowerCase();
      const enrClass = enr.className.toLowerCase();
      return name.includes(query) || id.includes(query) || enrClass.includes(query);
    });
  }, [subjectEnrollments, students, selectedClassFilter, searchQuery]);

  // Filtered Master Students (used when 0 enrollments exist, so user sees their 83 students instantly)
  const filteredMasterStudents = useMemo(() => {
    return masterStudentsForSubject.filter((s) => {
      const matchesClass =
        selectedClassFilter === 'ALL' ||
        s.className.toUpperCase() === selectedClassFilter.toUpperCase() ||
        s.className.replace(/_/g, ' ').toUpperCase() === selectedClassFilter.replace(/_/g, ' ').toUpperCase();

      if (!matchesClass) return false;

      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const name = (s.name || '').toLowerCase();
      const id = (s.studentId || s.id || '').toLowerCase();
      const sClass = (s.className || '').toLowerCase();
      return name.includes(query) || id.includes(query) || sClass.includes(query);
    });
  }, [masterStudentsForSubject, selectedClassFilter, searchQuery]);

  // Master students in the selected class (unfiltered by text search)
  const masterStudentsForSelectedClass = useMemo(() => {
    return masterStudentsForSubject.filter((s) => {
      if (selectedClassFilter === 'ALL') return true;
      const sCls = (s.className || '').trim().toUpperCase();
      const targetCls = selectedClassFilter.trim().toUpperCase();
      return sCls === targetCls || sCls.replace(/_/g, ' ') === targetCls.replace(/_/g, ' ');
    });
  }, [masterStudentsForSubject, selectedClassFilter]);

  // Unenrolled students in the currently selected class
  const unenrolledForSelectedClass = useMemo(() => {
    return unenrolledMasterStudents.filter((s) => {
      if (selectedClassFilter === 'ALL') return true;
      const sCls = (s.className || '').trim().toUpperCase();
      const targetCls = selectedClassFilter.trim().toUpperCase();
      return sCls === targetCls || sCls.replace(/_/g, ' ') === targetCls.replace(/_/g, ' ');
    });
  }, [unenrolledMasterStudents, selectedClassFilter]);

  // 1-Click Sync: Batch enroll master students into this subject
  const handleBatchEnroll = async (overrideClass?: string) => {
    if (!subject || isSyncing) return;
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const activeClass = overrideClass !== undefined ? overrideClass : selectedClassFilter;
      const targetClasses = activeClass === 'ALL' ? sectionsList : [activeClass];
      const res = await attendanceEngine.batchEnrollStudentsForSubject({
        subjectCode: subject.code,
        subjectName: subject.name,
        classNames: targetClasses,
        lecturerName: subject.lecturerName,
        lecturerEmail: subject.lecturerEmail
      });
      setSyncFeedback(res.message);
      setTimeout(() => setSyncFeedback(null), 5000);
    } catch (err) {
      console.error('Error syncing students to subject:', err);
      setSyncFeedback('Ralat semasa menyelaraskan pendaftaran.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteEnrollment = async (enrollmentId: string, studentName: string) => {
    if (confirm(`Adakah anda pasti mahu memadamkan pendaftaran bagi pelajar ${studentName}? Pelajar ini akan dikeluarkan daripada subjek ini sahaja.`)) {
      await attendanceEngine.deleteEnrollment(enrollmentId);
    }
  };

  const handleExportCSV = () => {
    if (!subject) return;
    const listToExport = subjectEnrollments.length > 0 ? filteredEnrollments : [];
    if (listToExport.length === 0 && filteredMasterStudents.length > 0) {
      // Export from master students
      const headers = ['No. Pelajar', 'Nama Penuh', 'Kelas', 'Subjek', 'Status', 'No. Telefon', 'E-mel'];
      const rows = filteredMasterStudents.map((s) => [
        `"${s.studentId}"`,
        `"${s.name}"`,
        `"${s.className}"`,
        `"${subject.code} - ${subject.name}"`,
        `"Roster Induk"`,
        `"${s.phone || ''}"`,
        `"${s.email || ''}"`
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Senarai_Pelajar_${subject.code}_${selectedClassFilter}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    if (filteredEnrollments.length === 0) return;
    const headers = ['No. Pelajar', 'Nama Penuh', 'Kelas', 'Subjek', 'Tarikh Daftar', 'No. Telefon', 'E-mel'];
    const rows = filteredEnrollments.map((enr) => {
      const s = students.find((st) => st.studentId === enr.studentId || st.id === enr.studentId);
      return [
        `"${enr.studentId}"`,
        `"${s?.name || enr.studentId}"`,
        `"${enr.className}"`,
        `"${enr.subjectCode} - ${subject.name}"`,
        `"${new Date(enr.enrolledAt).toLocaleDateString('ms-MY')}"`,
        `"${s?.phone || ''}"`,
        `"${s?.email || ''}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Senarai_Pelajar_${subject.code}_${selectedClassFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Compute counts for the dropdown
  const totalDisplayCount = subjectEnrollments.length > 0 
    ? subjectEnrollments.length 
    : masterStudentsForSubject.length;

  if (!isOpen || !subject) return null;

  return (
    <div
      id="enrolled-students-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5"
    >
      <div
        id="enrolled-students-modal-card"
        className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 my-6"
      >
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-blue-900/60 via-slate-900 to-slate-900 p-4 sm:p-5 border-b border-slate-700/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  SENARAI PENDAFTARAN KELAS
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {subjectEnrollments.length > 0
                    ? `${filteredEnrollments.length} Pelajar Berdaftar`
                    : `${filteredMasterStudents.length} Pelajar Master Tersedia`}
                </span>
                {unenrolledMasterStudents.length > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {unenrolledMasterStudents.length} Belum Diselaraskan
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5">
                [{subject.code}] {subject.name}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-open-qr-from-enrolled-modal"
              onClick={() => onOpenGenerateQR(subject, selectedClassFilter === 'ALL' ? undefined : selectedClassFilter)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>Jana QR Kelas</span>
            </button>
            <button
              id="btn-close-enrolled-modal"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Master Students Sync Banner (Appears when master students exist but aren't enrolled yet) */}
        {unenrolledMasterStudents.length > 0 && (
          <div className="bg-gradient-to-r from-indigo-950/80 via-blue-950/70 to-slate-900 p-3.5 sm:p-4 border-b border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Pangkalan Data Mempunyai {masterStudentsForSubject.length} Pelajar Induk</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                    Jumlah Sistem: {students.length} Pelajar
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug mt-0.5">
                  {subjectEnrollments.length === 0
                    ? `Sistem mempunyai 83 pelajar dalam pangkalan data induk. Klik butang selaras di bawah untuk mendaftarkan ${masterStudentsForSubject.length} pelajar kelas ini ke dalam subjek ini secara automatik.`
                    : `Terdapat ${unenrolledMasterStudents.length} pelajar daripada pangkalan data induk yang belum diselaraskan ke dalam subjek ini.`}
                </p>
              </div>
            </div>

            <button
              id="btn-batch-sync-master-students"
              type="button"
              onClick={() => handleBatchEnroll()}
              disabled={isSyncing || (selectedClassFilter !== 'ALL' && unenrolledForSelectedClass.length === 0)}
              className="shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 border border-indigo-400/40 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              )}
              <span>
                {isSyncing
                  ? 'Menyelaraskan...'
                  : selectedClassFilter === 'ALL'
                  ? `Selaras & Daftar Semua (${unenrolledMasterStudents.length} Pelajar)`
                  : `Selaras & Daftar Kelas ${selectedClassFilter} (${unenrolledForSelectedClass.length} Pelajar)`}
              </span>
            </button>
          </div>
        )}

        {/* Sync Success Feedback Notice */}
        {syncFeedback && (
          <div className="px-5 py-2.5 bg-emerald-950/70 border-b border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
        )}

        {/* Filter and Search Action Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="input-search-enrolled-students"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama atau No. Pelajar..."
                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Class Filter */}
            <select
              id="select-filter-enrolled-class"
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">
                Semua Kelas ({totalDisplayCount})
                {subjectEnrollments.length === 0 && ' [Pelajar Induk]'}
              </option>
              {sectionsList.map((sec) => {
                const enrCount = subjectEnrollments.filter(
                  (e) => e.className.toUpperCase() === sec.toUpperCase() || e.className.replace(/_/g, ' ').toUpperCase() === sec.replace(/_/g, ' ').toUpperCase()
                ).length;
                const masterCount = masterStudentsForSubject.filter(
                  (s) => s.className.toUpperCase() === sec.toUpperCase() || s.className.replace(/_/g, ' ').toUpperCase() === sec.replace(/_/g, ' ').toUpperCase()
                ).length;
                const displayCount = subjectEnrollments.length > 0 ? enrCount : masterCount;

                return (
                  <option key={sec} value={sec}>
                    Kelas {sec} ({displayCount})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-export-enrolled-csv"
              onClick={handleExportCSV}
              disabled={filteredEnrollments.length === 0 && filteredMasterStudents.length === 0}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-400" />
              <span>Eksport CSV</span>
            </button>
          </div>
        </div>

        {/* Enrolled Students Table / Cards */}
        <div className="p-4 sm:p-5 max-h-[60vh] overflow-y-auto space-y-2">
          {subjectEnrollments.length === 0 ? (
            // No individual enrollments yet -> Display master students directly with 1-click enroll
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-200">
                    {selectedClassFilter === 'ALL'
                      ? `Memaparkan ${filteredMasterStudents.length} Pelajar daripada Pangkalan Data Induk (Semua Kelas)`
                      : `Memaparkan ${filteredMasterStudents.length} Pelajar Kelas ${selectedClassFilter} daripada Pangkalan Data Induk`}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {selectedClassFilter === 'ALL'
                      ? `Pelajar berikut berada di dalam kelas bagi subjek ini dan boleh didaftarkan serta-merta:`
                      : `Pelajar bagi kelas ${selectedClassFilter} berikut boleh didaftarkan masuk ke dalam subjek ini secara khusus:`}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    id="btn-sync-all-master-banner"
                    onClick={() => handleBatchEnroll(selectedClassFilter)}
                    disabled={isSyncing}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer shrink-0 transition-all disabled:opacity-50"
                  >
                    {isSyncing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5 text-amber-300" />
                    )}
                    <span>
                      {isSyncing
                        ? 'Menyelaraskan...'
                        : selectedClassFilter === 'ALL'
                        ? `Daftarkan Semua (${masterStudentsForSubject.length}) Pelajar`
                        : `Daftarkan Kelas ${selectedClassFilter} (${masterStudentsForSelectedClass.length} Pelajar)`}
                    </span>
                  </button>
                  {selectedClassFilter !== 'ALL' && (
                    <button
                      type="button"
                      id="btn-sync-all-classes-alternative"
                      onClick={() => handleBatchEnroll('ALL')}
                      disabled={isSyncing}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-all disabled:opacity-50"
                      title="Daftarkan semua kelas sekaligus"
                    >
                      <span>Daftar Semua Kelas ({masterStudentsForSubject.length})</span>
                    </button>
                  )}
                </div>
              </div>

              {filteredMasterStudents.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <GraduationCap className="w-8 h-8 text-slate-500 mx-auto" />
                  <p className="text-sm font-semibold text-slate-400">Tiada pelajar ditemui bagi kelas ini.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredMasterStudents.map((st) => (
                    <div
                      key={st.id}
                      className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/80 flex items-center justify-between gap-3 hover:border-slate-600 transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${getStudentColor(
                            st.studentId || st.id
                          )}`}
                        >
                          {getInitials(st.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-white text-xs sm:text-sm truncate">
                            {st.name}
                          </div>
                          <div className="font-mono text-[11px] text-blue-400 font-semibold">
                            {st.studentId || st.id}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-400 mt-1">
                            <span className={`px-1.5 py-0.2 rounded border font-bold ${getClassBadgeColor(st.className)}`}>
                              {st.className}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-700 text-slate-300 font-medium">
                              Roster Induk
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          id={`btn-view-qr-master-${st.studentId}`}
                          onClick={() => setPreviewQrStudent(st)}
                          className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Lihat Kod QR Identiti Pelajar"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : filteredEnrollments.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                <GraduationCap className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-300">
                Tiada rekod pendaftaran ditemui bagi tapisan kelas ini.
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Pilih 'Semua Kelas' atau pancarkan Kod QR pendaftaran kepada pelajar.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredEnrollments.map((enr) => {
                const student = students.find((s) => s.studentId === enr.studentId || s.id === enr.studentId);
                const displayName = student?.name || enr.studentId;
                const formattedDate = new Date(enr.enrolledAt).toLocaleDateString('ms-MY', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                });

                return (
                  <div
                    key={enr.id}
                    className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/80 flex items-center justify-between gap-3 hover:border-slate-600 transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${getStudentColor(
                          enr.studentId
                        )}`}
                      >
                        {getInitials(displayName)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white text-xs sm:text-sm truncate">
                          {displayName}
                        </div>
                        <div className="font-mono text-[11px] text-blue-400 font-semibold">
                          {enr.studentId}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-400 mt-1">
                          <span className={`px-1.5 py-0.2 rounded border font-bold ${getClassBadgeColor(enr.className)}`}>
                            {enr.className}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            {formattedDate}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {student && (
                        <button
                          id={`btn-view-qr-${enr.studentId}`}
                          onClick={() => setPreviewQrStudent(student)}
                          className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Lihat Kod QR Identiti Pelajar"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        id={`btn-delete-enrollment-${enr.id}`}
                        onClick={() => handleDeleteEnrollment(enr.id, displayName)}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border border-slate-700/50 hover:border-rose-500/40 transition-colors cursor-pointer"
                        title="Padam pendaftaran dari subjek ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="bg-slate-950 p-3.5 px-5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Pangkalan Data: {students.length} Pelajar Master | {subjectEnrollments.length} Pendaftaran Khusus Subjek
          </div>
          <button
            id="btn-close-enrolled-footer"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Mini Modal Preview of Student Static QR */}
      {previewQrStudent && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl text-center space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300">Kad QR Pelajar</span>
              <button
                onClick={() => setPreviewQrStudent(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-white rounded-2xl inline-block mx-auto">
              <QRCodeSVG value={`STUDENT|${previewQrStudent.studentId}`} size={160} level="H" />
            </div>
            <div>
              <div className="font-mono font-bold text-indigo-400">{previewQrStudent.studentId}</div>
              <div className="font-bold text-white text-sm">{previewQrStudent.name}</div>
              <div className="text-xs text-slate-400">Kelas {previewQrStudent.className}</div>
            </div>
            <button
              onClick={() => setPreviewQrStudent(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-white cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
