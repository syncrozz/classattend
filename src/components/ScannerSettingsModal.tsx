import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Volume2,
  VolumeX,
  ShieldCheck,
  Zap,
  Timer,
  Gauge,
  Check,
  RotateCcw,
  Sparkles,
  Info,
  Play
} from 'lucide-react';
import { soundService } from '../services/soundService';
import { ScanPaceMode } from './ScannerView';

export interface CustomPaceValues {
  fps: number;
  cooldownMs: number;
  sameCodeGraceMs: number;
}

interface ScannerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPace: ScanPaceMode;
  onSavePace: (pace: ScanPaceMode, customValues?: CustomPaceValues) => void;
  soundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
  isAdmin: boolean;
  onRequestAdminAccess?: (actionName?: string) => void;
}

export const ScannerSettingsModal: React.FC<ScannerSettingsModalProps> = ({
  isOpen,
  onClose,
  currentPace,
  onSavePace,
  soundEnabled,
  onToggleSound,
  isAdmin,
  onRequestAdminAccess
}) => {
  const [selectedPace, setSelectedPace] = useState<ScanPaceMode>(currentPace);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('classattend_scan_pace_is_custom') === 'true';
    } catch {
      return false;
    }
  });

  // Custom pace values
  const [customFps, setCustomFps] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('classattend_custom_fps');
      return saved ? parseInt(saved, 10) : 6;
    } catch {
      return 6;
    }
  });

  const [customCooldownSec, setCustomCooldownSec] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('classattend_custom_cooldown_sec');
      return saved ? parseFloat(saved) : 2.5;
    } catch {
      return 2.5;
    }
  });

  const [customGraceSec, setCustomGraceSec] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('classattend_custom_grace_sec');
      return saved ? parseFloat(saved) : 4.0;
    } catch {
      return 4.0;
    }
  });

  // Volume state (0.0 to 1.0)
  const [volume, setVolume] = useState<number>(() => soundService.getVolume());
  const [localSoundEnabled, setLocalSoundEnabled] = useState<boolean>(soundEnabled);
  const [isTestingSound, setIsTestingSound] = useState<boolean>(false);
  const [savedToast, setSavedToast] = useState<string | null>(null);

  // Sync props when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPace(currentPace);
      setVolume(soundService.getVolume());
      setLocalSoundEnabled(soundEnabled);
      try {
        setIsCustomMode(localStorage.getItem('classattend_scan_pace_is_custom') === 'true');
      } catch {}
    }
  }, [isOpen, currentPace, soundEnabled]);

  if (!isOpen) return null;

  // Handle testing chime sound
  const handleTestSound = () => {
    setIsTestingSound(true);
    soundService.unlockAudio();
    soundService.setEnabled(true);
    soundService.setVolume(volume);
    soundService.playSuccess();
    setTimeout(() => {
      setIsTestingSound(false);
    }, 600);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    soundService.setVolume(newVol);
    if (!localSoundEnabled && newVol > 0) {
      setLocalSoundEnabled(true);
      onToggleSound(true);
    }
  };

  const handleResetToDefaults = () => {
    setSelectedPace('BALANCED');
    setIsCustomMode(false);
    setCustomFps(5);
    setCustomCooldownSec(2.5);
    setCustomGraceSec(4.0);
    setVolume(0.85);
    setLocalSoundEnabled(true);
    soundService.setVolume(0.85);
    soundService.setEnabled(true);
    onToggleSound(true);

    try {
      localStorage.setItem('classattend_scan_pace_is_custom', 'false');
      localStorage.setItem('classattend_scan_pace', 'BALANCED');
      localStorage.setItem('classattend_scanner_volume', '0.85');
    } catch {}

    setSavedToast('Tetapan dikembalikan ke nilai piawai (Sederhana 5 FPS & 85% Volume)!');
    setTimeout(() => setSavedToast(null), 3500);
  };

  const handleSaveAndApply = () => {
    try {
      localStorage.setItem('classattend_scan_pace_is_custom', isCustomMode ? 'true' : 'false');
      if (isCustomMode) {
        localStorage.setItem('classattend_custom_fps', String(customFps));
        localStorage.setItem('classattend_custom_cooldown_sec', String(customCooldownSec));
        localStorage.setItem('classattend_custom_grace_sec', String(customGraceSec));
      }
      localStorage.setItem('classattend_scanner_volume', volume.toFixed(2));
    } catch {}

    soundService.setVolume(volume);
    soundService.setEnabled(localSoundEnabled);
    onToggleSound(localSoundEnabled);

    if (isCustomMode) {
      onSavePace('BALANCED', {
        fps: customFps,
        cooldownMs: Math.round(customCooldownSec * 1000),
        sameCodeGraceMs: Math.round(customGraceSec * 1000)
      });
    } else {
      onSavePace(selectedPace);
    }

    setSavedToast('Tetapan pengimbas & kelantangan audio berjaya disimpan!');
    setTimeout(() => {
      setSavedToast(null);
      onClose();
    }, 700);
  };

  const getVolumeLabel = (vol: number) => {
    const pct = Math.round(vol * 100);
    if (pct === 0 || !localSoundEnabled) return 'Senyap (Mute)';
    if (pct <= 40) return `${pct}% (Lembut)`;
    if (pct <= 70) return `${pct}% (Sederhana)`;
    if (pct <= 89) return `${pct}% (Jelas & Nyaring - Disyorkan)`;
    return `${pct}% (Maksimum)`;
  };

  return (
    <div
      id="modal-scanner-settings-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in"
    >
      <div
        id="modal-scanner-settings-card"
        className="w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-5 sm:p-7 space-y-6 relative text-slate-100 my-auto"
      >
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white tracking-tight">Tetapan Kelajuan & Audio</h3>
                {isAdmin ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>Master Admin Sah</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                    Mod Terhad
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Konfigurasi kepantasan pengimbas kamera (Pace) & kelantangan nada pengesahan imbasan
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Toast */}
        {savedToast && (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{savedToast}</span>
          </div>
        )}

        {/* Warning if not admin */}
        {!isAdmin && onRequestAdminAccess && (
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Log masuk sebagai Pentadbir Utama untuk menyimpan konfigurasi ini untuk keseluruhan sesi.</span>
            </div>
            <button
              type="button"
              onClick={() => onRequestAdminAccess('Tetapan Kelajuan & Audio')}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs whitespace-nowrap cursor-pointer transition-colors"
            >
              Sahkan PIN Admin
            </button>
          </div>
        )}

        {/* Section 1: Scanner Pace Speed & Cooldown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-indigo-400" />
              <label className="text-xs font-black uppercase tracking-wider text-slate-300">
                1. Kelajuan Imbasan & Jeda Kamera (Scanner Pace)
              </label>
            </div>

            <button
              type="button"
              onClick={() => setIsCustomMode(!isCustomMode)}
              className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
            >
              {isCustomMode ? '← Gunakan Pratetap (Presets)' : '⚙️ Mod Kustom Lanjutan'}
            </button>
          </div>

          {!isCustomMode ? (
            /* 3 Standard Pace Cards */
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* RELAXED */}
              <button
                type="button"
                id="btn-pace-relaxed"
                onClick={() => setSelectedPace('RELAXED')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                  selectedPace === 'RELAXED'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-950'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black flex items-center gap-1 text-teal-400">
                      <Timer className="w-3.5 h-3.5" />
                      Santai
                    </span>
                    {selectedPace === 'RELAXED' && (
                      <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">4 FPS • 3.5s jeda</div>
                  <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                    Selesa untuk pelajar angkat kad tanpa ralat pendua.
                  </p>
                </div>
              </button>

              {/* BALANCED (RECOMMENDED) */}
              <button
                type="button"
                id="btn-pace-balanced"
                onClick={() => setSelectedPace('BALANCED')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                  selectedPace === 'BALANCED'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-950'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black flex items-center gap-1 text-indigo-400">
                      <Zap className="w-3.5 h-3.5" />
                      Sederhana
                    </span>
                    <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Standard
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">5 FPS • 2.5s jeda</div>
                  <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                    Kelajuan seimbang dan stabil untuk kelas harian.
                  </p>
                </div>
              </button>

              {/* FAST */}
              <button
                type="button"
                id="btn-pace-fast"
                onClick={() => setSelectedPace('FAST')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                  selectedPace === 'FAST'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-950'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black flex items-center gap-1 text-amber-400">
                      <Gauge className="w-3.5 h-3.5" />
                      Pantas
                    </span>
                    {selectedPace === 'FAST' && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">8 FPS • 1.5s jeda</div>
                  <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                    Imbasan kilat untuk barisan pelajar yang panjang.
                  </p>
                </div>
              </button>
            </div>
          ) : (
            /* Advanced Custom Sliders */
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-indigo-500/30 space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">Kadar Bingkai Kamera (FPS):</span>
                  <span className="font-mono font-bold text-indigo-400">{customFps} FPS</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="12"
                  step="1"
                  value={customFps}
                  onChange={(e) => setCustomFps(parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>3 FPS (Jimat CPU)</span>
                  <span>6 FPS (Disyorkan)</span>
                  <span>12 FPS (Sensitif Tinggi)</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">Jeda Cooldown Antara Imbasan:</span>
                  <span className="font-mono font-bold text-teal-400">{customCooldownSec.toFixed(1)} Saat</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="5.0"
                  step="0.5"
                  value={customCooldownSec}
                  onChange={(e) => setCustomCooldownSec(parseFloat(e.target.value))}
                  className="w-full accent-teal-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>1.0s (Pantas)</span>
                  <span>2.5s (Sederhana)</span>
                  <span>5.0s (Panjang)</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">Tempoh Perlindungan Kad Sama (Grace):</span>
                  <span className="font-mono font-bold text-amber-400">{customGraceSec.toFixed(1)} Saat</span>
                </div>
                <input
                  type="range"
                  min="2.0"
                  max="8.0"
                  step="0.5"
                  value={customGraceSec}
                  onChange={(e) => setCustomGraceSec(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 block">
                  Mengelakkan rekod berganda sekiranya pelajar meletakkan kad terlalu lama di depan kamera.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Default Volume for Successful Scanning */}
        <div className="space-y-3 pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-emerald-400" />
              <label className="text-xs font-black uppercase tracking-wider text-slate-300">
                2. Kelantangan Bunyi Imbasan Berjaya (Audio Chime)
              </label>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-400">
                {getVolumeLabel(volume)}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
            {/* Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Tahap Kelantangan Bunyi:</span>
                <span className="font-mono text-white font-bold">{Math.round(volume * 100)}%</span>
              </div>
              <input
                id="slider-scanner-volume"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={localSoundEnabled ? volume : 0}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: 'Senyap', val: 0 },
                  { label: '35%', val: 0.35 },
                  { label: '65%', val: 0.65 },
                  { label: '85% (Kuat)', val: 0.85 },
                  { label: '100% (Maksimum)', val: 1.0 }
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => handleVolumeChange(preset.val)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                      Math.abs(volume - preset.val) < 0.04 && localSoundEnabled
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Test Chime Button */}
              <button
                type="button"
                id="btn-test-scanner-chime"
                onClick={handleTestSound}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 border ${
                  isTestingSound
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/30'
                    : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/40'
                }`}
                title="Dengar bunyi nada kejayaan imbasan pada kelantangan ini"
              >
                {isTestingSound ? (
                  <>
                    <Volume2 className="w-4 h-4 animate-bounce" />
                    <span>Membunyikan...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Uji Bunyi Kejayaan</span>
                  </>
                )}
              </button>
            </div>

            {/* Mute/Sound Toggle Checkbox */}
            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
              <span className="text-slate-400">Status Bunyi Sistem:</span>
              <button
                type="button"
                onClick={() => {
                  const nextState = !localSoundEnabled;
                  setLocalSoundEnabled(nextState);
                  soundService.setEnabled(nextState);
                  onToggleSound(nextState);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border ${
                  localSoundEnabled
                    ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                    : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                }`}
              >
                {localSoundEnabled ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Bunyi Diaktifkan</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                    <span>Bunyi Dimatikan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
          <button
            type="button"
            id="btn-reset-scanner-settings"
            onClick={handleResetToDefaults}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset ke Piawai</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              Batal
            </button>

            <button
              type="button"
              id="btn-save-scanner-settings"
              onClick={handleSaveAndApply}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-black shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Simpan & Terapkan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
