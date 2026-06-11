/**
 * Yulaa Mobile — API Client
 * Hits the same REST endpoints as the web app.
 * Set EXPO_PUBLIC_API_URL in .env to point to your deployed web app.
 */
import * as SecureStore from 'expo-secure-store';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://yulaa2-0.onrender.com';

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

/** Consolidated monthly view: records + holidays + leaves + summary */
export const getAttendanceMonthly = (month: string, userId?: string) => {
  const qs = new URLSearchParams({ month });
  if (userId) qs.set('user_id', userId);
  return apiFetch<any>(`/api/attendance/monthly?${qs}`);
};

/** Daily attendance detail for a specific date */
export const getAttendanceDaily = (date: string, userId?: string) => {
  const qs = new URLSearchParams();
  if (userId) qs.set('user_id', userId);
  const query = qs.toString() ? `?${qs}` : '';
  return apiFetch<any>(`/api/attendance/daily/${date}${query}`);
};

/** Employee check-in (punch in) */
export const checkIn  = () => apiFetch<any>('/api/attendance/checkin',  { method: 'POST' });

/** Employee check-out (punch out) */
export const checkOut = () => apiFetch<any>('/api/attendance/checkout', { method: 'POST' });

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

// ─── Profile ──────────────────────────────────────────────────────────────────
export const getProfile = () => apiFetch<any>('/api/profile');

// ─── Homework ─────────────────────────────────────────────────────────────────
export const getHomework       = (p?: string) => apiFetch<any>(`/api/homework${p ? '?' + p : ''}`);
export const submitHomework    = (body: any)  => apiFetch<any>('/api/homework', { method: 'POST', body: JSON.stringify(body) });
export const getHomeworkSubmissions = (p?: string) => apiFetch<any>(`/api/homework/submissions${p ? '?' + p : ''}`);

// ─── Exams ────────────────────────────────────────────────────────────────────
export const getExamResults = (p?: string) => apiFetch<any>(`/api/exam${p ? '?' + p : ''}`);

// ─── Schools (super admin) ───────────────────────────────────────────────────
export const getSchools = () => apiFetch<any>('/api/schools');

// ─── Super admin config ───────────────────────────────────────────────────────
export const getSuperAdminKpiConfig       = ()           => apiFetch<any>('/api/super-admin/kpi-config');
export const getAdmissionWorkflow         = ()           => apiFetch<any>('/api/admission/workflow');
export const getSuperAdminUsers           = (p?: string) => apiFetch<any>(`/api/super-admin/users${p ? '?' + p : ''}`);
export const getMasterItems               = (type: string) => apiFetch<any>(`/api/masters/${type}`);
export const getSuperAdminConsultants     = (p?: string) => apiFetch<any>(`/api/super-admin/consultants${p ? '?' + p : ''}`);
export const getSuperAdminVendors         = (p?: string) => apiFetch<any>(`/api/super-admin/vendors${p ? '?' + p : ''}`);
export const getSuperAdminOnlineClassConfig = ()         => apiFetch<any>('/api/super-admin/online-class-config');
export const getSuperAdminCourses         = (p?: string) => apiFetch<any>(`/api/super-admin/courses${p ? '?' + p : ''}`);
export const getSuperAdminQueries         = (p?: string) => apiFetch<any>(`/api/super-admin/queries${p ? '?' + p : ''}`);
export const getLocationMasters           = ()           => apiFetch<any>('/api/super-admin/location-masters');
export const getSchoolDetail              = (id: string) => apiFetch<any>(`/api/schools/${id}`);

// ─── Academic ─────────────────────────────────────────────────────────────────
export const getTimetable         = (p?: string) => apiFetch<any>(`/api/timetable/teacher${p ? '?' + p : ''}`);
export const getSyllabus          = (p?: string) => apiFetch<any>(`/api/syllabus${p ? '?' + p : ''}`);
export const getScheduling        = (p?: string) => apiFetch<any>(`/api/schedule${p ? '?' + p : ''}`);
export const getHomeworkItems     = (p?: string) => apiFetch<any>(`/api/homework${p ? '?' + p : ''}`);
export const submitHomeworkItem   = (body: any)  => apiFetch<any>('/api/homework', { method: 'POST', body: JSON.stringify(body) });

// ─── Assessment ───────────────────────────────────────────────────────────────
export const getExamSchedule      = ()           => apiFetch<any>('/api/exams/datesheet');
export const getExamResults       = (p?: string) => apiFetch<any>(`/api/exams/results${p ? '?' + p : ''}`);
export const getPerformance       = (p?: string) => apiFetch<any>(`/api/performance${p ? '?' + p : ''}`);

