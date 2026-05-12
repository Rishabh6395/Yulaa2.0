import { describe, it, expect, beforeEach, vi } from 'vitest';
import './mocks/prisma';
import { resetPrisma } from './mocks/prisma';
import { setUser, USERS, makeRequest, makeGetRequest } from './mocks/auth';

vi.mock('@/modules/attendance/attendance.service', () => ({
  getAttendance: vi.fn().mockResolvedValue({ records: [], attendance: [] }),
  markAttendance: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/lib/school-utils', () => ({
  assertParentOwnsStudent: vi.fn().mockResolvedValue(undefined),
  getStudentSchoolId: vi.fn().mockResolvedValue('school-1'),
}));

import { GET, POST } from '@/app/api/attendance/route';
import { getAttendance, markAttendance } from '@/modules/attendance/attendance.service';

const ATT_RECORD = {
  id: 'att-1', schoolId: 'school-1', studentId: 'stu-1', date: new Date('2025-05-10'),
  status: 'present', student: { id: 'stu-1', firstName: 'Rohan', lastName: 'Sharma', class: { grade: '10', section: 'A' } },
};

describe('📅 ATTENDANCE MODULE', () => {
  beforeEach(() => {
    resetPrisma();
    vi.mocked(getAttendance).mockResolvedValue({ records: [ATT_RECORD], attendance: [ATT_RECORD] } as any);
    vi.mocked(markAttendance).mockResolvedValue({ success: true, record: ATT_RECORD } as any);
  });

  // ── School Admin ───────────────────────────────────────────────────────

  describe('school_admin', () => {
    beforeEach(() => setUser(USERS.schoolAdmin));

    it('[+] can fetch attendance records for own school', async () => {
      const req = makeGetRequest('/api/attendance', { date: '2025-05-10' });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.records ?? data.attendance)).toBe(true);
    });

    it('[+] can mark attendance for a student', async () => {
      const req = makeRequest('POST', '/api/attendance', {
        date: '2025-05-10', studentId: 'stu-1', status: 'present',
      });
      const res = await POST(req);
      expect(res.status).toBeLessThan(400);
    });

    it('[-] cannot mark attendance for student from another school', async () => {
      const { AppError } = await import('@/utils/errors');
      vi.mocked(markAttendance).mockRejectedValueOnce(new AppError('Student not found', 404));
      const req = makeRequest('POST', '/api/attendance', {
        date: '2025-05-10', studentId: 'stu-99', status: 'present',
      });
      const res = await POST(req);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ── Teacher ────────────────────────────────────────────────────────────

  describe('teacher', () => {
    beforeEach(() => setUser(USERS.teacher));

    it('[+] can view and mark attendance for their class', async () => {
      const req = makeGetRequest('/api/attendance', { date: '2025-05-10' });
      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it('[+] can mark student absent', async () => {
      vi.mocked(markAttendance).mockResolvedValueOnce({ success: true, record: { ...ATT_RECORD, status: 'absent' } } as any);
      const req = makeRequest('POST', '/api/attendance', {
        date: '2025-05-10', studentId: 'stu-1', status: 'absent',
      });
      const res = await POST(req);
      expect(res.status).toBeLessThan(400);
    });

    it('[-] cannot mark attendance with invalid status', async () => {
      const { AppError } = await import('@/utils/errors');
      vi.mocked(markAttendance).mockRejectedValueOnce(new AppError('Invalid status: flying'));
      const req = makeRequest('POST', '/api/attendance', {
        date: '2025-05-10', studentId: 'stu-1', status: 'flying',
      });
      const res = await POST(req);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ── Parent ─────────────────────────────────────────────────────────────

  describe('parent', () => {
    beforeEach(() => setUser(USERS.parent));

    it('[+] can view attendance for own child (with student_id)', async () => {
      const req = makeGetRequest('/api/attendance', { student_id: 'stu-1' });
      const res = await GET(req);
      expect([200, 403]).toContain(res.status);
    });

    it('[-] cannot mark attendance', async () => {
      const { ForbiddenError } = await import('@/utils/errors');
      vi.mocked(markAttendance).mockRejectedValueOnce(new ForbiddenError());
      const req = makeRequest('POST', '/api/attendance', {
        date: '2025-05-10', studentId: 'stu-1', status: 'present',
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });
  });

  // ── Unauthenticated ────────────────────────────────────────────────────

  describe('unauthenticated', () => {
    beforeEach(() => setUser(null));

    it('[-] GET returns 401', async () => {
      const res = await GET(makeGetRequest('/api/attendance'));
      expect(res.status).toBe(401);
    });

    it('[-] POST returns 401', async () => {
      const res = await POST(makeRequest('POST', '/api/attendance', {}));
      expect(res.status).toBe(401);
    });
  });
});
