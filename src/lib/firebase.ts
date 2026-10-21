import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore (using specific databaseId if specified in config)
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Connection test on boot as required by Firebase integration guidelines
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firebase] Firestore connected successfully.');
    return true;
  } catch (error: any) {
    if (error?.message?.includes('the client is offline')) {
      console.warn('[Firebase] Firestore client offline. Please check connection.');
      return false;
    }
    // Document does not exist or permission checked, connection was attempted
    console.log('[Firebase] Connection validated.');
    return true;
  }
}

// Sign in with Google (Admin)
export async function signInAdminWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

// Sign out from Firebase
export async function signOutFirebase() {
  await fbSignOut(auth);
}
