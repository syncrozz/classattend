import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Student,
  AttendanceRecord,
  AttendanceSession,
  Subject,
  ScanResult,
  Lecturer,
  TeachingAssignment
} from '../types';
import {
  getClassBadgeColor,
  getInitials,
  getStudentColor
} from '../utils/studentUtils';
import {
  exportStudentsToCSV,
  exportLecturersToCSV,
  generateLecturerTemplateCSV,
  downloadCSV
} from '../utils/csvHelper';
import {
  generateWhatsAppWarningLink,
  formatWhatsAppPhone
} from '../utils/whatsappHelper';
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
  GraduationCap,
  UserCheck,
  Users,
  Shield,
  ShieldCheck,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  Filter,
  Lock,
  Sparkles,
  RefreshCw,
  Clock,
  Check,
  AlertCircle,
  BookOpen,
  Layers,
  ExternalLink
} from 'lucide-react';
import { attendanceEngine } from '../services/attendanceEngine';
import { soundService } from '../services/soundService';
import { GenerateLecturerQRModal } from './GenerateLecturerQRModal';
import { LecturerSelfRegistrationModal } from './LecturerSelfRegistrationModal';

interface StudentDirectoryViewProps {
  students: Student[];
  sessions: AttendanceSession[];
  subjects?: Subject[];
  lecturers?: Lecturer[];
  teachingAssignments?: TeachingAssignment[];
  activeLecturer?: Lecturer | null;
  attendanceRecords: AttendanceRecord[];
  isAdmin: boolean;
  onAddStudent: (student: Student) => void;
  onDeleteStudent: (studentId: string) => void;
  onAddLecturer?: (lecturer: Lecturer) => void;
  onDeleteLecturer?: (lecturerId: string) => void;
  onSaveLecturers?: (lecturers: Lecturer[]) => void;
  onSelectActiveLecturer?: (lecturer: Lecturer) => void;
  onOpenCSVImport: () => void;
  onOpenLecturerCSVImport?: () => void;
  onRequestAdminAccess: (actionName?: string) => void;
  onQuickSimulateScan: (studentId: string) => ScanResult;
}

