import { get, post, patch } from './api';
import type {
  ExpenseCategory,
  CreateExpenseCategoryPayload,
  UpdateExpenseCategoryPayload,
  ExpensePolicy,
  CreateExpensePolicyPayload,
  UpdateExpensePolicyPayload,
  ExpenseClaim,
  CreateExpenseClaimPayload,
  UpdateExpenseClaimPayload,
  ReviewExpenseClaimPayload,
  CancelExpenseClaimPayload,
  ReimburseExpenseClaimPayload,
  ExpenseClaimStatus,
} from '@/types/expense';

function qs(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(
    (e): e is [string, string] => e[1] !== undefined && e[1] !== '',
  );
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries).toString();
}

// ─── Categories ─────────────────────────────

export function listExpenseCategories() {
  return get<ExpenseCategory[]>('/api/expense-categories');
}

export function getExpenseCategory(id: string) {
  return get<ExpenseCategory>(`/api/expense-categories/${id}`);
}

export function createExpenseCategory(payload: CreateExpenseCategoryPayload) {
  return post<ExpenseCategory>('/api/expense-categories', payload);
}

export function updateExpenseCategory(id: string, payload: UpdateExpenseCategoryPayload) {
  return patch<ExpenseCategory>(`/api/expense-categories/${id}`, payload);
}

// ─── Policies ───────────────────────────────

export function listExpensePolicies() {
  return get<ExpensePolicy[]>('/api/expense-policies');
}

export function getExpensePolicy(id: string) {
  return get<ExpensePolicy>(`/api/expense-policies/${id}`);
}

export function createExpensePolicy(payload: CreateExpensePolicyPayload) {
  return post<ExpensePolicy>('/api/expense-policies', payload);
}

export function updateExpensePolicy(id: string, payload: UpdateExpensePolicyPayload) {
  return patch<ExpensePolicy>(`/api/expense-policies/${id}`, payload);
}

// ─── Claims — Employee ──────────────────────

export function createExpenseClaim(payload: CreateExpenseClaimPayload) {
  return post<ExpenseClaim>('/api/expense-claims', payload);
}

export function getMyClaims(status?: ExpenseClaimStatus) {
  return get<ExpenseClaim[]>(`/api/expense-claims/my${qs({ status })}`);
}

export function getMyClaimDetail(id: string) {
  return get<ExpenseClaim>(`/api/expense-claims/my/${id}`);
}

export function updateExpenseClaim(id: string, payload: UpdateExpenseClaimPayload) {
  return patch<ExpenseClaim>(`/api/expense-claims/${id}`, payload);
}

export function submitExpenseClaim(id: string) {
  return patch<ExpenseClaim>(`/api/expense-claims/${id}/submit`, {});
}

export function cancelExpenseClaim(id: string, payload?: CancelExpenseClaimPayload) {
  return patch<ExpenseClaim>(`/api/expense-claims/${id}/cancel`, payload ?? {});
}

// ─── Claims — Approver ──────────────────────

export function getPendingClaims() {
  return get<ExpenseClaim[]>('/api/expense-claims/pending');
}

export function reviewExpenseClaim(id: string, payload: ReviewExpenseClaimPayload) {
  return patch<ExpenseClaim>(`/api/expense-claims/${id}/review`, payload);
}

// ─── Claims — Finance ───────────────────────

export function reimburseExpenseClaim(id: string, payload: ReimburseExpenseClaimPayload) {
  return post<ExpenseClaim>(`/api/expense-claims/${id}/reimburse`, payload);
}

// ─── Claims — Admin ─────────────────────────

export function getAllClaims(status?: ExpenseClaimStatus) {
  return get<ExpenseClaim[]>(`/api/expense-claims${qs({ status })}`);
}

export function getClaimDetail(id: string) {
  return get<ExpenseClaim>(`/api/expense-claims/${id}`);
}
