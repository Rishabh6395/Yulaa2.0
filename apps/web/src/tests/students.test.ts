import { describe, it, expect, beforeEach, vi } from 'vitest';
import './mocks/prisma';
import { resetPrisma } from './mocks/prisma';
import { setUser, USERS, makeRequest, makeGetRequest } from './mocks/auth';

// Mock the student service — route has no built-in role check; service handles validation
vi.mock('@/modules/students/student.service', () => ({
  listStudents:       vi.fn().mockResolvedValue({ students: [], total: 0, page: 1, limit: 20, totalPages: 0 }),
  createStudent:      vi.fn().mockResolvedValue({ id: 'stu-1', firstName: 'Rohan', lastName: 'Sharma', schoolId: 'school-1' }),
  updateStudent:      vi.fn().mockResolvedValue({ id: 'stu-1' }),
  createAndLinkParent: vi.fn().mockResolvedValue({}),
}));

import { GET, POST } from '@/app/api/students/route';
import { listStudents, createStudent } from '@/modules/students/student.service';

const STUDENT_ROW = {
  id: 'stu-1', admission_no: 'ADM001', first_name: 'Rohan', last_name: 'Sharma',
  grade: '10', section: 'A', class_id: 'cls-1', admission_status: 'active',
  dob: null, gender: null, photo_url: null, address: null, parents: [],
};

describe('🎓 STUDENTS MODULE', () => {
  beforeEach(() => {
    resetPrisma();
    vi.mocked(listStudents).mockResolvedValue({ students: [STUDENT_ROW], total: 1, page: 1, limit: 20, totalPages: 1 } as any);
    vi.mocked(createStudent).mockResolvedValue({ id: 'stu-1' } as any);
  });

  // ── Super Admin ────────────────────────────────────────────────────────

  describe('super_admin', () => {
    beforeEach(() => setUser(USERS.superAdmin));

    it('[+] can list students from any school via school_id param', async () => {
      const req = makeGetRequest('/api/students', { schoolId: 'school-1' });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.students).toHaveLength(1);
    });

    it('[+] can create a student in any school', async () => {
      const req = makeRequest('POST', '/api/students', {
        admission_no: 'ADM001', first_name: 'Rohan', last_name: 'Sharma', class_id: 'cls-1',
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
    });
  });

  // ── School Admin ───────────────────────────────────────────────────────

  describe('school_admin', () => {
    beforeEach(() => setUser(USERS.schoolAdmin));

    it('[+] can list own school students', async () => {
      const req = makeGetRequest('/api/students');
      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it('[+] can create student in own school', async () => {
      const req = makeRequest('POST', '/api/students', {
        admission_no: 'ADM002', first_name: 'Priya', last_name: 'Patel', class_id: 'cls-1',
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
    });

    it('[-] cannot create student without required fields', async () => {
      const { AppError } = await import('@/utils/errors');
      vi.mocked(createStudent).mockRejectedValueOnce(new AppError('Required fields: admission_no, first_name, last_name'));
      const req = makeRequest('POST', '/api/students', { first_name: 'Priya' });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  // ── Teacher ────────────────────────────────────────────────────────────

  describe('teacher', () => {
    beforeEach(() => setUser(USERS.teacher));

    it('[+] can view students in their school (read-only)', async () => {
      const req = makeGetRequest('/api/students');
      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it('[-] cannot create a student (service enforces restriction)', async () => {
      // The student service is expected to throw ForbiddenError for non-admin roles
      const { ForbiddenError } = await import('@/utils/errors');
      vi.mocked(createStudent).mockRejectedValueOnce(new ForbiddenError('Only admins can create students'));
      const req = makeRequest('POST', '/api/students', {
        admission_no: 'Z', first_name: 'X', last_name: 'Y', class_id: 'cls-1',
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });
  });

  // ── Parent ─────────────────────────────────────────────────────────────

  describe('parent', () => {
    beforeEach(() => setUser(USERS.parent));

    it('[-] cannot access student list (service enforces restriction)', async () => {
      const { ForbiddenError } = await import('@/utils/errors');
      vi.mocked(listStudents).mockRejectedValueOnce(new ForbiddenError());
      const req = makeGetRequest('/api/students');
      const res = await GET(req);
      expect(res.status).toBe(403);
    });
  });

  // ── Unauthenticated ────────────────────────────────────────────────────

  describe('unauthenticated', () => {
    beforeEach(() => setUser(null));

    it('[-] GET returns 401', async () => {
      const req = makeGetRequest('/api/students');
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('[-] POST returns 401', async () => {
      const req = makeRequest('POST', '/api/students', {});
      const res = await POST(req);
      expect(res.status).toBe(401);
    });
  });
});
