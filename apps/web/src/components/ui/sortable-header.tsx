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
      className={`cursor-pointer select-none px-4 py-3 text-left text-xs font-medium uppercase transition-colors duration-150 ${active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'} ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        <span className="inline-flex flex-col leading-none">
          <span
            className={`text-[8px] transition-colors duration-150 ${active && currentOrder === 'asc' ? 'text-primary' : 'text-muted-foreground/60'}`}
          >
            ▲
          </span>
          <span
            className={`text-[8px] transition-colors duration-150 ${active && currentOrder === 'desc' ? 'text-primary' : 'text-muted-foreground/60'}`}
          >
            ▼
          </span>
        </span>
      </div>
    </th>
  );
}
