import React from 'react';
import { AttendanceSession, UserRole, Lecturer, OFFICIAL_STUDENT_ATTEND_ICON } from '../types';
import {
  QrCode,
  Volume2,
  VolumeX,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
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
  onRoleChange: (role: UserRole) => void;
  onToggleSound: (enabled: boolean) => void;
  onResetData: () => void;
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
  onRoleChange,
  onToggleSound,
  onResetData,
  onOpenScanner,
  onToggleAdminMode,
  onLogoutLecturer
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-indigo-500/20 ring-1 ring-white/20 bg-slate-900 flex items-center justify-center shrink-0">
            <img
              src={OFFICIAL_STUDENT_ATTEND_ICON}
              alt="Class Attend Logo"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight">
                <span className="text-white">CLASS</span>
                <span className="text-blue-500">ATTEND</span>
              </h1>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 tracking-wider">
                KPM Bandar Penawar
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Sistem Kehadiran Pelajar Mengikut Kelas, Subjek & Seksyen Pensyarah
            </p>
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

          {/* Lecturer Identity Card */}
          {activeLecturer ? (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-indigo-950/60 border border-indigo-500/40 text-xs">
              <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-[11px] font-bold">
                {activeLecturer.name.charAt(0)}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-white font-semibold text-[11px] leading-tight truncate max-w-[140px]">
                  {activeLecturer.name}
                </div>
                <div className="text-[10px] text-indigo-300 font-mono leading-tight truncate max-w-[140px]">
                  {activeLecturer.email}
                </div>
              </div>
              <button
                type="button"
                onClick={onLogoutLecturer}
                title="Tukar Pensyarah / Log Keluar"
                className="p-1 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              id="header-btn-lecturer-auth"
              onClick={onToggleAdminMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-semibold transition-all cursor-pointer"
              title="Pengesahan Emel Pensyarah (@bpenawar.kpm.edu.my) & PIN No. IC"
            >
              <UserCheck className="w-4 h-4 text-indigo-400" />
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

          {/* Reset Demo Data Button */}
          <button
            id="header-btn-reset-demo"
            onClick={onResetData}
            className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/80 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-all cursor-pointer"
            title="Set Semula Data Sampel Kelas (95 Pelajar)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

