export type UserRole = 'admin' | 'team';

export interface UserSession {
  role: UserRole;
  email?: string;
  token: string;
  expiresAt: number;
}

export interface AuthStatus {
  isSetup: boolean;
  adminEmail: string;
  isAuthenticated: boolean;
  role: UserRole | null;
  email?: string;
}

export interface NavigationTab {
  id: string;
  label: string;
  order: number;
  visible: boolean;
  isSystem?: boolean;
  description?: string;
}

export type OperationalPhase = 'all' | 'pre-final' | 'during-final';
export type ContentStatus = 'published' | 'draft';
export type AnnouncementPriority = 'urgent' | 'important' | 'general';

export interface EventCategory {
  id: string;
  name: string;
  shortCode?: string;
  description?: string;
  managerName?: string;
  managerPhone?: string;
  order: number;
  visible: boolean;
}

export interface AIImageAnalysisResult {
  suggestedCategory: string;
  suggestedTitle: string;
  suggestedDescription: string;
  relevantEvent?: string | null;
  suggestedTags: string[];
  extractedDatesAndInstructions?: string;
  verificationRequired: boolean;
  serviceUnavailable?: boolean;
  message?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string; // Original Telegram message content
  priority: AnnouncementPriority;
  isPinned: boolean;
  category: string; // e.g. 'symphonic-duo', 'tarian-zapin', 'general', etc.
  phase: OperationalPhase; // 'all' | 'pre-final' | 'during-final'
  status: ContentStatus; // 'published' | 'draft'
  author: string;
  timestamp: string;
  imageUrl?: string; // Direct uploaded poster or image URL
  imageCaption?: string;
  externalUrl?: string; // Optional link to Telegram post or Drive doc
  externalUrlLabel?: string;
  telegramRawText?: string;
  tags?: string[];
  isSuperseded?: boolean; // When newer circular replaces older version
  supersededReason?: string;
  collectionId?: string; // For grouping multi-page document posters
  collectionName?: string;
  collectionIndex?: number;
  importantDates?: string;
  verificationRequired?: boolean;
  lastUpdated?: string;
}

export interface BatchUploadItem {
  tempId: string;
  file: File;
  previewUrl: string;
  uploadedUrl?: string;
  title: string;
  description: string;
  category: string;
  phase: OperationalPhase;
  priority: AnnouncementPriority;
  tags: string[];
  status: ContentStatus;
  isPinned: boolean;
  collectionId?: string;
  collectionName?: string;
  collectionIndex?: number;
  importantDates?: string;
  verificationRequired?: boolean;
  aiAnalyzing: boolean;
  aiSuggested?: AIImageAnalysisResult;
  aiAccepted: boolean;
  selectedForAction: boolean;
}

export interface ScheduleItem {
  id: string;
  categoryName: string;
  subcategory?: string;
  date: string;
  time?: string;
  venue: string;
  imageUrl?: string;
  sourceDocUrl?: string;
  notes?: string;
  phase?: OperationalPhase;
  status?: ContentStatus;
  performanceOrder?: string; // e.g. "Giliran ke-4"
  order: number;
  lastUpdated: string;
}

export type DocumentType = 'drive' | 'pdf' | 'sheet' | 'doc' | 'link';

export interface DocumentItem {
  id: string;
  title: string;
  category: string;
  description?: string;
  fileUrl: string;
  fileType: DocumentType;
  phase?: OperationalPhase;
  status?: ContentStatus;
  order: number;
  isPinned?: boolean;
  lastUpdated: string;
}

export type EventSectionType = 'rundown' | 'rules' | 'criteria' | 'contacts' | 'text';

export interface EventSectionItem {
  id: string;
  title: string;
  subtitle?: string;
  detail?: string;
  date?: string;
  time?: string;
  badge?: string;
  contactNumber?: string;
}

export interface EventSection {
  id: string;
  title: string;
  category: string;
  type: EventSectionType;
  description?: string;
  phase?: OperationalPhase;
  status?: ContentStatus;
  items: EventSectionItem[];
  rawContent?: string;
  order: number;
}

export type LocationCategory = 'venue' | 'transport' | 'accommodation' | 'assembly';

export interface LocationItem {
  id: string;
  name: string;
  category: LocationCategory;
  address?: string;
  mapUrl?: string;
  coordinates?: string;
  scheduleTimes?: string;
  routeDetails?: string;
  notes?: string;
  floorplanUrl?: string;
  contactPerson?: string;
  contactPhone?: string;
  phase?: OperationalPhase;
  status?: ContentStatus;
  order: number;
}

export interface PortalSettings {
  eventTitle: string;
  eventSubtitle: string;
  contingentName: string;
  motto: string;
  secretariatLocation: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  allowPublicGuestView?: boolean;
  activePhase: 'pre-final' | 'during-final';
  phaseAName?: string;
  phaseADescription?: string;
  phaseBName?: string;
  phaseBDescription?: string;
  phaseDates?: string;
  customSubheaders?: Record<string, string>;
}

export interface PortalData {
  tabs: NavigationTab[];
  settings: PortalSettings;
  categories: EventCategory[];
  announcements: Announcement[];
  schedules: ScheduleItem[];
  documents: DocumentItem[];
  eventSections: EventSection[];
  locations: LocationItem[];
  customTabsContent: Record<string, string>;
}
