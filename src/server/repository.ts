import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { getAdminDb, checkFirebaseAdminStatus } from './firebase-admin';
import {
  PortalStore,
  AuthStore,
  PortalSettings,
  NavigationTab,
  EventCategory,
  Announcement,
  ScheduleItem,
  DocumentItem,
  EventSection,
  LocationItem,
} from './types';

import defaultAuthData from '../../data/auth_data.json';
import defaultPortalData from '../../data/portal_data.json';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = process.cwd();
const DATA_DIR = path.resolve(ROOT_DIR, 'data');
const AUTH_FILE = path.join(DATA_DIR, 'auth_data.json');
const PORTAL_FILE = path.join(DATA_DIR, 'portal_data.json');

// Ensure local directory exists for fallback
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch {
    // Ignore in read-only environments
  }
}

// In-memory cache for fast session verification across serverless invocations
const sessionMemoryCache = new Map<string, { role: 'admin' | 'team'; email?: string; expiresAt: number }>();

export const DEFAULT_SOAR_CATEGORIES: EventCategory[] = [
  { id: 'symphonic-duo', name: 'Symphonic Duo', shortCode: 'SD', description: 'Kategori Muzik & Vokal Dua Alat', order: 1, visible: true },
  { id: 'islamic-theatre', name: 'Islamic Theatre', shortCode: 'IT', description: 'Teater & Lakonan Islamik Tematik', order: 2, visible: true },
  { id: 'battle-of-the-bands', name: 'Battle of the Bands', shortCode: 'BOB', description: 'Pertandingan Kugiran & Muzik Kombo', order: 3, visible: true },
  { id: 'tarian-zapin', name: 'Tarian Zapin', shortCode: 'TZ', description: 'Tarian Tradisional Melayu Zapin', order: 4, visible: true },
  { id: 'street-dakwah', name: 'Street Dakwah', shortCode: 'SDW', description: 'Pidato & Pengucapan Awam Dakwah Terbuka', order: 5, visible: true },
  { id: 'majlis-penutupan', name: 'Majlis Penutupan SOAR', shortCode: 'MPS', description: 'Raptai, Perarakan & Majlis Penutup Rasmi', order: 6, visible: true },
  { id: 'penginapan', name: 'Penginapan Kontinjen', shortCode: 'LOG', description: 'Kolej Kediaman, Bilik & Kebajikan Kontinjen', order: 7, visible: true },
  { id: 'pengangkutan', name: 'Pengangkutan & Bas', shortCode: 'TRN', description: 'Jadual Pergerakan Bas & Perjalanan', order: 8, visible: true },
  { id: 'general', name: 'Urus Setia / Hebahan Am', shortCode: 'GEN', description: 'Makluman Rasmi Urus Setia Kontinjen KPMBP', order: 9, visible: true },
];

export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

// ======================== LOCAL FILE HELPERS (FALLBACK) ========================

export function getLocalAuthStore(): AuthStore {
  if (fs.existsSync(AUTH_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    } catch {
      // corrupt file fallback
    }
  }

  // Use bundled default auth data (guaranteed available across all serverless runtimes)
  const fallback = JSON.parse(JSON.stringify(defaultAuthData)) as AuthStore;
  try {
    fs.writeFileSync(AUTH_FILE, JSON.stringify(fallback, null, 2), 'utf-8');
  } catch {}
  return fallback;
}

export function saveLocalAuthStore(store: AuthStore): void {
  try {
    fs.writeFileSync(AUTH_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err: any) {
    console.warn('[Repository] Could not write local auth file (expected in serverless):', err.message);
  }
}

export function getLocalPortalStore(): PortalStore {
  if (fs.existsSync(PORTAL_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(PORTAL_FILE, 'utf-8'));
      if (parsed && Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
        if (!parsed.categories || parsed.categories.length === 0) {
          parsed.categories = DEFAULT_SOAR_CATEGORIES;
        }
        if (!parsed.settings?.activePhase) {
          parsed.settings = parsed.settings || {};
          parsed.settings.activePhase = 'pre-final';
        }
        return parsed;
      }
    } catch {
      // Corrupt file fallback
    }
  }

  // Use bundled default portal data (guaranteed available across all serverless runtimes)
  const fallback = JSON.parse(JSON.stringify(defaultPortalData)) as PortalStore;
  try {
    fs.writeFileSync(PORTAL_FILE, JSON.stringify(fallback, null, 2), 'utf-8');
  } catch {}
  return fallback;
}

