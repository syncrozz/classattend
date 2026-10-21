import {
  AuthStatus,
  PortalData,
  PortalSettings,
  NavigationTab,
  Announcement,
  ScheduleItem,
  DocumentItem,
  EventSection,
  LocationItem,
  AIImageAnalysisResult,
} from '../types/index';

const TOKEN_KEY = 'kpmbp_hub_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // LocalStorage fallback
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `Request failed: ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson.error) {
        errorMessage = errorJson.error;
      }
    } catch {
      // Non-json response
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export const api = {
  // Authentication
  async getAuthStatus(): Promise<AuthStatus> {
    return request<AuthStatus>('/api/auth/status');
  },

  async adminLogin(password: string, email?: string): Promise<{ token: string; role: 'admin'; email: string }> {
    const res = await request<{ token: string; role: 'admin'; email: string }>('/api/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify({ password, email }),
    });
    setStoredToken(res.token);
    return res;
  },

  async firebaseAdminLogin(email: string): Promise<{ token: string; role: 'admin'; email: string }> {
    const res = await request<{ token: string; role: 'admin'; email: string }>('/api/auth/firebase-login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    setStoredToken(res.token);
    return res;
  },

  async teamLogin(passcode: string): Promise<{ token: string; role: 'team' }> {
    const res = await request<{ token: string; role: 'team' }>('/api/auth/team-login', {
      method: 'POST',
      body: JSON.stringify({ passcode }),
    });
    setStoredToken(res.token);
    return res;
  },

  async initialSetup(adminPassword: string, teamPasscode: string): Promise<{ token: string; role: 'admin' }> {
    const res = await request<{ token: string; role: 'admin' }>('/api/auth/setup', {
      method: 'POST',
      body: JSON.stringify({ adminPassword, teamPasscode }),
    });
    setStoredToken(res.token);
    return res;
  },

  async logout(): Promise<void> {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    } finally {
      setStoredToken(null);
    }
  },

  async updateCredentials(data: { currentPassword?: string; newPassword?: string; teamPasscode?: string }): Promise<{ success: boolean; message: string }> {
    return request('/api/auth/update-credentials', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Portal Data
  async getPortalData(): Promise<PortalData> {
    return request<PortalData>('/api/portal/data');
  },

  async updateSettings(settings: PortalSettings): Promise<PortalSettings> {
    return request<PortalSettings>('/api/portal/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  async updateActivePhase(activePhase: 'pre-final' | 'during-final'): Promise<{ activePhase: string }> {
    return request<{ activePhase: string }>('/api/portal/phase', {
      method: 'PUT',
      body: JSON.stringify({ activePhase }),
    });
  },

  async updateCategories(categories: any[]): Promise<any[]> {
    return request<any[]>('/api/portal/categories', {
      method: 'PUT',
      body: JSON.stringify({ categories }),
    });
  },

  // Direct Poster / Image Upload
  async uploadFile(file: File): Promise<{ url: string; fileName: string; size: number }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const fileData = reader.result as string;
          const res = await request<{ url: string; fileName: string; size: number }>('/api/upload', {
            method: 'POST',
            body: JSON.stringify({
              fileName: file.name,
              fileData,
              contentType: file.type,
            }),
          });
          resolve(res);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Gagal membaca fail imej'));
      reader.readAsDataURL(file);
    });
  },

  // AI-Assisted Image Analysis
  async analyseImageWithAI(
    fileOrData: File | string,
    fileName?: string,
    mimeType?: string
  ): Promise<AIImageAnalysisResult> {
    if (typeof fileOrData === 'string') {
      return request<AIImageAnalysisResult>('/api/ai/analyse-image', {
        method: 'POST',
        body: JSON.stringify({
          imageUrl: fileOrData.startsWith('/uploads/') ? fileOrData : undefined,
          fileData: !fileOrData.startsWith('/uploads/') ? fileOrData : undefined,
          fileName: fileName || 'poster.png',
          mimeType: mimeType || 'image/png',
        }),
      });
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const fileData = reader.result as string;
          const res = await request<AIImageAnalysisResult>('/api/ai/analyse-image', {
            method: 'POST',
            body: JSON.stringify({
              fileData,
              fileName: fileOrData.name,
              mimeType: fileOrData.type,
            }),
          });
          resolve(res);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Gagal membaca fail imej'));
      reader.readAsDataURL(fileOrData);
    });
  },

  async updateTabs(tabs: NavigationTab[]): Promise<NavigationTab[]> {
    return request<NavigationTab[]>('/api/portal/tabs', {
      method: 'PUT',
      body: JSON.stringify({ tabs }),
    });
  },

  // Announcements
  async saveAnnouncement(announcement: Partial<Announcement>): Promise<Announcement> {
    if (announcement.id) {
      return request<Announcement>(`/api/portal/announcements/${announcement.id}`, {
        method: 'PUT',
        body: JSON.stringify(announcement),
      });
    } else {
      return request<Announcement>('/api/portal/announcements', {
        method: 'POST',
        body: JSON.stringify(announcement),
      });
    }
  },

  async saveBatchAnnouncements(items: Partial<Announcement>[]): Promise<{ success: boolean; count: number; items: Announcement[] }> {
    return request<{ success: boolean; count: number; items: Announcement[] }>('/api/portal/announcements/batch', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  },

  async supersedeAnnouncement(id: string, isSuperseded: boolean, supersededReason?: string): Promise<Announcement> {
    return request<Announcement>(`/api/portal/announcements/${id}/supersede`, {
      method: 'PUT',
      body: JSON.stringify({ isSuperseded, supersededReason }),
    });
  },

  async deleteAnnouncement(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/portal/announcements/${id}`, {
      method: 'DELETE',
    });
  },

  // Schedules
  async saveSchedule(schedule: Partial<ScheduleItem>): Promise<ScheduleItem> {
    if (schedule.id) {
      return request<ScheduleItem>(`/api/portal/schedules/${schedule.id}`, {
        method: 'PUT',
        body: JSON.stringify(schedule),
      });
    } else {
      return request<ScheduleItem>('/api/portal/schedules', {
        method: 'POST',
        body: JSON.stringify(schedule),
      });
    }
  },

  async deleteSchedule(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/portal/schedules/${id}`, {
      method: 'DELETE',
    });
  },

  // Documents
  async saveDocument(doc: Partial<DocumentItem>): Promise<DocumentItem> {
    if (doc.id) {
      return request<DocumentItem>(`/api/portal/documents/${doc.id}`, {
        method: 'PUT',
        body: JSON.stringify(doc),
      });
    } else {
      return request<DocumentItem>('/api/portal/documents', {
        method: 'POST',
        body: JSON.stringify(doc),
      });
    }
  },

  async deleteDocument(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/portal/documents/${id}`, {
      method: 'DELETE',
    });
  },

  // Event Info Sections
  async saveEventSection(section: Partial<EventSection>): Promise<EventSection> {
    if (section.id) {
      return request<EventSection>(`/api/portal/event-info/${section.id}`, {
        method: 'PUT',
        body: JSON.stringify(section),
      });
    } else {
      return request<EventSection>('/api/portal/event-info', {
        method: 'POST',
        body: JSON.stringify(section),
      });
    }
  },

  async deleteEventSection(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/portal/event-info/${id}`, {
      method: 'DELETE',
    });
  },

  // Locations
  async saveLocation(location: Partial<LocationItem>): Promise<LocationItem> {
    if (location.id) {
      return request<LocationItem>(`/api/portal/locations/${location.id}`, {
        method: 'PUT',
        body: JSON.stringify(location),
      });
    } else {
      return request<LocationItem>('/api/portal/locations', {
        method: 'POST',
        body: JSON.stringify(location),
      });
    }
  },

  async deleteLocation(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/portal/locations/${id}`, {
      method: 'DELETE',
    });
  },

  // Custom tab content
  async saveCustomTabContent(tabId: string, content: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/portal/custom-tab/${tabId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  },

  // System status & migration diagnostics
  async getSystemStatus(): Promise<any> {
    return request<any>('/api/admin/system-status');
  },

  async migrateData(dryRun: boolean = false, forceOverwrite: boolean = false): Promise<any> {
    return request<any>('/api/admin/migrate-data', {
      method: 'POST',
      body: JSON.stringify({ dryRun, forceOverwrite }),
    });
  },
};

