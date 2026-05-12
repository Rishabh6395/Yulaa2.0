import { describe, it, expect, beforeEach, vi } from 'vitest';
import './mocks/prisma';
import { prismaMock, resetPrisma } from './mocks/prisma';
import { setUser, USERS, makeRequest, makeGetRequest } from './mocks/auth';

vi.mock('@/modules/compliance/compliance.service', () => ({
  getComplianceItems:    vi.fn().mockResolvedValue([]),
  getComplianceDashboard: vi.fn().mockResolvedValue({ total: 0, compliant: 0, categories: [] }),
  addComplianceItem:     vi.fn().mockResolvedValue({ id: 'ci-1', title: 'Fire Drill', schoolId: 'school-1' }),
  initDefaultItems:      vi.fn().mockResolvedValue(undefined),
}));

import { GET, POST } from '@/app/api/compliance/route';
import { getComplianceItems, getComplianceDashboard, addComplianceItem, initDefaultItems } from '@/modules/compliance/compliance.service';

const ITEM = {
  id: 'ci-1', schoolId: 'school-1', title: 'Fire Drill',
  category: 'safety', status: 'compliant', dueDate: new Date('2025-07-01'),
};

describe('✅ COMPLIANCE MODULE', () => {
  beforeEach(() => {
    resetPrisma();
    vi.mocked(getComplianceItems).mockResolvedValue([ITEM] as any);
    vi.mocked(getComplianceDashboard).mockResolvedValue({ total: 5, compliant: 3, categories: [] } as any);
    vi.mocked(addComplianceItem).mockResolvedValue(ITEM as any);
    vi.mocked(initDefaultItems).mockResolvedValue(undefined);
  });

  // ── School Admin ───────────────────────────────────────────────────────
  describe('school_admin', () => {
    beforeEach(() => setUser(USERS.schoolAdmin));

    it('[+] can list compliance items', async () => {
      const req = makeGetRequest('/api/compliance');
      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it('[+] can view compliance dashboard', async () => {
      const req = makeGetRequest('/api/compliance', { dashboard: '1' });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.total).toBeDefined();
    });

    it('[+] can filter compliance items by category', async () => {
      const req = makeGetRequest('/api/compliance', { category: 'safety' });
      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it('[+] can add a compliance item', async () => {
      const req = makeRequest('POST', '/api/compliance', {
        title: 'Fire Drill', category: 'safety', dueDate: '2025-07-01',
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
    });

    it('[+] can seed default compliance checklist', async () => {
      const req = makeRequest('POST', '/api/compliance', { action: 'seed_defaults' });
      const res = await POST(req);
      expect(res.status).toBe(201);
    });
  });

  // ── Teacher ────────────────────────────────────────────────────────────
  describe('teacher', () => {
    beforeEach(() => setUser(USERS.teacher));

    it('[-] cannot access compliance module', async () => {
      const req = makeGetRequest('/api/compliance');
      const res = await GET(req);
      expect(res.status).toBe(403);
    });

    it('[-] cannot create compliance items', async () => {
      const req = makeRequest('POST', '/api/compliance', { title: 'Test', category: 'safety' });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });
  });

  // ── Parent ─────────────────────────────────────────────────────────────
  describe('parent', () => {
    beforeEach(() => setUser(USERS.parent));

    it('[-] cannot access compliance module', async () => {
      const req = makeGetRequest('/api/compliance');
      const res = await GET(req);
      expect(res.status).toBe(403);
    });
  });

  // ── Unauthenticated ────────────────────────────────────────────────────
  describe('unauthenticated', () => {
    beforeEach(() => setUser(null));

    it('[-] GET returns 401', async () => {
      const res = await GET(makeGetRequest('/api/compliance'));
      expect(res.status).toBe(401);
    });

    it('[-] POST returns 401', async () => {
      const res = await POST(makeRequest('POST', '/api/compliance', {}));
      expect(res.status).toBe(401);
    });
  });
});
