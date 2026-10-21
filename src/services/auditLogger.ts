import { AuditLogItem, AuditCategory, AuditSeverity } from '../types';
import { db, sanitizeForFirestore } from './firebase';
import { collection, doc, setDoc } from 'firebase/firestore';

const STORAGE_KEY_AUDIT_LOGS = 'classattend_audit_logs_v1';
const MAX_LOGS = 500;

const DEFAULT_SEEDED_LOGS: AuditLogItem[] = [
  {
    id: 'LOG-INIT-001',
    timestamp: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    category: 'MASTER_DATA',
    action: 'Inisialisasi Sistem & Master Data',
    details: 'Penetapan kurikulum asas DIA, kod program BKP/BPP/BKS/BMT/BHM, serta senarai jabatan rasmi KPM Bandar Penawar.',
    performedBy: 'Sistem KPM (Root)',
    target: 'Kolej Profesional MARA Bandar Penawar',
    severity: 'INFO'
  },
  {
    id: 'LOG-INIT-002',
    timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
    category: 'CSV_IMPORT',
    action: 'Import Pelajar Master (CSV)',
    details: 'Berjaya memuat naik 95 rekod pelajar merangkumi seksyen DIA_4A, DIA_4B, DIA_4C, dan DIA_4D.',
    performedBy: 'Pentadbir Sistem',
    target: '95 Rekod Pelajar',
    severity: 'SUCCESS'
  },
  {
    id: 'LOG-INIT-003',
    timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
    category: 'LECTURER_STATUS',
    action: 'Pengesahan Pendaftaran Pensyarah',
    details: 'Akaun pensyarah khairi.mohd@mara.gov.my telah disahkan dan diaktifkan dengan peranan ADMIN.',
    performedBy: 'Master Admin',
    target: 'khairi.mohd@mara.gov.my',
    severity: 'SUCCESS'
  },
  {
    id: 'LOG-INIT-004',
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    category: 'SESSION_MGMT',
    action: 'Pembukaan Sesi Kuliah',
    details: 'Sesi kuliah baharu dibuka bagi subjek MPU 2163 (Pengajian Malaysia 2) untuk kelas DIA_4A.',
    performedBy: 'Khairi bin Abdul Rahman',
    target: 'MPU 2163 (DIA_4A)',
    severity: 'INFO'
  }
];

class AuditLoggerService {
  private logs: AuditLogItem[] = [];
  private listeners: Array<() => void> = [];

  constructor() {
    this.loadLogs();
  }

  private loadLogs() {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY_AUDIT_LOGS);
        if (stored) {
          this.logs = JSON.parse(stored);
          return;
        }
      }
      this.logs = [...DEFAULT_SEEDED_LOGS];
      this.saveLogs();
    } catch (e) {
      this.logs = [...DEFAULT_SEEDED_LOGS];
    }
  }

  private saveLogs() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_AUDIT_LOGS, JSON.stringify(this.logs.slice(0, MAX_LOGS)));
      }
      this.notifyListeners();
      // Dispatch browser custom event for reactive across tabs/windows
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('classattend_audit_log_changed'));
      }
    } catch (e) {
      console.error('Failed to save audit logs', e);
    }
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('Error in audit log subscriber', err);
      }
    });
  }

  public getLogs(): AuditLogItem[] {
    return [...this.logs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  public log(params: {
    category: AuditCategory;
    action: string;
    details: string;
    performedBy?: string;
    target?: string;
    metadata?: Record<string, any>;
    severity?: AuditSeverity;
  }): AuditLogItem {
    const newLog: AuditLogItem = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      category: params.category,
      action: params.action,
      details: params.details,
      performedBy: params.performedBy || 'Pentadbir Sistem',
      target: params.target,
      metadata: params.metadata,
      severity: params.severity || 'INFO'
    };

    // Prepend to list
    this.logs = [newLog, ...this.logs].slice(0, MAX_LOGS);
    this.saveLogs();

    // Async sync to Firestore if database is available
    if (db) {
      try {
        const docRef = doc(collection(db, 'audit_logs'), newLog.id);
        setDoc(docRef, sanitizeForFirestore(newLog)).catch(() => {});
      } catch (err) {
        // Silently continue
      }
    }

    return newLog;
  }

  public clearLogs(performedBy: string = 'Master Admin') {
    const clearingLog: AuditLogItem = {
      id: `LOG-${Date.now()}-CLR`,
      timestamp: new Date().toISOString(),
      category: 'SECURITY_AUTH',
      action: 'Pengosongan Rekod Audit Log',
      details: `Semua rekod audit terdahulu telah dipadamkan oleh ${performedBy}.`,
      performedBy: performedBy,
      severity: 'WARNING'
    };

    this.logs = [clearingLog];
    this.saveLogs();
  }

  public exportToCSV(): void {
    const logs = this.getLogs();
    if (logs.length === 0) {
      alert('Tiada rekod audit log untuk dimuat turun.');
      return;
    }

    const headers = [
      'Log ID',
      'Tarikh & Masa (ISO)',
      'Tarikh & Masa (MY)',
      'Kategori',
      'Tindakan',
      'Keterukan (Severity)',
      'Dilakukan Oleh (Actor)',
      'Sasaran (Target)',
      'Butiran Penuh'
    ];

    const rows = logs.map((log) => {
      const localTime = new Date(log.timestamp).toLocaleString('ms-MY', {
        dateStyle: 'medium',
        timeStyle: 'medium'
      });

      return [
        `"${log.id}"`,
        `"${log.timestamp}"`,
        `"${localTime}"`,
        `"${log.category}"`,
        `"${log.action.replace(/"/g, '""')}"`,
        `"${log.severity}"`,
        `"${log.performedBy.replace(/"/g, '""')}"`,
        `"${(log.target || '').replace(/"/g, '""')}"`,
        `"${log.details.replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `AUDIT_LOG_KPM_PENWAR_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  public migrateLecturerEmails(emailMap: Map<string, string>): number {
    let updatedCount = 0;
    this.logs = this.logs.map((log) => {
      let modified = false;
      let newTarget = log.target;
      let newDetails = log.details;
      let newPerformedBy = log.performedBy;

      emailMap.forEach((newEmail, oldEmail) => {
        const oldRegex = new RegExp(oldEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        if (newTarget && oldRegex.test(newTarget)) {
          newTarget = newTarget.replace(oldRegex, newEmail);
          modified = true;
        }
        if (newDetails && oldRegex.test(newDetails)) {
          newDetails = newDetails.replace(oldRegex, newEmail);
          modified = true;
        }
        if (newPerformedBy && oldRegex.test(newPerformedBy)) {
          newPerformedBy = newPerformedBy.replace(oldRegex, newEmail);
          modified = true;
        }
      });

      if (modified) {
        updatedCount++;
        return {
          ...log,
          target: newTarget,
          details: newDetails,
          performedBy: newPerformedBy
        };
      }
      return log;
    });

    if (updatedCount > 0) {
      this.saveLogs();
    }
    return updatedCount;
  }
}

export const auditLogger = new AuditLoggerService();
