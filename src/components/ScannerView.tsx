import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import {
  Student,
  AttendanceSession,
  AttendanceRecord,
  ScanResult,
  AttendanceMethod
} from '../types';
import { soundService } from '../services/soundService';
import {
  getCategoryBadgeColor,
  getCategoryLabel,
  getClassBadgeColor,
  getInitials,
  getStudentColor
} from '../utils/studentUtils';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Volume2,
  VolumeX,
  Sparkles,
  Users,
  Search,
  Clock,
  ArrowRight,
  ShieldAlert,
  GraduationCap,
  Gauge,
  SlidersHorizontal,
  Info
} from 'lucide-react';

export type ScanPaceMode = 'RELAXED' | 'BALANCED' | 'FAST';

interface PaceConfig {
  label: string;
  fps: number;
  cooldownMs: number;
  sameCodeGraceMs: number;
  desc: string;
}

const PACE_CONFIGS: Record<ScanPaceMode, PaceConfig> = {
  RELAXED: {
    label: 'Santai (Sangat Selesa)',
    fps: 4,
    cooldownMs: 3500,
    sameCodeGraceMs: 5000,
    desc: '3.5 saat jeda • Paling sesuai untuk beri masa pelajar alihkan kad QR tanpa ralat pendua'
  },
  BALANCED: {
    label: 'Sederhana (Standard)',
    fps: 5,
    cooldownMs: 2500,
    sameCodeGraceMs: 4000,
    desc: '2.5 saat jeda • Kelajuan seimbang untuk barisan sederhana'
  },
  FAST: {
    label: 'Pantas (Laju)',
    fps: 8,
    cooldownMs: 1500,
    sameCodeGraceMs: 2500,
    desc: '1.5 saat jeda • Imbasan pantas berterusan'
  }
};

interface ScannerViewProps {
  activeSession: AttendanceSession | null;
  allSessions: AttendanceSession[];
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  isAdmin: boolean;
  onRequestAdminAccess: (actionName?: string) => void;
  onProcessScan: (qrString: string, method: AttendanceMethod, targetSessionId?: string) => ScanResult;
  onGoToActivities: () => void;
  soundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
}