// ─── Operations ───────────────────────────────────────────────────────────────
export const getQueries           = (p?: string) => apiFetch<any>(`/api/queries${p ? '?' + p : ''}`);
export const createQueryItem      = (body: any)  => apiFetch<any>('/api/queries', { method: 'POST', body: JSON.stringify(body) });
export const getTransport         = (p?: string) => apiFetch<any>(`/api/transport${p ? '?' + p : ''}`);
export const getCompliance        = (p?: string) => apiFetch<any>(`/api/compliance${p ? '?' + p : ''}`);
export const getSchoolInventory   = (p?: string) => apiFetch<any>(`/api/school-inventory${p ? '?' + p : ''}`);
export const getLetterTemplates   = (p?: string) => apiFetch<any>(`/api/letter-templates${p ? '?' + p : ''}`);
export const getYearbook          = (p?: string) => apiFetch<any>(`/api/yearbook${p ? '?' + p : ''}`);
export const getContracts         = ()           => apiFetch<any>('/api/contracts');

// ─── Consultant ───────────────────────────────────────────────────────────────
export const getConsultantSessions      = () => apiFetch<any>('/api/consultant/sessions');
export const getConsultantAvailability  = () => apiFetch<any>('/api/career-sessions/availability');
export const getConsultantBookings      = () => apiFetch<any>('/api/career-sessions/bookings');
export const updateConsultantAvailability = (body: any) =>
  apiFetch<any>('/api/career-sessions/availability', { method: 'POST', body: JSON.stringify(body) });

// ─── Career sessions (non-consultant) ─────────────────────────────────────────
export const getCareerSessions    = (p?: string) => apiFetch<any>(`/api/career-sessions${p ? '?' + p : ''}`);
export const manageCareerSessions = (p?: string) => apiFetch<any>(`/api/career-sessions${p ? '?' + p : ''}`);

// ─── Vendor ───────────────────────────────────────────────────────────────────
export const getVendorManage      = (p?: string) => apiFetch<any>(`/api/vendor${p ? '?' + p : ''}`);
export const getVendorOrders      = (p?: string) => apiFetch<any>(`/api/vendor/orders${p ? '?' + p : ''}`);
export const getVendorProductList = (p?: string) => apiFetch<any>(`/api/vendor/products${p ? '?' + p : ''}`);
export const getVendorRatings     = ()           => apiFetch<any>('/api/vendor/ratings');

// ─── Holidays ─────────────────────────────────────────────────────────────────
export const getHolidays = (year: string) => apiFetch<any>(`/api/holidays?year=${year}`);

// ─── Reports ──────────────────────────────────────────────────────────────────
export const getReports = (params: string) => apiFetch<any>(`/api/reports?${params}`);

// ─── Online Classes ───────────────────────────────────────────────────────────
export const getOnlineClasses = (p?: string) =>
  apiFetch<any>(`/api/online-classes${p ? '?' + p : ''}`);
export const createOnlineClass = (body: any) =>
  apiFetch<any>('/api/online-classes', { method: 'POST', body: JSON.stringify(body) });
export const updateOnlineClass = (body: any) =>
  apiFetch<any>('/api/online-classes', { method: 'PATCH', body: JSON.stringify(body) });
export const getOnlineClassAttendance = (onlineClassId: string) =>
  apiFetch<any>(`/api/online-classes/attendance?online_class_id=${onlineClassId}`);
export const saveOnlineClassAttendance = (body: any) =>
  apiFetch<any>('/api/online-classes/attendance', { method: 'POST', body: JSON.stringify(body) });

// ─── Courses ──────────────────────────────────────────────────────────────────
export const getCourses       = (p?: string) => apiFetch<any>(`/api/courses${p ? '?' + p : ''}`);
export const getCourse        = (id: string) => apiFetch<any>(`/api/courses/${id}`);
export const enrollCourse     = (id: string) =>
  apiFetch<any>(`/api/courses/${id}/enroll`, { method: 'POST', body: JSON.stringify({}) });
export const getMyEnrollments = ()           => apiFetch<any>('/api/courses/my-enrollments');
export const updateProgress   = (id: string, body: any) =>
  apiFetch<any>(`/api/courses/${id}/progress`, { method: 'PATCH', body: JSON.stringify(body) });

