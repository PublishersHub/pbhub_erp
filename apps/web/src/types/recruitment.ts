// ─── Enums ───────────────────────────────────

export type RequisitionStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'OPEN'
  | 'ON_HOLD'
  | 'FILLED'
  | 'CANCELLED'
  | 'CLOSED';

export type ApplicationStatus =
  | 'APPLIED'
  | 'IN_PROGRESS'
  | 'OFFER_EXTENDED'
  | 'HIRED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'ON_HOLD';

export type ApplicationRejectionReason =
  | 'NOT_QUALIFIED'
  | 'FAILED_INTERVIEW'
  | 'FAILED_ASSESSMENT'
  | 'CULTURAL_FIT'
  | 'COMPENSATION_MISMATCH'
  | 'POSITION_FILLED'
  | 'DUPLICATE'
  | 'OTHER';

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';

export type CandidateSource =
  | 'CAREERS_PAGE'
  | 'LINKEDIN'
  | 'INDEED'
  | 'REFERRAL'
  | 'AGENCY'
  | 'DIRECT_OUTREACH'
  | 'WALK_IN'
  | 'OTHER';

export type JobPostingStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';
export type JobPostingChannel = 'INTERNAL' | 'CAREERS_PAGE' | 'LINKEDIN' | 'INDEED' | 'REFERRAL' | 'OTHER';

export type InterviewType =
  | 'PHONE_SCREEN' | 'TECHNICAL' | 'BEHAVIORAL' | 'PANEL'
  | 'SYSTEM_DESIGN' | 'HIRING_MANAGER' | 'HR_ROUND' | 'FINAL' | 'OTHER';

export type InterviewMode = 'IN_PERSON' | 'VIDEO' | 'PHONE';

export type InterviewStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'RESCHEDULED';

export type InterviewRecommendation =
  | 'STRONG_HIRE' | 'HIRE' | 'NO_HIRE' | 'STRONG_NO_HIRE' | 'NEEDS_ANOTHER_ROUND';

export type OfferStatus = 'DRAFT' | 'EXTENDED' | 'ACCEPTED' | 'DECLINED' | 'RESCINDED' | 'EXPIRED';

// ─── Embedded relation shapes ────────────────

export interface DepartmentRef {
  id: string;
  name: string;
}

export interface DesignationRef {
  id: string;
  title: string;
}

export interface EmployeeRef {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode?: string;
}

// ─── Job Requisition ─────────────────────────

export interface JobRequisition {
  id: string;
  requisitionNumber: string;
  title: string;
  departmentId: string | null;
  designationId: string | null;
  hiringManagerId: string;
  employmentType: EmploymentType;
  numberOfOpenings: number;
  positionsFilled: number;
  location: string | null;
  minSalary: string | null; // Decimal comes as string
  maxSalary: string | null;
  description: string | null;
  requirements: string | null;
  targetStartDate: string | null;
  status: RequisitionStatus;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  department?: DepartmentRef | null;
  designation?: DesignationRef | null;
  hiringManager?: EmployeeRef;
  createdBy?: EmployeeRef;
  approvedBy?: EmployeeRef | null;
  _count?: { applications?: number; postings?: number };
}

export interface CreateRequisitionPayload {
  title: string;
  departmentId?: string;
  designationId?: string;
  hiringManagerId: string;
  employmentType: EmploymentType;
  numberOfOpenings?: number;
  location?: string;
  minSalary?: number;
  maxSalary?: number;
  description?: string;
  requirements?: string;
  targetStartDate?: string;
}

export interface ReviewRequisitionPayload {
  decision: 'APPROVED' | 'REJECTED';
  reason?: string;
}

export interface CloseRequisitionPayload {
  reason?: string;
}

// ─── Candidate ───────────────────────────────

export interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  currentCompany: string | null;
  currentTitle: string | null;
  totalExperience: number | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  resumeUrl: string | null;
  resumeFileName: string | null;
  location: string | null;
  noticePeriodDays: number | null;
  source: CandidateSource;
  notes: string | null;
  isBlacklisted: boolean;
  blacklistReason: string | null;
  convertedEmployeeId: string | null;
  createdAt: string;
  updatedAt: string;
  applications?: JobApplication[];
  referrerEmployee?: EmployeeRef | null;
}

