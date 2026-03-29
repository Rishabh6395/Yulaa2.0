// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface LoginPayload  { phone: string; otp: string; }
export interface LoginResponse { token: string; user: UserProfile; }

export interface UserProfile {
  id:        string;
  firstName: string;
  lastName:  string;
  phone:     string;
  roles:     UserRole[];
}

export interface UserRole {
  role_code: string;
  school_id: string | null;
  is_primary: boolean;
}

// ─── School ────────────────────────────────────────────────────────────────────
export interface School {
  id:        string;
  name:      string;
  address?:  string;
  email?:    string;
  phone?:    string;
  logoUrl?:  string;
  status:    string;
  city?:     string;
  state?:    string;
}

// ─── Student ───────────────────────────────────────────────────────────────────
export interface Student {
  id:          string;
  firstName:   string;
  lastName:    string;
  rollNumber?: string;
  classId:     string;
  schoolId:    string;
  parentId?:   string;
}

// ─── Attendance ────────────────────────────────────────────────────────────────
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'excused';

export interface AttendanceRecord {
  id:                string;
  date:              string;  // YYYY-MM-DD
  status:            AttendanceStatus;
  studentId?:        string;
  userId?:           string;
  punchInTime?:      string;
  punchOutTime?:     string;
  remarks?:          string | null;
  subjectAttendance?: Record<string, AttendanceStatus>;
  isLeaveLocked?:    boolean;
}

export interface MonthlyAttendance {
  records:  AttendanceRecord[];
  summary: {
    present:  number;
    absent:   number;
    late:     number;
    half_day: number;
    excused:  number;
    total:    number;
  };
}

// ─── Leave ────────────────────────────────────────────────────────────────────
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';

export interface LeaveRequest {
  id:          string;
  leaveType:   string;
  startDate:   string;  // ISO date string
  endDate:     string;
  reason:      string;
  status:      LeaveStatus;
  roleCode:    string;
  studentId?:  string | null;
  createdAt:   string;
  actions?:    LeaveAction[];
}

export interface LeaveAction {
  id:          string;
  step:        number;
  status:      LeaveStatus;
  remarks?:    string;
  reviewerId:  string;
  reviewerName?: string;
  createdAt:   string;
}

export interface LeaveBalance {
  leaveType:   string;
  totalDays:   number;
  usedDays:    number;
  remaining:   number;
}

export interface SubmitLeavePayload {
  leave_type:  string;
  start_date:  string;  // YYYY-MM-DD
  end_date:    string;
  reason:      string;
  student_id?: string;
}

// ─── Fee ─────────────────────────────────────────────────────────────────────
export interface FeeInvoice {
  id:          string;
  studentId:   string;
  amount:      number;
  dueDate:     string;
  status:      'pending' | 'paid' | 'overdue' | 'partial';
  paidAmount?: number;
  createdAt:   string;
}

// ─── Announcement ─────────────────────────────────────────────────────────────
export interface Announcement {
  id:        string;
  title:     string;
  body:      string;
  audience:  string[];
  createdAt: string;
}

// ─── Holiday ──────────────────────────────────────────────────────────────────
export interface Holiday {
  id:          string;
  date:        string;  // ISO date string
  name:        string;
  type:        'mandatory' | 'optional';
  academicYear: string;
}

export interface HolidaysResponse {
  holidays:    Holiday[];
  weekoffDays: number[];  // 0=Sun, 1=Mon ... 6=Sat
}

// ─── API response wrapper ─────────────────────────────────────────────────────
export interface ApiError {
  error:   string;
  details?: string;
}
