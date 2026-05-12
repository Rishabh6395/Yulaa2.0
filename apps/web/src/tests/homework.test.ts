import { describe, it, expect, beforeEach, vi } from 'vitest';
import './mocks/prisma';
import { prismaMock, resetPrisma } from './mocks/prisma';
import { setUser, USERS, makeRequest, makeGetRequest } from './mocks/auth';

// Mock the homework service
vi.mock('@/modules/homework/homework.service', () => ({
  listHomework: vi.fn().mockResolvedValue({ homework: [] }),
  createHomework: vi.fn().mockResolvedValue({ id: 'hw-1', title: 'Chapter 5', schoolId: 'school-1' }),
  updateHomework: vi.fn().mockResolvedValue({ id: 'hw-1', status: 'published' }),
}));

import { GET, POST, PATCH } from '@/app/api/homework/route';
import { listHomework, createHomework, updateHomework } from '@/modules/homework/homework.service';

const HW = {
  id: 'hw-1', schoolId: 'school-1', title: 'Chapter 5 Questions',
  subject: 'Math', classId: 'cls-1', dueDate: new Date('2025-06-10'),
  status: 'published', createdAt: new Date(),
};

describe('📚 HOMEWORK MODULE', () => {
  beforeEach(() => {
    resetPrisma();
    vi.mocked(listHomework).mockResolvedValue({ homework: [HW] } as any);
    vi.mocked(createHomework).mockResolvedValue(HW as any);
    vi.mocked(updateHomework).mockResolvedValue(HW as any);
  });

  // ── School Admin ───────────────────────────────────────────────────────
  describe('school_admin', () => {
    beforeEach(() => setUser(USERS.schoolAdmin));

    it('[+] can list homework for own school', async () => {
      const req = makeGetRequest('/api/homework');
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.homework).toBeDefined();
    });

    it('[+] can create homework', async () => {
      const req = makeRequest('POST', '/api/homework', {
        title: 'Chapter 5', subject: 'Math', classId: 'cls-1', dueDate: '2025-06-10',
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
    });

    it('[+] can update/publish homework', async () => {
      const req = makeRequest('PATCH', '/api/homework', { id: 'hw-1', status: 'published' });
      const res = await PATCH(req);
      expect(res.status).toBe(200);
    });
  });

  // ── Teacher ────────────────────────────────────────────────────────────
  describe('teacher', () => {
    beforeEach(() => setUser(USERS.teacher));

    it('[+] can list homework for own school', async () => {
      const req = makeGetRequest('/api/homework');
      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it('[+] can create homework', async () => {
      const req = makeRequest('POST', '/api/homework', {
        title: 'Essay Writing', subject: 'English', classId: 'cls-1', dueDate: '2025-06-15',
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
    });
  });

  // ── Parent ─────────────────────────────────────────────────────────────
  describe('parent', () => {
    beforeEach(() => setUser(USERS.parent));

    it('[+] can view homework (read-only)', async () => {
      const req = makeGetRequest('/api/homework');
      const res = await GET(req);
      expect(res.status).toBe(200);
    });
  });

  // ── Unauthenticated ────────────────────────────────────────────────────
  describe('unauthenticated', () => {
    beforeEach(() => setUser(null));

    it('[-] GET returns 401', async () => {
      const res = await GET(makeGetRequest('/api/homework'));
      expect(res.status).toBe(401);
    });

    it('[-] POST returns 401', async () => {
      const res = await POST(makeRequest('POST', '/api/homework', {}));
      expect(res.status).toBe(401);
    });
  });
});
