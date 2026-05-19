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
  schoolId:          string;
  admissionNo:       string;
  firstName:         string;
  lastName:          string;
  classId?:          string | null;
  dob?:              string | null;
  gender?:           string | null;
  address?:          string | null;
  bloodGroup?:       string | null;
  photoUrl?:         string | null;
  // Extended fields
  middleName?:       string | null;
  rollNo?:           string | null;
  srNo?:             string | null;
  aadhaarNo?:        string | null;
  nationality?:      string | null;
  motherTongue?:     string | null;
  category?:         string | null;
  religion?:         string | null;
  houseId?:          string | null;
  stream?:           string | null;
  admissionCategory?:string | null;
  boardingType?:     string | null;
  dietType?:         string | null;
  disabilityType?:   string | null;
  transportRouteId?: string | null;
  busStop?:          string | null;
  doctorName?:       string | null;
  doctorPhone?:      string | null;
  insuranceProvider?:string | null;
  passportNo?:       string | null;
  phone?:            string | null;
  emergencyContact?: string | null;
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
