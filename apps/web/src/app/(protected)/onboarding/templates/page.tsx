'use client';

import { useMemo } from 'react';
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
  const { can } = usePermission();
  const { page, sort, order, pageSize, setPage, setSort } = useTableParams();

  const { data, error, loading, refetch } = useAsync(() => listTemplates());

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
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Create Template
            </Link>
          ) : undefined
        }
      />

      {loading && <Loading />}
      {error && <ErrorMessage message={error} onRetry={refetch} />}
      {data && total === 0 && (
        <EmptyState title="No templates" description="Create your first onboarding template to get started." />
      )}
      {data && total > 0 && (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <SortableHeader label="Name" sortKey="name" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Tasks</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Default</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((tpl) => (
                  <tr key={tpl.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <Link href={`/onboarding/templates/${tpl.id}`} className="font-medium text-blue-600 hover:underline">
                        {tpl.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{tpl.description || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{tpl._count?.tasks ?? tpl.tasks?.length ?? '—'}</td>
                    <td className="px-4 py-3 text-sm">
                      {tpl.isDefault ? (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                          Default
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {tpl.isActive ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
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
