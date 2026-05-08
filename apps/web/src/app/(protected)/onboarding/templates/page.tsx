'use client';

import { useEffect, useMemo } from 'react';
import { useDocumentTitle } from '@/lib/use-document-title';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { Pagination } from '@/components/ui/pagination';
import { SortableHeader } from '@/components/ui/sortable-header';
import { useAsync, usePermission, useTableParams, sortLocal, paginateLocal } from '@/lib/hooks';
import { listTemplates } from '@/lib/onboarding-api';

export default function TemplatesListPage() {
  useDocumentTitle('Onboarding Templates');
  const { can } = usePermission();
  const { page, sort, order, pageSize, setPage, setSort } = useTableParams();

  const { data, error, errorStatus, loading, refetch } = useAsync(() => listTemplates());

  const sorted = useMemo(
    () =>
      sortLocal(data ?? [], sort, order, (item, key) => {
        switch (key) {
          case 'name': return item.name;
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
        title="Onboarding Templates"
        backHref="/onboarding"
        actions={
          can('onboarding.template.manage') ? (
            <Link
              href="/onboarding/templates/new"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Create Template
            </Link>
          ) : undefined
        }
      />

      {loading && <Loading />}
      {error && <ErrorMessage message={error} status={errorStatus} onRetry={refetch} fallback={{ label: 'View my onboarding', href: '/onboarding/my' }} />}
      {data && total === 0 && (
        <EmptyState title="No templates" description="Create your first onboarding template to get started." />
      )}
      {data && total > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-soft">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/60">
                <tr>
                  <SortableHeader label="Name" sortKey="name" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Tasks</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Default</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((tpl) => (
                  <tr key={tpl.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 text-sm">
                      <Link href={`/onboarding/templates/${tpl.id}`} className="font-medium text-primary hover:underline">
                        {tpl.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{tpl.description || '—'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{tpl._count?.tasks ?? tpl.tasks?.length ?? '—'}</td>
                    <td className="px-4 py-3 text-sm">
                      {tpl.isDefault ? (
                        <span className="inline-flex items-center rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">
                          Default
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {tpl.isActive ? (
                        <span className="inline-flex items-center rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                          Inactive
                        </span>
                      )}
                    </td>
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
