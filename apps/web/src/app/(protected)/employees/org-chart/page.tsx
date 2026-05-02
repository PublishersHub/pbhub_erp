'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useAsync } from '@/lib/hooks';
import { listEmployees } from '@/lib/employee-api';
import { PageHeader } from '@/components/ui/page-header';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorMessage } from '@/components/ui/error-message';
import type { Employee } from '@/types/employee';

// ─── Tree data structure ─────────────────────────────────────────────────────

interface TreeNode {
  id: string;
  data: Employee;
  children: TreeNode[];
}

function buildForest(employees: Employee[]): TreeNode[] {
  const byId = new Map(
    employees.map((e) => [e.id, { id: e.id, data: e, children: [] as TreeNode[] }]),
  );
  const roots: TreeNode[] = [];
  for (const e of employees) {
    const node = byId.get(e.id)!;
    if (e.reportingManagerId && byId.has(e.reportingManagerId)) {
      byId.get(e.reportingManagerId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  function sortDeep(nodes: TreeNode[]) {
    nodes.sort((a, b) =>
      `${a.data.firstName} ${a.data.lastName}`.localeCompare(
        `${b.data.firstName} ${b.data.lastName}`,
      ),
    );
    nodes.forEach((n) => sortDeep(n.children));
  }
  sortDeep(roots);
  return roots;
}

// ─── Avatar helpers ───────────────────────────────────────────────────────────

const GRADIENT_CLASSES = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-orange-500 to-amber-500',
  'from-rose-500 to-pink-500',
  'from-indigo-500 to-blue-600',
  'from-teal-500 to-emerald-600',
  'from-fuchsia-500 to-violet-500',
];

function gradientFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return GRADIENT_CLASSES[hash % GRADIENT_CLASSES.length];
}

function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

// ─── Employee card ────────────────────────────────────────────────────────────

function EmployeeCard({ node }: { node: TreeNode }) {
  const { data: emp } = node;
  const gradient = gradientFor(emp.id);
  const inactive = !emp.isActive;

  return (
    <Link
      href={`/employees/${emp.id}`}
      className={`block w-44 rounded-2xl border border-hairline bg-surface-elevated p-3 shadow-soft transition-all motion-lift hover:shadow-md hover:border-primary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring${inactive ? ' opacity-60' : ''}`}
    >
      {/* Top row: avatar + name/code */}
      <div className="flex items-center gap-2">
        {/* Gradient initials avatar */}
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-xs font-bold text-white shadow-sm`}
        >
          {initials(emp.firstName, emp.lastName)}
        </div>
        {/* Name + employee code */}
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold leading-tight text-foreground">
            {emp.firstName} {emp.lastName}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">{emp.employeeCode}</p>
        </div>
      </div>

      {/* Designation */}
      {emp.designation?.name && (
        <p className="mt-2 truncate text-xs text-muted-foreground">{emp.designation.name}</p>
      )}

      {/* Department chip */}
      {emp.department?.name && (
        <span className="mt-1.5 inline-block max-w-full truncate rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          {emp.department.name}
        </span>
      )}
    </Link>
  );
}

// ─── Recursive tree node ──────────────────────────────────────────────────────

function OrgTreeNode({ node }: { node: TreeNode }) {
  return (
    <div className="flex flex-col items-center">
      <EmployeeCard node={node} />

      {node.children.length > 0 && (
        <>
          {/* Vertical connector from parent card down */}
          <div className="h-6 w-px bg-border" />

          {/* Children row */}
          <div className="relative flex items-start gap-6">
            {/* Horizontal line spanning across all children */}
            {node.children.length > 1 && (
              <div className="absolute left-0 right-0 top-0 h-px bg-border" />
            )}

            {node.children.map((child) => (
              <div key={child.id} className="relative flex flex-col items-center pt-6">
                {/* Vertical connector from horizontal bar down to child */}
                <div className="absolute left-1/2 top-0 h-6 w-px -translate-x-1/2 bg-border" />
                <OrgTreeNode node={child} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrgChartPage() {
  const { data, error, loading, refetch } = useAsync(() => listEmployees(), []);

  const forest = useMemo(() => (data ? buildForest(data) : []), [data]);

  return (
    <div>
      <PageHeader
        title="Org chart"
        description="Reporting hierarchy across the company"
      />

      {loading && <Loading />}
      {error && <ErrorMessage message={error} onRetry={refetch} />}

      {!loading && !error && data && data.length === 0 && (
        <EmptyState
          variant="default"
          title="No employees yet"
          description="Add employees to see the org chart."
        />
      )}

      {!loading && !error && forest.length > 0 && (
        <div className="overflow-x-auto pb-8">
          <div className="min-w-max mx-auto pt-4">
            {forest.length === 1 ? (
              <OrgTreeNode node={forest[0]} />
            ) : (
              /* Multiple roots: render side-by-side */
              <div className="flex items-start gap-12">
                {forest.map((root) => (
                  <OrgTreeNode key={root.id} node={root} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
