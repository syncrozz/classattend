import React from 'react';
import { ActiveTab, UserRole, OFFICIAL_STUDENT_ATTEND_ICON } from '../types';
import {
  LayoutDashboard,
  QrCode,
  CalendarCheck,
  Users,
  FileSpreadsheet,
  BookOpen,
  UserSquare2,
  GraduationCap,
  Smartphone,
  BookMarked
} from 'lucide-react';

interface SidebarNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  activeSessionName?: string;
  totalRecordsCount: number;
  onOpenPWAInstall?: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeTab,
  onTabChange,
  activeSessionName,
  totalRecordsCount,
  onOpenPWAInstall
}) => {
  const navItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Pusat Operasi',
      icon: LayoutDashboard,
      badge: undefined
    },
    {
      id: 'scanner' as ActiveTab,
      label: 'Imbasan QR Kelas',
      icon: QrCode,
      badge: activeSessionName ? 'LIVE' : undefined,
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    },
    {
      id: 'activities' as ActiveTab,
      label: 'Pengurusan Kelas',
      icon: BookMarked,
      badge: undefined
    },
    {
      id: 'students' as ActiveTab,
      label: 'Pelajar & Kod QR',
      icon: Users,
      badge: '95',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
    },
    {
      id: 'my-attendance' as ActiveTab,
      label: 'Semakan Pelajar',
      icon: UserSquare2,
      badge: 'Pelajar',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    },
    {
      id: 'reports' as ActiveTab,
      label: 'Laporan Kehadiran',
      icon: FileSpreadsheet,
      badge: totalRecordsCount > 0 ? `${totalRecordsCount}` : undefined
    },
    {
      id: 'guide' as ActiveTab,
      label: 'Panduan Pensyarah',
      icon: BookOpen,
      badge: undefined
    }
  ];

  return (
    <aside className="w-full md:w-64 bg-slate-900/60 md:min-h-[calc(100vh-4rem)] border-b md:border-b-0 md:border-r border-slate-800/80 p-3 sm:p-4 flex flex-col justify-between shrink-0">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Menu Kelas & Subjek
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold border ${
                      isActive ? 'bg-white/20 text-white border-white/30' : item.badgeColor || 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info Card */}
      <div className="space-y-2 mt-6">
        {onOpenPWAInstall && (
          <button
            id="sidebar-btn-pwa-install"
            onClick={onOpenPWAInstall}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-500/30 text-indigo-200 text-xs font-semibold transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <img
                src={OFFICIAL_STUDENT_ATTEND_ICON}
                alt="ClassAttend"
                className="w-5 h-5 rounded-md object-contain group-hover:scale-110 transition-transform ring-1 ring-white/10 shrink-0"
                referrerPolicy="no-referrer"
              />
              <span>Pasang Applikasi</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-300 font-bold">
              Install
            </span>
          </button>
        )}

        <div className="hidden md:block p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-2 mb-1 text-slate-300 font-semibold">
            <GraduationCap className="w-4 h-4 text-indigo-400" />
            <span>KPM Bandar Penawar</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Sistem Khusus Kehadiran Kelas & Subjek mengikut Pensyarah & Kelas.
          </p>
        </div>
      </div>
    </aside>
  );
};

