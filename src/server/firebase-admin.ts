import type { App } from 'firebase-admin/app';
import type { Firestore } from 'firebase-admin/firestore';
import type { Storage } from 'firebase-admin/storage';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.resolve(__dirname, '../../firebase-applet-config.json');

let firebaseConfig: any = {
  projectId: 'gen-lang-client-0981591806',
  firestoreDatabaseId: 'ai-studio-teamkpmbp-bd501981-2a65-4671-892c-6de5c1a9cd1c',
  storageBucket: 'gen-lang-client-0981591806.firebasestorage.app',
};

if (fs.existsSync(configPath)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {}
}

export interface ServiceAccountCredentials {
  type?: string;
  project_id?: string;
  private_key_id?: string;
  private_key: string;
  client_email: string;
  client_id?: string;
  auth_uri?: string;
  token_uri?: string;
  auth_provider_x509_cert_url?: string;
  client_x509_cert_url?: string;
}

let adminApp: App | null = null;
let firestoreDb: Firestore | null = null;
let storageBucketInstance: ReturnType<Storage['bucket']> | null = null;
let adminInitError: string | null = null;

/**
 * Safely parses the Service Account JSON from the environment variable.
 * Supports:
 * - Single-line or multi-line JSON string
 * - Base64-encoded JSON string
 * - Strips accidental surrounding quotes
 * - Sanitizes private key newlines
 */
export function parseServiceAccountEnv(): {
  credentials: ServiceAccountCredentials | null;
  error: string | null;
} {
  // Primary standard secret: FIREBASE_SERVICE_ACCOUNT (with legacy fallback to FIREBASE_SERVICE_ACCOUNT_KEY)
  const rawEnv = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (rawEnv && rawEnv.trim()) {
    let clean = rawEnv.trim();

    // Remove accidental wrapping quotes
    if (
      (clean.startsWith('"') && clean.endsWith('"')) ||
      (clean.startsWith("'") && clean.endsWith("'"))
    ) {
      clean = clean.slice(1, -1).trim();
    }

    // Attempt Base64 decode if not starting with '{'
    let jsonContent = clean;
    if (!clean.startsWith('{')) {
      try {
        const decoded = Buffer.from(clean, 'base64').toString('utf-8').trim();
        if (decoded.startsWith('{')) {
          jsonContent = decoded;
        }
      } catch {
        // Fall back to original content
      }
    }

    try {
      const parsed = JSON.parse(jsonContent);

      if (!parsed.client_email || typeof parsed.client_email !== 'string') {
        return {
          credentials: null,
          error: "FIREBASE_SERVICE_ACCOUNT tidak sah: Medan 'client_email' tiada atau tidak lengkap.",
        };
      }

      if (!parsed.private_key || typeof parsed.private_key !== 'string') {
        return {
          credentials: null,
          error: "FIREBASE_SERVICE_ACCOUNT tidak sah: Medan 'private_key' tiada atau tidak lengkap.",
        };
      }

      // Format private key escaped newlines correctly
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');

      return { credentials: parsed as ServiceAccountCredentials, error: null };
    } catch (parseErr: any) {
      return {
        credentials: null,
        error: 'FIREBASE_SERVICE_ACCOUNT mengandungi JSON tidak sah. Sila pastikan format JSON lengkap atau gunakan format Base64.',
      };
    }
  }

  // Optional legacy fallback: Discrete email & private key
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    try {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      return {
        credentials: {
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
          private_key: privateKey,
          project_id: process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId,
        },
        error: null,
      };
    } catch (discreteErr: any) {
      return {
        credentials: null,
        error: 'Gagal memproses FIREBASE_CLIENT_EMAIL atau FIREBASE_PRIVATE_KEY berasingan.',
      };
    }
  }

  return {
    credentials: null,
    error: 'Pemboleh ubah persekitaran FIREBASE_SERVICE_ACCOUNT belum dikonfigurasi.',
  };
}

let cachedStatus: { status: FirebaseAdminStatus; timestamp: number } | null = null;

