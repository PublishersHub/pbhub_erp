'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { Pagination } from '@/components/ui/pagination';
import { SortableHeader } from '@/components/ui/sortable-header';
import { FilterBar } from '@/components/ui/filter-bar';
import {
  useAsync,
  usePermission,
  useTableParams,
  useDebouncedValue,
  sortLocal,
  paginateLocal,
} from '@/lib/hooks';
import { listEmployees, listDepartments, listDesignations } from '@/lib/employee-api';
import { employeeName } from '@/lib/format';
import type { Department, Designation } from '@/types/employee';
import { useState } from 'react';

export default function EmployeesListPage() {
  const { can } = usePermission();
  const { page, sort, order, pageSize, setPage, setSort, setParams, searchParams } =
    useTableParams();

  const departmentId = searchParams.get('departmentId') || '';
  const designationId = searchParams.get('designationId') || '';
  const isActive = searchParams.get('isActive') || '';
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  const { data, error, loading, refetch } = useAsync(
    () =>
      listEmployees({
        ...(departmentId && { departmentId }),
        ...(designationId && { designationId }),
        ...(isActive && { isActive }),
        ...(debouncedSearch && { search: debouncedSearch }),
      }),
    [departmentId, designationId, isActive, debouncedSearch],
  );

  const { data: departments } = useAsync(() => listDepartments(), []);
  const { data: designations } = useAsync(() => listDesignations(), []);

  const sorted = useMemo(
    () =>
      sortLocal(data ?? [], sort, order, (item, key) => {
        switch (key) {
          case 'name':
            return `${item.firstName} ${item.lastName}`;
          case 'employeeCode':
            return item.employeeCode;
          case 'department':
            return item.department?.name ?? '';
          case 'designation':
            return item.designation?.name ?? '';
          default:
            return null;
        }
      }),
    [data, sort, order],
  );

  const { items, total, totalPages } = useMemo(
    () => paginateLocal(sorted, page, pageSize),
    [sorted, page, pageSize],
  );

  const hasActiveFilters = !!(departmentId || designationId || isActive || debouncedSearch);

  return (
    <div>
      <PageHeader
        title="Employees"
        actions={
          can('employee.create') ? (
            <Link
              href="/employees/new"
              className="motion-press rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Add Employee
            </Link>
          ) : undefined
        }
      />

      <FilterBar
        onClear={() => {
          setSearchInput('');
          setParams({ departmentId: null, designationId: null, isActive: null, search: null, page: null });
        }}
        hasActiveFilters={hasActiveFilters}
      >
        <input
          type="text"
          placeholder="Search name or code..."
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setParams({ page: null });
          }}
          className="rounded-md border border-input px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50"
        />
        <select
          value={departmentId}
          onChange={(e) => setParams({ departmentId: e.target.value || null, page: null })}
          className="rounded-md border border-input bg-card px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50"
        >
          <option value="">All Departments</option>
          {(departments ?? []).map((d: Department) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          value={designationId}
          onChange={(e) => setParams({ designationId: e.target.value || null, page: null })}
          className="rounded-md border border-input bg-card px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50"
        >
          <option value="">All Designations</option>
          {(designations ?? []).map((d: Designation) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          value={isActive}
          onChange={(e) => setParams({ isActive: e.target.value || null, page: null })}
          className="rounded-md border border-input bg-card px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </FilterBar>

      {loading && <Loading />}
      {error && <ErrorMessage message={error} onRetry={refetch} />}
      {data && total === 0 && (
        <EmptyState
          title="No employees found"
          description="Add your first employee to get started."
        />
      )}
      {data && total > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-soft">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/60">
                <tr>
                  <SortableHeader
                    label="Code"
                    sortKey="employeeCode"
                    currentSort={sort}
                    currentOrder={order}
                    onSort={setSort}
                  />
                  <SortableHeader
                    label="Name"
                    sortKey="name"
                    currentSort={sort}
                    currentOrder={order}
                    onSort={setSort}
                  />
                  <SortableHeader
                    label="Department"
                    sortKey="department"
                    currentSort={sort}
                    currentOrder={order}
                    onSort={setSort}
                  />
                  <SortableHeader
                    label="Designation"
                    sortKey="designation"
                    currentSort={sort}
                    currentOrder={order}
                    onSort={setSort}
                  />
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Manager
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((emp) => (
                  <tr key={emp.id} className="transition-colors hover:bg-muted/50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <Link
                        href={`/employees/${emp.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {emp.employeeCode}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">
                      {emp.firstName} {emp.lastName}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                      {emp.department?.name ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                      {emp.designation?.name ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                      {employeeName(emp.reportingManager)}
                    </td>
                    <td className="px-4 py-3">
                      {emp.isActive ? (
                        <span className="inline-flex items-center rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                          Inactive
                        </span>
                      )}
                    </td>
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
