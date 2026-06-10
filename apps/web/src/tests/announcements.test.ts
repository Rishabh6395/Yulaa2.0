import { describe, it, expect, beforeEach, vi } from 'vitest';
import './mocks/prisma';
import { prismaMock, resetPrisma } from './mocks/prisma';
import { setUser, USERS, makeRequest, makeGetRequest } from './mocks/auth';

vi.mock('@/modules/announcements/announcement.service', () => ({
  listAnnouncements: vi.fn().mockResolvedValue({ announcements: [] }),
  createAnnouncement: vi.fn().mockResolvedValue({ id: 'ann-1', title: 'Holiday Notice', schoolId: 'school-1' }),
}));

import { GET, POST, DELETE } from '@/app/api/announcements/route';
import { listAnnouncements, createAnnouncement } from '@/modules/announcements/announcement.service';

const ANNOUNCEMENT = {
  id: 'ann-1', schoolId: 'school-1', title: 'Holiday Notice',
  content: 'School closed on Monday', audienceRoles: ['parent', 'teacher'],
  createdAt: new Date(),
};

describe('📢 ANNOUNCEMENTS MODULE', () => {
  beforeEach(() => {
    resetPrisma();
    vi.mocked(listAnnouncements).mockResolvedValue({ announcements: [ANNOUNCEMENT] } as any);
    vi.mocked(createAnnouncement).mockResolvedValue(ANNOUNCEMENT as any);
    // Default: school exists for super_admin resolveSchoolId fallback
    prismaMock.school.findFirst.mockResolvedValue({ id: 'school-1', isDefault: true } as any);
  });

  // ── School Admin ───────────────────────────────────────────────────────
  describe('school_admin', () => {
    beforeEach(() => setUser(USERS.schoolAdmin));

    it('[+] can list announcements for own school', async () => {
      const req = makeGetRequest('/api/announcements');
      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it('[+] can create an announcement', async () => {
      const req = makeRequest('POST', '/api/announcements', {
        title: 'Holiday Notice', content: 'School closed Monday',
        audienceRoles: ['parent', 'teacher'],
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.announcement).toBeDefined();
    });

    it('[+] can delete an announcement', async () => {
      prismaMock.announcement.deleteMany.mockResolvedValue({ count: 1 } as any);
      const req = makeRequest('DELETE', '/api/announcements', { id: 'ann-1' });
      const res = await DELETE(req);
      expect(res.status).toBe(200);
    });
  });

  // ── Teacher ────────────────────────────────────────────────────────────
  describe('teacher', () => {
    beforeEach(() => setUser(USERS.teacher));

    it('[+] can list announcements (read-only)', async () => {
      const req = makeGetRequest('/api/announcements');
      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it('[-] cannot create an announcement', async () => {
      const req = makeRequest('POST', '/api/announcements', {
        title: 'My Announcement', content: 'Test',
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });

    it('[-] cannot delete an announcement', async () => {
      const req = makeRequest('DELETE', '/api/announcements', { id: 'ann-1' });
      const res = await DELETE(req);
      expect(res.status).toBe(403);
    });
  });

  // ── Parent ─────────────────────────────────────────────────────────────
  describe('parent', () => {
    beforeEach(() => setUser(USERS.parent));

    it('[+] can view announcements (read-only)', async () => {
      const req = makeGetRequest('/api/announcements');
      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it('[-] cannot create announcements', async () => {
      const req = makeRequest('POST', '/api/announcements', { title: 'Test' });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });
  });

  // ── Unauthenticated ────────────────────────────────────────────────────
  describe('unauthenticated', () => {
    beforeEach(() => setUser(null));

    it('[-] GET returns 401', async () => {
      const res = await GET(makeGetRequest('/api/announcements'));
      expect(res.status).toBe(401);
    });

    it('[-] POST returns 401', async () => {
      const res = await POST(makeRequest('POST', '/api/announcements', {}));
      expect(res.status).toBe(401);
    });
  });
});
