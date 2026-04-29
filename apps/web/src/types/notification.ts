// ─── Enums ───────────────────────────────────

export type NotificationChannel = 'IN_APP' | 'EMAIL';

// ─── Notification ────────────────────────────

export interface Notification {
  id: string;
  organizationId: string;
  recipientUserId: string;
  eventType: string;
  title: string;
  body: string;
  referenceId: string | null;
  referenceType: string | null;
  isRead: boolean;
  readAt: string | null;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
}

// ─── Notification Preference ─────────────────

export interface NotificationPreference {
  id: string;
  userId: string;
  eventType: string;
  channel: NotificationChannel;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePreferenceItem {
  eventType: string;
  channel: NotificationChannel;
  enabled: boolean;
}

export interface UpdatePreferencesPayload {
  preferences: UpdatePreferenceItem[];
}

// ─── Query helpers ───────────────────────────

export interface NotificationFilters {
  unread?: boolean;
  archived?: boolean;
}
