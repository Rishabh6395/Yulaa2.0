export interface LoginInput {
  username: string;
  password: string;
  email?: string;
  login_context?: 'super-admin' | 'school-admin' | 'parent' | 'student' | null;
}

export interface AuthUserRole {
  role_code: string;
  role_name: string;
  school_id: string | null;
  school_name: string | null;
  is_primary: boolean;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: AuthUserRole[];
    primaryRole: string;
    schoolId: string | null;
    schoolName: string | null;
    mustResetPassword: boolean;
  };
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}
