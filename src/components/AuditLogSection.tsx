import React, { useState, useEffect, useMemo } from 'react';
import {
  AuditLogItem,
  AuditCategory,
  AuditSeverity
} from '../types';
import { auditLogger } from '../services/auditLogger';
import {
  History,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  Trash2,
  Calendar,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  UserCheck,
  RefreshCw,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  FileText,
  Lock,
  ArrowRight,
  Database,
  Users
} from 'lucide-react';

interface AuditLogSectionProps {
  currentAdminName?: string;
}

const CATEGORY_CONFIG: Record<
  AuditCategory | 'ALL',
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; badgeBg: string }
> = {
  ALL: {
    label: 'Semua Acara',
    icon: History,
    color: 'text-slate-200',
    badgeBg: 'bg-slate-800 text-slate-200 border-slate-700'
  },
  CSV_IMPORT: {
    label: 'Import CSV',
    icon: FileSpreadsheet,
    color: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
  },
  SESSION_MGMT: {
    label: 'Sesi & Kelas',
    icon: Calendar,
    color: 'text-indigo-400',
    badgeBg: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
  },
  LECTURER_STATUS: {
    label: 'Status Pensyarah',
    icon: UserCheck,
    color: 'text-purple-400',
    badgeBg: 'bg-purple-500/10 text-purple-300 border-purple-500/30'
  },
  STUDENT_MGMT: {
    label: 'Pelajar & Rekod',
    icon: Users,
    color: 'text-blue-400',
    badgeBg: 'bg-blue-500/10 text-blue-300 border-blue-500/30'
  },
  MASTER_DATA: {
    label: 'Master Data',
    icon: Database,
    color: 'text-amber-400',
    badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30'
  },
  SECURITY_AUTH: {
    label: 'Keselamatan & Log Masuk',
    icon: Lock,
    color: 'text-rose-400',
    badgeBg: 'bg-rose-500/10 text-rose-300 border-rose-500/30'
  },
  ATTENDANCE_OVERRIDE: {
    label: 'Pindaan Kehadiran',
    icon: AlertTriangle,
    color: 'text-orange-400',
    badgeBg: 'bg-orange-500/10 text-orange-300 border-orange-500/30'
  }
};

const SEVERITY_CONFIG: Record<
  AuditSeverity,
  { label: string; icon: React.ComponentType<{ className?: string }>; badgeBg: string; textClass: string }
> = {
  INFO: {
    label: 'Info',
    icon: Info,
    badgeBg: 'bg-slate-800/80 text-slate-300 border-slate-700/60',
    textClass: 'text-slate-300'
  },
  SUCCESS: {
    label: 'Berjaya',
    icon: CheckCircle2,
    badgeBg: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30',
    textClass: 'text-emerald-400'
  },
  WARNING: {
    label: 'Amaran',
    icon: AlertTriangle,
    badgeBg: 'bg-amber-950/60 text-amber-300 border-amber-500/30',
    textClass: 'text-amber-400'
  },
  CRITICAL: {
    label: 'Kritikal',
    icon: AlertCircle,
    badgeBg: 'bg-rose-950/60 text-rose-300 border-rose-500/30',
    textClass: 'text-rose-400'
  }
};

