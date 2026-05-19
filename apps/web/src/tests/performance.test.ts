import { describe, it, expect, beforeEach } from 'vitest';
import './mocks/prisma';
import { prismaMock, resetPrisma } from './mocks/prisma';
import { setUser, USERS, makeGetRequest } from './mocks/auth';

import { GET } from '@/app/api/performance/route';

const SCHOOL = { id: 'school-1', name: 'Test School', _count: { students: 100, teachers: 10 } };
const EXAM = { id: 'exam-1', schoolId: 'school-1', title: 'Mid Term', examType: 'midterm', classId: 'cls-1', startDate: new Date('2025-03-01'), entries: [], _count: { results: 5 } };
const CLASS = { id: 'cls-1', schoolId: 'school-1', grade: '10', section: 'A', _count: { students: 30 } };
const STUDENT = { id: 'stu-1', schoolId: 'school-1', firstName: 'Rohan', lastName: 'Sharma', admissionNo: 'ADM001', classId: 'cls-1', status: 'active' };
const RESULT = { id: 'res-1', examId: 'exam-1', studentId: 'stu-1', subject: 'Math', marksObtained: 80, maxMarks: 100, grade: 'A', createdAt: new Date(), student: STUDENT };
const TEACHER_RECORD = { id: 'teacher-rec-1', userId: 'user-teacher', schoolId: 'school-1' };

