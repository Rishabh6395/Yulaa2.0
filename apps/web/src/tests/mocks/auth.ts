import { vi } from 'vitest';

// ── User role factories ────────────────────────────────────────────────────

function role(code: string, schoolId: string | null = 'school-1', isPrimary = true) {
  return { role_code: code, school_id: schoolId, is_primary: isPrimary };
}

export const USERS = {
  superAdmin: {
    id: 'user-super', first_name: 'Super', last_name: 'Admin',
    roles: [role('super_admin', null)],
  },
  schoolAdmin: {
    id: 'user-admin', first_name: 'School', last_name: 'Admin',
    roles: [role('school_admin', 'school-1')],
  },
  principal: {
    id: 'user-principal', first_name: 'Principal', last_name: 'User',
    roles: [role('principal', 'school-1')],
  },
  hod: {
    id: 'user-hod', first_name: 'HOD', last_name: 'User',
    roles: [role('hod', 'school-1')],
  },
  teacher: {
    id: 'user-teacher', first_name: 'Teacher', last_name: 'User',
    roles: [role('teacher', 'school-1')],
  },
  parent: {
    id: 'user-parent', first_name: 'Parent', last_name: 'User',
    roles: [role('parent', 'school-1')],
  },
  wrongSchoolAdmin: {
    id: 'user-other', first_name: 'Other', last_name: 'Admin',
    roles: [role('school_admin', 'school-99')],
  },
};

// getUserFromRequest mock — set before each test
export let mockUser: typeof USERS.superAdmin | null = null;

export function setUser(user: typeof USERS.superAdmin | null) {
  mockUser = user;
}

vi.mock('@/lib/auth', () => ({
  getUserFromRequest: vi.fn().mockImplementation(async () => mockUser),
  signToken: vi.fn().mockReturnValue('mock-jwt-token'),
  verifyToken: vi.fn().mockReturnValue({ userId: 'user-1' }),
}));

// ── Request builder ────────────────────────────────────────────────────────

export function makeRequest(method: string, url: string, body?: any): Request {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer mock-token' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function makeGetRequest(path: string, params?: Record<string, string>): Request {
  const url = new URL(`http://localhost${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new Request(url.toString(), {
    headers: { Authorization: 'Bearer mock-token' },
  });
}
