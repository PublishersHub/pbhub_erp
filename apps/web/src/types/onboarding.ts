// ─── Enums ───────────────────────────────────

export type OnboardingInstanceStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type OnboardingTaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED';
export type OnboardingTaskAssigneeRole = 'NEW_HIRE' | 'MANAGER' | 'HR' | 'IT' | 'CUSTOM';

// ─── Embedded refs ──────────────────────────

export interface EmployeeRef {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode?: string;
  reportingManagerId?: string | null;
}

// ─── Template ───────────────────────────────

export interface OnboardingTemplateTask {
  id: string;
  templateId: string;
  title: string;
  description: string | null;
  assigneeRole: OnboardingTaskAssigneeRole;
  offsetDays: number;
  sortOrder: number;
  isRequired: boolean;
  allowDocument: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingTemplate {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  tasks?: OnboardingTemplateTask[];
  _count?: { tasks?: number; instances?: number };
}

export interface CreateTemplatePayload {
  name: string;
  description?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface CreateTemplateTaskPayload {
  title: string;
  description?: string;
  assigneeRole: Exclude<OnboardingTaskAssigneeRole, 'CUSTOM'>;
  offsetDays: number;
  sortOrder: number;
  isRequired?: boolean;
  allowDocument?: boolean;
}

export interface UpdateTemplateTaskPayload {
  title?: string;
  description?: string;
  assigneeRole?: Exclude<OnboardingTaskAssigneeRole, 'CUSTOM'>;
  offsetDays?: number;
  isRequired?: boolean;
  allowDocument?: boolean;
}

export interface ReorderTemplateTasksPayload {
  order: { taskId: string; sortOrder: number }[];
}

// ─── Instance ───────────────────────────────

export interface OnboardingTaskDocument {
  id: string;
  onboardingTaskId: string;
  fileUrl: string;
  fileName: string;
  uploadedByUserId: string | null;
  createdAt: string;
}

export interface OnboardingTask {
  id: string;
  onboardingInstanceId: string;
  templateTaskId: string | null;
  title: string;
  description: string | null;
  assigneeRole: OnboardingTaskAssigneeRole;
  assigneeEmployeeId: string | null;
  sortOrder: number;
  isRequired: boolean;
  allowDocument: boolean;
  dueDate: string;
  status: OnboardingTaskStatus;
  startedAt: string | null;
  completedAt: string | null;
  completedByUserId: string | null;
  blockedReason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  assigneeEmployee?: EmployeeRef | null;
  documents?: OnboardingTaskDocument[];
  isOverdue?: boolean;
  onboardingInstance?: OnboardingInstance;
}

export interface OnboardingInstance {
  id: string;
  organizationId: string;
  employeeId: string;
  templateId: string | null;
  templateName: string;
  joiningDate: string;
  status: OnboardingInstanceStatus;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: EmployeeRef;
  template?: { id: string; name: string; isActive: boolean } | null;
  tasks?: OnboardingTask[];
  _count?: { tasks?: number };
}

export interface CreateInstancePayload {
  employeeId: string;
  joiningDate: string;
  templateId?: string;
}

export interface CancelInstancePayload {
  cancelReason?: string;
}

export interface UpdateTaskStatusPayload {
  status: OnboardingTaskStatus;
  blockedReason?: string;
  notes?: string;
}

export interface ReassignTaskPayload {
  assigneeEmployeeId: string;
}

export interface UploadTaskDocumentPayload {
  fileUrl: string;
  fileName: string;
}

// ─── Query params ───────────────────────────

export interface InstanceFilters {
  status?: OnboardingInstanceStatus;
  employeeId?: string;
}
