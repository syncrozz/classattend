import { Lecturer, UserRole, TrustedSession, AccessState } from '../types';
import { attendanceEngine } from './attendanceEngine';

const TRUSTED_ACCESS_STORAGE_KEY = 'syncrozz_trusted_access_v1';
const ONBOARDED_LECTURERS_KEY = 'syncrozz_onboarded_lecturers_v1';
const SESSION_DURATION_MS = 14 * 24 * 60 * 60 * 1000; // 14 days of trusted access

/**
 * Access Manager Service
 * Manages trusted session persistence, access states, and role isolation
 * without storing plaintext PINs or sensitive secrets.
 */
class AccessManager {
  /**
   * Evaluates current access state from stored trusted session
   */
  public getAccessState(lecturersList?: Lecturer[]): {
    state: AccessState;
    session: TrustedSession | null;
    lecturer: Lecturer | null;
    role: UserRole;
  } {
    const list = lecturersList || attendanceEngine.getLecturers();
    try {
      const raw = localStorage.getItem(TRUSTED_ACCESS_STORAGE_KEY);
      if (!raw) {
        return { state: 'ACCESS_REQUIRED', session: null, lecturer: null, role: 'ADMIN' };
      }

      const session: TrustedSession = JSON.parse(raw);
      const now = Date.now();

      // 1. Check expiration
      if (!session.expiresAt || now > session.expiresAt) {
        this.clearTrustedAccess();
        return { state: 'ACCESS_EXPIRED', session: null, lecturer: null, role: 'ADMIN' };
      }

      // 2. If Admin type
      if (session.type === 'ADMIN' && session.role === 'ADMIN') {
        const matchingAdmin = list.find((l) => l.role === 'ADMIN' || l.id === session.lecturerId) || {
          id: session.lecturerId || 'ADMIN-MASTER',
          name: session.name || 'PENTADBIR SISTEM (ADMIN)',
          email: session.email || 'admin@bpenawar.kpm.edu.my',
          icNumber: '******-**-5313',
          pin: '5313',
          department: 'Pentadbiran Kolej',
          role: 'ADMIN' as const,
          status: 'ACTIVE' as const,
          assignedClasses: ['DIA_4A', 'DIA_4B'],
          assignedSubjects: ['ALL']
        };

        return {
          state: 'ACCESS_GRANTED',
          session,
          lecturer: matchingAdmin,
          role: 'ADMIN'
        };
      }

      // 3. If Lecturer type, verify lecturer exists in active state in authoritative data
      if (session.type === 'LECTURER') {
        const cleanEmail = (session.email || '').trim().toLowerCase();
        const foundLecturer = list.find(
          (l) => l.id === session.lecturerId || l.email.toLowerCase() === cleanEmail
        );

        if (!foundLecturer) {
          // Lecturer was deleted or not found
          this.clearTrustedAccess();
          return { state: 'ACCESS_EXPIRED', session: null, lecturer: null, role: 'LECTURER' };
        }

        // Check if status is still active
        if (foundLecturer.status === 'PENDING' || foundLecturer.status === 'REJECTED') {
          this.clearTrustedAccess();
          return { state: 'ACCESS_EXPIRED', session: null, lecturer: null, role: 'LECTURER' };
        }

        return {
          state: 'ACCESS_GRANTED',
          session,
          lecturer: foundLecturer,
          role: 'LECTURER'
        };
      }

      // Unknown type
      this.clearTrustedAccess();
      return { state: 'ACCESS_EXPIRED', session: null, lecturer: null, role: 'ADMIN' };
    } catch (e) {
      console.warn('Error reading trusted access:', e);
      this.clearTrustedAccess();
      return { state: 'ACCESS_REQUIRED', session: null, lecturer: null, role: 'ADMIN' };
    }
  }

  /**
   * Creates a trusted session for an authenticated lecturer or admin
   */
  public createTrustedSession(
    lecturer: Lecturer,
    type: 'ADMIN' | 'LECTURER'
  ): TrustedSession {
    const now = Date.now();
    const token = `tok_${type.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const session: TrustedSession = {
      type,
      lecturerId: lecturer.id,
      email: lecturer.email,
      name: lecturer.name,
      role: type === 'ADMIN' ? 'ADMIN' : 'LECTURER',
      token,
      issuedAt: now,
      expiresAt: now + SESSION_DURATION_MS
    };

    localStorage.setItem(TRUSTED_ACCESS_STORAGE_KEY, JSON.stringify(session));
    return session;
  }

  /**
   * Clears trusted access on manual lock or logout
   */
  public clearTrustedAccess(): void {
    localStorage.removeItem(TRUSTED_ACCESS_STORAGE_KEY);
  }

  /**
   * Check if a lecturer is entering the workspace for the very first time
   */
  public isFirstTimeLecturer(lecturerId: string): boolean {
    try {
      const raw = localStorage.getItem(ONBOARDED_LECTURERS_KEY);
      if (!raw) return true;
      const list: string[] = JSON.parse(raw);
      return !list.includes(lecturerId);
    } catch {
      return true;
    }
  }

  /**
   * Mark that a lecturer has completed/seen their first-time onboarding
   */
  public markLecturerOnboarded(lecturerId: string): void {
    try {
      const raw = localStorage.getItem(ONBOARDED_LECTURERS_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (!list.includes(lecturerId)) {
        list.push(lecturerId);
        localStorage.setItem(ONBOARDED_LECTURERS_KEY, JSON.stringify(list));
      }
    } catch (e) {
      console.warn('Error saving onboarded lecturer:', e);
    }
  }
}

export const accessManager = new AccessManager();
