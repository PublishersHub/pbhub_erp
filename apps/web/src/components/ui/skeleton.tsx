import { type HTMLAttributes } from 'react';

export function Skeleton({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-md bg-muted/60 ${className}`}
      {...rest}
    />
  );
}

interface SkeletonRowProps {
  cols: number;
  className?: string;
}

/**
 * A row of N skeleton cells matching a typical table row's layout.
 * Used inside a <tr> wrapper or as a generic content placeholder.
 */
export function SkeletonRow({ cols, className = '' }: SkeletonRowProps) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i === 0 ? 'w-1/4' : 'flex-1'}`} />
      ))}
    </div>
  );
}

interface SkeletonTableProps {
  rows?: number;
  cols?: number;
}

/**
 * Renders N skeleton rows inside a card-styled wrapper that matches the
 * actual list-page table treatment. Drop in place of <Loading /> on list pages.
 */
export function SkeletonTable({ rows = 6, cols = 5 }: SkeletonTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <div className="border-b border-border bg-muted/60 px-4 py-3">
        <SkeletonRow cols={cols} />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-4 py-4">
            <SkeletonRow cols={cols} />
          </div>
        ))}
      </div>
    </div>
  );
}
