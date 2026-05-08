'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useDocumentTitle } from '@/lib/use-document-title';
import { PageHeader } from '@/components/ui/page-header';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { Pagination } from '@/components/ui/pagination';
import { SortableHeader } from '@/components/ui/sortable-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { StatusBadge } from '@/components/ui/status-badge';
import { LoadingButton } from '@/components/ui/loading-button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import {
  useAsync,
  usePermission,
  useTableParams,
  sortLocal,
  paginateLocal,
} from '@/lib/hooks';
import {
  getMyCorrections,
  getAllCorrections,
  createCorrection,
  reviewCorrection,
} from '@/lib/attendance-api';
import { formatDate, formatDateTime, employeeName } from '@/lib/format';
import type { CorrectionRequestStatus } from '@/types/attendance';

type ViewMode = 'my' | 'all';

export default function CorrectionsPage() {
  useDocumentTitle('Attendance Corrections');

  const confirm = useConfirm();
  const { can } = usePermission();
  const canManage = can('attendance.manage');
  const { page, sort, order, pageSize, setPage, setSort, setParams, searchParams } =
    useTableParams();

  const [view, setView] = useState<ViewMode>('my');
  const statusFilter = (searchParams.get('status') || '') as CorrectionRequestStatus | '';

  const { data, error, errorStatus, loading, refetch } = useAsync(
    () =>
      view === 'all' && canManage
        ? getAllCorrections(statusFilter || undefined)
        : getMyCorrections(),
    [view, statusFilter],
  );

  // Filter my corrections by status if set
  const filtered = useMemo(() => {
    if (!data) return [];
    if (view === 'all' || !statusFilter) return data;
    return data.filter((c) => c.status === statusFilter);
  }, [data, view, statusFilter]);

  const sorted = useMemo(
    () =>
      sortLocal(filtered, sort, order, (item, key) => {
        switch (key) {
          case 'date':
            return item.date;
          case 'employee':
            return item.employee ? `${item.employee.firstName} ${item.employee.lastName}` : '';
          case 'status':
            return item.status;
          case 'created':
            return item.createdAt;
          default:
            return null;
        }
      }),
    [filtered, sort, order],
  );

  const { items, total, totalPages } = useMemo(
    () => paginateLocal(sorted, page, pageSize),
    [sorted, page, pageSize],
  );

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [corrDate, setCorrDate] = useState('');
  const [reqCheckIn, setReqCheckIn] = useState('');
  const [reqCheckOut, setReqCheckOut] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Review form
  const [reviewingId, setReviewingId] = useState('');
  const [reviewRemarks, setReviewRemarks] = useState('');

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setFormError('');
    setSubmitting(true);
    try {
      await createCorrection({
        date: corrDate,
        ...(reqCheckIn && { requestedCheckIn: `${corrDate}T${reqCheckIn}:00` }),
        ...(reqCheckOut && { requestedCheckOut: `${corrDate}T${reqCheckOut}:00` }),
        reason,
      });
      setShowCreate(false);
      setCorrDate('');
      setReqCheckIn('');
      setReqCheckOut('');
      setReason('');
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create correction');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReview(id: string, status: 'APPROVED' | 'REJECTED') {
    if (status === 'REJECTED') {
      const ok = await confirm({
        title: 'Reject this correction request?',
        description: 'The employee will be notified that the request was rejected. Add remarks above to explain why.',
        confirmLabel: 'Reject',
        tone: 'danger',
      });
      if (!ok) return;
    }
    setFormError('');
    try {
      await reviewCorrection(id, { status, remarks: reviewRemarks || undefined });
      setReviewingId('');
      setReviewRemarks('');
      refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Review failed');
    }
  }

  const inputCls =
    'block w-full rounded-md border border-input bg-card text-foreground px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none transition-colors';

  return (
    <div>
      <PageHeader
        title="Attendance Corrections"
        actions={
          !showCreate ? (
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90 motion-press transition-colors px-4 py-2 text-sm font-medium"
            >
              Request Correction
            </button>
          ) : undefined
        }
      />

      {canManage && (
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setView('my')}
            className={`rounded-md px-4 py-2 text-sm font-medium motion-press transition-colors ${
              view === 'my' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            My Requests
          </button>
          <button
            onClick={() => setView('all')}
            className={`rounded-md px-4 py-2 text-sm font-medium motion-press transition-colors ${
              view === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            All Requests
          </button>
        </div>
      )}

      <FilterBar
        onClear={() => setParams({ status: null, page: null })}
        hasActiveFilters={!!statusFilter}
      >
        <select
          value={statusFilter}
          onChange={(e) => setParams({ status: e.target.value || null, page: null })}
          className="rounded-md border border-input bg-card text-foreground px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-ring/50 focus:outline-none transition-colors"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </FilterBar>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="mb-4 rounded-lg border border-border bg-card p-4 shadow-soft space-y-3"
        >
          <h3 className="text-sm font-semibold text-foreground">New Correction Request</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-foreground/80">Date *</label>
              <input
                type="date"
                required
                value={corrDate}
                onChange={(e) => setCorrDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/80">Requested Check-in</label>
              <input
                type="time"
                value={reqCheckIn}
                onChange={(e) => setReqCheckIn(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/80">Requested Check-out</label>
              <input
                type="time"
                value={reqCheckOut}
                onChange={(e) => setReqCheckOut(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground/80">Reason *</label>
            <textarea
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className={inputCls}
              placeholder="Explain why you need this correction..."
            />
          </div>
          {formError && <ErrorMessage message={formError} />}
          <div className="flex gap-2">
            <LoadingButton type="submit" loading={submitting} loadingText="Submitting...">
              Submit
            </LoadingButton>
            <LoadingButton
              type="button"
              variant="secondary"
              onClick={() => {
                setShowCreate(false);
                setCorrDate('');
                setReqCheckIn('');
                setReqCheckOut('');
                setReason('');
              }}
            >
              Cancel
            </LoadingButton>
          </div>
        </form>
      )}

      {!showCreate && formError && (
        <div className="mb-4">
          <ErrorMessage message={formError} />
        </div>
      )}

      {loading && <Loading />}
      {error && <ErrorMessage message={error} status={errorStatus} onRetry={refetch} fallback={{ label: 'View attendance', href: '/attendance' }} />}
      {data && total === 0 && (
        <EmptyState
          title="No correction requests"
          description="Submit a correction request if you need to fix attendance records."
          variant="attendance"
          cta={{ label: 'Request Correction', onClick: () => setShowCreate(true) }}
        />
      )}
      {data && total > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-soft">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/60">
                <tr>
                  <SortableHeader label="Date" sortKey="date" currentSort={sort} currentOrder={order} onSort={setSort} />
                  {view === 'all' && (
                    <SortableHeader label="Employee" sortKey="employee" currentSort={sort} currentOrder={order} onSort={setSort} />
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Original</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Requested</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Reason</th>
                  <SortableHeader label="Status" sortKey="status" currentSort={sort} currentOrder={order} onSort={setSort} />
                  {canManage && view === 'all' && (
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/50 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-foreground">
                      {formatDate(c.date)}
                    </td>
                    {view === 'all' && (
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground/80">
                        {employeeName(c.employee)}
                      </td>
                    )}
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <div>In: {c.originalCheckIn ? formatDateTime(c.originalCheckIn) : '—'}</div>
                      <div>Out: {c.originalCheckOut ? formatDateTime(c.originalCheckOut) : '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <div>In: {c.requestedCheckIn ? formatDateTime(c.requestedCheckIn) : '—'}</div>
                      <div>Out: {c.requestedCheckOut ? formatDateTime(c.requestedCheckOut) : '—'}</div>
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-sm text-muted-foreground" title={c.reason}>
                      {c.reason}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                      {c.reviewedBy && (
                        <p className="mt-1 text-xs text-muted-foreground/70">
                          by {employeeName(c.reviewedBy)}
                        </p>
                      )}
                    </td>
                    {canManage && view === 'all' && (
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        {c.status === 'PENDING' ? (
                          reviewingId === c.id ? (
                            <div className="space-y-2">
                              <input
                                value={reviewRemarks}
                                onChange={(e) => setReviewRemarks(e.target.value)}
                                placeholder="Remarks (optional)"
                                className="block w-full rounded border border-input bg-card text-foreground px-2 py-1 text-xs focus:border-primary focus:ring-2 focus:ring-ring/50 transition-colors"
                              />
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleReview(c.id, 'APPROVED')}
                                  className="rounded bg-success-soft text-success hover:bg-success/20 transition-colors px-2 py-1 text-xs font-medium"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReview(c.id, 'REJECTED')}
                                  className="rounded bg-destructive-soft text-destructive hover:bg-destructive/20 transition-colors px-2 py-1 text-xs font-medium"
                                >
                                  Reject
                                </button>
                                <button
                                  onClick={() => { setReviewingId(''); setReviewRemarks(''); }}
                                  className="rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors px-2 py-1 text-xs font-medium"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setReviewingId(c.id)}
                              className="rounded bg-info-soft text-info hover:bg-info/20 transition-colors px-2 py-1 text-xs font-medium"
                            >
                              Review
                            </button>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground/70">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
