import React from 'react';
import { AttendanceSession, UserRole, Lecturer, OFFICIAL_STUDENT_ATTEND_ICON } from '../types';
import {
  QrCode,
  Volume2,
  VolumeX,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  UserCheck,
  GraduationCap,
  Cloud,
  CheckCircle2,
  BookOpen,
  LogOut,
  User
} from 'lucide-react';

interface HeaderProps {
  activeSession: AttendanceSession | null;
  activeLecturer: Lecturer | null;
  soundEnabled: boolean;
  isAdmin: boolean;
  currentRole: UserRole;
  onGoHome: () => void;
  onRoleChange: (role: UserRole) => void;
  onToggleSound: (enabled: boolean) => void;
  onOpenScanner: () => void;
  onToggleAdminMode: () => void;
  onLogoutLecturer: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeSession,
  activeLecturer,
  soundEnabled,
  isAdmin,
  currentRole,
  onGoHome,
  onRoleChange,
  onToggleSound,
  onOpenScanner,
  onToggleAdminMode,
  onLogoutLecturer
}) => {
  const isPrivileged = Boolean(activeLecturer || isAdmin);

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Title - Set as trigger to display default homepage view */}
        <div
          id="header-brand-trigger"
          onClick={onGoHome}
          className="flex items-center gap-3 cursor-pointer group select-none transition-all p-1.5 -ml-1.5 rounded-2xl hover:bg-slate-800/60 active:scale-[0.98]"
          title="Klik untuk kembali ke Halaman Utama (Dashboard)"
        >
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-indigo-500/20 ring-1 ring-white/20 bg-slate-900 flex items-center justify-center shrink-0 group-hover:ring-indigo-400/50 transition-all">
            <img
              src={OFFICIAL_STUDENT_ATTEND_ICON}
              alt="Class Attend Logo"
              className="w-full h-full object-contain group-hover:scale-105 transition-transform"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex flex-col justify-center">
            <div className="flex flex-col items-start gap-0.5">
              <h1 className="text-lg font-extrabold tracking-tight leading-none flex items-center gap-1.5">
                <span className="text-white group-hover:text-indigo-200 transition-colors">CLASS</span>
                <span className="text-blue-500 group-hover:text-blue-400 transition-colors">ATTEND</span>
              </h1>
              <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 tracking-wider mt-0.5 inline-flex items-center">
                KPM Bandar Penawar
              </span>
            </div>
          </div>
        </div>

        {/* Active Session Pill, Lecturer Badge & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Active Class Session Indicator */}
          {activeSession ? (
            <div
              id="header-active-session-indicator"
              onClick={onOpenScanner}
              className="cursor-pointer hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all text-xs font-medium text-emerald-300 group"
              title="Klik untuk buka pengimbas bagi kelas ini"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="truncate max-w-[180px] text-slate-200 group-hover:text-white font-semibold">
                {activeSession.subjectCode ? `[${activeSession.subjectCode}] ` : ''}{activeSession.sessionName}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 uppercase font-bold">
                KELAS BUKA
              </span>
            </div>
          ) : (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-slate-500"></span>
              <span>Tiada Kelas Dibuka</span>
            </div>
          )}

          {/* Lecturer / Admin Identity Card (Turns green when active) */}
          {activeLecturer || isAdmin ? (
            <div
              id="header-lecturer-indicator"
              className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-xs shadow-lg shadow-emerald-950/40 transition-all"
            >
              <div className="relative flex items-center justify-center shrink-0">
                <div className="w-6 h-6 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-[11px] font-bold shadow-sm">
                  {activeLecturer ? activeLecturer.name.charAt(0) : 'A'}
                </div>
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
              </div>
              <div className="hidden md:block text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-white font-semibold text-[11px] leading-tight truncate max-w-[130px]">
                    {activeLecturer ? activeLecturer.name : 'Pentadbir (Admin)'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (isAdmin || activeLecturer?.role === 'ADMIN') {
                        onRoleChange(currentRole === 'ADMIN' ? 'LECTURER' : 'ADMIN');
                      }
                    }}
                    title={isAdmin || activeLecturer?.role === 'ADMIN' ? "Klik untuk tukar paparan Admin / Pensyarah" : undefined}
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold border uppercase transition-all ${
                      currentRole === 'ADMIN'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
                    } ${isAdmin || activeLecturer?.role === 'ADMIN' ? 'cursor-pointer' : ''}`}
                  >
                    {currentRole === 'ADMIN' ? 'ADMIN' : 'PENSYARAH'}
                  </button>
                </div>
                <div className="text-[10px] text-emerald-300 font-mono leading-tight truncate max-w-[140px]">
                  {activeLecturer ? activeLecturer.email : 'admin@bpenawar.kpm.edu.my'}
                </div>
              </div>
              <button
                type="button"
                id="header-btn-lock-session"
                onClick={onLogoutLecturer}
                title="Kunci Akses (Keluarkan Sesi)"
                className="p-1.5 text-emerald-400/80 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer ml-0.5 flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden xl:inline text-[10px] font-semibold text-rose-300">Kunci Akses</span>
              </button>
            </div>
          ) : (
            <button
              id="header-btn-lecturer-auth"
              onClick={onToggleAdminMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-semibold transition-all cursor-pointer"
              title="Pengesahan Emel Pensyarah (@bpenawar.kpm.edu.my) & PIN No. IC"
            >
              <span>Sahkan Pensyarah</span>
            </button>
          )}

          {/* Quick Scanner Action Button */}
          <button
            id="header-btn-quick-scanner"
            onClick={onOpenScanner}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">Imbas QR</span>
          </button>

          {/* Sound Toggle */}
          <button
            id="header-btn-sound-toggle"
            onClick={() => onToggleSound(!soundEnabled)}
            className={`p-2 rounded-lg border transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-slate-800 border-slate-700 text-indigo-400 hover:bg-slate-700'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
            }`}
            title={soundEnabled ? 'Bunyi Diaktifkan' : 'Bunyi Dimatikan'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};

