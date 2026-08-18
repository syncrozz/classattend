import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Student,
  AttendanceRecord,
  AttendanceSession,
  Subject,
  ScanResult
} from '../types';
import {
  getClassBadgeColor,
  getInitials,
  getStudentColor
} from '../utils/studentUtils';
import { exportStudentsToCSV, downloadCSV } from '../utils/csvHelper';
import {
  Search,
  Plus,
  Download,
  Upload,
  QrCode,
  Printer,
  Trash2,
  X,
  Phone,
  Mail,
  GraduationCap
} from 'lucide-react';

interface StudentDirectoryViewProps {
  students: Student[];
  sessions: AttendanceSession[];
  subjects?: Subject[];
  attendanceRecords: AttendanceRecord[];
  isAdmin: boolean;
  onAddStudent: (student: Student) => void;
  onDeleteStudent: (studentId: string) => void;
  onOpenCSVImport: () => void;
  onRequestAdminAccess: (actionName?: string) => void;
  onQuickSimulateScan: (studentId: string) => ScanResult;
}

export const StaffDirectoryView: React.FC<StudentDirectoryViewProps> = ({
  students,
  sessions,
  subjects = [],
  attendanceRecords,
  isAdmin,
  onAddStudent,
  onDeleteStudent,
  onOpenCSVImport,
  onRequestAdminAccess,
  onQuickSimulateScan
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSet, setSelectedSet] = useState<string>('ALL');

  // Modal States
  const [selectedStudentForQR, setSelectedStudentForQR] = useState<Student | null>(null);
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<Student | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isBatchPrintOpen, setIsBatchPrintOpen] = useState<boolean>(false);
  const [batchPrintCategory, setBatchPrintCategory] = useState<string>('ALL');
  const [batchPrintFormat, setBatchPrintFormat] = useState<'CARDS' | 'LABELS' | 'LABELS_4'>('LABELS_4');

  // New Student Form State
  const [newStudentId, setNewStudentId] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newSet, setNewSet] = useState<string>('DIA_4A');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');

  // Dynamically extract all available classes
  const uniqueClasses = Array.from(new Set(students.map((s) => s.className).filter(Boolean))).sort();
  const sets = ['ALL', ...uniqueClasses];

  // Students for batch printing
  const batchPrintStudents = students.filter((student) =>
    batchPrintCategory === 'ALL' ? true : student.className === batchPrintCategory
  );

  // Filter students
  const filteredStudents = students.filter((student) => {
    const matchesSet = selectedSet === 'ALL' || student.className === selectedSet;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      student.name.toLowerCase().includes(q) ||
      student.studentId.toLowerCase().includes(q) ||
      student.email.toLowerCase().includes(q) ||
      student.phone.includes(q);
    return matchesSet && matchesSearch;
  });

  // Calculate personal attendance rate
  const getStudentStats = (studentId: string, className: string) => {
    const applicableSessions = sessions.filter((s) => !s.className || s.className === className);
    const presentRecords = attendanceRecords.filter((r) => r.studentId === studentId && r.status === 'PRESENT');
    const rate = applicableSessions.length > 0 ? Math.round((presentRecords.length / applicableSessions.length) * 100) : 0;
    return {
      total: applicableSessions.length,
      present: presentRecords.length,
      rate
    };
  };

  // Handle Export CSV
  const handleExportCSV = () => {
    const csvData = exportStudentsToCSV(filteredStudents);
    downloadCSV(csvData, `Senarai_Pelajar_ClassAttend_${selectedSet}.csv`);
  };

  // Handle Add Student Submit
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentId.trim() || !newName.trim()) return;

    const student: Student = {
      id: newStudentId.trim().toUpperCase(),
      studentId: newStudentId.trim().toUpperCase(),
      name: newName.trim().toUpperCase(),
      className: newSet,
      phone: newPhone.trim(),
      email: newEmail.trim() || `${newStudentId.trim().toLowerCase()}@bpenawar.kpm.edu.my`,
      department: 'Diploma Perakaunan'
    };

    onAddStudent(student);
    setIsAddModalOpen(false);
    setNewStudentId('');
    setNewName('');
    setNewPhone('');
    setNewEmail('');
  };

  const isAnyPrintModalOpen = Boolean(selectedStudentForQR || isBatchPrintOpen);

  return (
    <div className="space-y-6">
      {/* Main Directory Screen Content (Hidden during modal print) */}
      <div className={`space-y-6 ${isAnyPrintModalOpen ? 'no-print' : ''}`}>
        {/* Top Header */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">Direktori Master Pelajar</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                  {students.length} Pelajar
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Setiap pelajar mempunyai No. Pelajar unik dan Kod QR kekal untuk semua kelas dan sesi kuliah.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                id="btn-add-student"
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Pelajar</span>
              </button>

              <button
                id="btn-import-csv"
                onClick={onOpenCSVImport}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import CSV</span>
              </button>

              <button
                id="btn-export-csv"
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Eksport CSV</span>
              </button>

              <button
                id="btn-batch-print-qr"
                onClick={() => {
                  setBatchPrintCategory(selectedSet);
                  setIsBatchPrintOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
                title="Cetak Kad ID / Kod QR mengikut Kategori Seksyen Kelas atau Semua Pelajar"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Kad ID (QR)</span>
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            {/* Set Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1 no-scrollbar">
              {sets.map((setName) => {
                const count = setName === 'ALL' ? students.length : students.filter((s) => s.className === setName).length;
                return (
                  <button
                    key={setName}
                    onClick={() => setSelectedSet(setName)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                      selectedSet === setName
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <span>{setName === 'ALL' ? 'Semua Pelajar' : `Seksyen ${setName}`}</span>
                    <span className="ml-1.5 text-[10px] opacity-80">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-72 shrink-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Cari nama, No. Pelajar, e-mel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* STUDENT CARDS GRID */}
        {filteredStudents.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/60 rounded-2xl border border-slate-800 p-6 text-slate-500 text-xs">
            Tiada rekod pelajar sepadan dengan kriteria carian.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudents.map((student) => {
              const stats = getStudentStats(student.id, student.className);

              return (
                <div
                  key={student.id}
                  className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3 shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 truncate">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 shadow-inner ${getStudentColor(student.id)}`}>
                        {getInitials(student.name)}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getClassBadgeColor(student.className)}`}>
                            {student.className}
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-300">
                            {student.studentId}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white truncate mt-0.5" title={student.name}>
                          {student.name}
                        </h4>
                      </div>
                    </div>

                    {/* QR Badge Trigger */}
                    <button
                      id={`btn-view-qr-${student.id}`}
                      onClick={() => setSelectedStudentForQR(student)}
                      className="p-2 rounded-xl bg-slate-950 hover:bg-indigo-600/30 text-indigo-400 border border-slate-800 hover:border-indigo-500/40 transition-all cursor-pointer"
                      title="Papar Kad QR Pelajar"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Contact details */}
                  <div className="text-[11px] text-slate-400 space-y-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate">{student.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                      <span>{student.phone}</span>
                    </div>
                  </div>

                  {/* Attendance Summary Bar & Action Buttons */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-bold text-white">
                        {stats.present}/{stats.total}
                      </div>
                      <span className="text-[10px] text-slate-400">Hadir ({stats.rate}%)</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* View History */}
                      <button
                        onClick={() => setSelectedStudentForHistory(student)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-all cursor-pointer"
                      >
                        Sejarah
                      </button>

                      {/* Fast Simulator Check-in */}
                      <button
                        onClick={() => onQuickSimulateScan(student.id)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-[11px] font-semibold border border-indigo-500/30 transition-all cursor-pointer"
                        title="Uji Imbas Pantas"
                      >
                        Imbas
                      </button>

                      {isAdmin && (
                        <button
                          onClick={() => onDeleteStudent(student.id)}
                          className="p-1 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white text-[11px] transition-all cursor-pointer"
                          title="Padam Pelajar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* STUDENT DIGITAL QR BADGE MODAL */}
      {selectedStudentForQR && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 printable-modal-wrapper">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-center space-y-5 printable-modal-content">
            <div className="flex justify-between items-center no-print">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Kad ID Digital Pelajar
              </span>
              <button
                onClick={() => setSelectedStudentForQR(null)}
                className="text-slate-400 hover:text-white cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ID Card Front */}
            <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 shadow-xl space-y-4 printable-id-card">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-indigo-400" />
                  <div className="text-left">
                    <span className="text-xs font-bold text-white block">ClassAttend ID</span>
                    <span className="text-[9px] text-slate-400 block tracking-tight">KPM BANDAR PENAWAR</span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border badge-student-set ${getClassBadgeColor(selectedStudentForQR.className)}`}>
                  {selectedStudentForQR.className}
                </span>
              </div>

              {/* QR Code */}
              <div className="p-4 rounded-xl bg-white inline-block shadow-lg mx-auto qr-code-wrapper">
                <QRCodeSVG
                  value={`STUDENT|${selectedStudentForQR.studentId}`}
                  size={160}
                  level="H"
                  includeMargin={false}
                />
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-white">
                  {selectedStudentForQR.name}
                </h4>
                <div className="text-xs font-mono font-bold text-indigo-400 student-id-text">
                  {selectedStudentForQR.studentId}
                </div>
                <div className="text-[10px] text-slate-400">
                  {selectedStudentForQR.department || 'Diploma Perakaunan'}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 no-print">
              Pelajar boleh memaparkan QR ini pada telefon atau kad bercetak untuk sebarang sesi kelas dan kuliah pensyarah.
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

      {/* STUDENT ATTENDANCE HISTORY MODAL */}
      {selectedStudentForHistory && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Sejarah Kehadiran Pelajar</h3>
                <p className="text-xs text-slate-400">
                  {selectedStudentForHistory.name} ({selectedStudentForHistory.studentId}) • Seksyen {selectedStudentForHistory.className}
                </p>
              </div>
              <button
                onClick={() => setSelectedStudentForHistory(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Record Timeline */}
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {sessions.map((session) => {
                const rec = attendanceRecords.find(
                  (r) => r.sessionId === session.id && r.studentId === selectedStudentForHistory.id
                );
                const isAttended = rec?.status === 'PRESENT';

                return (
                  <div
                    key={session.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                      isAttended
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        {session.subjectCode && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                            {session.subjectCode}
                          </span>
                        )}
                        <span className="text-xs font-bold text-white">{session.sessionName}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {session.date} • {session.startTime} {session.lecturerName ? `• ${session.lecturerName}` : ''}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {isAttended ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          HADIR ✓
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-500">
                          TIDAK HADIR
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* BATCH PRINT SHEET MODAL */}
      {isBatchPrintOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 printable-modal-wrapper printable-batch-container">
          <div className="w-full max-w-4xl max-h-[90vh] rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl flex flex-col space-y-4 printable-modal-content">
            {/* Modal Header & Close (Screen only) */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 no-print">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">Cetak Kad ID & Kod QR Pelajar</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                    {batchPrintStudents.length} Kad Dipilih
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pilih mengikut Kategori Seksyen Kelas atau cetak Semua Kategori pelajar serentak.
                </p>
              </div>
              <button
                onClick={() => setIsBatchPrintOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter & Options Toolbar (Screen only) */}
            <div className="space-y-3 p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 no-print">
              {/* Category / Class Selection */}
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <span>Pilih Kategori Seksyen Kelas:</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => setBatchPrintCategory('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      batchPrintCategory === 'ALL'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 font-bold'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <span>Semua Kategori (Semua Kelas)</span>
                    <span className="ml-1.5 text-[10px] opacity-80">({students.length})</span>
                  </button>

                  {uniqueClasses.map((cls) => {
                    const count = students.filter((s) => s.className === cls).length;
                    return (
                      <button
                        key={cls}
                        onClick={() => setBatchPrintCategory(cls)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          batchPrintCategory === cls
                            ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 font-bold'
                            : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        <span>Seksyen {cls}</span>
                        <span className="ml-1.5 text-[10px] opacity-80">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Layout Format Selection */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Format Cetakan:</span>
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setBatchPrintFormat('CARDS')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        batchPrintFormat === 'CARDS'
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Kad ID Lanyard (2 Kolum)
                    </button>
                    <button
                      onClick={() => setBatchPrintFormat('LABELS')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        batchPrintFormat === 'LABELS'
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Pelekat QR (3 Kolum)
                    </button>
                    <button
                      id="btn-format-labels-4"
                      onClick={() => setBatchPrintFormat('LABELS_4')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        batchPrintFormat === 'LABELS_4'
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Pelekat QR (4 Kolum)
                    </button>
                  </div>
                </div>

                <span className="text-[11px] text-slate-400">
                  {batchPrintFormat === 'CARDS' 
                    ? 'Kad saiz penuh dengan pengepala kolej & logo (2 Kolum)' 
                    : batchPrintFormat === 'LABELS'
                    ? 'Pelekat standard untuk meja / fail pelajar (3 Kolum)'
                    : 'Pelekat padat untuk buku rekod & lembaran pelekat (4 Kolum)'}
                </span>
              </div>
            </div>

            {/* Print Area Preview */}
            <div className="flex-1 overflow-y-auto max-h-[50vh] p-2 bg-slate-950 rounded-2xl border border-slate-800/60">
              {batchPrintStudents.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Tiada rekod pelajar dalam kategori ini.
                </div>
              ) : batchPrintFormat === 'CARDS' ? (
                /* FORMAT 1: ID BADGES (2-COLUMN A4 SHEET) */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 printable-batch-sheet-cards">
                  {batchPrintStudents.map((st) => (
                    <div
                      key={st.id}
                      className="p-4 rounded-2xl bg-white text-slate-900 border-2 border-slate-300 shadow-sm flex flex-col justify-between printable-batch-id-card"
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5 text-indigo-700" />
                          <div className="text-left">
                            <span className="text-[11px] font-extrabold text-slate-900 block leading-tight">ClassAttend ID</span>
                            <span className="text-[8px] text-slate-500 block uppercase tracking-tight">KPM BANDAR PENAWAR</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-800">
                          {st.className}
                        </span>
                      </div>

                      {/* QR Code */}
                      <div className="flex justify-center py-2 qr-code-wrapper">
                        <QRCodeSVG value={`STUDENT|${st.studentId}`} size={110} level="M" />
                      </div>

                      {/* Student Info */}
                      <div className="text-center pt-2 border-t border-slate-100 space-y-0.5">
                        <div className="text-xs font-black text-slate-900 leading-tight truncate">
                          {st.name}
                        </div>
                        <div className="text-[11px] font-mono font-bold text-indigo-700">
                          {st.studentId}
                        </div>
                        <div className="text-[9px] text-slate-500">
                          {st.department || 'Diploma Perakaunan'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : batchPrintFormat === 'LABELS' ? (
                /* FORMAT 2: QR LABELS (3-COLUMN A4 SHEET) */
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 printable-batch-sheet-labels">
                  {batchPrintStudents.map((st) => (
                    <div
                      key={st.id}
                      className="p-3 rounded-xl bg-white text-slate-900 text-center space-y-1 shadow-sm border border-slate-200 printable-batch-label"
                    >
                      <div className="text-[10px] font-bold text-indigo-700 truncate">{st.className}</div>
                      <div className="flex justify-center py-1">
                        <QRCodeSVG value={`STUDENT|${st.studentId}`} size={80} level="M" />
                      </div>
                      <div className="text-[10px] font-extrabold truncate text-slate-900">{st.name}</div>
                      <div className="text-[9px] font-mono font-bold text-slate-600">{st.studentId}</div>
                    </div>
                  ))}
                </div>
              ) : (
                /* FORMAT 3: QR LABELS (4-COLUMN A4 SHEET) */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 printable-batch-sheet-labels-4">
                  {batchPrintStudents.map((st) => (
                    <div
                      key={st.id}
                      className="p-2.5 rounded-xl bg-white text-slate-900 shadow-sm border border-slate-300 printable-batch-label-4 aspect-[9/16] flex flex-col justify-between box-border"
                    >
                      {/* Top Header */}
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1 px-0.5">
                        <span className="text-[9px] font-bold text-indigo-700 truncate">{st.className}</span>
                        <span className="text-[7.5px] text-slate-500 font-extrabold uppercase tracking-tight">KPM BP</span>
                      </div>

                      {/* QR Code */}
                      <div className="flex flex-col items-center justify-center my-auto py-1">
                        <div className="p-1 rounded-lg bg-slate-50 border border-slate-200/80">
                          <QRCodeSVG value={`STUDENT|${st.studentId}`} size={70} level="M" />
                        </div>
                      </div>

                      {/* Bottom Footer Info */}
                      <div className="pt-1 border-t border-slate-100 space-y-0.5 text-center">
                        <div className="text-[9px] font-extrabold truncate text-slate-900 leading-tight" title={st.name}>
                          {st.name}
                        </div>
                        <div className="text-[8px] font-mono font-bold text-indigo-900">
                          {st.studentId}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Modal Actions (Screen only) */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800 no-print">
              <span className="text-xs text-slate-400">
                Sedia untuk dicetak: <strong className="text-white">{batchPrintStudents.length}</strong> pelajar ({batchPrintCategory === 'ALL' ? 'Semua Kategori' : `Seksyen ${batchPrintCategory}`})
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsBatchPrintOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak {batchPrintStudents.length} Kad ID Sekarang</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD STUDENT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Tambah Pelajar Baharu</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300">No. Pelajar (Unique ID) *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: PDA-2502-120"
                  value={newStudentId}
                  onChange={(e) => setNewStudentId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Nama Penuh Pelajar *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: MUHAMMAD HARITH BIN KAMARUL"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Seksyen Kelas *</label>
                  <select
                    value={newSet}
                    onChange={(e) => setNewSet(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="DIA_4A">DIA_4A</option>
                    <option value="DIA_4B">DIA_4B</option>
                    <option value="DIA_4C">DIA_4C</option>
                    <option value="DIA_4D">DIA_4D</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">No. Telefon</label>
                  <input
                    type="text"
                    placeholder="Contoh: 60123456789"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">E-mel Rasmi (Tak Wajib)</label>
                <input
                  type="email"
                  placeholder="Contoh: harith@bpenawar.kpm.edu.my"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  Simpan Pelajar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
