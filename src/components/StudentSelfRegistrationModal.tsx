import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import {
  Student,
  Enrollment,
  EnrollmentContext,
  OFFICIAL_STUDENT_ATTEND_ICON
} from '../types';
import { attendanceEngine } from '../services/attendanceEngine';
import { soundService } from '../services/soundService';
import { getClassBadgeColor, getInitials, getStudentColor } from '../utils/studentUtils';
import {
  GraduationCap,
  QrCode,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  BookOpen,
  User,
  Mail,
  Phone,
  Layers,
  ArrowRight,
  Printer,
  Download,
  Share2,
  X,
  Sparkles,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

interface StudentSelfRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: EnrollmentContext | null;
  onSuccess?: (student: Student, enrollment: Enrollment) => void;
}

export const StudentSelfRegistrationModal: React.FC<StudentSelfRegistrationModalProps> = ({
  isOpen,
  onClose,
  context,
  onSuccess
}) => {
  const [studentId, setStudentId] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [className, setClassName] = useState<string>(context?.className || 'DIA_4A');
  const [department, setDepartment] = useState<string>('Diploma Perakaunan (DIA)');
  
  const [isExistingStudent, setIsExistingStudent] = useState<boolean>(false);
  const [existingStudentData, setExistingStudentData] = useState<Student | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [registeredResult, setRegisteredResult] = useState<{
    student: Student;
    enrollment: Enrollment;
    isNewStudent: boolean;
    isNewEnrollment: boolean;
    message: string;
  } | null>(null);

  // Sync className with context if context changes
  useEffect(() => {
    if (context?.className) {
      setClassName(context.className);
    }
  }, [context]);

  // Real-time lookup as student enters No. Pelajar
  useEffect(() => {
    const cleanId = studentId.trim().toUpperCase();
    if (cleanId.length >= 4) {
      const found = attendanceEngine.getStudentById(cleanId);
      if (found) {
        setIsExistingStudent(true);
        setExistingStudentData(found);
        if (!name || name === cleanId) {
          setName(found.name);
        }
        if (!email && found.email) {
          setEmail(found.email);
        }
        if (!phone && found.phone) {
          setPhone(found.phone);
        }
        if (found.department) {
          setDepartment(found.department);
        }
      } else {
        setIsExistingStudent(false);
        setExistingStudentData(null);
      }
    } else {
      setIsExistingStudent(false);
      setExistingStudentData(null);
    }
  }, [studentId]);

  if (!isOpen || !context) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanId = studentId.trim().toUpperCase();
    const cleanName = name.trim().toUpperCase();
    const cleanClass = (className || context.className || 'DIA_4A').trim().toUpperCase().replace(/\s+/g, '_');

    if (!cleanId) {
      setErrorMsg('Sila masukkan No. Pelajar / No. Matrik.');
      return;
    }
    if (!cleanName) {
      setErrorMsg('Sila masukkan Nama Penuh Pelajar.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await attendanceEngine.registerStudentEnrollment({
        studentId: cleanId,
        name: cleanName,
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        className: cleanClass,
        department: department.trim(),
        subjectCode: context.subjectCode,
        subjectName: context.subjectName,
        lecturerName: context.lecturerName,
        lecturerEmail: context.lecturerEmail
      });

      setRegisteredResult(result);
      soundService.playSuccess();
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });

      if (onSuccess) {
        onSuccess(result.student, result.enrollment);
      }
    } catch (err: any) {
      soundService.playError();
      setErrorMsg(err.message || 'Ralat semasa mendaftar. Sila cuba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForAnother = () => {
    setStudentId('');
    setName('');
    setEmail('');
    setPhone('');
    setIsExistingStudent(false);
    setExistingStudentData(null);
    setRegisteredResult(null);
    setErrorMsg(null);
  };

  const handlePrintCard = () => {
    window.print();
  };

  return (
    <div
      id="student-enrollment-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
    >
      <div
        id="student-enrollment-modal-card"
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 my-4"
      >
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-blue-900/60 via-indigo-900/40 to-slate-900 p-4 sm:p-5 border-b border-slate-700/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  PENDAFTARAN KELAS PELAJAR
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5">
                ClassAttend • KPM Bandar Penawar
              </h3>
            </div>
          </div>
          <button
            id="btn-close-enrollment-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-5 max-h-[85vh] overflow-y-auto">
          {/* Target Class Context Banner */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-blue-950/40 border border-blue-500/30 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-blue-300 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                Subjek & Kelas Sasaran
              </span>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border ${getClassBadgeColor(context.className)}`}>
                Kelas {context.className}
              </span>
            </div>
            <div>
              <div className="text-sm sm:text-base font-extrabold text-white">
                <span className="text-blue-400 font-mono">[{context.subjectCode}]</span> {context.subjectName}
              </div>
              {context.lecturerName && (
                <div className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>Pensyarah: <strong className="text-slate-100">{context.lecturerName}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* If successfully registered: Show Confirmation + STATIC STUDENT QR CARD */}
          {registeredResult ? (
            <div className="space-y-5 animate-fade-in">
              {/* Success Alert */}
              <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-center space-y-1.5">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-white">
                  Pendaftaran Berjaya Disahkan!
                </h4>
                <p className="text-xs text-emerald-300">
                  {registeredResult.message}
                </p>
              </div>

              {/* Permanent Student QR Identity Card */}
              <div
                id="static-student-qr-card"
                className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-indigo-500/40 shadow-2xl text-center space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2 text-left">
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-900 border border-white/20 shrink-0">
                      <img
                        src={OFFICIAL_STUDENT_ATTEND_ICON}
                        alt="ClassAttend"
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-extrabold text-indigo-300 tracking-wider">
                        KAD IDENTITI PELAJAR (QR)
                      </div>
                      <div className="text-xs font-bold text-white">
                        KPM Bandar Penawar
                      </div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getClassBadgeColor(registeredResult.student.className)}`}>
                    {registeredResult.student.className}
                  </span>
                </div>

                {/* QR Code Container */}
                <div className="py-2 flex flex-col items-center justify-center">
                  <div className="p-4 bg-white rounded-2xl shadow-xl ring-4 ring-indigo-500/20 inline-block">
                    <QRCodeSVG
                      value={`STUDENT|${registeredResult.student.studentId}`}
                      size={180}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <div className="mt-3 font-mono font-bold text-base text-indigo-300 tracking-widest">
                    {registeredResult.student.studentId}
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {registeredResult.student.name}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {registeredResult.student.department || 'Diploma Perakaunan'}
                  </div>
                </div>

                {/* Instruction Callout */}
                <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-left flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-indigo-200 leading-relaxed">
                    <strong>Kod QR Identiti Kekal:</strong> Simpan atau tangkap layar (screenshot) kad ini di telefon anda. Anda boleh gunakan kod ini untuk mengimbas kehadiran kelas bagi semua pensyarah & subjek.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    id="btn-print-student-card"
                    type="button"
                    onClick={handlePrintCard}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    <Printer className="w-4 h-4 text-slate-300" />
                    Cetak / Simpan PDF
                  </button>
                  <button
                    id="btn-reset-another-student"
                    type="button"
                    onClick={handleResetForAnother}
                    className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98]"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Daftar Pelajar Lain
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  id="btn-done-enrollment"
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-sm font-bold transition-all text-center"
                >
                  Selesai & Tutup
                </button>
              </div>
            </div>
          ) : (
            /* Registration Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* No. Pelajar (Student ID) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  No. Pelajar / No. Matrik <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="input-enroll-student-id"
                    type="text"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                    placeholder="Contoh: PDA-2502-011"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white font-mono text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                
                {/* Existing Master Identification Feedback */}
                {isExistingStudent && existingStudentData && (
                  <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Identiti Master Ditemui: <strong>{existingStudentData.name}</strong> ({existingStudentData.className}). Maklumat anda telah diisi secara automatik.
                    </span>
                  </div>
                )}
              </div>

              {/* Nama Penuh Pelajar */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  Nama Penuh Pelajar <span className="text-rose-400">*</span>
                </label>
                <input
                  id="input-enroll-student-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase())}
                  placeholder="Contoh: MUHAMMAD AMIR BIN AHMAD"
                  className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Grid: Kelas & Program */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    Kelas / Seksyen <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="input-enroll-class-name"
                    type="text"
                    required
                    value={className}
                    onChange={(e) => setClassName(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                    placeholder="Contoh: DIA_4A"
                    className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white font-mono text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    Program Pengajian
                  </label>
                  <input
                    id="input-enroll-department"
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Diploma Perakaunan"
                    className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Grid: No. Telefon & E-mel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    No. Telefon / WhatsApp
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      id="input-enroll-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0123456789"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    E-mel Pelajar
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="input-enroll-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="pelajar@bpenawar.kpm.edu.my"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Action Button */}
              <div className="pt-2">
                <button
                  id="btn-submit-student-enrollment"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Sedang Mendaftar...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>Hantar & Daftar Masuk Kelas</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>
              </div>

              <div className="text-center">
                <p className="text-[11px] text-slate-400">
                  Data pendaftaran akan disambungkan secara langsung ke dalam senarai pensyarah bagi subjek ini.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
