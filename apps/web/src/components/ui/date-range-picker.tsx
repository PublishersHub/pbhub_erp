'use client';

import { useMemo } from 'react';

export interface DateRange {
  from: string;
  to: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (v: DateRange) => void;
  presets?: boolean;
  className?: string;
}

function isoDate(d: Date) {
  return d.toISOString().split('T')[0];
}

function presetRanges(): { label: string; range: DateRange }[] {
  const today = new Date();
  const startOf = (d: Date) => { const c = new Date(d); c.setHours(0, 0, 0, 0); return c; };
  const minus = (days: number) => { const c = startOf(today); c.setDate(c.getDate() - days); return c; };
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  return [
    { label: 'Today', range: { from: isoDate(startOf(today)), to: isoDate(today) } },
    { label: 'Last 7 days', range: { from: isoDate(minus(6)), to: isoDate(today) } },
    { label: 'Last 30 days', range: { from: isoDate(minus(29)), to: isoDate(today) } },
    { label: 'This month', range: { from: isoDate(monthStart), to: isoDate(today) } },
    { label: 'Last month', range: { from: isoDate(lastMonthStart), to: isoDate(lastMonthEnd) } },
  ];
}

export function DateRangePicker({ value, onChange, presets = true, className = '' }: DateRangePickerProps) {
  const presetList = useMemo(() => (presets ? presetRanges() : []), [presets]);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1 rounded-lg border border-input bg-card px-2 py-1">
        <input
          type="date"
          value={value.from}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
          className="border-0 bg-transparent text-sm text-foreground focus:outline-none"
        />
        <span className="text-muted-foreground">→</span>
        <input
          type="date"
          value={value.to}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
          className="border-0 bg-transparent text-sm text-foreground focus:outline-none"
        />
      </div>
      {presetList.map((p) => {
        const active = value.from === p.range.from && value.to === p.range.to;
        return (
          <button
            key={p.label}
            type="button"
            onClick={() => onChange(p.range)}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium motion-press ${
              active
                ? 'bg-primary text-primary-foreground'
                : 'border border-input text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