export interface CreateCandidatePayload {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  currentCompany?: string;
  currentTitle?: string;
  totalExperience?: number;
  linkedinUrl?: string;
  portfolioUrl?: string;
  resumeUrl?: string;
  resumeFileName?: string;
  location?: string;
  noticePeriodDays?: number;
  source?: CandidateSource;
  referrerEmployeeId?: string;
  notes?: string;
}

export interface UpdateCandidateBlacklistPayload {
  isBlacklisted: boolean;
  blacklistReason?: string;
}

// ─── Job Application ─────────────────────────

export interface ApplicationStage {
  id: string;
  jobPostingId: string;
  name: string;
  slug: string;
  sortOrder: number;
  isTerminal: boolean;
  isHired: boolean;
  isRejected: boolean;
  createdAt: string;
}

export interface ApplicationStageHistory {
  id: string;
  applicationId: string;
  fromStageId: string | null;
  toStageId: string;
  movedByEmployeeId: string;
  notes: string | null;
  createdAt: string;
  fromStage?: ApplicationStage | null;
  toStage?: ApplicationStage;
  movedBy?: EmployeeRef;
}

export interface JobPosting {
  id: string;
  jobRequisitionId: string;
  title: string;
  slug: string;
  channel: JobPostingChannel;
  description: string;
  isInternal: boolean;
  status: JobPostingStatus;
  publishedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  stages?: ApplicationStage[];
}

export interface JobApplication {
  id: string;
  candidateId: string;
  jobRequisitionId: string;
  jobPostingId: string | null;
  currentStageId: string | null;
  status: ApplicationStatus;
  source: CandidateSource;
  appliedAt: string;
  coverLetter: string | null;
  resumeUrl: string | null;
  resumeFileName: string | null;
  expectedSalary: string | null;
  rejectionReason: ApplicationRejectionReason | null;
  rejectionNotes: string | null;
  rejectedAt: string | null;
  withdrawnAt: string | null;
  withdrawnReason: string | null;
  hiredAt: string | null;
  createdAt: string;
  updatedAt: string;
  candidate?: Candidate;
  jobRequisition?: JobRequisition;
  jobPosting?: JobPosting | null;
  currentStage?: ApplicationStage | null;
  stageHistory?: ApplicationStageHistory[];
  referrer?: EmployeeRef | null;
  interviews?: Interview[];
  offers?: Offer[];
}

export interface CreateApplicationPayload {
  candidateId: string;
  jobRequisitionId: string;
  jobPostingId?: string;
  source?: CandidateSource;
  referrerEmployeeId?: string;
  coverLetter?: string;
  resumeUrl?: string;
  resumeFileName?: string;
  expectedSalary?: number;
}

export interface MoveStagePayload {
  toStageId: string;
  notes?: string;
}

export interface RejectApplicationPayload {
  reason: ApplicationRejectionReason;
  notes?: string;
}

export interface WithdrawApplicationPayload {
  reason?: string;
}

// ─── Interview ──────────────────────────────

export interface InterviewPanelist {
  id: string;
  interviewId: string;
  employeeId: string;
  isPrimary: boolean;
  createdAt: string;
  employee?: EmployeeRef;
}

export interface InterviewFeedback {
  id: string;
  interviewId: string;
  panelistEmployeeId: string;
  rating: number;
  recommendation: InterviewRecommendation;
  strengths: string | null;
  weaknesses: string | null;
  comments: string | null;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
  panelist?: EmployeeRef;
}

export interface Interview {
  id: string;
  organizationId: string;
  applicationId: string;
  stageId: string | null;
  scheduledAt: string;
  durationMinutes: number;
  type: InterviewType;
  mode: InterviewMode;
  location: string | null;
  meetingUrl: string | null;
  status: InterviewStatus;
  scheduledByEmployeeId: string;
  cancelledAt: string | null;
  cancelReason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  interviewers?: InterviewPanelist[];
  feedback?: InterviewFeedback[];
  application?: JobApplication;
  stage?: ApplicationStage | null;
  scheduledBy?: EmployeeRef;
}

