export interface AdminDashboardStats {
  totalStudents:    number;
  approvedStudents: number;
  pendingAdmissions: number;
  totalTeachers:    number;
  totalClasses:     number;
  todayAttendance:  { present: number; absent: number; late: number; total: number; rate: number };
  fees:             { totalFees: number; collected: number; pending: number; overdueCount: number };
}

export interface ParentDashboardStats {
  todayStatus:     string | null;
  monthAttendance: { present: number; absent: number; late: number; total: number; rate: number };
  fees:            { total: number; collected: number; pending: number; overdueCount: number; dueCount: number };
}
