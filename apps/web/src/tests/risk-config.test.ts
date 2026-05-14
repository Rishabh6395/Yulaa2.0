import { describe, it, expect, beforeEach } from 'vitest';
import './mocks/prisma';
import { prismaMock, resetPrisma } from './mocks/prisma';
import { setUser, USERS, makeRequest, makeGetRequest } from './mocks/auth';

import { GET, POST, PATCH, DELETE } from '@/app/api/performance/risk-config/route';

const RISK_CONFIG = {
  id: 'rc-1', schoolId: 'school-1', grade: null,
  minMarksPct: 40, minAttendancePct: 75, minHomeworkPct: 60,
  weightMarks: 40, weightAttendance: 35, weightHomework: 25,
  highRiskThreshold: 60, mediumRiskThreshold: 30,
  createdById: 'user-admin', createdAt: new Date(), updatedAt: new Date(),
  school: { id: 'school-1', name: 'Test School' },
};

const GRADE_CONFIG = {
  ...RISK_CONFIG, id: 'rc-2', grade: '10',
  minMarksPct: 50, highRiskThreshold: 55,
};

describe('⚠️ PERFORMANCE RISK CONFIG MODULE', () => {
  beforeEach(() => {
    resetPrisma();
    prismaMock.performanceRiskConfig.findMany.mockResolvedValue([RISK_CONFIG] as any);
    prismaMock.performanceRiskConfig.findUnique.mockResolvedValue(RISK_CONFIG as any);
    prismaMock.performanceRiskConfig.create.mockResolvedValue(RISK_CONFIG as any);
    prismaMock.performanceRiskConfig.update.mockResolvedValue(RISK_CONFIG as any);
    prismaMock.performanceRiskConfig.delete.mockResolvedValue(RISK_CONFIG as any);
  });

  // ── GET ──────────────────────────────────────────────────────────────────────

  describe('GET /api/performance/risk-config', () => {
    it('[+] super_admin can list all risk configs', async () => {
      setUser(USERS.superAdmin);
      const res = await GET(makeGetRequest('/api/performance/risk-config'));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.configs).toBeDefined();
      expect(data.systemDefaults).toBeDefined();
    });

    it('[+] school_admin can list configs for their school', async () => {
      setUser(USERS.schoolAdmin);
      const res = await GET(makeGetRequest('/api/performance/risk-config'));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.configs).toBeDefined();
    });

    it('[-] teacher cannot access risk configs', async () => {
      setUser(USERS.teacher);
      const res = await GET(makeGetRequest('/api/performance/risk-config'));
      expect(res.status).toBe(403);
    });

    it('[-] parent cannot access risk configs', async () => {
      setUser(USERS.parent);
      const res = await GET(makeGetRequest('/api/performance/risk-config'));
      expect(res.status).toBe(403);
    });

    it('[-] unauthenticated returns 401', async () => {
      setUser(null);
      expect((await GET(makeGetRequest('/api/performance/risk-config'))).status).toBe(401);
    });
  });

  // ── POST ─────────────────────────────────────────────────────────────────────

  describe('POST /api/performance/risk-config', () => {
    beforeEach(() => {
      // No existing config — allow creation
      prismaMock.performanceRiskConfig.findUnique.mockResolvedValue(null);
    });

    it('[+] super_admin can create a global default rule (no schoolId)', async () => {
      setUser(USERS.superAdmin);
      const req = makeRequest('POST', '/api/performance/risk-config', {
        minMarksPct: 35, minAttendancePct: 70, minHomeworkPct: 55,
        weightMarks: 40, weightAttendance: 35, weightHomework: 25,
        highRiskThreshold: 65, mediumRiskThreshold: 30,
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.config).toBeDefined();
    });

    it('[+] school_admin can create a school-wide rule', async () => {
      setUser(USERS.schoolAdmin);
      const req = makeRequest('POST', '/api/performance/risk-config', {
        minMarksPct: 45, minAttendancePct: 80, minHomeworkPct: 65,
        weightMarks: 40, weightAttendance: 35, weightHomework: 25,
        highRiskThreshold: 60, mediumRiskThreshold: 30,
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
    });

    it('[+] school_admin can create a grade-specific rule', async () => {
      setUser(USERS.schoolAdmin);
      prismaMock.performanceRiskConfig.create.mockResolvedValue(GRADE_CONFIG as any);
      const req = makeRequest('POST', '/api/performance/risk-config', {
        grade: '10',
        minMarksPct: 50, minAttendancePct: 80, minHomeworkPct: 65,
        weightMarks: 40, weightAttendance: 35, weightHomework: 25,
        highRiskThreshold: 55, mediumRiskThreshold: 28,
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.config.grade).toBe('10');
    });

    it('[-] weights not summing to 100 returns 400', async () => {
      setUser(USERS.schoolAdmin);
      const req = makeRequest('POST', '/api/performance/risk-config', {
        minMarksPct: 40, minAttendancePct: 75, minHomeworkPct: 60,
        weightMarks: 50, weightAttendance: 30, weightHomework: 30,   // sum = 110
        highRiskThreshold: 60, mediumRiskThreshold: 30,
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('[-] mediumThreshold >= highThreshold returns 400', async () => {
      setUser(USERS.schoolAdmin);
      const req = makeRequest('POST', '/api/performance/risk-config', {
        minMarksPct: 40, minAttendancePct: 75, minHomeworkPct: 60,
        weightMarks: 40, weightAttendance: 35, weightHomework: 25,
        highRiskThreshold: 40, mediumRiskThreshold: 50,   // medium > high — invalid
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('[-] duplicate school+grade returns 409', async () => {
      setUser(USERS.schoolAdmin);
      prismaMock.performanceRiskConfig.findUnique.mockResolvedValue(RISK_CONFIG as any);
      const req = makeRequest('POST', '/api/performance/risk-config', {
        minMarksPct: 40, minAttendancePct: 75, minHomeworkPct: 60,
        weightMarks: 40, weightAttendance: 35, weightHomework: 25,
        highRiskThreshold: 60, mediumRiskThreshold: 30,
      });
      const res = await POST(req);
      expect(res.status).toBe(409);
    });

    it('[-] teacher cannot create risk config', async () => {
      setUser(USERS.teacher);
      const req = makeRequest('POST', '/api/performance/risk-config', {
        minMarksPct: 40, minAttendancePct: 75, minHomeworkPct: 60,
        weightMarks: 40, weightAttendance: 35, weightHomework: 25,
        highRiskThreshold: 60, mediumRiskThreshold: 30,
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });

    it('[-] unauthenticated returns 401', async () => {
      setUser(null);
      expect((await POST(makeRequest('POST', '/api/performance/risk-config', {}))).status).toBe(401);
    });
  });

  // ── PATCH ─────────────────────────────────────────────────────────────────────

  describe('PATCH /api/performance/risk-config', () => {
    it('[+] school_admin can update minMarksPct', async () => {
      setUser(USERS.schoolAdmin);
      prismaMock.performanceRiskConfig.update.mockResolvedValue({ ...RISK_CONFIG, minMarksPct: 45 } as any);
      const req = makeRequest('PATCH', '/api/performance/risk-config', {
        id: 'rc-1', minMarksPct: 45,
      });
      const res = await PATCH(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.config.minMarksPct).toBe(45);
    });

    it('[+] super_admin can update any school config', async () => {
      setUser(USERS.superAdmin);
      const req = makeRequest('PATCH', '/api/performance/risk-config', {
        id: 'rc-1', highRiskThreshold: 65,
      });
      const res = await PATCH(req);
      expect(res.status).toBe(200);
    });

    it('[-] school_admin cannot update another school config', async () => {
      setUser(USERS.schoolAdmin);
      prismaMock.performanceRiskConfig.findUnique.mockResolvedValue({ ...RISK_CONFIG, schoolId: 'school-99' } as any);
      const req = makeRequest('PATCH', '/api/performance/risk-config', {
        id: 'rc-1', minMarksPct: 50,
      });
      const res = await PATCH(req);
      expect(res.status).toBe(403);
    });

    it('[-] id missing returns 400', async () => {
      setUser(USERS.schoolAdmin);
      const req = makeRequest('PATCH', '/api/performance/risk-config', { minMarksPct: 50 });
      const res = await PATCH(req);
      expect(res.status).toBe(400);
    });

    it('[-] non-existent id returns 404', async () => {
      setUser(USERS.schoolAdmin);
      prismaMock.performanceRiskConfig.findUnique.mockResolvedValue(null);
      const req = makeRequest('PATCH', '/api/performance/risk-config', { id: 'bad-id', minMarksPct: 50 });
      const res = await PATCH(req);
      expect(res.status).toBe(404);
    });
  });

  // ── DELETE ────────────────────────────────────────────────────────────────────

  describe('DELETE /api/performance/risk-config', () => {
    it('[+] school_admin can delete own school config', async () => {
      setUser(USERS.schoolAdmin);
      const req = makeRequest('DELETE', '/api/performance/risk-config', { id: 'rc-1' });
      const res = await DELETE(req);
      expect(res.status).toBe(200);
      expect((await res.json()).ok).toBe(true);
    });

    it('[+] super_admin can delete any config', async () => {
      setUser(USERS.superAdmin);
      const req = makeRequest('DELETE', '/api/performance/risk-config', { id: 'rc-1' });
      const res = await DELETE(req);
      expect(res.status).toBe(200);
    });

    it('[-] school_admin cannot delete another school config', async () => {
      setUser(USERS.schoolAdmin);
      prismaMock.performanceRiskConfig.findUnique.mockResolvedValue({ ...RISK_CONFIG, schoolId: 'school-99' } as any);
      const req = makeRequest('DELETE', '/api/performance/risk-config', { id: 'rc-1' });
      const res = await DELETE(req);
      expect(res.status).toBe(403);
    });

    it('[-] unauthenticated returns 401', async () => {
      setUser(null);
      expect((await DELETE(makeRequest('DELETE', '/api/performance/risk-config', { id: 'rc-1' }))).status).toBe(401);
    });
  });
});
