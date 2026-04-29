'use client';

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSort: string;
  currentOrder: 'asc' | 'desc';
  onSort: (key: string) => void;
  className?: string;
}

export function SortableHeader({
  label,
  sortKey,
  currentSort,
  currentOrder,
  onSort,
  className = '',
}: SortableHeaderProps) {
  const active = currentSort === sortKey;

  return (
    <th
      className={`cursor-pointer select-none px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 hover:text-gray-700 ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        <span className="inline-flex flex-col leading-none">
          <span
            className={`text-[8px] ${active && currentOrder === 'asc' ? 'text-blue-600' : 'text-gray-300'}`}
          >
            ▲
          </span>
          <span
            className={`text-[8px] ${active && currentOrder === 'desc' ? 'text-blue-600' : 'text-gray-300'}`}
          >
            ▼
          </span>
        </span>
      </div>
    </th>
  );
}
