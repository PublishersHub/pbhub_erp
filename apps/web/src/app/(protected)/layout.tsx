'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { AppShell } from '@/components/layout/app-shell';
import { ErrorBoundary } from '@/components/error-boundary';
import { type ReactNode } from 'react';

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <AppShell>
        <ErrorBoundary>{children}</ErrorBoundary>
      </AppShell>
    </ProtectedRoute>
  );
}
