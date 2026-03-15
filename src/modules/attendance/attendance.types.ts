export interface AttendanceRecord {
  student_id:    string;
  first_name:    string;
  last_name:     string;
  admission_no:  string;
  status:        string | null;
  remarks:       string | null;
  attendance_id: string | null;
}

export interface MarkAttendanceInput {
  schoolId: string;
  classId:  string;
  date:     Date;
  markedBy: string;
  records:  Array<{ student_id: string; status: string; remarks?: string }>;
}

export interface ClassAttendanceSummary {
  class_id: string;
  grade:    string;
  section:  string;
  present:  number;
  absent:   number;
  late:     number;
  total:    number;
}
