export interface StudentListParams {
  schoolId: string;
  status?:  string;
  classId?: string;
  search?:  string;
  page:     number;
  limit:    number;
  skip:     number;
}

export interface CreateStudentInput {
  schoolId:    string;
  admissionNo: string;
  firstName:   string;
  lastName:    string;
  classId?:    string | null;
  dob?:        string | null;
  gender?:     string | null;
  address?:    string | null;
  bloodGroup?: string | null;
}

export interface UpdateStudentInput {
  id:     string;
  status: string;
}

export interface StudentRow {
  id:               string;
  admission_no:     string;
  first_name:       string;
  last_name:        string;
  dob:              Date | null;
  gender:           string | null;
  admission_status: string;
  admission_date:   Date;
  photo_url:        string | null;
  address:          string | null;
  grade:            string | null;
  section:          string | null;
  class_id:         string | null;
  parents:          Array<{ name: string; phone: string | null; email: string }>;
}
