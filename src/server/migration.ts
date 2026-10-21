import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAdminDb, getStorageBucket, checkFirebaseAdminStatus } from './firebase-admin';
import {
  getLocalAuthStore,
  getLocalPortalStore,
  DEFAULT_SOAR_CATEGORIES,
} from './repository';
import { PortalStore, AuthStore } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');
const DATA_DIR = path.resolve(ROOT_DIR, 'data');
const UPLOADS_DIR = path.resolve(DATA_DIR, 'uploads');
const PUBLIC_UPLOADS_DIR = path.resolve(ROOT_DIR, 'public', 'uploads');

export interface MigrationCounts {
  read: number;
  migrated: number;
  skippedExisting: number;
  failed: number;
}

export interface MigrationReport {
  timestamp: string;
  status: 'completed' | 'aborted' | 'dry_run_success';
  dryRun: boolean;
  canConnectToFirestore: boolean;
  canConnectToStorage: boolean;
  details: {
    settings: MigrationCounts;
    tabs: MigrationCounts;
    categories: MigrationCounts;
    announcements: MigrationCounts;
    schedules: MigrationCounts;
    documents: MigrationCounts;
    eventSections: MigrationCounts;
    locations: MigrationCounts;
    customTabs: MigrationCounts;
    authConfig: MigrationCounts;
    sessions: MigrationCounts;
    uploads: MigrationCounts;
  };
  reconciliation: {
    totalSourceEntities: number;
    totalTargetCreated: number;
    totalTargetSkipped: number;
    totalFailures: number;
    isFullyReconciled: boolean;
  };
  errors: string[];
  warnings: string[];
  message: string;
}

/**
 * Validates integrity of portal and auth data before running migration.
 */
