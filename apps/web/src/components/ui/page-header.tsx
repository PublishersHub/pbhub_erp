'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, backHref, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex items-start justify-between">
      <div>
        {backHref && (
          <Link
            href={backHref}
            className="mb-1 inline-block text-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
          >
            &larr; Back
          </Link>
        )}
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
