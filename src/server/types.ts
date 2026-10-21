import type {
  UserRole,
  NavigationTab,
  EventCategory,
  Announcement,
  ScheduleItem,
  DocumentItem,
  EventSection,
  LocationItem,
  PortalSettings,
  PortalData,
} from '../types/index';

export type {
  UserRole,
  NavigationTab,
  EventCategory,
  Announcement,
  ScheduleItem,
  DocumentItem,
  EventSection,
  LocationItem,
  PortalSettings,
  PortalData,
};

export interface AuthStore {
  isSetup: boolean;
  adminEmail: string;
  adminPasswordHash: string;
  adminPasswordSalt: string;
  teamPasscode: string;
  sessions: Record<string, { role: 'admin' | 'team'; email?: string; expiresAt: number }>;
}

export interface PortalStore extends PortalData {}
