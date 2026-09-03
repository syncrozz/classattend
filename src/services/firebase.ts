import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  Firestore
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let firestoreInstance: Firestore;
const rawDbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId.trim() !== '' 
  ? firebaseConfig.firestoreDatabaseId.trim() 
  : undefined;
const dbId = rawDbId === '(default)' ? undefined : rawDbId;

try {
  firestoreInstance = dbId
    ? initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      }, dbId)
    : initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      });
} catch (e1) {
  try {
    firestoreInstance = dbId
      ? initializeFirestore(app, {
          localCache: memoryLocalCache()
        }, dbId)
      : initializeFirestore(app, {
          localCache: memoryLocalCache()
        });
  } catch (e2) {
    firestoreInstance = dbId ? getFirestore(app, dbId) : getFirestore(app);
  }
}

export const db = firestoreInstance;

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

