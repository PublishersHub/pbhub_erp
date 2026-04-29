'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Loading } from '@/components/ui/loading';
import { ErrorMessage } from '@/components/ui/error-message';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { useAsync, useTableParams, paginateLocal } from '@/lib/hooks';
import {
  listNotifications,
  markRead,
  markAllRead,
  archiveNotification,
} from '@/lib/notification-api';
import { formatDateTime } from '@/lib/format';
import type { Notification } from '@/types/notification';

type Tab = 'all' | 'unread' | 'archived';

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'archived', label: 'Archived' },
];

const REFERENCE_ROUTES: Record<string, string> = {
  LeaveRequest: '/leave',
  Expense: '/expenses',
  JobRequisition: '/recruitment/requisitions',
  JobApplication: '/recruitment/applications',
  Interview: '/recruitment/interviews',
  Offer: '/recruitment/offers',
  OnboardingInstance: '/onboarding',
};

function referenceHref(n: Notification): string | null {
  if (!n.referenceType || !n.referenceId) return null;
  const base = REFERENCE_ROUTES[n.referenceType];
  if (!base) return null;
  return `${base}/${n.referenceId}`;
}

function eventIcon(eventType: string): string {
  if (eventType.startsWith('leave.')) return 'L';
  if (eventType.startsWith('expense.')) return 'E';
  if (eventType.startsWith('payroll.')) return 'P';
  if (eventType.startsWith('performance.')) return 'G';
  if (eventType.startsWith('attendance.')) return 'A';
  if (eventType.startsWith('recruitment.')) return 'R';
  if (eventType.startsWith('onboarding.')) return 'O';
  return 'N';
}

function eventColor(eventType: string): string {
  if (eventType.startsWith('leave.')) return 'bg-green-100 text-green-700';
  if (eventType.startsWith('expense.')) return 'bg-yellow-100 text-yellow-700';
  if (eventType.startsWith('payroll.')) return 'bg-purple-100 text-purple-700';
  if (eventType.startsWith('performance.')) return 'bg-indigo-100 text-indigo-700';
  if (eventType.startsWith('attendance.')) return 'bg-cyan-100 text-cyan-700';
  if (eventType.startsWith('recruitment.')) return 'bg-blue-100 text-blue-700';
  if (eventType.startsWith('onboarding.')) return 'bg-orange-100 text-orange-700';
  return 'bg-gray-100 text-gray-700';
}

export default function NotificationsPage() {
  const { page, pageSize, setPage, setParams, searchParams } =
    useTableParams({ pageSize: 15 });
  const tab = (searchParams.get('tab') as Tab) || 'all';

  const filters =
    tab === 'unread'
      ? { unread: true }
      : tab === 'archived'
        ? { archived: true }
        : undefined;

  const { data, error, loading, refetch } = useAsync(
    () => listNotifications(filters),
    [tab],
  );

  const { items, total, totalPages } = useMemo(
    () => paginateLocal(data ?? [], page, pageSize),
    [data, page, pageSize],
  );

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleMarkRead = useCallback(
    async (id: string) => {
      setActionLoading(id);
      try {
        await markRead(id);
        refetch();
      } finally {
        setActionLoading(null);
      }
    },
    [refetch],
  );

  const handleArchive = useCallback(
    async (id: string) => {
      setActionLoading(id);
      try {
        await archiveNotification(id);
        refetch();
      } finally {
        setActionLoading(null);
      }
    },
    [refetch],
  );

  const handleMarkAllRead = useCallback(async () => {
    setActionLoading('all');
    try {
      await markAllRead();
      refetch();
    } finally {
      setActionLoading(null);
    }
  }, [refetch]);

  return (
    <div>
      <PageHeader
        title="Notifications"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/notifications/preferences"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Preferences
            </Link>
            <button
              onClick={handleMarkAllRead}
              disabled={actionLoading === 'all'}
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {actionLoading === 'all' ? 'Marking...' : 'Mark all read'}
            </button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setParams({ tab: t.key === 'all' ? null : t.key, page: null })}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <Loading />}
      {error && <ErrorMessage message={error} onRetry={refetch} />}

      {data && total === 0 && (
        <EmptyState
          title={
            tab === 'unread'
              ? 'All caught up!'
              : tab === 'archived'
                ? 'No archived notifications'
                : 'No notifications yet'
          }
          description={
            tab === 'unread'
              ? 'You have no unread notifications.'
              : tab === 'archived'
                ? 'Archived notifications will appear here.'
                : 'Notifications will appear here as events occur.'
          }
        />
      )}

      {data && total > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="divide-y divide-gray-100">
            {items.map((n) => {
              const href = referenceHref(n);
              const isActing = actionLoading === n.id;

              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 ${
                    !n.isRead ? 'bg-blue-50/40' : ''
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${eventColor(n.eventType)}`}
                  >
                    {eventIcon(n.eventType)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`text-sm ${!n.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                          {n.title}
                        </p>
                        <p className="mt-0.5 text-sm text-gray-500">{n.body}</p>
                      </div>
                      <span className="shrink-0 text-xs text-gray-400">
                        {formatDateTime(n.createdAt)}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-3">
                      {href && (
                        <Link
                          href={href}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                          View details
                        </Link>
                      )}
                      {!n.isRead && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          disabled={isActing}
                          className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
                        >
                          Mark read
                        </button>
                      )}
                      {!n.isArchived && (
                        <button
                          onClick={() => handleArchive(n.id)}
                          disabled={isActing}
                          className="text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50"
                        >
                          Archive
                        </button>
                      )}
                    </div>
                  </div>

                  {!n.isRead && (
                    <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                  )}
                </div>
              );
            })}
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
