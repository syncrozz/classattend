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
import { generateWhatsAppWarningLink } from '../utils/whatsappHelper';
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
  Trash2,
  UserPlus,
  Pencil,
  Save,
  X,
  Check,
  Phone,
  Mail,
  UserCheck
} from 'lucide-react';
import { attendanceEngine } from '../services/attendanceEngine';

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
  onDeleteSession?: (sessionId: string) => void;
  onAddStudent?: (student: Student) => void;
  onUpdateStudent?: (student: Student) => void;
  onDeleteStudent?: (studentId: string) => void;
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
  onRequestAdminAccess,
  onDeleteSession,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent
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

  // Delete session modal state (for test platform sessions)
  const [sessionToDelete, setSessionToDelete] = useState<AttendanceSession | null>(null);

  // Student Editing & Adding States
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editStudentForm, setEditStudentForm] = useState({
    name: '',
    studentId: '',
    className: '',
    phone: '',
    email: ''
  });
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState<boolean>(false);
  const [addStudentForm, setAddStudentForm] = useState({
    name: '',
    studentId: '',
    className: '',
    phone: '',
    email: ''
  });

  // Cell-level Attendance Editing State
  const [editingAttendanceCell, setEditingAttendanceCell] = useState<{
    student: Student;
    session: AttendanceSession;
    currentStatus: string;
    remarks: string;
  } | null>(null);

  // Toast notification for user action feedback
  const [matrixToast, setMatrixToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setMatrixToast(msg);
    setTimeout(() => setMatrixToast(null), 3500);
  };

  const handleOpenEditStudent = (st: Student) => {
    setEditingStudent(st);
    setEditStudentForm({
      name: st.name || '',
      studentId: st.studentId || st.id || '',
      className: st.className || selectedClass,
      phone: st.phone || '',
      email: st.email || ''
    });
  };

  const handleSaveStudentEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    if (!editStudentForm.name.trim() || !editStudentForm.studentId.trim()) {
      showToast('Sila isikan Nama Pelajar dan No. Matrik/ID.');
      return;
    }

    const updated: Student = {
      ...editingStudent,
      name: editStudentForm.name.trim().toUpperCase(),
      studentId: editStudentForm.studentId.trim().toUpperCase(),
      className: (editStudentForm.className || selectedClass).trim().toUpperCase(),
      phone: editStudentForm.phone.trim() || undefined,
      email: editStudentForm.email.trim() || undefined
    };

    if (onUpdateStudent) {
      onUpdateStudent(updated);
    }
    attendanceEngine.updateStudent(updated);
    showToast(`Rekod pelajar ${updated.name} (${updated.studentId}) berjaya dikemaskini!`);
    setEditingStudent(null);
  };

  const handleDeleteStudentConfirm = (studentId: string, studentName: string) => {
    if (window.confirm(`Adakah anda pasti untuk memadam rekod pelajar ${studentName}?`)) {
      if (onDeleteStudent) {
        onDeleteStudent(studentId);
      }
      attendanceEngine.deleteStudent(studentId);
      showToast(`Pelajar ${studentName} telah dipadamkan.`);
      setEditingStudent(null);
    }
  };

  const handleOpenAddStudent = () => {
    setAddStudentForm({
      name: '',
      studentId: '',
      className: selectedClass,
      phone: '',
      email: ''
    });
    setIsAddStudentModalOpen(true);
  };

  const handleSaveAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addStudentForm.name.trim() || !addStudentForm.studentId.trim()) {
      showToast('Sila isikan Nama Pelajar dan No. Matrik/ID.');
      return;
    }

    const cleanId = addStudentForm.studentId.trim().toUpperCase();
    const newStudent: Student = {
      id: cleanId,
      studentId: cleanId,
      name: addStudentForm.name.trim().toUpperCase(),
      className: (addStudentForm.className || selectedClass).trim().toUpperCase(),
      phone: addStudentForm.phone.trim() || undefined,
      email: addStudentForm.email.trim() || undefined
    };

    if (onAddStudent) {
      onAddStudent(newStudent);
    }
    attendanceEngine.addStudent(newStudent);
    showToast(`Pelajar ${newStudent.name} berjaya didaftarkan ke kelas ${newStudent.className}!`);
    setIsAddStudentModalOpen(false);
  };

  const handleSetCellAttendance = (
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'REMOVE',
    customRemarks?: string
  ) => {
    if (!editingAttendanceCell) return;
    const studentId = editingAttendanceCell.student.studentId || editingAttendanceCell.student.id;
    attendanceEngine.setStudentAttendanceRecord({
      sessionId: editingAttendanceCell.session.id,
      studentId,
      status,
      notes: customRemarks !== undefined ? customRemarks : editingAttendanceCell.remarks
    });
    showToast(`Status kehadiran ${editingAttendanceCell.student.name} telah dikemaskini.`);
    setEditingAttendanceCell(null);
  };

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

  // Quick KPI filter for viewing only students with attendance below 80%
  const [showOnlyBelow80, setShowOnlyBelow80] = useState<boolean>(false);

  // Filtered rows for display
  const displayedRows = useMemo(() => {
    if (!showOnlyBelow80) return matrixData.rows;
    return matrixData.rows.filter((r) => r.isWarning);
  }, [matrixData.rows, showOnlyBelow80]);

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setShowOnlyBelow80(false);
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
            <h3 className="text-lg font-bold text-white tracking-tight">
              Matriks Kehadiran
            </h3>
          </div>

          {/* Action Buttons: Cetak PDF, Eksport CSV & Tambah Pelajar */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              id="btn-matrix-add-student"
              onClick={handleOpenAddStudent}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm shadow-indigo-950/40 cursor-pointer"
              title={`Tambah pendaftaran pelajar baharu ke dalam kelas ${selectedClass}`}
            >
              <UserPlus className="w-4 h-4 text-indigo-100" />
              <span>+ Tambah Pelajar</span>
            </button>

            <button
              type="button"
              id="btn-print-matrix-pdf"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-bold transition-all shadow-sm cursor-pointer hover:border-slate-600"
              title="Cetak jadual matriks ini dalam saiz kertas A4 Landskap atau simpan sebagai PDF"
            >
              <Printer className="w-4 h-4 text-indigo-400" />
              <span>Cetak</span>
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
              <span>1. Pilih Kelas</span>
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
            <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>2. Pilih Subjek</span>
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
              <span>3. Tarikh</span>
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
              {(startDate || endDate || searchQuery || showOnlyBelow80) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs cursor-pointer shrink-0"
                  title="Set semula semua penapis"
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
              <button
                type="button"
                onClick={() => setShowOnlyBelow80((prev) => !prev)}
                className={`px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  showOnlyBelow80
                    ? 'bg-rose-600 text-white border-rose-500 shadow-md ring-2 ring-rose-400/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                }`}
                title={showOnlyBelow80 ? 'Klik untuk papar semua pelajar' : 'Klik untuk tapis pelajar bawah 80% sahaja'}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>{matrixData.studentsBelow80Count} pelajar bawah 80%</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-200 border border-rose-500/30 ml-0.5">
                  {showOnlyBelow80 ? 'Papar Semua' : 'Tapis <80%'}
                </span>
              </button>
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
                  {/* Column 1: NO. */}
                  <th
                    scope="col"
                    className="bg-slate-200 border border-slate-400 px-2 py-3 text-center min-w-[46px] w-[46px] font-black"
                  >
                    NO.
                  </th>

                  {/* Column 2: Class (Pink background header) */}
                  <th
                    scope="col"
                    className="bg-pink-200 text-pink-950 border border-slate-400 px-2.5 py-3 text-center min-w-[76px] w-[76px] font-black tracking-wider"
                  >
                    Class
                  </th>

                  {/* Column 3: NAME */}
                  <th
                    scope="col"
                    className="bg-slate-200 border border-slate-400 px-3.5 py-3 text-left min-w-[200px] max-w-[320px] font-black"
                  >
                    NAME
                  </th>

                  {/* Column 4: ID NUMBER */}
                  <th
                    scope="col"
                    className="bg-slate-200 border border-slate-400 px-2.5 py-3 text-center min-w-[125px] w-[125px] font-black whitespace-nowrap"
                  >
                    ID NUMBER
                  </th>

                  {/* Dynamic Session Date Columns */}
                  {matrixData.columns.map((col, cIdx) => (
                    <th
                      key={`matrix-col-${col.session.id}-${cIdx}`}
                      scope="col"
                      className="border border-slate-400 px-1.5 py-2 text-center min-w-[64px] max-w-[76px] bg-slate-100 font-bold text-slate-900 group relative"
                      title={`${col.session.sessionName} (${col.session.date} ${col.session.startTime || ''}) - Status: ${col.session.status}`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-extrabold text-[11px] tracking-tight">{col.dateFormatted}</span>
                        {onDeleteSession && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSessionToDelete(col.session);
                            }}
                            className="no-print opacity-30 hover:opacity-100 p-0.5 rounded hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition-all cursor-pointer"
                            title={`Padam sesi ${col.dateFormatted} (contoh: jika sesi ujian/testing platform)`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
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
                  <th
                    scope="col"
                    className="border border-slate-400 px-3 py-3 text-center min-w-[130px] bg-slate-200 font-black text-slate-900"
                  >
                    Status KPI / Tindakan
                  </th>
                </tr>
              </thead>

              <tbody>
                {displayedRows.length === 0 ? (
                  <tr>
                    <td colSpan={matrixData.columns.length + 8} className="py-12 text-center bg-slate-50 text-slate-600">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                        <p className="font-bold text-slate-800 text-sm">Tahniah! Tiada Pelajar di Bawah 80%</p>
                        <p className="text-xs text-slate-500 max-w-md">Semua pelajar bagi kelas dan subjek ini berjaya melepasi piawaian kehadiran minimum.</p>
                        <button
                          type="button"
                          onClick={() => setShowOnlyBelow80(false)}
                          className="mt-2 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
                        >
                          Paparkan Semua Pelajar
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayedRows.map((row, rIdx) => {
                  const isEven = rIdx % 2 === 0;
                  const rowBg = isEven ? 'bg-white' : 'bg-slate-50/60';

                  return (
                    <tr
                      key={`matrix-row-${row.student.id}-${rIdx}`}
                      className="hover:bg-amber-50/40 transition-colors"
                    >
                      {/* Column 1: NO. */}
                      <td
                        className={`${rowBg} border border-slate-400 px-2 py-2 text-center font-bold text-slate-700 min-w-[46px] w-[46px]`}
                      >
                        {row.no}
                      </td>

                      {/* Column 2: Class (Soft Pink Background / Merah Jambu Lembut) */}
                      <td
                        className="bg-[#fce7f3] text-pink-950 border border-slate-400 px-2.5 py-2 text-center font-black min-w-[76px] w-[76px] tracking-wide"
                      >
                        {row.className}
                      </td>

                      {/* Column 3: NAME (Uppercase, does not cut off, with Edit trigger) */}
                      <td
                        className={`${rowBg} border border-slate-400 px-3 py-2 text-left font-bold text-slate-950 min-w-[200px] max-w-[320px] break-words uppercase leading-tight group/strow`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span
                            onClick={() => handleOpenEditStudent(row.student)}
                            className="cursor-pointer hover:text-indigo-600 hover:underline transition-colors select-none"
                            title="Klik untuk ubah maklumat pelajar ini"
                          >
                            {row.name}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditStudent(row.student);
                            }}
                            className="no-print p-1 rounded hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 transition-colors opacity-60 group-hover/strow:opacity-100 cursor-pointer shrink-0"
                            title="Ubah / Kemas kini maklumat pelajar ini"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Column 4: ID NUMBER */}
                      <td
                        className={`${rowBg} border border-slate-400 px-2.5 py-2 text-center font-mono text-[11px] font-bold text-slate-800 min-w-[125px] w-[125px] whitespace-nowrap`}
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
                              onClick={() => {
                                setEditingAttendanceCell({
                                  student: row.student,
                                  session: col.session,
                                  currentStatus: 'ABSENT',
                                  remarks: ''
                                });
                              }}
                              className="border border-slate-400 px-1.5 py-2 text-center text-slate-300 cursor-pointer hover:ring-2 hover:ring-indigo-400/80 transition-all"
                              title={`${row.name} - ${col.dateFormatted}: Tiada rekod. Klik untuk tanda kehadiran.`}
                            >
                              -
                            </td>
                          );
                        }

                        return (
                          <td
                            key={`cell-${row.student.id}-${col.session.id}`}
                            onClick={() => {
                              setEditingAttendanceCell({
                                student: row.student,
                                session: col.session,
                                currentStatus: cell.status,
                                remarks: cell.record?.notes || ''
                              });
                            }}
                            className={`border border-slate-400 px-1 py-1 text-center select-none cursor-pointer hover:ring-2 hover:ring-indigo-500 hover:z-20 relative transition-all ${cell.bgClass}`}
                            title={`${row.name} - ${col.dateFormatted}: ${cell.label}. Klik untuk ubah kehadiran.`}
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

                      {/* Status KPI & Tindakan WhatsApp Amaran (Pindahan fungsi penting dari Perspektif Pelajar) */}
                      <td className="border border-slate-400 px-2.5 py-1.5 text-center bg-slate-50">
                        {row.totalSessions === 0 ? (
                          <span className="text-[11px] text-slate-400 italic">Tiada Sesi</span>
                        ) : !row.isWarning ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs"
                            title="Lulus KPI Kehadiran (≥ 80%)"
                          >
                            <span>✅</span>
                            <span>Lulus</span>
                          </span>
                        ) : (() => {
                          const waUrl = generateWhatsAppWarningLink({
                            student: row.student,
                            courseCode: selectedSubjectCode,
                            courseName: selectedSubjectName,
                            className: row.className || selectedClass,
                            presentCount: row.presentCount,
                            totalSessions: row.totalSessions,
                            rate: row.percentage,
                            lecturerName: activeLecturer?.name
                          });

                          return (
                            <div className="flex items-center justify-center gap-1.5">
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300"
                                title="Di Bawah KPI (< 80%)"
                              >
                                <span>❌</span>
                                <span>&lt;80%</span>
                              </span>
                              {waUrl ? (
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="no-print inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold shadow-xs hover:scale-105 transition-all cursor-pointer"
                                  title={`Hantar Amaran Kehadiran Rasmi kepada ${row.name} via WhatsApp (${row.student.phone})`}
                                >
                                  <Phone className="w-2.5 h-2.5" />
                                  <span>WhatsApp</span>
                                </a>
                              ) : (
                                <span
                                  className="no-print text-[9px] text-slate-400 italic"
                                  title="No. telefon belum didaftarkan"
                                >
                                  Tiada Tel
                                </span>
                              )}
                            </div>
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

      {/* Confirmation Modal: Delete Session (e.g. Test Platform Session) */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">Padamkan Sesi Daripada Matriks?</h4>
                <p className="text-xs text-rose-300/80 font-medium">Sesi akan dibuang sepenuhnya daripada rekod</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Subjek:</span>
                <span className="font-bold text-white">
                  {sessionToDelete.subjectCode} - {sessionToDelete.subjectName || sessionToDelete.sessionName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Kelas:</span>
                <span className="font-bold text-indigo-300">{sessionToDelete.className}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tarikh:</span>
                <span className="font-mono text-slate-200">{sessionToDelete.date}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs leading-relaxed space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Untuk Sesi Ujian / Test Platform:</span>
              </div>
              <p>
                Jika sesi ini dibuka hanya untuk menguji platform dan ditutup tanpa kehadiran sebenar pelajar, memadamkannya memastikan lajur sesi ini dibuang dan <strong>pelajar TIDAK akan dikira sebagai Tidak Hadir (Absent)</strong>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSessionToDelete(null)}
                className="px-4 py-2.5 min-h-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteSession && sessionToDelete) {
                    onDeleteSession(sessionToDelete.id);
                  }
                  setSessionToDelete(null);
                }}
                className="px-5 py-2.5 min-h-[48px] rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sahkan Padam Sesi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 1: Ubah / Kemas Kini Maklumat Pelajar */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Ubah Maklumat Pelajar</h4>
                  <p className="text-xs text-slate-400">Kemas kini profil atau tukar kelas pelajar</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudentEdit} className="space-y-4">
              {/* Nama Pelajar */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Penuh Pelajar <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editStudentForm.name}
                  onChange={(e) => setEditStudentForm({ ...editStudentForm, name: e.target.value })}
                  placeholder="Contoh: MUHAMMAD AIMAN BIN ABDULLAH"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 uppercase"
                />
              </div>

              {/* No Matrik & Kelas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    No. Matrik / No. ID <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editStudentForm.studentId}
                    onChange={(e) => setEditStudentForm({ ...editStudentForm, studentId: e.target.value })}
                    placeholder="Contoh: A01DIA22F001"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white focus:outline-none focus:border-indigo-500 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Kelas / Seksyen <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={editStudentForm.className}
                    onChange={(e) => setEditStudentForm({ ...editStudentForm, className: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-bold text-indigo-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {uniqueClasses.map((cls, idx) => (
                      <option key={`edit-cls-opt-${cls}-${idx}`} value={cls}>
                        Kelas {cls}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* No Telefon & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    No. Telefon / WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={editStudentForm.phone}
                      onChange={(e) => setEditStudentForm({ ...editStudentForm, phone: e.target.value })}
                      placeholder="Contoh: 0123456789"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    E-mel Pelajar
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={editStudentForm.email}
                      onChange={(e) => setEditStudentForm({ ...editStudentForm, email: e.target.value })}
                      placeholder="pelajar@bpenawar.kpm.edu.my"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => handleDeleteStudentConfirm(editingStudent.id, editingStudent.name)}
                  className="px-3.5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  title="Padam rekod pelajar ini daripada sistem"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Padam Pelajar</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingStudent(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Perubahan</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Tambah Pelajar Baharu */}
      {isAddStudentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Tambah Pelajar Baharu</h4>
                  <p className="text-xs text-slate-400">Daftar pelajar terus ke dalam jadual matriks kelas</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddStudentModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Penuh Pelajar <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addStudentForm.name}
                  onChange={(e) => setAddStudentForm({ ...addStudentForm, name: e.target.value })}
                  placeholder="Contoh: SITI NURHALIZA BINTI AHMAD"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 uppercase"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    No. Matrik / No. ID <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addStudentForm.studentId}
                    onChange={(e) => setAddStudentForm({ ...addStudentForm, studentId: e.target.value })}
                    placeholder="Contoh: A01DIA22F099"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-mono text-white focus:outline-none focus:border-indigo-500 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Kelas / Seksyen <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={addStudentForm.className}
                    onChange={(e) => setAddStudentForm({ ...addStudentForm, className: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-bold text-indigo-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {uniqueClasses.map((cls, idx) => (
                      <option key={`add-cls-opt-${cls}-${idx}`} value={cls}>
                        Kelas {cls}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    No. Telefon / WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={addStudentForm.phone}
                      onChange={(e) => setAddStudentForm({ ...addStudentForm, phone: e.target.value })}
                      placeholder="Contoh: 0123456789"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    E-mel Pelajar
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={addStudentForm.email}
                      onChange={(e) => setAddStudentForm({ ...addStudentForm, email: e.target.value })}
                      placeholder="pelajar@bpenawar.kpm.edu.my"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddStudentModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Daftar Pelajar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Ubah Status Kehadiran Pelajar (Cell Level) */}
      {editingAttendanceCell && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Ubah Kehadiran Pelajar</h4>
                  <p className="text-xs text-slate-400">Pilih status kehadiran sesi kuliah</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingAttendanceCell(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Pelajar:</span>
                <span className="font-bold text-white uppercase">{editingAttendanceCell.student.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">No. Matrik:</span>
                <span className="font-mono text-indigo-300 font-bold">{editingAttendanceCell.student.studentId || editingAttendanceCell.student.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Sesi / Tarikh:</span>
                <span className="font-medium text-slate-200">
                  {editingAttendanceCell.session.sessionName} ({editingAttendanceCell.session.date})
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Pilih Status Kehadiran:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSetCellAttendance('PRESENT')}
                  className="p-3 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center font-black text-emerald-400">✓</span>
                  <span>Hadir (✓)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSetCellAttendance('LATE')}
                  className="p-3 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  <span className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center font-black text-amber-400">L</span>
                  <span>Lewat (L)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSetCellAttendance('EXCUSED')}
                  className="p-3 rounded-xl bg-blue-950/40 hover:bg-blue-900/50 border border-blue-500/40 text-blue-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  <span className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center font-black text-blue-400">E</span>
                  <span>Bersebab (E)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSetCellAttendance('ABSENT')}
                  className="p-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  <span className="w-6 h-6 rounded-lg bg-rose-500/20 flex items-center justify-center font-black text-rose-400">A</span>
                  <span>Tidak Hadir (A)</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleSetCellAttendance('REMOVE')}
                className="w-full mt-2 p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold border border-slate-700/60 transition-colors cursor-pointer text-center"
              >
                Kosongkan / Padam Rekod Sesi Ini
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setEditingAttendanceCell(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {matrixToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-950 border-2 border-emerald-500/60 text-emerald-200 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{matrixToast}</span>
        </div>
      )}
    </div>
  );
};
