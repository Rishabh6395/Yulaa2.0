import { describe, it, expect, beforeEach } from 'vitest';
import './mocks/prisma';
import { prismaMock, resetPrisma } from './mocks/prisma';
import { setUser, USERS, makeRequest } from './mocks/auth';

// Import route handler
import { POST } from '@/app/api/auth/login/route';

describe('🔐 AUTH MODULE', () => {
  beforeEach(() => {
    resetPrisma();
    setUser(null); // Login doesn't use getUserFromRequest
  });

  // ── Positive Tests ─────────────────────────────────────────────────────

  describe('POST /api/auth/login — Positive', () => {
    it('returns JWT token for valid credentials', async () => {
      const bcrypt = await import('bcryptjs');
      const hash = await bcrypt.hash('password123', 1);

      prismaMock.user.findFirst.mockResolvedValue({
        id: 'user-1', email: 'admin@test.com', firstName: 'Admin', lastName: 'Test',
        passwordHash: hash, status: 'active',
        userRoles: [{
          schoolId: 'school-1', isPrimary: true,
          role: { code: 'school_admin', displayName: 'School Admin' },
        }],
      });

      const req = makeRequest('POST', '/api/auth/login', {
        email: 'admin@test.com', password: 'password123',
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.token).toBeDefined();
      expect(data.user.email).toBe('admin@test.com');
    });

    it('allows super_admin login with no school_id', async () => {
      const bcrypt = await import('bcryptjs');
      const hash = await bcrypt.hash('superpass', 1);

      prismaMock.user.findFirst.mockResolvedValue({
        id: 'user-super', email: 'super@yulaa.com', firstName: 'Super', lastName: 'Admin',
        passwordHash: hash, status: 'active',
        userRoles: [{
          schoolId: null, isPrimary: true,
          role: { code: 'super_admin', displayName: 'Super Admin' },
        }],
      });

      const req = makeRequest('POST', '/api/auth/login', {
        email: 'super@yulaa.com', password: 'superpass',
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
    });
  });

  // ── Negative Tests ─────────────────────────────────────────────────────

  describe('POST /api/auth/login — Negative', () => {
    it('returns 401 for non-existent user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      const req = makeRequest('POST', '/api/auth/login', {
        email: 'ghost@test.com', password: 'anything',
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('returns 401 for wrong password', async () => {
      const bcrypt = await import('bcryptjs');
      const hash = await bcrypt.hash('correctpass', 1);
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'u', email: 'x@x.com', passwordHash: hash, status: 'active',
        userRoles: [{ schoolId: 's1', isPrimary: true, role: { code: 'teacher', displayName: 'Teacher' } }],
      });
      const req = makeRequest('POST', '/api/auth/login', { email: 'x@x.com', password: 'wrongpass' });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('returns 401 for inactive account', async () => {
      // Auth service queries findUnique({ where: { email, status: 'active' } })
      // Inactive users are excluded by the query — simulate by returning null
      prismaMock.user.findUnique.mockResolvedValue(null);
      const req = makeRequest('POST', '/api/auth/login', { email: 'x@x.com', password: 'pass' });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('returns 400 for missing email', async () => {
      const req = makeRequest('POST', '/api/auth/login', { password: 'pass' });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('returns 400 for missing password', async () => {
      const req = makeRequest('POST', '/api/auth/login', { email: 'x@x.com' });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });
});
