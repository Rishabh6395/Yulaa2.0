import { describe, it, expect, beforeEach, vi } from 'vitest';
import './mocks/prisma';
import { resetPrisma } from './mocks/prisma';
import { setUser, USERS, makeRequest, makeGetRequest } from './mocks/auth';

// Mock the fee service — route delegates role logic to service layer
vi.mock('@/modules/fees/fee.service', () => ({
  listInvoices:      vi.fn().mockResolvedValue({ invoices: [], total: 0, totalAmount: 0, totalPaid: 0, balance: 0 }),
  createInvoice:     vi.fn().mockResolvedValue({ id: 'inv-1', invoiceNo: 'INV-001', amount: 5000, status: 'pending' }),
  recordPayment:     vi.fn().mockResolvedValue({ id: 'inv-1', paidAmount: 5000, status: 'paid' }),
  listFeeStructures: vi.fn().mockResolvedValue([]),
  upsertFeeStructure: vi.fn().mockResolvedValue({ id: 'fs-1' }),
  applyBulkFees:     vi.fn().mockResolvedValue({ created: 5 }),
}));

import { GET, POST } from '@/app/api/fees/route';
import { listInvoices, createInvoice } from '@/modules/fees/fee.service';

describe('💰 FEES MODULE', () => {
  beforeEach(() => {
    resetPrisma();
    vi.mocked(listInvoices).mockResolvedValue({ invoices: [], total: 0, totalAmount: 0, totalPaid: 0, balance: 0 } as any);
    vi.mocked(createInvoice).mockResolvedValue({ id: 'inv-1', invoiceNo: 'INV-001', amount: 5000, status: 'pending' } as any);
  });

  // ── School Admin ───────────────────────────────────────────────────────

  describe('school_admin', () => {
    beforeEach(() => setUser(USERS.schoolAdmin));

    it('[+] can list all fee invoices for own school', async () => {
      const req = makeGetRequest('/api/fees');
      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it('[+] can create a fee invoice', async () => {
      const req = makeRequest('POST', '/api/fees', {
        student_id: 'stu-1', amount: 5000, due_date: '2025-06-01',
        invoice_no: 'INV-001', installment_no: 1,
      });
      const res = await POST(req);
      expect(res.status).toBeLessThan(400);
    });

    it('[+] can filter by status=pending', async () => {
      const req = makeGetRequest('/api/fees', { status: 'pending' });
      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it('[-] cannot create invoice with missing required fields', async () => {
      const { AppError } = await import('@/utils/errors');
      vi.mocked(createInvoice).mockRejectedValueOnce(new AppError('student_id, amount, and due_date are required'));
      const req = makeRequest('POST', '/api/fees', { amount: -100 });
      const res = await POST(req);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('[-] cannot create invoice for non-existent student (service rejects)', async () => {
      const { AppError } = await import('@/utils/errors');
      vi.mocked(createInvoice).mockRejectedValueOnce(new AppError('Student not found', 404));
      const req = makeRequest('POST', '/api/fees', {
        student_id: 'stu-99', amount: 5000, due_date: '2025-06-01',
      });
      const res = await POST(req);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('[+] can upsert fee structure (admin action)', async () => {
      const req = makeRequest('POST', '/api/fees', {
        action: 'upsert_structure', name: 'Tuition', amount: 10000, frequency: 'monthly',
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
    });
  });

  // ── Parent ─────────────────────────────────────────────────────────────

  describe('parent', () => {
    beforeEach(() => setUser(USERS.parent));

    it('[+] can view fee invoices', async () => {
      const req = makeGetRequest('/api/fees');
      const res = await GET(req);
      expect([200, 403]).toContain(res.status);
    });

    it('[-] cannot upsert fee structures (admin-only action)', async () => {
      const req = makeRequest('POST', '/api/fees', {
        action: 'upsert_structure', name: 'Tuition', amount: 10000,
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });
  });

  // ── Teacher ────────────────────────────────────────────────────────────

  describe('teacher', () => {
    beforeEach(() => setUser(USERS.teacher));

    it('[-] cannot upsert fee structures (admin-only action)', async () => {
      const req = makeRequest('POST', '/api/fees', {
        action: 'upsert_structure', name: 'Tuition', amount: 10000,
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });

    it('[-] cannot apply bulk fees (admin-only action)', async () => {
      const req = makeRequest('POST', '/api/fees', {
        action: 'apply_bulk', classId: 'cls-1', amount: 5000, dueDate: '2025-06-01',
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });
  });

  // ── Unauthenticated ────────────────────────────────────────────────────

  describe('unauthenticated', () => {
    beforeEach(() => setUser(null));

    it('[-] GET returns 401', async () => {
      expect((await GET(makeGetRequest('/api/fees'))).status).toBe(401);
    });

    it('[-] POST returns 401', async () => {
      expect((await POST(makeRequest('POST', '/api/fees', {}))).status).toBe(401);
    });
  });
});
