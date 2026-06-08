import { get, post, patch, del } from './api';

export interface LedgerRow {
  id: string;
  date: string;
  particular: string;
  debit: number;
  credit: number;
  balance: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerListResponse {
  rows: LedgerRow[];
  totals: { debit: number; credit: number; balance: number };
}

export interface LedgerPayload {
  date: string;
  particular: string;
  debit?: number;
  credit?: number;
  notes?: string;
}

function qs(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(
    (e): e is [string, string] => e[1] !== undefined && e[1] !== '',
  );
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries).toString();
}

export function listLedgerEntries(from?: string, to?: string) {
  return get<LedgerListResponse>(`/api/expense-ledger${qs({ from, to })}`);
}

export function createLedgerEntry(payload: LedgerPayload) {
  return post<LedgerRow>('/api/expense-ledger', payload);
}

export function updateLedgerEntry(id: string, payload: Partial<LedgerPayload>) {
  return patch<LedgerRow>(`/api/expense-ledger/${id}`, payload);
}

export function deleteLedgerEntry(id: string) {
  return del<{ ok: boolean }>(`/api/expense-ledger/${id}`);
}
