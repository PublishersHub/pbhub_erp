// ─── Enums ───────────────────────────────────

export type PerformanceCycleStatus =
  | 'DRAFT'
  | 'GOAL_SETTING'
  | 'ACTIVE'
  | 'SELF_REVIEW'
  | 'MANAGER_REVIEW'
  | 'CALIBRATION'
  | 'CLOSED';

export type GoalStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
export type GoalMeasurementType = 'PERCENTAGE' | 'NUMERIC' | 'QUALITATIVE';

export type ReviewStatus =
  | 'NOT_STARTED'
  | 'SELF_REVIEW_IN_PROGRESS'
  | 'SELF_REVIEW_SUBMITTED'
  | 'MANAGER_REVIEW_IN_PROGRESS'
  | 'MANAGER_REVIEW_SUBMITTED'
  | 'COMPLETED';

// ─── Embedded refs ──────────────────────────

export interface EmployeeRef {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode?: string;
  reportingManagerId?: string | null;
}

// ─── Performance Cycle ──────────────────────

export interface PerformanceCycle {
  id: string;
  organizationId: string;
  name: string;
  year: number;
  quarter: number;
  startDate: string;
  endDate: string;
  goalSettingDeadline: string | null;
  selfReviewDeadline: string | null;
  managerReviewDeadline: string | null;
  status: PerformanceCycleStatus;
  createdAt: string;
  updatedAt: string;
}

// ─── Goal ───────────────────────────────────

export interface GoalProgressUpdate {
  id: string;
  goalId: string;
  updatedByEmployeeId: string;
  value: string | null;
  note: string | null;
  createdAt: string;
  updatedByEmployee?: EmployeeRef;
}

export interface Goal {
  id: string;
  organizationId: string;
  cycleId: string;
  employeeId: string;
  createdByEmployeeId: string;
  title: string;
  description: string | null;
  measurementType: GoalMeasurementType;
  targetValue: string | null;
  currentValue: string;
  weight: string;
  status: GoalStatus;
  isActive: boolean;
  approvedByEmployeeId: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: EmployeeRef;
  cycle?: {
    id: string;
    name: string;
    year?: number;
    quarter?: number;
    status?: PerformanceCycleStatus;
  };
  createdByEmployee?: EmployeeRef;
  approvedByEmployee?: EmployeeRef | null;
  progressUpdates?: GoalProgressUpdate[];
}

// ─── Goal Review (per-goal within a review) ─

export interface GoalReview {
  id: string;
  reviewId: string;
  goalId: string;
  selfRating: string | null;
  selfComment: string | null;
  managerRating: string | null;
  managerComment: string | null;
  createdAt: string;
  updatedAt: string;
  goal?: {
    id: string;
    title: string;
    description: string | null;
    measurementType: GoalMeasurementType;
    targetValue: string | null;
    currentValue: string;
    weight: string;
  };
}

// ─── Performance Review ─────────────────────

export interface PerformanceReview {
  id: string;
  organizationId: string;
  cycleId: string;
  employeeId: string;
  reviewerEmployeeId: string | null;
  status: ReviewStatus;
  selfComment: string | null;
  selfRating: string | null;
  selfSubmittedAt: string | null;
  managerComment: string | null;
  managerRating: string | null;
  managerSubmittedAt: string | null;
  finalRating: string | null;
  calibrationComment: string | null;
  calibratedByEmployeeId: string | null;
  calibratedAt: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: EmployeeRef;
  cycle?: {
    id: string;
    name: string;
    year: number;
    quarter: number;
    status: PerformanceCycleStatus;
  };
  reviewerEmployee?: EmployeeRef | null;
  calibratedByEmployee?: EmployeeRef | null;
  goalReviews?: GoalReview[];
}

// ─── Payloads ───────────────────────────────

export interface CreateCyclePayload {
  name: string;
  year: number;
  quarter: number;
  startDate: string;
  endDate: string;
  goalSettingDeadline?: string;
  selfReviewDeadline?: string;
  managerReviewDeadline?: string;
}

export interface UpdateCyclePayload {
  name?: string;
  year?: number;
  quarter?: number;
  startDate?: string;
  endDate?: string;
  goalSettingDeadline?: string;
  selfReviewDeadline?: string;
  managerReviewDeadline?: string;
}

export interface TransitionCyclePayload {
  status: PerformanceCycleStatus;
}

export interface CreateGoalPayload {
  cycleId: string;
  employeeId?: string;
  title: string;
  description?: string;
  measurementType: GoalMeasurementType;
  targetValue?: number;
  weight: number;
}

export interface UpdateGoalPayload {
  title?: string;
  description?: string;
  measurementType?: GoalMeasurementType;
  targetValue?: number;
  weight?: number;
}

export interface ApproveGoalPayload {
  action: 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
}

export interface UpdateGoalProgressPayload {
  value?: number;
  note?: string;
}

export interface GoalReviewPayload {
  goalId: string;
  selfRating?: number;
  selfComment?: string;
  managerRating?: number;
  managerComment?: string;
}

export interface SubmitSelfReviewPayload {
  selfComment?: string;
  selfRating?: number;
  goalReviews?: { goalId: string; selfRating?: number; selfComment?: string }[];
  isDraft: boolean;
}

export interface SubmitManagerReviewPayload {
  managerComment?: string;
  managerRating?: number;
  goalReviews?: { goalId: string; managerRating?: number; managerComment?: string }[];
  isDraft: boolean;
}

export interface CalibrateReviewPayload {
  finalRating: number;
  calibrationComment?: string;
}

// ─── Performance notes ──────────────────────

export interface PerformanceNote {
  id: string;
  organizationId: string;
  employeeId: string;
  authorId: string;
  body: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  author?: EmployeeRef;
}

export interface CreatePerformanceNotePayload {
  body: string;
  isPrivate?: boolean;
}

export interface UpdatePerformanceNotePayload {
  body?: string;
  isPrivate?: boolean;
}
