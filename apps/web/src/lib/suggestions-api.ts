import { get, post, patch } from './api';
import type {
  Suggestion,
  CreateSuggestionPayload,
  RespondSuggestionPayload,
  SuggestionStatus,
  UpdateSuggestionStatusPayload,
} from '@/types/suggestion';

function qs(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(
    (e): e is [string, string] => e[1] !== undefined && e[1] !== '',
  );
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries).toString();
}

// ─── Suggestions ───────────────────────────

export function listMySuggestions() {
  return get<Suggestion[]>('/api/suggestions/my');
}

export function listAllSuggestions(opts?: { status?: SuggestionStatus }) {
  return get<Suggestion[]>(`/api/suggestions${qs({ status: opts?.status })}`);
}

export function getSuggestion(id: string) {
  return get<Suggestion>(`/api/suggestions/${id}`);
}

export function createSuggestion(payload: CreateSuggestionPayload) {
  return post<Suggestion>('/api/suggestions', payload);
}

export function respondToSuggestion(
  id: string,
  payload: RespondSuggestionPayload,
) {
  return patch<Suggestion>(`/api/suggestions/${id}/respond`, payload);
}

export function updateSuggestionStatus(
  id: string,
  payload: UpdateSuggestionStatusPayload,
) {
  return patch<Suggestion>(`/api/suggestions/${id}/status`, payload);
}