export interface ScheduleInterviewPayload {
  applicationId: string;
  stageId?: string;
  scheduledAt: string;
  durationMinutes?: number;
  type: InterviewType;
  mode?: InterviewMode;
  location?: string;
  meetingUrl?: string;
  panelistEmployeeIds: string[];
  primaryPanelistEmployeeId?: string;
  notes?: string;
}

export interface RescheduleInterviewPayload {
  scheduledAt: string;
  durationMinutes?: number;
  location?: string;
  meetingUrl?: string;
  notes?: string;
}

export interface CancelInterviewPayload {
  reason?: string;
}

export interface SubmitFeedbackPayload {
  rating: number;
  recommendation: InterviewRecommendation;
  strengths?: string;
  weaknesses?: string;
  comments?: string;
}

// ─── Offer ──────────────────────────────────

export interface Offer {
  id: string;
  organizationId: string;
  applicationId: string;
  offerNumber: string;
  version: number;
  employmentType: EmploymentType;
  designationId: string | null;
  departmentId: string | null;
  reportingManagerId: string | null;
  baseSalary: string; // Decimal as string
  joiningBonus: string | null;
  currency: string;
  proposedJoiningDate: string;
  expiresAt: string;
  offerLetterUrl: string | null;
  offerLetterFileName: string | null;
  status: OfferStatus;
  extendedAt: string | null;
  extendedByEmployeeId: string | null;
  respondedAt: string | null;
  rescindedAt: string | null;
  rescindedByEmployeeId: string | null;
  rescindReason: string | null;
  declineReason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  application?: JobApplication;
  designation?: DesignationRef | null;
  department?: DepartmentRef | null;
  reportingManager?: EmployeeRef | null;
  extendedBy?: EmployeeRef | null;
  rescindedBy?: EmployeeRef | null;
}

export interface CreateOfferPayload {
  applicationId: string;
  employmentType: EmploymentType;
  designationId?: string;
  departmentId?: string;
  reportingManagerId?: string;
  baseSalary: number;
  joiningBonus?: number;
  currency?: string;
  proposedJoiningDate: string;
  expiresAt: string;
  offerLetterUrl?: string;
  offerLetterFileName?: string;
  notes?: string;
}

export interface RespondOfferPayload {
  decision: 'ACCEPTED' | 'DECLINED';
  declineReason?: string;
}

export interface RescindOfferPayload {
  reason?: string;
}

export interface HireCandidatePayload {
  employeeCode: string;
  joiningDate: string;
  userId?: string;
  workEmail?: string;
}

export interface HireResult {
  employee: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    personalEmail: string;
    departmentId: string | null;
    designationId: string | null;
  };
  applicationId: string;
}

// ─── Dashboard Summary ──────────────────────

export interface DashboardSummary {
  totalCandidates: number;
  activeApplications: number;
  interviewsScheduled: number;
  offersExtended: number;
  hiresThisMonth: number;
  pipeline: Record<string, number>;
  recentApplications: {
    id: string;
    status: ApplicationStatus;
    appliedAt: string;
    candidate: { id: string; firstName: string; lastName: string };
    jobRequisition: { id: string; title: string };
  }[];
  upcomingInterviews: {
    id: string;
    applicationId: string;
    scheduledAt: string;
    type: InterviewType;
    status: InterviewStatus;
    application: {
      candidate: { id: string; firstName: string; lastName: string };
    };
  }[];
  recentOffers: {
    id: string;
    applicationId: string;
    offerNumber: string;
    baseSalary: string;
    status: OfferStatus;
    createdAt: string;
    application: {
      candidate: { id: string; firstName: string; lastName: string };
    };
  }[];
}

// ─── Query params ────────────────────────────

export interface RequisitionFilters {
  status?: RequisitionStatus;
}

export interface CandidateFilters {
  search?: string;
}

export interface ApplicationFilters {
  requisitionId?: string;
  postingId?: string;
  candidateId?: string;
  status?: ApplicationStatus;
}