// ─── Career Sessions ──────────────────────────────────────────────────────────
export const getConsultants = (p?: string) =>
  apiFetch<any>(`/api/career-sessions/consultants${p ? '?' + p : ''}`);
export const getConsultantSlots = (consultantId: string) =>
  apiFetch<any>(`/api/career-sessions/slots?consultant_id=${consultantId}`);
export const getMyBookings = () => apiFetch<any>('/api/career-sessions/my-bookings');
export const bookSession = (body: any) =>
  apiFetch<any>('/api/career-sessions/book', { method: 'POST', body: JSON.stringify(body) });
export const cancelBooking = (id: string) =>
  apiFetch<any>('/api/career-sessions/my-bookings', { method: 'PATCH', body: JSON.stringify({ id, action: 'cancel' }) });
export const rateSession = (id: string, rating: number, review?: string) =>
  apiFetch<any>('/api/career-sessions/my-bookings', { method: 'PATCH', body: JSON.stringify({ id, action: 'rate', rating, review }) });

// ─── Vendor / Marketplace ─────────────────────────────────────────────────────
export const getVendors = (p?: string) =>
  apiFetch<any>(`/api/vendor${p ? '?' + p : ''}`);
export const getVendorProducts = (vendorId: string) =>
  apiFetch<any>(`/api/vendor/products?vendor_id=${vendorId}`);
export const placeOrder = (body: any) =>
  apiFetch<any>('/api/vendor/orders', { method: 'POST', body: JSON.stringify(body) });
export const getMyOrders = () => apiFetch<any>('/api/vendor/orders?mine=true');
export const rateVendor = (body: any) =>
  apiFetch<any>('/api/vendor/ratings', { method: 'POST', body: JSON.stringify(body) });

// ─── Report Cards ─────────────────────────────────────────────────────────────
export const getReportCards = (p?: string) => apiFetch<any>(`/api/report-cards${p ? '?' + p : ''}`);

// ─── Gate Pass ────────────────────────────────────────────────────────────────
export const getGatePasses      = (p?: string) => apiFetch<any>(`/api/attendance/gate-pass${p ? '?' + p : ''}`);
export const issueGatePass      = (body: any)  => apiFetch<any>('/api/attendance/gate-pass', { method: 'POST', body: JSON.stringify(body) });
export const updateGatePass     = (id: string, body: any) => apiFetch<any>(`/api/attendance/gate-pass/${id}`, { method: 'PATCH', body: JSON.stringify(body) });

// ─── Attendance Regularization ───────────────────────────────────────────────
export const getRegularizations   = (p?: string) => apiFetch<any>(`/api/attendance/regularization${p ? '?' + p : ''}`);
export const submitRegularization = (body: any)  => apiFetch<any>('/api/attendance/regularization', { method: 'POST', body: JSON.stringify(body) });
export const reviewRegularization = (body: any)  => apiFetch<any>('/api/attendance/regularization', { method: 'PATCH', body: JSON.stringify(body) });

// ─── Class Diary ──────────────────────────────────────────────────────────────
export const getDiaryEntries  = (p?: string) => apiFetch<any>(`/api/diary${p ? '?' + p : ''}`);
export const createDiaryEntry = (body: any)  => apiFetch<any>('/api/diary', { method: 'POST', body: JSON.stringify(body) });

// ─── HRMS / Payroll ───────────────────────────────────────────────────────────
export const getPayroll      = (p?: string) => apiFetch<any>(`/api/hrms/payroll${p ? '?' + p : ''}`);
export const getSalaryConfig = ()           => apiFetch<any>('/api/hrms/salary-config');

// ─── Library ──────────────────────────────────────────────────────────────────
export const getLibraryBooks  = (p?: string) => apiFetch<any>(`/api/library/books${p ? '?' + p : ''}`);
export const getLibraryIssues = (p?: string) => apiFetch<any>(`/api/library/issues${p ? '?' + p : ''}`);

// ─── Hostel ───────────────────────────────────────────────────────────────────
export const getHostelInfo = (p?: string) => apiFetch<any>(`/api/hostel${p ? '?' + p : ''}`);

// ─── Board Exam Tracker ───────────────────────────────────────────────────────
export const getBoardExamTracker    = (p?: string) => apiFetch<any>(`/api/board-exam-tracker${p ? '?' + p : ''}`);
export const updateBoardExamTracker = (id: string, body: any) => apiFetch<any>(`/api/board-exam-tracker/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
