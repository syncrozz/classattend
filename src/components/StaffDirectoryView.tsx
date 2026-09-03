import React, { useState, useMemo } from 'react';
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
  exportSubjectsToCSV,
  generateSubjectTemplateCSV,
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
  ExternalLink,
  MessageCircle
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
  onOpenSubjectCSVImport?: () => void;
  onAddSubject?: (subject: Subject) => void;
  onDeleteSubject?: (subjectId: string) => void;
  onResetSubjects?: () => void;
  onRequestAdminAccess: (actionName?: string) => void;
  onQuickSimulateScan: (studentId: string) => ScanResult;
  onUpdateLecturerAssignments?: (
    lecturerId: string,
    subjectAssignments: {
      subjectCode: string;
      subjectName: string;
      department?: string;
      classes: string[];
    }[]
  ) => Promise<{ success: boolean; message: string }>;
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
  onOpenSubjectCSVImport,
  onAddSubject,
  onDeleteSubject,
  onResetSubjects,
  onRequestAdminAccess,
  onQuickSimulateScan,
  onUpdateLecturerAssignments
}) => {
  const [activeMainTab, setActiveMainTab] = useState<'STUDENTS' | 'LECTURERS' | 'SUBJECTS'>('STUDENTS');
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

  // Admin Subject Assignment State
  const [selectedLecturerForSubjects, setSelectedLecturerForSubjects] = useState<Lecturer | null>(null);
  const [assignSubjectSearch, setAssignSubjectSearch] = useState<string>('');
  const [assignDeptFilter, setAssignDeptFilter] = useState<string>('ALL');
  const [selectedSubjectCodes, setSelectedSubjectCodes] = useState<string[]>([]);
  const [isSavingAssignments, setIsSavingAssignments] = useState<boolean>(false);

  // Subject view states
  const [subjectSearch, setSubjectSearch] = useState<string>('');
  const [selectedSubjectDepartment, setSelectedSubjectDepartment] = useState<string>('ALL');
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState<boolean>(false);
  const [subCode, setSubCode] = useState<string>('');
  const [subName, setSubName] = useState<string>('');
  const [subDepartment, setSubDepartment] = useState<string>('Jabatan Pengajian Am');
  const [subSections, setSubSections] = useState<string>('DIA_1A, DIA_1B, DIA_2A, DIA_2B');

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

  // Filter subjects (sorted alphabetically A-Z by code)
  const filteredSubjects = subjects
    .filter((sub) => {
      const q = subjectSearch.toLowerCase();
      const matchesDept = selectedSubjectDepartment === 'ALL' || sub.department === selectedSubjectDepartment;
      const matchesSearch =
        sub.code.toLowerCase().includes(q) ||
        sub.name.toLowerCase().includes(q) ||
        (sub.department || '').toLowerCase().includes(q) ||
        (sub.sections || []).join(' ').toLowerCase().includes(q);
      return matchesDept && matchesSearch;
    })
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));

  const SUBJECT_DEPARTMENTS = [
    'ALL',
    'Jabatan Pengajian Am',
    'Jabatan Perakaunan',
    'Jabatan Pengurusan Perniagaan',
    'Jabatan Teknologi Maklumat'
  ];

  // Calculate personal attendance rate
  const getStudentStats = (studentId: string, className: string) => {
    const applicableSessions = sessions.filter((s) => !s.className || s.className === className);
    const presentRecords = attendanceRecords.filter((r) => r.studentId === studentId && r.status === 'PRESENT');
    const hasSessions = applicableSessions.length > 0;
    const rate = hasSessions ? Math.round((presentRecords.length / applicableSessions.length) * 100) : 0;
    return {
      total: applicableSessions.length,
      present: presentRecords.length,
      rate,
      hasSessions
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

  const handleExportSubjectsCSV = () => {
    if (!isAdmin && !activeLecturer) {
      onRequestAdminAccess('Eksport Data Senarai Kursus / Subjek (CSV)');
      return;
    }
    const csvContent = exportSubjectsToCSV(filteredSubjects);
    const filename = `Senarai_Subjek_KPM_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csvContent, filename);
    soundService.playClick();
  };

  const handleDownloadSubjectTemplate = () => {
    const template = generateSubjectTemplateCSV();
    downloadCSV(template, 'Templat_Senarai_Kursus_KPM.csv');
    soundService.playClick();
  };

  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subCode || !subName) {
      alert('Sila lengkapkan Kod Kursus dan Nama Kursus');
      return;
    }
    const cleanCode = subCode.trim().toUpperCase();
    const cleanName = subName.trim().toUpperCase();
    const secList = subSections.split(/[,;|]/).map((s) => s.trim().toUpperCase()).filter((s) => s.length > 0);

    const newSub: Subject = {
      id: `SUB-${cleanCode.replace(/[^A-Z0-9]/g, '')}-${Date.now()}`,
      code: cleanCode,
      name: cleanName,
      department: subDepartment,
      sections: secList.length > 0 ? secList : ['DIA_1A', 'DIA_1B', 'DIA_2A', 'DIA_2B']
    };

    if (onAddSubject) {
      onAddSubject(newSub);
    }
    setIsAddSubjectOpen(false);
    setSubCode('');
    setSubName('');
    setSubSections('DIA_1A, DIA_1B, DIA_2A, DIA_2B');
    soundService.playSuccess();
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

  // Helper: Retrieve all assigned subjects for a specific lecturer
  const getAssignedSubjectsForLecturer = (lec: Lecturer) => {
    const codeMap = new Map<string, { code: string; name: string; department?: string; classes: string[] }>();
    const lecEmail = (lec.email || '').trim().toLowerCase();
    const lecId = (lec.id || '').trim().toLowerCase();
    const lecNameLower = (lec.name || '').trim().toLowerCase();

    // 1. From teachingAssignments
    teachingAssignments.forEach((ta) => {
      const matchId = ta.lecturerId && ta.lecturerId.toLowerCase() === lecId;
      const matchEmail = ta.lecturerEmail && ta.lecturerEmail.toLowerCase() === lecEmail;
      const matchName = ta.lecturerName && ta.lecturerName.toLowerCase().includes(lecNameLower);
      if (matchId || matchEmail || matchName) {
        const code = ta.subjectCode.trim().toUpperCase();
        if (!codeMap.has(code)) {
          codeMap.set(code, {
            code,
            name: ta.subjectName,
            department: subjects.find((s) => s.code.trim().toUpperCase() === code)?.department,
            classes: ta.className ? [ta.className] : []
          });
        } else {
          const item = codeMap.get(code)!;
          if (ta.className && !item.classes.includes(ta.className)) {
            item.classes.push(ta.className);
          }
        }
      }
    });

    // 2. From lec.assignedSubjects
    (lec.assignedSubjects || []).forEach((subStr) => {
      let code = subStr;
      let name = subStr;
      if (subStr.includes('-')) {
        const parts = subStr.split('-');
        code = parts[0].trim().toUpperCase();
        name = parts.slice(1).join('-').trim();
      } else {
        code = code.trim().toUpperCase();
      }
      if (!codeMap.has(code)) {
        const matched = subjects.find((s) => s.code.trim().toUpperCase() === code);
        codeMap.set(code, {
          code,
          name: matched?.name || name,
          department: matched?.department,
          classes: matched?.sections || lec.assignedClasses || []
        });
      }
    });

    // 3. From subjects list where lecturer matches
    subjects.forEach((s) => {
      const matchId = s.lecturerId && s.lecturerId.toLowerCase() === lecId;
      const matchEmail = s.lecturerEmail && s.lecturerEmail.toLowerCase() === lecEmail;
      const matchName = s.lecturerName && s.lecturerName.toLowerCase().includes(lecNameLower);
      if (matchId || matchEmail || matchName) {
        const code = s.code.trim().toUpperCase();
        if (!codeMap.has(code)) {
          codeMap.set(code, {
            code,
            name: s.name,
            department: s.department,
            classes: s.sections || []
          });
        }
      }
    });

    return Array.from(codeMap.values()).sort((a, b) => a.code.localeCompare(b.code));
  };

  // Open Subject Assignment Modal for a Lecturer (Admin Only)
  const handleOpenAssignSubjectsModal = (lec: Lecturer) => {
    if (!isAdmin && (!activeLecturer || activeLecturer.role !== 'ADMIN')) {
      onRequestAdminAccess(`Menetapkan Subjek bagi Pensyarah ${lec.name}`);
      return;
    }
    const assigned = getAssignedSubjectsForLecturer(lec);
    setSelectedLecturerForSubjects(lec);
    setSelectedSubjectCodes(assigned.map((a) => a.code));
    setAssignSubjectSearch('');
    setAssignDeptFilter('ALL');
  };

  // Toggle single subject selection in assignment modal
  const handleToggleSubject = (code: string) => {
    setSelectedSubjectCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // Save Subject Assignments (Admin)
  const handleSaveAssignedSubjects = async () => {
    if (!selectedLecturerForSubjects) return;
    setIsSavingAssignments(true);

    try {
      const payload = selectedSubjectCodes.map((code) => {
        const sub = subjects.find((s) => s.code.trim().toUpperCase() === code.trim().toUpperCase());
        return {
          subjectCode: code,
          subjectName: sub?.name || code,
          department: sub?.department || selectedLecturerForSubjects.department || 'Jabatan Pengajian',
          classes: (sub?.sections && sub.sections.length > 0)
            ? sub.sections
            : (selectedLecturerForSubjects.assignedClasses && selectedLecturerForSubjects.assignedClasses.length > 0)
            ? selectedLecturerForSubjects.assignedClasses
            : ['DIA_1A', 'DIA_1B']
        };
      });

      if (onUpdateLecturerAssignments) {
        await onUpdateLecturerAssignments(selectedLecturerForSubjects.id, payload);
      } else {
        await attendanceEngine.setLecturerAssignments(selectedLecturerForSubjects.id, payload);
      }

      soundService.playSuccess();
      setApprovalMessage(
        `Penetapan subjek bagi pensyarah ${selectedLecturerForSubjects.name} berjaya disimpan (${payload.length} subjek diajar).`
      );
      setTimeout(() => setApprovalMessage(null), 5000);
      setSelectedLecturerForSubjects(null);
    } catch (err) {
      soundService.playError();
      console.error('Save assigned subjects error:', err);
      alert('Ralat semasa menyimpan penugasan subjek.');
    } finally {
      setIsSavingAssignments(false);
    }
  };

  // Available subject departments for filtering in assignment modal
  const availableSubjectDepartments = useMemo(() => {
    const depts = new Set<string>();
    subjects.forEach((s) => {
      if (s.department) depts.add(s.department.trim());
    });
    return Array.from(depts);
  }, [subjects]);

  // Filtered subjects in assignment modal
  const modalFilteredSubjects = useMemo(() => {
    const q = assignSubjectSearch.toLowerCase().trim();
    return subjects.filter((sub) => {
      const matchSearch =
        !q ||
        sub.code.toLowerCase().includes(q) ||
        sub.name.toLowerCase().includes(q) ||
        (sub.department && sub.department.toLowerCase().includes(q));
      const matchDept = assignDeptFilter === 'ALL' || sub.department === assignDeptFilter;
      return matchSearch && matchDept;
    });
  }, [subjects, assignSubjectSearch, assignDeptFilter]);

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
            </div>

            {/* Main Tabs: Pelajar vs Pensyarah vs Subjek */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto flex-wrap gap-1">
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
                <span>Pelajar ({students.length})</span>
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
                <span>Pensyarah ({lecturers.length})</span>
              </button>
              <button
                type="button"
                id="btn-tab-subjects"
                onClick={() => {
                  setActiveMainTab('SUBJECTS');
                  soundService.playClick();
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeMainTab === 'SUBJECTS'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Subjek ({subjects.length})</span>
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
                    <span>Cetak QR</span>
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
                    <span>Import CSV</span>
                  </button>
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
                    type="button"
                    onClick={handleExportLecturersCSV}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                    title={!isAdmin && !activeLecturer ? 'Perlu pengesahan Pensyarah/Admin untuk eksport CSV' : 'Eksport senarai direktori pensyarah ke fail CSV'}
                  >
                    {!isAdmin && !activeLecturer ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Download className="w-3.5 h-3.5" />}
                    <span>Eksport CSV</span>
                  </button>

                  <button
                    id="btn-generate-lecturer-qr"
                    type="button"
                    onClick={() => {
                      if (!isAdmin && (!activeLecturer || activeLecturer.role !== 'ADMIN')) {
                        onRequestAdminAccess('Jana Kod QR Pendaftaran Pensyarah');
                        return;
                      }
                      setIsGenerateQRModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all cursor-pointer ring-1 ring-emerald-400/40"
                    title={!isAdmin && (!activeLecturer || activeLecturer.role !== 'ADMIN') ? 'Perlu pengesahan Admin untuk jana QR pensyarah' : 'Jana Kod QR Pendaftaran Pensyarah'}
                  >
                    {!isAdmin && (!activeLecturer || activeLecturer.role !== 'ADMIN') ? (
                      <Lock className="w-3.5 h-3.5 text-amber-300" />
                    ) : (
                      <QrCode className="w-3.5 h-3.5 text-emerald-200" />
                    )}
                    <span>Jana QR Pensyarah</span>
                  </button>

                  <button
                    id="btn-manual-add-lecturer"
                    type="button"
                    onClick={() => {
                      if (!activeLecturer && !isAdmin) {
                        onRequestAdminAccess('Daftar Pensyarah Baharu');
                      } else {
                        setIsAddLecturerOpen(true);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                    title="Tambah pensyarah secara manual"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tambah Manual</span>
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
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                    title="Import fail CSV senarai pensyarah"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import CSV</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Info Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 text-xs text-slate-400 bg-slate-950/50 px-3.5 py-2.5 rounded-xl border border-slate-800/60">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-[11px] leading-relaxed text-slate-300">
                    <strong className="text-emerald-400">Aliran Pentadbir (Admin Flow):</strong> 1. Import CSV Pensyarah ➔ 2. Klik butang <strong className="text-white">"Tetapkan Subjek Diajar"</strong> pada mana-mana kad pensyarah untuk memilih subjek daripada katalog kurikulum berdaftar.
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono shrink-0">
                  Jumlah Pensyarah: <strong className="text-white">{filteredLecturers.length}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Sub-header Controls: SUBJECTS TAB */}
          {activeMainTab === 'SUBJECTS' && (
            <div className="space-y-3.5 pt-3 border-t border-slate-800/80">
              {/* Row 1: Search Box and Primary Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Search Box */}
                <div className="relative w-full sm:w-80 lg:w-96">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Cari kod kursus, nama kursus, jabatan..."
                    value={subjectSearch}
                    onChange={(e) => setSubjectSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                  />
                </div>

                {/* Actions for Subjects */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    id="btn-export-subject-csv"
                    type="button"
                    onClick={handleExportSubjectsCSV}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                    title={!isAdmin && !activeLecturer ? 'Perlu pengesahan Pensyarah/Admin untuk eksport CSV' : 'Eksport senarai kursus ke fail CSV'}
                  >
                    {!isAdmin && !activeLecturer ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Download className="w-3.5 h-3.5" />}
                    <span>Eksport CSV</span>
                  </button>

                  <button
                    id="btn-download-subject-template"
                    type="button"
                    onClick={handleDownloadSubjectTemplate}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                    title="Muat turun templat CSV rasmi untuk kursus/subjek"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Template CSV</span>
                  </button>

                  <button
                    id="btn-manual-add-subject"
                    type="button"
                    onClick={() => {
                      if (!activeLecturer) {
                        onRequestAdminAccess('Tambah Kursus / Subjek Baharu');
                      } else {
                        setIsAddSubjectOpen(true);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                    title="Tambah kursus baharu secara manual"
                  >
                    <Plus className="w-3.5 h-3.5 text-teal-400" />
                    <span>Tambah Kursus</span>
                  </button>

                  {isAdmin && onResetSubjects && (
                    <button
                      id="btn-reset-kpm-subjects"
                      type="button"
                      onClick={() => {
                        if (window.confirm('Adakah anda pasti untuk mengeset semula senarai kursus kepada 46 subjek standard KPM?')) {
                          onResetSubjects();
                        }
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer"
                      title="Set semula kepada 46 Kursus Rasmi KPM"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                      <span>Set Semula 46 Subjek</span>
                    </button>
                  )}

                  <button
                    id="btn-import-subject-csv"
                    type="button"
                    onClick={() => {
                      if (!isAdmin && (!activeLecturer || activeLecturer.role !== 'ADMIN')) {
                        onRequestAdminAccess('Akses Admin Diperlukan untuk Memuat Naik CSV Kursus');
                        return;
                      }
                      if (onOpenSubjectCSVImport) {
                        onOpenSubjectCSVImport();
                      } else {
                        onOpenCSVImport();
                      }
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-lg shadow-teal-600/30 transition-all cursor-pointer"
                    title="Import fail CSV senarai subjek / kursus"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import CSV</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Department Filter Tabs */}
              <div className="flex items-center gap-2 pt-1 overflow-x-auto w-full pb-1 no-scrollbar">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                  <Filter className="w-3 h-3 text-teal-400" />
                  Jabatan:
                </span>
                {SUBJECT_DEPARTMENTS.map((dept, deptIdx) => {
                  const count = dept === 'ALL' ? subjects.length : subjects.filter((s) => s.department === dept).length;
                  const label = dept === 'ALL' ? 'Semua Jabatan' : dept.replace('Jabatan ', '');
                  return (
                    <button
                      key={`dept-tab-${dept}-${deptIdx}`}
                      onClick={() => setSelectedSubjectDepartment(dept)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                        selectedSubjectDepartment === dept
                          ? 'bg-teal-600 text-white font-bold shadow-md shadow-teal-600/20'
                          : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800'
                      }`}
                    >
                      <span>{label}</span>
                      <span className="ml-1.5 text-[10px] opacity-80">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ===================== VIEW 1: STUDENTS DATA TABLE ===================== */}
        {activeMainTab === 'STUDENTS' && (
          <div>
            {filteredStudents.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/60 rounded-2xl border border-slate-800 p-8 text-slate-400 text-xs space-y-2">
                <GraduationCap className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="font-semibold text-white">Tiada rekod pelajar dijumpai</p>
                <p className="text-slate-500 text-[11px]">
                  {searchQuery
                    ? `Tiada rekod sepadan dengan carian "${searchQuery}" atau kelas yang dipilih.`
                    : 'Tiada rekod pelajar dalam senarai atau kelas yang dipilih.'}
                </p>
              </div>
            ) : (
              <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[760px]">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-3.5 px-4 w-36">No. Pelajar</th>
                        <th className="py-3.5 px-4 min-w-[220px]">Nama Pelajar</th>
                        <th className="py-3.5 px-4 w-28">Kelas</th>
                        <th className="py-3.5 px-4 w-36">No. Telefon</th>
                        <th className="py-3.5 px-4 min-w-[180px]">Emel</th>
                        <th className="py-3.5 px-4 w-32">Kehadiran</th>
                        <th className="py-3.5 px-4 w-28 text-right">Tindakan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-xs">
                      {filteredStudents.map((student) => {
                        const stats = getStudentStats(student.id, student.className);

                        return (
                          <tr
                            key={student.id}
                            className="hover:bg-slate-800/40 transition-colors group"
                          >
                            {/* No. Pelajar */}
                            <td className="py-3 px-4 font-mono font-semibold text-indigo-400 text-xs whitespace-nowrap">
                              {student.studentId || student.id}
                            </td>

                            {/* Nama Pelajar */}
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-2.5 min-w-0">
                                <div
                                  className={`w-7 h-7 rounded-lg bg-gradient-to-br ${getStudentColor(
                                    student.name
                                  )} flex items-center justify-center font-bold text-white text-[10px] shadow-sm shrink-0`}
                                >
                                  {getInitials(student.name)}
                                </div>
                                <span
                                  className="font-semibold text-white truncate max-w-[200px] lg:max-w-[260px] block"
                                  title={student.name}
                                >
                                  {student.name}
                                </span>
                              </div>
                            </td>

                            {/* Kelas */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 text-[11px] font-mono font-bold">
                                {student.className}
                              </span>
                            </td>

                            {/* No. Telefon */}
                            <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-300 text-xs">
                              {student.phone ? (
                                <span>{student.phone}</span>
                              ) : (
                                <span className="text-slate-600 italic">-</span>
                              )}
                            </td>

                            {/* Emel */}
                            <td className="py-3 px-4 text-slate-400 text-xs">
                              {student.email ? (
                                <span
                                  className="truncate block max-w-[180px] lg:max-w-[220px]"
                                  title={student.email}
                                >
                                  {student.email}
                                </span>
                              ) : (
                                <span className="text-slate-600 italic">-</span>
                              )}
                            </td>

                            {/* Kehadiran */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              {stats.hasSessions ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-12 bg-slate-800 rounded-full h-1.5 overflow-hidden">
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
                              ) : (
                                <span className="text-slate-500 text-[11px] italic">
                                  Tiada Sesi
                                </span>
                              )}
                            </td>

                            {/* Tindakan */}
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
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
                                    className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors flex items-center justify-center cursor-pointer"
                                    title={`Buka WhatsApp untuk hubungi ${student.name}`}
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </a>
                                )}

                                <button
                                  type="button"
                                  onClick={() => setSelectedStudentForQR(student)}
                                  className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-white border border-indigo-500/30 transition-colors flex items-center justify-center cursor-pointer"
                                  title="Papar Kad QR Pelajar"
                                >
                                  <QrCode className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer with quick summary count */}
                <div className="py-2.5 px-4 bg-slate-950/60 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Menunjukkan <strong className="text-white font-mono">{filteredStudents.length}</strong> daripada <strong className="text-white font-mono">{students.length}</strong> rekod pelajar</span>
                  {selectedSet !== 'ALL' && (
                    <span className="text-indigo-400 font-mono">Kelas: {selectedSet}</span>
                  )}
                </div>
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

                      // Group assignments by subject with deduplicated classes
                      const groupedBySubject = lecAssignments.reduce((acc, ta) => {
                        if (!acc[ta.subjectCode]) {
                          acc[ta.subjectCode] = {
                            subjectName: ta.subjectName,
                            classes: []
                          };
                        }
                        if (ta.className && !acc[ta.subjectCode].classes.includes(ta.className)) {
                          acc[ta.subjectCode].classes.push(ta.className);
                        }
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
                                {(Object.entries(groupedBySubject) as [string, { subjectName: string; classes: string[] }][]).map(([subCode, data], dataIdx) => (
                                  <div
                                    key={`pending-sub-${lec.id}-${subCode}-${dataIdx}`}
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
                                      {Array.from(new Set(data.classes || [])).map((cls, clsIdx) => (
                                        <span
                                          key={`pending-cls-${lec.id}-${subCode}-${cls}-${clsIdx}`}
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
                    Anda boleh menjana QR Pensyarah untuk membenarkan pensyarah mendaftar sendiri, atau mendaftar pensyarah secara manual.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsGenerateQRModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Jana QR Pensyarah</span>
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
                  const isPending = lec.status === 'PENDING';
                  const isRejected = lec.status === 'REJECTED';

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
                            <span>No. PIN:</span>
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

                      {/* Assigned Subjects Section (Admin-managed) */}
                      {(() => {
                        const assigned = getAssignedSubjectsForLecturer(lec);
                        return (
                          <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800/80 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5 text-teal-400" />
                                <span>Subjek Yang Diajar:</span>
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border ${
                                  assigned.length > 0
                                    ? 'bg-teal-950 text-teal-300 border-teal-500/30'
                                    : 'bg-amber-950/80 text-amber-300 border-amber-500/30'
                                }`}
                              >
                                {assigned.length} Subjek
                              </span>
                            </div>

                            {assigned.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 pt-0.5 max-h-24 overflow-y-auto pr-1">
                                {assigned.map((subItem, subIdx) => (
                                  <span
                                    key={`assigned-sub-${lec.id}-${subItem.code}-${subIdx}`}
                                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900 border border-teal-500/30 text-teal-300 text-[11px] font-medium"
                                    title={`${subItem.code} - ${subItem.name}${subItem.classes.length > 0 ? ` (${subItem.classes.join(', ')})` : ''}`}
                                  >
                                    <span className="font-mono font-bold text-white">{subItem.code}</span>
                                    <span className="text-slate-400 max-w-[120px] truncate text-[10px]">
                                      {subItem.name}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div className="text-[11px] text-amber-300/90 bg-amber-950/30 border border-amber-500/20 rounded-lg p-2 flex items-center gap-2">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span>Belum ada subjek ditetapkan oleh Admin.</span>
                              </div>
                            )}

                            {/* Button to Assign / Manage Subjects (Admin Only - Sila buang dari paparan access pensyarah) */}
                            {isAdmin && activeLecturer?.role === 'ADMIN' && (
                              <div className="pt-1">
                                <button
                                  type="button"
                                  id={`btn-assign-subjects-${lec.id}`}
                                  onClick={() => handleOpenAssignSubjectsModal(lec)}
                                  className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm ${
                                    assigned.length > 0
                                      ? 'bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 hover:border-teal-400'
                                      : 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-emerald-950/50'
                                  }`}
                                >
                                  <BookOpen className="w-3.5 h-3.5" />
                                  <span>{assigned.length > 0 ? 'Kemaskini Subjek Diajar' : 'Tetapkan Subjek Diajar'}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })()}

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

        {/* ===================== VIEW 3: SUBJECTS GRID ===================== */}
        {activeMainTab === 'SUBJECTS' && (
          <div className="space-y-5">
            {filteredSubjects.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/60 rounded-2xl border border-slate-800 p-8 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 mx-auto flex items-center justify-center">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">Tiada Kursus / Subjek Ditemui</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Anda boleh memuat naik senarai kursus menggunakan fail CSV atau menambah kursus baharu secara manual.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isAdmin && (!activeLecturer || activeLecturer.role !== 'ADMIN')) {
                        onRequestAdminAccess('Akses Admin Diperlukan untuk Memuat Naik CSV Kursus');
                        return;
                      }
                      if (onOpenSubjectCSVImport) {
                        onOpenSubjectCSVImport();
                      } else {
                        onOpenCSVImport();
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-lg shadow-teal-600/30 transition-all cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Import Fail CSV Kursus</span>
                  </button>
                  {isAdmin && onResetSubjects && (
                    <button
                      type="button"
                      onClick={() => onResetSubjects()}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4 text-amber-400" />
                      <span>Set Semula 47 Kursus KPM</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSubjects.map((sub) => {
                  const lecturersTeaching = lecturers.filter((l) => {
                    const matchDirect = (l.assignedSubjects || []).some(
                      (s) => s.includes(sub.code) || s.toLowerCase().includes(sub.name.toLowerCase())
                    );
                    const matchTa = teachingAssignments.some(
                      (ta) => ta.lecturerId === l.id && ta.subjectCode === sub.code
                    );
                    return matchDirect || matchTa;
                  });

                  // Color scheme by department
                  const getDeptBadgeStyle = (deptName?: string) => {
                    if (!deptName) return 'bg-slate-800 text-slate-300 border-slate-700';
                    if (deptName.includes('Perakaunan')) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
                    if (deptName.includes('Pengajian Am')) return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
                    if (deptName.includes('Pengurusan Perniagaan')) return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
                    if (deptName.includes('Teknologi Maklumat')) return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
                    return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
                  };

                  return (
                    <div
                      key={sub.id || sub.code}
                      className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 shadow-md"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30">
                            {sub.code}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${getDeptBadgeStyle(
                              sub.department
                            )}`}
                          >
                            {sub.department ? sub.department.replace('Jabatan ', '') : 'KPM'}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-bold text-sm text-white line-clamp-2 leading-snug break-words" title={sub.name}>
                            {sub.name}
                          </h4>
                        </div>

                        {/* Sections info */}
                        {sub.sections && sub.sections.length > 0 ? (
                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                              Seksyen / Kelas Ditawarkan:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {sub.sections.map((sec, sIdx) => (
                                <span
                                  key={`sec-${sub.code}-${sec}-${sIdx}`}
                                  className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800 text-[10px] font-mono font-medium"
                                >
                                  {sec}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                              Agihan Kelas:
                            </span>
                            <div className="text-[11px] text-teal-400 font-medium">
                              Terbuka (Dipilih oleh Pensyarah)
                            </div>
                          </div>
                        )}

                        {/* Assigned Lecturers */}
                        <div className="pt-2 border-t border-slate-800/60">
                          <span className="text-[10px] text-slate-500 block mb-1">
                            Pensyarah Mengajar ({lecturersTeaching.length}):
                          </span>
                          {lecturersTeaching.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {lecturersTeaching.map((l) => (
                                <span
                                  key={`lec-badge-${sub.code}-${l.id}`}
                                  className="px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 text-[10px] font-medium truncate max-w-[180px]"
                                  title={l.name}
                                >
                                  {l.name.split(' ')[0]} {l.name.split(' ')[1] || ''}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500 italic">Belum ada pensyarah ditugaskan</span>
                          )}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      {isAdmin && onDeleteSubject && (
                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Padam kursus ${sub.code} - ${sub.name}?`)) {
                                onDeleteSubject(sub.id || sub.code);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
                            title="Padam Kursus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===================== MODAL: TAMBAH KURSUS / SUBJEK ===================== */}
      {isAddSubjectOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-teal-500/20 text-teal-300 rounded-xl">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Tambah Kursus / Subjek Baharu</h3>
                  <p className="text-[11px] text-slate-400">Senarai rujukan subjek pensyarah KPM</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddSubjectOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300">Kod Kursus *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: COM2512 atau ACC1013"
                  value={subCode}
                  onChange={(e) => setSubCode(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Nama Kursus *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: MEETING AND INTERVIEW SKILLS"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Jabatan</label>
                <select
                  value={subDepartment}
                  onChange={(e) => setSubDepartment(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500 cursor-pointer"
                >
                  <option value="Jabatan Pengajian Am">Jabatan Pengajian Am</option>
                  <option value="Jabatan Perakaunan">Jabatan Perakaunan</option>
                  <option value="Jabatan Pengurusan Perniagaan">Jabatan Pengurusan Perniagaan</option>
                  <option value="Jabatan Teknologi Maklumat">Jabatan Teknologi Maklumat</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Seksyen / Kelas (Dipisahkan koma)</label>
                <input
                  type="text"
                  placeholder="Contoh: DIA_1A, DIA_1B, DIA_2A, DIA_2B"
                  value={subSections}
                  onChange={(e) => setSubSections(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddSubjectOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-lg shadow-teal-600/30 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Kursus</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>E-mel Rasmi Kolej</span>
                  <span className="text-[10px] text-emerald-400 font-mono">@bpenawar.kpm.edu.my</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="Contoh: shah.ismail@bpenawar.kpm.edu.my"
                  value={lecEmail}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (val.endsWith('@') && !lecEmail.endsWith('@') && !lecEmail.includes('@')) {
                      val = `${val}bpenawar.kpm.edu.my`;
                    }
                    setLecEmail(val);
                  }}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
                {lecEmail.trim() && !lecEmail.toLowerCase().includes('@bpenawar.kpm.edu.my') && (
                  <button
                    type="button"
                    onClick={() => {
                      const user = lecEmail.split('@')[0].trim();
                      if (user) setLecEmail(`${user}@bpenawar.kpm.edu.my`);
                    }}
                    className="w-full text-left inline-flex items-center justify-between gap-1 text-[11px] font-medium text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 hover:bg-emerald-900/80 px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-sm mt-1"
                  >
                    <span className="truncate font-mono text-[10px]">
                      Cadangan: {lecEmail.split('@')[0]}@bpenawar.kpm.edu.my
                    </span>
                    <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-1.5 py-0.2 rounded font-semibold shrink-0">
                      Gunakan
                    </span>
                  </button>
                )}
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

      {/* ===================== MODAL: PENETAPAN SUBJEK PENSYARAH OLEH ADMIN ===================== */}
      {selectedLecturerForSubjects && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 text-white max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-teal-500/20 text-teal-300 rounded-2xl border border-teal-500/30 shadow-inner">
                  <BookOpen className="w-6 h-6 text-teal-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base text-white">Penetapan Subjek Yang Diajar</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Mod Pentadbir (Admin)
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pilih subjek daripada senarai kurikulum kolej untuk ditugaskan kepada pensyarah ini.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLecturerForSubjects(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-colors cursor-pointer"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lecturer Information Banner */}
            <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow shrink-0">
                  {getInitials(selectedLecturerForSubjects.name)}
                </div>
                <div>
                  <div className="font-bold text-white text-sm">{selectedLecturerForSubjects.name}</div>
                  <div className="text-slate-400 text-[11px] flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="font-mono text-emerald-400">{selectedLecturerForSubjects.email}</span>
                    <span>•</span>
                    <span className="text-slate-300">{selectedLecturerForSubjects.department || 'Jabatan Pengajian'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <span className="text-xs text-slate-300 font-semibold">Dipilih:</span>
                <span className="px-2.5 py-1 rounded-lg font-mono font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40 text-xs">
                  {selectedSubjectCodes.length} Subjek
                </span>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="space-y-2.5">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Cari kod kursus atau nama subjek (cth: MPU, FAR, ACC)..."
                    value={assignSubjectSearch}
                    onChange={(e) => setAssignSubjectSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                  {assignSubjectSearch && (
                    <button
                      type="button"
                      onClick={() => setAssignSubjectSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {availableSubjectDepartments.length > 0 && (
                  <select
                    value={assignDeptFilter}
                    onChange={(e) => setAssignDeptFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-teal-500 cursor-pointer max-w-full sm:max-w-[200px]"
                  >
                    <option value="ALL">Semua Jabatan</option>
                    {availableSubjectDepartments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-[11px] text-slate-400">
                  Memaparkan <strong className="text-white">{modalFilteredSubjects.length}</strong> subjek berdaftar
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const filteredCodes = modalFilteredSubjects.map((s) => s.code.trim().toUpperCase());
                      setSelectedSubjectCodes((prev) => Array.from(new Set([...prev, ...filteredCodes])));
                    }}
                    className="text-[11px] font-semibold text-teal-400 hover:text-teal-300 transition-colors cursor-pointer"
                  >
                    + Pilih Semua ({modalFilteredSubjects.length})
                  </button>
                  <span className="text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      const filteredCodes = new Set(modalFilteredSubjects.map((s) => s.code.trim().toUpperCase()));
                      setSelectedSubjectCodes((prev) => prev.filter((c) => !filteredCodes.has(c)));
                    }}
                    className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                  >
                    Kosongkan Pilihan
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Subjects Checklist */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px] max-h-[380px]">
              {modalFilteredSubjects.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
                  Tiada subjek kurikulum yang sepadan dengan carian "{assignSubjectSearch}".
                </div>
              ) : (
                modalFilteredSubjects.map((sub) => {
                  const cleanCode = sub.code.trim().toUpperCase();
                  const isSelected = selectedSubjectCodes.includes(cleanCode);

                  return (
                    <div
                      key={sub.id || cleanCode}
                      onClick={() => handleToggleSubject(cleanCode)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-teal-950/40 border-teal-500/60 ring-1 ring-teal-500/30'
                          : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors shrink-0 ${
                            isSelected
                              ? 'bg-teal-500 border-teal-400 text-slate-950'
                              : 'bg-slate-900 border-slate-700 text-transparent'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs text-white bg-slate-800/90 px-2 py-0.5 rounded border border-slate-700">
                              {cleanCode}
                            </span>
                            <span className="font-bold text-xs text-slate-200 truncate">
                              {sub.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                            <span>{sub.department || 'Jabatan Pengajian'}</span>
                            {sub.sections && sub.sections.length > 0 && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-[10px] text-slate-400">
                                  {sub.sections.join(', ')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Note if assigned previously */}
                      {sub.lecturerName && sub.lecturerName !== selectedLecturerForSubjects.name && sub.lecturerName !== 'Belum Ditetapkan' && (
                        <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 shrink-0 hidden sm:inline-block">
                          Sebelum ini: {sub.lecturerName}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                <strong className="text-white">{selectedSubjectCodes.length}</strong> subjek akan disimpan untuk pensyarah ini.
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedLecturerForSubjects(null)}
                  disabled={isSavingAssignments}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveAssignedSubjects}
                  disabled={isSavingAssignments}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingAssignments ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Simpan Penetapan Subjek</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
