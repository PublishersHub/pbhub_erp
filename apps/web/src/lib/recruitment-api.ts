import { get, post, patch } from './api';
import type {
  DashboardSummary,
  JobRequisition,
  CreateRequisitionPayload,
  ReviewRequisitionPayload,
  CloseRequisitionPayload,
  RequisitionFilters,
  Candidate,
  CreateCandidatePayload,
  UpdateCandidateBlacklistPayload,
  CandidateFilters,
  JobApplication,
  CreateApplicationPayload,
  MoveStagePayload,
  RejectApplicationPayload,
  WithdrawApplicationPayload,
  ApplicationFilters,
  ApplicationStage,
  JobPosting,
  Interview,
  ScheduleInterviewPayload,
  RescheduleInterviewPayload,
  CancelInterviewPayload,
  InterviewFeedback,
  SubmitFeedbackPayload,
  Offer,
  CreateOfferPayload,
  RespondOfferPayload,
  RescindOfferPayload,
  HireCandidatePayload,
  HireResult,
} from '@/types/recruitment';

// ─── Dashboard ──────────────────────────────

export function getDashboardSummary() {
  return get<DashboardSummary>('/api/recruitment/dashboard-summary');
}

function qs(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(
    (e): e is [string, string] => e[1] !== undefined && e[1] !== '',
  );
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries).toString();
}

// ─── Requisitions ────────────────────────────

export function listRequisitions(filters?: RequisitionFilters) {
  return get<JobRequisition[]>(`/api/job-requisitions${qs({ status: filters?.status })}`);
}

export function getRequisition(id: string) {
  return get<JobRequisition>(`/api/job-requisitions/${id}`);
}

export function createRequisition(payload: CreateRequisitionPayload) {
  return post<JobRequisition>('/api/job-requisitions', payload);
}

export function updateRequisition(id: string, payload: Partial<CreateRequisitionPayload>) {
  return patch<JobRequisition>(`/api/job-requisitions/${id}`, payload);
}

export function submitRequisition(id: string) {
  return patch<JobRequisition>(`/api/job-requisitions/${id}/submit`);
}

export function reviewRequisition(id: string, payload: ReviewRequisitionPayload) {
  return patch<JobRequisition>(`/api/job-requisitions/${id}/review`, payload);
}

export function closeRequisition(id: string, payload?: CloseRequisitionPayload) {
  return patch<JobRequisition>(`/api/job-requisitions/${id}/close`, payload);
}

// ─── Candidates ──────────────────────────────

export function listCandidates(filters?: CandidateFilters) {
  return get<Candidate[]>(`/api/candidates${qs({ search: filters?.search })}`);
}

export function getCandidate(id: string) {
  return get<Candidate>(`/api/candidates/${id}`);
}

export function createCandidate(payload: CreateCandidatePayload) {
  return post<Candidate>('/api/candidates', payload);
}

export function updateCandidate(id: string, payload: Partial<CreateCandidatePayload>) {
  return patch<Candidate>(`/api/candidates/${id}`, payload);
}

export function updateCandidateBlacklist(id: string, payload: UpdateCandidateBlacklistPayload) {
  return patch<Candidate>(`/api/candidates/${id}/blacklist`, payload);
}

// ─── Applications ────────────────────────────

export function listApplications(filters?: ApplicationFilters) {
  return get<JobApplication[]>(
    `/api/job-applications${qs({
      requisitionId: filters?.requisitionId,
      postingId: filters?.postingId,
      candidateId: filters?.candidateId,
      status: filters?.status,
    })}`,
  );
}

export function getApplication(id: string) {
  return get<JobApplication>(`/api/job-applications/${id}`);
}

export function createApplication(payload: CreateApplicationPayload) {
  return post<JobApplication>('/api/job-applications', payload);
}

export function moveApplicationStage(id: string, payload: MoveStagePayload) {
  return patch<JobApplication>(`/api/job-applications/${id}/move-stage`, payload);
}

export function rejectApplication(id: string, payload: RejectApplicationPayload) {
  return patch<JobApplication>(`/api/job-applications/${id}/reject`, payload);
}

export function withdrawApplication(id: string, payload: WithdrawApplicationPayload) {
  return patch<JobApplication>(`/api/job-applications/${id}/withdraw`, payload);
}

// ─── Stages (via postings) ───────────────────

export function listPostingStages(postingId: string) {
  return get<ApplicationStage[]>(`/api/job-postings/${postingId}/stages`);
}

// ─── Job Postings (read-only for applications) ──

export function listPostings(requisitionId?: string) {
  return get<JobPosting[]>(`/api/job-postings${qs({ requisitionId })}`);
}

export function getPosting(id: string) {
  return get<JobPosting>(`/api/job-postings/${id}`);
}

// ─── Interviews ─────────────────────────────

export function listInterviews(applicationId: string) {
  return get<Interview[]>(`/api/interviews/by-application/${applicationId}`);
}

export function getInterview(id: string) {
  return get<Interview>(`/api/interviews/${id}`);
}

export function scheduleInterview(payload: ScheduleInterviewPayload) {
  return post<Interview>('/api/interviews', payload);
}

export function rescheduleInterview(id: string, payload: RescheduleInterviewPayload) {
  return patch<Interview>(`/api/interviews/${id}/reschedule`, payload);
}

export function cancelInterview(id: string, payload?: CancelInterviewPayload) {
  return patch<Interview>(`/api/interviews/${id}/cancel`, payload);
}

export function submitFeedback(interviewId: string, payload: SubmitFeedbackPayload) {
  return post<InterviewFeedback>(`/api/interviews/${interviewId}/feedback`, payload);
}

// ─── Offers ─────────────────────────────────

export function listOffers(applicationId: string) {
  return get<Offer[]>(`/api/offers/by-application/${applicationId}`);
}

export function getOffer(id: string) {
  return get<Offer>(`/api/offers/${id}`);
}

export function createOffer(payload: CreateOfferPayload) {
  return post<Offer>('/api/offers', payload);
}

export function updateOffer(id: string, payload: Partial<Omit<CreateOfferPayload, 'applicationId'>>) {
  return patch<Offer>(`/api/offers/${id}`, payload);
}

export function extendOffer(id: string) {
  return patch<Offer>(`/api/offers/${id}/extend`);
}

export function respondOffer(id: string, payload: RespondOfferPayload) {
  return patch<Offer>(`/api/offers/${id}/respond`, payload);
}

export function rescindOffer(id: string, payload?: RescindOfferPayload) {
  return patch<Offer>(`/api/offers/${id}/rescind`, payload);
}

export function hireCandidate(offerId: string, payload: HireCandidatePayload) {
  return post<HireResult>(`/api/offers/${offerId}/hire`, payload);
}
