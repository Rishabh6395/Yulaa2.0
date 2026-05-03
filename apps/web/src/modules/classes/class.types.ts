export interface ClassRow {
  id:                    string;
  name:                  string;
  grade:                 string;
  section:               string;
  capacity:              number;
  academic_year:         string;
  teacher_name:          string | null;
  class_teacher_user_id: string | null;
  student_count:         number;
}

export interface CreateClassInput {
  schoolId:        string;
  grade:           string;
  section:         string;
  name?:           string;
  classTeacherId?: string | null;
  academicYear?:   string;
  maxStudents?:    number;
}

export interface UpdateClassInput {
  id:              string;
  schoolId:        string;
  grade?:          string;
  section?:        string;
  name?:           string;
  classTeacherId?: string | null;
  academicYear?:   string;
  maxStudents?:    number;
}