export function saveLocalPortalStore(store: PortalStore): void {
  try {
    fs.writeFileSync(PORTAL_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err: any) {
    console.warn('[Repository] Could not write local portal file (expected in serverless):', err.message);
  }
}

// ======================== FIRESTORE & REPOSITORY LAYER ========================

class PortalRepository {
  private async isFirestoreAvailable(): Promise<boolean> {
    try {
      const status = await checkFirebaseAdminStatus();
      return Boolean(status.connectionHealthy);
    } catch {
      return false;
    }
  }

  // ---------------- AUTH STORE & SESSIONS ----------------

  async getAuthStore(): Promise<AuthStore> {
    try {
      const db = getAdminDb();
      if (db && (await this.isFirestoreAvailable())) {
        try {
          const configDoc = await db.collection('auth').doc('config').get();
          if (configDoc.exists) {
            const data = configDoc.data() as any;
            return {
              isSetup: Boolean(data.isSetup),
              adminEmail: data.adminEmail || 'khaikerr@gmail.com',
              adminPasswordHash: data.adminPasswordHash || '',
              adminPasswordSalt: data.adminPasswordSalt || '',
              teamPasscode: data.teamPasscode || 'KPMBP2026',
              sessions: {},
            };
          }
        } catch (err: any) {
          console.warn('[Repository] Firestore getAuthStore failed, falling back to local file:', err.message);
        }
      }
    } catch (err: any) {
      console.warn('[Repository] Firestore check failed in getAuthStore:', err.message);
    }
    return getLocalAuthStore();
  }

  async saveAuthConfig(config: Partial<AuthStore>): Promise<void> {
    const db = getAdminDb();
    if (db && (await this.isFirestoreAvailable())) {
      try {
        await db.collection('auth').doc('config').set({
          isSetup: config.isSetup,
          adminEmail: config.adminEmail,
          adminPasswordHash: config.adminPasswordHash,
          adminPasswordSalt: config.adminPasswordSalt,
          teamPasscode: config.teamPasscode,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        return;
      } catch (err: any) {
        console.warn('[Repository] Firestore saveAuthConfig failed, falling back:', err.message);
      }
    }

    // Local fallback
    const local = getLocalAuthStore();
    const updated: AuthStore = { ...local, ...config, sessions: local.sessions };
    saveLocalAuthStore(updated);
  }

  async getSession(token: string): Promise<{ role: 'admin' | 'team'; email?: string; expiresAt: number } | null> {
    if (!token) return null;

    // Check in-memory cache first
    const cached = sessionMemoryCache.get(token);
    if (cached) {
      if (Date.now() > cached.expiresAt) {
        sessionMemoryCache.delete(token);
        return null;
      }
      return cached;
    }

    const db = getAdminDb();
    if (db && (await this.isFirestoreAvailable())) {
      try {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const sessionDoc = await db.collection('sessions').doc(tokenHash).get();
        if (sessionDoc.exists) {
          const data = sessionDoc.data() as any;
          if (Date.now() > data.expiresAt) {
            await db.collection('sessions').doc(tokenHash).delete();
            return null;
          }
          const session = {
            role: data.role,
            email: data.email,
            expiresAt: data.expiresAt,
          };
          sessionMemoryCache.set(token, session);
          return session;
        }
        return null;
      } catch (err: any) {
        console.warn('[Repository] Firestore getSession failed, falling back:', err.message);
      }
    }

    // Local fallback
    const local = getLocalAuthStore();
    const session = local.sessions[token];
    if (session) {
      if (Date.now() > session.expiresAt) {
        delete local.sessions[token];
        saveLocalAuthStore(local);
        return null;
      }
      sessionMemoryCache.set(token, session);
      return session;
    }
    return null;
  }

  async createSession(token: string, session: { role: 'admin' | 'team'; email?: string; expiresAt: number }): Promise<void> {
    sessionMemoryCache.set(token, session);

    const db = getAdminDb();
    if (db && (await this.isFirestoreAvailable())) {
      try {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        await db.collection('sessions').doc(tokenHash).set({
          role: session.role,
          email: session.email || null,
          expiresAt: session.expiresAt,
          createdAt: new Date().toISOString(),
        });
        return;
      } catch (err: any) {
        console.warn('[Repository] Firestore createSession failed, falling back:', err.message);
      }
    }

    // Local fallback
    const local = getLocalAuthStore();
    local.sessions[token] = session;
    saveLocalAuthStore(local);
  }

  async deleteSession(token: string): Promise<void> {
    sessionMemoryCache.delete(token);

    const db = getAdminDb();
    if (db && (await this.isFirestoreAvailable())) {
      try {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        await db.collection('sessions').doc(tokenHash).delete();
        return;
      } catch (err: any) {
        console.warn('[Repository] Firestore deleteSession failed:', err.message);
      }
    }

    // Local fallback
    const local = getLocalAuthStore();
    if (local.sessions[token]) {
      delete local.sessions[token];
      saveLocalAuthStore(local);
    }
  }

  // ---------------- PORTAL DATA (PUBLIC & ADMIN) ----------------

  async getPortalData(isAdmin: boolean = false): Promise<PortalStore> {
    try {
      const db = getAdminDb();
      if (db && (await this.isFirestoreAvailable())) {
        try {
          // Parallel queries to Firestore
          const [settingsDoc, tabsSnap, categoriesDoc, customTabsDoc] = await Promise.all([
            db.collection('portal').doc('settings').get(),
            db.collection('tabs').orderBy('order', 'asc').get(),
            db.collection('portal').doc('categories').get(),
            db.collection('portal').doc('customTabs').get(),
          ]);

          let announcementsQuery = db.collection('announcements');
          let schedulesQuery = db.collection('schedules');
          let documentsQuery = db.collection('documents');
          let eventSectionsQuery = db.collection('eventSections');
          let locationsQuery = db.collection('locations');

          const [announcementsSnap, schedulesSnap, documentsSnap, eventSectionsSnap, locationsSnap] = await Promise.all([
            announcementsQuery.get(),
            schedulesQuery.get(),
            documentsQuery.get(),
            eventSectionsQuery.get(),
            locationsQuery.get(),
          ]);

          let announcements = announcementsSnap.docs.map((d) => ({ ...d.data(), id: d.id } as Announcement));
          let schedules = schedulesSnap.docs.map((d) => ({ ...d.data(), id: d.id } as ScheduleItem));
          let documents = documentsSnap.docs.map((d) => ({ ...d.data(), id: d.id } as DocumentItem));
          let eventSections = eventSectionsSnap.docs.map((d) => ({ ...d.data(), id: d.id } as EventSection));
          let locations = locationsSnap.docs.map((d) => ({ ...d.data(), id: d.id } as LocationItem));

          // Sort items by order / timestamp
          schedules.sort((a, b) => (a.order || 0) - (b.order || 0));
          documents.sort((a, b) => (a.order || 0) - (b.order || 0));
          eventSections.sort((a, b) => (a.order || 0) - (b.order || 0));
          locations.sort((a, b) => (a.order || 0) - (b.order || 0));

          // If not admin, hide drafts
          if (!isAdmin) {
            announcements = announcements.filter((a) => a.status !== 'draft');
            schedules = schedules.filter((s) => s.status !== 'draft');
            documents = documents.filter((d) => d.status !== 'draft');
            eventSections = eventSections.filter((e) => e.status !== 'draft');
            locations = locations.filter((l) => l.status !== 'draft');
          }

          const settings = settingsDoc.exists ? (settingsDoc.data() as PortalSettings) : getLocalPortalStore().settings;
          const tabs = tabsSnap.docs.length > 0
            ? tabsSnap.docs.map((d) => ({ ...d.data(), id: d.id } as NavigationTab))
            : getLocalPortalStore().tabs;
          const categories = categoriesDoc.exists && categoriesDoc.data()?.items
            ? (categoriesDoc.data()?.items as EventCategory[])
            : getLocalPortalStore().categories;
          const customTabsContent = customTabsDoc.exists ? (customTabsDoc.data() as Record<string, string>) : {};

          return {
            tabs,
            settings,
            categories,
            announcements,
            schedules,
            documents,
            eventSections,
            locations,
            customTabsContent,
          };
        } catch (err: any) {
          console.warn('[Repository] Firestore getPortalData failed, using local file:', err.message);
        }
      }
    } catch (outerErr: any) {
      console.warn('[Repository] Firestore connection check error in getPortalData:', outerErr.message);
    }

    // Local fallback
    const local = getLocalPortalStore();
    if (isAdmin) return local;

    return {
      ...local,
      announcements: local.announcements.filter((a) => a.status !== 'draft'),
      schedules: local.schedules.filter((s) => s.status !== 'draft'),
      documents: local.documents.filter((d) => d.status !== 'draft'),
      eventSections: local.eventSections.filter((e) => e.status !== 'draft'),
      locations: local.locations.filter((l) => l.status !== 'draft'),
    };
  }

  // ---------------- SETTINGS & PHASE ----------------

  async updateSettings(settings: Partial<PortalSettings>): Promise<PortalSettings> {
    const db = getAdminDb();
    if (db && (await this.isFirestoreAvailable())) {
      try {
        await db.collection('portal').doc('settings').set(settings, { merge: true });
        const updated = await db.collection('portal').doc('settings').get();
        return updated.data() as PortalSettings;
      } catch (err: any) {
        console.warn('[Repository] Firestore updateSettings failed, falling back:', err.message);
      }
    }

    const local = getLocalPortalStore();
    local.settings = { ...local.settings, ...settings };
    saveLocalPortalStore(local);
    return local.settings;
  }

  async updateActivePhase(phase: 'pre-final' | 'during-final'): Promise<{ activePhase: string }> {
    const db = getAdminDb();
    if (db && (await this.isFirestoreAvailable())) {
      try {
        await db.collection('portal').doc('settings').set({ activePhase: phase }, { merge: true });
        return { activePhase: phase };
      } catch (err: any) {
        console.warn('[Repository] Firestore updateActivePhase failed:', err.message);
      }
    }

    const local = getLocalPortalStore();
    local.settings.activePhase = phase;
    saveLocalPortalStore(local);
    return { activePhase: phase };
  }

  // ---------------- CATEGORIES & TABS ----------------

  async updateCategories(categories: EventCategory[]): Promise<EventCategory[]> {
    const db = getAdminDb();
    if (db && (await this.isFirestoreAvailable())) {
      try {
        await db.collection('portal').doc('categories').set({ items: categories, updatedAt: new Date().toISOString() });
        return categories;
      } catch (err: any) {
        console.warn('[Repository] Firestore updateCategories failed:', err.message);
      }
    }

    const local = getLocalPortalStore();
    local.categories = categories;
    saveLocalPortalStore(local);
    return local.categories;
  }

  async updateTabs(tabs: NavigationTab[]): Promise<NavigationTab[]> {
    const db = getAdminDb();
    if (db && (await this.isFirestoreAvailable())) {
      try {
        const batch = db.batch();
        for (const tab of tabs) {
          const ref = db.collection('tabs').doc(tab.id);
          batch.set(ref, tab, { merge: true });
        }
        await batch.commit();
        return tabs;
      } catch (err: any) {
        console.warn('[Repository] Firestore updateTabs failed:', err.message);
      }
    }

    const local = getLocalPortalStore();
    local.tabs = tabs;
    saveLocalPortalStore(local);
    return local.tabs;
  }

  // ---------------- ANNOUNCEMENTS ----------------

  async saveAnnouncement(item: Partial<Announcement>): Promise<Announcement> {
    const id = item.id || `ann_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullItem: Announcement = {
      id,
      title: item.title || 'Hebahan SOAR 2026',
      content: item.content || '',
      priority: item.priority || 'general',
      isPinned: Boolean(item.isPinned),
      category: item.category || 'general',
      phase: item.phase || 'all',
      status: item.status || 'published',
      author: item.author || 'Urus Setia KPMBP',
      timestamp: item.timestamp || new Date().toISOString(),
      imageUrl: item.imageUrl || '',
      imageCaption: item.imageCaption || '',
      externalUrl: item.externalUrl || '',
      externalUrlLabel: item.externalUrlLabel || '',
      telegramRawText: item.telegramRawText || '',
      tags: Array.isArray(item.tags) ? item.tags : [],
      isSuperseded: Boolean(item.isSuperseded),
      supersededReason: item.supersededReason || '',
      collectionId: item.collectionId || '',
      collectionName: item.collectionName || '',
      collectionIndex: typeof item.collectionIndex === 'number' ? item.collectionIndex : undefined,
      importantDates: item.importantDates || '',
      verificationRequired: Boolean(item.verificationRequired),
      lastUpdated: new Date().toISOString(),
    };

    const db = getAdminDb();
    if (db && (await this.isFirestoreAvailable())) {
      try {
        await db.collection('announcements').doc(id).set(fullItem, { merge: true });
        return fullItem;
      } catch (err: any) {
        console.warn('[Repository] Firestore saveAnnouncement failed:', err.message);
      }
    }

    const local = getLocalPortalStore();
    const index = local.announcements.findIndex((a) => a.id === id);
    if (index >= 0) {
      local.announcements[index] = fullItem;
    } else {
      local.announcements.unshift(fullItem);
    }
    saveLocalPortalStore(local);
    return fullItem;
  }

  async saveBatchAnnouncements(items: Partial<Announcement>[]): Promise<Announcement[]> {
    const saved: Announcement[] = [];
    for (const item of items) {
      saved.push(await this.saveAnnouncement(item));
    }
    return saved;
  }

  async supersedeAnnouncement(id: string, isSuperseded: boolean, supersededReason?: string): Promise<Announcement> {
    const db = getAdminDb();
    if (db && (await this.isFirestoreAvailable())) {
      try {
        const updateData: any = {
          isSuperseded: Boolean(isSuperseded),
          lastUpdated: new Date().toISOString(),
        };
        if (supersededReason !== undefined) {
          updateData.supersededReason = supersededReason;
        }
        await db.collection('announcements').doc(id).set(updateData, { merge: true });
        const doc = await db.collection('announcements').doc(id).get();
        return { ...doc.data(), id: doc.id } as Announcement;
      } catch (err: any) {
        console.warn('[Repository] Firestore supersedeAnnouncement failed:', err.message);
      }
    }

    const local = getLocalPortalStore();
    const index = local.announcements.findIndex((a) => a.id === id);
    if (index >= 0) {
      local.announcements[index].isSuperseded = Boolean(isSuperseded);
      if (supersededReason !== undefined) {
        local.announcements[index].supersededReason = supersededReason;
      }
      local.announcements[index].lastUpdated = new Date().toISOString();
      saveLocalPortalStore(local);
      return local.announcements[index];
    }
    throw new Error('Announcement not found');
  }

  async deleteAnnouncement(id: string): Promise<void> {
    const db = getAdminDb();
    if (db && (await this.isFirestoreAvailable())) {
      try {
        await db.collection('announcements').doc(id).delete();
        return;
      } catch (err: any) {
        console.warn('[Repository] Firestore deleteAnnouncement failed:', err.message);
      }
    }

    const local = getLocalPortalStore();
    local.announcements = local.announcements.filter((a) => a.id !== id);
    saveLocalPortalStore(local);
  }

  // ---------------- SCHEDULES ----------------

  async saveSchedule(item: Partial<ScheduleItem>): Promise<ScheduleItem> {
    const id = item.id || `sch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullItem: ScheduleItem = {
      id,
      categoryName: item.categoryName || 'Kategori Acara',
      subcategory: item.subcategory || '',
      date: item.date || '',
      time: item.time || '',
      venue: item.venue || '',
      imageUrl: item.imageUrl || '',
      sourceDocUrl: item.sourceDocUrl || '',
      notes: item.notes || '',
      phase: item.phase || 'all',
      status: item.status || 'published',
      performanceOrder: item.performanceOrder || '',
      order: typeof item.order === 'number' ? item.order : 1,
      lastUpdated: new Date().toISOString(),
    };

    const db = getAdminDb();
    if (db && (await this.isFirestoreAvailable())) {
      try {
        await db.collection('schedules').doc(id).set(fullItem, { merge: true });
        return fullItem;
      } catch (err: any) {
        console.warn('[Repository] Firestore saveSchedule failed:', err.message);
      }
    }

    const local = getLocalPortalStore();
    const index = local.schedules.findIndex((s) => s.id === id);
    if (index >= 0) {
      local.schedules[index] = fullItem;
    } else {
      local.schedules.push(fullItem);
    }
    saveLocalPortalStore(local);
    return fullItem;
  }

  async deleteSchedule(id: string): Promise<void> {
    const db = getAdminDb();
    if (db && (await this.isFirestoreAvailable())) {
      try {
        await db.collection('schedules').doc(id).delete();
        return;
      } catch (err: any) {
        console.warn('[Repository] Firestore deleteSchedule failed:', err.message);
      }
    }

    const local = getLocalPortalStore();
    local.schedules = local.schedules.filter((s) => s.id !== id);
    saveLocalPortalStore(local);
  }

  // ---------------- DOCUMENTS ----------------

  async saveDocument(item: Partial<DocumentItem>): Promise<DocumentItem> {
    const id = item.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullItem: DocumentItem = {
      id,
      title: item.title || 'Dokumen Rujukan',
      category: item.category || 'general',
      description: item.description || '',
      fileUrl: item.fileUrl || '',
      fileType: item.fileType || 'drive',
      phase: item.phase || 'all',
      status: item.status || 'published',
      order: typeof item.order === 'number' ? item.order : 1,
      isPinned: Boolean(item.isPinned),
      lastUpdated: new Date().toISOString(),
    };

    const db = getAdminDb();
    if (db && (await this.isFirestoreAvailable())) {
      try {
        await db.collection('documents').doc(id).set(fullItem, { merge: true });
        return fullItem;
      } catch (err: any) {
        console.warn('[Repository] Firestore saveDocument failed:', err.message);
      }
    }

    const local = getLocalPortalStore();
    const index = local.documents.findIndex((d) => d.id === id);
    if (index >= 0) {
      local.documents[index] = fullItem;
    } else {
      local.documents.push(fullItem);
    }
    saveLocalPortalStore(local);
    return fullItem;
  }

  async deleteDocument(id: string): Promise<void> {
    const db = getAdminDb();
    if (db && (await this.isFirestoreAvailable())) {
      try {
        await db.collection('documents').doc(id).delete();
        return;
      } catch (err: any) {
        console.warn('[Repository] Firestore deleteDocument failed:', err.message);
      }
    }

    const local = getLocalPortalStore();
    local.documents = local.documents.filter((d) => d.id !== id);
    saveLocalPortalStore(local);
  }

  // ---------------- EVENT SECTIONS ----------------

  async saveEventSection(item: Partial<EventSection>): Promise<EventSection> {
    const id = item.id || `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullItem: EventSection = {
      id,
      title: item.title || 'Maklumat Acara',
      category: item.category || 'general',
      type: item.type || 'rundown',
      description: item.description || '',
      phase: item.phase || 'all',
      status: item.status || 'published',
      items: item.items || [],
      rawContent: item.rawContent || '',
      order: typeof item.order === 'number' ? item.order : 1,
    };

    const db = getAdminDb();
    if (db && (await this.isFirestoreAvailable())) {
      try {
        await db.collection('eventSections').doc(id).set(fullItem, { merge: true });
        return fullItem;
      } catch (err: any) {
        console.warn('[Repository] Firestore saveEventSection failed:', err.message);
      }
    }

    const local = getLocalPortalStore();
    const index = local.eventSections.findIndex((e) => e.id === id);
    if (index >= 0) {
      local.eventSections[index] = fullItem;
    } else {
      local.eventSections.push(fullItem);
    }
    saveLocalPortalStore(local);
    return fullItem;
  }

  async deleteEventSection(id: string): Promise<void> {
    const db = getAdminDb();
    if (db && (await this.isFirestoreAvailable())) {
      try {
        await db.collection('eventSections').doc(id).delete();
        return;
      } catch (err: any) {
        console.warn('[Repository] Firestore deleteEventSection failed:', err.message);
      }
    }

    const local = getLocalPortalStore();
    local.eventSections = local.eventSections.filter((e) => e.id !== id);
    saveLocalPortalStore(local);
  }

  // ---------------- LOCATIONS ----------------

  async saveLocation(item: Partial<LocationItem>): Promise<LocationItem> {
    const id = item.id || `loc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullItem: LocationItem = {
      id,
      name: item.name || 'Lokasi / Pergerakan',
      category: item.category || 'venue',
      address: item.address || '',
      mapUrl: item.mapUrl || '',
      coordinates: item.coordinates || '',
      scheduleTimes: item.scheduleTimes || '',
      routeDetails: item.routeDetails || '',
      notes: item.notes || '',
      floorplanUrl: item.floorplanUrl || '',
      contactPerson: item.contactPerson || '',
      contactPhone: item.contactPhone || '',
      phase: item.phase || 'all',
      status: item.status || 'published',
      order: typeof item.order === 'number' ? item.order : 1,
    };

    const db = getAdminDb();
    if (db && (await this.isFirestoreAvailable())) {
      try {
        await db.collection('locations').doc(id).set(fullItem, { merge: true });
        return fullItem;
      } catch (err: any) {
        console.warn('[Repository] Firestore saveLocation failed:', err.message);
      }
    }

    const local = getLocalPortalStore();
    const index = local.locations.findIndex((l) => l.id === id);
    if (index >= 0) {
      local.locations[index] = fullItem;
    } else {
      local.locations.push(fullItem);
    }
    saveLocalPortalStore(local);
    return fullItem;
  }

  async deleteLocation(id: string): Promise<void> {
    const db = getAdminDb();
    if (db && (await this.isFirestoreAvailable())) {
      try {
        await db.collection('locations').doc(id).delete();
        return;
      } catch (err: any) {
        console.warn('[Repository] Firestore deleteLocation failed:', err.message);
      }
    }

    const local = getLocalPortalStore();
    local.locations = local.locations.filter((l) => l.id !== id);
    saveLocalPortalStore(local);
  }

  // ---------------- CUSTOM TABS CONTENT ----------------

  async updateCustomTab(tabId: string, content: string): Promise<void> {
    const db = getAdminDb();
    if (db && (await this.isFirestoreAvailable())) {
      try {
        await db.collection('portal').doc('customTabs').set({ [tabId]: content }, { merge: true });
        return;
      } catch (err: any) {
        console.warn('[Repository] Firestore updateCustomTab failed:', err.message);
      }
    }

    const local = getLocalPortalStore();
    local.customTabsContent[tabId] = content;
    saveLocalPortalStore(local);
  }
}

export const repository = new PortalRepository();
