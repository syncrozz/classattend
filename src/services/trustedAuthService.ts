import {
  User,
  IdTokenResult,
  onAuthStateChanged,
  signInWithCustomToken,
  signOut as firebaseSignOut,
  getIdTokenResult
} from 'firebase/auth';
import { auth } from './firebase';
import { TrustedRole, TrustedClaims, TrustedIdentity } from '../types';

/**
 * Trusted Authentication Service (SES v4.5)
 * 
 * Provides the authoritative Firebase Authentication & Identity interface for Class Attend.
 * Implements the security principle:
 *   - Firebase Auth UID = Identity
 *   - Custom Claims = Server-controlled Role & Institutional ID
 *   - Client = Pure consumer of verified claims (CANNOT set or modify claims)
 */
class TrustedAuthService {
  private currentIdentity: TrustedIdentity = {
    uid: '',
    email: null,
    isAuthenticated: false,
    role: 'UNAUTHENTICATED',
    institutionalId: null,
    claims: null,
    isAnonymous: false
  };

  private listeners: Array<(identity: TrustedIdentity) => void> = [];
  private unsubscribeAuth: (() => void) | null = null;
  private isInitialized = false;

  constructor() {
    this.init();
  }

  /**
   * Initializes the Firebase Auth observer
   */
  private init(): void {
    if (this.isInitialized || typeof window === 'undefined') return;

    try {
      this.unsubscribeAuth = onAuthStateChanged(auth, async (user: User | null) => {
        await this.handleAuthStateChange(user);
      });
      this.isInitialized = true;
    } catch (err) {
      console.warn('TrustedAuthService: Firebase Auth observer initialization deferred:', err);
    }
  }

  /**
   * Evaluates Firebase Auth user and extracts authoritative custom claims
   */
  private async handleAuthStateChange(user: User | null): Promise<void> {
    if (!user) {
      this.currentIdentity = {
        uid: '',
        email: null,
        isAuthenticated: false,
        role: 'UNAUTHENTICATED',
        institutionalId: null,
        claims: null,
        isAnonymous: false
      };
      this.notifyListeners();
      return;
    }

    try {
      // Force refresh false by default; gets current cached token or refreshes if expired
      const tokenResult: IdTokenResult = await getIdTokenResult(user);
      const parsedClaims = this.parseTrustedClaims(tokenResult.claims);

      this.currentIdentity = {
        uid: user.uid,
        email: user.email,
        isAuthenticated: true,
        role: parsedClaims?.role || (user.isAnonymous ? 'ANONYMOUS' : 'UNAUTHENTICATED'),
        institutionalId: parsedClaims?.institutionalId || null,
        claims: parsedClaims,
        isAnonymous: user.isAnonymous
      };
    } catch (err) {
      console.warn('TrustedAuthService: Failed to retrieve ID token claims:', err);
      this.currentIdentity = {
        uid: user.uid,
        email: user.email,
        isAuthenticated: true,
        role: user.isAnonymous ? 'ANONYMOUS' : 'UNAUTHENTICATED',
        institutionalId: null,
        claims: null,
        isAnonymous: user.isAnonymous
      };
    }

    this.notifyListeners();
  }

  /**
   * Parses and validates custom claims according to the SES v4.5 Trusted Identity Model
   */
  public parseTrustedClaims(rawClaims: Record<string, unknown> | undefined): TrustedClaims | null {
    if (!rawClaims) return null;

    const rawRole = typeof rawClaims.role === 'string' ? rawClaims.role.toUpperCase() : '';
    const validRoles: TrustedRole[] = ['SUPER_ADMIN', 'ADMIN', 'LECTURER', 'STUDENT', 'KIOSK'];

    if (!validRoles.includes(rawRole as TrustedRole)) {
      return null;
    }

    const role = rawRole as TrustedRole;
    const institutionalId = typeof rawClaims.institutionalId === 'string' ? rawClaims.institutionalId : '';

    return {
      role,
      institutionalId,
      assignedClasses: Array.isArray(rawClaims.assignedClasses)
        ? rawClaims.assignedClasses.filter((c): c is string => typeof c === 'string')
        : undefined,
      kioskId: typeof rawClaims.kioskId === 'string' ? rawClaims.kioskId : undefined
    };
  }

  /**
   * Returns current evaluated identity
   */
  public getIdentity(): TrustedIdentity {
    return { ...this.currentIdentity };
  }

  /**
   * Returns current raw Firebase Auth user
   */
  public getCurrentUser(): User | null {
    return auth.currentUser;
  }

  /**
   * Retrieves fresh ID token
   */
  public async getIdToken(forceRefresh = false): Promise<string | null> {
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken(forceRefresh);
  }

  /**
   * Retrieves verified custom claims from the ID token
   */
  public async getTrustedClaims(forceRefresh = false): Promise<TrustedClaims | null> {
    if (!auth.currentUser) return null;
    const tokenResult = await getIdTokenResult(auth.currentUser, forceRefresh);
    return this.parseTrustedClaims(tokenResult.claims);
  }

  /**
   * Authenticates using a server-minted Firebase Custom Token
   */
  public async signInWithCustomToken(customToken: string): Promise<TrustedIdentity> {
    const userCredential = await signInWithCustomToken(auth, customToken);
    await this.handleAuthStateChange(userCredential.user);
    return this.getIdentity();
  }

  /**
   * Signs out from Firebase Authentication
   */
  public async signOut(): Promise<void> {
    await firebaseSignOut(auth);
    this.currentIdentity = {
      uid: '',
      email: null,
      isAuthenticated: false,
      role: 'UNAUTHENTICATED',
      institutionalId: null,
      claims: null,
      isAnonymous: false
    };
    this.notifyListeners();
  }

  /**
   * Registers an identity change observer
   */
  public onIdentityChanged(callback: (identity: TrustedIdentity) => void): () => void {
    this.listeners.push(callback);
    // Immediately invoke with current state
    callback(this.getIdentity());

    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notifyListeners(): void {
    const identity = this.getIdentity();
    this.listeners.forEach((cb) => {
      try {
        cb(identity);
      } catch (err) {
        console.error('TrustedAuthService: Observer error:', err);
      }
    });
  }

  /**
   * Architectural Constraint: Client cannot set custom claims.
   * This method explicitly documents and confirms that claim mutation on the client is impossible.
   */
  public isClientClaimAssignmentAllowed(): boolean {
    return false;
  }

  /**
   * Diagnostic reporter for system gates
   */
  public getAuthDiagnostics(): {
    authInitialized: boolean;
    hasCurrentUser: boolean;
    currentUid: string | null;
    currentEmail: string | null;
    role: string;
    institutionalId: string | null;
    hasClaims: boolean;
    clientClaimMutationBlocked: boolean;
  } {
    const user = auth.currentUser;
    return {
      authInitialized: Boolean(auth),
      hasCurrentUser: Boolean(user),
      currentUid: user?.uid || null,
      currentEmail: user?.email || null,
      role: this.currentIdentity.role,
      institutionalId: this.currentIdentity.institutionalId,
      hasClaims: Boolean(this.currentIdentity.claims),
      clientClaimMutationBlocked: true
    };
  }
}

export const trustedAuthService = new TrustedAuthService();
