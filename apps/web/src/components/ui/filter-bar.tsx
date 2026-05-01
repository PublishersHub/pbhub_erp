'use client';

import type { ReactNode } from 'react';

interface FilterBarProps {
  children: ReactNode;
  onClear?: () => void;
  hasActiveFilters?: boolean;
}

export function FilterBar({
  children,
  onClear,
  hasActiveFilters,
}: FilterBarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      {children}
      {hasActiveFilters && onClear && (
        <button
          onClick={onClear}
          className="rounded-md border border-input px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150 motion-press"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
