import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  memoryLocalCache,
  Firestore,
  setLogLevel,
  doc,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Set Firestore log level to error to avoid noisy internal multi-tab/lease warnings
setLogLevel('error');

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let firestoreInstance: Firestore;
const rawDbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId.trim() !== '' 
  ? firebaseConfig.firestoreDatabaseId.trim() 
  : undefined;
const dbId = rawDbId === '(default)' ? undefined : rawDbId;

// Initialize Firestore with memoryLocalCache to prevent IndexedDB multi-tab primary lease lock contention
// in iframes and multi-tab environments (avoiding 'Backfill Indexes' and 'Collect garbage' lease errors).
// experimentalAutoDetectLongPolling enables automatic fallback to long-polling when WebSocket channels encounter proxy/network hiccups.
try {
  firestoreInstance = dbId
    ? initializeFirestore(app, {
        localCache: memoryLocalCache(),
        experimentalAutoDetectLongPolling: true,
      }, dbId)
    : initializeFirestore(app, {
        localCache: memoryLocalCache(),
        experimentalAutoDetectLongPolling: true,
      });
} catch {
  firestoreInstance = dbId ? getFirestore(app, dbId) : getFirestore(app);
}

export const db = firestoreInstance;
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export enum FirestoreErrorCategory {
  NETWORK_UNAVAILABLE = 'NETWORK_UNAVAILABLE',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  AUTH_FAILURE = 'AUTH_FAILURE',
  INVALID_DATA = 'INVALID_DATA',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  CONFIG_ERROR = 'CONFIG_ERROR',
  UNKNOWN = 'UNKNOWN'
}

export interface FirestoreErrorClassification {
  category: FirestoreErrorCategory;
  code: string;
  message: string;
  isHarmlessOffline: boolean;
}

/**
 * Classifies Firestore runtime errors into distinct categories:
 * - Never converts permission-denied or auth failures into harmless offline errors
 * - Explicitly identifies quota exhaustion (resource-exhausted)
 * - Identifies temporary network unavailability (unavailable, offline)
 */
export function classifyFirestoreError(error: unknown): FirestoreErrorClassification {
  const message = error instanceof Error ? error.message : String(error || '');
  const rawCode = (error as any)?.code;
  const code = typeof rawCode === 'string' ? rawCode.toLowerCase() : '';
  const lowerMsg = message.toLowerCase();

  // 1. Permission Denied - STRICTLY NEVER treated as offline
  if (
    code === 'permission-denied' ||
    code.includes('permission-denied') ||
    lowerMsg.includes('permission-denied') ||
    lowerMsg.includes('missing or insufficient permissions') ||
    lowerMsg.includes('insufficient permissions')
  ) {
    return {
      category: FirestoreErrorCategory.PERMISSION_DENIED,
      code: code || 'permission-denied',
      message,
      isHarmlessOffline: false
    };
  }

  // 2. Authentication Failure
  if (
    code === 'unauthenticated' ||
    lowerMsg.includes('unauthenticated') ||
    lowerMsg.includes('auth/user-token-expired') ||
    lowerMsg.includes('auth/invalid-user-token')
  ) {
    return {
      category: FirestoreErrorCategory.AUTH_FAILURE,
      code: code || 'unauthenticated',
      message,
      isHarmlessOffline: false
    };
  }

  // 3. Quota Exceeded (Resource Exhausted)
  if (
    code === 'resource-exhausted' ||
    lowerMsg.includes('resource-exhausted') ||
    lowerMsg.includes('quota exceeded') ||
    lowerMsg.includes('free daily read units')
  ) {
    return {
      category: FirestoreErrorCategory.QUOTA_EXCEEDED,
      code: code || 'resource-exhausted',
      message,
      isHarmlessOffline: false
    };
  }

  // 4. Invalid Data / Arguments / Preconditions
  if (
    code === 'invalid-argument' ||
    code === 'out-of-range' ||
    code === 'failed-precondition' ||
    lowerMsg.includes('invalid-argument')
  ) {
    return {
      category: FirestoreErrorCategory.INVALID_DATA,
      code: code || 'invalid-argument',
      message,
      isHarmlessOffline: false
    };
  }

  // 5. Configuration Error
  if (
    !firebaseConfig.projectId ||
    !firebaseConfig.apiKey ||
    lowerMsg.includes('invalid project id') ||
    lowerMsg.includes('configuration error')
  ) {
    return {
      category: FirestoreErrorCategory.CONFIG_ERROR,
      code: code || 'config-error',
      message,
      isHarmlessOffline: false
    };
  }

  // 6. Network Unavailability (Offline / Temporary Disconnect)
  if (
    code === 'unavailable' ||
    lowerMsg.includes('the client is offline') ||
    lowerMsg.includes('unavailable') ||
    lowerMsg.includes('could not reach cloud firestore') ||
    lowerMsg.includes('network error')
  ) {
    return {
      category: FirestoreErrorCategory.NETWORK_UNAVAILABLE,
      code: code || 'unavailable',
      message,
      isHarmlessOffline: true
    };
  }

  return {
    category: FirestoreErrorCategory.UNKNOWN,
    code: code || 'unknown',
    message,
    isHarmlessOffline: false
  };
}

