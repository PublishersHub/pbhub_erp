'use client';

import { type ReactNode } from 'react';

interface DetailRowProps {
  label: string;
  children: ReactNode;
}

export function DetailRow({ label, children }: DetailRowProps) {
  return (
    <div className="grid grid-cols-3 gap-4 border-b border-gray-100 py-3">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="col-span-2 text-sm text-gray-900">{children || '—'}</dd>
    </div>
  );
}
