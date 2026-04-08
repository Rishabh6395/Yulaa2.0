'use client';

import useSWR, { mutate as globalMutate } from 'swr';

function getToken(): string {
  return typeof window !== 'undefined' ? (localStorage.getItem('token') ?? '') : '';
}

async function fetcher(url: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) {
    const err: any = new Error('API error');
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * SWR-backed data fetcher.
 * - First load: fetches from API and caches in browser memory.
 * - Tab switching: returns cached data instantly (no spinner).
 * - Call mutate() after a write to refresh.
 *
 * @param url  API path, e.g. "/api/students?page=1". Pass null to skip fetch.
 * @param opts  Optional SWR config overrides.
 */
export function useApi<T = any>(url: string | null, opts?: { dedupingInterval?: number; revalidateOnFocus?: boolean }) {
  return useSWR<T>(url, fetcher, {
    revalidateOnFocus: opts?.revalidateOnFocus ?? false,
    dedupingInterval:  opts?.dedupingInterval  ?? 5 * 60_000,
    keepPreviousData:  true,
  });
}

/**
 * Imperatively revalidate a URL from outside a component (e.g. after a POST).
 */
export function revalidate(url: string) {
  return globalMutate(url);
}
