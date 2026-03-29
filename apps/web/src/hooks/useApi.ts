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
 */
export function useApi<T = any>(url: string | null) {
  return useSWR<T>(url, fetcher, {
    revalidateOnFocus: false,      // don't re-fetch just because user switched windows
    dedupingInterval:  5 * 60_000, // same URL won't re-fetch within 5 minutes
    keepPreviousData:  true,       // show old data while new page loads (pagination)
  });
}

/**
 * Imperatively revalidate a URL from outside a component (e.g. after a POST).
 */
export function revalidate(url: string) {
  return globalMutate(url);
}