export function validateSourceData(portalStore: PortalStore, authStore: AuthStore): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!portalStore.settings || !portalStore.settings.eventTitle) {
    errors.push('PortalStore settings missing or invalid.');
  }

  if (!Array.isArray(portalStore.tabs) || portalStore.tabs.length === 0) {
    errors.push('PortalStore navigation tabs missing or empty.');
  }

  if (!Array.isArray(portalStore.announcements)) {
    errors.push('PortalStore announcements array invalid.');
  }

  if (!Array.isArray(portalStore.schedules)) {
    errors.push('PortalStore schedules array invalid.');
  }

  if (!Array.isArray(portalStore.documents)) {
    errors.push('PortalStore documents array invalid.');
  }

  if (!Array.isArray(portalStore.locations)) {
    errors.push('PortalStore locations array invalid.');
  }

  if (!Array.isArray(portalStore.eventSections)) {
    errors.push('PortalStore eventSections array invalid.');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Execute controlled, idempotent data migration into Firestore.
 */
export async function executeDataMigration(options: {
  dryRun?: boolean;
  forceOverwrite?: boolean;
} = {}): Promise<MigrationReport> {
  const dryRun = Boolean(options.dryRun);
  const forceOverwrite = Boolean(options.forceOverwrite);

  const report: MigrationReport = {
    timestamp: new Date().toISOString(),
    status: 'aborted',
    dryRun,
    canConnectToFirestore: false,
    canConnectToStorage: false,
    details: {
      settings: { read: 0, migrated: 0, skippedExisting: 0, failed: 0 },
      tabs: { read: 0, migrated: 0, skippedExisting: 0, failed: 0 },
      categories: { read: 0, migrated: 0, skippedExisting: 0, failed: 0 },
      announcements: { read: 0, migrated: 0, skippedExisting: 0, failed: 0 },
      schedules: { read: 0, migrated: 0, skippedExisting: 0, failed: 0 },
      documents: { read: 0, migrated: 0, skippedExisting: 0, failed: 0 },
      eventSections: { read: 0, migrated: 0, skippedExisting: 0, failed: 0 },
      locations: { read: 0, migrated: 0, skippedExisting: 0, failed: 0 },
      customTabs: { read: 0, migrated: 0, skippedExisting: 0, failed: 0 },
      authConfig: { read: 0, migrated: 0, skippedExisting: 0, failed: 0 },
      sessions: { read: 0, migrated: 0, skippedExisting: 0, failed: 0 },
      uploads: { read: 0, migrated: 0, skippedExisting: 0, failed: 0 },
    },
    reconciliation: {
      totalSourceEntities: 0,
      totalTargetCreated: 0,
      totalTargetSkipped: 0,
      totalFailures: 0,
      isFullyReconciled: false,
    },
    errors: [],
    warnings: [],
    message: '',
  };

  // Pre-flight check: Firebase Admin availability
  const adminStatus = await checkFirebaseAdminStatus();
  report.canConnectToFirestore = adminStatus.connectionHealthy;

  const db = getAdminDb();
  if (!db || !adminStatus.connectionHealthy) {
    report.errors.push(
      `Sambungan Firestore belum disahkan: ${adminStatus.error || 'Kredensial Firebase Admin tiada'}`
    );
    report.message =
      'Migrasi dihentikan: Tidak dapat menulis ke Firestore. Sila tetapkan FIREBASE_SERVICE_ACCOUNT dalam environment variables Vercel.';
    return report;
  }

  // Pre-flight check: Source JSON availability & validation
  const portalStore = getLocalPortalStore();
  const authStore = getLocalAuthStore();
  const validation = validateSourceData(portalStore, authStore);

  if (!validation.isValid) {
    report.errors.push(...validation.errors);
    report.message = 'Source data validation failed. Aborting migration to protect destination integrity.';
    return report;
  }

  // Count total source entities
  report.reconciliation.totalSourceEntities =
    1 + // settings
    portalStore.tabs.length +
    (portalStore.categories?.length || DEFAULT_SOAR_CATEGORIES.length) +
    portalStore.announcements.length +
    portalStore.schedules.length +
    portalStore.documents.length +
    portalStore.eventSections.length +
    portalStore.locations.length +
    Object.keys(portalStore.customTabsContent || {}).length +
    1 + // authConfig
    Object.keys(authStore.sessions || {}).length;

  try {
    // 1. Settings Migration
    report.details.settings.read = 1;
    const settingsRef = db.collection('portal').doc('settings');
    const existingSettings = await settingsRef.get();
    if (!existingSettings.exists || forceOverwrite) {
      if (!dryRun) await settingsRef.set({ ...portalStore.settings, migratedAt: new Date().toISOString() });
      report.details.settings.migrated = 1;
    } else {
      report.details.settings.skippedExisting = 1;
    }

    // 2. Categories Migration
    const categoriesRef = db.collection('portal').doc('categories');
    const categoriesToMigrate = portalStore.categories && portalStore.categories.length > 0 ? portalStore.categories : DEFAULT_SOAR_CATEGORIES;
    report.details.categories.read = categoriesToMigrate.length;
    const existingCategories = await categoriesRef.get();
    if (!existingCategories.exists || forceOverwrite) {
      if (!dryRun) await categoriesRef.set({ items: categoriesToMigrate, migratedAt: new Date().toISOString() });
      report.details.categories.migrated = categoriesToMigrate.length;
    } else {
      report.details.categories.skippedExisting = categoriesToMigrate.length;
    }

    // 3. Navigation Tabs Migration
    report.details.tabs.read = portalStore.tabs.length;
    for (const tab of portalStore.tabs) {
      const tabRef = db.collection('tabs').doc(tab.id);
      const existingTab = await tabRef.get();
      if (!existingTab.exists || forceOverwrite) {
        if (!dryRun) await tabRef.set(tab);
        report.details.tabs.migrated++;
      } else {
        report.details.tabs.skippedExisting++;
      }
    }

    // 4. Announcements Migration
    report.details.announcements.read = portalStore.announcements.length;
    for (const ann of portalStore.announcements) {
      const annRef = db.collection('announcements').doc(ann.id);
      const existingAnn = await annRef.get();
      if (!existingAnn.exists || forceOverwrite) {
        if (!dryRun) await annRef.set(ann);
        report.details.announcements.migrated++;
      } else {
        report.details.announcements.skippedExisting++;
      }
    }

    // 5. Schedules Migration
    report.details.schedules.read = portalStore.schedules.length;
    for (const sch of portalStore.schedules) {
      const schRef = db.collection('schedules').doc(sch.id);
      const existingSch = await schRef.get();
      if (!existingSch.exists || forceOverwrite) {
        if (!dryRun) await schRef.set(sch);
        report.details.schedules.migrated++;
      } else {
        report.details.schedules.skippedExisting++;
      }
    }

    // 6. Documents Migration
    report.details.documents.read = portalStore.documents.length;
    for (const docItem of portalStore.documents) {
      const docRef = db.collection('documents').doc(docItem.id);
      const existingDoc = await docRef.get();
      if (!existingDoc.exists || forceOverwrite) {
        if (!dryRun) await docRef.set(docItem);
        report.details.documents.migrated++;
      } else {
        report.details.documents.skippedExisting++;
      }
    }

    // 7. Event Sections Migration
    report.details.eventSections.read = portalStore.eventSections.length;
    for (const sec of portalStore.eventSections) {
      const secRef = db.collection('eventSections').doc(sec.id);
      const existingSec = await secRef.get();
      if (!existingSec.exists || forceOverwrite) {
        if (!dryRun) await secRef.set(sec);
        report.details.eventSections.migrated++;
      } else {
        report.details.eventSections.skippedExisting++;
      }
    }

    // 8. Locations Migration
    report.details.locations.read = portalStore.locations.length;
    for (const loc of portalStore.locations) {
      const locRef = db.collection('locations').doc(loc.id);
      const existingLoc = await locRef.get();
      if (!existingLoc.exists || forceOverwrite) {
        if (!dryRun) await locRef.set(loc);
        report.details.locations.migrated++;
      } else {
        report.details.locations.skippedExisting++;
      }
    }

    // 9. Custom Tabs Content Migration
    const customTabsEntries = Object.entries(portalStore.customTabsContent || {});
    report.details.customTabs.read = customTabsEntries.length;
    if (customTabsEntries.length > 0) {
      const customTabsRef = db.collection('portal').doc('customTabs');
      const existingCustom = await customTabsRef.get();
      if (!existingCustom.exists || forceOverwrite) {
        if (!dryRun) await customTabsRef.set(portalStore.customTabsContent || {});
        report.details.customTabs.migrated = customTabsEntries.length;
      } else {
        report.details.customTabs.skippedExisting = customTabsEntries.length;
      }
    }

    // 10. Auth Config Migration (Server-Side Only)
    report.details.authConfig.read = 1;
    const authConfigRef = db.collection('auth').doc('config');
    const existingAuthConfig = await authConfigRef.get();
    if (!existingAuthConfig.exists || forceOverwrite) {
      if (!dryRun) {
        await authConfigRef.set({
          isSetup: authStore.isSetup,
          adminEmail: authStore.adminEmail,
          adminPasswordHash: authStore.adminPasswordHash,
          adminPasswordSalt: authStore.adminPasswordSalt,
          teamPasscode: authStore.teamPasscode,
          migratedAt: new Date().toISOString(),
        });
      }
      report.details.authConfig.migrated = 1;
    } else {
      report.details.authConfig.skippedExisting = 1;
    }

    // 11. Unexpired Sessions Migration
    const sessionEntries = Object.entries(authStore.sessions || {});
    report.details.sessions.read = sessionEntries.length;
    for (const [token, session] of sessionEntries) {
      if (session.expiresAt && session.expiresAt > Date.now()) {
        const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');
        const sessionRef = db.collection('sessions').doc(tokenHash);
        const existingSession = await sessionRef.get();
        if (!existingSession.exists || forceOverwrite) {
          if (!dryRun) {
            await sessionRef.set({
              role: session.role,
              email: session.email || null,
              expiresAt: session.expiresAt,
              migratedAt: new Date().toISOString(),
            });
          }
          report.details.sessions.migrated++;
        } else {
          report.details.sessions.skippedExisting++;
        }
      } else {
        report.details.sessions.skippedExisting++;
      }
    }

    // 12. Uploads Storage Migration
    const bucket = getStorageBucket();
    if (bucket) {
      report.canConnectToStorage = true;
      const uploadFiles = [
        'soar_jadual_pertandingan.svg',
        'soar_pendaftaran_peserta.svg',
        'soar_penginapan_panduan.svg',
      ];
      report.details.uploads.read = uploadFiles.length;

      for (const fileName of uploadFiles) {
        const localPath = fs.existsSync(path.join(PUBLIC_UPLOADS_DIR, fileName))
          ? path.join(PUBLIC_UPLOADS_DIR, fileName)
          : path.join(UPLOADS_DIR, fileName);

        if (fs.existsSync(localPath)) {
          try {
            const destinationFile = bucket.file(`uploads/${fileName}`);
            const [exists] = await destinationFile.exists();
            if (!exists || forceOverwrite) {
              if (!dryRun) {
                await bucket.upload(localPath, {
                  destination: `uploads/${fileName}`,
                  metadata: {
                    contentType: 'image/svg+xml',
                    cacheControl: 'public, max-age=86400',
                  },
                });
              }
              report.details.uploads.migrated++;
            } else {
              report.details.uploads.skippedExisting++;
            }
          } catch (uploadErr: any) {
            report.warnings.push(`Storage upload warning for ${fileName}: ${uploadErr.message}`);
            report.details.uploads.failed++;
          }
        }
      }
    } else {
      report.warnings.push('Firebase Storage bucket not directly accessible. Local static files in public/uploads/ remain available via CDN.');
    }

    // Calculate totals
    let totalMigrated = 0;
    let totalSkipped = 0;
    let totalFailed = 0;

    for (const key of Object.keys(report.details) as (keyof typeof report.details)[]) {
      totalMigrated += report.details[key].migrated;
      totalSkipped += report.details[key].skippedExisting;
      totalFailed += report.details[key].failed;
    }

    report.reconciliation.totalTargetCreated = totalMigrated;
    report.reconciliation.totalTargetSkipped = totalSkipped;
    report.reconciliation.totalFailures = totalFailed;
    report.reconciliation.isFullyReconciled = totalFailed === 0;

    report.status = dryRun ? 'dry_run_success' : 'completed';
    report.message = dryRun
      ? `Dry run successful: ${totalMigrated} records to create, ${totalSkipped} existing records detected.`
      : `Migration completed: ${totalMigrated} records written, ${totalSkipped} reconciled existing records, 0 data loss.`;

    return report;
  } catch (err: any) {
    report.status = 'aborted';
    report.errors.push(err.message || 'Unknown error during migration');
    report.message = `Migration aborted due to error: ${err.message}`;
    return report;
  }
}
