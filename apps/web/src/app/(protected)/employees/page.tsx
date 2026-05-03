'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { Loading } from '@/components/ui/loading';
import { SkeletonTable } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import { Pagination } from '@/components/ui/pagination';
import { SortableHeader } from '@/components/ui/sortable-header';
import { FilterBar } from '@/components/ui/filter-bar';
import { EmployeeAvatar } from '@/components/ui/employee-avatar';
import {
  useAsync,
  usePermission,
  useTableParams,
  useDebouncedValue,
  sortLocal,
  paginateLocal,
} from '@/lib/hooks';
import { listEmployees, listMyTeam, listDepartments, listDesignations } from '@/lib/employee-api';
import { employeeName } from '@/lib/format';
import type { Department, Designation, Employee } from '@/types/employee';
import { useState } from 'react';

// ─── CSV helpers ──────────────────────────────

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadEmployeesCsv(employees: Employee[]) {
  const headers = ['Code', 'Name', 'Email', 'Department', 'Designation', 'Status'];
  const rows = employees.map((e) => [
    e.employeeCode ?? '',
    `${e.firstName} ${e.lastName}`.trim(),
    e.personalEmail ?? '',
    e.department?.name ?? '',
    e.designation?.name ?? '',
    e.isActive ? 'Active' : 'Inactive',
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((c) => csvEscape(String(c))).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `employees-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function EmployeesListPage() {
  useEffect(() => {
    document.title = 'Employees · PbHub';
  }, []);

  const { can } = usePermission();
  // Admin view = HR/super-admin level (can create or read sensitive data).
  // Otherwise (managers, recruiters, etc.) only see themselves + direct reports.
  const isAdminView = can('employee.create') || can('employee.read_sensitive');
  const { page, sort, order, pageSize, setPage, setSort, setParams, searchParams } =
    useTableParams();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const departmentId = searchParams.get('departmentId') || '';
  const designationId = searchParams.get('designationId') || '';
  const isActive = searchParams.get('isActive') || '';
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  const { data, error, errorStatus, loading, refetch } = useAsync(
    () =>
      isAdminView
        ? listEmployees({
            ...(departmentId && { departmentId }),
            ...(designationId && { designationId }),
            ...(isActive && { isActive }),
            ...(debouncedSearch && { search: debouncedSearch }),
          })
        : listMyTeam(),
    [isAdminView, departmentId, designationId, isActive, debouncedSearch],
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
        title={isAdminView ? 'Employees' : 'My team'}
        description={isAdminView ? undefined : 'You and your direct reports.'}
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

      {isAdminView && <FilterBar
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
      </FilterBar>}

      {loading && <SkeletonTable rows={6} cols={6} />}
      {error && <ErrorMessage message={error} status={errorStatus} onRetry={refetch} />}
      {data && total === 0 && (
        <EmptyState
          title="No employees found"
          description="Add your first employee to get started."
          cta={
            can('employee.create')
              ? { label: 'Add employee', href: '/employees/new' }
              : undefined
          }
        />
      )}
      {data && total > 0 && (
        <>
          {/* Bulk action toolbar — sticky above table */}
          {selectedIds.size > 0 && (
            <div className="sticky top-0 z-20 mb-3 flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 shadow-soft backdrop-blur">
              <p className="text-sm font-medium text-foreground">
                {selectedIds.size} selected
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const rows = (sorted as Employee[]).filter((e) => selectedIds.has(e.id));
                    if (rows.length > 0) downloadEmployeesCsv(rows);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow-primary motion-press hover:bg-primary/90"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                  </svg>
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="rounded-md border border-input bg-card px-3 py-1.5 text-xs font-medium text-foreground motion-press hover:bg-muted"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Desktop table */}
          <div className="hidden md:block overflow-hidden rounded-lg border border-border bg-card shadow-soft">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label="Select all on this page"
                        checked={items.length > 0 && items.every((e) => selectedIds.has(e.id))}
                        onChange={(e) => {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) {
                              items.forEach((it) => next.add(it.id));
                            } else {
                              items.forEach((it) => next.delete(it.id));
                            }
                            return next;
                          });
                        }}
                        className="h-4 w-4 rounded border-input"
                      />
                    </th>
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
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((emp) => (
                    <tr key={emp.id} className="group transition-colors hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Select ${emp.firstName} ${emp.lastName}`}
                          checked={selectedIds.has(emp.id)}
                          onChange={(e) => {
                            setSelectedIds((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(emp.id);
                              else next.delete(emp.id);
                              return next;
                            });
                          }}
                          className="h-4 w-4 rounded border-input"
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <Link
                          href={`/employees/${emp.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {emp.employeeCode}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-foreground">
                        <span className="flex items-center gap-2">
                          <EmployeeAvatar
                            size={32}
                            firstName={emp.firstName}
                            lastName={emp.lastName}
                            imageUrl={emp.profileImageUrl}
                            seed={emp.id}
                          />
                          <span className="truncate">
                            {emp.firstName} {emp.lastName}
                          </span>
                        </span>
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
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-1.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                          <Link
                            href={`/employees/${emp.id}`}
                            className="inline-flex h-7 items-center gap-1 rounded-lg bg-secondary px-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80 motion-press"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                              <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                              <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41Z" clipRule="evenodd" />
                            </svg>
                            View
                          </Link>
                          <Link
                            href={`/employees/${emp.id}/edit`}
                            className="inline-flex h-7 items-center gap-1 rounded-lg bg-secondary px-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80 motion-press"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                              <path d="M2.695 14.763l-1.262 3.154a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.885L17.5 5.5a2.121 2.121 0 0 0-3-3L3.58 13.42a4 4 0 0 0-.885 1.343Z" />
                            </svg>
                            Edit
                          </Link>
                        </div>
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

          {/* Mobile card list */}
          <div className="block md:hidden space-y-3">
            {items.map((emp) => {
              return (
                <div
                  key={emp.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-soft"
                >
                  <input
                    type="checkbox"
                    aria-label={`Select ${emp.firstName} ${emp.lastName}`}
                    checked={selectedIds.has(emp.id)}
                    onChange={(e) => {
                      setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(emp.id);
                        else next.delete(emp.id);
                        return next;
                      });
                    }}
                    className="h-4 w-4 shrink-0 rounded border-input"
                  />
                  <EmployeeAvatar
                    size={40}
                    firstName={emp.firstName}
                    lastName={emp.lastName}
                    imageUrl={emp.profileImageUrl}
                    seed={emp.id}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {emp.firstName} {emp.lastName}
                      </p>
                      {emp.isActive ? (
                        <span className="shrink-0 rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-medium text-success">
                          Active
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {emp.employeeCode}
                      {emp.designation?.name ? ` · ${emp.designation.name}` : ''}
                    </p>
                  </div>
                  <Link
                    href={`/employees/${emp.id}`}
                    className="shrink-0 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-foreground motion-press hover:bg-secondary/80"
                  >
                    View
                  </Link>
                </div>
              );
            })}
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </div>
  );
}
