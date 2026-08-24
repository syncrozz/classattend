import React, { useState, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Subject,
  AttendanceSession,
  AttendanceRecord,
  Lecturer,
  Student,
  EventStatus
} from '../types';
import { getClassBadgeColor } from '../utils/studentUtils';
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
  Upload
} from 'lucide-react';
import { attendanceEngine } from '../services/attendanceEngine';

interface ClassManagementViewProps {
  subjects: Subject[];
  sessions: AttendanceSession[];
  attendanceRecords: AttendanceRecord[];
  students?: Student[];
  lecturers?: Lecturer[];
  activeLecturer: Lecturer | null;
  isAdmin: boolean;
  onSetSessionStatus: (sessionId: string, newStatus: EventStatus) => void;
  onCreateSubject: (subject: Subject) => void;
  onCreateSession: (session: AttendanceSession) => void;
  onDeleteSession?: (sessionId: string) => void;
  onDeleteSubject?: (subjectId: string) => void;
  onOpenScannerForSession: (sessionId: string) => void;
  onRequestAdminAccess: (actionName?: string) => void;
  onOpenCSVImport?: () => void;
  onNavigateToStudents?: () => void;
}

export const EventManagementView: React.FC<ClassManagementViewProps> = ({
  subjects,
  sessions,
  attendanceRecords,
  students: propStudents,
  lecturers: propLecturers,
  activeLecturer,
  isAdmin,
  onSetSessionStatus,
  onCreateSubject,
  onCreateSession,
  onDeleteSession,
  onDeleteSubject,
  onOpenScannerForSession,
  onRequestAdminAccess,
  onOpenCSVImport,
  onNavigateToStudents
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');

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
  const [isCreateSubjectOpen, setIsCreateSubjectOpen] = useState<boolean>(false);
  const [isCreateSessionOpen, setIsCreateSessionOpen] = useState<boolean>(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [projectorSession, setProjectorSession] = useState<AttendanceSession | null>(null);

  // New Subject Form State
  const [newSubCode, setNewSubCode] = useState<string>('');
  const [newSubName, setNewSubName] = useState<string>('');
  const [newSubLecturer, setNewSubLecturer] = useState<string>(
    activeLecturer?.name || (availableLecturers[0]?.name) || 'PENSYARAH'
  );
  const [newSubSections, setNewSubSections] = useState<string[]>([]);
  const [newSubDesc, setNewSubDesc] = useState<string>('');

  // New Session Form State
  const [newSessionName, setNewSessionName] = useState<string>('');
  const [newSessionClass, setNewSessionClass] = useState<string>('');

  // Filtered Subjects
  const filteredSubjects = subjects.filter((sub) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      sub.code.toLowerCase().includes(q) ||
      sub.name.toLowerCase().includes(q) ||
      (sub.lecturerName && sub.lecturerName.toLowerCase().includes(q)) ||
      (sub.sections && sub.sections.some((sec) => sec.toLowerCase().includes(q)))
    );
  });

  // Handle Submit New Subject
  const handleSubmitSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubCode.trim() || !newSubName.trim()) return;

    if (classesWithData.length === 0) {
      alert('Tiada data kelas pelajar. Sila muat naik fail CSV data pelajar terlebih dahulu.');
      return;
    }

    if (newSubSections.length === 0) {
      alert('Sila pilih sekurang-kurangnya satu kelas yang mengambil subjek ini.');
      return;
    }

    const matchedLec = availableLecturers.find((l) => l.name === newSubLecturer) || activeLecturer;

    const newSub: Subject = {
      id: `SUB-${newSubCode.trim().toUpperCase().replace(/\s+/g, '')}`,
      code: newSubCode.trim().toUpperCase(),
      name: newSubName.trim(),
      lecturerId: matchedLec?.id || activeLecturer?.id || 'LEC-001',
      lecturerName: newSubLecturer.trim() || matchedLec?.name || activeLecturer?.name || 'Pensyarah',
      department: matchedLec?.department || 'Perakaunan',
      sections: newSubSections,
      description: newSubDesc.trim(),
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    onCreateSubject(newSub);
    setIsCreateSubjectOpen(false);
    setNewSubCode('');
    setNewSubName('');
    setNewSubDesc('');
    setNewSubSections(classesWithData.slice(0, 1));
  };

  // Open Create Session modal for specific subject
  const handleOpenAddSession = (subId: string) => {
    const sub = subjects.find((s) => s.id === subId);
    setSelectedSubjectId(subId);
    if (sub) {
      const existingSubSessions = sessions.filter((s) => s.subjectId === subId || s.activityId === subId);
      const nextWeekNum = existingSubSessions.length + 1;
      setNewSessionName(`Kuliah Minggu ${nextWeekNum}`);
      const validClass = (sub.sections || []).find((sec) => classesWithData.includes(sec)) || sub.sections[0] || classesWithData[0] || 'ALL';
      setNewSessionClass(validClass);
    }
    setIsCreateSessionOpen(true);
  };

  // Handle Submit New Session
  const handleSubmitSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim() || !selectedSubjectId) return;

    const parentSub = subjects.find((s) => s.id === selectedSubjectId);

    const newSes: AttendanceSession = {
      id: `SES-${Date.now().toString(36).toUpperCase()}`,
      activityId: selectedSubjectId,
      activityName: parentSub ? `[${parentSub.code}] ${parentSub.name}` : 'Kelas',
      subjectId: selectedSubjectId,
      subjectCode: parentSub?.code || '',
      subjectName: parentSub?.name || '',
      category: 'CLASS',
      sessionName: newSessionName.trim(),
      date: new Date().toISOString().split('T')[0],
      startTime: '',
      endTime: '',
      status: 'OPEN',
      attendanceMethod: 'QR',
      organizer: parentSub?.lecturerName || activeLecturer?.name || 'Pensyarah',
      lecturerName: parentSub?.lecturerName || activeLecturer?.name || 'Pensyarah',
      className: newSessionClass,
      createdAt: new Date().toISOString()
    };

    onCreateSession(newSes);
    setIsCreateSessionOpen(false);
  };

  // Handle Delete Session
  const handleDeleteSessionClick = (session: AttendanceSession) => {
    if (!isAdmin) {
      onRequestAdminAccess(`Padam Sesi Kelas (${session.sessionName})`);
      return;
    }
    const confirmed = window.confirm(
      `Adakah anda pasti untuk MEMADAM sesi kelas "${session.sessionName}"?`
    );
    if (confirmed && onDeleteSession) {
      onDeleteSession(session.id);
    }
  };

  // Handle Delete Subject
  const handleDeleteSubjectClick = (subject: Subject) => {
    if (!isAdmin) {
      onRequestAdminAccess(`Padam Subjek (${subject.code})`);
      return;
    }
    const confirmed = window.confirm(
      `Adakah anda pasti untuk MEMADAM subjek "${subject.code} - ${subject.name}" dan semua rekod sesi kelasnya?`
    );
    if (confirmed && onDeleteSubject) {
      onDeleteSubject(subject.id);
    }
  };

  const toggleSectionSelect = (sec: string) => {
    if (newSubSections.includes(sec)) {
      if (newSubSections.length > 1) {
        setNewSubSections(newSubSections.filter((s) => s !== sec));
      }
    } else {
      setNewSubSections([...newSubSections, sec]);
    }
  };

  const handleOpenCreateSubjectModal = () => {
    if (activeLecturer) {
      setNewSubLecturer(activeLecturer.name);
    }
    if (classesWithData.length > 0 && newSubSections.length === 0) {
      setNewSubSections(classesWithData.slice(0, 1));
    }
    setIsCreateSubjectOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Search Bar */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                PENGURUSAN KELAS & SUBJEK
              </span>
              {activeLecturer && (
                <span className="text-[11px] text-slate-300 font-mono flex items-center gap-1">
                  <User className="w-3 h-3 text-indigo-400" />
                  {activeLecturer.name}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight mt-1">
              Subjek & Sesi Kuliah
            </h2>
            <p className="text-xs text-slate-400">
              Urus subjek pensyarah, kelas yang diajar, dan buka sesi imbasan mingguan.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Search Box */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Cari kod atau nama subjek..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              id="btn-create-new-subject"
              onClick={handleOpenCreateSubjectModal}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Daftar Subjek Baharu</span>
            </button>
          </div>
        </div>
      </div>

      {/* SUBJECTS LIST WITH NESTED SESSIONS */}
      <div className="space-y-4">
        {filteredSubjects.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/60 rounded-2xl border border-slate-800 p-6 flex flex-col items-center justify-center space-y-3">
            <BookOpen className="w-10 h-10 text-indigo-500/40" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">Belum Ada Subjek Didaftarkan</h4>
              <p className="text-xs text-slate-400 max-w-md">
                Gunakan butang <strong>"Daftar Subjek Baharu"</strong> di bahagian atas untuk mula mendaftarkan subjek dan membuka sesi kuliah.
              </p>
            </div>
          </div>
        ) : (
          filteredSubjects.map((subject) => {
            const subjectSessions = sessions.filter(
              (s) => s.subjectId === subject.id || s.activityId === subject.id
            );

            return (
              <div
                key={subject.id}
                className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-lg"
              >
                {/* Subject Header */}
                <div className="p-4 sm:p-5 bg-slate-900 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {subject.code}
                      </span>
                      {Array.from(new Set<string>(subject.sections || [])).map((sec, secIdx) => (
                        <span
                          key={`${subject.id}-sec-${sec}-${secIdx}`}
                          className={`text-[10px] px-2 py-0.5 rounded border font-bold ${getClassBadgeColor(sec)}`}
                        >
                          {sec}
                        </span>
                      ))}
                      <span className="text-xs text-slate-400">
                        {subject.department || 'Perakaunan'}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      {subject.name}
                    </h3>

                    {subject.description && (
                      <p className="text-xs text-slate-300 max-w-2xl">{subject.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 pt-1">
                      <span className="flex items-center gap-1 text-slate-300">
                        <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Pensyarah: <strong className="text-white">{subject.lecturerName}</strong></span>
                      </span>
                      <span className="flex items-center gap-1 text-indigo-300">
                        <BookMarked className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{subjectSessions.length} Sesi Kuliah Terjadual</span>
                      </span>
                    </div>
                  </div>

                  {/* Subject Header Right Actions: Delete Subject */}
                  <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                    <button
                      id={`btn-delete-subject-${subject.id}`}
                      onClick={() => handleDeleteSubjectClick(subject)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/60 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 text-xs font-medium transition-all cursor-pointer"
                      title="Padam Maklumat Subjek Ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Padam Subjek</span>
                    </button>
                  </div>
                </div>

                {/* SESSIONS SUB-LIST */}
                <div className="p-4 sm:p-5 bg-slate-950/40 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Sesi Kehadiran Kelas Mingguan
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold border border-slate-700">
                        {subjectSessions.length} Sesi
                      </span>
                    </div>

                    {/* Moved 'Buka Sesi Kelas' here directly with the session list */}
                    <button
                      id={`btn-add-session-${subject.id}`}
                      onClick={() => handleOpenAddSession(subject.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Buka Sesi Kelas</span>
                    </button>
                  </div>

                  {subjectSessions.length === 0 ? (
                    <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center space-y-2.5">
                      <p className="text-xs text-slate-400">
                        Belum ada sesi kuliah mingguan dibuka bagi subjek ini.
                      </p>
                      <button
                        onClick={() => handleOpenAddSession(subject.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Buka Sesi Kelas Pertama</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {subjectSessions.map((session) => {
                        const count = attendanceRecords.filter(
                          (r) => r.sessionId === session.id && r.status === 'PRESENT'
                        ).length;

                        const isOpen = session.status === 'OPEN';

                        return (
                          <div
                            key={session.id}
                            className={`p-4 rounded-xl border transition-all ${
                              isOpen
                                ? 'bg-emerald-950/20 border-emerald-500/40 shadow-md shadow-emerald-500/10'
                                : 'bg-slate-950/80 border-slate-800'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                                      isOpen
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                                        : 'bg-blue-950/40 text-blue-300 border border-blue-800/40'
                                    }`}
                                  >
                                    {isOpen ? '🟢 KELAS DIBUKA' : '🔵 SESI TERSEDIA'}
                                  </span>

                                  {session.className && (
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                                      Kelas {session.className}
                                    </span>
                                  )}
                                </div>

                                <h4 className="text-sm font-bold text-white tracking-tight">
                                  {session.sessionName}
                                </h4>

                                <div className="text-xs text-slate-400 space-y-0.5 pt-0.5">
                                  <div className="text-[11px] text-slate-300">
                                    Pensyarah: {session.lecturerName || subject.lecturerName}
                                  </div>
                                </div>
                              </div>

                              {/* Attendee Count Badge */}
                              <div className="text-right shrink-0">
                                <div className="text-lg font-extrabold text-white">{count}</div>
                                <div className="text-[10px] text-slate-400">Pelajar Hadir</div>
                              </div>
                            </div>

                            {/* Action Row for this Session */}
                            <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                              {/* Left Controls: Open/Close & Delete */}
                              <div className="flex items-center gap-2">
                                {isOpen ? (
                                  <button
                                    id={`btn-close-session-${session.id}`}
                                    onClick={() => onSetSessionStatus(session.id, 'CLOSED')}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-rose-500/20 text-emerald-300 hover:text-rose-300 text-xs font-semibold border border-emerald-500/40 hover:border-rose-500/40 transition-all cursor-pointer group"
                                    title="Sesi sedang aktif (Hijau). Klik untuk tutup kelas."
                                  >
                                    <Square className="w-3.5 h-3.5 text-emerald-400 group-hover:text-rose-400" />
                                    <span>🟢 Tutup Kelas</span>
                                  </button>
                                ) : (
                                  <button
                                    id={`btn-open-session-${session.id}`}
                                    onClick={() => onSetSessionStatus(session.id, 'OPEN')}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white text-xs font-semibold border border-blue-500/30 transition-all cursor-pointer"
                                    title="Buka sesi kelas ini untuk pengimbasan"
                                  >
                                    <Play className="w-3.5 h-3.5 text-blue-400" />
                                    <span>Buka Kelas Ini</span>
                                  </button>
                                )}

                                <button
                                  id={`btn-delete-session-${session.id}`}
                                  onClick={() => handleDeleteSessionClick(session)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 text-xs font-semibold border border-slate-800 hover:border-rose-500/40 transition-all cursor-pointer"
                                  title="Padam sesi kelas ini"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Padam</span>
                                </button>
                              </div>

                              {/* Right Controls: Projector & Scanner */}
                              <div className="flex items-center gap-2">
                                <button
                                  id={`btn-projector-${session.id}`}
                                  onClick={() => setProjectorSession(session)}
                                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-indigo-300 text-xs transition-all cursor-pointer"
                                  title="Papar QR Sesi di Projektor Skrin Kelas"
                                >
                                  <Maximize2 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  id={`btn-scan-session-${session.id}`}
                                  onClick={() => onOpenScannerForSession(session.id)}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-md shadow-indigo-600/20"
                                >
                                  <QrCode className="w-3.5 h-3.5" />
                                  <span>Imbas Kelas</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE SUBJECT MODAL */}
      {isCreateSubjectOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <span>Daftar Subjek & Kelas Baharu</span>
              </h3>
              <button
                onClick={() => setIsCreateSubjectOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSubject} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="text-xs font-semibold text-slate-300">Kod Subjek *</label>
                  <input
                    type="text"
                    required
                    placeholder="cth: FAR210"
                    value={newSubCode}
                    onChange={(e) => setNewSubCode(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono uppercase font-bold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-300">Nama Subjek / Kursus *</label>
                  <input
                    type="text"
                    required
                    placeholder="cth: Financial Accounting 2"
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Pensyarah Mengajar *</label>
                <select
                  value={newSubLecturer}
                  onChange={(e) => setNewSubLecturer(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {availableLecturers.map((lec) => (
                    <option key={lec.id} value={lec.name}>
                      {lec.name} {lec.role === 'ADMIN' ? '(Pentadbir)' : ''} - {lec.department || 'Pensyarah'}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Dipilih terus daripada senarai pensyarah berdaftar dalam pangkalan data.
                </p>
              </div>

              {/* Section Toggles (Only classes with actual student data in database) */}
              <div>
                {classesWithData.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-amber-300">
                          Tiada Data Kelas Pelajar Dijumpai
                        </div>
                        <p className="text-[11px] leading-relaxed text-slate-300">
                          Sebelum mendaftarkan subjek baharu, pensyarah/pentadbir perlu memuat naik senarai data pelajar mengikut kelas terlebih dahulu melalui fail CSV di tab <strong>Pangkalan Data</strong>.
                        </p>
                      </div>
                    </div>
                    {onOpenCSVImport && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreateSubjectOpen(false);
                          onOpenCSVImport();
                        }}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Muat Naik CSV Data Pelajar Sekarang</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-300">
                        Kelas Terlibat (Mempunyai Data Pelajar) *
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {newSubSections.length} kelas dipilih
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {classesWithData.map((sec) => {
                        const isSelected = newSubSections.includes(sec);
                        const count = studentCountByClass[sec] || 0;
                        return (
                          <button
                            key={`new-sub-sec-${sec}`}
                            type="button"
                            onClick={() => toggleSectionSelect(sec)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/50'
                                : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <span>Kelas {sec}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                                isSelected
                                  ? 'bg-indigo-900/80 text-indigo-100'
                                  : 'bg-slate-800 text-emerald-400'
                              }`}
                            >
                              {count} Pelajar
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                      <span>💡 Hanya kelas yang mempunyai senarai data pelajar berdaftar dipaparkan.</span>
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Catatan Tambahan (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Catatan kursus atau silibus..."
                  value={newSubDesc}
                  onChange={(e) => setNewSubDesc(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateSubjectOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={classesWithData.length === 0 || newSubSections.length === 0}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-lg transition-all ${
                    classesWithData.length === 0 || newSubSections.length === 0
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 cursor-pointer'
                  }`}
                >
                  Daftar Subjek
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE SESSION MODAL */}
      {isCreateSessionOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Buka Sesi Kuliah / Kelas Baharu</h3>
                <p className="text-xs text-slate-400">
                  Subjek: {subjects.find((s) => s.id === selectedSubjectId)?.code} - {subjects.find((s) => s.id === selectedSubjectId)?.name}
                </p>
              </div>
              <button
                onClick={() => setIsCreateSessionOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSession} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300">Nama Sesi Kelas *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kuliah Minggu 3 / Tutorial Bab 2"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Kelas Sasaran *</label>
                <select
                  value={newSessionClass}
                  onChange={(e) => setNewSessionClass(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer font-medium"
                >
                  {/* Prioritize sections assigned to selected subject, then all available sections with student data */}
                  {Array.from(new Set([
                    ...(subjects.find((s) => s.id === selectedSubjectId)?.sections || []),
                    ...classesWithData
                  ])).map((sec) => (
                    <option key={`session-target-class-${sec}`} value={sec}>
                      Kelas {sec} {studentCountByClass[sec] ? `(${studentCountByClass[sec]} Pelajar)` : ''}
                    </option>
                  ))}
                  <option value="ALL">Semua Kelas (Gabungan)</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px]">
                💡 Sesi kelas ini akan dibuka secara automatik (OPEN) dan sedia untuk diimbas serta-merta oleh pelajar mengikut kelas yang dipilih.
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateSessionOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  Buka Sesi Kehadiran
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
    </div>
  );
};
