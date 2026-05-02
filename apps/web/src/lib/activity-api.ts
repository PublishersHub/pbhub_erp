import { get } from './api';

export type ActivityVariant = 'leave' | 'expense' | 'onboarding' | 'recruitment' | 'payroll' | 'attendance';

export interface ActivityEvent {
  id: string;
  timestamp: string;
  type: string;
  title: string;
  subtitle?: string;
  href?: string;
  variant: ActivityVariant;
}

export interface ActivityPage {
  items: ActivityEvent[];
  nextCursor: string | null;
}

export function getActivity(params?: { limit?: number; before?: string }) {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.before) qs.set('before', params.before);
  const query = qs.toString();
  return get<ActivityPage>(`/api/activity${query ? '?' + query : ''}`);
}
