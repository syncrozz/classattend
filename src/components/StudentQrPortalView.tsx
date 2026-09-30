import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Student, OFFICIAL_STUDENT_ATTEND_ICON } from '../types';
import { findStudentById, findStudentByAccessCode, normalizeStudentId } from '../utils/studentUtils';
import { soundService } from '../services/soundService';
import {
  QrCode,
  Sparkles,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  ArrowLeft,
  Smartphone,
  Info,
  Share2,
  Check
} from 'lucide-react';

interface StudentQrPortalViewProps {
  students: Student[];
  onReturnToMain?: () => void;
}

const STORAGE_KEY = 'classattend_student_qr_portal_id';

export const StudentQrPortalView: React.FC<StudentQrPortalViewProps> = ({
  students,
  onReturnToMain
}) => {
  const [studentIdInput, setStudentIdInput] = useState<string>('');
  const [verifiedStudent, setVerifiedStudent] = useState<Student | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCheckingMemory, setIsCheckingMemory] = useState<boolean>(true);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Check device memory on mount or when students list is loaded
  useEffect(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_KEY);
      if (savedId) {
        const matched = findStudentById(students, savedId);
        if (matched) {
          setVerifiedStudent(matched);
        } else if (students.length > 0) {
          // Stored student was deleted or invalid; clear memory and do not resurrect data
          localStorage.removeItem(STORAGE_KEY);
          setVerifiedStudent(null);
        }
      }
    } catch {
      // Storage unavailable or disabled
    } finally {
      setIsCheckingMemory(false);
    }
  }, [students]);

  // Focus input when returning to ID input screen
  useEffect(() => {
    if (!verifiedStudent && !isCheckingMemory) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [verifiedStudent, isCheckingMemory]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setStudentIdInput(val);
    if (errorMsg) setErrorMsg(null);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').toUpperCase().trim();
    setStudentIdInput(pastedText);
    if (errorMsg) setErrorMsg(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const trimmedInput = studentIdInput.trim();

    // 1. Check if student database is empty
    if (students.length === 0) {
      setErrorMsg('Pangkalan data pelajar sedang dimuatkan atau tiada rekod. Sila hubungi pensyarah/pentadbir.');
      soundService.playError();
      return;
    }

    if (!trimmedInput) {
      setErrorMsg('Sila masukkan No. ID Pelajar anda (contoh: PDA2502001).');
      soundService.playError();
      return;
    }

    // 2. Match against student ID (supports e.g. PDA2502001, PDA-2502-001, etc.)
    let matched = findStudentById(students, trimmedInput);

    // Fallback: If student entered 6-digit legacy access code, also support it gracefully
    if (!matched && /^\d{6}$/.test(trimmedInput)) {
      matched = findStudentByAccessCode(students, trimmedInput);
    }

    if (matched) {
      setVerifiedStudent(matched);
      setErrorMsg(null);
      // Remember student on device safely
      try {
        localStorage.setItem(STORAGE_KEY, matched.studentId);
      } catch {}
      soundService.playSuccess();
    } else {
      setErrorMsg(`No. ID Pelajar "${trimmedInput}" tidak dijumpai dalam sistem. Sila pastikan anda memasukkan No. ID yang betul (cth: PDA2502001 atau PDA-2502-001).`);
      soundService.playError();
    }
  };

  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const handleCopyLink = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://classattend.syncrozz.com';
    const link = `${origin}/#/qr`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = link;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedLink(true);
      soundService.playSuccess();
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleChangeStudent = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setVerifiedStudent(null);
    setStudentIdInput('');
    setErrorMsg(null);
    soundService.playClick();
  };

  return (
    <div
      id="student-qr-portal-container"
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between items-center p-4 sm:p-6 select-none relative overflow-hidden"
    >
      {/* Background radial gradient decoration */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header / Branding */}
      <header className="w-full max-w-md flex items-center justify-between pt-2 pb-4 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl overflow-hidden ring-1 ring-white/20 bg-slate-900 flex items-center justify-center shrink-0 shadow-md">
            <img
              src={OFFICIAL_STUDENT_ATTEND_ICON}
              alt="ClassAttend Logo"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="text-xs font-extrabold tracking-wider text-white uppercase flex items-center gap-1">
              <span>CLASS</span>
              <span className="text-blue-500">ATTEND</span>
            </div>
            <span className="text-[9px] font-semibold text-slate-400">
              KPM Bandar Penawar
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 hover:text-teal-200 text-xs font-semibold transition cursor-pointer shadow-sm"
            title="Salin pautan rasmi (#/qr) untuk dihantar kepada pelajar"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-teal-400" />
                <span>Disalin!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-teal-400" />
                <span>Kongsi Pautan</span>
              </>
            )}
          </button>

          {onReturnToMain && (
            <button
              type="button"
              onClick={onReturnToMain}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer"
              title="Kembali ke platform utama"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Platform Utama</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Card */}
      <main className="w-full max-w-sm flex-1 flex flex-col justify-center my-auto z-10">
        <div className="rounded-3xl bg-slate-900/95 border border-slate-800 shadow-2xl p-6 sm:p-7 text-center space-y-6 backdrop-blur-md">
          
          {/* Header Badge */}
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-[11px] font-bold tracking-widest uppercase">
              <QrCode className="w-3.5 h-3.5" />
              <span>MY ATTENDANCE QR</span>
            </div>
          </div>

          {!verifiedStudent ? (
            /* INITIAL STATE: STUDENT ID INPUT */
            <div className="space-y-5">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-200">
                  Dapatkan Pas Kod QR Pelajar
                </p>
                <p className="text-xs text-slate-400">
                  Masukkan No. ID Pelajar anda (cth: PDA2502001)
                </p>
                <p className="text-[10px] text-teal-400/80 pt-0.5">
                  Khusus untuk penjanaan Pas QR sahaja (Bukan untuk semakan kehadiran)
                </p>
              </div>

              {/* Error Message Box */}
              {errorMsg && (
                <div
                  id="qr-portal-error-msg"
                  className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs text-left flex items-start gap-2.5 animate-fadeIn"
                >
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMsg}</span>
                </div>
              )}

              {/* Code Input Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      ref={inputRef}
                      id="input-qr-access-code"
                      type="text"
                      autoCapitalize="characters"
                      autoComplete="off"
                      spellCheck={false}
                      maxLength={20}
                      placeholder="cth: PDA2502001"
                      value={studentIdInput}
                      onChange={handleInputChange}
                      onPaste={handlePaste}
                      onKeyDown={handleKeyDown}
                      className="w-full text-center px-4 py-3.5 rounded-2xl bg-slate-950 border-2 border-slate-700 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 text-xl sm:text-2xl font-mono tracking-widest font-black text-teal-300 placeholder:text-slate-700 outline-none transition-all shadow-inner uppercase"
                      aria-label="No. ID Pelajar"
                    />
                  </div>
                </div>

                {/* SHOW MY QR Button */}
                <button
                  type="submit"
                  id="btn-show-my-qr"
                  disabled={!studentIdInput.trim()}
                  className="w-full py-3.5 px-4 rounded-2xl bg-teal-500 hover:bg-teal-400 disabled:opacity-40 disabled:hover:bg-teal-500 text-slate-950 font-extrabold text-sm tracking-wider uppercase transition-all shadow-lg shadow-teal-500/20 active:scale-[0.98] cursor-pointer"
                >
                  PAPAR KOD QR SAYA
                </button>
              </form>

              {/* Helpful Retrieval Guide */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 text-left space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-300 text-xs">
                  <Info className="w-3.5 h-3.5 text-teal-400" />
                  <span>Panduan No. ID Pelajar:</span>
                </div>
                <div className="space-y-1 text-slate-400 leading-relaxed font-mono text-[11px]">
                  <div>• Masukkan No. Pelajar rasmi: <strong className="text-teal-300">PDA2502001</strong> atau <strong className="text-teal-300">PDA-2502-001</strong></div>
                  <div className="text-slate-500 pt-0.5">• Tiada kata laluan atau digit telefon diperlukan. Sistem terus memaparkan Pas Kod QR rasmi untuk imbasan kehadiran.</div>
                </div>
              </div>
            </div>
          ) : (
            /* VALID STATE: STUDENT QR DISPLAY */
            <div className="space-y-5 animate-fadeIn">
              {/* Student Name and ID */}
              <div className="space-y-1.5">
                <h3
                  id="qr-portal-student-name"
                  className="text-base sm:text-lg font-black text-white uppercase tracking-tight leading-snug break-words"
                >
                  {verifiedStudent.name}
                </h3>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs font-bold text-teal-300">
                  <span id="qr-portal-student-id">{verifiedStudent.studentId}</span>
                </div>
              </div>

              {/* QR Code Container */}
              <div className="p-4 rounded-2xl bg-white shadow-2xl inline-block border-4 border-teal-500/20">
                <QRCodeSVG
                  id="qr-portal-svg-code"
                  value={`STUDENT|${verifiedStudent.studentId}`}
                  size={210}
                  level="H"
                  includeMargin={false}
                />
              </div>

              {/* Ready to Scan Indicator */}
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span>Ready to Scan</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Pamerkan kod QR ini di hadapan kamera pengimbas pensyarah
                </p>
                <p className="text-[10px] text-slate-500 pt-1">
                  Nota: Portal ini hanya untuk memaparkan Pas QR pelajar. Rekod dan semakan kehadiran dikendalikan secara rasmi oleh pensyarah kelas.
                </p>
              </div>

              {/* CHANGE STUDENT Button */}
              <button
                type="button"
                id="btn-change-student"
                onClick={handleChangeStudent}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold tracking-wider uppercase transition border border-slate-700 cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>CHANGE STUDENT</span>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-md py-4 text-center z-10">
        <p className="text-[10px] text-slate-500">
          ClassAttend • Sistem Imbasan QR Kehadiran Pelajar KPM Bandar Penawar
        </p>
      </footer>
    </div>
  );
};
