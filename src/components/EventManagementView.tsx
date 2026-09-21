import React, { useState, useMemo, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Subject,
  AttendanceSession,
  AttendanceRecord,
  Lecturer,
  Student,
  EventStatus,
  Enrollment,
  TeachingAssignment
} from '../types';
import { getClassBadgeColor, sortSessionsLatestFirst } from '../utils/studentUtils';
import { soundService } from '../services/soundService';
import { GenerateEnrollmentQRModal } from './GenerateEnrollmentQRModal';
import { EnrolledStudentsModal } from './EnrolledStudentsModal';
import { LecturerManageSubjectsModal } from './LecturerManageSubjectsModal';
import {
  BookOpen,
  Plus,
  QrCode,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  Play,
  Square,
  Search,
  Filter,
  Eye,
  X,
  Sparkles,
  Maximize2,
  Trash2,
  GraduationCap,
  Layers,
  UserCheck,
  User,
  BookMarked,
  AlertTriangle,
  Upload,
  Radio,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Calendar,
  CalendarPlus,
  Settings,
  Check,
  Pencil
} from 'lucide-react';
import { attendanceEngine } from '../services/attendanceEngine';
import { EditSessionRemarkModal } from './EditSessionRemarkModal';

interface ClassManagementViewProps {
  subjects: Subject[];
  sessions: AttendanceSession[];
  attendanceRecords: AttendanceRecord[];
  students?: Student[];
  lecturers?: Lecturer[];
  enrollments?: Enrollment[];
  teachingAssignments?: TeachingAssignment[];
  activeLecturer: Lecturer | null;
  isAdmin: boolean;
  onSetSessionStatus: (sessionId: string, newStatus: EventStatus) => void;
  onCreateSubject: (subject: Subject) => void;
  onCreateSession: (session: AttendanceSession) => void;
  onCreateMultipleSessions?: (sessions: AttendanceSession[]) => void;
  onUpdateSession?: (session: AttendanceSession) => void;
  onDeleteSession?: (sessionId: string) => void;
  onDeleteSubject?: (subjectId: string) => void;
  onOpenScannerForSession: (sessionId: string) => void;
  onRequestAdminAccess: (actionName?: string) => void;
  onOpenScanner?: () => void;
  onOpenCSVImport?: () => void;
  onNavigateToStudents?: () => void;
  onOpenSelfRegistrationTest?: (context: {
    subjectCode: string;
    subjectName: string;
    className: string;
    lecturerName?: string;
    lecturerEmail?: string;
  }) => void;
}

