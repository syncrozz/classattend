import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  ShieldAlert,
  ShieldCheck,
  Check,
  X,
  UserCheck,
  Mail,
  UserPlus,
  Info,
  Shield
} from 'lucide-react';
import { soundService } from '../services/soundService';
import { attendanceEngine } from '../services/attendanceEngine';
import { Lecturer } from '../types';

interface LecturerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (lecturer?: Lecturer) => void;
  actionTitle?: string;
}

const SAVED_EMAIL_KEY = 'classattend_saved_lecturer_email';

export const LecturerAuthModal: React.FC<LecturerAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  actionTitle = 'Pengesahan Akses Pentadbir / Pensyarah'
}) => {
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'ADMIN_PIN' | 'REGISTER'>('LOGIN');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  // New Lecturer Registration form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regIC, setRegIC] = useState('');
  const [regDepartment, setRegDepartment] = useState('Perakaunan');
  const [regRole, setRegRole] = useState<'ADMIN' | 'LECTURER'>('LECTURER');
  const [regSuccessMsg, setRegSuccessMsg] = useState<string | null>(null);

  // Input refs for automatic auto-focusing
  const adminPinInputRef = useRef<HTMLInputElement>(null);
  const lecturerPinInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // 1. Retrieve saved email from last login for this device
      const savedEmail = localStorage.getItem(SAVED_EMAIL_KEY);
      const active = attendanceEngine.getActiveLecturer();
      const initialEmail = active?.email || savedEmail || '';

      setEmail(initialEmail);
      setPin('');
      setAdminPin('');
      setErrorMessage(null);
      setShake(false);
      setRegSuccessMsg(null);

      // 2. Auto-focus the input field immediately
      const timer = setTimeout(() => {
        if (activeTab === 'ADMIN_PIN') {
          adminPinInputRef.current?.focus();
        } else if (activeTab === 'LOGIN') {
          // If email is already saved/filled, jump directly to PIN input for ultra-fast typing
          if (initialEmail.trim() !== '') {
            lecturerPinInputRef.current?.focus();
          } else {
            emailInputRef.current?.focus();
          }
        }
      }, 70);

      return () => clearTimeout(timer);
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleEmailChange = (newEmail: string) => {
    setEmail(newEmail);
    setErrorMessage(null);
    if (newEmail.trim()) {
      localStorage.setItem(SAVED_EMAIL_KEY, newEmail.trim());
    }
  };

  const handleVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (activeTab === 'ADMIN_PIN') {
      if (adminPin.length !== 4) {
        setErrorMessage('Sila masukkan 4-digit PIN keselamatan pentadbir.');
        adminPinInputRef.current?.focus();
        return;
      }
      const res = attendanceEngine.verifyAdminPin(adminPin);
      if (res.success && res.lecturer) {
        setErrorMessage(null);
        onSuccess(res.lecturer);
        onClose();
      } else {
        setErrorMessage(res.message);
        setShake(true);
        setAdminPin('');
        setTimeout(() => {
          setShake(false);
          adminPinInputRef.current?.focus();
        }, 400);
      }
      return;
    }

    // Lecturer verification tab
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Sila masukkan emel pensyarah anda.');
      emailInputRef.current?.focus();
      return;
    }

    if (pin.length !== 4) {
      setErrorMessage('Sila masukkan 4-digit PIN keselamatan.');
      lecturerPinInputRef.current?.focus();
      return;
    }

    const result = attendanceEngine.verifyLecturer(cleanEmail, pin);
    if (result.success && result.lecturer) {
      // Save last login email to device localStorage
      localStorage.setItem(SAVED_EMAIL_KEY, cleanEmail);
      setErrorMessage(null);
      onSuccess(result.lecturer);
      onClose();
    } else {
      setErrorMessage(result.message);
      setShake(true);
      setPin('');
      setTimeout(() => {
        setShake(false);
        lecturerPinInputRef.current?.focus();
      }, 400);
    }
  };

  const handleAdminPinChange = (val: string) => {
    const numeric = val.replace(/[^0-9]/g, '').slice(0, 4);
    setAdminPin(numeric);
    setErrorMessage(null);

    // If 4 digits entered, automatically verify
    if (numeric.length === 4) {
      const res = attendanceEngine.verifyAdminPin(numeric);
      if (res.success && res.lecturer) {
        setErrorMessage(null);
        onSuccess(res.lecturer);
        onClose();
      } else {
        setErrorMessage(res.message);
        setShake(true);
        setTimeout(() => {
          setShake(false);
          setAdminPin('');
          adminPinInputRef.current?.focus();
        }, 400);
      }
    }
  };

  const handleLecturerPinChange = (val: string) => {
    const numeric = val.replace(/[^0-9]/g, '').slice(0, 4);
    setPin(numeric);
    setErrorMessage(null);

    // If 4 digits entered and email exists, automatically verify
    const cleanEmail = email.trim().toLowerCase();
    if (numeric.length === 4 && cleanEmail) {
      const res = attendanceEngine.verifyLecturer(cleanEmail, numeric);
      if (res.success && res.lecturer) {
        // Save last login email to device localStorage
        localStorage.setItem(SAVED_EMAIL_KEY, cleanEmail);
        setErrorMessage(null);
        onSuccess(res.lecturer);
        onClose();
      } else {
        setErrorMessage(res.message);
        setShake(true);
        setTimeout(() => {
          setShake(false);
          setPin('');
          lecturerPinInputRef.current?.focus();
        }, 400);
      }
    }
  };

  const handleRegisterLecturer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regIC) {
      setErrorMessage('Sila lengkapkan semua maklumat pendaftaran pensyarah.');
      return;
    }

    const cleanEmail = regEmail.trim().toLowerCase();
    if (!cleanEmail.endsWith('@bpenawar.kpm.edu.my')) {
      setErrorMessage('Emel mestilah menggunakan domain rasmi Kolej: @bpenawar.kpm.edu.my');
      return;
    }

    const cleanIC = regIC.replace(/[^0-9]/g, '');
    if (cleanIC.length < 4) {
      setErrorMessage('No. Kad Pengenalan tidak sah (mesti mempunyai sekurang-kurangnya 4 digit).');
      return;
    }

    const newLec: Lecturer = {
      id: `LEC-${Date.now()}`,
      name: regName.trim().toUpperCase(),
      email: cleanEmail,
      icNumber: regIC.trim(),
      pin: cleanIC.slice(-4),
      department: regDepartment,
      role: regRole,
      assignedClasses: ['DIA_4A', 'DIA_4B'],
      assignedSubjects: ['FAR210']
    };

    const res = attendanceEngine.registerLecturer(newLec);
    if (res.success) {
      soundService.playSuccess();
      setRegSuccessMsg(res.message);
      setEmail(cleanEmail);
      localStorage.setItem(SAVED_EMAIL_KEY, cleanEmail);
      setPin(cleanIC.slice(-4));
      setTimeout(() => {
        setActiveTab('LOGIN');
        setRegSuccessMsg(null);
      }, 1500);
    } else {
      setErrorMessage(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div
        className={`bg-slate-900 border ${
          errorMessage ? 'border-rose-500/80 shadow-rose-950/50' : 'border-indigo-500/40 shadow-indigo-950/50'
        } rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-white transition-all my-8 ${
          shake ? 'animate-bounce' : ''
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">{actionTitle}</h3>
              <p className="text-[11px] text-slate-400">Pengesahan Identiti & Kawalan Kebenaran</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Pensyarah / PIN Pentadbir / Daftar */}
        <div className="grid grid-cols-3 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('LOGIN');
              setErrorMessage(null);
            }}
            className={`py-2 rounded-lg font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 text-[11px] ${
              activeTab === 'LOGIN' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Pensyarah</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('ADMIN_PIN');
              setErrorMessage(null);
            }}
            className={`py-2 rounded-lg font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 text-[11px] ${
              activeTab === 'ADMIN_PIN' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>PIN Admin</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('REGISTER');
              setErrorMessage(null);
            }}
            className={`py-2 rounded-lg font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 text-[11px] ${
              activeTab === 'REGISTER' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Daftar</span>
          </button>
        </div>

        {/* TAB 1: ADMIN PIN */}
        {activeTab === 'ADMIN_PIN' && (
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 text-xs space-y-1.5 text-center">
              <div className="flex items-center justify-center gap-1.5 text-indigo-300 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Pengesahan Akses Pentadbir Sistem</span>
              </div>
              <p className="text-slate-300 text-[11px]">
                Taip 4-digit PIN keselamatan pentadbir untuk membuka akses pengurusan data master & pensyarah.
              </p>
            </div>

            {/* Ready-to-type 4-Digit Input Element */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-300 block text-center uppercase tracking-wider">
                Masukkan 4-Digit PIN Keselamatan
              </label>

              {/* Interactive Click-to-focus 4-box display */}
              <div
                onClick={() => adminPinInputRef.current?.focus()}
                className="relative flex justify-center items-center space-x-3 my-3 cursor-text"
              >
                {/* Hidden input ready for immediate typing without clicking */}
                <input
                  ref={adminPinInputRef}
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={adminPin}
                  onChange={(e) => handleAdminPinChange(e.target.value)}
                  autoFocus
                  autoComplete="one-time-code"
                  className="absolute inset-0 opacity-0 w-full h-full cursor-text"
                  aria-label="4 Digit PIN Pentadbir"
                />

                {[0, 1, 2, 3].map((index) => {
                  const hasDigit = adminPin.length > index;
                  const isCurrent = adminPin.length === index;
                  return (
                    <div
                      key={index}
                      className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center font-mono font-bold text-2xl transition-all ${
                        hasDigit
                          ? 'border-indigo-500 bg-indigo-950/90 text-indigo-300 shadow-lg shadow-indigo-500/20 scale-105'
                          : isCurrent
                          ? 'border-indigo-400/80 bg-slate-800 ring-2 ring-indigo-500/40 animate-pulse text-indigo-400'
                          : 'border-slate-700 bg-slate-800/50 text-slate-600'
                      }`}
                    >
                      {hasDigit ? '•' : ''}
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px] text-center text-slate-400">
                Ruang input sedia untuk ditaip terus menggunakan papan kekunci anda.
              </p>

              {errorMessage && (
                <div className="text-rose-400 text-xs font-medium flex items-center justify-center space-x-1.5 bg-rose-950/60 border border-rose-500/30 p-2.5 rounded-xl">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                  <span className="text-left text-[11px]">{errorMessage}</span>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setAdminPin('');
                  setErrorMessage(null);
                  adminPinInputRef.current?.focus();
                }}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold py-2.5 rounded-xl border border-slate-700 cursor-pointer"
              >
                Padam
              </button>
              <button
                type="submit"
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/30 cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Sahkan PIN Admin</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: PENSYARAH LOGIN */}
        {activeTab === 'LOGIN' && (
          <form onSubmit={handleVerify} className="space-y-4">
            {/* Email Input with Last Login Memory */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300 flex items-center justify-between">
                <span>Emel Rasmi Kolej</span>
                <span className="text-[10px] text-indigo-400 font-mono">@bpenawar.kpm.edu.my</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  ref={emailInputRef}
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      lecturerPinInputRef.current?.focus();
                    }
                  }}
                  placeholder="contoh: nama@bpenawar.kpm.edu.my"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              {email && (
                <div className="flex justify-between items-center text-[10px] text-slate-400 px-1 pt-0.5">
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Emel disimpan untuk peranti ini</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('');
                      localStorage.removeItem(SAVED_EMAIL_KEY);
                      emailInputRef.current?.focus();
                    }}
                    className="text-slate-400 hover:text-rose-300 underline cursor-pointer"
                  >
                    Tukar emel
                  </button>
                </div>
              )}
            </div>

            {/* Security Note */}
            <div className="p-2.5 bg-slate-800/80 rounded-2xl border border-slate-700/60 text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-indigo-300 font-semibold">
                <Info className="w-4 h-4 shrink-0" />
                <span>Kombinasi Emel & 4-Digit Keselamatan</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Kunci keselamatan pensyarah adalah <strong className="text-emerald-300">4 digit terakhir Kad Pengenalan</strong> yang telah didaftarkan.
              </p>
            </div>

            {/* Ready-to-type 4-Digit PIN Element */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-300 block text-center uppercase tracking-wider">
                Taip 4-Digit PIN Keselamatan (4 Digit Terakhir IC)
              </label>

              <div
                onClick={() => lecturerPinInputRef.current?.focus()}
                className="relative flex justify-center items-center space-x-3 my-2 cursor-text"
              >
                <input
                  ref={lecturerPinInputRef}
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => handleLecturerPinChange(e.target.value)}
                  autoFocus={Boolean(email)}
                  autoComplete="one-time-code"
                  className="absolute inset-0 opacity-0 w-full h-full cursor-text"
                  aria-label="4 Digit PIN Pensyarah"
                />

                {[0, 1, 2, 3].map((index) => {
                  const hasDigit = pin.length > index;
                  const isCurrent = pin.length === index;
                  return (
                    <div
                      key={index}
                      className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center font-mono font-bold text-2xl transition-all ${
                        hasDigit
                          ? 'border-indigo-500 bg-indigo-950/90 text-indigo-300 shadow-lg shadow-indigo-500/20 scale-105'
                          : isCurrent
                          ? 'border-indigo-400/80 bg-slate-800 ring-2 ring-indigo-500/40 animate-pulse text-indigo-400'
                          : 'border-slate-700 bg-slate-800/50 text-slate-600'
                      }`}
                    >
                      {hasDigit ? '•' : ''}
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px] text-center text-slate-400">
                Sedia untuk ditaip terus (autofokus aktif).
              </p>

              {errorMessage && (
                <div className="text-rose-400 text-xs font-medium flex items-center justify-center space-x-1.5 bg-rose-950/60 border border-rose-500/30 p-2.5 rounded-xl">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                  <span className="text-left text-[11px]">{errorMessage}</span>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPin('');
                  setErrorMessage(null);
                  lecturerPinInputRef.current?.focus();
                }}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold py-2.5 rounded-xl border border-slate-700 cursor-pointer"
              >
                Padam
              </button>
              <button
                type="submit"
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/30 cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Sahkan Pensyarah</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: REGISTER NEW LECTURER */}
        {activeTab === 'REGISTER' && (
          <form onSubmit={handleRegisterLecturer} className="space-y-3">
            {regSuccessMsg && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{regSuccessMsg}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300">Nama Penuh Pensyarah</label>
              <input
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="cth: AHMAD KHAIRI BIN MOHD"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 uppercase"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300">Emel Rasmi (@bpenawar.kpm.edu.my)</label>
              <input
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="nama@bpenawar.kpm.edu.my"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300">
                No. Kad Pengenalan
              </label>
              <input
                type="text"
                value={regIC}
                onChange={(e) => setRegIC(e.target.value)}
                placeholder="cth: 861115-46-5305"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300">Jabatan</label>
              <select
                value={regDepartment}
                onChange={(e) => setRegDepartment(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="Sains Kuantitatif">Sains Kuantitatif</option>
                <option value="Pengurusan Perniagaan">Pengurusan Perniagaan</option>
                <option value="Perakaunan">Perakaunan</option>
                <option value="Pengajian Am">Pengajian Am</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300">Peranan</label>
              <div className="flex gap-2">
                <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs flex-1 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    checked={regRole === 'LECTURER'}
                    onChange={() => setRegRole('LECTURER')}
                  />
                  <span>Pensyarah</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs flex-1 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    checked={regRole === 'ADMIN'}
                    onChange={() => setRegRole('ADMIN')}
                  />
                  <span>Pentadbir (Admin)</span>
                </label>
              </div>
            </div>

            {errorMessage && (
              <div className="text-rose-400 text-xs bg-rose-950/60 border border-rose-500/30 p-2 rounded-xl">
                {errorMessage}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('LOGIN')}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl hover:bg-slate-700 font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1"
              >
                <UserPlus className="w-4 h-4" />
                <span>Simpan Pensyarah</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// Export alias for backward compatibility
export const AdminPinModal = LecturerAuthModal;
