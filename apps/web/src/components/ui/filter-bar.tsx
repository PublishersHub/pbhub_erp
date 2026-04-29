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
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
