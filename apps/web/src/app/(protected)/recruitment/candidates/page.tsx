'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { Pagination } from '@/components/ui/pagination';
import { SortableHeader } from '@/components/ui/sortable-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { useAsync, useDebouncedValue, usePermission, useTableParams, sortLocal, paginateLocal } from '@/lib/hooks';
import { listCandidates } from '@/lib/recruitment-api';

export default function CandidatesListPage() {
  const { can } = usePermission();
  const { page, sort, order, pageSize, setPage, setSort, setParams, searchParams } =
    useTableParams();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const debouncedSearch = useDebouncedValue(search, 350);

  const { data, error, loading, refetch } = useAsync(
    () => listCandidates(debouncedSearch ? { search: debouncedSearch } : undefined),
    [debouncedSearch],
  );

  function updateSearch(value: string) {
    setSearch(value);
    setParams({ search: value || null, page: null });
  }

  const sorted = useMemo(
    () =>
      sortLocal(data ?? [], sort, order, (item, key) => {
        switch (key) {
          case 'name': return `${item.firstName} ${item.lastName}`;
          case 'email': return item.email;
          case 'source': return item.source;
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
        title="Candidates"
        backHref="/recruitment"
        actions={
          can('recruitment.candidate.manage') ? (
            <Link
              href="/recruitment/candidates/new"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add Candidate
            </Link>
          ) : undefined
        }
      />

      <FilterBar onClear={() => { updateSearch(''); }} hasActiveFilters={!!search}>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => updateSearch(e.target.value)}
          className="w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </FilterBar>

      {loading && <Loading />}
      {error && <ErrorMessage message={error} onRetry={refetch} />}
      {data && total === 0 && (
        <EmptyState title="No candidates found" description="Add your first candidate to get started." />
      )}
      {data && total > 0 && (
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <SortableHeader label="Name" sortKey="name" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <SortableHeader label="Email" sortKey="email" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Phone</th>
                  <SortableHeader label="Source" sortKey="source" currentSort={sort} currentOrder={order} onSort={setSort} />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Current Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <Link href={`/recruitment/candidates/${c.id}`} className="font-medium text-blue-600 hover:underline">
                        {c.firstName} {c.lastName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{c.email}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{c.phone || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{c.source.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {c.currentTitle && c.currentCompany
                        ? `${c.currentTitle} @ ${c.currentCompany}`
                        : c.currentTitle || c.currentCompany || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {c.isBlacklisted ? (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                          Blacklisted
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                          Active
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