export const StaffDirectoryView: React.FC<StudentDirectoryViewProps> = ({
  students,
  sessions,
  subjects = [],
  lecturers = [],
  teachingAssignments = [],
  activeLecturer,
  attendanceRecords,
  isAdmin,
  onAddStudent,
  onDeleteStudent,
  onAddLecturer,
  onDeleteLecturer,
  onSelectActiveLecturer,
  onOpenCSVImport,
  onOpenLecturerCSVImport,
  onRequestAdminAccess,
  onQuickSimulateScan
}) => {
  const [activeMainTab, setActiveMainTab] = useState<'STUDENTS' | 'LECTURERS'>('STUDENTS');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSet, setSelectedSet] = useState<string>('ALL');

  // Lecturer view states
  const [lecturerSearch, setLecturerSearch] = useState<string>('');
  const [showPins, setShowPins] = useState<Record<string, boolean>>({});
  const [isAddLecturerOpen, setIsAddLecturerOpen] = useState<boolean>(false);
  const [isGenerateQRModalOpen, setIsGenerateQRModalOpen] = useState<boolean>(false);
  const [isSelfRegModalOpen, setIsSelfRegModalOpen] = useState<boolean>(false);
  const [approvalActionLoading, setApprovalActionLoading] = useState<string | null>(null);
  const [approvalMessage, setApprovalMessage] = useState<string | null>(null);

  // New Lecturer Form State
  const [lecName, setLecName] = useState('');
  const [lecEmail, setLecEmail] = useState('');
  const [lecIC, setLecIC] = useState('');
  const [lecDepartment, setLecDepartment] = useState('Perakaunan');
  const [lecSections, setLecSections] = useState('DIA_4A, DIA_4B');
  const [lecSubjects, setLecSubjects] = useState('ACC 2103 - Perakaunan Kewangan 2');
  const [lecRole, setLecRole] = useState<'LECTURER' | 'ADMIN'>('LECTURER');

  // Modal States
  const [selectedStudentForQR, setSelectedStudentForQR] = useState<Student | null>(null);
  const [isBatchPrintOpen, setIsBatchPrintOpen] = useState<boolean>(false);
  const [batchPrintCategory, setBatchPrintCategory] = useState<string>('ALL');
  const [batchPrintFormat, setBatchPrintFormat] = useState<'CARDS' | 'LABELS' | 'LABELS_4'>('LABELS_4');
  const [isCleaningRedundant, setIsCleaningRedundant] = useState<boolean>(false);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);

  const handleCleanRedundantData = async () => {
    if (!isAdmin && (!activeLecturer || activeLecturer.role !== 'ADMIN')) {
      onRequestAdminAccess('Bersihkan Rekod Redundant Pelajar');
      return;
    }

    if (!window.confirm('Adakah anda pasti untuk mengimbas dan membersihkan sebarang rekod pelajar bertindih / redundant dalam pangkalan data?')) {
      return;
    }

    setIsCleaningRedundant(true);
    try {
      const result = await attendanceEngine.cleanupRedundantStudents();
      soundService.playSuccess();
      if (result.removedCount > 0) {
        setCleanupMessage(`Berjaya membersihkan ${result.removedCount} rekod bertindih. Jumlah pelajar terkini: ${result.finalCount} orang.`);
      } else {
        setCleanupMessage(`Tiada rekod bertindih ditemui. Pangkalan data bersih dengan ${result.finalCount} pelajar.`);
      }
      setTimeout(() => setCleanupMessage(null), 6000);
    } catch (err) {
      soundService.playError();
      setCleanupMessage('Ralat semasa membersihkan data bertindih.');
      setTimeout(() => setCleanupMessage(null), 4000);
    } finally {
      setIsCleaningRedundant(false);
    }
  };

  // Dynamically extract all available classes including standard cohorts
  const DEFAULT_CLASSES = ['DIA_3A', 'DIA_3B', 'DIA_3C', 'DIA_3D', 'DIA_4A', 'DIA_4B', 'DIA_4C', 'DIA_4D'];
  const uniqueClasses = Array.from(
    new Set([...DEFAULT_CLASSES, ...students.map((s) => s.className).filter(Boolean)])
  ).sort();
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

  // Filter lecturers
  const filteredLecturers = lecturers.filter((l) => {
    const q = lecturerSearch.toLowerCase();
    const sectionsStr = (l.assignedSections || l.assignedClasses || []).join(' ').toLowerCase();
    const subjectsStr = (l.assignedSubjects || []).join(' ').toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      (l.icNumber || '').includes(q) ||
      (l.department || '').toLowerCase().includes(q) ||
      sectionsStr.includes(q) ||
      subjectsStr.includes(q)
    );
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

  const handleExportCSV = () => {
    if (!isAdmin && !activeLecturer) {
      onRequestAdminAccess('Eksport Data Senarai Pelajar (CSV)');
      return;
    }
    const csvContent = exportStudentsToCSV(filteredStudents);
    const filename = `Senarai_Pelajar_${selectedSet}_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csvContent, filename);
    soundService.playClick();
  };

  const handleExportLecturersCSV = () => {
    if (!isAdmin && !activeLecturer) {
      onRequestAdminAccess('Eksport Data Direktori Pensyarah (CSV)');
      return;
    }
    const csvContent = exportLecturersToCSV(lecturers);
    const filename = `Senarai_Pensyarah_KPM_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csvContent, filename);
    soundService.playClick();
  };

  const handleDownloadLecturerTemplate = () => {
    const template = generateLecturerTemplateCSV();
    downloadCSV(template, 'Templat_Senarai_Pensyarah_KPM.csv');
    soundService.playClick();
  };

  const toggleShowPin = (lecId: string) => {
    if (!isAdmin) {
      onRequestAdminAccess('Melihat PIN Keselamatan & No. IC Pensyarah');
      return;
    }
    setShowPins((prev) => ({ ...prev, [lecId]: !prev[lecId] }));
  };

  const handleApproveLecturer = async (lecId: string, lecName: string) => {
    if (!isAdmin && (!activeLecturer || activeLecturer.role !== 'ADMIN')) {
      onRequestAdminAccess('Akses Admin Diperlukan untuk Meluluskan Pendaftaran Pensyarah');
      return;
    }

    setApprovalActionLoading(lecId);
    try {
      const res = await attendanceEngine.approveLecturer(lecId, activeLecturer?.name || 'Pentadbir');
      if (res.success) {
        soundService.playSuccess();
        setApprovalMessage(`Pensyarah ${lecName} telah berjaya diluluskan dan diaktifkan.`);
        setTimeout(() => setApprovalMessage(null), 5000);
      }
    } catch (err: any) {
      soundService.playError();
      setApprovalMessage(`Ralat semasa meluluskan pensyarah: ${err.message || 'Sila cuba lagi'}`);
      setTimeout(() => setApprovalMessage(null), 4000);
    } finally {
      setApprovalActionLoading(null);
    }
  };

  const handleRejectLecturer = async (lecId: string, lecName: string) => {
    if (!isAdmin && (!activeLecturer || activeLecturer.role !== 'ADMIN')) {
      onRequestAdminAccess('Akses Admin Diperlukan untuk Menolak Pendaftaran Pensyarah');
      return;
    }

    if (!window.confirm(`Adakah anda pasti untuk menolak permohonan pendaftaran pensyarah ${lecName}?`)) {
      return;
    }

    setApprovalActionLoading(lecId);
    try {
      const res = await attendanceEngine.rejectLecturer(lecId, activeLecturer?.name || 'Pentadbir');
      if (res.success) {
        soundService.playSuccess();
        setApprovalMessage(`Permohonan pensyarah ${lecName} telah ditolak.`);
        setTimeout(() => setApprovalMessage(null), 5000);
      }
    } catch (err: any) {
      soundService.playError();
      setApprovalMessage(`Ralat semasa menolak pensyarah: ${err.message || 'Sila cuba lagi'}`);
      setTimeout(() => setApprovalMessage(null), 4000);
    } finally {
      setApprovalActionLoading(null);
    }
  };

  const handleCreateLecturer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lecName || !lecEmail || !lecIC) {
      alert('Sila lengkapkan Nama, Emel KPM, dan No. IC');
      return;
    }

    const cleanEmail = lecEmail.trim().toLowerCase();
    if (!cleanEmail.endsWith('@bpenawar.kpm.edu.my')) {
      alert('Emel mestilah menggunakan domain rasmi kolej: @bpenawar.kpm.edu.my');
      return;
    }

    const numericIC = lecIC.replace(/[^0-9]/g, '');
    if (numericIC.length < 4) {
      alert('Sila masukkan No. IC yang sah (sekurang-kurangnya 4 digit).');
      return;
    }

    const sections = lecSections
      .split(/[,;|]/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0);

    const subs = lecSubjects
      .split(/[,;|]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const newLecturer: Lecturer = {
      id: `LEC-${Date.now()}`,
      name: lecName.trim().toUpperCase(),
      email: cleanEmail,
      icNumber: lecIC.trim(),
      pin: numericIC.slice(-4),
      department: lecDepartment,
      assignedSections: sections.length > 0 ? sections : ['DIA_4A'],
      assignedClasses: sections.length > 0 ? sections : ['DIA_4A'],
      assignedSubjects: subs.length > 0 ? subs : ['MPU 2163 - Pengajian Malaysia 2'],
      role: lecRole
    };

    if (onAddLecturer) {
      onAddLecturer(newLecturer);
    }
    setIsAddLecturerOpen(false);
    setLecName('');
    setLecEmail('');
    setLecIC('');
    soundService.playSuccess();
  };

  const isAnyPrintModalOpen = Boolean(selectedStudentForQR || isBatchPrintOpen);

  return (
    <div className="space-y-6">
      {/* Main Directory Screen Content (Hidden during modal print) */}
      <div className={`space-y-6 ${isAnyPrintModalOpen ? 'no-print' : ''}`}>
        {/* Top Header & Main Tab Switcher */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-white tracking-tight">Pangkalan Data</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                  KPM Bandar Penawar
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Padanan Emel + No. IC Pensyarah untuk kebenaran pengubahsuaian data pelajar, pendaftaran kelas, dan cipta Kod QR.
              </p>
            </div>

            {/* Main Tabs: Pelajar vs Pensyarah */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setActiveMainTab('STUDENTS');
                  soundService.playClick();
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeMainTab === 'STUDENTS'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Direktori Pelajar ({students.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveMainTab('LECTURERS');
                  soundService.playClick();
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeMainTab === 'LECTURERS'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Senarai Pensyarah ({lecturers.length})</span>
              </button>
            </div>
          </div>

          {/* Sub-header Controls: STUDENTS TAB */}
          {activeMainTab === 'STUDENTS' && (
            <div className="space-y-3.5 pt-3 border-t border-slate-800/80">
              {/* Row 1: Search Box and Primary Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Search Box */}
                <div className="relative w-full sm:w-80 lg:w-96">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Cari nama, No. Pelajar, e-mel..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                {/* Actions for Students */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    id="btn-import-csv"
                    onClick={() => {
                      if (!activeLecturer) {
                        onRequestAdminAccess('Import Fail CSV Pelajar');
                      } else {
                        onOpenCSVImport();
                      }
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import CSV Pelajar</span>
                  </button>

                  <button
                    id="btn-export-csv"
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                    title={!isAdmin && !activeLecturer ? 'Perlu pengesahan Pensyarah/Admin untuk eksport CSV' : 'Eksport senarai pelajar ke fail CSV'}
                  >
                    {!isAdmin && !activeLecturer ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Download className="w-3.5 h-3.5" />}
                    <span>Eksport CSV</span>
                  </button>

                  <button
                    id="btn-batch-print-qr"
                    onClick={() => {
                      setBatchPrintCategory(selectedSet);
                      setIsBatchPrintOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
                    title="Cetak Kad ID / Kod QR mengikut Kategori Kelas atau Semua Pelajar"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak Kad ID (QR)</span>
                  </button>

                  {(isAdmin || (activeLecturer && activeLecturer.role === 'ADMIN')) && (
                    <button
                      id="btn-clean-redundant-students"
                      onClick={handleCleanRedundantData}
                      disabled={isCleaningRedundant}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer shadow-sm disabled:opacity-50"
                      title="Imbas dan bersihkan rekod bertindih / redundant pelajar (Hanya Admin)"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isCleaningRedundant ? 'animate-spin text-amber-400' : 'text-amber-400'}`} />
                      <span>{isCleaningRedundant ? 'Sedang Bersihkan...' : 'Bersihkan Redundant'}</span>
                    </button>
                  )}
                </div>
              </div>

              {cleanupMessage && (
                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 text-xs flex items-center justify-between gap-2 animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{cleanupMessage}</span>
                  </div>
                  <button
                    onClick={() => setCleanupMessage(null)}
                    className="text-slate-400 hover:text-white p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Row 2: Dedicated Class Filter Tabs */}
              <div className="flex items-center gap-2 pt-1 overflow-x-auto w-full pb-1 no-scrollbar">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                  <Filter className="w-3 h-3 text-indigo-400" />
                  Kelas:
                </span>
                {sets.map((setName, setIdx) => {
                  const count = setName === 'ALL' ? students.length : students.filter((s) => s.className === setName).length;
                  return (
                    <button
                      key={`set-tab-${setName}-${setIdx}`}
                      onClick={() => setSelectedSet(setName)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                        selectedSet === setName
                          ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20'
                          : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800'
                      }`}
                    >
                      <span>{setName === 'ALL' ? 'Semua Pelajar' : `Kelas ${setName}`}</span>
                      <span className="ml-1.5 text-[10px] opacity-80">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sub-header Controls: LECTURERS TAB */}
          {activeMainTab === 'LECTURERS' && (
            <div className="space-y-3.5 pt-3 border-t border-slate-800/80">
              {/* Row 1: Search Box and Primary Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Search Box */}
                <div className="relative w-full sm:w-80 lg:w-96">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Cari nama pensyarah, e-mel @bpenawar, No IC, subjek..."
                    value={lecturerSearch}
                    onChange={(e) => setLecturerSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                {/* Actions for Lecturers */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    id="btn-generate-lecturer-qr"
                    type="button"
                    onClick={() => setIsGenerateQRModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all cursor-pointer ring-1 ring-emerald-400/40"
                    title="Jana Kod QR Pendaftaran Kendiri Pensyarah"
                  >
                    <QrCode className="w-3.5 h-3.5 text-emerald-200" />
                    <span>1. Jana QR Pendaftaran Pensyarah</span>
                  </button>

                  <button
                    id="btn-test-lecturer-self-reg"
                    type="button"
                    onClick={() => setIsSelfRegModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-950/80 hover:bg-teal-900/90 text-teal-300 border border-teal-600/50 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                    title="Buka Borang Pendaftaran Kendiri Pensyarah untuk percubaan"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>2. Uji Borang Pendaftaran</span>
                  </button>

                  <button
                    id="btn-manual-add-lecturer"
                    type="button"
                    onClick={() => {
                      if (!activeLecturer) {
                        onRequestAdminAccess('Daftar Pensyarah Baharu');
                      } else {
                        setIsAddLecturerOpen(true);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                    title="Tambah pensyarah secara manual"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                    <span>3. Tambah Manual</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadLecturerTemplate}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                    title="Muat turun templat fail CSV pensyarah rasmi"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Template CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!isAdmin && (!activeLecturer || activeLecturer.role !== 'ADMIN')) {
                        onRequestAdminAccess('Akses Admin Diperlukan untuk Memuat Naik CSV Pensyarah');
                        return;
                      }
                      if (onOpenLecturerCSVImport) {
                        onOpenLecturerCSVImport();
                      } else {
                        onOpenCSVImport();
                      }
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                    title="Import fail CSV senarai pensyarah"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Import CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportLecturersCSV}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                    title={!isAdmin && !activeLecturer ? 'Perlu pengesahan Pensyarah/Admin untuk eksport CSV' : 'Eksport senarai direktori pensyarah ke fail CSV'}
                  >
                    {!isAdmin && !activeLecturer ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Download className="w-3.5 h-3.5" />}
                    <span>Eksport CSV</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Info Banner */}
              <div className="flex items-center gap-2 pt-1 text-xs text-slate-400 bg-slate-950/50 px-3.5 py-2 rounded-xl border border-slate-800/60">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-[11px] leading-relaxed text-slate-300">
                  <strong className="text-white">Padanan Akses Pensyarah:</strong> Isikan e-mel rasmi (<code className="text-emerald-300 font-mono">@bpenawar.kpm.edu.my</code>) &amp; No. Kad Pengenalan / PIN dalam templat CSV untuk kebenaran log masuk dan capaian Pentadbir.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ===================== VIEW 1: STUDENTS GRID ===================== */}
        {activeMainTab === 'STUDENTS' && (
          <div>
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
                      <div className="flex items-start justify-between gap-2.5 min-w-0">
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <div
                            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getStudentColor(
                              student.name
                            )} flex items-center justify-center font-bold text-white text-xs shadow-md shrink-0`}
                          >
                            {getInitials(student.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4
                              className="font-bold text-xs sm:text-sm text-white line-clamp-2 leading-snug break-words"
                              title={student.name}
                            >
                              {student.name}
                            </h4>
                            <p className="text-[11px] font-mono text-indigo-400 font-semibold truncate mt-0.5">{student.studentId}</p>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${getClassBadgeColor(
                            student.className
                          )}`}
                        >
                          {student.className}
                        </span>
                      </div>

                      {/* Contact details */}
                      <div className="space-y-1 text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60 font-mono">
                        <div className="flex items-center gap-2 truncate">
                          <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="truncate">{student.email || `${student.studentId.toLowerCase()}@bpenawar.kpm.edu.my`}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 truncate">
                            <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="truncate">{student.phone || 'Tiada telefon'}</span>
                          </div>
                          {student.phone && (
                            <a
                              href={generateWhatsAppWarningLink({
                                student,
                                className: student.className,
                                presentCount: stats.present,
                                totalSessions: stats.total,
                                rate: stats.rate
                              })}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold transition-all shrink-0 cursor-pointer"
                              title={`Buka WhatsApp untuk hubungi ${student.name}`}
                            >
                              <span>WA</span>
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Attendance stats */}
                      <div className="pt-1 flex items-center justify-between text-xs">
                        <span className="text-slate-400 text-[11px]">Kehadiran:</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                stats.rate >= 80 ? 'bg-emerald-500' : stats.rate >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${stats.rate}%` }}
                            />
                          </div>
                          <span
                            className={`font-bold font-mono text-[11px] ${
                              stats.rate >= 80 ? 'text-emerald-400' : stats.rate >= 60 ? 'text-amber-400' : 'text-rose-400'
                            }`}
                          >
                            {stats.rate}%
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedStudentForQR(student)}
                          className="flex-1 py-1.5 px-3 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Kad QR Pelajar</span>
                        </button>

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Adakah anda pasti untuk memadam rekod pelajar ${student.name}?`)) {
                                onDeleteStudent(student.id);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
                            title="Padam Pelajar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================== VIEW 2: LECTURERS GRID ===================== */}
        {activeMainTab === 'LECTURERS' && (
          <div className="space-y-5">
            {/* Approval Notification Toast */}
            {approvalMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between gap-2 shadow-lg animate-fadeIn">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{approvalMessage}</span>
                </div>
                <button
                  onClick={() => setApprovalMessage(null)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* PENDING APPROVALS SECTION */}
            {(() => {
              const pendingLecturers = lecturers.filter((l) => l.status === 'PENDING');
              if (pendingLecturers.length === 0) return null;

              return (
                <div
                  id="pending-lecturers-approval-section"
                  className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/60 via-slate-900 to-amber-950/40 border-2 border-amber-500/60 shadow-xl space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/30 pb-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        <Clock className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm sm:text-base text-white">
                            Permohonan Pendaftaran Kendiri Pensyarah
                          </h3>
                          <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-extrabold text-[11px]">
                            {pendingLecturers.length} Menunggu Kelulusan
                          </span>
                        </div>
                        <p className="text-xs text-amber-200/80 mt-0.5">
                          Pensyarah ini telah mendaftar melalui imbasan QR dan memilih subjek/kelas mereka. Sila semak dan luluskan untuk mengaktifkan akses.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {pendingLecturers.map((lec) => {
                      const lecAssignments = teachingAssignments.filter((ta) => ta.lecturerId === lec.id);
                      const isLoading = approvalActionLoading === lec.id;

                      // Group assignments by subject
                      const groupedBySubject = lecAssignments.reduce((acc, ta) => {
                        if (!acc[ta.subjectCode]) {
                          acc[ta.subjectCode] = {
                            subjectName: ta.subjectName,
                            classes: []
                          };
                        }
                        acc[ta.subjectCode].classes.push(ta.className);
                        return acc;
                      }, {} as Record<string, { subjectName: string; classes: string[] }>);

                      return (
                        <div
                          key={`pending-${lec.id}`}
                          className="p-4 rounded-xl bg-slate-950/90 border border-amber-500/40 space-y-3 shadow-md"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-xs border border-amber-500/30">
                                {getInitials(lec.name)}
                              </div>
                              <div>
                                <h4 className="font-bold text-xs sm:text-sm text-white uppercase">
                                  {lec.name}
                                </h4>
                                <p className="text-[11px] text-slate-400">
                                  {lec.department || 'Jabatan Pengajian'}
                                </p>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold uppercase">
                              PENDING
                            </span>
                          </div>

                          {/* Details */}
                          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 font-mono">
                            <div className="truncate">
                              <span className="text-[10px] text-slate-500 block">Emel Rasmi:</span>
                              <span className="text-emerald-300 font-semibold truncate block">{lec.email}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 block">No. IC / PIN:</span>
                              <span className="text-amber-300 font-semibold">{lec.icNumber || '-'} (PIN: {lec.pin || '****'})</span>
                            </div>
                            {lec.phone && (
                              <div className="col-span-2">
                                <span className="text-[10px] text-slate-500 block">Telefon:</span>
                                <span className="text-slate-300">{lec.phone}</span>
                              </div>
                            )}
                          </div>

                          {/* Selected Teaching Assignments */}
                          <div className="space-y-1.5 text-xs">
                            <span className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                              <span>Pilihan Penugasan Subjek & Kelas:</span>
                              <span className="text-teal-400 text-[10px]">
                                {lecAssignments.length} Teaching Assignments
                              </span>
                            </span>
                            
                            {Object.keys(groupedBySubject).length > 0 ? (
                              <div className="space-y-1">
                                {(Object.entries(groupedBySubject) as [string, { subjectName: string; classes: string[] }][]).map(([subCode, data]) => (
                                  <div
                                    key={subCode}
                                    className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] space-y-1"
                                  >
                                    <div className="flex items-center space-x-1.5 text-teal-300 font-bold">
                                      <BookOpen className="w-3 h-3 text-teal-400 shrink-0" />
                                      <span>{subCode}</span>
                                      <span className="text-slate-400 font-normal text-[10px] truncate max-w-[160px] sm:max-w-[200px]">
                                        ({data.subjectName})
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1 pl-4">
                                      {data.classes.map((cls) => (
                                        <span
                                          key={cls}
                                          className="px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-bold"
                                        >
                                          {cls}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-[11px] text-slate-400 italic">
                                Subjek: {(lec.assignedSubjects || []).join(', ') || 'Tiada subjek'} | Kelas: {(lec.assignedSections || []).join(', ') || '-'}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() => handleRejectLecturer(lec.id, lec.name)}
                              className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-600/40 text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Tolak</span>
                            </button>
                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() => handleApproveLecturer(lec.id, lec.name)}
                              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                            >
                              {isLoading ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  <span>Memproses...</span>
                                </>
                              ) : (
                                <>
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  <span>Luluskan & Aktifkan</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* MAIN LECTURERS DIRECTORY */}
            {filteredLecturers.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/60 rounded-2xl border border-slate-800 p-8 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">Tiada Rekod Pensyarah Ditemui</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Anda boleh menjana QR Pendaftaran Pensyarah untuk membenarkan pensyarah mendaftar sendiri, atau mendaftar pensyarah secara manual.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsGenerateQRModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Jana QR Pendaftaran Pensyarah</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!activeLecturer) {
                        onRequestAdminAccess('Daftar Pensyarah Baharu');
                      } else {
                        setIsAddLecturerOpen(true);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Daftar Manual</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                {filteredLecturers.map((lec) => {
                  const isCurrentActive = activeLecturer?.email.toLowerCase() === lec.email.toLowerCase();
                  const isPinVisible = showPins[lec.id];
                  const pinToDisplay = lec.pin || (lec.icNumber ? lec.icNumber.replace(/[^0-9]/g, '').slice(-4) : '****');
                  const lecAssignments = teachingAssignments.filter((ta) => ta.lecturerId === lec.id);
                  const isPending = lec.status === 'PENDING';
                  const isRejected = lec.status === 'REJECTED';

                  // Group teaching assignments by subject
                  const groupedAssignments = lecAssignments.reduce((acc, ta) => {
                    if (!acc[ta.subjectCode]) {
                      acc[ta.subjectCode] = {
                        subjectName: ta.subjectName,
                        classes: []
                      };
                    }
                    acc[ta.subjectCode].classes.push(ta.className);
                    return acc;
                  }, {} as Record<string, { subjectName: string; classes: string[] }>);

                  return (
                    <div
                      key={lec.id}
                      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 shadow-lg ${
                        isCurrentActive
                          ? 'bg-emerald-950/40 border-emerald-500/60 shadow-emerald-950/40 ring-1 ring-emerald-500/40'
                          : isPending
                          ? 'bg-slate-900/90 border-amber-500/50'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 min-w-0">
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white text-sm shadow-md shrink-0 ${
                              isCurrentActive
                                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 ring-2 ring-emerald-400/50'
                                : isPending
                                ? 'bg-gradient-to-br from-amber-500 to-amber-700'
                                : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                            }`}
                          >
                            {getInitials(lec.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-sm text-white line-clamp-2 leading-snug break-words" title={lec.name}>
                                {lec.name}
                              </h4>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                                  lec.role === 'ADMIN'
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                    : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                                }`}
                              >
                                {lec.role || 'LECTURER'}
                              </span>

                              {/* Status Badge */}
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                                  isPending
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                    : isRejected
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                }`}
                              >
                                {lec.status || 'ACTIVE'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 truncate mt-0.5">{lec.department || 'Jabatan Pengajian'}</p>
                          </div>
                        </div>

                        {isCurrentActive && (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1 shrink-0">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Sesi Aktif</span>
                          </span>
                        )}
                      </div>

                      {/* Credentials Combination Box */}
                      <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800/80 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-indigo-400" />
                            <span>E-mel Rasmi KPM:</span>
                          </span>
                          <span className="font-mono text-emerald-300 font-semibold">{lec.email}</span>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-800/60 pt-1.5">
                          <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            <Key className="w-3.5 h-3.5 text-amber-400" />
                            <span>No. IC & PIN (4 Digit):</span>
                          </span>
                          {isAdmin ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-amber-300">
                                {isPinVisible ? `${lec.icNumber} (PIN: ${pinToDisplay})` : `******-**-${pinToDisplay}`}
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleShowPin(lec.id)}
                                className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                                title="Papar/Sembunyi No IC Penuh"
                              >
                                {isPinVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-slate-500 tracking-wider text-xs">
                                ••••••••••••
                              </span>
                              <button
                                type="button"
                                onClick={() => onRequestAdminAccess('Melihat PIN Keselamatan Pensyarah')}
                                className="text-[10px] text-amber-400/90 hover:text-amber-300 px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 flex items-center gap-1 cursor-pointer transition-colors"
                                title="Buka Mod Admin untuk melihat maklumat PIN"
                              >
                                <Shield className="w-3 h-3 text-amber-400" />
                                <span>Mod Admin Sahaja</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Assigned Teaching Assignments & Classes */}
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-400">Penugasan Pengajaran (Subjek & Kelas):</span>
                          <span className="text-[10px] text-teal-400 font-mono">
                            {lecAssignments.length > 0 ? `${lecAssignments.length} Assignments` : ''}
                          </span>
                        </div>

                        {Object.keys(groupedAssignments).length > 0 ? (
                          <div className="space-y-1.5">
                            {(Object.entries(groupedAssignments) as [string, { subjectName: string; classes: string[] }][]).map(([subCode, data]) => (
                              <div
                                key={subCode}
                                className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] space-y-1"
                              >
                                <div className="flex items-center space-x-1.5 text-teal-300 font-bold">
                                  <BookOpen className="w-3 h-3 text-teal-400 shrink-0" />
                                  <span>{subCode}</span>
                                  <span className="text-slate-400 font-normal text-[10px] truncate max-w-[180px]">
                                    ({data.subjectName})
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1 pl-4">
                                  {data.classes.map((cls) => (
                                    <span
                                      key={cls}
                                      className="px-1.5 py-0.5 rounded bg-indigo-950/70 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-bold"
                                    >
                                      {cls}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div>
                              <span className="text-[10px] text-slate-500">Kelas:</span>
                              <div className="flex flex-wrap gap-1.5 mt-0.5">
                                {Array.from(new Set<string>(lec.assignedSections || lec.assignedClasses || [])).map((sec, secIdx) => (
                                  <span
                                    key={`lec-${lec.id}-sec-${sec}-${secIdx}`}
                                    className="px-2 py-0.5 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-[11px] font-mono font-bold"
                                  >
                                    {sec}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div>
                              <span className="text-[10px] text-slate-500">Subjek:</span>
                              <div className="text-[11px] text-slate-300 mt-0.5 font-medium">
                                {(lec.assignedSubjects || []).join(', ') || 'Tiada subjek khusus'}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Lecturer Actions & Status */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        {isPending ? (
                          <button
                            type="button"
                            onClick={() => handleApproveLecturer(lec.id, lec.name)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Luluskan Pendaftaran</span>
                          </button>
                        ) : isCurrentActive ? (
                          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                            <ShieldCheck className="w-4 h-4" />
                            <span>Pensyarah Aktif Bertugas</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                            <Shield className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-slate-400">Pensyarah Berdaftar KPM</span>
                          </div>
                        )}

                        {isAdmin && onDeleteLecturer && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Padam pensyarah ${lec.name} daripada senarai master?`)) {
                                onDeleteLecturer(lec.id);
                              }
                            }}
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
                            title="Padam Pensyarah (Mod Admin)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===================== MODAL: TAMBAH PENSYARAH ===================== */}
      {isAddLecturerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-xl">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Daftar Pensyarah Baharu</h3>
                  <p className="text-[11px] text-slate-400">Padanan identiti Emel & No. Kad Pengenalan</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddLecturerOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLecturer} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300">Nama Penuh Pensyarah *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: EN. MOHD SHAH BIN ISMAIL"
                  value={lecName}
                  onChange={(e) => setLecName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">E-mel Rasmi Kolej (@bpenawar.kpm.edu.my) *</label>
                <input
                  type="email"
                  required
                  placeholder="Contoh: shah.ismail@bpenawar.kpm.edu.my"
                  value={lecEmail}
                  onChange={(e) => setLecEmail(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">No. Kad Pengenalan * (PIN = 4 Digit Terakhir)</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 850412-01-5678"
                  value={lecIC}
                  onChange={(e) => setLecIC(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  PIN 4-digit keselamatan akan diambil secara automatik daripada 4 digit terakhir No. IC.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Jabatan</label>
                  <select
                    value={lecDepartment}
                    onChange={(e) => setLecDepartment(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="Sains Kuantitatif">Sains Kuantitatif</option>
                    <option value="Pengurusan Perniagaan">Pengurusan Perniagaan</option>
                    <option value="Perakaunan">Perakaunan</option>
                    <option value="Pengajian Am">Pengajian Am</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Peranan</label>
                  <select
                    value={lecRole}
                    onChange={(e) => setLecRole(e.target.value as any)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="LECTURER">Pensyarah</option>
                    <option value="ADMIN">Pentadbir (Admin)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Subjek Kursus</label>
                <input
                  type="text"
                  placeholder="Contoh: ACC 2103 - Perakaunan Kewangan 2"
                  value={lecSubjects}
                  onChange={(e) => setLecSubjects(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddLecturerOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Pensyarah</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: KAD QR PELAJAR INDIVIDU ===================== */}
      {selectedStudentForQR && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 print-container">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 no-print">
              <h3 className="font-bold text-sm text-slate-200">Kad Pengenalan & Kod QR Pelajar</h3>
              <button
                onClick={() => setSelectedStudentForQR(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Card Area - Strict 9:16 Aspect Ratio */}
            <div className="bg-white text-slate-950 p-5 rounded-2xl shadow-inner border-2 border-indigo-600 flex flex-col items-center justify-between text-center aspect-[9/16] w-full max-w-[280px] mx-auto printable-id-card">
              <div className="text-center w-full pt-1">
                <p className="text-[10px] font-bold tracking-widest text-indigo-700 uppercase">KPM BANDAR PENAWAR</p>
                <h4 className="font-extrabold text-sm tracking-tight text-slate-900">KAD KEHADIRAN KELAS</h4>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm my-auto">
                <QRCodeSVG
                  value={`STUDENT|${selectedStudentForQR.studentId}`}
                  size={150}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <div className="text-center space-y-1 w-full pb-1">
                <h3 className="font-black text-sm text-slate-900 leading-tight line-clamp-2">{selectedStudentForQR.name}</h3>
                <p className="text-xs font-mono font-bold text-indigo-700">{selectedStudentForQR.studentId}</p>
                <span className="inline-block px-2.5 py-0.5 bg-slate-100 rounded-md text-[10px] font-bold text-slate-700 border border-slate-200">
                  {selectedStudentForQR.className} - DIPLOMA PERAKAUNAN
                </span>
              </div>
            </div>

            {/* Print Action */}
            <div className="flex items-center justify-center gap-2 pt-2 no-print">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Kad Ini</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: BATCH PRINT QR ===================== */}
      {isBatchPrintOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 print-container overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-4 text-white my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 no-print">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <Printer className="w-5 h-5 text-indigo-400" />
                  <span>Cetak Kelompok Kad ID / Kod QR Pelajar</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Menjana {batchPrintStudents.length} kad pelajar siap sedia untuk cetakan lembaran A4
                </p>
              </div>
              <button
                onClick={() => setIsBatchPrintOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Batch Filter & Print Format Selector */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs no-print">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-300">Pilih Kelas:</span>
                <select
                  value={batchPrintCategory}
                  onChange={(e) => setBatchPrintCategory(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                >
                  {sets.map((s, sIdx) => (
                    <option key={`batch-print-set-${s}-${sIdx}`} value={s}>
                      {s === 'ALL' ? 'Semua Kelas' : s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-300">Format Lembaran:</span>
                <select
                  value={batchPrintFormat}
                  onChange={(e) => setBatchPrintFormat(e.target.value as any)}
                  className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                >
                  <option value="LABELS_4">Grid 4 Kad per Halaman (A4)</option>
                  <option value="CARDS">Grid 6 Kad Kompak</option>
                </select>
              </div>

              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer ml-auto"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Lembaran ({batchPrintStudents.length} Pelajar)</span>
              </button>
            </div>

            {/* Printable Cards Grid - Strict 9:16 Aspect Ratio */}
            <div
              className={`grid ${
                batchPrintFormat === 'LABELS_4' ? 'grid-cols-2 md:grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'
              } gap-4 max-h-[65vh] overflow-y-auto p-3 bg-slate-950/60 rounded-2xl border border-slate-800 ${
                batchPrintFormat === 'LABELS_4' ? 'printable-batch-sheet-cards' : 'printable-batch-sheet-labels'
              }`}
            >
              {batchPrintStudents.map((student) => (
                <div
                  key={student.id}
                  className="bg-white text-slate-950 p-3.5 sm:p-4 rounded-xl border-2 border-indigo-600 flex flex-col items-center justify-between text-center shadow-sm aspect-[9/16] w-full max-w-[240px] mx-auto printable-batch-id-card box-border"
                >
                  <div className="text-center w-full pt-0.5">
                    <p className="text-[8.5px] font-bold tracking-widest text-indigo-700 uppercase">KPM BANDAR PENAWAR</p>
                    <h4 className="font-extrabold text-[11px] sm:text-xs tracking-tight text-slate-900">KAD KEHADIRAN KELAS</h4>
                  </div>

                  <div className="p-2 bg-white border border-slate-200 rounded-lg my-auto shadow-2xl qr-code-wrapper">
                    <QRCodeSVG
                      value={`STUDENT|${student.studentId}`}
                      size={batchPrintFormat === 'LABELS_4' ? 125 : 100}
                      level="H"
                      includeMargin={true}
                    />
                  </div>

                  <div className="w-full space-y-0.5 pb-0.5">
                    <h3 className="font-extrabold text-xs text-slate-900 leading-tight line-clamp-2" title={student.name}>{student.name}</h3>
                    <p className="text-[11px] font-mono font-bold text-indigo-700">{student.studentId}</p>
                    <span className="inline-block px-2 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-700 border border-slate-200">
                      Kelas {student.className}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: JANA QR PENDAFTARAN PENSYARAH ===================== */}
      <GenerateLecturerQRModal
        isOpen={isGenerateQRModalOpen}
        onClose={() => setIsGenerateQRModalOpen(false)}
        onOpenDirectRegistration={() => {
          setIsGenerateQRModalOpen(false);
          setIsSelfRegModalOpen(true);
        }}
      />

      {/* ===================== MODAL: BORANG PENDAFTARAN KENDIRI PENSYARAH ===================== */}
      <LecturerSelfRegistrationModal
        isOpen={isSelfRegModalOpen}
        onClose={() => setIsSelfRegModalOpen(false)}
        subjects={subjects}
      />
    </div>
  );
};