export const ScannerView: React.FC<ScannerViewProps> = ({
  activeSession,
  allSessions,
  students,
  attendanceRecords,
  isAdmin,
  onRequestAdminAccess,
  onProcessScan,
  onGoToActivities,
  soundEnabled,
  onToggleSound
}) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string>(activeSession?.id || allSessions[0]?.id || '');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [manualInput, setManualInput] = useState<string>('');
  const [cooldown, setCooldown] = useState<boolean>(false);
  const [cooldownSecondsLeft, setCooldownSecondsLeft] = useState<number>(0);
  const [statsMode, setStatsMode] = useState<'CLASS' | 'OVERALL'>('CLASS');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [scanPace, setScanPace] = useState<ScanPaceMode>('RELAXED');
  const [showPaceSettings, setShowPaceSettings] = useState<boolean>(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const qrRegionId = 'qr-reader-studentattend';

  // Refs to prevent React stale closures inside Html5Qrcode callbacks
  const scanPaceRef = useRef<ScanPaceMode>(scanPace);
  const lastScannedDataRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);
  const cooldownTimerRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);
  const selectedSessionIdRef = useRef<string>(selectedSessionId);
  const onProcessScanRef = useRef(onProcessScan);
  const soundEnabledRef = useRef(soundEnabled);

  // Sync refs with latest state/props
  useEffect(() => {
    scanPaceRef.current = scanPace;
  }, [scanPace]);

  useEffect(() => {
    selectedSessionIdRef.current = selectedSessionId;
  }, [selectedSessionId]);

  useEffect(() => {
    onProcessScanRef.current = onProcessScan;
  }, [onProcessScan]);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Ensure selectedSessionId defaults to activeSession when changed
  useEffect(() => {
    if (activeSession) {
      setSelectedSessionId(activeSession.id);
    }
  }, [activeSession]);

  const currentSession = allSessions.find((s) => s.id === selectedSessionId) || activeSession;
  const isClassSession = true;

  // Session attendance stats
  const sessionRecords = currentSession
    ? attendanceRecords.filter((r) => r.sessionId === currentSession.id && r.status === 'PRESENT')
    : [];

  // Strictly target students of the same class for Class/Lecture sessions
  const targetStudents = currentSession
    ? currentSession.className
      ? students.filter((s) => s.className === currentSession.className)
      : selectedClassFilter !== 'ALL'
      ? students.filter((s) => s.className === selectedClassFilter)
      : students
    : [];

  // Present records strictly matching the target class (if class session)
  const matchingPresentRecords = currentSession?.className
    ? sessionRecords.filter((r) => {
        const student = students.find((s) => s.id === r.studentId);
        return student?.className === currentSession.className;
      })
    : selectedClassFilter !== 'ALL'
    ? sessionRecords.filter((r) => {
        const student = students.find((s) => s.id === r.studentId);
        return student?.className === selectedClassFilter;
      })
    : sessionRecords;

  const percentage =
    targetStudents.length > 0 ? Math.round((matchingPresentRecords.length / targetStudents.length) * 100) : 0;

  // Dynamic Class-Based Statistics (Primary View)
  const availableClasses: string[] = (Array.from(
    new Set(students.map((s) => s.className).filter(Boolean))
  ) as string[]).sort();

  const classStats = availableClasses.map((cls) => {
    const classStudents = students.filter((s) => s.className === cls);
    const presentInClass = classStudents.filter((s) =>
      sessionRecords.some((r) => r.studentId === s.id)
    ).length;
    const rate = classStudents.length > 0 ? Math.round((presentInClass / classStudents.length) * 100) : 0;
    const isTargeted = currentSession?.className === cls;

    return {
      className: cls,
      total: classStudents.length,
      present: presentInClass,
      rate,
      isTargeted
    };
  });

  // Filtered session records based on class filter
  const filteredSessionRecords = sessionRecords.filter((record) => {
    if (selectedClassFilter === 'ALL') return true;
    const student = students.find((s) => s.id === record.studentId);
    return student?.className === selectedClassFilter;
  });

  // Core scan execution with smart duplicate protection and dynamic cooldown
  const handleScannedData = useCallback((dataString: string, method: AttendanceMethod = 'CAMERA_SCAN') => {
    const now = Date.now();
    const pace = PACE_CONFIGS[scanPaceRef.current];

    // 1. SMART DUPLICATE PROTECTION:
    // If the exact same QR code was scanned within the sameCodeGraceMs window (e.g. 5 seconds),
    // silently ignore it. This prevents the camera from triggering duplicate errors while the student is lowering or moving the card away!
    if (
      lastScannedDataRef.current === dataString &&
      now - lastScanTimeRef.current < pace.sameCodeGraceMs
    ) {
      return;
    }

    // 2. GENERAL PACE THROTTLE:
    // If the scanner is currently within the general cooldown period (e.g. 3.5 seconds), ignore incoming frames
    if (isProcessingRef.current || (now - lastScanTimeRef.current < pace.cooldownMs && lastScanTimeRef.current > 0)) {
      return;
    }

    // Lock processing
    isProcessingRef.current = true;
    lastScannedDataRef.current = dataString;
    lastScanTimeRef.current = now;

    // Trigger visual cooldown & countdown timer
    setCooldown(true);
    const totalCooldownSec = Math.round(pace.cooldownMs / 1000);
    setCooldownSecondsLeft(totalCooldownSec);

    // Clear previous timers
    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    let remaining = totalCooldownSec;
    countdownIntervalRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(countdownIntervalRef.current);
        setCooldownSecondsLeft(0);
      } else {
        setCooldownSecondsLeft(remaining);
      }
    }, 1000);

    cooldownTimerRef.current = setTimeout(() => {
      isProcessingRef.current = false;
      setCooldown(false);
      setCooldownSecondsLeft(0);
    }, pace.cooldownMs);

    // Process scan via attendanceEngine
    const result = onProcessScanRef.current(dataString, method, selectedSessionIdRef.current);
    setScanResult(result);

    // Audio & Visual feedback
    if (result.success) {
      if (soundEnabledRef.current) soundService.playSuccess();
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#6366f1', '#10b981', '#38bdf8']
        });
      } catch (e) {}
    } else if (result.isDuplicate) {
      if (soundEnabledRef.current) soundService.playDuplicate();
    } else {
      if (soundEnabledRef.current) soundService.playError();
    }
  }, []);

  // Start Camera
  const startCamera = async () => {
    soundService.unlockAudio();
    setCameraError(null);
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(qrRegionId);
      }

      const activeConfig = PACE_CONFIGS[scanPaceRef.current];

      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        {
          fps: activeConfig.fps, // Configurable smooth camera FPS (default 4-5 fps instead of 10)
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          handleScannedData(decodedText, 'CAMERA_SCAN');
        },
        () => {
          // Frame scan failure (benign, scanning in progress)
        }
      );

      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Camera start error:', err);
      setCameraError('Gagal memulakan kamera. Sila pastikan kebenaran kamera telah diberikan pada pelayar anda.');
      setIsCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = async () => {
    if (html5QrCodeRef.current && isCameraActive) {
      try {
        await html5QrCodeRef.current.stop();
        setIsCameraActive(false);
      } catch (err) {
        console.warn('Camera stop error:', err);
      }
    }
  };

  // Restart camera when user changes FPS pace if camera is running
  const handlePaceChange = async (newPace: ScanPaceMode) => {
    setScanPace(newPace);
    scanPaceRef.current = newPace;

    // Reset current throttling
    isProcessingRef.current = false;
    setCooldown(false);
    setCooldownSecondsLeft(0);

    if (isCameraActive && html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        const activeConfig = PACE_CONFIGS[newPace];
        await html5QrCodeRef.current.start(
          { facingMode: 'environment' },
          {
            fps: activeConfig.fps,
            qrbox: { width: 260, height: 260 },
            aspectRatio: 1.0
          },
          (decodedText) => {
            handleScannedData(decodedText, 'CAMERA_SCAN');
          },
          () => {}
        );
      } catch (e) {
        console.warn('Restart camera error on pace change:', e);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(console.warn);
      }
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  // Manual code entry / student selection
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    handleScannedData(manualInput.trim(), 'MANUAL');
    setManualInput('');
  };

  // Filter students for manual fast check-in
  const filteredQuickList = students
    .filter((s) => {
      const q = manualInput.toLowerCase();
      if (!q) return false;
      return (
        s.name.toLowerCase().includes(q) ||
        s.studentId.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q)
      );
    })
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Session Context Bar & Target Selector */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 sm:p-5 space-y-4">
        {/* Row 1: Header Badges & Utility Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              PENGIMBAS KEHADIRAN KELAS
            </span>
            {currentSession?.subjectCode && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                {currentSession.subjectCode}
              </span>
            )}
            {currentSession?.status === 'OPEN' ? (
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold animate-pulse">
                🟢 SEDANG DIBUKA (AKTIF)
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950/40 text-blue-300 border border-blue-800/40 font-medium">
                🔵 SESI TERSEDIA
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Scan Pace / Speed Preset Selector */}
            <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 p-0.5">
              <button
                type="button"
                onClick={() => setShowPaceSettings(!showPaceSettings)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  showPaceSettings ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
                title="Tetapan Kelajuan & Jeda Imbasan"
              >
                <Gauge className="w-3.5 h-3.5 text-indigo-400" />
                <span>Pace: {PACE_CONFIGS[scanPace].label.split(' ')[0]}</span>
              </button>
            </div>

            <button
              onClick={() => onToggleSound(!soundEnabled)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                soundEnabled ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
              title="Bunyi Maklum Balas"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-indigo-400" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{soundEnabled ? 'Bunyi Aktif' : 'Senyap'}</span>
            </button>
          </div>
        </div>

        {/* Scan Pace Selector Dropdown / Info Panel */}
        {showPaceSettings && (
          <div className="p-3.5 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                <span>Kawalan Kelajuan Imbasan (Pace & Anti-Duplicate Protection)</span>
              </div>
              <span className="text-[10px] text-slate-400">
                Pilih kelajuan yang paling selesa
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(Object.keys(PACE_CONFIGS) as ScanPaceMode[]).map((mode) => {
                const cfg = PACE_CONFIGS[mode];
                const isSelected = scanPace === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handlePaceChange(mode)}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">{cfg.label}</span>
                      {isSelected && <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500 text-white font-extrabold">AKTIF</span>}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-snug">{cfg.desc}</p>
                  </button>
                );
              })}
            </div>

            <div className="flex items-start gap-1.5 text-[11px] text-emerald-400/90 pt-1">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
              <span>
                <strong>Perlindungan Pintar Kad Sama:</strong> Setiap kod QR yang berjaya diimbas tidak akan mencetuskan ralat pendua selama <strong>5 saat</strong> untuk memberi masa yang cukup kepada pelajar mengalihkan kad/telefon.
              </span>
            </div>
          </div>
        )}

        {/* Row 2: Selected Session Details */}
        <div className="space-y-1.5">
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex flex-wrap items-center gap-2">
            {currentSession ? currentSession.sessionName : 'Sila Pilih Sesi'}
            {currentSession?.className && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Kelas {currentSession.className}
              </span>
            )}
          </h2>
          {currentSession && currentSession.subjectName && (
            <p className="text-xs text-indigo-300 font-medium flex flex-wrap items-center gap-1.5">
              <span className="text-slate-400">Subjek:</span>
              <span className="text-white font-semibold">{currentSession.subjectCode ? `${currentSession.subjectCode} - ` : ''}{currentSession.subjectName}</span>
            </p>
          )}
          <p className="text-xs text-slate-400">
            {currentSession?.lecturerName ? `Pensyarah: ${currentSession.lecturerName}` : (currentSession?.organizer || 'Pensyarah Kursus')}
          </p>
        </div>

        {/* Row 3: Single Column Dedicated Session Selector */}
        <div className="pt-2 border-t border-slate-800/60">
          <label htmlFor="scanner-session-select" className="block text-[11px] font-semibold text-slate-400 mb-1.5">
            Pilih Sesi Kelas untuk Imbasan:
          </label>
          <div className="w-full">
            <select
              id="scanner-session-select"
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-inner"
            >
              {allSessions.length === 0 ? (
                <option value="">-- Tiada sesi kuliah dijumpai (Sila cipta sesi di Pengurusan Kelas) --</option>
              ) : (
                allSessions.map((ses) => {
                  const subDetail = ses.subjectCode ? ` [${ses.subjectCode}]` : '';
                  const classDetail = ses.className ? ` (${ses.className})` : '';
                  const statusPrefix = ses.status === 'OPEN' ? '🟢 [AKTIF] ' : '🔵 ';

                  return (
                    <option key={ses.id} value={ses.id}>
                      {statusPrefix}{ses.sessionName}{subDetail}{classDetail}
                    </option>
                  );
                })
              )}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: CAMERA & SCANNER (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Kamera Pengimbas QR</h3>
              </div>
              <div className="flex items-center gap-2">
                {!isCameraActive ? (
                  <button
                    id="scanner-btn-start-camera"
                    onClick={startCamera}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Aktifkan Kamera</span>
                  </button>
                ) : (
                  <button
                    id="scanner-btn-stop-camera"
                    onClick={stopCamera}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <CameraOff className="w-3.5 h-3.5" />
                    <span>Hentikan Kamera</span>
                  </button>
                )}
              </div>
            </div>

            {/* Video Viewport Container */}
            <div className={`relative rounded-xl overflow-hidden bg-slate-950 border transition-all min-h-[300px] flex items-center justify-center ${
              cooldown ? 'border-emerald-500/40' : 'border-slate-800'
            }`}>
              <div id={qrRegionId} className="w-full max-w-sm"></div>

              {!isCameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/90">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mb-3 text-indigo-400">
                    <Camera className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">Kamera Belum Diaktifkan</h4>
                  <p className="text-xs text-slate-400 max-w-xs mb-4">
                    Halakan kamera peranti ke Kod QR Pelajar (contoh format: <code className="text-indigo-300">CLASSATTEND|PDA-2502-005</code>) untuk merekod kehadiran secara automatik.
                  </p>
                  <button
                    onClick={startCamera}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
                  >
                    Buka Kamera Sekarang
                  </button>
                </div>
              )}

              {/* Cooldown Status Overlay */}
              {isCameraActive && cooldown && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600/90 backdrop-blur-md text-white text-[11px] font-bold shadow-lg animate-pulse border border-emerald-400/40">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Kad Direkod • Sedia dalam {cooldownSecondsLeft}s</span>
                </div>
              )}

              {/* Ready Indicator */}
              {isCameraActive && !cooldown && (
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold">
                  🟢 Sedia Mengimbas
                </div>
              )}
            </div>

            {cameraError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Manual ID Search & Fast Verification */}
            <div className="pt-2 border-t border-slate-800">
              <form onSubmit={handleManualSubmit} className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                  <span>Carian No. Pelajar / Imbasan Manual:</span>
                  <span className="text-[10px] text-slate-500 font-normal">Contoh: PDA-2502-005 atau Aiman</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      id="scanner-manual-input"
                      type="text"
                      placeholder="Masukkan No. Pelajar atau Nama..."
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white font-semibold text-xs border border-slate-700 transition-all cursor-pointer"
                  >
                    Sahkan
                  </button>
                </div>
              </form>

              {/* Quick Auto-complete results */}
              {filteredQuickList.length > 0 && (
                <div className="mt-2 p-2 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  {filteredQuickList.map((st) => (
                    <button
                      key={st.id}
                      onClick={() => {
                        handleScannedData(st.id, 'MANUAL_OVERRIDE');
                        setManualInput('');
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-900 text-left transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${getStudentColor(st.id)}`}>
                          {getInitials(st.name)}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white">{st.name}</div>
                          <div className="text-[10px] text-slate-400">{st.studentId} • {st.className}</div>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-indigo-400">Rekod &rarr;</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* LATEST SCAN RESULT CARD */}
          {scanResult && (
            <div
              id="scanner-latest-result-card"
              className={`rounded-2xl border p-5 transition-all shadow-xl ${
                scanResult.success
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100'
                  : scanResult.isDuplicate
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-100'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-100'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-xl font-bold shadow-lg ${
                    scanResult.success
                      ? 'bg-emerald-500 text-slate-950'
                      : scanResult.isDuplicate
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-rose-500 text-slate-950'
                  }`}
                >
                  {scanResult.success ? (
                    <CheckCircle2 className="w-7 h-7 text-slate-950" />
                  ) : scanResult.isDuplicate ? (
                    <AlertTriangle className="w-7 h-7 text-slate-950" />
                  ) : (
                    <XCircle className="w-7 h-7 text-slate-950" />
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        scanResult.success
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : scanResult.isDuplicate
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {scanResult.code}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(scanResult.timestamp).toLocaleTimeString('ms-MY')}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-white">
                    {scanResult.student ? scanResult.student.name : 'Maklumat Imbasan'}
                  </h4>

                  {scanResult.student && (
                    <div className="text-xs text-slate-300 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>No. Pelajar: <strong className="text-white">{scanResult.student.studentId}</strong></span>
                      <span>Set: <strong className="text-white">{scanResult.student.className}</strong></span>
                      <span>Program: <strong>{scanResult.student.department || 'Diploma Perakaunan'}</strong></span>
                    </div>
                  )}

                  <p className="text-xs text-slate-300 pt-1 font-medium">
                    {scanResult.message}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: LIVE SESSION ATTENDANCE STREAM & CLASS STATS (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4 flex flex-col h-full">
            {/* Header with Stats Mode Switcher */}
            <div className="flex flex-col gap-2.5 border-b border-slate-800 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>Statistik Kehadiran Sesi</span>
                    {currentSession?.className && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
                        Set {currentSession.className}
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {matchingPresentRecords.length} daripada {targetStudents.length} Pelajar {currentSession?.className ? 'Kelas ' : ''}Direkod Hadir
                  </p>
                </div>

                {/* Option Toggle: By Class (Primary) vs Overall */}
                <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 shrink-0">
                  <button
                    type="button"
                    onClick={() => setStatsMode('CLASS')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      statsMode === 'CLASS'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    👥 Ikut Kelas (Utama)
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatsMode('OVERALL')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      statsMode === 'OVERALL'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🌐 Keseluruhan
                  </button>
                </div>
              </div>

              {/* STATS DISPLAY 1: BY CLASS (PRIMARY) */}
              {statsMode === 'CLASS' ? (
                <div className="space-y-2 pt-1">
                  {currentSession?.className ? (
                    /* Sesi Khusus Kelas (Kuliah / Set Tertentu) */
                    <div className="p-3.5 rounded-xl bg-slate-950/80 border border-indigo-500/40 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getClassBadgeColor(currentSession.className)}`}>
                            Set {currentSession.className}
                          </span>
                          <span className="text-xs text-slate-300 font-semibold">Kehadiran Kelas</span>
                        </div>
                        <div className="text-xl font-black text-emerald-400">
                          {percentage}%
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>{matchingPresentRecords.length} daripada {targetStudents.length} Pelajar Hadir</span>
                        <span className="text-slate-500">({Math.max(0, targetStudents.length - matchingPresentRecords.length)} Belum Hadir)</span>
                      </div>

                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            percentage >= 80 ? 'bg-emerald-400' : percentage >= 50 ? 'bg-indigo-400' : 'bg-amber-400'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    /* Sesi Terbuka Pelbagai Kelas (Perhimpunan / Aktiviti Kolej) */
                    <div className="grid grid-cols-2 gap-2">
                      {classStats.map((cls, clsIdx) => {
                        const isSelectedFilter = selectedClassFilter === cls.className;
                        return (
                          <div
                            key={`scanner-stat-${cls.className}-${clsIdx}`}
                            onClick={() => setSelectedClassFilter(isSelectedFilter ? 'ALL' : cls.className)}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                              isSelectedFilter
                                ? 'bg-indigo-950/60 border-indigo-500/60 shadow-sm'
                                : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-[11px] font-bold px-1.5 py-0.2 rounded border ${getClassBadgeColor(cls.className)}`}>
                                Set {cls.className}
                              </span>
                              <span className="text-xs font-black text-white">{cls.rate}%</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {cls.present}/{cls.total} Hadir
                            </div>
                            <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden mt-1.5">
                              <div
                                className="h-full bg-indigo-500 rounded-full"
                                style={{ width: `${cls.rate}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* STATS DISPLAY 2: OVERALL */
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">Peratus Keseluruhan Pelajar</span>
                    <span className="text-lg font-black text-emerald-400">
                      {students.length > 0 ? Math.round((sessionRecords.length / students.length) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                      style={{
                        width: `${students.length > 0 ? (sessionRecords.length / students.length) * 100 : 0}%`
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>{sessionRecords.length} Hadir Sesi</span>
                    <span>Jumlah: {students.length} Pelajar</span>
                  </div>
                </div>
              )}
            </div>

            {/* LIVE FEED LIST */}
            <div className="flex-1 flex flex-col min-h-[220px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300">
                  Log Terkini ({filteredSessionRecords.length})
                </span>
                {selectedClassFilter !== 'ALL' && (
                  <button
                    onClick={() => setSelectedClassFilter('ALL')}
                    className="text-[10px] text-indigo-400 hover:underline cursor-pointer"
                  >
                    Reset Penapis
                  </button>
                )}
              </div>

              {filteredSessionRecords.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  <Users className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-xs font-medium">Belum ada rekod kehadiran bagi sesi ini.</p>
                  <p className="text-[10px] text-slate-600 mt-1">Imbas kod QR pelajar untuk memulakan.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {filteredSessionRecords.map((rec) => {
                    const student = students.find((s) => s.id === rec.studentId);
                    if (!student) return null;

                    return (
                      <div
                        key={rec.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-all text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${getStudentColor(student.id)}`}>
                            {getInitials(student.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-white truncate">{student.name}</div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                              <span>{student.studentId}</span>
                              <span>•</span>
                              <span className={`px-1 py-0.2 rounded border font-semibold ${getClassBadgeColor(student.className)}`}>
                                {student.className}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-[10px] font-mono text-emerald-400 font-semibold">
                            {new Date(rec.timestamp).toLocaleTimeString('ms-MY', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </div>
                          <div className="text-[9px] text-slate-500">
                            {rec.method === 'CAMERA_SCAN' ? 'Imbasan QR' : 'Manual'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
