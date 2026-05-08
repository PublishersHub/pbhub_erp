// ─── Enums ───────────────────────────────────

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

// ─── Embedded refs ──────────────────────────

export interface TaskEmployeeRef {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  userId: string | null;
}

// ─── Task ────────────────────────────────────

export interface Task {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  assigneeId: string;
  assignedById: string;
  dueDate: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignee?: TaskEmployeeRef;
  assignedBy?: TaskEmployeeRef;
}

// ─── Payloads ───────────────────────────────

export interface CreateTaskPayload {
  title: string;
  description?: string;
  assigneeId: string;
  dueDate?: string;
  priority?: TaskPriority;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  assigneeId?: string;
  dueDate?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
}

// ─── Filter types ───────────────────────────

export type TaskRoleFilter = 'assignee' | 'creator';
