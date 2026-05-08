import { get, post, patch, del } from './api';
import type {
  Task,
  CreateTaskPayload,
  UpdateTaskPayload,
  TaskStatus,
  TaskRoleFilter,
} from '@/types/task';

function qs(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(
    (e): e is [string, string] => e[1] !== undefined && e[1] !== '',
  );
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries).toString();
}

// ─── Tasks ─────────────────────────────────

export function listMyTasks(opts?: {
  status?: TaskStatus;
  role?: TaskRoleFilter;
}) {
  return get<Task[]>(
    `/api/tasks/my${qs({ status: opts?.status, role: opts?.role })}`,
  );
}

export function listAllTasks(opts?: {
  status?: TaskStatus;
  assigneeId?: string;
}) {
  return get<Task[]>(
    `/api/tasks${qs({ status: opts?.status, assigneeId: opts?.assigneeId })}`,
  );
}

export function getTask(id: string) {
  return get<Task>(`/api/tasks/${id}`);
}

export function createTask(payload: CreateTaskPayload) {
  return post<Task>('/api/tasks', payload);
}

export function updateTask(id: string, payload: UpdateTaskPayload) {
  return patch<Task>(`/api/tasks/${id}`, payload);
}

export function completeTask(id: string) {
  return patch<Task>(`/api/tasks/${id}/complete`);
}

export function deleteTask(id: string) {
  return del<void>(`/api/tasks/${id}`);
}
