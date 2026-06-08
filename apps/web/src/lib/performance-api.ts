import { get, post, patch, del } from './api';
import type {
  PerformanceCycle,
  CreateCyclePayload,
  UpdateCyclePayload,
  TransitionCyclePayload,
  Goal,
  CreateGoalPayload,
  UpdateGoalPayload,
  ApproveGoalPayload,
  UpdateGoalProgressPayload,
  GoalProgressUpdate,
  PerformanceReview,
  SubmitSelfReviewPayload,
  SubmitManagerReviewPayload,
  CalibrateReviewPayload,
  PerformanceNote,
  CreatePerformanceNotePayload,
  UpdatePerformanceNotePayload,
} from '@/types/performance';

function qs(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(
    (e): e is [string, string] => e[1] !== undefined && e[1] !== '',
  );
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries).toString();
}

// ─── Performance Cycles ─────────────────────

export function listPerformanceCycles() {
  return get<PerformanceCycle[]>('/api/performance-cycles');
}

export function getPerformanceCycle(id: string) {
  return get<PerformanceCycle>(`/api/performance-cycles/${id}`);
}

export function createPerformanceCycle(payload: CreateCyclePayload) {
  return post<PerformanceCycle>('/api/performance-cycles', payload);
}

export function updatePerformanceCycle(id: string, payload: UpdateCyclePayload) {
  return patch<PerformanceCycle>(`/api/performance-cycles/${id}`, payload);
}

export function transitionCycle(id: string, payload: TransitionCyclePayload) {
  return patch<PerformanceCycle>(`/api/performance-cycles/${id}/transition`, payload);
}

// ─── Goals ──────────────────────────────────

export function createGoal(payload: CreateGoalPayload) {
  return post<Goal>('/api/goals', payload);
}

export function getMyGoals(cycleId?: string) {
  return get<Goal[]>(`/api/goals/my${qs({ cycleId })}`);
}

export function getTeamGoals(cycleId?: string) {
  return get<Goal[]>(`/api/goals/team${qs({ cycleId })}`);
}

export function getAllGoals(cycleId?: string, employeeId?: string) {
  return get<Goal[]>(`/api/goals${qs({ cycleId, employeeId })}`);
}

export function getGoal(id: string) {
  return get<Goal>(`/api/goals/${id}`);
}

export function updateGoal(id: string, payload: UpdateGoalPayload) {
  return patch<Goal>(`/api/goals/${id}`, payload);
}

export function submitGoal(id: string) {
  return patch<Goal>(`/api/goals/${id}/submit`, {});
}

export function approveGoal(id: string, payload: ApproveGoalPayload) {
  return patch<Goal>(`/api/goals/${id}/approve`, payload);
}

export function deactivateGoal(id: string) {
  return del<Goal>(`/api/goals/${id}`);
}

export function addGoalProgress(id: string, payload: UpdateGoalProgressPayload) {
  return post<GoalProgressUpdate>(`/api/goals/${id}/progress`, payload);
}

export function getGoalProgress(id: string) {
  return get<GoalProgressUpdate[]>(`/api/goals/${id}/progress`);
}

// ─── Performance Reviews ────────────────────

export function getMyReview(cycleId: string) {
  return get<PerformanceReview>(`/api/performance-reviews/my/${cycleId}`);
}

export function getTeamReviews(cycleId?: string) {
  return get<PerformanceReview[]>(`/api/performance-reviews/team${qs({ cycleId })}`);
}

export function getAllReviews(cycleId?: string, employeeId?: string) {
  return get<PerformanceReview[]>(`/api/performance-reviews${qs({ cycleId, employeeId })}`);
}

export function getReview(id: string) {
  return get<PerformanceReview>(`/api/performance-reviews/${id}`);
}

export function submitSelfReview(id: string, payload: SubmitSelfReviewPayload) {
  return patch<PerformanceReview>(`/api/performance-reviews/${id}/self-review`, payload);
}

export function submitManagerReview(id: string, payload: SubmitManagerReviewPayload) {
  return patch<PerformanceReview>(`/api/performance-reviews/${id}/manager-review`, payload);
}

export function calibrateReview(id: string, payload: CalibrateReviewPayload) {
  return patch<PerformanceReview>(`/api/performance-reviews/${id}/calibrate`, payload);
}

// ─── Performance Notes ──────────────────────

export function listPerformanceNotes(employeeId: string) {
  return get<PerformanceNote[]>(`/api/performance/employees/${employeeId}/notes`);
}

export function createPerformanceNote(
  employeeId: string,
  payload: CreatePerformanceNotePayload,
) {
  return post<PerformanceNote>(`/api/performance/employees/${employeeId}/notes`, payload);
}

export function updatePerformanceNote(
  noteId: string,
  payload: UpdatePerformanceNotePayload,
) {
  return patch<PerformanceNote>(`/api/performance/notes/${noteId}`, payload);
}

export function deletePerformanceNote(noteId: string) {
  return del<{ success: boolean }>(`/api/performance/notes/${noteId}`);
}
