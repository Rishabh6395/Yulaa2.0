import { describe, it, expect, beforeEach, vi } from 'vitest';
import './mocks/prisma';
import { prismaMock, resetPrisma } from './mocks/prisma';
import { setUser, USERS, makeGetRequest } from './mocks/auth';

// Mock ExcelJS to avoid actual file generation in tests
vi.mock('exceljs', () => {
  const mockWorksheet = {
    columns: [] as any[],
    addRow: vi.fn(),
    eachRow: vi.fn(),
    getRow: vi.fn(() => ({ font: null, fill: null, alignment: null, height: 20 })),
  };
  class MockWorkbook {
    creator = '';
    created = new Date();
    addWorksheet = vi.fn(() => mockWorksheet);
    xlsx = { writeBuffer: vi.fn().mockResolvedValue(new Uint8Array(10)) };
  }
  return {
    // ExcelJS is a CJS module — default import gets the whole exports object
    default: { Workbook: MockWorkbook },
    Workbook: MockWorkbook,
  };
});

import { GET } from '@/app/api/reports/export/route';

const STUDENT = {
  id: 'stu-1', schoolId: 'school-1', firstName: 'Rohan', lastName: 'Sharma',
  admissionNo: 'ADM001', status: 'active', dateOfBirth: null, gender: 'M',
  bloodGroup: 'O+', createdAt: new Date(),
  class: { grade: '10', section: 'A' },
  parentStudents: [],
};

describe('📊 REPORTS / EXPORT MODULE', () => {
  beforeEach(() => { resetPrisma(); });

  // ── School Admin ───────────────────────────────────────────────────────
  describe('school_admin', () => {
    beforeEach(() => setUser(USERS.schoolAdmin));

    it('[+] can export students report as Excel', async () => {
      prismaMock.student.findMany.mockResolvedValue([STUDENT] as any);
      const req = makeGetRequest('/api/reports/export', { type: 'students' });
      const res = await GET(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('spreadsheetml');
    });

    it('[+] can export attendance report', async () => {
      prismaMock.attendance.findMany.mockResolvedValue([{
        id: 'att-1', date: new Date(), status: 'present', studentId: 'stu-1',
        student: STUDENT, teacher: null, punchInTime: null, punchOutTime: null,
      }] as any);
      const req = makeGetRequest('/api/reports/export', { type: 'attendance', month: '5', year: '2025' });
      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it('[+] can export fees report', async () => {
      prismaMock.feeInvoice.findMany.mockResolvedValue([{
        id: 'inv-1', invoiceNo: 'INV-001', amount: 5000, paidAmount: 0,
        status: 'pending', dueDate: new Date(), paidAt: null, installmentNo: 1,
        student: { firstName: 'Rohan', lastName: 'Sharma' },
        feeStructure: { name: 'Tuition Fee' },
      }] as any);
      const req = makeGetRequest('/api/reports/export', { type: 'fees' });
      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it('[+] can export admissions report', async () => {
      prismaMock.admissionApplication.findMany.mockResolvedValue([{
        id: 'app-1', parentName: 'John', parentPhone: '9999', parentEmail: 'j@j.com',
        status: 'pending', currentStep: 0, submittedAt: new Date(), updatedAt: new Date(),
        workflow: null, children: [{ firstName: 'Kid', lastName: 'One', gradeApplying: '5' }],
      }] as any);
      const req = makeGetRequest('/api/reports/export', { type: 'admissions' });
      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it('[+] can export leave report', async () => {
      prismaMock.leaveRequest.findMany.mockResolvedValue([{
        id: 'lv-1', startDate: new Date(), endDate: new Date(), leaveType: 'Casual',
        reason: 'Personal', status: 'approved', roleCode: 'teacher', createdAt: new Date(),
        user: { firstName: 'Teacher', lastName: 'One' },
      }] as any);
      const req = makeGetRequest('/api/reports/export', { type: 'leave' });
      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it('[+] can export homework report', async () => {
      prismaMock.homework.findMany.mockResolvedValue([{
        id: 'hw-1', title: 'Chapter 5', subject: 'Math', dueDate: new Date(), createdAt: new Date(),
        class: { grade: '10', section: 'A' },
        teacher: { user: { firstName: 'Teacher', lastName: 'One' } },
      }] as any);
      const req = makeGetRequest('/api/reports/export', { type: 'homework' });
      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it('[-] unknown export type returns 400', async () => {
      const req = makeGetRequest('/api/reports/export', { type: 'unknown' });
      const res = await GET(req);
      expect(res.status).toBe(400);
    });
  });

  // ── Teacher ────────────────────────────────────────────────────────────
  describe('teacher', () => {
    beforeEach(() => setUser(USERS.teacher));

    it('[-] cannot export reports', async () => {
      const req = makeGetRequest('/api/reports/export', { type: 'students' });
      const res = await GET(req);
      expect(res.status).toBe(403);
    });
  });

  // ── Parent ─────────────────────────────────────────────────────────────
  describe('parent', () => {
    beforeEach(() => setUser(USERS.parent));

    it('[-] cannot export reports', async () => {
      const req = makeGetRequest('/api/reports/export', { type: 'students' });
      const res = await GET(req);
      expect(res.status).toBe(403);
    });
  });

  // ── Unauthenticated ────────────────────────────────────────────────────
  describe('unauthenticated', () => {
    beforeEach(() => setUser(null));

    it('[-] GET returns 401', async () => {
      const res = await GET(makeGetRequest('/api/reports/export'));
      expect(res.status).toBe(401);
    });
  });
});
