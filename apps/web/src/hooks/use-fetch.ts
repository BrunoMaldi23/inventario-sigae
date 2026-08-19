"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiClientError, apiGet, apiGetPage, PaginationMeta } from "@/lib/api";

export function useFetch<T>(fn: () => Promise<T>, deps: unknown[]): { data: T | null; loading: boolean; error: string | null; reload: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const fnRef = useRef(fn);
  const depsKey = JSON.stringify(deps);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  const reload = useCallback(() => setAttempt((a) => a + 1), []);

  useEffect(() => {
    let cancelled = false;
    fnRef
      .current()
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiClientError ? e.message : "Error de conexión con el servidor");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [depsKey, attempt]);

  return { data, loading, error, reload };
}

export function usePage<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): {
  items: T[];
  meta: PaginationMeta;
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  setPage: (p: number) => void;
  setPageSize: (s: number) => void;
  params: Record<string, string | number | boolean | undefined>;
  setParam: (key: string, value: string | number | boolean | undefined) => void;
  reload: () => void;
} {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [extra, setExtra] = useState<Record<string, string | number | boolean | undefined>>({ ...(params ?? {}) });
  const [attempt, setAttempt] = useState(0);
  const [data, setData] = useState<{ items: T[]; meta: PaginationMeta }>({
    items: [],
    meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const extraKey = JSON.stringify(extra);

  useEffect(() => {
    let cancelled = false;
    apiGetPage<T>(path, { ...extra, page, pageSize })
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiClientError ? e.message : "Error de conexión con el servidor");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path, page, pageSize, extra, extraKey, attempt]);

  const setParam = useCallback((key: string, value: string | number | boolean | undefined) => {
    setPage(1);
    setExtra((prev) => {
      const next = { ...prev, [key]: value };
      return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
    });
  }, []);

  const reload = useCallback(() => {
    setAttempt((a) => a + 1);
  }, []);

  return { items: data.items, meta: data.meta, loading, error, page, pageSize, setPage, setPageSize, params: extra, setParam, reload };
}

export function useData<T>(path: string, params?: Record<string, string | number | boolean | undefined>): {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  return useFetch<T>(() => apiGet<T>(path, params), [path, JSON.stringify(params ?? {})]);
}

export function useSingle<T>(path: string): { data: T | null; loading: boolean; error: string | null; reload: () => void } {
  return useFetch<T>(() => apiGet<T>(path), [path]);
}