/**
 * Initialize Firebase Admin SDK using the resolved Service Account credentials.
 */
export function initFirebaseAdmin(): { app: App | null; db: Firestore | null; error: string | null } {
  if (adminApp && firestoreDb) {
    return { app: adminApp, db: firestoreDb, error: null };
  }

  try {
    const { credentials, error: parseError } = parseServiceAccountEnv();

    // If no credentials configured and not running in GCP native runtime, do not initialize
    const isGcpEnvironment = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.K_SERVICE);
    if (!credentials && !isGcpEnvironment) {
      adminInitError = parseError || 'Pemboleh ubah persekitaran FIREBASE_SERVICE_ACCOUNT belum dikonfigurasi.';
      return { app: null, db: null, error: adminInitError };
    }

    const { initializeApp, getApps, cert } = require('firebase-admin/app');
    const { getFirestore } = require('firebase-admin/firestore');
    const { getStorage } = require('firebase-admin/storage');

    const existingApps = getApps();
    if (existingApps.length > 0) {
      adminApp = existingApps[0];
    } else {
      const projectId =
        credentials?.project_id ||
        (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PROJECT_ID !== 'syncrozz-platform'
          ? process.env.FIREBASE_PROJECT_ID
          : firebaseConfig.projectId) ||
        'gen-lang-client-0981591806';

      const storageBucket =
        (process.env.FIREBASE_STORAGE_BUCKET && !process.env.FIREBASE_STORAGE_BUCKET.includes('syncrozz-platform')
          ? process.env.FIREBASE_STORAGE_BUCKET
          : firebaseConfig.storageBucket) ||
        `${projectId}.firebasestorage.app`;

      const appOptions: any = {
        projectId,
        storageBucket,
      };

      if (credentials) {
        appOptions.credential = cert({
          projectId: credentials.project_id || (credentials as any).projectId || projectId,
          clientEmail: credentials.client_email || (credentials as any).clientEmail,
          privateKey: credentials.private_key || (credentials as any).privateKey,
        });
      }

      adminApp = initializeApp(appOptions);
    }

    const databaseId =
      (process.env.FIRESTORE_DATABASE_ID && process.env.FIRESTORE_DATABASE_ID !== 'default'
        ? process.env.FIRESTORE_DATABASE_ID
        : firebaseConfig.firestoreDatabaseId) ||
      'ai-studio-teamkpmbp-bd501981-2a65-4671-892c-6de5c1a9cd1c';

    try {
      firestoreDb = getFirestore(adminApp, databaseId);
      try {
        if (firestoreDb) {
          firestoreDb.settings({ ignoreUndefinedProperties: true });
        }
      } catch {}
    } catch (dbErr: any) {
      try {
        firestoreDb = getFirestore(adminApp);
        try {
          if (firestoreDb) {
            firestoreDb.settings({ ignoreUndefinedProperties: true });
          }
        } catch {}
      } catch {}
    }

    try {
      if (adminApp) {
        const storageBucketName =
          process.env.FIREBASE_STORAGE_BUCKET ||
          firebaseConfig.storageBucket ||
          `${adminApp.options?.projectId || 'gen-lang-client-0981591806'}.firebasestorage.app`;
        const storage = getStorage(adminApp);
        storageBucketInstance = storage.bucket(storageBucketName);
      }
    } catch {}

    adminInitError = null;
    return { app: adminApp, db: firestoreDb, error: null };
  } catch (err: any) {
    adminInitError = err.message || 'Ralat semasa inisialisasi Firebase Admin';
    return { app: null, db: null, error: adminInitError };
  }
}

export function getAdminDb(): Firestore | null {
  if (!firestoreDb) {
    initFirebaseAdmin();
  }
  return firestoreDb;
}

export function getStorageBucket(): ReturnType<Storage['bucket']> | null {
  if (!storageBucketInstance) {
    initFirebaseAdmin();
  }
  return storageBucketInstance;
}