export const AuditLogSection: React.FC<AuditLogSectionProps> = ({
  currentAdminName = 'Master Admin'
}) => {
  const [logs, setLogs] = useState<AuditLogItem[]>(() => auditLogger.getLogs());
  const [selectedCategory, setSelectedCategory] = useState<AuditCategory | 'ALL'>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<AuditSeverity | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Subscribe to real-time changes
  useEffect(() => {
    const unsubscribe = auditLogger.subscribe(() => {
      setLogs(auditLogger.getLogs());
    });

    const handleCustomEvent = () => {
      setLogs(auditLogger.getLogs());
    };

    window.addEventListener('classattend_audit_log_changed', handleCustomEvent);

    return () => {
      unsubscribe();
      window.removeEventListener('classattend_audit_log_changed', handleCustomEvent);
    };
  }, []);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    return logs.filter((log) => {
      // 1. Category filter
      if (selectedCategory !== 'ALL' && log.category !== selectedCategory) {
        return false;
      }

      // 2. Severity filter
      if (selectedSeverity !== 'ALL' && log.severity !== selectedSeverity) {
        return false;
      }

      // 3. Date range filter
      if (dateFilter !== 'ALL') {
        const logTime = new Date(log.timestamp).getTime();
        const diff = now - logTime;
        if (dateFilter === 'TODAY' && diff > oneDay) return false;
        if (dateFilter === 'WEEK' && diff > 7 * oneDay) return false;
        if (dateFilter === 'MONTH' && diff > 30 * oneDay) return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesAction = log.action.toLowerCase().includes(q);
        const matchesDetails = log.details.toLowerCase().includes(q);
        const matchesActor = log.performedBy.toLowerCase().includes(q);
        const matchesTarget = (log.target || '').toLowerCase().includes(q);
        const matchesId = log.id.toLowerCase().includes(q);
        const matchesCat = (CATEGORY_CONFIG[log.category]?.label || '').toLowerCase().includes(q);

        if (!matchesAction && !matchesDetails && !matchesActor && !matchesTarget && !matchesId && !matchesCat) {
          return false;
        }
      }

      return true;
    });
  }, [logs, selectedCategory, selectedSeverity, dateFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = logs.length;
    const csvImports = logs.filter((l) => l.category === 'CSV_IMPORT').length;
    const sessionChanges = logs.filter((l) => l.category === 'SESSION_MGMT').length;
    const lecturerChanges = logs.filter((l) => l.category === 'LECTURER_STATUS').length;
    const criticalEvents = logs.filter((l) => l.severity === 'CRITICAL' || l.severity === 'WARNING').length;

    return { total, csvImports, sessionChanges, lecturerChanges, criticalEvents };
  }, [logs]);

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportCSV = () => {
    auditLogger.exportToCSV();
  };

  const handleClearLogs = () => {
    if (
      window.confirm(
        'AMARAN: Adakah anda pasti untuk mengosongkan semua rekod Audit Log? Tindakan ini akan direkodkan sebagai log baharu bagi tujuan integriti sistem.'
      )
    ) {
      auditLogger.clearLogs(currentAdminName);
    }
  };

  return (
    <div id="admin-audit-log-section" className="space-y-5 animate-fadeIn">
      {/* 1. Header & Summary Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Integriti & Akauntabiliti Sistem</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <History className="w-6 h-6 text-indigo-400" />
              <span>Audit Log Pentadbir (System Audit Trail)</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Jejak masa nyata semua tindakan kritikal seperti import CSV, pemadaman sesi, kelulusan pensyarah, dan pengubahsuaian Master Data kolej.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Muat Turun CSV</span>
            </button>
            <button
              type="button"
              onClick={handleClearLogs}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Kosongkan Audit Log (Akaun Pentadbir Sahaja)"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Kosongkan</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-800/80">
          <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl">
            <div className="text-[11px] font-semibold text-slate-400 uppercase">Jumlah Rekod Log</div>
            <div className="text-2xl font-black text-white font-mono">{stats.total}</div>
            <div className="text-[10px] text-slate-500">Akauntabiliti penuh</div>
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl">
            <div className="text-[11px] font-semibold text-slate-400 uppercase">Import Data (CSV)</div>
            <div className="text-2xl font-black text-emerald-400 font-mono">{stats.csvImports}</div>
            <div className="text-[10px] text-emerald-500/80">Pelajar & Pensyarah</div>
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl">
            <div className="text-[11px] font-semibold text-slate-400 uppercase">Perubahan Sesi</div>
            <div className="text-2xl font-black text-indigo-400 font-mono">{stats.sessionChanges}</div>
            <div className="text-[10px] text-slate-500">Buka / Tutup / Padam</div>
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl">
            <div className="text-[11px] font-semibold text-slate-400 uppercase">Status Pensyarah</div>
            <div className="text-2xl font-black text-purple-400 font-mono">{stats.lecturerChanges}</div>
            <div className="text-[10px] text-slate-500">Kelulusan & Pendaftaran</div>
          </div>
        </div>
      </div>

      {/* 2. Filters & Search Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-md">
        {/* Search Bar & Date Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari tindakan, sasaran subjek/pelajar, nama pentadbir, atau Log ID..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center bg-slate-950 border border-slate-700/80 rounded-xl p-1 text-xs">
              {(['ALL', 'TODAY', 'WEEK', 'MONTH'] as const).map((range) => {
                const labels: Record<typeof range, string> = {
                  ALL: 'Semua',
                  TODAY: 'Hari Ini',
                  WEEK: '7 Hari',
                  MONTH: '30 Hari'
                };
                const isActive = dateFilter === range;
                return (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setDateFilter(range)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white font-bold shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {labels[range]}
                  </button>
                );
              })}
            </div>

            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value as any)}
              className="bg-slate-950 border border-slate-700/80 text-slate-300 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">Semua Keterukan</option>
              <option value="INFO">Info</option>
              <option value="SUCCESS">Berjaya</option>
              <option value="WARNING">Amaran</option>
              <option value="CRITICAL">Kritikal</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs pt-1 border-t border-slate-800">
          {(
            [
              'ALL',
              'CSV_IMPORT',
              'SESSION_MGMT',
              'LECTURER_STATUS',
              'STUDENT_MGMT',
              'MASTER_DATA',
              'SECURITY_AUTH'
            ] as const
          ).map((cat) => {
            const cfg = CATEGORY_CONFIG[cat];
            const Icon = cfg.icon;
            const isSelected = selectedCategory === cat;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 shrink-0 transition-all border cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cfg.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Audit Log Timeline / Stream List */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Rekod Jejak Masa Terkini ({filteredLogs.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">Susunan kronologi terkini di atas</span>
        </div>

        {filteredLogs.length > 0 ? (
          <div className="divide-y divide-slate-800/70">
            {filteredLogs.map((log) => {
              const catCfg = CATEGORY_CONFIG[log.category] || CATEGORY_CONFIG.ALL;
              const sevCfg = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.INFO;
              const CatIcon = catCfg.icon;
              const SevIcon = sevCfg.icon;
              const isExpanded = expandedLogId === log.id;

              const formattedDate = new Date(log.timestamp).toLocaleDateString('ms-MY', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              });
              const formattedTime = new Date(log.timestamp).toLocaleTimeString('ms-MY', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });

              return (
                <div
                  key={log.id}
                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                  className={`p-4 sm:p-5 hover:bg-slate-800/40 transition-colors cursor-pointer ${
                    isExpanded ? 'bg-slate-800/25' : ''
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Left: Icon & Main Info */}
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border mt-0.5 ${catCfg.badgeBg}`}
                      >
                        <CatIcon className="w-5 h-5" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${catCfg.badgeBg}`}>
                            {catCfg.label}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${sevCfg.badgeBg}`}
                          >
                            <SevIcon className="w-3 h-3" />
                            <span>{sevCfg.label}</span>
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {formattedDate} • {formattedTime}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-white tracking-tight">
                          {log.action}
                        </h4>

                        <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                          {log.details}
                        </p>
                      </div>
                    </div>

                    {/* Right: Actor & Target Badges */}
                    <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-1.5 shrink-0 pl-13 md:pl-0">
                      <div className="text-right">
                        <div className="text-[11px] text-slate-400">
                          Oleh: <strong className="text-slate-200">{log.performedBy}</strong>
                        </div>
                        {log.target && (
                          <div className="text-[11px] text-indigo-300 font-mono mt-0.5">
                            Sasaran: <strong className="text-indigo-200">{log.target}</strong>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleCopyId(log.id, e)}
                          className="px-2 py-1 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 rounded-lg text-[10px] font-mono flex items-center gap-1 transition"
                          title="Salin Log ID"
                        >
                          {copiedId === log.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Disalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>{log.id.split('-').slice(-2).join('-')}</span>
                            </>
                          )}
                        </button>

                        <span className="text-slate-500">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="mt-4 pt-3.5 border-t border-slate-800/80 bg-slate-950/80 p-4 rounded-2xl space-y-2 text-xs text-slate-300 font-mono animate-fadeIn">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-500 block">ID Log Penuh:</span>
                          <span className="text-indigo-300 font-bold">{log.id}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Cap Masa ISO (UTC):</span>
                          <span className="text-slate-300">{log.timestamp}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Pengguna / Pentadbir:</span>
                          <span className="text-slate-200">{log.performedBy}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Kategori Acara:</span>
                          <span className="text-slate-200">{log.category}</span>
                        </div>
                      </div>

                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="pt-2 border-t border-slate-800 text-[11px]">
                          <span className="text-slate-500 block mb-1">Metadata Tambahan:</span>
                          <pre className="p-2 bg-slate-900 rounded-lg text-slate-300 overflow-x-auto text-[10px]">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">Tiada Rekod Audit Ditemui</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Tiada aktiviti yang sepadan dengan penapis carian yang dipilih. Cuba tukar kata kunci atau pilih &quot;Semua Acara&quot;.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
