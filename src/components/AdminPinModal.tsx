import React, { useState, useEffect } from 'react';
import {
  Lock,
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  Check,
  X,
  Sparkles,
  UserCheck,
  Mail,
  CreditCard,
  UserPlus,
  ArrowRight,
  BookOpen,
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
  const [regDepartment, setRegDepartment] = useState('Jabatan Perakaunan & Kewangan');
  const [regRole, setRegRole] = useState<'ADMIN' | 'LECTURER'>('LECTURER');
  const [regSuccessMsg, setRegSuccessMsg] = useState<string | null>(null);

  const registeredLecturers = attendanceEngine.getLecturers();

  useEffect(() => {
    if (isOpen) {
      const active = attendanceEngine.getActiveLecturer();
      if (active) {
        setEmail(active.email);
      } else if (registeredLecturers.length > 0) {
        setEmail(registeredLecturers[0].email);
      }
      setPin('');
      setAdminPin('');
      setErrorMessage(null);
      setShake(false);
      setRegSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleQuickSelectLecturer = (lec: Lecturer) => {
    setEmail(lec.email);
    setPin('');
    setErrorMessage(null);
  };

  const handleVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (activeTab === 'ADMIN_PIN') {
      if (adminPin.length !== 4) {
        setErrorMessage('Sila masukkan 4-digit PIN keselamatan pentadbir.');
        return;
      }
      const res = attendanceEngine.verifyAdminPin(adminPin);
      if (res.success && res.lecturer) {
        soundService.playSuccess();
        setErrorMessage(null);
        onSuccess(res.lecturer);
        onClose();
      } else {
        soundService.playError();
        setErrorMessage(res.message);
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
      return;
    }

    // Lecturer verification tab
    if (!email) {
      setErrorMessage('Sila masukkan emel pensyarah anda.');
      return;
    }

    if (pin.length !== 4) {
      setErrorMessage('Sila masukkan 4-digit PIN keselamatan.');
      return;
    }

    const result = attendanceEngine.verifyLecturer(email, pin);
    if (result.success && result.lecturer) {
      soundService.playSuccess();
      setErrorMessage(null);
      onSuccess(result.lecturer);
      onClose();
    } else {
      soundService.playError();
      setErrorMessage(result.message);
      setShake(true);
      setTimeout(() => setShake(false), 500);
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
      setPin(cleanIC.slice(-4));
      setTimeout(() => {
        setActiveTab('LOGIN');
        setRegSuccessMsg(null);
      }, 1500);
    } else {
      setErrorMessage(res.message);
    }
  };

  const handleKeyPress = (num: string) => {
    if (activeTab === 'ADMIN_PIN') {
      if (adminPin.length < 4) {
        const next = adminPin + num;
        setAdminPin(next);
        setErrorMessage(null);
      }
    } else {
      if (pin.length < 4) {
        const next = pin + num;
        setPin(next);
        setErrorMessage(null);
      }
    }
  };

  const handleBackspace = () => {
    if (activeTab === 'ADMIN_PIN') {
      setAdminPin(adminPin.slice(0, -1));
    } else {
      setPin(pin.slice(0, -1));
    }
    setErrorMessage(null);
  };

  const activePinValue = activeTab === 'ADMIN_PIN' ? adminPin : pin;

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

        {activeTab === 'ADMIN_PIN' && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 text-xs space-y-1.5 text-center">
              <div className="flex items-center justify-center gap-1.5 text-indigo-300 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Pengesahan Akses Pentadbir Sistem</span>
              </div>
              <p className="text-slate-300 text-[11px]">
                Sila masukkan 4-digit PIN keselamatan pentadbir untuk membuka akses pengurusan data master & pensyarah.
              </p>
            </div>

            {/* PIN Display */}
            <div className="space-y-2 text-center">
              <div className="flex justify-center items-center space-x-3 my-2">
                {[0, 1, 2, 3].map((index) => {
                  const hasDigit = adminPin.length > index;
                  return (
                    <div
                      key={index}
                      className={`w-11 h-12 rounded-xl border flex items-center justify-center font-mono font-bold text-2xl transition-all ${
                        hasDigit
                          ? 'border-indigo-500 bg-indigo-950/80 text-indigo-300 shadow-inner'
                          : 'border-slate-700 bg-slate-800/50 text-slate-600'
                      }`}
                    >
                      {hasDigit ? '•' : ''}
                    </div>
                  );
                })}
              </div>

              {errorMessage && (
                <div className="text-rose-400 text-xs font-medium flex items-center justify-center space-x-1.5 bg-rose-950/60 border border-rose-500/30 p-2.5 rounded-xl">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                  <span className="text-left text-[11px]">{errorMessage}</span>
                </div>
              )}
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeyPress(num)}
                  className="py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 text-white font-bold text-base rounded-xl transition-colors cursor-pointer shadow-sm"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAdminPin('')}
                className="py-2.5 bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white font-semibold text-xs rounded-xl cursor-pointer"
              >
                Padam
              </button>
              <button
                type="button"
                onClick={() => handleKeyPress('0')}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 text-white font-bold text-base rounded-xl transition-colors cursor-pointer shadow-sm"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="py-2.5 bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white font-semibold text-xs rounded-xl cursor-pointer"
              >
                ⌫
              </button>
            </div>

            {/* Form Actions */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setAdminPin('');
                  setErrorMessage(null);
                }}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold py-2.5 rounded-xl border border-slate-700 cursor-pointer"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleVerify}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/30 cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Sahkan PIN Admin</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'LOGIN' && (
          <div className="space-y-4">
            {/* Quick Lecturer Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Pilih atau Masukkan Emel Pensyarah
              </label>
              <div className="grid grid-cols-2 gap-1.5 max-h-28 overflow-y-auto p-1 bg-slate-950/40 rounded-xl border border-slate-800/60">
                {registeredLecturers.map((lec) => {
                  const isSelected = email.toLowerCase() === lec.email.toLowerCase();
                  return (
                    <button
                      key={lec.id}
                      type="button"
                      onClick={() => handleQuickSelectLecturer(lec)}
                      className={`text-left p-2 rounded-xl border transition-all text-xs cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-950/70 border-indigo-500 text-indigo-200 ring-1 ring-indigo-500/50'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="font-semibold truncate text-[11px]">{lec.name}</div>
                      <div className="text-[10px] text-slate-400 truncate font-mono">{lec.email}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Email Input */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300 flex items-center justify-between">
                <span>Emel Rasmi Kolej</span>
                <span className="text-[10px] text-indigo-400 font-mono">@bpenawar.kpm.edu.my</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="contoh: nama@bpenawar.kpm.edu.my"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            {/* Security Note */}
            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 text-xs space-y-1">
              <div className="flex items-center gap-1.5 text-indigo-300 font-semibold">
                <Info className="w-4 h-4 shrink-0" />
                <span>Kombinasi Emel & 4-Digit Keselamatan</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Kunci keselamatan pensyarah adalah <strong className="text-emerald-300">4 digit terakhir Kad Pengenalan</strong> yang telah didaftarkan.
              </p>
            </div>

            {/* PIN Display */}
            <div className="space-y-2 text-center">
              <div className="flex justify-center items-center space-x-3 my-1">
                {[0, 1, 2, 3].map((index) => {
                  const hasDigit = pin.length > index;
                  return (
                    <div
                      key={index}
                      className={`w-11 h-12 rounded-xl border flex items-center justify-center font-mono font-bold text-2xl transition-all ${
                        hasDigit
                          ? 'border-indigo-500 bg-indigo-950/80 text-indigo-300 shadow-inner'
                          : 'border-slate-700 bg-slate-800/50 text-slate-600'
                      }`}
                    >
                      {hasDigit ? '•' : ''}
                    </div>
                  );
                })}
              </div>

              {errorMessage && (
                <div className="text-rose-400 text-xs font-medium flex items-center justify-center space-x-1.5 bg-rose-950/60 border border-rose-500/30 p-2.5 rounded-xl">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                  <span className="text-left text-[11px]">{errorMessage}</span>
                </div>
              )}
            </div>

            {/* On-screen Keypad */}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleKeyPress(num)}
                  className="py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 text-white font-bold text-base rounded-xl transition-colors cursor-pointer shadow-sm"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPin('')}
                className="py-2.5 bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white font-semibold text-xs rounded-xl cursor-pointer"
              >
                Padam
              </button>
              <button
                type="button"
                onClick={() => handleKeyPress('0')}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 text-white font-bold text-base rounded-xl transition-colors cursor-pointer shadow-sm"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="py-2.5 bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white font-semibold text-xs rounded-xl cursor-pointer"
              >
                ⌫
              </button>
            </div>

            {/* Form Actions */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPin('');
                  setErrorMessage(null);
                }}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold py-2.5 rounded-xl border border-slate-700 cursor-pointer"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleVerify}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/30 cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Sahkan Pensyarah</span>
              </button>
            </div>
          </div>
        )}

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
                placeholder="cth: EN. KHAIRI BIN ABDUL RAHMAN"
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
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="Jabatan Perakaunan & Kewangan">Jabatan Perakaunan & Kewangan</option>
                <option value="Jabatan Pengajian Perniagaan">Jabatan Pengajian Perniagaan</option>
                <option value="Jabatan Teknologi Maklumat">Jabatan Teknologi Maklumat</option>
                <option value="Jabatan Pengajian Am">Jabatan Pengajian Am</option>
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
