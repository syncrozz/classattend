import React, { useState, useEffect, useRef } from 'react';
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
  GraduationCap
} from 'lucide-react';

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
  const [statsMode, setStatsMode] = useState<'CLASS' | 'OVERALL'>('CLASS');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const qrRegionId = 'qr-reader-studentattend';

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

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(qrRegionId);
      }

      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
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

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(console.warn);
      }
    };
  }, []);

  // Handle Scan Data with cooldown throttling
  const handleScannedData = (dataString: string, method: AttendanceMethod = 'CAMERA_SCAN') => {
    if (cooldown) return;

    setCooldown(true);
    setTimeout(() => setCooldown(false), 2200);

    const result = onProcessScan(dataString, method, currentSession?.id);
    setScanResult(result);

    if (result.success) {
      if (soundEnabled) soundService.playSuccess();
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#6366f1', '#10b981', '#38bdf8']
        });
      } catch (e) {}
    } else if (result.isDuplicate) {
      if (soundEnabled) soundService.playDuplicate();
    } else {
      if (soundEnabled) soundService.playError();
    }
  };

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

          <div className="flex items-center gap-2">
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

        {/* Row 2: Selected Session Details */}
        <div className="space-y-1.5">
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex flex-wrap items-center gap-2">
            {currentSession ? currentSession.sessionName : 'Sila Pilih Sesi'}
            {currentSession?.className && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Seksyen {currentSession.className}
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
            {currentSession?.location} • {currentSession?.lecturerName ? `Pensyarah: ${currentSession.lecturerName}` : (currentSession?.organizer || 'Pensyarah Kursus')}
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
              {allSessions.map((ses) => {
                const subDetail = ses.subjectCode ? ` [${ses.subjectCode}]` : '';
                const classDetail = ses.className ? ` (Seksyen ${ses.className})` : '';
                const statusPrefix = ses.status === 'OPEN' ? '🟢 [AKTIF] ' : '🔵 ';

                return (
                  <option key={ses.id} value={ses.id}>
                    {statusPrefix}{ses.sessionName}{subDetail}{classDetail}
                  </option>
                );
              })}
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
              <div>
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
            <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 min-h-[300px] flex items-center justify-center">
              <div id={qrRegionId} className="w-full max-w-sm"></div>

              {!isCameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/90">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mb-3 text-indigo-400">
                    <Camera className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">Kamera Belum Diaktifkan</h4>
                  <p className="text-xs text-slate-400 max-w-xs mb-4">
                    Halakan kamera peranti ke Kod QR Pelajar (contoh format: <code className="text-indigo-300">STUDENT|PDA-2502-005</code>) untuk merekod kehadiran secara automatik.
                  </p>
                  <button
                    onClick={startCamera}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
                  >
                    Buka Kamera Sekarang
                  </button>
                </div>
              )}

              {cooldown && (
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-indigo-500/90 text-white text-[10px] font-bold animate-pulse shadow-lg">
                  Memproses...
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
                        ></div>
                      </div>
                    </div>
                  ) : (
                    /* Sesi Terbuka Pelbagai Kelas (Perhimpunan / Aktiviti Kolej) */
                    <div className="grid grid-cols-2 gap-2">
                      {classStats.map((cls) => {
                        const isSelectedFilter = selectedClassFilter === cls.className;
                        return (
                          <div
                            key={cls.className}
                            onClick={() => setSelectedClassFilter(isSelectedFilter ? 'ALL' : cls.className)}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                              isSelectedFilter
                                ? 'bg-slate-800 border-indigo-400'
                                : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                            }`}
                            title={`Klik untuk tapis senarai kelas ${cls.className}`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${getClassBadgeColor(cls.className)}`}>
                                {cls.className}
                              </span>
                              <span className="text-xs font-black text-white">
                                {cls.rate}%
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
                              <span>{cls.present} / {cls.total} Hadir</span>
                            </div>

                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  cls.rate >= 80 ? 'bg-emerald-400' : cls.rate >= 50 ? 'bg-indigo-400' : 'bg-amber-400'
                                }`}
                                style={{ width: `${cls.rate}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {!currentSession?.className && (
                    <p className="text-[10px] text-slate-500 text-center">
                      💡 Klik mana-mana kotak kelas di atas untuk tapis senarai imbasan di bawah.
                    </p>
                  )}
                </div>
              ) : (
                /* STATS DISPLAY 2: OVERALL (OPTION) */
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">
                        {currentSession?.className ? `Peratus Kehadiran Set ${currentSession.className}` : 'Peratus Keseluruhan Sesi'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {matchingPresentRecords.length} daripada {targetStudents.length} Pelajar
                      </div>
                    </div>
                    <div className="text-2xl font-black text-emerald-400">{percentage}%</div>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Class Filter Badges & Scan Stream Header */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  Senarai Pelajar Hadir ({filteredSessionRecords.length})
                </span>
                {selectedClassFilter !== 'ALL' && (
                  <button
                    onClick={() => setSelectedClassFilter('ALL')}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                  >
                    Set Semula Tapis (Semua)
                  </button>
                )}
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setSelectedClassFilter('ALL')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    selectedClassFilter === 'ALL'
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  Semua ({sessionRecords.length})
                </button>
                {availableClasses.map((cls) => {
                  const count = sessionRecords.filter((r) => {
                    const st = students.find((s) => s.id === r.studentId);
                    return st?.className === cls;
                  }).length;

                  return (
                    <button
                      key={cls}
                      onClick={() => setSelectedClassFilter(cls)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                        selectedClassFilter === cls
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {cls} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* List of checked in students for this session */}
            <div className="flex-1 overflow-y-auto max-h-[380px] space-y-2 pr-1">
              {filteredSessionRecords.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  {selectedClassFilter !== 'ALL'
                    ? `Belum ada pelajar dari kelas ${selectedClassFilter} yang mengimbas kehadiran.`
                    : 'Belum ada pelajar yang mengimbas kehadiran bagi sesi ini.'}
                </div>
              ) : (
                filteredSessionRecords.map((record) => {
                  const student = students.find((s) => s.id === record.studentId);
                  return (
                    <div
                      key={record.id}
                      className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-3 hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${student ? getStudentColor(student.id) : 'bg-slate-800'}`}>
                          {student ? getInitials(student.name) : 'ST'}
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-semibold text-white truncate">
                            {student ? student.name : record.studentId}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {student?.studentId} • <span className="font-bold text-slate-300">{student?.className}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[11px] font-bold text-emerald-400">
                          {new Date(record.timestamp).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <span className="text-[9px] text-slate-500 uppercase">{record.method}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