export interface FirestoreErrorInfo {
  error: string;
  category: FirestoreErrorCategory;
  code: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): FirestoreErrorInfo {
  const classification = classifyFirestoreError(error);
  const errInfo: FirestoreErrorInfo = {
    error: classification.message,
    category: classification.category,
    code: classification.code,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  // Structured logging that distinguishes security, quota, and offline events
  switch (classification.category) {
    case FirestoreErrorCategory.PERMISSION_DENIED:
      console.error(`[FIRESTORE SECURITY][PERMISSION_DENIED] Unauthorized ${operationType} on "${path}":`, JSON.stringify(errInfo));
      break;
    case FirestoreErrorCategory.AUTH_FAILURE:
      console.error(`[FIRESTORE AUTH] Unauthenticated ${operationType} on "${path}":`, JSON.stringify(errInfo));
      break;
    case FirestoreErrorCategory.QUOTA_EXCEEDED:
      console.error(`[FIRESTORE QUOTA] Free daily quota exceeded during ${operationType} on "${path}":`, JSON.stringify(errInfo));
      break;
    case FirestoreErrorCategory.CONFIG_ERROR:
      console.error(`[FIRESTORE CONFIG] Configuration issue during ${operationType} on "${path}":`, JSON.stringify(errInfo));
      break;
    case FirestoreErrorCategory.INVALID_DATA:
      console.error(`[FIRESTORE DATA] Invalid payload for ${operationType} on "${path}":`, JSON.stringify(errInfo));
      break;
    case FirestoreErrorCategory.NETWORK_UNAVAILABLE:
      console.warn(`[FIRESTORE NETWORK] Client offline/unavailable during ${operationType} on "${path}". Local cache active.`);
      break;
    default:
      console.error(`[FIRESTORE ERROR] ${operationType} on "${path}" failed:`, JSON.stringify(errInfo));
      break;
  }

  return errInfo;
}

/**
 * On-demand connectivity diagnostic.
 * NOTE: Deliberately NOT called automatically on boot to prevent burning daily read quota,
 * triggering spurious resource-exhaustion warnings, or failing when offline.
 */
export async function diagnoseFirestoreConnection(): Promise<{
  connected: boolean;
  category: FirestoreErrorCategory;
  message: string;
}> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return {
      connected: true,
      category: FirestoreErrorCategory.UNKNOWN,
      message: 'Connection successful.'
    };
  } catch (error) {
    const classification = classifyFirestoreError(error);
    return {
      connected: classification.category === FirestoreErrorCategory.NETWORK_UNAVAILABLE ? false : false,
      category: classification.category,
      message: classification.message
    };
  }
}

// Utility to clean undefined values before saving to Firestore
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = typeof value === 'object' && value !== null ? sanitizeForFirestore(value) : value;
      }
    }
    return cleaned as T;
  }
  return data;
}

