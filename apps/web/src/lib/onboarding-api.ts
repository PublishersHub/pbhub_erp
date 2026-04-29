import { get, post, patch, del } from './api';
import type {
  OnboardingTemplate,
  OnboardingTemplateTask,
  CreateTemplatePayload,
  CreateTemplateTaskPayload,
  UpdateTemplateTaskPayload,
  ReorderTemplateTasksPayload,
  OnboardingInstance,
  CreateInstancePayload,
  CancelInstancePayload,
  OnboardingTask,
  UpdateTaskStatusPayload,
  ReassignTaskPayload,
  OnboardingTaskDocument,
  UploadTaskDocumentPayload,
  InstanceFilters,
} from '@/types/onboarding';

function qs(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(
    (e): e is [string, string] => e[1] !== undefined && e[1] !== '',
  );
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries).toString();
}

// ─── Templates ──────────────────────────────

export function listTemplates() {
  return get<OnboardingTemplate[]>('/api/onboarding-templates');
}

export function getTemplate(id: string) {
  return get<OnboardingTemplate>(`/api/onboarding-templates/${id}`);
}

export function createTemplate(payload: CreateTemplatePayload) {
  return post<OnboardingTemplate>('/api/onboarding-templates', payload);
}

export function updateTemplate(id: string, payload: Partial<CreateTemplatePayload>) {
  return patch<OnboardingTemplate>(`/api/onboarding-templates/${id}`, payload);
}

export function addTemplateTask(templateId: string, payload: CreateTemplateTaskPayload) {
  return post<OnboardingTemplateTask>(`/api/onboarding-templates/${templateId}/tasks`, payload);
}

export function updateTemplateTask(templateId: string, taskId: string, payload: UpdateTemplateTaskPayload) {
  return patch<OnboardingTemplateTask>(`/api/onboarding-templates/${templateId}/tasks/${taskId}`, payload);
}

export function removeTemplateTask(templateId: string, taskId: string) {
  return del<OnboardingTemplateTask>(`/api/onboarding-templates/${templateId}/tasks/${taskId}`);
}

export function reorderTemplateTasks(templateId: string, payload: ReorderTemplateTasksPayload) {
  return post<OnboardingTemplateTask[]>(`/api/onboarding-templates/${templateId}/tasks/reorder`, payload);
}

// ─── Instances ──────────────────────────────

export function listInstances(filters?: InstanceFilters) {
  return get<OnboardingInstance[]>(
    `/api/onboarding-instances${qs({ status: filters?.status, employeeId: filters?.employeeId })}`,
  );
}

export function getInstance(id: string) {
  return get<OnboardingInstance>(`/api/onboarding-instances/${id}`);
}

export function getMyInstance() {
  return get<OnboardingInstance>('/api/onboarding-instances/my');
}

export function createInstance(payload: CreateInstancePayload) {
  return post<OnboardingInstance>('/api/onboarding-instances', payload);
}

export function cancelInstance(id: string, payload?: CancelInstancePayload) {
  return patch<OnboardingInstance>(`/api/onboarding-instances/${id}/cancel`, payload);
}

// ─── Tasks ──────────────────────────────────

export function getMyTasks() {
  return get<OnboardingTask[]>('/api/onboarding-tasks/my');
}

export function updateTaskStatus(id: string, payload: UpdateTaskStatusPayload) {
  return patch<OnboardingTask>(`/api/onboarding-tasks/${id}/status`, payload);
}

export function reassignTask(id: string, payload: ReassignTaskPayload) {
  return patch<OnboardingTask>(`/api/onboarding-tasks/${id}/assignee`, payload);
}

export function uploadTaskDocument(id: string, payload: UploadTaskDocumentPayload) {
  return post<OnboardingTaskDocument>(`/api/onboarding-tasks/${id}/documents`, payload);
}

export function listTaskDocuments(id: string) {
  return get<OnboardingTaskDocument[]>(`/api/onboarding-tasks/${id}/documents`);
}

export function removeTaskDocument(taskId: string, docId: string) {
  return del<OnboardingTaskDocument>(`/api/onboarding-tasks/${taskId}/documents/${docId}`);
}
