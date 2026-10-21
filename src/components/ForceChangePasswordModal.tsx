import React, { useState } from 'react';
import { KeyRound, Lock, ShieldCheck, AlertCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Lecturer } from '../types';
import { attendanceEngine } from '../services/attendanceEngine';
import { soundService } from '../services/soundService';
import { auditLogger } from '../services/auditLogger';
import { DEFAULT_LECTURER_PIN } from '../utils/staffUtils';

interface ForceChangePasswordModalProps {
  isOpen: boolean;
  lecturer: Lecturer | null;
  onSuccess: (updatedLecturer: Lecturer) => void;
}

export const ForceChangePasswordModal: React.FC<ForceChangePasswordModalProps> = ({
  isOpen,
  lecturer,
  onSuccess
}) => {
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shake, setShake] = useState(false);

  if (!isOpen || !lecturer) return null;

  const handleNewPinChange = (val: string) => {
    const numeric = val.replace(/\D/g, '').slice(0, 4);
    setNewPin(numeric);
    setError(null);
  };

  const handleConfirmPinChange = (val: string) => {
    const numeric = val.replace(/\D/g, '').slice(0, 4);
    setConfirmPin(numeric);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newPin || newPin.length !== 4) {
      setError('Kata laluan baharu mestilah tepat 4 digit numerik.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    if (newPin === DEFAULT_LECTURER_PIN) {
      setError("Kata laluan baharu tidak boleh menggunakan kata laluan lalai '1234'. Sila pilih kombinasi 4 digit lain.");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    if (!confirmPin || confirmPin.length !== 4) {
      setError('Sila masukkan pengesahan kata laluan baharu 4 digit.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    if (newPin !== confirmPin) {
      setError('Kata laluan baharu dan pengesahan kata laluan tidak sepadan. Sila pastikan kedua-duanya sama.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await attendanceEngine.updateLecturerPassword(lecturer.id, newPin);
      if (res.success && res.lecturer) {
        soundService.playSuccess();
        auditLogger.log({
          category: 'SECURITY_AUTH',
          action: 'Tukar Kata Laluan Kali Pertama',
          details: `Pensyarah ${res.lecturer.name} (${res.lecturer.email}) telah berjaya menukar kata laluan lalai kepada kata laluan peribadi baharu.`,
          performedBy: res.lecturer.name,
          target: res.lecturer.email,
          severity: 'SUCCESS'
        });
        onSuccess(res.lecturer);
      } else {
        setError(res.message || 'Gagal mengemas kini kata laluan. Sila cuba lagi.');
        soundService.playError();
      }
    } catch (err: any) {
      setError(err?.message || 'Ralat semasa mengemas kini kata laluan.');
      soundService.playError();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <div
        className={`w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 ${
          shake ? 'animate-bounce' : ''
        }`}
      >
        {/* Header - No Close Button (Mandatory) */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-bold uppercase tracking-wider mb-2">
              Tindakan Wajib • Log Masuk Pertama
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">Tukar Kata Laluan</h2>
            <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto leading-relaxed">
              Akaun pensyarah <strong className="text-white font-mono">{lecturer.email}</strong> masih menggunakan kata laluan lalai (<span className="font-mono text-amber-300">1234</span>). Sila tetapkan kata laluan peribadi 4-digit anda sebelum meneruskan.
            </p>
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>Kata Laluan Baharu (4 Digit)</span>
              </span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPassword ? 'Sembunyi' : 'Lihat'}</span>
              </button>
            </label>
            <div className="relative">
              <input
                id="force-new-pin-input"
                type={showPassword ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={4}
                required
                autoFocus
                placeholder="••••"
                value={newPin}
                onChange={(e) => handleNewPinChange(e.target.value)}
                className="w-full text-center tracking-[0.75em] text-2xl font-mono py-3 rounded-2xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-all placeholder:tracking-normal placeholder:text-slate-600"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Mesti 4 angka numerik dan <strong className="text-amber-300">bukan 1234</strong>.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sahkan Kata Laluan Baharu</span>
            </label>
            <div className="relative">
              <input
                id="force-confirm-pin-input"
                type={showPassword ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={4}
                required
                placeholder="••••"
                value={confirmPin}
                onChange={(e) => handleConfirmPinChange(e.target.value)}
                className="w-full text-center tracking-[0.75em] text-2xl font-mono py-3 rounded-2xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 transition-all placeholder:tracking-normal placeholder:text-slate-600"
              />
            </div>
            {newPin && confirmPin && newPin === confirmPin && (
              <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Kata laluan sepadan!</span>
              </p>
            )}
          </div>

          <button
            type="submit"
            id="force-change-pin-submit-btn"
            disabled={isSubmitting || newPin.length !== 4 || confirmPin.length !== 4}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isSubmitting ? 'Mengemas kini...' : 'Simpan & Teruskan ke Aplikasi'}</span>
          </button>
        </form>

        <div className="pt-2 border-t border-slate-800/80 text-center text-[11px] text-slate-500">
          Langkah keselamatan ini melindungi integriti rekod kehadiran dan sesi pengajaran kolej anda.
        </div>
      </div>
    </div>
  );
};
