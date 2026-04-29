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
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
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
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <select
          value={departmentId}
          onChange={(e) => setParams({ departmentId: e.target.value || null, page: null })}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
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
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
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
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
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
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
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
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Manager
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <Link
                        href={`/employees/${emp.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {emp.employeeCode}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {emp.firstName} {emp.lastName}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {emp.department?.name ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {emp.designation?.name ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {employeeName(emp.reportingManager)}
                    </td>
                    <td className="px-4 py-3">
                      {emp.isActive ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-600">
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
