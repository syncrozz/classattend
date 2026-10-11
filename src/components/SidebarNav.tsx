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
  totalStudentsCount?: number;
  currentRole?: UserRole;
  onOpenPWAInstall?: () => void;
  onOpenQrPortal?: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeTab,
  onTabChange,
  activeSessionName,
  totalRecordsCount,
  totalStudentsCount,
  currentRole = 'STUDENT',
  onOpenPWAInstall,
  onOpenQrPortal
}) => {
  const navItems = React.useMemo(() => {
    if (currentRole === 'LECTURER') {
      return [
        {
          id: 'dashboard' as ActiveTab,
          label: 'Kelas Saya',
          icon: LayoutDashboard,
          badge: undefined
        },
        {
          id: 'reports' as ActiveTab,
          label: 'Laporan',
          icon: FileSpreadsheet,
          badge: totalRecordsCount > 0 ? `${totalRecordsCount}` : undefined
        },
        {
          id: 'guide' as ActiveTab,
          label: 'Panduan',
          icon: BookOpen,
          badge: undefined
        }
      ];
    }

    if (currentRole === 'ADMIN') {
      return [
        {
          id: 'dashboard' as ActiveTab,
          label: 'Pusat Kawalan',
          icon: LayoutDashboard,
          badge: undefined
        },
        {
          id: 'students' as ActiveTab,
          label: 'Master Data',
          icon: Users,
          badge: totalStudentsCount ? `${totalStudentsCount}` : undefined,
          badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
        },
        {
          id: 'reports' as ActiveTab,
          label: 'Laporan Kehadiran',
          icon: FileSpreadsheet,
          badge: totalRecordsCount > 0 ? `${totalRecordsCount}` : undefined
        },
        {
          id: 'guide' as ActiveTab,
          label: 'Panduan Penggunaan',
          icon: BookOpen,
          badge: undefined
        }
      ];
    }

    // Default: STUDENT / General Audience
    return [
      {
        id: 'dashboard' as ActiveTab,
        label: 'Dashboard Utama',
        icon: LayoutDashboard,
        badge: undefined
      },
      {
        id: 'guide' as ActiveTab,
        label: 'Panduan Pengguna',
        icon: BookOpen,
        badge: undefined
      }
    ];
  }, [currentRole, totalStudentsCount, totalRecordsCount]);

  return (
    <aside className="group/sidebar w-full md:w-16 md:hover:w-64 transition-all duration-300 ease-in-out bg-slate-900/90 md:bg-slate-900/70 backdrop-blur-md md:min-h-[calc(100vh-4rem)] border-b md:border-b-0 md:border-r border-slate-800/80 p-2 sm:p-3 md:p-2.5 flex flex-col justify-between shrink-0 overflow-hidden z-20 hover:shadow-2xl hover:shadow-black/60 select-none">
      <div className="space-y-1">
        <div className="px-2.5 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap overflow-hidden transition-all duration-200 border-b border-slate-800/40 mb-1">
          <span className="md:hidden md:group-hover/sidebar:inline">
            {currentRole === 'LECTURER' ? 'Menu Pensyarah' : currentRole === 'ADMIN' ? 'Menu Pentadbir' : 'Menu Kelas & Subjek'}
          </span>
          <span className="hidden md:inline md:group-hover/sidebar:hidden text-center block text-[10px] text-slate-600 font-mono tracking-widest">
            •••
          </span>
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
                title={item.label}
                className={`w-full flex items-center justify-between px-2.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer relative group/btn ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center min-w-0">
                  <div className="w-6 h-6 flex items-center justify-center shrink-0">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover/btn:text-slate-200 transition-colors'}`} />
                  </div>
                  <span className="ml-3 whitespace-nowrap overflow-hidden md:opacity-0 md:w-0 md:group-hover/sidebar:opacity-100 md:group-hover/sidebar:w-auto transition-all duration-200">
                    {item.label}
                  </span>
                </div>
                {item.badge && (
                  <>
                    <span
                      className={`hidden md:block md:group-hover/sidebar:hidden absolute top-2 right-2 w-2 h-2 rounded-full ${
                        isActive ? 'bg-white' : 'bg-indigo-400'
                      }`}
                    />
                    <span
                      className={`inline-block md:hidden md:group-hover/sidebar:inline-block text-[10px] px-1.5 py-0.5 rounded-full font-bold border shrink-0 transition-opacity duration-200 ${
                        isActive ? 'bg-white/20 text-white border-white/30' : item.badgeColor || 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info Card */}
      <div className="space-y-2 mt-6">
        {onOpenQrPortal && (
          <button
            id="sidebar-btn-qr-portal"
            onClick={onOpenQrPortal}
            className="w-full flex items-center justify-between px-2.5 py-2.5 rounded-xl bg-teal-950/30 hover:bg-teal-900/40 border border-teal-500/30 text-teal-300 text-xs font-semibold transition-all cursor-pointer group/portal relative"
            title="Portal Pas QR Pelajar (#/qr)"
          >
            <div className="flex items-center min-w-0">
              <div className="w-6 h-6 flex items-center justify-center shrink-0">
                <QrCode className="w-5 h-5 text-teal-400 group-hover/portal:scale-110 transition-transform shrink-0" />
              </div>
              <span className="ml-3 whitespace-nowrap overflow-hidden md:opacity-0 md:w-0 md:group-hover/sidebar:opacity-100 md:group-hover/sidebar:w-auto transition-all duration-200">
                Portal Pas QR Pelajar
              </span>
            </div>
            <span className="inline-block md:hidden md:group-hover/sidebar:inline-block text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-mono font-bold shrink-0">
              #/qr
            </span>
          </button>
        )}

        {onOpenPWAInstall && (
          <button
            id="sidebar-btn-pwa-install"
            onClick={onOpenPWAInstall}
            className="hidden w-full items-center justify-between px-2.5 py-2.5 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-500/30 text-indigo-200 text-xs font-semibold transition-all cursor-pointer group/pwa relative"
            title="Pasang Applikasi"
          >
            <div className="flex items-center min-w-0">
              <div className="w-6 h-6 flex items-center justify-center shrink-0">
                <img
                  src={OFFICIAL_STUDENT_ATTEND_ICON}
                  alt="ClassAttend"
                  className="w-5 h-5 rounded-md object-contain group-hover/pwa:scale-110 transition-transform ring-1 ring-white/10 shrink-0"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="ml-3 whitespace-nowrap overflow-hidden md:opacity-0 md:w-0 md:group-hover/sidebar:opacity-100 md:group-hover/sidebar:w-auto transition-all duration-200">
                Pasang Applikasi
              </span>
            </div>
            <span className="inline-block md:hidden md:group-hover/sidebar:inline-block text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-300 font-bold shrink-0">
              Install
            </span>
          </button>
        )}

        <div className="hidden md:block overflow-hidden transition-all duration-300">
          <div className="hidden md:group-hover/sidebar:block p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-400">
            <div className="flex items-center gap-2 mb-1 text-slate-300 font-semibold">
              <GraduationCap className="w-4 h-4 text-indigo-400" />
              <span>KPM Bandar Penawar</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Sistem Khusus Kehadiran Kelas & Subjek mengikut Pensyarah & Kelas.
            </p>
          </div>
          <div className="flex md:group-hover/sidebar:hidden items-center justify-center py-2 text-slate-500" title="KPM Bandar Penawar">
            <GraduationCap className="w-5 h-5 text-indigo-400/70" />
          </div>
        </div>
      </div>
    </aside>
  );
};

