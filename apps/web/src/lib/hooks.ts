'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

interface UseAsyncResult<T> {
  data: T | null;
  error: string | null;
  errorStatus: number | undefined;
  loading: boolean;
  refetch: () => void;
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): UseAsyncResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setErrorStatus(undefined);
    fn()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Something went wrong');
          setErrorStatus((err as any)?.status);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  return { data, error, errorStatus, loading, refetch };
}

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  const isFirst = useRef(true);

  useEffect(() => {
    // Don't debounce the initial value
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/**
 * Check if the current user has a specific permission.
 * Returns a stable `can(permission)` function and a `hasAny(...permissions)` helper.
 */
export function usePermission() {
  const { user } = useAuth();
  const permSet = useMemo(
    () => new Set(user?.user?.permissions ?? []),
    [user?.user?.permissions],
  );

  const can = useCallback(
    (permission: string) => permSet.has(permission),
    [permSet],
  );

  const hasAny = useCallback(
    (...permissions: string[]) => permissions.some((p) => permSet.has(p)),
    [permSet],
  );

  return { can, hasAny };
}

/**
 * Manage page / sort / order via URL search params.
 * Returns setParams for updating any URL param (resets page when filters change).
 */
export function useTableParams(
  defaults: { sort?: string; order?: 'asc' | 'desc'; pageSize?: number } = {},
) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = parseInt(searchParams.get('page') || '1', 10);
  const sort = searchParams.get('sort') || defaults.sort || '';
  const order =
    (searchParams.get('order') as 'asc' | 'desc') ||
    defaults.order ||
    'desc';
  const pageSize = defaults.pageSize || 20;

  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') params.delete(key);
        else params.set(key, value);
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const setPage = useCallback(
    (p: number) => setParams({ page: p > 1 ? String(p) : null }),
    [setParams],
  );

  const setSort = useCallback(
    (key: string) => {
      if (sort === key) {
        setParams({
          sort: key,
          order: order === 'asc' ? 'desc' : 'asc',
          page: null,
        });
      } else {
        setParams({ sort: key, order: 'desc', page: null });
      }
    },
    [sort, order, setParams],
  );

  return { page, sort, order, pageSize, setPage, setSort, setParams, searchParams };
}

/** Client-side pagination over an array. */
export function paginateLocal<T>(
  data: T[],
  page: number,
  pageSize: number,
): { items: T[]; total: number; totalPages: number; page: number } {
  const total = data.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return { items: data.slice(start, start + pageSize), total, totalPages, page: safePage };
}

/** Client-side sorting over an array. Returns original if sort is empty. */
export function sortLocal<T>(
  data: T[],
  sort: string,
  order: 'asc' | 'desc',
  getValue: (item: T, key: string) => string | number | null | undefined,
): T[] {
  if (!sort) return data;
  return [...data].sort((a, b) => {
    const va = getValue(a, sort);
    const vb = getValue(b, sort);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    const cmp =
      typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb));
    return order === 'asc' ? cmp : -cmp;
  });
}
