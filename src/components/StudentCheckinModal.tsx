import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import {
  Student,
  AttendanceSession,
  AttendanceRecord,
  OFFICIAL_STUDENT_ATTEND_ICON
} from '../types';
import { attendanceEngine } from '../services/attendanceEngine';
import { soundService } from '../services/soundService';
import { getClassBadgeColor, getInitials, getStudentColor } from '../utils/studentUtils';
import {
  GraduationCap,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Camera,
  CameraOff,
  User,
  BookOpen,
  UserCheck,
  ArrowRight,
  Clock,
  RefreshCw,
  Search,
  Check,
  X,
  Sparkles,
  ShieldCheck,
  FileCheck
} from 'lucide-react';

export interface StudentCheckinContext {
  sessionId: string;
  sessionName?: string;
  subjectCode: string;
  subjectName?: string;
  className: string;
  lecturerName?: string;
  date?: string;
}

interface StudentCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: StudentCheckinContext | null;
  sessions: AttendanceSession[];
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  onSuccess?: (student: Student, record: AttendanceRecord) => void;
  onViewMyAttendance?: (studentId: string) => void;
}

export const StudentCheckinModal: React.FC<StudentCheckinModalProps> = ({
  isOpen,
  onClose,
  context,
  sessions,
  students,
  attendanceRecords,
  onSuccess,
  onViewMyAttendance
}) => {
  // Saved Student Identity from localStorage
  const [savedStudentId, setSavedStudentId] = useState<string>(() => {
    try {
      return localStorage.getItem('classattend_saved_student_id') || '';
    } catch {
      return '';
    }
  });

  const [inputStudentId, setInputStudentId] = useState<string>('');
  const [registerName, setRegisterName] = useState<string>('');
  const [registerClass, setRegisterClass] = useState<string>(context?.className || 'DIA_4A');
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  
  // Camera Scanner inside modal
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  // Submission / Verification States
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitStatus, setSubmitStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS' | 'DUPLICATE' | 'CLOSED' | 'INVALID' | 'ERROR'>('IDLE');
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const [verifiedRecord, setVerifiedRecord] = useState<AttendanceRecord | null>(null);
  const [verifiedStudent, setVerifiedStudent] = useState<Student | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const qrScannerId = 'student-self-qr-reader';

  // Find active session matching context
  const targetSession = sessions.find((s) => s.id === context?.sessionId) ||
    sessions.find((s) => s.status === 'OPEN' && (!context?.subjectCode || s.subjectCode === context.subjectCode)) ||
    sessions.find((s) => s.status === 'OPEN') ||
    null;

  // Sync register class with context
  useEffect(() => {
    if (context?.className) {
      setRegisterClass(context.className);
    }
  }, [context]);

  // If savedStudentId exists, resolve active student object
  const activeSavedStudent = savedStudentId
    ? students.find((s) => s.studentId.toUpperCase() === savedStudentId.toUpperCase() || s.id.toUpperCase() === savedStudentId.toUpperCase())
    : null;

  // Check initial state when modal opens
  useEffect(() => {
    if (!isOpen) {
      setIsScannerOpen(false);
      setSubmitStatus('IDLE');
      setFeedbackMessage('');
      return;
    }

    // Check if session is closed
    if (targetSession && targetSession.status !== 'OPEN') {
      setSubmitStatus('CLOSED');
      setFeedbackMessage('Rekod kehadiran untuk sesi ini tidak lagi dibuka oleh pensyarah.');
      return;
    }

    // Check if returning student already recorded attendance for this session
    if (activeSavedStudent && targetSession) {
      const existing = attendanceRecords.find(
        (r) => r.sessionId === targetSession.id && r.studentId === activeSavedStudent.id && r.status === 'PRESENT'
      );
      if (existing) {
        setSubmitStatus('DUPLICATE');
        setVerifiedStudent(activeSavedStudent);
        setVerifiedRecord(existing);
        const recordedTime = new Date(existing.timestamp).toLocaleTimeString('ms-MY', {
          hour: '2-digit',
          minute: '2-digit'
        });
        setFeedbackMessage(`Anda telah direkodkan hadir pada ${recordedTime}.`);
      }
    }
  }, [isOpen, targetSession, activeSavedStudent, attendanceRecords]);

  // Clean up scanner on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(console.warn);
      }
    };
  }, []);

  if (!isOpen) return null;

  // Process Attendance Recording for a specific student
  const executeAttendance = async (studentToRecord: Student) => {
    if (!targetSession) {
      setSubmitStatus('INVALID');
      setFeedbackMessage('Sesi kelas tidak sah atau tidak ditemui.');
      return;
    }

    if (targetSession.status !== 'OPEN') {
      setSubmitStatus('CLOSED');
      setFeedbackMessage('Rekod kehadiran untuk sesi ini tidak lagi dibuka.');
      return;
    }

    // Check duplicate
    const existing = attendanceRecords.find(
      (r) => r.sessionId === targetSession.id && r.studentId === studentToRecord.id && r.status === 'PRESENT'
    );
    if (existing) {
      setSubmitStatus('DUPLICATE');
      setVerifiedStudent(studentToRecord);
      setVerifiedRecord(existing);
      const recordedTime = new Date(existing.timestamp).toLocaleTimeString('ms-MY', {
        hour: '2-digit',
        minute: '2-digit'
      });
      setFeedbackMessage(`Anda telah direkodkan hadir pada ${recordedTime}.`);
      soundService.playDuplicate();
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('PROCESSING');

    try {
      // Process scan through authoritative attendanceEngine
      const result = attendanceEngine.processScan(studentToRecord.studentId, 'QR', targetSession.id);

      if (result.success && result.record) {
        // Save student ID to localStorage for zero-friction next time
        try {
          localStorage.setItem('classattend_saved_student_id', studentToRecord.studentId);
          setSavedStudentId(studentToRecord.studentId);
        } catch {}

        setVerifiedStudent(studentToRecord);
        setVerifiedRecord(result.record);
        setSubmitStatus('SUCCESS');
        setFeedbackMessage('Rekod kehadiran anda telah berjaya disimpan.');
        soundService.playSuccess();
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#10b981', '#6366f1', '#38bdf8']
        });

        if (onSuccess) {
          onSuccess(studentToRecord, result.record);
        }
      } else if (result.isDuplicate) {
        setSubmitStatus('DUPLICATE');
        setVerifiedStudent(studentToRecord);
        setVerifiedRecord(result.record || null);
        setFeedbackMessage(result.message || 'Kehadiran telah direkodkan.');
        soundService.playDuplicate();
      } else {
        setSubmitStatus('ERROR');
        setFeedbackMessage(result.message || 'Gagal merekodkan kehadiran.');
        soundService.playError();
      }
    } catch (err: any) {
      setSubmitStatus('ERROR');
      setFeedbackMessage(err.message || 'Ralat semasa menyimpan rekod kehadiran.');
      soundService.playError();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Returning Student Instant Confirmation
  const handleConfirmSavedStudent = () => {
    if (activeSavedStudent) {
      executeAttendance(activeSavedStudent);
    }
  };

  // Handle ID Lookup & Check-In
  const handleLookupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = inputStudentId.trim().toUpperCase();
    if (!cleanId) return;

    const found = attendanceEngine.getStudentById(cleanId) || students.find((s) => s.studentId.toUpperCase() === cleanId || s.id.toUpperCase() === cleanId);

    if (found) {
      executeAttendance(found);
    } else {
      // Prompt for quick registration
      setIsRegisterMode(true);
      setRegisterName('');
    }
  };

  // Handle Quick Student Self-Registration + Check-in
  const handleRegisterAndCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = (inputStudentId || savedStudentId).trim().toUpperCase();
    const cleanName = registerName.trim().toUpperCase();
    const cleanClass = (registerClass || context?.className || 'DIA_4A').trim().toUpperCase().replace(/\s+/g, '_');

    if (!cleanId || !cleanName) {
      setFeedbackMessage('Sila lengkapkan No. Pelajar dan Nama Penuh.');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('PROCESSING');

    try {
      // Register student master & enrollment
      const regResult = await attendanceEngine.registerStudentEnrollment({
        studentId: cleanId,
        name: cleanName,
        className: cleanClass,
        subjectCode: context?.subjectCode || targetSession?.subjectCode || 'MPU 2163',
        subjectName: context?.subjectName || targetSession?.subjectName || 'Pengajian Malaysia 2',
        lecturerName: context?.lecturerName || targetSession?.lecturerName,
        department: 'Diploma Perakaunan'
      });

      // Save ID to local storage
      try {
        localStorage.setItem('classattend_saved_student_id', regResult.student.studentId);
        setSavedStudentId(regResult.student.studentId);
      } catch {}

      // Execute attendance for the newly registered student
      await executeAttendance(regResult.student);
    } catch (err: any) {
      setSubmitStatus('ERROR');
      setFeedbackMessage(err.message || 'Gagal mendaftar pelajar.');
      soundService.playError();
      setIsSubmitting(false);
    }
  };

  // Start In-App QR Scanner
  const startScanner = async () => {
    soundService.unlockAudio();
    setScannerError(null);
    setIsScannerOpen(true);

    setTimeout(async () => {
      try {
        if (!html5QrCodeRef.current) {
          html5QrCodeRef.current = new Html5Qrcode(qrScannerId);
        }

        await html5QrCodeRef.current.start(
          { facingMode: 'environment' },
          {
            fps: 6,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          },
          (decodedText) => {
            handleScannedQR(decodedText);
          },
          () => {}
        );
      } catch (err: any) {
        console.warn('Scanner start error:', err);
        setScannerError('Kamera tidak dapat diakses. Sila benarkan akses kamera atau masukkan No. Pelajar secara manual.');
      }
    }, 150);
  };

  // Stop Scanner
  const stopScanner = async () => {
    if (html5QrCodeRef.current && isScannerOpen) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (e) {}
    }
    setIsScannerOpen(false);
  };

  // Handle Scanned Session QR
  const handleScannedQR = (decodedText: string) => {
    stopScanner();
    // Parse decodedText: e.g. CLASSATTEND_SESSION|SES-001|MPU 2163|DIA_4A
    // or URL #attend?session=SES-001...
    if (activeSavedStudent) {
      executeAttendance(activeSavedStudent);
    } else {
      setFeedbackMessage('Kod QR dikesan. Sila sahkan No. Pelajar anda.');
    }
  };

  // Auto-suggest matches for manual entry
  const quickStudentMatches = students
    .filter((s) => {
      const q = inputStudentId.toLowerCase().trim();
      if (!q || q.length < 2) return false;
      return (
        s.studentId.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q)
      );
    })
    .slice(0, 5);

  const displaySubjectCode = context?.subjectCode || targetSession?.subjectCode || 'MPU 2163';
  const displaySubjectName = context?.subjectName || targetSession?.subjectName || 'Pengajian Malaysia 2';
  const displayClassName = context?.className || targetSession?.className || 'DIA_4A';
  const displayLecturer = context?.lecturerName || targetSession?.lecturerName || 'Pensyarah KPM Bandar Penawar';

  return (
    <div
      id="student-checkin-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
    >
      <div
        id="student-checkin-modal-card"
        className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100 my-4 animate-fadeIn"
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-1/4 w-72 h-24 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* 1. FIRST VIEWPORT: CONTEXT HEADER */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span>KEHADIRAN KELAS</span>
                </span>
              </div>
              <h3 className="text-sm font-extrabold text-white tracking-tight mt-0.5">
                ClassAttend • Pelajar
              </h3>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-checkin-modal"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. BODY CONTENT */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Target Class & Subject Context Card */}
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono font-bold text-xs">
                  {displaySubjectCode}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getClassBadgeColor(displayClassName)}`}>
                  Kelas {displayClassName}
                </span>
              </div>
              {targetSession?.status === 'OPEN' ? (
                <span className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  <span>Sesi Dibuka</span>
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 font-semibold uppercase">
                  Sesi Selesai
                </span>
              )}
            </div>

            <div className="space-y-0.5">
              <h4 className="text-base font-extrabold text-white leading-snug">
                {displaySubjectName}
              </h4>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 pt-0.5">
                <UserCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Pensyarah: <strong className="text-slate-200">{displayLecturer}</strong></span>
              </p>
            </div>
          </div>

          {/* 3. SCENARIO: SUCCESS FEEDBACK */}
          {submitStatus === 'SUCCESS' && verifiedStudent && (
            <div id="checkin-success-view" className="space-y-4 text-center animate-fadeIn py-2">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-1">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black uppercase tracking-wider">
                  ✓ KEHADIRAN DIREKODKAN
                </span>
                <h4 className="text-lg font-black text-white pt-2">
                  {verifiedStudent.name}
                </h4>
                <div className="text-xs text-slate-300 flex items-center justify-center gap-2 font-mono">
                  <span>{verifiedStudent.studentId}</span>
                  <span>•</span>
                  <span>Kelas {verifiedStudent.className}</span>
                </div>
              </div>

              {/* Summary Metadata Card */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1.5 text-left max-w-xs mx-auto">
                <div className="flex justify-between">
                  <span className="text-slate-500">Masa Imbasan:</span>
                  <strong className="text-white font-mono">
                    {verifiedRecord ? new Date(verifiedRecord.timestamp).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status Kehadiran:</span>
                  <strong className="text-emerald-400 font-bold">✓ HADIR</strong>
                </div>
              </div>

              <p className="text-xs text-emerald-300/90 font-medium">
                Rekod kehadiran anda telah disimpan secara selamat.
              </p>

              {/* Optional Actions */}
              <div className="pt-2 flex flex-col gap-2">
                {onViewMyAttendance && (
                  <button
                    type="button"
                    onClick={() => {
                      onViewMyAttendance(verifiedStudent.id);
                      onClose();
                    }}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-600/30 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Lihat Kehadiran Saya</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          )}

          {/* 4. SCENARIO: DUPLICATE ATTENDANCE (REASSURING, NO DUPLICATION) */}
          {submitStatus === 'DUPLICATE' && verifiedStudent && (
            <div id="checkin-duplicate-view" className="space-y-4 text-center animate-fadeIn py-2">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-1">
                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black uppercase tracking-wider">
                  ⚠️ KEHADIRAN SUDAH DIREKODKAN
                </span>
                <h4 className="text-lg font-black text-white pt-2">
                  {verifiedStudent.name}
                </h4>
                <div className="text-xs text-slate-400 font-mono">
                  {verifiedStudent.studentId} • {verifiedStudent.className}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 text-center max-w-xs mx-auto">
                <p className="text-slate-300 font-medium leading-relaxed">
                  {feedbackMessage || `Anda telah direkodkan hadir untuk sesi ini.`}
                </p>
                <div className="text-[11px] text-emerald-400 font-bold mt-1">
                  Status: HADIR (Sah)
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                {onViewMyAttendance && (
                  <button
                    type="button"
                    onClick={() => {
                      onViewMyAttendance(verifiedStudent.id);
                      onClose();
                    }}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Lihat Kehadiran Saya</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all cursor-pointer"
                >
                  Selesai
                </button>
              </div>
            </div>
          )}

          {/* 5. SCENARIO: CLOSED SESSION */}
          {submitStatus === 'CLOSED' && (
            <div className="p-5 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-black text-rose-300 uppercase">
                  ⚠️ SESI TELAH DITUTUP
                </span>
                <p className="text-xs text-rose-200">
                  {feedbackMessage || 'Rekod kehadiran untuk sesi ini tidak lagi dibuka.'}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all cursor-pointer"
              >
                Kembali
              </button>
            </div>
          )}

          {/* 6. SCENARIO: DEFAULT / RETURNING STUDENT FAST CHECK-IN */}
          {submitStatus !== 'SUCCESS' && submitStatus !== 'DUPLICATE' && submitStatus !== 'CLOSED' && (
            <div className="space-y-4">
              {/* If active returning student recognized */}
              {activeSavedStudent && !isRegisterMode ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-indigo-500/30 space-y-2">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Identiti Pelajar Dikenali
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${getStudentColor(activeSavedStudent.id)}`}>
                        {getInitials(activeSavedStudent.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-white text-sm truncate">
                          {activeSavedStudent.name}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          {activeSavedStudent.studentId} • {activeSavedStudent.className}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    id="btn-confirm-student-attendance"
                    disabled={isSubmitting}
                    onClick={handleConfirmSavedStudent}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-xl shadow-emerald-950/40 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Sedang mengesahkan rekod...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        <span>✓ Sahkan Kehadiran Saya</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSavedStudentId('');
                        try {
                          localStorage.removeItem('classattend_saved_student_id');
                        } catch {}
                      }}
                      className="text-slate-400 hover:text-indigo-300 font-medium cursor-pointer"
                    >
                      Bukan {activeSavedStudent.name.split(' ')[0]}? <span className="underline">Tukar Pelajar</span>
                    </button>

                    <button
                      type="button"
                      onClick={startScanner}
                      className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Imbas QR</span>
                    </button>
                  </div>
                </div>
              ) : !isRegisterMode ? (
                /* FIRST TIME / MANUAL SEARCH */
                <form onSubmit={handleLookupSubmit} className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                      <span>Masukkan No. Pelajar:</span>
                      <span className="text-[10px] text-slate-500 font-mono">Cth: PDA-2502-005</span>
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        placeholder="PDA-2502-XXX atau Nama..."
                        value={inputStudentId}
                        onChange={(e) => setInputStudentId(e.target.value)}
                        className="w-full pl-9 pr-3 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono uppercase"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Auto-suggest dropdown */}
                  {quickStudentMatches.length > 0 && (
                    <div className="p-2 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                      {quickStudentMatches.map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => executeAttendance(st)}
                          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-900 text-left transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${getStudentColor(st.id)}`}>
                              {getInitials(st.name)}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-white group-hover:text-indigo-300">{st.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{st.studentId} • {st.className}</div>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-emerald-400 group-hover:underline">Pilih & Hadir &rarr;</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || !inputStudentId.trim()}
                    className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Sedang mengesahkan...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Sahkan Kehadiran</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setIsRegisterMode(true)}
                      className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                    >
                      Pelajar Baharu? <span className="underline">Daftar Di Sini</span>
                    </button>

                    <button
                      type="button"
                      onClick={startScanner}
                      className="text-slate-400 hover:text-white font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Imbas QR</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* INLINE NEW STUDENT REGISTRATION */
                <form onSubmit={handleRegisterAndCheckin} className="space-y-3 animate-fadeIn">
                  <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-300">
                    Sila daftarkan maklumat anda sekali sahaja untuk rekod subjek ini.
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">No. Pelajar / No. Matrik</label>
                    <input
                      type="text"
                      placeholder="Cth: PDA-2502-099"
                      value={inputStudentId}
                      onChange={(e) => setInputStudentId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono uppercase focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Nama Penuh Pelajar</label>
                    <input
                      type="text"
                      placeholder="NAMA PENUH SEPERTI KAD PENGENALAN"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white uppercase focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Kelas</label>
                    <input
                      type="text"
                      value={registerClass}
                      onChange={(e) => setRegisterClass(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white uppercase focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsRegisterMode(false)}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Mendaftar...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Daftar & Rekod Hadir</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* IN-APP CAMERA SCANNER FOR STUDENT PHONE */}
              {isScannerOpen && (
                <div className="pt-3 border-t border-slate-800 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <Camera className="w-4 h-4 text-indigo-400" />
                      <span>Halakan ke Kod QR Projektor</span>
                    </div>
                    <button
                      type="button"
                      onClick={stopScanner}
                      className="text-xs text-slate-400 hover:text-white cursor-pointer"
                    >
                      Tutup Kamera
                    </button>
                  </div>

                  <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-indigo-500/40 min-h-[220px] flex items-center justify-center">
                    <div id={qrScannerId} className="w-full"></div>
                  </div>

                  {scannerError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                      {scannerError}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Feedback error message */}
          {feedbackMessage && submitStatus === 'ERROR' && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{feedbackMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