export interface FirebaseAdminStatus {
  configured: boolean;
  projectId: string;
  databaseId: string;
  storageBucket: string;
  hasServiceAccount: boolean;
  serviceAccountClientEmail?: string;
  connectionHealthy: boolean;
  error?: string;
  guidance?: string;
}

export async function checkFirebaseAdminStatus(): Promise<FirebaseAdminStatus> {
  // Use cached result if within 30 seconds
  if (cachedStatus && Date.now() - cachedStatus.timestamp < 30000) {
    return cachedStatus.status;
  }

  const { credentials, error: parseError } = parseServiceAccountEnv();

  const projectId =
    credentials?.project_id ||
    (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PROJECT_ID !== 'syncrozz-platform'
      ? process.env.FIREBASE_PROJECT_ID
      : firebaseConfig.projectId) ||
    'gen-lang-client-0981591806';

  const databaseId =
    (process.env.FIRESTORE_DATABASE_ID && process.env.FIRESTORE_DATABASE_ID !== 'default'
      ? process.env.FIRESTORE_DATABASE_ID
      : firebaseConfig.firestoreDatabaseId) ||
    'ai-studio-teamkpmbp-bd501981-2a65-4671-892c-6de5c1a9cd1c';

  const storageBucket =
    (process.env.FIREBASE_STORAGE_BUCKET && !process.env.FIREBASE_STORAGE_BUCKET.includes('syncrozz-platform')
      ? process.env.FIREBASE_STORAGE_BUCKET
      : firebaseConfig.storageBucket) ||
    `${projectId}.firebasestorage.app`;

  // Fast exit: if no credentials and not in GCP runtime, immediately report unconfigured without hanging
  const isGcpEnvironment = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.K_SERVICE);
  if (!credentials && !isGcpEnvironment) {
    const unconfiguredStatus: FirebaseAdminStatus = {
      configured: false,
      projectId,
      databaseId,
      storageBucket,
      hasServiceAccount: false,
      connectionHealthy: false,
      error: parseError || 'Pemboleh ubah persekitaran FIREBASE_SERVICE_ACCOUNT belum dikonfigurasi.',
      guidance: 'Untuk mengaktifkan Firestore & Storage di Vercel: Tambah environment variable tunggal FIREBASE_SERVICE_ACCOUNT (Service Account JSON penuh atau Base64) dalam tetapan Vercel.',
    };
    cachedStatus = { status: unconfiguredStatus, timestamp: Date.now() };
    return unconfiguredStatus;
  }

  const db = getAdminDb();
  let connectionHealthy = false;
  let testError: string | undefined = parseError || adminInitError || undefined;

  if (db) {
    try {
      // Test read with 3.5-second timeout so it never hangs serverless invocations
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Firestore connection check timed out (3500ms)')), 3500)
      );
      await Promise.race([
        db.collection('test').doc('connection').get(),
        timeoutPromise,
      ]);
      connectionHealthy = true;
      testError = undefined;
    } catch (err: any) {
      if (err.code === 7 || err.message?.includes('PERMISSION_DENIED')) {
        testError =
          'PERMISSION_DENIED: Akses Firestore ditolak. Sila pastikan Service Account mempunyai peranan (Role) Cloud Datastore Owner atau Firebase Admin.';
      } else {
        testError = err.message || 'Sambungan ke Firestore ditolak.';
      }
    }
  }

  const isConfigured = Boolean(connectionHealthy || credentials);

  const status: FirebaseAdminStatus = {
    configured: isConfigured,
    projectId,
    databaseId,
    storageBucket,
    hasServiceAccount: Boolean(credentials),
    serviceAccountClientEmail: credentials ? credentials.client_email : undefined,
    connectionHealthy,
    error: connectionHealthy ? undefined : testError,
    guidance: connectionHealthy
      ? undefined
      : 'Untuk mengaktifkan Firestore & Storage di Vercel: Tambah environment variable tunggal FIREBASE_SERVICE_ACCOUNT (Service Account JSON penuh atau Base64) dalam tetapan Vercel.',
  };

  cachedStatus = { status, timestamp: Date.now() };
  return status;
}
