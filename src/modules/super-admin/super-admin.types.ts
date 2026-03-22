export interface SchoolRow {
  id:               string;
  name:             string;
  email:            string | null;
  phone:            string | null;
  address:          string | null;
  status:           string;
  subscriptionPlan: string;
  createdAt:        Date;
  _count:           { students: number; teachers: number };
}

export interface UserRow {
  id:        string;
  email:     string;
  firstName: string;
  lastName:  string;
  phone:     string | null;
  status:    string;
  createdAt: Date;
  userRoles: Array<{
    id:       string;
    roleId:   string;
    schoolId: string | null;
    isPrimary: boolean;
    role:     { id: string; code: string; displayName: string };
    school:   { id: string; name: string } | null;
  }>;
}

export interface CreateSchoolInput {
  name:             string;
  email?:           string | null;
  phone?:           string | null;
  address?:         string | null;
  city?:            string | null;
  state?:           string | null;
  website?:         string | null;
  latitude?:        number | null;
  longitude?:       number | null;
  boardType?:       string | null;
  subscriptionPlan?: string;
}

export interface UpdateSchoolInput {
  id:               string;
  name?:            string;
  email?:           string | null;
  phone?:           string | null;
  address?:         string | null;
  city?:            string | null;
  state?:           string | null;
  website?:         string | null;
  latitude?:        number;
  longitude?:       number;
  boardType?:       string | null;
  subscriptionPlan?: string;
  status?:          string;
}

export interface CreateUserInput {
  firstName: string;
  lastName:  string;
  email:     string;
  phone?:    string | null;
  password:  string;
  roleId:    string;
  schoolId?: string | null;
}
