/**
 * Yulaa Mobile — API Client
 * Hits the same REST endpoints as the web app.
 * Set EXPO_PUBLIC_API_URL in .env to point to your deployed web app.
 */
import * as SecureStore from 'expo-secure-store';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://app.yulaa.in';

const TOKEN_KEY = 'yulaa_token';

// ─── Token storage ────────────────────────────────────────────────────────────
export const getToken   = () => SecureStore.getItemAsync(TOKEN_KEY);
export const setToken   = (t: string) => SecureStore.setItemAsync(TOKEN_KEY, t);
export const clearToken = () => SecureStore.deleteItemAsync(TOKEN_KEY);

// ─── Base fetcher ─────────────────────────────────────────────────────────────
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
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
export const requestOtp = (phone: string) =>
  apiFetch('/api/auth/request-otp', { method: 'POST', body: JSON.stringify({ phone }) });

export const verifyOtp = (phone: string, otp: string) =>
  apiFetch<{ token: string; user: any }>('/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phone, otp }),
  });

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const getDashboard = () => apiFetch<any>('/api/dashboard');

// ─── Admissions ───────────────────────────────────────────────────────────────
export const getAdmissions = (p?: string) =>
  apiFetch<any>(`/api/admission/applications${p ? '?' + p : ''}`);
export const submitAdmission = (body: any) =>
  apiFetch<any>('/api/admission/apply', { method: 'POST', body: JSON.stringify(body) });
export const updateAdmissionStatus = (id: string, status: string, note?: string) =>
  apiFetch<any>(`/api/admission/applications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, note }),
  });

// ─── Students ─────────────────────────────────────────────────────────────────
export const getStudents   = (p?: string) => apiFetch<any>(`/api/students${p ? '?' + p : ''}`);
export const getStudent    = (id: string)  => apiFetch<any>(`/api/students/${id}`);
export const createStudent = (body: any)   => apiFetch<any>('/api/students', { method: 'POST', body: JSON.stringify(body) });
export const updateStudent = (id: string, body: any) =>
  apiFetch<any>(`/api/students/${id}`, { method: 'PUT', body: JSON.stringify(body) });

// ─── Teachers ─────────────────────────────────────────────────────────────────
export const getTeachers = (p?: string) => apiFetch<any>(`/api/teachers${p ? '?' + p : ''}`);
export const getTeacher  = (id: string)  => apiFetch<any>(`/api/teachers/${id}`);

// ─── Parents ──────────────────────────────────────────────────────────────────
export const getParents = (p?: string) => apiFetch<any>(`/api/parents${p ? '?' + p : ''}`);

// ─── Classes ──────────────────────────────────────────────────────────────────
export const getClasses = () => apiFetch<any>('/api/classes');

// ─── Fees ─────────────────────────────────────────────────────────────────────
export const getFees          = (p?: string) => apiFetch<any>(`/api/fees${p ? '?' + p : ''}`);
export const getFeeStructures = ()            => apiFetch<any>('/api/fees/structures');
export const recordPayment    = (body: any)   =>
  apiFetch<any>('/api/fees/payment', { method: 'POST', body: JSON.stringify(body) });

// ─── Leave ────────────────────────────────────────────────────────────────────
export const getLeaves      = () => apiFetch<{ leaves: any[] }>('/api/leave');
export const submitLeave    = (body: any) =>
  apiFetch<any>('/api/leave', { method: 'POST', body: JSON.stringify(body) });
export const reviewLeave    = (id: string, action: string, comment?: string) =>
  apiFetch<any>('/api/leave', { method: 'PATCH', body: JSON.stringify({ id, action, comment }) });
export const getLeaveBalance = () => apiFetch<any>('/api/leave/balance');
export const getLeaveTypes   = () => apiFetch<any>('/api/leave/types');

// ─── Attendance ───────────────────────────────────────────────────────────────
export const getAttendance  = (params: string) => apiFetch<any>(`/api/attendance?${params}`);
export const markAttendance = (body: any) =>
  apiFetch<any>('/api/attendance', { method: 'POST', body: JSON.stringify(body) });

// ─── Events ───────────────────────────────────────────────────────────────────
export const getEvents   = () => apiFetch<any>('/api/events');
export const createEvent = (body: any) =>
  apiFetch<any>('/api/events', { method: 'POST', body: JSON.stringify(body) });

// ─── Exams ────────────────────────────────────────────────────────────────────
export const getExams = () => apiFetch<any>('/api/exams');

// ─── Announcements ────────────────────────────────────────────────────────────
export const getAnnouncements    = () => apiFetch<any>('/api/announcements');
export const createAnnouncement  = (body: any) =>
  apiFetch<any>('/api/announcements', { method: 'POST', body: JSON.stringify(body) });

// ─── Form config ──────────────────────────────────────────────────────────────
export const getFormConfig = (schoolId: string, formId: string) =>
  apiFetch<any>(`/api/form-config?schoolId=${schoolId}&formId=${formId}`);
export const saveFormConfig = (body: any) =>
  apiFetch<any>('/api/form-config', { method: 'POST', body: JSON.stringify(body) });

// ─── Schools (super admin) ───────────────────────────────────────────────────
export const getSchools = () => apiFetch<any>('/api/schools');

// ─── Holidays ─────────────────────────────────────────────────────────────────
export const getHolidays = (year: string) => apiFetch<any>(`/api/holidays?year=${year}`);

// ─── Reports ──────────────────────────────────────────────────────────────────
export const getReports = (params: string) => apiFetch<any>(`/api/reports?${params}`);