describe('📊 PERFORMANCE MODULE', () => {
  beforeEach(() => {
    resetPrisma();
    // Return empty config so loadRiskConfig falls back to hardcoded defaults
    prismaMock.performanceRiskConfig.findMany.mockResolvedValue([]);
  });

  // ── Super Admin ────────────────────────────────────────────────────────
  describe('super_admin', () => {
    beforeEach(() => setUser(USERS.superAdmin));

    it('[+] can view all-schools performance summary', async () => {
      prismaMock.school.findMany.mockResolvedValue([SCHOOL] as any);
      prismaMock.exam.count.mockResolvedValue(3);
      prismaMock.examResult.aggregate.mockResolvedValue({ _avg: { marksObtained: 75 }, _count: 10 } as any);
      const req = makeGetRequest('/api/performance', { view: 'super_admin' });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.view).toBe('super_admin');
      expect(Array.isArray(data.schools)).toBe(true);
    });

    it('[+] can drill into a specific school', async () => {
      prismaMock.exam.findMany.mockResolvedValue([EXAM] as any);
      prismaMock.class.findMany.mockResolvedValue([CLASS] as any);
      prismaMock.examResult.findMany.mockResolvedValue([RESULT] as any);
      const req = makeGetRequest('/api/performance', { view: 'super_admin', school_id: 'school-1' });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.view).toBe('admin');
    });

    it('[-] non-super-admin cannot access super_admin view', async () => {
      setUser(USERS.schoolAdmin);
      const req = makeGetRequest('/api/performance', { view: 'super_admin' });
      const res = await GET(req);
      expect(res.status).toBe(403);
    });
  });

  // ── School Admin ───────────────────────────────────────────────────────
  describe('school_admin', () => {
    beforeEach(() => setUser(USERS.schoolAdmin));

    it('[+] can view admin performance dashboard', async () => {
      prismaMock.exam.findMany.mockResolvedValue([EXAM] as any);
      prismaMock.class.findMany.mockResolvedValue([CLASS] as any);
      prismaMock.examResult.findMany.mockResolvedValue([RESULT] as any);
      const req = makeGetRequest('/api/performance', { view: 'admin' });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.view).toBe('admin');
    });

    it('[+] can filter by class in admin view', async () => {
      prismaMock.exam.findMany.mockResolvedValue([EXAM] as any);
      prismaMock.class.findMany.mockResolvedValue([CLASS] as any);
      prismaMock.examResult.findMany.mockResolvedValue([RESULT] as any);
      const req = makeGetRequest('/api/performance', { view: 'admin', class_id: 'cls-1' });
      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it('[+] returns empty classStats when no exams exist', async () => {
      prismaMock.exam.findMany.mockResolvedValue([]);
      prismaMock.class.findMany.mockResolvedValue([CLASS] as any);
      const req = makeGetRequest('/api/performance', { view: 'admin' });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.classStats).toEqual([]);
    });
  });

  // ── Teacher ────────────────────────────────────────────────────────────
  describe('teacher', () => {
    beforeEach(() => setUser(USERS.teacher));

    it('[+] can view teacher performance dashboard', async () => {
      prismaMock.teacher.findFirst.mockResolvedValue(TEACHER_RECORD as any);
      prismaMock.exam.findMany.mockResolvedValue([{ ...EXAM, entries: [] }] as any);
      prismaMock.exam.findFirst.mockResolvedValue({ ...EXAM, entries: [] } as any);
      prismaMock.class.findUnique.mockResolvedValue(CLASS as any);
      prismaMock.student.findMany.mockResolvedValue([STUDENT] as any);
      prismaMock.examResult.findMany.mockResolvedValue([RESULT] as any);
      prismaMock.attendance.findMany.mockResolvedValue([{ studentId: 'stu-1', status: 'present' }] as any);
      prismaMock.homeworkSubmission.findMany.mockResolvedValue([{ studentId: 'stu-1', status: 'submitted' }] as any);
      const req = makeGetRequest('/api/performance', { view: 'teacher', class_id: 'cls-1', exam_id: 'exam-1' });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.view).toBe('teacher');
      expect(Array.isArray(data.students)).toBe(true);
    });

    it('[-] teacher with no record returns error', async () => {
      prismaMock.teacher.findFirst.mockResolvedValue(null);
      prismaMock.exam.findMany.mockResolvedValue([EXAM] as any);
      const req = makeGetRequest('/api/performance', { view: 'teacher' });
      const res = await GET(req);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ── Parent ─────────────────────────────────────────────────────────────
  describe('parent', () => {
    beforeEach(() => setUser(USERS.parent));

    it('[+] can view own child performance', async () => {
      prismaMock.parent.findFirst.mockResolvedValue({ id: 'par-1', userId: 'user-parent' } as any);
      prismaMock.parentStudent.findFirst.mockResolvedValue({ parentId: 'par-1', studentId: 'stu-1' } as any);
      prismaMock.student.findUnique.mockResolvedValue({ ...STUDENT, class: CLASS } as any);
      prismaMock.exam.findMany.mockResolvedValue([EXAM] as any);
      prismaMock.examResult.findMany.mockResolvedValue([{ ...RESULT, exam: { title: 'Mid Term', examType: 'midterm', startDate: new Date() } }] as any);
      prismaMock.attendance.findMany.mockResolvedValue([{ date: new Date(), status: 'present' }] as any);
      prismaMock.homeworkSubmission.findMany.mockResolvedValue([{ status: 'submitted' }] as any);
      const req = makeGetRequest('/api/performance', { view: 'parent', student_id: 'stu-1' });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.view).toBe('parent');
      expect(data.student).toBeDefined();
    });

    it('[-] cannot view another parent\'s child', async () => {
      prismaMock.parent.findFirst.mockResolvedValue({ id: 'par-1', userId: 'user-parent' } as any);
      prismaMock.parentStudent.findFirst.mockResolvedValue(null); // no link
      const req = makeGetRequest('/api/performance', { view: 'parent', student_id: 'stu-99' });
      const res = await GET(req);
      expect(res.status).toBe(403);
    });

    it('[-] returns 400 when student_id is missing', async () => {
      const req = makeGetRequest('/api/performance', { view: 'parent' });
      const res = await GET(req);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ── Unauthenticated ────────────────────────────────────────────────────
  describe('unauthenticated', () => {
    beforeEach(() => setUser(null));

    it('[-] GET returns 401', async () => {
      const res = await GET(makeGetRequest('/api/performance'));
      expect(res.status).toBe(401);
    });
  });
});
