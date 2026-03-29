export interface TeacherRow {
  id:            string;
  employee_id:   string | null;
  qualification: string | null;
  joining_date:  Date | null;
  status:        string;
  first_name:    string;
  last_name:     string;
  email:         string;
  phone:         string | null;
  avatar_url:    string | null;
}

export interface CreateTeacherInput {
  schoolId:       string;
  email:          string;
  password:       string;
  firstName:      string;
  lastName:       string;
  phone?:         string | null;
  employeeId?:    string | null;
  qualification?: string | null;
  joiningDate?:   string | null;
}