export const EventManagementView: React.FC<ClassManagementViewProps> = ({
  subjects,
  sessions,
  attendanceRecords,
  students: propStudents,
  lecturers: propLecturers,
  enrollments: propEnrollments,
  teachingAssignments: propTeachingAssignments,
  activeLecturer,
  isAdmin,
  onSetSessionStatus,
  onCreateSubject,
  onCreateSession,
  onCreateMultipleSessions,
  onUpdateSession,
  onDeleteSession,
  onDeleteSubject,
  onOpenScannerForSession,
  onRequestAdminAccess,
  onOpenScanner,
  onOpenCSVImport,
  onNavigateToStudents,
  onOpenSelfRegistrationTest
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [, setRefreshKey] = useState<number>(0);

  // Edit Session Remark Modal State
  const [editingSession, setEditingSession] = useState<AttendanceSession | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  const handleOpenEditRemark = (session: AttendanceSession) => {
    setEditingSession(session);
    setIsEditModalOpen(true);
  };

  const handleSaveEditedSession = (updatedSession: AttendanceSession) => {
    if (onUpdateSession) {
      onUpdateSession(updatedSession);
    } else {
      attendanceEngine.updateSession(updatedSession);
    }
    setEditingSession(null);
    setIsEditModalOpen(false);
  };

  // Enrollments from props or engine
  const activeEnrollments = propEnrollments || attendanceEngine.getEnrollments();

  // QR Modal & Enrolled Modal State
  const [isGenerateQRModalOpen, setIsGenerateQRModalOpen] = useState<boolean>(false);
  const [qrModalSubject, setQrModalSubject] = useState<Subject | null>(null);
  const [qrModalClass, setQrModalClass] = useState<string>('DIA_4A');

  const [isEnrolledModalOpen, setIsEnrolledModalOpen] = useState<boolean>(false);
  const [enrolledModalSubject, setEnrolledModalSubject] = useState<Subject | null>(null);
  const [enrolledModalClass, setEnrolledModalClass] = useState<string>('ALL');

  // Lecturers list from props or engine
  const availableLecturers = propLecturers && propLecturers.length > 0
    ? propLecturers
    : attendanceEngine.getLecturers();

  // Students list from props or engine
  const availableStudents = propStudents && propStudents.length > 0
    ? propStudents
    : attendanceEngine.getStudents();

  // Calculate student count per class to strictly only allow classes with student data
  const studentCountByClass = useMemo(() => {
    const counts: Record<string, number> = {};
    availableStudents.forEach((s) => {
      const cls = (s.className || '').trim().toUpperCase();
      if (cls) {
        counts[cls] = (counts[cls] || 0) + 1;
      }
    });
    return counts;
  }, [availableStudents]);

  // ONLY classes that actually have student data in database
  const classesWithData = useMemo(() => {
    return Object.keys(studentCountByClass).sort();
  }, [studentCountByClass]);

  // Modal States
  const [isCreateSessionOpen, setIsCreateSessionOpen] = useState<boolean>(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [projectorSession, setProjectorSession] = useState<AttendanceSession | null>(null);

  // New Session Form State
  const [newSessionName, setNewSessionName] = useState<string>('');
  const [newSessionClasses, setNewSessionClasses] = useState<string[]>([]);
  // Meeting remark toggles: Meeting 1st 'a' & Meeting 2nd 'b' (Default: true)
  const [includeMeetingA, setIncludeMeetingA] = useState<boolean>(true);
  const [includeMeetingB, setIncludeMeetingB] = useState<boolean>(true);
  // Separate session per class (Default: true - generates distinct session for each individual class)
  const [generatePerClass, setGeneratePerClass] = useState<boolean>(true);

  // Clean base session name (stripping trailing 'a' or 'b' if user already typed it)
  const cleanBaseSessionName = useMemo(() => {
    const raw = newSessionName.trim();
    if (!raw) return 'Kuliah Minggu';
    if (includeMeetingA || includeMeetingB) {
      return raw.replace(/\s*([ab])$/i, '').trim();
    }
    return raw;
  }, [newSessionName, includeMeetingA, includeMeetingB]);

  // Selected meeting suffixes
  const meetingSuffixes = useMemo(() => {
    const arr: string[] = [];
    if (includeMeetingA) arr.push('a');
    if (includeMeetingB) arr.push('b');
    if (arr.length === 0) arr.push('');
    return arr;
  }, [includeMeetingA, includeMeetingB]);

  // Available classes for selected subject in session modal
  const targetClassesForModal = useMemo(() => {
    const sub = subjects.find((s) => s.id === selectedSubjectId);
    // 1. If subject explicitly has sections defined
    if (sub && Array.isArray(sub.sections) && sub.sections.length > 0) {
      return sub.sections.filter(Boolean);
    }
    // 2. Otherwise fallback to registered classes with student data
    return classesWithData.length > 0 ? classesWithData : ['DIA_4A', 'DIA_4B', 'DIA_4C', 'DIA_4D'];
  }, [subjects, selectedSubjectId, classesWithData]);

  // Dynamic preview of all sessions that will be generated
  const previewGeneratedSessions = useMemo(() => {
    if (newSessionClasses.length === 0) return [];
    const results: { sessionName: string; className: string }[] = [];
    if (generatePerClass) {
      newSessionClasses.forEach((cls) => {
        meetingSuffixes.forEach((suffix) => {
          results.push({
            sessionName: suffix ? `${cleanBaseSessionName}${suffix}` : cleanBaseSessionName,
            className: cls
          });
        });
      });
    } else {
      const isAllSelected = targetClassesForModal.length > 1 && newSessionClasses.length === targetClassesForModal.length;
      const finalCls = isAllSelected ? 'ALL' : newSessionClasses.join(', ');
      meetingSuffixes.forEach((suffix) => {
        results.push({
          sessionName: suffix ? `${cleanBaseSessionName}${suffix}` : cleanBaseSessionName,
          className: finalCls
        });
      });
    }
    return results;
  }, [newSessionClasses, generatePerClass, meetingSuffixes, cleanBaseSessionName, targetClassesForModal.length]);

  // In-app prompt state for removing/deleting class (100% iframe compatible, no window.confirm)
  const [classToDeletePrompt, setClassToDeletePrompt] = useState<{
    className: string;
    studentCount: number;
    subjectName: string;
  } | null>(null);
  const [classActionNotice, setClassActionNotice] = useState<string | null>(null);

  // Open the deletion / removal prompt
  const handleOpenRemoveClassPrompt = (sec: string) => {
    const sub = subjects.find((s) => s.id === selectedSubjectId);
    const subName = sub ? `${sub.code} - ${sub.name}` : 'Subjek ini';
    const count = studentCountByClass[sec.toUpperCase()] || 0;
    setClassToDeletePrompt({
      className: sec,
      studentCount: count,
      subjectName: subName
    });
  };

  // Option 1: Remove from selected subject only
  const handleConfirmRemoveFromSubject = () => {
    if (!classToDeletePrompt || !selectedSubjectId) return;
    const cls = classToDeletePrompt.className;
    attendanceEngine.removeSectionFromSubject(selectedSubjectId, cls, targetClassesForModal);
    setNewSessionClasses((prev) => prev.filter((c) => c !== cls));
    soundService.playSuccess();
    setClassActionNotice(`Kelas ${cls} berjaya dikeluarkan daripada ${classToDeletePrompt.subjectName}.`);
    setTimeout(() => setClassActionNotice(null), 4000);
    setClassToDeletePrompt(null);
  };

  // Option 2: Delete class globally from whole system (for accidental classes)
  const handleConfirmDeleteClassGlobally = () => {
    if (!classToDeletePrompt) return;
    const cls = classToDeletePrompt.className;
    attendanceEngine.deleteClass(cls, { deleteStudents: false });
    setNewSessionClasses((prev) => prev.filter((c) => c !== cls));
    soundService.playSuccess();
    setClassActionNotice(`Kelas ${cls} telah dipadamkan sepenuhnya daripada sistem kolej.`);
    setTimeout(() => setClassActionNotice(null), 4000);
    setClassToDeletePrompt(null);
  };

  // Toggle individual class in session modal
  const handleToggleSessionClass = (cls: string) => {
    setNewSessionClasses((prev) =>
      prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls]
    );
  };

  const handleSelectAllSessionClasses = () => {
    setNewSessionClasses([...targetClassesForModal]);
  };

  const handleClearSessionClasses = () => {
    setNewSessionClasses([]);
  };

  const totalStudentsInTargetClasses = useMemo(() => {
    return newSessionClasses.reduce(
      (sum, cls) => sum + (studentCountByClass[cls.toUpperCase()] || 0),
      0
    );
  }, [newSessionClasses, studentCountByClass]);

  // Lecturer Manage Subjects Modal
  const [isManageSubjectsModalOpen, setIsManageSubjectsModalOpen] = useState<boolean>(false);

  // In-App Deletion Confirmation Modal State (replaces window.confirm which is blocked in iframes)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: 'SUBJECT' | 'SESSION';
    id: string;
    title: string;
    detail: string;
  } | null>(null);

  // Active lecturer teaching assignment codes
  const myAssignedCodes = useMemo(() => {
    if (!activeLecturer) return new Set<string>();
    const codes = new Set<string>();
    const lecName = (activeLecturer.name || '').trim().toLowerCase();
    const lecEmail = (activeLecturer.email || '').trim().toLowerCase();
    const lecId = (activeLecturer.id || '').trim().toLowerCase();

    // 1. From teaching assignments prop or engine
    const assignments = (propTeachingAssignments && propTeachingAssignments.length > 0)
      ? propTeachingAssignments
      : attendanceEngine.getTeachingAssignmentsForLecturer(activeLecturer.id || activeLecturer.email);

    assignments.forEach((ta) => {
      const matchId = ta.lecturerId && ta.lecturerId.toLowerCase() === lecId;
      const matchEmail = ta.lecturerEmail && ta.lecturerEmail.toLowerCase() === lecEmail;
      const matchName = ta.lecturerName && ta.lecturerName.toLowerCase().includes(lecName);
      if (matchId || matchEmail || matchName) {
        if (ta.subjectCode) codes.add(ta.subjectCode.trim().toUpperCase());
      }
    });

    // 2. From activeLecturer.assignedSubjects
    (activeLecturer.assignedSubjects || []).forEach((subStr) => {
      const code = subStr.includes('-') ? subStr.split('-')[0].trim().toUpperCase() : subStr.trim().toUpperCase();
      if (code) codes.add(code);
    });

    // 3. From subjects list where lecturer matches
    subjects.forEach((s) => {
      const matchId = s.lecturerId && s.lecturerId.toLowerCase() === lecId;
      const matchEmail = s.lecturerEmail && s.lecturerEmail.toLowerCase() === lecEmail;
      const matchName = s.lecturerName && s.lecturerName.toLowerCase().includes(lecName);
      if (matchId || matchEmail || matchName) {
        codes.add(s.code.trim().toUpperCase());
      }
    });

    return codes;
  }, [activeLecturer, propTeachingAssignments, subjects]);

  // Determine subject view scope:
  // When a lecturer is authenticated (login access), default strictly to lecturer's own subjects ('MY_SUBJECTS') instead of 'ALL_SUBJECTS'
  const [subjectViewScope, setSubjectViewScope] = useState<'MY_SUBJECTS' | 'ALL_SUBJECTS'>(
    activeLecturer ? 'MY_SUBJECTS' : 'ALL_SUBJECTS'
  );

  // Sync default scope strictly to 'MY_SUBJECTS' whenever activeLecturer is present
  useEffect(() => {
    if (activeLecturer) {
      setSubjectViewScope('MY_SUBJECTS');
    }
  }, [activeLecturer]);

  // Scoped subjects list based on active view scope, sorted A-Z by course code
  const scopedSubjects = useMemo(() => {
    let list: Subject[] = [];
    if (!activeLecturer || subjectViewScope === 'ALL_SUBJECTS') {
      list = [...subjects];
    } else {
      // Strictly return only subjects taught by this lecturer (by individu sahaja)
      list = subjects.filter((s) => myAssignedCodes.has(s.code.trim().toUpperCase()));
    }
    return list.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));
  }, [subjects, activeLecturer, subjectViewScope, myAssignedCodes]);

  // Filtered Subjects with search query
  const filteredSubjects = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return scopedSubjects.filter((sub) => {
      if (!q) return true;
      return (
        sub.code.toLowerCase().includes(q) ||
        sub.name.toLowerCase().includes(q) ||
        (sub.lecturerName && sub.lecturerName.toLowerCase().includes(q)) ||
        (sub.sections && sub.sections.some((sec) => sec.toLowerCase().includes(q)))
      );
    });
  }, [scopedSubjects, searchQuery]);

  // Open Create Session modal for specific subject
  const handleOpenAddSession = (subId: string) => {
    const sub = subjects.find((s) => s.id === subId);
    setSelectedSubjectId(subId);
    if (sub) {
      const existingSubSessions = sessions.filter((s) => s.subjectId === subId || s.activityId === subId);
      // Smart week deduction from existing sessions
      let maxWeek = 0;
      existingSubSessions.forEach((ses) => {
        const m = ses.sessionName.match(/Minggu\s*(\d+)/i);
        if (m && m[1]) {
          const w = parseInt(m[1], 10);
          if (w > maxWeek) maxWeek = w;
        }
      });
      const nextWeekNum = maxWeek > 0 ? maxWeek + 1 : (existingSubSessions.length > 0 ? Math.max(1, Math.floor(existingSubSessions.length / 2) + 1) : 1);
      setNewSessionName(`Kuliah Minggu ${nextWeekNum}`);
      // Default: Every class has Meeting 1st 'a' and Meeting 2nd 'b' ticked
      setIncludeMeetingA(true);
      setIncludeMeetingB(true);
      setGeneratePerClass(true);

      // Default: Tick all sections registered for this subject, or fallback to classes with data
      const subSections = (sub.sections || []).filter(Boolean);
      if (subSections.length > 0) {
        setNewSessionClasses(subSections);
      } else if (classesWithData.length > 0) {
        setNewSessionClasses(classesWithData);
      } else {
        setNewSessionClasses(['DIA_4A']);
      }
    }
    setIsCreateSessionOpen(true);
  };

  // Handle Submit New Session (Supports automatic generation of Meeting 1st 'a' & 2nd 'b' per class)
  const handleSubmitSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim() || !selectedSubjectId) return;

    if (newSessionClasses.length === 0) {
      alert('Sila tandakan (tick) sekurang-kurangnya satu kelas yang terlibat bagi sesi kuliah ini.');
      return;
    }

    const parentSub = subjects.find((s) => s.id === selectedSubjectId);
    const meetings: string[] = [];
    if (includeMeetingA) meetings.push('a');
    if (includeMeetingB) meetings.push('b');
    if (meetings.length === 0) meetings.push('');

    const rawBase = newSessionName.trim();
    const cleanBase = (includeMeetingA || includeMeetingB)
      ? rawBase.replace(/\s*([ab])$/i, '').trim()
      : rawBase;

    const newSessionsToCreate: AttendanceSession[] = [];
    const now = Date.now();
    const dateStr = new Date().toISOString().split('T')[0];

    if (generatePerClass) {
      // 1 separate session for each individual class
      newSessionClasses.forEach((cls, clsIdx) => {
        meetings.forEach((meetSuffix, meetIdx) => {
          const sName = meetSuffix ? `${cleanBase}${meetSuffix}` : cleanBase;
          const uniqueId = `SES-${now.toString(36).toUpperCase()}-${clsIdx}${meetIdx}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

          newSessionsToCreate.push({
            id: uniqueId,
            activityId: selectedSubjectId,
            activityName: parentSub ? `[${parentSub.code}] ${parentSub.name}` : 'Kelas',
            subjectId: selectedSubjectId,
            subjectCode: parentSub?.code || '',
            subjectName: parentSub?.name || '',
            category: 'CLASS',
            sessionName: sName,
            date: dateStr,
            startTime: '',
            endTime: '',
            status: 'CLOSED', // Sedia untuk diimbas semasa kuliah bermula
            attendanceMethod: 'QR',
            organizer: parentSub?.lecturerName || activeLecturer?.name || 'Pensyarah',
            lecturerName: parentSub?.lecturerName || activeLecturer?.name || 'Pensyarah',
            className: cls,
            createdAt: new Date(now + (clsIdx * 10 + meetIdx) * 1000).toISOString()
          });
        });
      });
    } else {
      // Combined session for all checked classes
      const isAllSelected = targetClassesForModal.length > 1 && newSessionClasses.length === targetClassesForModal.length;
      const finalClassName = isAllSelected ? 'ALL' : newSessionClasses.join(', ');

      meetings.forEach((meetSuffix, meetIdx) => {
        const sName = meetSuffix ? `${cleanBase}${meetSuffix}` : cleanBase;
        const uniqueId = `SES-${now.toString(36).toUpperCase()}-${meetIdx}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        newSessionsToCreate.push({
          id: uniqueId,
          activityId: selectedSubjectId,
          activityName: parentSub ? `[${parentSub.code}] ${parentSub.name}` : 'Kelas',
          subjectId: selectedSubjectId,
          subjectCode: parentSub?.code || '',
          subjectName: parentSub?.name || '',
          category: 'CLASS',
          sessionName: sName,
          date: dateStr,
          startTime: '',
          endTime: '',
          status: 'CLOSED',
          attendanceMethod: 'QR',
          organizer: parentSub?.lecturerName || activeLecturer?.name || 'Pensyarah',
          lecturerName: parentSub?.lecturerName || activeLecturer?.name || 'Pensyarah',
          className: finalClassName,
          createdAt: new Date(now + meetIdx * 1000).toISOString()
        });
      });
    }

    if (newSessionsToCreate.length === 1 && onCreateSession) {
      onCreateSession(newSessionsToCreate[0]);
    } else if (onCreateMultipleSessions && newSessionsToCreate.length > 0) {
      onCreateMultipleSessions(newSessionsToCreate);
    } else if (onCreateSession) {
      newSessionsToCreate.forEach((s) => onCreateSession(s));
    }

    setIsCreateSessionOpen(false);
  };

  // Handle Delete Session
  const handleDeleteSessionClick = (session: AttendanceSession) => {
    if (!isAdmin && !activeLecturer) {
      onRequestAdminAccess(`Padam Sesi Kelas (${session.sessionName})`);
      return;
    }
    setDeleteConfirmation({
      type: 'SESSION',
      id: session.id,
      title: `Padam Sesi Kelas`,
      detail: `Adakah anda pasti mahu memadamkan "${session.sessionName}" (${session.className || 'Semua Kelas'})? Sesi ini dan senarai semakannya akan dikeluarkan.`
    });
  };

  // Handle Delete Subject
  const handleDeleteSubjectClick = (subject: Subject) => {
    if (!isAdmin && !activeLecturer) {
      onRequestAdminAccess(`Padam Subjek (${subject.code})`);
      return;
    }
    setDeleteConfirmation({
      type: 'SUBJECT',
      id: subject.id,
      title: `Padam Subjek ${subject.code}`,
      detail: `Adakah anda pasti mahu memadamkan subjek "${subject.code} - ${subject.name}"? Semua jadual sesi kelas di bawah subjek ini juga akan dipadamkan.`
    });
  };

  // Execute Confirmed Delete
  const handleExecuteDelete = () => {
    if (!deleteConfirmation) return;
    if (deleteConfirmation.type === 'SUBJECT') {
      if (onDeleteSubject) {
        onDeleteSubject(deleteConfirmation.id);
      }
    } else if (deleteConfirmation.type === 'SESSION') {
      if (onDeleteSession) {
        onDeleteSession(deleteConfirmation.id);
      }
    }
    setDeleteConfirmation(null);
  };

  // Global Active Sessions (Level 1: NOW / ACTIVE)
  const activeSessionsList = useMemo(() => {
    const openSessions = sessions.filter((s) => s.status === 'OPEN');
    if (!activeLecturer || subjectViewScope === 'ALL_SUBJECTS') {
      return openSessions;
    }
    const lecName = (activeLecturer.name || '').trim().toLowerCase();
    const lecEmail = (activeLecturer.email || '').trim().toLowerCase();
    return openSessions.filter((s) => {
      const matchSubject = s.subjectCode && myAssignedCodes.has(s.subjectCode.trim().toUpperCase());
      const matchEmail = s.lecturerEmail && s.lecturerEmail.toLowerCase() === lecEmail;
      const matchName = s.lecturerName && s.lecturerName.toLowerCase().includes(lecName);
      return matchSubject || matchEmail || matchName;
    });
  }, [sessions, activeLecturer, subjectViewScope, myAssignedCodes]);

  // State to toggle past sessions for subjects (Progressive Disclosure)
  const [expandedPastSubjects, setExpandedPastSubjects] = useState<Record<string, boolean>>({});

  // State to toggle expansion of subject cards (Default: HIDE / collapsed as requested)
  const [expandedSubjectCards, setExpandedSubjectCards] = useState<Record<string, boolean>>({});

  const toggleSubjectCard = (subjectId: string) => {
    setExpandedSubjectCards((prev) => ({
      ...prev,
      [subjectId]: !prev[subjectId]
    }));
  };

  const handleExpandAllSubjects = () => {
    const allExpanded: Record<string, boolean> = {};
    filteredSubjects.forEach((sub) => {
      allExpanded[sub.id] = true;
    });
    setExpandedSubjectCards(allExpanded);
  };

  const handleCollapseAllSubjects = () => {
    setExpandedSubjectCards({});
  };

  const togglePastSessions = (subjectId: string) => {
    setExpandedPastSubjects((prev) => ({
      ...prev,
      [subjectId]: !prev[subjectId]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Search Bar */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
        {/* Row 1: Title, Metadata & Main Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {activeLecturer ? 'RUANG KERJA PENSYARAH' : 'PENGURUSAN KELAS & SUBJEK'}
              </span>
              {activeLecturer && (
                <span className="text-[11px] text-indigo-200 bg-indigo-950/70 px-2.5 py-0.5 rounded-full border border-indigo-500/40 font-medium flex items-center gap-1.5 shadow-sm">
                  <User className="w-3 h-3 text-indigo-400" />
                  <span>{activeLecturer.department || 'Jabatan Perakaunan'}</span>
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-1">
              {activeLecturer ? `Hi, ${activeLecturer.name}` : 'Subjek & Sesi Kuliah'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {activeLecturer ? (
                <span>Urus subjek, jadualkan sesi kuliah mingguan, dan mulakan imbasan kehadiran di satu tempat.</span>
              ) : (
                <span>Urus subjek pensyarah, kelas yang diajar, dan buka sesi imbasan mingguan.</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenScanner && (
              <button
                type="button"
                id="btn-workspace-open-scanner"
                onClick={onOpenScanner}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                title="Buka kamera pengimbas kehadiran"
              >
                <QrCode className="w-4 h-4" />
                <span>Buka Pengimbas</span>
              </button>
            )}
            <button
              id="btn-open-global-enrollment-qr"
              onClick={() => {
                setQrModalSubject(subjects[0] || null);
                setQrModalClass(subjects[0]?.sections?.[0] || 'DIA_4A');
                setIsGenerateQRModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold shadow-sm transition-all cursor-pointer"
              title="Jana Kod QR Pendaftaran Kelas untuk dipancarkan kepada pelajar"
            >
              <QrCode className="w-4 h-4 text-indigo-400" />
              <span>Jana QR Pendaftaran Kelas</span>
            </button>
          </div>
        </div>

        {/* Row 2: Search */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Cari kod atau nama subjek..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* ========================================================
          LEVEL 1: NOW / ACTIVE SESSIONS (DOMINANT VISUAL PRIORITY)
          ======================================================== */}
      {activeSessionsList.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
              Sedang Berlangsung Sekarang (Live)
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {activeSessionsList.map((activeSes) => {
              const matchedSub = subjects.find((s) => s.id === activeSes.subjectId || s.id === activeSes.activityId);
              const presentCount = attendanceRecords.filter(
                (r) => r.sessionId === activeSes.id && r.status === 'PRESENT'
              ).length;
              const targetClassCount = activeSes.className && activeSes.className !== 'ALL'
                ? (studentCountByClass[activeSes.className.toUpperCase()] || 0)
                : (matchedSub?.sections || []).reduce((acc, sec) => acc + (studentCountByClass[sec.toUpperCase()] || 0), 0) || availableStudents.length;

              const percent = targetClassCount > 0
                ? Math.min(100, Math.round((presentCount / targetClassCount) * 100))
                : 0;

              return (
                <div
                  key={`active-banner-${activeSes.id}`}
                  className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border-2 border-emerald-500 shadow-xl shadow-emerald-950/40 relative overflow-hidden"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    {/* Left: Live Identity & Class info */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-extrabold">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          🔴 SEDANG BERLANGSUNG (LIVE)
                        </span>

                        {activeSes.className && (
                          <span className="text-xs px-2.5 py-0.5 rounded-lg bg-slate-800 text-white font-bold border border-slate-700">
                            Kelas {activeSes.className}
                          </span>
                        )}

                        <span className="text-xs text-slate-400 font-mono">
                          {activeSes.subjectCode || matchedSub?.code}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                            {activeSes.sessionName}
                          </h3>
                          <button
                            type="button"
                            id={`btn-edit-live-banner-${activeSes.id}`}
                            onClick={() => handleOpenEditRemark(activeSes)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 text-xs font-bold transition-all cursor-pointer"
                            title="Ubah tajuk atau remark sesi live ini"
                          >
                            <Pencil className="w-3.5 h-3.5 text-emerald-300" />
                            <span>Ubah Remark</span>
                          </button>
                        </div>
                        <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-200">{activeSes.subjectName || matchedSub?.name || 'Sesi Kuliah'}</span>
                          {activeSes.academicWeek && (
                            <>
                              <span className="text-slate-600">•</span>
                              <span className="text-indigo-300 font-semibold">{activeSes.academicWeek}</span>
                            </>
                          )}
                          {activeSes.startTime && (
                            <>
                              <span className="text-slate-600">•</span>
                              <span className="text-slate-400 font-mono text-[11px]">{activeSes.startTime} - {activeSes.endTime}</span>
                            </>
                          )}
                        </p>
                      </div>

                      {/* Real Progress Bar */}
                      <div className="pt-2 max-w-md space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 font-bold">
                            <strong className="text-emerald-400 text-sm">{presentCount}</strong> / {targetClassCount} Pelajar Hadir
                          </span>
                          <span className="text-emerald-400 font-mono font-bold text-xs">
                            {percent}%
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right: Primary Single Dominant Action + Secondary Contextual Controls */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800/80">
                      <button
                        id={`btn-live-resume-scan-${activeSes.id}`}
                        onClick={() => onOpenScannerForSession(activeSes.id)}
                        className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                      >
                        <QrCode className="w-4 h-4 text-slate-950" />
                        <span>SAMBUNG KEHADIRAN</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          id={`btn-live-projector-${activeSes.id}`}
                          onClick={() => setProjectorSession(activeSes)}
                          className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          title="Papar kod QR sesi di projektor kelas"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span>Projektor</span>
                        </button>

                        <button
                          id={`btn-live-close-${activeSes.id}`}
                          onClick={() => onSetSessionStatus(activeSes.id, 'CLOSED')}
                          className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-500/30 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          title="Tutup sesi kelas ini"
                        >
                          <Square className="w-3.5 h-3.5" />
                          <span>Tutup Sesi</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================
          LECTURER PERSONAL FILTER & SCOPE BANNER
          ======================================================== */}
      {activeLecturer && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-white">Skop Paparan Subjek:</span>
                <span className="text-xs font-semibold text-indigo-300 bg-indigo-900/60 px-2 py-0.5 rounded border border-indigo-500/30">
                  {subjectViewScope === 'MY_SUBJECTS' ? 'Subjek Pengajaran Anda' : 'Semua Katalog Kolej'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {subjectViewScope === 'MY_SUBJECTS'
                  ? `Memaparkan ${scopedSubjects.length} subjek pengajaran anda sahaja (by individu) bagi memudahkan capaian sesi kuliah.`
                  : `Memaparkan katalog keseluruhan (${subjects.length} subjek) kolej.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center flex-wrap">
            <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-xl border border-slate-750/80 shadow-inner">
              <button
                type="button"
                id="btn-scope-my-subjects"
                onClick={() => setSubjectViewScope('MY_SUBJECTS')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  subjectViewScope === 'MY_SUBJECTS'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <BookMarked className="w-3.5 h-3.5 text-indigo-200" />
                <span>Subjek Saya ({myAssignedCodes.size})</span>
              </button>
              <button
                type="button"
                id="btn-scope-all-subjects"
                onClick={() => setSubjectViewScope('ALL_SUBJECTS')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  subjectViewScope === 'ALL_SUBJECTS'
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                <span>Semua Subjek ({subjects.length})</span>
              </button>
            </div>

            <button
              type="button"
              id="btn-open-manage-subjects-from-event-view"
              onClick={() => setIsManageSubjectsModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Pilih atau tetapkan subjek pengajaran anda"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Pilih / Urus Subjek</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          LEVEL 2-4: SUBJECTS LIST WITH PROGRESSIVE DISCLOSURE
          ======================================================== */}
      <div className="space-y-4">
        {filteredSubjects.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-1 text-xs text-slate-400">
            <span className="font-bold flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-slate-400">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>SENARAI SUBJEK / KURSUS ({filteredSubjects.length})</span>
              <span className="text-[11px] text-slate-500 font-normal">
                — klik kad untuk papar / tutup sesi
              </span>
            </span>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                id="btn-expand-all-subjects"
                onClick={handleExpandAllSubjects}
                className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer transition-colors"
              >
                Buka Semua
              </button>
              <span className="text-slate-600">•</span>
              <button
                type="button"
                id="btn-collapse-all-subjects"
                onClick={handleCollapseAllSubjects}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-300 hover:underline cursor-pointer transition-colors"
              >
                Tutup Semua
              </button>
            </div>
          </div>
        )}
        {filteredSubjects.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/60 rounded-2xl border border-slate-800 p-6 flex flex-col items-center justify-center space-y-3">
            <BookOpen className="w-10 h-10 text-indigo-500/40" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">
                {activeLecturer && subjectViewScope === 'MY_SUBJECTS'
                  ? `Tiada Subjek Ditugaskan untuk ${activeLecturer.name}`
                  : 'Tiada Subjek Dijumpai'}
              </h4>
              <p className="text-xs text-slate-400 max-w-md">
                {activeLecturer && subjectViewScope === 'MY_SUBJECTS'
                  ? 'Anda belum menetapkan subjek pengajaran bagi semester ini. Klik butang di bawah untuk memilih subjek yang anda ajar daripada senarai master kolej.'
                  : 'Gunakan butang "Daftar Subjek Baharu" di bahagian atas untuk mula mendaftarkan subjek dan membuka sesi kuliah.'}
              </p>
            </div>
            {activeLecturer && subjectViewScope === 'MY_SUBJECTS' && (
              <button
                type="button"
                onClick={() => setIsManageSubjectsModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Pilih Subjek Pengajaran Anda Sekarang
              </button>
            )}
          </div>
        ) : (
          filteredSubjects.map((subject) => {
            const subjectSessions = sortSessionsLatestFirst(
              sessions.filter(
                (s) => s.subjectId === subject.id || s.activityId === subject.id
              )
            );

            // Separate into Active, Scheduled (Upcoming), and Past Sessions
            const activeInSub = subjectSessions.filter((s) => s.status === 'OPEN');
            const nonActiveInSub = subjectSessions.filter((s) => s.status !== 'OPEN');
            
            // Scheduled sessions: not currently active and have 0 attendance records
            const scheduledSessions = nonActiveInSub.filter((s) => {
              const count = attendanceRecords.filter(
                (r) => r.sessionId === s.id && r.status === 'PRESENT'
              ).length;
              return count === 0;
            });

            // Past sessions: have attendance records or were previously completed
            const pastSessions = nonActiveInSub.filter((s) => {
              const count = attendanceRecords.filter(
                (r) => r.sessionId === s.id && r.status === 'PRESENT'
              ).length;
              return count > 0;
            });
            const isPastExpanded = expandedPastSubjects[subject.id] || false;

            // Calculate assigned classes for this subject from teaching assignments or subject sections
            const assignedClassesForThisSubject = attendanceEngine.getAssignedClassesForSubject(
              subject.code,
              activeLecturer ? activeLecturer.id : undefined
            );
            const effectiveSections = assignedClassesForThisSubject.length > 0
              ? assignedClassesForThisSubject
              : (subject.sections && subject.sections.length > 0 ? subject.sections : []);

            // Calculate total students in subject's assigned classes
            const totalSubjectStudents = effectiveSections.reduce(
              (acc, sec) => acc + (studentCountByClass[sec.toUpperCase()] || 0),
              0
            );

            // Self-registered enrollments via QR matching assigned classes
            const subjectEnrCount = activeEnrollments.filter((e) => {
              if (e.subjectCode.toUpperCase() !== subject.code.toUpperCase() || e.status === 'DROPPED') return false;
              if (effectiveSections.length === 0) return true;
              const eCls = (e.className || '').trim().toUpperCase();
              return effectiveSections.some(
                (sec) => sec === eCls || sec.replace(/_/g, ' ') === eCls.replace(/_/g, ' ')
              );
            }).length;

            const isSubjectExpanded = expandedSubjectCards[subject.id] || false;

            return (
              <div
                key={subject.id}
                id={`subject-card-${subject.id}`}
                className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-lg transition-all"
              >
                {/* ========================================================
                    MAIN KATEGORI: SUBJEK / KURSUS UTAMA
                    ======================================================== */}
                <div
                  id={`subject-header-${subject.id}`}
                  onClick={() => toggleSubjectCard(subject.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleSubjectCard(subject.id);
                    }
                  }}
                  aria-expanded={isSubjectExpanded}
                  title={isSubjectExpanded ? "Klik untuk tutup maklumat & jadual sesi" : "Klik untuk papar maklumat & jadual sesi"}
                  className={`p-5 sm:p-6 bg-gradient-to-r from-indigo-950/90 via-slate-900 to-slate-900 hover:from-indigo-950 hover:to-slate-850 cursor-pointer transition-colors flex flex-col md:flex-row md:items-center justify-between gap-5 relative select-none group ${
                    isSubjectExpanded ? 'border-b-2 border-indigo-500/40' : ''
                  }`}
                >
                  <div className="space-y-2 flex-1">
                    {/* Main Category Identifier Badge */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-mono font-black px-3 py-1 rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
                        {subject.code}
                      </span>
                      {activeInSub.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                          <Radio className="w-3 h-3 text-emerald-400" />
                          SESI AKTIF
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg sm:text-2xl font-black text-white tracking-tight group-hover:text-indigo-200 transition-colors flex items-center gap-2">
                        <span>{subject.name}</span>
                        {isSubjectExpanded ? (
                          <ChevronUp className="w-5 h-5 text-indigo-400 shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-indigo-300 shrink-0 transition-colors" />
                        )}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-300 mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-slate-400 font-medium">{subjectSessions.length} Sesi Terjadual</span>
                      </p>
                    </div>
                  </div>

                  {/* Level 4: Subject Management Actions (Clean Button Hierarchy) */}
                  <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0">
                    {/* Primary Action for this Subject: Add a new session schedule */}
                    <button
                      type="button"
                      id={`btn-add-session-${subject.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenAddSession(subject.id);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all cursor-pointer active:scale-95 border border-indigo-500/50"
                      title="Cipta & jadualkan sesi kuliah/amali baharu untuk subjek ini"
                    >
                      <CalendarPlus className="w-3.5 h-3.5 text-indigo-200" />
                      <span>+ Jadualkan Sesi</span>
                    </button>

                    {/* Secondary: Enrolled Students List */}
                    <button
                      type="button"
                      id={`btn-view-enrolled-${subject.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEnrolledModalSubject({
                          ...subject,
                          sections: effectiveSections
                        });
                        setEnrolledModalClass(effectiveSections.length === 1 ? effectiveSections[0] : 'ALL');
                        setIsEnrolledModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 hover:border-slate-600 text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
                      title="Lihat senarai pelajar bagi kelas yang mengambil subjek ini"
                    >
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{subjectEnrCount > 0 ? `${subjectEnrCount} Pelajar Berdaftar` : `Senarai Pelajar (${totalSubjectStudents || 'Kelas'})`}</span>
                    </button>

                    {/* Secondary: Generate QR */}
                    <button
                      type="button"
                      id={`btn-qr-enroll-subject-${subject.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setQrModalSubject(subject);
                        setQrModalClass(subject.sections?.[0] || 'DIA_4A');
                        setIsGenerateQRModalOpen(true);
                      }}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition-all cursor-pointer"
                      title="Jana Kod QR Pendaftaran Pelajar"
                    >
                      <QrCode className="w-4 h-4 text-indigo-400" />
                    </button>

                    {/* Destructive / Subdued: Delete Subject (Only visible for Admin / Lecturer) */}
                    {(isAdmin || activeLecturer) && (
                      <button
                        type="button"
                        id={`btn-delete-subject-${subject.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSubjectClick(subject);
                        }}
                        className="p-2.5 rounded-xl bg-slate-950/60 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 border border-slate-800/80 hover:border-rose-500/30 text-xs transition-all cursor-pointer"
                        title="Padam Maklumat Subjek Ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* ========================================================
                    SUB-KATEGORI: SESI & JADUAL KULIAH (HIDE SEBAGAI DEFAULT)
                    ======================================================== */}
                {isSubjectExpanded && (
                  <div className="p-4 sm:p-5 bg-slate-950/60 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      <span>SESI & JADUAL KELAS</span>
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {subjectSessions.length} sesi dicipta
                    </span>
                  </div>
                  {subjectSessions.length === 0 ? (
                    <div className="p-6 rounded-xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-3">
                      <div className="w-9 h-9 mx-auto rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <Play className="w-4 h-4 fill-emerald-400/20 text-emerald-400 ml-0.5" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-slate-300">
                          Belum ada sesi kuliah atau amali dibuka bagi subjek ini.
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Mulakan sesi pertama sekarang untuk jana rekod kehadiran dan imbasan QR.
                        </p>
                      </div>
                      <button
                        id={`btn-empty-start-session-${subject.id}`}
                        onClick={() => handleOpenAddSession(subject.id)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 hover:text-emerald-200 border border-emerald-500/40 hover:border-emerald-400/60 text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
                        title="Buka dan mulakan sesi kuliah pertama bagi subjek ini"
                      >
                        <Play className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
                        <span>Buka Sesi Kuliah Pertama</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Active Sessions Inside this Subject */}
                      {activeInSub.map((session) => {
                        const count = attendanceRecords.filter(
                          (r) => r.sessionId === session.id && r.status === 'PRESENT'
                        ).length;
                        const classTarget = session.className && session.className !== 'ALL' && session.className !== 'SEMUA'
                          ? session.className.split(',').reduce((sum, c) => sum + (studentCountByClass[c.trim().toUpperCase()] || 0), 0)
                          : totalSubjectStudents || availableStudents.length;

                        return (
                          <div
                            key={session.id}
                            className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                  🔴 LIVE SEKARANG
                                </span>
                                {session.className && (
                                  <span className="text-[11px] font-bold text-slate-300">
                                    Kelas {session.className}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-bold text-white">
                                  {session.sessionName}
                                </h4>
                                <button
                                  type="button"
                                  id={`btn-edit-active-session-${session.id}`}
                                  onClick={() => handleOpenEditRemark(session)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/15 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/30 text-[11px] font-semibold transition-all cursor-pointer"
                                  title="Ubah tajuk atau remark sesi ini"
                                >
                                  <Pencil className="w-3 h-3 text-indigo-400" />
                                  <span>Ubah Remark</span>
                                </button>
                              </div>
                              <div className="text-xs text-slate-400">
                                Kehadiran: <strong className="text-emerald-400">{count} / {classTarget} Hadir</strong>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                              <button
                                onClick={() => onOpenScannerForSession(session.id)}
                                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                                <span>Sambung Imbas</span>
                              </button>
                              <button
                                onClick={() => onSetSessionStatus(session.id, 'CLOSED')}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 text-xs font-medium border border-slate-700 transition-all cursor-pointer"
                              >
                                Tutup Sesi
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* LEVEL 2: SCHEDULED SESSIONS (READY TO SCAN) */}
                      {scheduledSessions.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
                            <span className="flex items-center gap-1.5 text-blue-400">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Sesi Terjadual & Sedia Diimbas ({scheduledSessions.length})</span>
                            </span>
                            {scheduledSessions.length > 1 && (
                              <span className="text-[11px] text-slate-500 font-normal">
                                Pilih kelas untuk mula imbasan
                              </span>
                            )}
                          </div>

                          <div className="space-y-2">
                            {scheduledSessions.map((session) => {
                              const classTarget = session.className && session.className !== 'ALL' && session.className !== 'SEMUA'
                                ? session.className.split(',').reduce((sum, c) => sum + (studentCountByClass[c.trim().toUpperCase()] || 0), 0)
                                : totalSubjectStudents || availableStudents.length;

                              return (
                                <div
                                  key={session.id}
                                  id={`card-scheduled-session-${session.id}`}
                                  className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                >
                                  <div className="space-y-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
                                        TERJADUAL
                                      </span>
                                      {session.className && (
                                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                                          Kelas {session.className}
                                        </span>
                                      )}
                                      <span className="text-xs text-slate-400">
                                        • Sasaran: {classTarget} Pelajar
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4 className="text-sm font-bold text-white truncate">
                                        {session.sessionName}
                                      </h4>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                                    <button
                                      id={`btn-open-session-${session.id}`}
                                      onClick={() => {
                                        onSetSessionStatus(session.id, 'OPEN');
                                        onOpenScannerForSession(session.id);
                                      }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-sm active:scale-95"
                                      title="Mula imbasan kehadiran bagi sesi ini"
                                    >
                                      <Play className="w-3.5 h-3.5 fill-current" />
                                      <span>Mula Imbas</span>
                                    </button>
                                    <button
                                      type="button"
                                      id={`btn-action-edit-session-${session.id}`}
                                      onClick={() => handleOpenEditRemark(session)}
                                      className="p-2 rounded-lg bg-slate-800 hover:bg-indigo-600/20 text-slate-400 hover:text-indigo-300 border border-slate-700 hover:border-indigo-500/40 transition-all cursor-pointer"
                                      title="Ubah tajuk atau remark sesi"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    {(isAdmin || activeLecturer) && (
                                      <button
                                        onClick={() => handleDeleteSessionClick(session)}
                                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-all cursor-pointer"
                                        title="Padam sesi ini"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* LEVEL 3: OTHER / PAST SESSIONS (COMPACT PRESENTATION WITH PROGRESSIVE DISCLOSURE) */}
                      {pastSessions.length > 0 && (
                        <div className="pt-2 border-t border-slate-800/80 space-y-2">
                          <button
                            type="button"
                            onClick={() => togglePastSessions(subject.id)}
                            className="text-xs font-semibold text-slate-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors cursor-pointer py-1"
                          >
                            <span>Rekod Sesi Terdahulu / Selesai ({pastSessions.length})</span>
                            {isPastExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {isPastExpanded && (
                            <div className="space-y-1.5 pt-1">
                              {pastSessions.map((session) => {
                                const count = attendanceRecords.filter(
                                  (r) => r.sessionId === session.id && r.status === 'PRESENT'
                                ).length;
                                const classTarget = session.className && session.className !== 'ALL' && session.className !== 'SEMUA'
                                  ? session.className.split(',').reduce((sum, c) => sum + (studentCountByClass[c.trim().toUpperCase()] || 0), 0)
                                  : totalSubjectStudents || availableStudents.length;

                                return (
                                  <div
                                    key={session.id}
                                    className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/60 flex items-center justify-between gap-3 text-xs"
                                  >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                                        {session.className || 'ALL'}
                                      </span>
                                      <span className="font-semibold text-slate-300 truncate">
                                        {session.sessionName}
                                      </span>
                                      <button
                                        type="button"
                                        id={`btn-edit-past-session-${session.id}`}
                                        onClick={() => handleOpenEditRemark(session)}
                                        className="p-1 rounded text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition-all cursor-pointer shrink-0"
                                        title="Ubah remark sesi"
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                      <span className="text-slate-500 text-[11px] shrink-0">
                                        {count > 0 ? `${count} / ${classTarget} Hadir` : 'Belum berlangsung'}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <button
                                        onClick={() => onSetSessionStatus(session.id, 'OPEN')}
                                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white text-[11px] font-semibold transition-all cursor-pointer"
                                        title="Aktifkan sesi ini dan mula imbasan"
                                      >
                                        Mula Imbas
                                      </button>
                                      {(isAdmin || activeLecturer) && (
                                        <button
                                          onClick={() => handleDeleteSessionClick(session)}
                                          className="p-1 text-slate-500 hover:text-rose-400 transition-all cursor-pointer"
                                          title="Padam sesi ini"
                                        >
                                          <Trash2 className="w-3 h-3" />
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
                  )}
                </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* CREATE SESSION MODAL */}
      {isCreateSessionOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4 text-white my-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CalendarPlus className="w-5 h-5 text-indigo-400" />
                  <span>Cipta & Jadualkan Sesi Kuliah Baharu</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Subjek: <span className="text-indigo-300 font-semibold">{subjects.find((s) => s.id === selectedSubjectId)?.code}</span> - {subjects.find((s) => s.id === selectedSubjectId)?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateSessionOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSession} className="space-y-4">
              {/* 1. Base Session Name & Quick Week Presets */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Nama Asas Sesi Kuliah *</span>
                  <span className="text-[11px] text-slate-400">Pilih atau taip minggu:</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kuliah Minggu 3 / Tutorial Bab 2"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                {/* Week Preset Quick Selectors */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[11px] text-slate-400 font-medium">Cadangan:</span>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((wk) => {
                    const presetVal = `Kuliah Minggu ${wk}`;
                    const isSelected = cleanBaseSessionName === presetVal;
                    return (
                      <button
                        key={`preset-wk-${wk}`}
                        type="button"
                        onClick={() => setNewSessionName(presetVal)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        Minggu {wk}
                      </button>
                    );
                  })}
                  {['Amali', 'Tutorial'].map((other) => {
                    const isSelected = cleanBaseSessionName === other;
                    return (
                      <button
                        key={`preset-${other}`}
                        type="button"
                        onClick={() => setNewSessionName(other)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        {other}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Meeting 1st ('a') & Meeting 2nd ('b') Harmonization */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-white">
                      Pertemuan Kuliah Mingguan (Meeting 1st & 2nd)
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => { setIncludeMeetingA(true); setIncludeMeetingB(true); }}
                      className="text-indigo-400 hover:text-indigo-300 hover:underline px-1 cursor-pointer font-medium"
                    >
                      Kedua-dua (a & b)
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={() => { setIncludeMeetingA(true); setIncludeMeetingB(false); }}
                      className="text-slate-400 hover:text-slate-300 hover:underline px-1 cursor-pointer font-medium"
                    >
                      Meeting 1st (a) Sahaja
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={() => { setIncludeMeetingA(false); setIncludeMeetingB(true); }}
                      className="text-slate-400 hover:text-slate-300 hover:underline px-1 cursor-pointer font-medium"
                    >
                      Meeting 2nd (b) Sahaja
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Setiap kelas mempunyai pertemuan 1st &amp; 2nd yang diwakili oleh remark <strong>a</strong> dan <strong>b</strong>. Tandakan sesi yang ingin dijana:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Card 1: Meeting 1st 'a' */}
                  <button
                    type="button"
                    id="btn-toggle-meeting-a"
                    onClick={() => setIncludeMeetingA((prev) => !prev)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                      includeMeetingA
                        ? 'bg-indigo-950/60 border-indigo-500 text-white ring-1 ring-indigo-500/40 shadow-sm'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 mt-0.5 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                        includeMeetingA
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'border-slate-700 bg-slate-900'
                      }`}
                    >
                      {includeMeetingA && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-white">Meeting 1st ("a")</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold">
                          {cleanBaseSessionName}a
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Pertemuan pertama dalam minggu
                      </p>
                    </div>
                  </button>

                  {/* Card 2: Meeting 2nd 'b' */}
                  <button
                    type="button"
                    id="btn-toggle-meeting-b"
                    onClick={() => setIncludeMeetingB((prev) => !prev)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                      includeMeetingB
                        ? 'bg-indigo-950/60 border-indigo-500 text-white ring-1 ring-indigo-500/40 shadow-sm'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 mt-0.5 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                        includeMeetingB
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'border-slate-700 bg-slate-900'
                      }`}
                    >
                      {includeMeetingB && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-white">Meeting 2nd ("b")</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold">
                          {cleanBaseSessionName}b
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Pertemuan kedua dalam minggu
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* 3. Per-Class Generation Mode */}
              <button
                type="button"
                id="btn-toggle-generate-per-class"
                onClick={() => setGeneratePerClass((prev) => !prev)}
                className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                  generatePerClass
                    ? 'bg-emerald-950/30 border-emerald-500/50 text-white shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 mt-0.5 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                    generatePerClass
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'border-slate-700 bg-slate-900'
                  }`}
                >
                  {generatePerClass && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-white">
                      Hasilkan sesi berasingan mengikut kelas masing-masing
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Disyorkan
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {generatePerClass
                      ? `Menjana sesi berasingan secara automatik bagi setiap kelas (${newSessionClasses.length} kelas ditandakan) untuk pengasingan rekod kehadiran yang tepat.`
                      : 'Menggabungkan semua kelas ke dalam satu sesi kuliah serentak (ALL).'}
                  </p>
                </div>
              </button>

              {/* 4. Target Classes Checklist */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                    <span>Kelas Sasaran Yang Terlibat *</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                      {newSessionClasses.length} kelas ditandakan
                    </span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      id="btn-select-all-classes-session"
                      onClick={handleSelectAllSessionClasses}
                      className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 hover:underline px-1.5 py-0.5 rounded transition cursor-pointer"
                    >
                      Pilih Semua
                    </button>
                    <span className="text-slate-600 text-xs">|</span>
                    <button
                      type="button"
                      id="btn-clear-all-classes-session"
                      onClick={handleClearSessionClasses}
                      className="text-[11px] font-semibold text-slate-400 hover:text-rose-400 px-1.5 py-0.5 rounded transition cursor-pointer"
                    >
                      Kosongkan
                    </button>
                    <span className="text-slate-600 text-xs">|</span>
                    <button
                      type="button"
                      id="btn-manage-subject-classes-session"
                      onClick={() => {
                        setIsCreateSessionOpen(false);
                        setIsManageSubjectsModalOpen(true);
                      }}
                      className="text-[11px] font-semibold text-teal-400 hover:text-teal-300 hover:underline px-1.5 py-0.5 rounded transition cursor-pointer"
                      title="Urus dan buang/tambah kelas bagi subjek ini"
                    >
                      Urus Kelas Subjek
                    </button>
                  </div>
                </div>

                {/* Interactive Checkbox Tick Grid with Quick Remove */}
                {classActionNotice && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{classActionNotice}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {targetClassesForModal.map((sec, secIdx) => {
                    const isChecked = newSessionClasses.includes(sec);
                    const count = studentCountByClass[sec.toUpperCase()] || 0;
                    return (
                      <div
                        key={`tick-class-wrap-${sec}-${secIdx}`}
                        className="flex items-center gap-1"
                      >
                        <button
                          id={`btn-tick-class-${sec}`}
                          type="button"
                          onClick={() => handleToggleSessionClass(sec)}
                          className={`flex-1 flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer min-w-0 ${
                            isChecked
                              ? 'bg-indigo-950/60 border-indigo-500 shadow-sm shadow-indigo-900/40 text-white ring-1 ring-indigo-500/50'
                              : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                                isChecked
                                  ? 'bg-indigo-600 border-indigo-500 text-white'
                                  : 'border-slate-700 bg-slate-900'
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className={`text-xs font-bold truncate ${isChecked ? 'text-white' : 'text-slate-300'}`}>
                              Kelas {sec}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                              isChecked
                                ? 'bg-indigo-500/25 text-indigo-200 border-indigo-500/40'
                                : 'bg-slate-900 text-slate-500 border-slate-800'
                            }`}
                          >
                            {count} Pelajar
                          </span>
                        </button>
                        <button
                          type="button"
                          id={`btn-remove-section-${sec}`}
                          onClick={() => handleOpenRemoveClassPrompt(sec)}
                          className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-rose-500/60 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 active:scale-95 transition cursor-pointer shrink-0 shadow-sm"
                          title={`Padam / Keluarkan Kelas ${sec}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {newSessionClasses.length === 0 && (
                  <div className="px-3 py-2 rounded-xl bg-amber-950/40 border border-amber-500/40 text-[11px] text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Sila tandakan (tick) sekurang-kurangnya satu kelas untuk sesi ini.</span>
                  </div>
                )}
              </div>

              {/* 5. Live Preview of Sessions to be Generated */}
              {previewGeneratedSessions.length > 0 && (
                <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-indigo-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Ringkasan: {previewGeneratedSessions.length} Sesi Kelas Akan Dijana</span>
                    </span>
                    <span className="text-[11px] text-indigo-300 font-mono">
                      {generatePerClass ? `${newSessionClasses.length} Kelas × ${meetingSuffixes.length} Pertemuan` : `1 Sesi Gabungan`}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {previewGeneratedSessions.map((ps, idx) => (
                      <span
                        key={`prev-ses-${idx}`}
                        className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-indigo-900/60 border border-indigo-500/40 text-indigo-100 font-medium"
                      >
                        <span className="font-bold">{ps.sessionName}</span>
                        <span className="text-[10px] px-1 py-0.2 rounded bg-indigo-950 text-indigo-300 font-mono">
                          {ps.className}
                        </span>
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-indigo-500/20">
                    <span>Jumlah Pelajar Sasaran:</span>
                    <span className="font-bold text-emerald-400 font-mono">
                      {totalStudentsInTargetClasses} Pelajar ({newSessionClasses.length} Kelas)
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateSessionOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={newSessionClasses.length === 0 || previewGeneratedSessions.length === 0}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CalendarPlus className="w-4 h-4" />
                  <span>Jana & Cipta {previewGeneratedSessions.length} Sesi Kelas</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROJECTOR / BIG SCREEN QR MODAL */}
      {projectorSession && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-8 shadow-2xl text-center space-y-6 text-white">
            <div className="flex justify-end">
              <button
                onClick={() => setProjectorSession(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/20 text-indigo-300 font-bold">
                KOD QR KEHADIRAN KELAS
              </span>
              <h3 className="text-xl font-extrabold text-white tracking-tight mt-2">
                {projectorSession.sessionName}
              </h3>
              <p className="text-xs text-slate-400">
                {projectorSession.subjectName || projectorSession.activityName} {projectorSession.className ? ` • Kelas ${projectorSession.className}` : ''}
              </p>
            </div>

            {/* BIG QR CODE */}
            <div className="p-6 rounded-2xl bg-white flex items-center justify-center inline-block shadow-2xl mx-auto">
              <QRCodeSVG
                value={`SESSION|${projectorSession.id}`}
                size={220}
                level="H"
                includeMargin={false}
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Halakan Kamera Aplikasi Untuk Imbas Kehadiran
              </div>
              <p className="text-[11px] text-slate-400">
                Pelajar imbas QR di atas, atau pensyarah imbas QR pada kad pelajar.
              </p>
            </div>

            <button
              onClick={() => {
                onOpenScannerForSession(projectorSession.id);
                setProjectorSession(null);
              }}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              Buka Kamera Pengimbas Sesi Ini
            </button>
          </div>
        </div>
      )}

      {/* LECTURER GENERATE CLASS ENROLLMENT QR MODAL */}
      <GenerateEnrollmentQRModal
        isOpen={isGenerateQRModalOpen}
        onClose={() => setIsGenerateQRModalOpen(false)}
        subjects={subjects}
        initialSubject={qrModalSubject}
        initialClass={qrModalClass}
        activeLecturer={activeLecturer}
        enrollments={activeEnrollments}
        students={availableStudents}
        onOpenSelfRegistrationTest={(context) => {
          setIsGenerateQRModalOpen(false);
          if (onOpenSelfRegistrationTest) {
            onOpenSelfRegistrationTest(context);
          }
        }}
      />

      {/* VIEW & MANAGE ENROLLED STUDENTS MODAL */}
      <EnrolledStudentsModal
        isOpen={isEnrolledModalOpen}
        onClose={() => setIsEnrolledModalOpen(false)}
        subject={enrolledModalSubject}
        className={enrolledModalClass}
        enrollments={activeEnrollments}
        students={availableStudents}
        onOpenGenerateQR={(subj, cls) => {
          setIsEnrolledModalOpen(false);
          setQrModalSubject(subj);
          if (cls) setQrModalClass(cls);
          setIsGenerateQRModalOpen(true);
        }}
      />

      {/* LECTURER MANAGE SUBJECTS MODAL */}
      {activeLecturer && (
        <LecturerManageSubjectsModal
          isOpen={isManageSubjectsModalOpen}
          onClose={() => setIsManageSubjectsModalOpen(false)}
          lecturer={activeLecturer}
          allSubjects={subjects}
          onSaved={() => {
            setIsManageSubjectsModalOpen(false);
            setRefreshKey((prev) => prev + 1);
          }}
        />
      )}

      {/* ========================================================
          MODAL PENGESAHAN PADAM (SUBJEK & SESI)
          Menggantikan window.confirm untuk sokongan 100% iframe
          ======================================================== */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {deleteConfirmation.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {deleteConfirmation.detail}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>Amaran: Tindakan ini adalah kekal.</span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                id="btn-cancel-delete"
                onClick={() => setDeleteConfirmation(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                id="btn-confirm-delete"
                onClick={handleExecuteDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Padam Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL PENGESAHAN PADAM / KELUARKAN KELAS
          100% iframe compatible - Tiada window.confirm
          ======================================================== */}
      {classToDeletePrompt && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Keluarkan / Padam Kelas {classToDeletePrompt.className}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Sila pilih tindakan bagi Kelas <span className="text-white font-semibold">{classToDeletePrompt.className}</span>:
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Subjek Terpilih:</span>
                <span className="font-semibold text-slate-200 text-right truncate max-w-[210px]">
                  {classToDeletePrompt.subjectName}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Pelajar Berdaftar:</span>
                <span className="font-semibold text-indigo-400 font-mono">
                  {classToDeletePrompt.studentCount} Orang Pelajar
                </span>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              {/* Option 1: Remove from Subject only */}
              <button
                type="button"
                id="btn-confirm-remove-from-subject"
                onClick={handleConfirmRemoveFromSubject}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/40 text-left transition cursor-pointer group"
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-indigo-300 group-hover:text-indigo-200">
                    Keluarkan daripada Subjek Ini Sahaja
                  </div>
                  <div className="text-[11px] text-slate-400 leading-tight">
                    Kelas {classToDeletePrompt.className} tidak lagi akan muncul dalam senarai sesi kuliah bagi subjek ini.
                  </div>
                </div>
              </button>

              {/* Option 2: Delete globally (for accidentally created class) */}
              <button
                type="button"
                id="btn-confirm-delete-class-globally"
                onClick={handleConfirmDeleteClassGlobally}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-left transition cursor-pointer group"
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-rose-300 group-hover:text-rose-200 flex items-center gap-1.5">
                    <span>Padam Sepenuhnya dari Sistem Kolej</span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold">Disyorkan</span>
                  </div>
                  <div className="text-[11px] text-slate-400 leading-tight">
                    Jika kelas ini wujud secara tidak sengaja, pilihan ini akan memadamkannya daripada semua subjek, pensyarah & jadual.
                  </div>
                </div>
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                id="btn-cancel-remove-class-modal"
                onClick={() => setClassToDeletePrompt(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Kemaskini Remark / Tajuk Sesi Kuliah */}
      <EditSessionRemarkModal
        isOpen={isEditModalOpen}
        session={editingSession}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingSession(null);
        }}
        onSave={handleSaveEditedSession}
      />
    </div>
  );
};
