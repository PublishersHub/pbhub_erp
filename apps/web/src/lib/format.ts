export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format an amount as PKR with proper grouping.
 *   formatCurrency(150000)   → "PKR 150,000"
 *   formatCurrency(1500.5)   → "PKR 1,500.50"
 *   formatCurrency(null)     → "—"
 */
export function formatCurrency(
  value: string | number | null | undefined,
  options: { decimals?: number; symbol?: string } = {},
): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  const decimals = options.decimals ?? (Number.isInteger(num) ? 0 : 2);
  const symbol = options.symbol ?? 'PKR';
  return `${symbol} ${num.toLocaleString('en-PK', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function employeeName(emp: { firstName: string; lastName: string } | null | undefined): string {
  if (!emp) return '—';
  return `${emp.firstName} ${emp.lastName}`;
}
