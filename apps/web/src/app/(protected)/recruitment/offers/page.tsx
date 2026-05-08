'use client';

import { useEffect, useMemo } from 'react';
import { useDocumentTitle } from '@/lib/use-document-title';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { Pagination } from '@/components/ui/pagination';
import { SortableHeader } from '@/components/ui/sortable-header';
import { useAsync, usePermission, useTableParams, sortLocal, paginateLocal } from '@/lib/hooks';
import { listOffers } from '@/lib/recruitment-api';
import { formatDate, formatCurrency } from '@/lib/format';

export default function OffersListPage() {
  useDocumentTitle('Offers');
  const { can } = usePermission();
  const { page, sort, order, pageSize, setPage, setSort, searchParams } =
    useTableParams();
  const applicationId = searchParams.get('applicationId') || '';

  const { data, error, errorStatus, loading, refetch } = useAsync(
    () => (applicationId ? listOffers(applicationId) : Promise.resolve([])),
    [applicationId],
  );

  const sorted = useMemo(
    () =>
      sortLocal(data ?? [], sort, order, (item, key) => {
        switch (key) {
          case 'offerNumber': return item.offerNumber;
          case 'salary': return item.baseSalary;
          case 'joiningDate': return item.proposedJoiningDate;
          case 'expiresAt': return item.expiresAt;
          case 'status': return item.status;
          default: return null;
        }
      }),
    [data, sort, order],
  );

  const { items, total, totalPages } = useMemo(
    () => paginateLocal(sorted, page, pageSize),
    [sorted, page, pageSize],
  );

  return (
    <div>
      <PageHeader
        title="Offers"
        backHref="/recruitment"
        actions={
          applicationId && can('recruitment.offer.manage') ? (
            <Link
              href={`/recruitment/offers/new?applicationId=${applicationId}`}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 motion-press"
            >
              Create Offer
            </Link>
          ) : undefined
        }
      />

      {!applicationId && (
        <EmptyState
          title="Select an application"
          description="Navigate to an application detail page and click 'Create Offer' to view offers."
        />
      )}

      {applicationId && loading && <Loading />}
      {error && <ErrorMessage message={error} status={errorStatus} onRetry={refetch} />}
      {data && total === 0 && applicationId && (
        <EmptyState title="No offers found" description="Create the first offer for this application." />
      )}
      {data && total > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-soft">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/60">
                <tr>
                  <SortableHeader label="Offer #" sortKey="offerNumber" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Version</th>
                  <SortableHeader label="Salary" sortKey="salary" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <SortableHeader label="Joining Date" sortKey="joiningDate" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <SortableHeader label="Expires" sortKey="expiresAt" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <SortableHeader label="Status" sortKey="status" currentSort={sort} currentOrder={order} onSort={setSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((offer) => (
                  <tr key={offer.id} className="hover:bg-muted/50 transition-colors">
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <Link href={`/recruitment/offers/${offer.id}`} className="font-medium text-primary hover:underline">
                        {offer.offerNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">v{offer.version}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">{formatCurrency(offer.baseSalary)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">{formatDate(offer.proposedJoiningDate)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">{formatDate(offer.expiresAt)}</td>
                    <td className="px-4 py-3"><StatusBadge status={offer.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
