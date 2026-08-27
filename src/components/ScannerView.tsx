import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import { QRCodeSVG } from 'qrcode.react';
import {
  Student,
  AttendanceSession,
  AttendanceRecord,
  ScanResult,
  AttendanceMethod
} from '../types';
import { soundService } from '../services/soundService';
import {
  getClassBadgeColor,
  getInitials,
  getStudentColor,
  sortSessionsLatestFirst
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
  Info,
  Tv,
  Check,
  X,
  HelpCircle,
  Radio,
  FileCheck,
  Award,
  BookOpen,
  UserCheck,
  QrCode,
  Lock,
  RotateCcw
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
    label: 'Santai (Selesa)',
    fps: 4,
    cooldownMs: 3500,
    sameCodeGraceMs: 5000,
    desc: '3.5s jeda • Masa mencukupi untuk pelajar alihkan kad tanpa ralat pendua'
  },
  BALANCED: {
    label: 'Sederhana (Standard)',
    fps: 5,
    cooldownMs: 2500,
    sameCodeGraceMs: 4000,
    desc: '2.5s jeda • Kelajuan seimbang untuk barisan kelas biasa'
  },
  FAST: {
    label: 'Pantas (Laju)',
    fps: 8,
    cooldownMs: 1500,
    sameCodeGraceMs: 2500,
    desc: '1.5s jeda • Imbasan pantas berterusan'
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
  onCloseSession?: (sessionId: string) => void;
  onGoToLecturerWorkspace?: () => void;
  onGoToReports?: () => void;
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
  onCloseSession,
  onGoToLecturerWorkspace,
  onGoToReports,
  soundEnabled,
  onToggleSound
}) => {
  const sortedSessions = sortSessionsLatestFirst(allSessions);
  const [selectedSessionId, setSelectedSessionId] = useState<string>(activeSession?.id || sortedSessions[0]?.id || '');
  
  // Tabs: 'CAMERA' | 'PROJECTOR_QR' | 'MANUAL'
  const [scannerMode, setScannerMode] = useState<'CAMERA' | 'PROJECTOR_QR' | 'MANUAL'>('CAMERA');
  
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [manualInput, setManualInput] = useState<string>('');
  const [cooldown, setCooldown] = useState<boolean>(false);
  const [cooldownSecondsLeft, setCooldownSecondsLeft] = useState<number>(0);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  
  // Real-time ticking clock for live attendance
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  // Close Session Confirmation & Summary Modals
  const [isCloseModalOpen, setIsCloseModalOpen] = useState<boolean>(false);
  const [closedSessionSummary, setClosedSessionSummary] = useState<{
    sessionId: string;
    sessionName: string;
    subjectCode: string;
    subjectName: string;
    className: string;
    date: string;
    presentCount: number;
    totalCount: number;
    percentage: number;
  } | null>(null);

  const [scanPace, setScanPace] = useState<ScanPaceMode>(() => {
    try {
      const saved = localStorage.getItem('classattend_scan_pace');
      if (saved === 'RELAXED' || saved === 'BALANCED' || saved === 'FAST') {
        return saved;
      }
    } catch (e) {}
    return 'BALANCED';
  });
  const [showPaceSettings, setShowPaceSettings] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const qrRegionId = 'qr-reader-studentattend';

  // Live clock ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  const currentSession = allSessions.find((s) => s.id === selectedSessionId) || activeSession || sortedSessions[0];

  // Session attendance stats
  const sessionRecords = currentSession
    ? attendanceRecords.filter((r) => r.sessionId === currentSession.id && r.status === 'PRESENT')
    : [];

  // Strictly target students of the same class for Class/Lecture sessions
  const targetStudents = currentSession
    ? currentSession.className && currentSession.className !== 'ALL' && currentSession.className !== 'SEMUA'
      ? students.filter((s) => s.className.toUpperCase() === currentSession.className?.toUpperCase())
      : selectedClassFilter !== 'ALL'
      ? students.filter((s) => s.className.toUpperCase() === selectedClassFilter.toUpperCase())
      : students
    : [];

  // Present records strictly matching the target class (if class session)
  const matchingPresentRecords = currentSession?.className && currentSession.className !== 'ALL' && currentSession.className !== 'SEMUA'
    ? sessionRecords.filter((r) => {
        const student = students.find((s) => s.id === r.studentId);
        return student?.className.toUpperCase() === currentSession.className?.toUpperCase();
      })
    : selectedClassFilter !== 'ALL'
    ? sessionRecords.filter((r) => {
        const student = students.find((s) => s.id === r.studentId);
        return student?.className.toUpperCase() === selectedClassFilter.toUpperCase();
      })
    : sessionRecords;

  const percentage =
    targetStudents.length > 0 ? Math.round((matchingPresentRecords.length / targetStudents.length) * 100) : 0;
  
  const isAllPresent = targetStudents.length > 0 && matchingPresentRecords.length >= targetStudents.length;

  // Filtered session records based on class filter (Sorted latest-first)
  const filteredSessionRecords = sessionRecords.filter((record) => {
    if (selectedClassFilter === 'ALL') return true;
    const student = students.find((s) => s.id === record.studentId);
    return student?.className.toUpperCase() === selectedClassFilter.toUpperCase();
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

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
          colors: ['#10b981', '#6366f1', '#38bdf8']
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
          fps: activeConfig.fps,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          handleScannedData(decodedText, 'CAMERA_SCAN');
        },
        () => {}
      );

      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Camera start error:', err);
      setCameraError('Kamera tidak dapat digunakan pada peranti ini. Sila benarkan akses kamera pada pelayar atau gunakan tab Input Manual.');
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
    try {
      localStorage.setItem('classattend_scan_pace', newPace);
    } catch (e) {}

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

  // Quick student match list
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
    .slice(0, 6);

  // Close Session Handler
  const handleConfirmCloseSession = () => {
    if (!currentSession) return;
    setIsCloseModalOpen(false);

    const summary = {
      sessionId: currentSession.id,
      sessionName: currentSession.sessionName,
      subjectCode: currentSession.subjectCode || 'KULIAH',
      subjectName: currentSession.subjectName || '',
      className: currentSession.className || 'Semua',
      date: currentSession.date || new Date().toISOString().split('T')[0],
      presentCount: matchingPresentRecords.length,
      totalCount: targetStudents.length,
      percentage: percentage
    };

    setClosedSessionSummary(summary);

    if (onCloseSession) {
      onCloseSession(currentSession.id);
    }
    soundService.playSuccess();
  };

  return (
    <div id="live-attendance-container" className="space-y-6 animate-fadeIn">
      {/* 1. FIRST VIEWPORT: LIVE ATTENDANCE HEADER & METRIC BAR */}
      <div
        id="live-attendance-header-banner"
        className="rounded-3xl bg-slate-900 border border-slate-800 p-4 sm:p-6 shadow-2xl relative overflow-hidden space-y-4"
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-1/4 w-96 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Row: Live Status, Subject, Class, Clock, Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
          <div className="flex flex-wrap items-center gap-2.5">
            {currentSession?.status === 'OPEN' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black tracking-wider uppercase shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span>LIVE KEHADIRAN</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-xs font-bold uppercase">
                <Lock className="w-3 h-3" />
                <span>SESI SELESAI</span>
              </span>
            )}

            {currentSession?.subjectCode && (
              <span className="px-2.5 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono font-extrabold text-xs">
                {currentSession.subjectCode}
              </span>
            )}

            {currentSession?.className && (
              <span className={`px-2.5 py-1 rounded-xl text-xs font-extrabold border ${getClassBadgeColor(currentSession.className)}`}>
                Kelas {currentSession.className}
              </span>
            )}
          </div>

          {/* Right Side: Live Clock, Close Session, Pace, Sound Controls */}
          <div className="flex items-center gap-2">
            {/* Live Clock */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 text-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {currentTime.toLocaleTimeString('ms-MY', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </span>
            </div>

            {/* Sound Toggle */}
            <button
              type="button"
              id="btn-toggle-sound"
              onClick={() => onToggleSound(!soundEnabled)}
              className={`p-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                soundEnabled ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
              title="Bunyi Maklum Balas"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-indigo-400" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Close Session Button */}
            {currentSession?.status === 'OPEN' && (
              <button
                type="button"
                id="btn-close-session-header"
                onClick={() => setIsCloseModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Tutup Sesi</span>
              </button>
            )}
          </div>
        </div>

        {/* Subject Name & Details */}
        <div className="space-y-1 relative z-10">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {currentSession?.subjectName
              ? `${currentSession.subjectCode ? `${currentSession.subjectCode} - ` : ''}${currentSession.subjectName}`
              : currentSession?.sessionName || 'Sesi Kehadiran'}
          </h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
            <span>Pensyarah: <strong className="text-slate-200">{currentSession?.lecturerName || 'Pensyarah Kursus'}</strong></span>
            <span>•</span>
            <span>Tarikh: <strong className="text-slate-200">{currentSession?.date || currentTime.toISOString().split('T')[0]}</strong></span>
            {currentSession?.className && (
              <>
                <span>•</span>
                <span>Kelas: <strong className="text-indigo-300">{currentSession.className}</strong></span>
              </>
            )}
          </div>
        </div>

        {/* PRIMARY REAL-TIME ATTENDANCE METRIC BAR */}
        <div
          id="real-time-attendance-metric-card"
          className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3 relative z-10"
        >
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Status Kehadiran Sebenar
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight flex items-baseline gap-2">
                <span className="text-emerald-400">{matchingPresentRecords.length}</span>
                <span className="text-slate-500 text-lg sm:text-xl">/ {targetStudents.length} HADIR</span>
                <span className="text-xs font-sans font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {percentage}%
                </span>
              </div>
            </div>

            {/* 100% Completion Badge */}
            {isAllPresent ? (
              <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black flex items-center gap-2 animate-bounce">
                <Award className="w-4 h-4 text-emerald-400" />
                <span>SEMUA PELAJAR DIREKODKAN (100%)</span>
              </div>
            ) : (
              <div className="text-xs text-slate-400 text-right">
                <span className="font-semibold text-slate-300">
                  {Math.max(0, targetStudents.length - matchingPresentRecords.length)} Pelajar
                </span>{' '}
                belum hadir
              </div>
            )}
          </div>

          {/* Smooth High-Contrast Progress Bar */}
          <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isAllPresent
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-md shadow-emerald-500/50'
                  : percentage >= 75
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                  : percentage >= 50
                  ? 'bg-gradient-to-r from-indigo-500 to-emerald-400'
                  : 'bg-gradient-to-r from-amber-500 to-indigo-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(percentage, 2))}%` }}
            />
          </div>
        </div>

        {/* Session Switcher Selector */}
        <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <span className="text-slate-400 font-semibold whitespace-nowrap">Tukar Sesi:</span>
            <select
              id="select-active-session-switch"
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {sortedSessions.map((ses) => (
                <option key={ses.id} value={ses.id}>
                  {ses.status === 'OPEN' ? '🟢 [AKTIF] ' : '⚪ '}
                  {ses.subjectCode ? `${ses.subjectCode} - ` : ''}
                  {ses.sessionName} ({ses.className || 'Semua'}) • {ses.date}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onGoToActivities}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>Semua Sesi & Kelas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. MODE SELECTOR TABS (Camera / Projector QR / Manual Search) */}
      <div className="flex items-center bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
        <button
          type="button"
          id="tab-mode-camera"
          onClick={() => setScannerMode('CAMERA')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            scannerMode === 'CAMERA'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Kamera Pensyarah</span>
        </button>

        <button
          type="button"
          id="tab-mode-projector"
          onClick={() => setScannerMode('PROJECTOR_QR')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            scannerMode === 'PROJECTOR_QR'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Tv className="w-4 h-4" />
          <span>Paparan QR Projektor (Pelajar Imbas)</span>
        </button>

        <button
          type="button"
          id="tab-mode-manual"
          onClick={() => setScannerMode('MANUAL')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            scannerMode === 'MANUAL'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Carian & Input Manual</span>
        </button>
      </div>

      {/* 3. MAIN INTERACTION GRID: SCANNER WORKSPACE + LIVE ATTENDANCE LOG */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: ACTIVE SCANNER VIEWPORT (7 COLS) */}
        <div className="lg:col-span-7 space-y-4">
          {/* TAB 1: CAMERA SCANNER */}
          {scannerMode === 'CAMERA' && (
            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white">Kamera Pengimbas QR</h3>
                </div>
                <div className="flex items-center gap-2">
                  {!isCameraActive ? (
                    <button
                      type="button"
                      id="scanner-btn-start-camera"
                      onClick={startCamera}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Aktifkan Kamera</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      id="scanner-btn-stop-camera"
                      onClick={stopCamera}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-600/20 text-slate-300 hover:text-rose-300 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
                    >
                      <CameraOff className="w-3.5 h-3.5" />
                      <span>Hentikan Kamera</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Video Viewport Container */}
              <div
                className={`relative rounded-2xl overflow-hidden bg-slate-950 border transition-all min-h-[320px] flex items-center justify-center ${
                  cooldown ? 'border-emerald-500/60 shadow-lg shadow-emerald-500/10' : 'border-slate-800'
                }`}
              >
                <div id={qrRegionId} className="w-full max-w-sm"></div>

                {!isCameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/95 space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                      <Camera className="w-8 h-8" />
                    </div>
                    <div className="space-y-1 max-w-xs">
                      <h4 className="text-sm font-bold text-white">Kamera Belum Diaktifkan</h4>
                      <p className="text-xs text-slate-400">
                        Halakan kamera ke Kod QR Pelajar untuk merekod kehadiran secara serta-merta.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/40 transition-all cursor-pointer"
                      >
                        Buka Kamera Sekarang
                      </button>
                      <button
                        type="button"
                        onClick={() => setScannerMode('MANUAL')}
                        className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all cursor-pointer"
                      >
                        Input Manual
                      </button>
                    </div>
                  </div>
                )}

                {/* Cooldown Overlay */}
                {isCameraActive && cooldown && (
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600/90 backdrop-blur-md text-white text-[11px] font-bold shadow-lg animate-pulse border border-emerald-400/40">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Kad Direkod • Sedia dalam {cooldownSecondsLeft}s</span>
                  </div>
                )}

                {/* Ready Indicator */}
                {isCameraActive && !cooldown && (
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Sedia Mengimbas</span>
                  </div>
                )}
              </div>

              {/* Camera Error Recovery Message */}
              {cameraError && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-rose-200">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{cameraError}</span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setScannerMode('MANUAL')}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors cursor-pointer"
                    >
                      Gunakan Input Manual
                    </button>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Cuba Buka Semula
                    </button>
                  </div>
                </div>
              )}

              {/* Fast Manual Search Under Camera */}
              <div className="pt-2 border-t border-slate-800/80">
                <form onSubmit={handleManualSubmit} className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold">Carian Pantas No. Pelajar / Nama:</span>
                    <span className="text-[10px] text-slate-500">Cth: PDA-2502-005</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        id="scanner-quick-input"
                        type="text"
                        placeholder="No. Pelajar atau Nama..."
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 transition-all cursor-pointer"
                    >
                      Sahkan
                    </button>
                  </div>
                </form>

                {/* Auto-suggest dropdown */}
                {filteredQuickList.length > 0 && (
                  <div className="mt-2 p-2 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    {filteredQuickList.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          handleScannedData(st.id, 'MANUAL_OVERRIDE');
                          setManualInput('');
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-900 text-left transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${getStudentColor(st.id)}`}>
                            {getInitials(st.name)}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white group-hover:text-indigo-300">{st.name}</div>
                            <div className="text-[10px] text-slate-400">{st.studentId} • {st.className}</div>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-emerald-400 group-hover:underline">Tanda Hadir &rarr;</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PROJECTOR QR CODE FOR STUDENTS TO SCAN */}
          {scannerMode === 'PROJECTOR_QR' && currentSession && (() => {
            const studentWebUrl = typeof window !== 'undefined'
              ? `${window.location.origin}${window.location.pathname}#attend?session=${currentSession.id}&subject=${encodeURIComponent(currentSession.subjectCode || '')}&class=${encodeURIComponent(currentSession.className || '')}&lecturer=${encodeURIComponent(currentSession.lecturerName || '')}&subjectName=${encodeURIComponent(currentSession.subjectName || '')}`
              : `CLASSATTEND_SESSION|${currentSession.id}|${currentSession.subjectCode || ''}|${currentSession.className || ''}`;

            return (
              <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-5 text-center shadow-xl">
                <div className="space-y-1">
                  <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-extrabold uppercase">
                    Paparan Skrin Kelas / Projektor
                  </span>
                  <h3 className="text-lg font-black text-white pt-2">Imbas Kod QR Untuk Hadir</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Pelajar boleh menghalakan kamera telefon ke kod QR di bawah untuk mengesahkan kehadiran kelas secara langsung.
                  </p>
                </div>

                {/* Large Crisp QR Code */}
                <div className="inline-block p-5 bg-white rounded-3xl shadow-2xl border-4 border-indigo-500/30">
                  <QRCodeSVG
                    value={studentWebUrl}
                    size={240}
                    level="H"
                    includeMargin={true}
                  />
                </div>

                {/* Quick Share Link & Test Actions */}
                <div className="max-w-md mx-auto flex flex-col sm:flex-row items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof navigator !== 'undefined' && navigator.clipboard) {
                        navigator.clipboard.writeText(studentWebUrl);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 3000);
                      }
                    }}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>{copiedLink ? '✓ Pautan Disalin!' : '📋 Salin Pautan Kelas (WhatsApp / Telegram)'}</span>
                  </button>

                  <a
                    href={studentWebUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>↗ Uji Paparan Pelajar</span>
                  </a>
                </div>

                {/* Session Meta on Projector */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 max-w-md mx-auto flex items-center justify-around text-xs">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Subjek</div>
                    <strong className="text-indigo-300 font-mono">{currentSession.subjectCode || 'KULIAH'}</strong>
                  </div>
                  <div className="h-6 w-px bg-slate-800" />
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Kelas</div>
                    <strong className="text-emerald-400">{currentSession.className || 'Semua'}</strong>
                  </div>
                  <div className="h-6 w-px bg-slate-800" />
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Terkumpul</div>
                    <strong className="text-white font-mono">{matchingPresentRecords.length} / {targetStudents.length}</strong>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB 3: FULL MANUAL ENTRY & STUDENT DIRECTORY CHECK-IN */}
          {scannerMode === 'MANUAL' && (
            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white">Carian & Input No. Pelajar</h3>
                </div>
                <span className="text-[11px] text-slate-400">
                  {targetStudents.length} Pelajar Berdaftar
                </span>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      id="scanner-full-manual-input"
                      type="text"
                      placeholder="Masukkan No. Pelajar atau Nama..."
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                  >
                    Sahkan Kehadiran
                  </button>
                </div>
              </form>

              {/* Roster of Students for One-Click Attendance */}
              <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-1">
                  Senarai Pelajar Kelas {currentSession?.className || ''}
                </div>
                {targetStudents.map((st) => {
                  const isPresent = sessionRecords.some((r) => r.studentId === st.id);
                  return (
                    <div
                      key={st.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all text-xs ${
                        isPresent
                          ? 'bg-emerald-950/20 border-emerald-500/30'
                          : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${getStudentColor(st.id)}`}>
                          {getInitials(st.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-white truncate">{st.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{st.studentId} • {st.className}</div>
                        </div>
                      </div>

                      {isPresent ? (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Hadir</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleScannedData(st.id, 'MANUAL')}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white font-bold text-xs transition-colors cursor-pointer"
                        >
                          + Tanda Hadir
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. REAL-TIME SCAN RESULT CARD (SUCCESS / DUPLICATE / ERROR) */}
          {scanResult && (
            <div
              id="scanner-latest-result-card"
              className={`rounded-3xl border p-5 transition-all shadow-2xl animate-fadeIn ${
                scanResult.success
                  ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-100'
                  : scanResult.isDuplicate
                  ? 'bg-amber-950/50 border-amber-500/50 text-amber-100'
                  : 'bg-rose-950/50 border-rose-500/50 text-rose-100'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-xl font-bold shadow-lg ${
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

                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-full ${
                        scanResult.success
                          ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                          : scanResult.isDuplicate
                          ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                          : 'bg-rose-500/30 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {scanResult.success
                        ? '✓ HADIR'
                        : scanResult.isDuplicate
                        ? '⚠️ SUDAH DIREKODKAN'
                        : '❌ PELAJAR TIDAK DITEMUI'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(scanResult.timestamp).toLocaleTimeString('ms-MY')}
                    </span>
                  </div>

                  <h4 className="text-base font-extrabold text-white">
                    {scanResult.student ? scanResult.student.name : 'Maklumat Imbasan'}
                  </h4>

                  {scanResult.student && (
                    <div className="text-xs text-slate-300 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>No. Pelajar: <strong className="text-white font-mono">{scanResult.student.studentId}</strong></span>
                      <span>Kelas: <strong className="text-white">{scanResult.student.className}</strong></span>
                    </div>
                  )}

                  <p className="text-xs pt-1 font-medium leading-relaxed">
                    {scanResult.message}
                  </p>

                  {/* Recovery Action if error */}
                  {!scanResult.success && !scanResult.isDuplicate && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setScannerMode('MANUAL')}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
                      >
                        Gunakan Carian Manual &rarr;
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: LIVE ATTENDEES STREAM & LOG (5 COLS) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4 flex flex-col h-full shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-extrabold text-white">Log Kehadiran Langsung</h3>
                <p className="text-[11px] text-slate-400">
                  {matchingPresentRecords.length} pelajar hadir bagi sesi ini
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold font-mono">
                {matchingPresentRecords.length}
              </span>
            </div>

            {/* Attendees Stream List */}
            <div className="flex-1 flex flex-col min-h-[360px]">
              {filteredSessionRecords.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                  <Users className="w-10 h-10 mb-2 opacity-30 text-slate-400" />
                  <p className="text-xs font-bold text-slate-400">Belum ada rekod kehadiran bagi sesi ini.</p>
                  <p className="text-[10px] text-slate-500 mt-1">Imbas kod QR pelajar untuk mula merekod.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {filteredSessionRecords.map((rec) => {
                    const student = students.find((s) => s.id === rec.studentId);
                    if (!student) return null;

                    return (
                      <div
                        key={rec.id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-all text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-extrabold shrink-0 shadow-sm ${getStudentColor(student.id)}`}>
                            {getInitials(student.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-white truncate">{student.name}</div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                              <span className="font-mono">{student.studentId}</span>
                              <span>•</span>
                              <span className={`px-1.5 py-0.2 rounded border font-semibold ${getClassBadgeColor(student.className)}`}>
                                {student.className}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-[11px] font-mono text-emerald-400 font-bold">
                            {new Date(rec.timestamp).toLocaleTimeString('ms-MY', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </div>
                          <div className="text-[9px] text-slate-500 uppercase font-semibold">
                            {rec.method === 'CAMERA_SCAN' ? 'Kamera' : rec.method === 'MANUAL' ? 'Manual' : 'Imbasan'}
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

      {/* 5. CLOSE SESSION CONFIRMATION MODAL */}
      {isCloseModalOpen && currentSession && (
        <div
          id="close-session-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
        >
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Tutup Sesi Kehadiran?</h3>
                <p className="text-xs text-slate-400">Sahkan penutupan sesi kelas</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Subjek:</span>
                <strong className="text-white font-mono">{currentSession.subjectCode || currentSession.sessionName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Kelas:</span>
                <strong className="text-emerald-400">{currentSession.className || 'Semua'}</strong>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-800">
                <span className="text-slate-400">Jumlah Direkod:</span>
                <strong className="text-emerald-400 font-mono text-sm">
                  {matchingPresentRecords.length} / {targetStudents.length} ({percentage}%)
                </strong>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Semua rekod kehadiran akan disimpan ke dalam pangkalan data secara kekal. Anda masih boleh melihat laporan kehadiran pada bila-bila masa.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsCloseModalOpen(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                id="btn-confirm-close-session-action"
                onClick={handleConfirmCloseSession}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold shadow-lg shadow-rose-900/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Lock className="w-4 h-4" />
                <span>Tutup Sesi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. POST-SESSION COMPLETION SUMMARY MODAL */}
      {closedSessionSummary && (
        <div
          id="session-summary-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn"
        >
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 text-center relative overflow-hidden">
            <div className="w-14 h-14 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">KEHADIRAN BERJAYA DISIMPAN</h3>
              <p className="text-xs text-slate-400">Sesi kelas telah selesai dan dimuktamatkan.</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 text-left text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Subjek:</span>
                <strong className="text-white font-mono">{closedSessionSummary.subjectCode}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Kelas:</span>
                <strong className="text-emerald-400">Kelas {closedSessionSummary.className}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tarikh:</span>
                <strong className="text-slate-300">{closedSessionSummary.date}</strong>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-800">
                <span className="text-slate-400">Jumlah Kehadiran:</span>
                <strong className="text-emerald-400 font-mono text-sm">
                  {closedSessionSummary.presentCount} / {closedSessionSummary.totalCount} ({closedSessionSummary.percentage}%)
                </strong>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                id="btn-return-workspace"
                onClick={() => {
                  setClosedSessionSummary(null);
                  if (onGoToLecturerWorkspace) onGoToLecturerWorkspace();
                }}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                Kembali ke Ruang Kerja Pensyarah
              </button>
              <button
                type="button"
                id="btn-view-reports"
                onClick={() => {
                  setClosedSessionSummary(null);
                  if (onGoToReports) onGoToReports();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
              >
                Lihat Rekod & Laporan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
