import { get, patch } from './api';
import type {
  Notification,
  NotificationPreference,
  NotificationFilters,
  UpdatePreferencesPayload,
} from '@/types/notification';

function qs(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(
    (e): e is [string, string] => e[1] !== undefined && e[1] !== '',
  );
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries).toString();
}

// ─── Notifications ──────────────────────────

export function listNotifications(filters?: NotificationFilters) {
  return get<Notification[]>(
    `/api/notifications${qs({
      unread: filters?.unread ? 'true' : undefined,
      archived: filters?.archived ? 'true' : undefined,
    })}`,
  );
}

export function getUnreadCount() {
  return get<{ count: number }>('/api/notifications/unread-count');
}

export function markRead(id: string) {
  return patch<Notification>(`/api/notifications/${id}/read`);
}

export function markAllRead() {
  return patch<{ updated: number }>('/api/notifications/read-all');
}

export function archiveNotification(id: string) {
  return patch<Notification>(`/api/notifications/${id}/archive`);
}

// ─── Preferences ────────────────────────────

export function listPreferences() {
  return get<NotificationPreference[]>('/api/notifications/preferences');
}

export function updatePreferences(payload: UpdatePreferencesPayload) {
  return patch<NotificationPreference[]>('/api/notifications/preferences', payload);
}
