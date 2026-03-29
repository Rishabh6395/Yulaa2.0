/**
 * Yulaa Mobile — API Client
 * Hits the same REST endpoints as the web app.
 * Set EXPO_PUBLIC_API_URL in .env to point to your deployed web app.
 */
import * as SecureStore from 'expo-secure-store';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://app.yulaa.in';

const TOKEN_KEY = 'yulaa_token';

// ─── Token storage ────────────────────────────────────────────────────────────
export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}
export async function setToken(token: string): Promise<void> {
  return SecureStore.setItemAsync(TOKEN_KEY, token);
}
export async function clearToken(): Promise<void> {
  return SecureStore.deleteItemAsync(TOKEN_KEY);
}

// ─── Base fetcher ─────────────────────────────────────────────────────────────
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
  return data as T;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export async function requestOtp(phone: string) {
  return apiFetch('/api/auth/request-otp', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOtp(phone: string, otp: string) {
  const data = await apiFetch<{ token: string; user: any }>('/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phone, otp }),
  });
  await setToken(data.token);
  return data;
}

// ─── Leave ────────────────────────────────────────────────────────────────────
export async function getLeaves() {
  return apiFetch<{ leaves: any[] }>('/api/leave');
}

export async function submitLeave(payload: {
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  student_id?: string;
}) {
  return apiFetch<{ leave: any }>('/api/leave', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getLeaveBalance() {
  return apiFetch<any>('/api/leave/balance');
}

// ─── Attendance ───────────────────────────────────────────────────────────────
export async function getAttendance(month: string, userId: string) {
  return apiFetch<any>(
    `/api/attendance?type=employee&teacher_user_id=${userId}&month=${month}`,
  );
}

// ─── Holidays ─────────────────────────────────────────────────────────────────
export async function getHolidays(year: string) {
  return apiFetch<any>(`/api/holidays?year=${year}`);
}

// ─── Announcements ────────────────────────────────────────────────────────────
export async function getAnnouncements() {
  return apiFetch<any>('/api/announcements');
}
