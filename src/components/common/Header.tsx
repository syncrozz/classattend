import React, { useState } from 'react';
import { Shield, Menu, X, LogOut, Settings, Edit3, Eye, Lock } from 'lucide-react';
import { NavigationTab, UserRole } from '../../types';

interface HeaderProps {
  tabs: NavigationTab[];
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  userRole: UserRole | null;
  userEmail?: string;
  inlineEditMode: boolean;
  onToggleInlineEdit: () => void;
  isAdminView: boolean;
  onToggleAdminView: () => void;
  onLogout: () => void;
  onOpenAdminLogin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  tabs,
  activeTab,
  onSelectTab,
  userRole,
  userEmail,
  inlineEditMode,
  onToggleInlineEdit,
  isAdminView,
  onToggleAdminView,
  onLogout,
  onOpenAdminLogin,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAdmin = userRole === 'admin';

  // Filter tabs for regular view (unless admin wants to see all)
  const displayTabs = tabs.filter((t) => t.visible || isAdmin);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      {/* Top Notification / Edit Mode Banner */}
      {isAdmin && inlineEditMode && (
        <div className="bg-indigo-600 text-white text-xs py-1.5 px-4 text-center flex items-center justify-center gap-2">
          <Edit3 className="w-3.5 h-3.5" />
          <span>Inline Edit Mode is active. Click pencil icons across pages to edit content directly.</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Portal Identity */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (isAdminView) onToggleAdminView();
                onSelectTab('home');
              }}
              className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-hidden"
            >
              <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold tracking-wider shadow-xs group-hover:bg-indigo-700 transition-colors">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="text-base font-bold text-slate-900 tracking-tight leading-tight">
                  Competition Hub
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  KPM Bandar Penawar
                </div>
              </div>
            </button>
          </div>

          {/* Desktop Navigation Links */}
          {!isAdminView && (
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
              {displayTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onSelectTab(tab.id)}
                    className={`px-3 py-2 text-sm font-medium transition-colors relative cursor-pointer ${
                      isActive
                        ? 'text-indigo-600 font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {!tab.visible && isAdmin && (
                      <span className="ml-1 text-[10px] text-amber-600 font-mono">(hidden)</span>
                    )}
                    {isActive && (
                      <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-indigo-600 rounded-full" />
                    )}
                  </button>
                );
              })}
            </nav>
          )}

          {/* Controls & Actions cluster */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isAdmin && (
              <>
                {/* Inline Edit Toggle Button */}
                <button
                  type="button"
                  onClick={onToggleInlineEdit}
                  title={inlineEditMode ? 'Exit inline editing' : 'Enable inline editing'}
                  className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    inlineEditMode
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{inlineEditMode ? 'Done Editing' : 'Edit Mode'}</span>
                </button>

                {/* Admin Dashboard / View Portal toggle */}
                <button
                  type="button"
                  onClick={onToggleAdminView}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    isAdminView
                      ? 'bg-slate-900 text-white hover:bg-slate-800'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                  }`}
                >
                  {isAdminView ? (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Portal</span>
                    </>
                  ) : (
                    <>
                      <Settings className="w-3.5 h-3.5" />
                      <span>Admin Hub</span>
                    </>
                  )}
                </button>
              </>
            )}

            {/* Session Indicator or Admin Login Button */}
            {isAdmin ? (
              <>
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-[11px] font-medium text-slate-700">
                    Administrator
                  </span>
                  <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                    {userEmail || 'khaikerr@gmail.com'}
                  </span>
                </div>

                {/* Sign Out */}
                <button
                  type="button"
                  onClick={onLogout}
                  title="Sign out from portal"
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onOpenAdminLogin}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Admin Login</span>
              </button>
            )}

            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2">
          {!isAdminView ? (
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">
                Navigation
              </div>
              {displayTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      onSelectTab(tab.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {!tab.visible && isAdmin && (
                      <span className="text-[10px] text-amber-600">(hidden)</span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-2">
              <p className="text-xs text-slate-500 mb-2">You are currently in Central Admin Hub.</p>
              <button
                type="button"
                onClick={() => {
                  onToggleAdminView();
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-medium text-center"
              >
                Return to Portal View
              </button>
            </div>
          )}

          {isAdmin && (
            <div className="pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  onToggleInlineEdit();
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${
                  inlineEditMode
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                <Edit3 className="w-4 h-4" />
                <span>{inlineEditMode ? 'Exit Inline Edit Mode' : 'Enable Inline Edit Mode'}</span>
              </button>
            </div>
          )}

          {isAdmin ? (
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 px-2">
              <span>Signed in as Administrator ({userEmail || 'khaikerr@gmail.com'})</span>
              <button
                type="button"
                onClick={onLogout}
                className="text-rose-600 font-medium hover:underline cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="pt-3 border-t border-slate-100 px-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (onOpenAdminLogin) onOpenAdminLogin();
                }}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Admin Login</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
