import { describe, it, expect, beforeEach, vi } from 'vitest';
import './mocks/prisma';
import { prismaMock, resetPrisma } from './mocks/prisma';
import { setUser, USERS, makeRequest, makeGetRequest } from './mocks/auth';

import { GET, POST, PATCH, DELETE } from '@/app/api/exam/route';

const EXAM = {
  id: 'exam-1', schoolId: 'school-1', title: 'Mid-Term 2025',
  examType: 'midterm', academicYear: '2025-26',
  classId: 'cls-1', startDate: new Date('2025-06-01'),
  endDate: new Date('2025-06-10'), status: 'scheduled', gradingType: 'marks',
  createdAt: new Date(), updatedAt: new Date(),
  _count: { entries: 3, results: 60 },
};

const TEACHER_RECORD = {
  id: 'teacher-1', userId: 'user-teacher', schoolId: 'school-1', classId: 'cls-1',
};

const RESULT = {
  id: 'res-1', examId: 'exam-1', studentId: 'stu-1', subject: 'Math',
  marksObtained: 75, maxMarks: 100, grade: 'B+', approved: false,
  enteredById: 'user-teacher', approvedById: null,
};

describe('📝 EXAM MODULE', () => {

  beforeEach(() => {
    resetPrisma();
    prismaMock.exam.findMany.mockResolvedValue([EXAM] as any);
    prismaMock.exam.findFirst.mockResolvedValue(EXAM as any);
    prismaMock.exam.create.mockResolvedValue(EXAM as any);
    prismaMock.exam.update.mockResolvedValue(EXAM as any);
    prismaMock.examResult.upsert.mockResolvedValue(RESULT as any);
    prismaMock.examResult.update.mockResolvedValue({ ...RESULT, grade: 'B+' } as any);
    prismaMock.examResult.updateMany.mockResolvedValue({ count: 5 });
    prismaMock.student.findFirst.mockResolvedValue({ id: 'stu-1' } as any);
    prismaMock.student.findMany.mockResolvedValue([{ id: 'stu-1' }, { id: 'stu-2' }] as any);
    prismaMock.teacher.findFirst.mockResolvedValue(TEACHER_RECORD as any);
  });

  // ── GET ─────────────────────────────────────────────────────────────────────

  describe('GET /api/exam', () => {
    it('[+] school_admin can list exams', async () => {
      setUser(USERS.schoolAdmin);
      const res = await GET(makeGetRequest('/api/exam'));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.exams).toHaveLength(1);
    });

    it('[+] teacher can list exams for their class only', async () => {
      setUser(USERS.teacher);
      const res = await GET(makeGetRequest('/api/exam'));
      expect(res.status).toBe(200);
    });

    it('[+] school_admin can get single exam by examId', async () => {
      setUser(USERS.schoolAdmin);
      prismaMock.exam.findFirst.mockResolvedValue({
        ...EXAM, entries: [], results: [],
      } as any);
      const res = await GET(makeGetRequest('/api/exam', { examId: 'exam-1' }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.exam.id).toBe('exam-1');
    });

    it('[-] unauthenticated returns 401', async () => {
      setUser(null);
      expect((await GET(makeGetRequest('/api/exam'))).status).toBe(401);
    });
  });

  // ── CREATE EXAM (admin) ──────────────────────────────────────────────────────

  describe('POST create_exam — school_admin', () => {
    beforeEach(() => setUser(USERS.schoolAdmin));

    it('[+] can create a new exam', async () => {
      const req = makeRequest('POST', '/api/exam', {
        title: 'Unit Test 1', examType: 'unit_test',
        academicYear: '2025-26', classId: 'cls-1',
        startDate: '2025-06-01', endDate: '2025-06-05',
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.exam).toBeDefined();
    });

    it('[-] missing title returns 400', async () => {
      const req = makeRequest('POST', '/api/exam', { examType: 'unit_test' });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('[-] missing examType returns 400', async () => {
      const req = makeRequest('POST', '/api/exam', { title: 'Test' });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  // ── CREATE EXAM (teacher) ────────────────────────────────────────────────────

  describe('POST create_exam — teacher', () => {
    beforeEach(() => setUser(USERS.teacher));

    it('[+] teacher can create exam for their assigned class', async () => {
      const req = makeRequest('POST', '/api/exam', {
        title: 'Class Test', examType: 'test',
        academicYear: '2025-26',
        startDate: '2025-06-01', endDate: '2025-06-01',
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
    });

    it('[-] teacher without assigned class cannot create exam', async () => {
      prismaMock.teacher.findFirst.mockResolvedValue({ ...TEACHER_RECORD, classId: null } as any);
      const req = makeRequest('POST', '/api/exam', {
        title: 'Class Test', examType: 'test', academicYear: '2025-26',
        startDate: '2025-06-01', endDate: '2025-06-01',
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('[-] teacher cannot create exam for another class', async () => {
      const req = makeRequest('POST', '/api/exam', {
        title: 'Class Test', examType: 'test', classId: 'cls-99',
        academicYear: '2025-26', startDate: '2025-06-01', endDate: '2025-06-01',
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });
  });

  // ── ENTER SINGLE RESULT ──────────────────────────────────────────────────────

  describe('POST enter_result', () => {
    it('[+] teacher can enter result for own class student', async () => {
      setUser(USERS.teacher);
      const req = makeRequest('POST', '/api/exam', {
        action: 'enter_result', examId: 'exam-1',
        studentId: 'stu-1', subject: 'Math', marksObtained: 75, maxMarks: 100,
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
    });

    it('[+] school_admin can enter result', async () => {
      setUser(USERS.schoolAdmin);
      const req = makeRequest('POST', '/api/exam', {
        action: 'enter_result', examId: 'exam-1',
        studentId: 'stu-1', subject: 'Math', marksObtained: 80, maxMarks: 100,
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
    });

    it('[+] auto-assigns grade when not provided', async () => {
      setUser(USERS.schoolAdmin);
      const req = makeRequest('POST', '/api/exam', {
        action: 'enter_result', examId: 'exam-1',
        studentId: 'stu-1', subject: 'Science', marksObtained: 92, maxMarks: 100,
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.result.grade).toBe('A+');
    });

    it('[-] teacher cannot enter result for another class exam', async () => {
      setUser(USERS.teacher);
      prismaMock.exam.findFirst.mockResolvedValue({ ...EXAM, classId: 'cls-99' } as any);
      const req = makeRequest('POST', '/api/exam', {
        action: 'enter_result', examId: 'exam-1',
        studentId: 'stu-1', subject: 'Math', marksObtained: 70,
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });

    it('[-] student not in school returns 400', async () => {
      setUser(USERS.schoolAdmin);
      prismaMock.student.findFirst.mockResolvedValue(null);
      const req = makeRequest('POST', '/api/exam', {
        action: 'enter_result', examId: 'exam-1',
        studentId: 'stu-99', subject: 'Math', marksObtained: 70,
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('[-] missing marksObtained returns 400', async () => {
      setUser(USERS.teacher);
      const req = makeRequest('POST', '/api/exam', {
        action: 'enter_result', examId: 'exam-1', studentId: 'stu-1', subject: 'Math',
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('[-] parent cannot enter results', async () => {
      setUser(USERS.parent);
      const req = makeRequest('POST', '/api/exam', {
        action: 'enter_result', examId: 'exam-1',
        studentId: 'stu-1', subject: 'Math', marksObtained: 70,
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });
  });

  // ── BULK UPLOAD RESULTS ──────────────────────────────────────────────────────

  describe('POST upload_results', () => {
    it('[+] teacher can bulk upload results for own class', async () => {
      setUser(USERS.teacher);
      const req = makeRequest('POST', '/api/exam', {
        action: 'upload_results', examId: 'exam-1',
        results: [
          { studentId: 'stu-1', subject: 'Math',    marksObtained: 80, maxMarks: 100 },
          { studentId: 'stu-2', subject: 'Science', marksObtained: 65, maxMarks: 100 },
        ],
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.total).toBe(2);
      expect(data.saved).toBe(2);
      expect(data.failed).toBe(0);
    });

    it('[+] school_admin can bulk upload results', async () => {
      setUser(USERS.schoolAdmin);
      const req = makeRequest('POST', '/api/exam', {
        action: 'upload_results', examId: 'exam-1',
        results: [
          { studentId: 'stu-1', subject: 'English', marksObtained: 90, maxMarks: 100 },
        ],
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
    });

    it('[-] upload without examId returns 400', async () => {
      setUser(USERS.teacher);
      const req = makeRequest('POST', '/api/exam', {
        action: 'upload_results',
        results: [{ studentId: 'stu-1', subject: 'Math', marksObtained: 70 }],
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('[-] empty results array returns 400', async () => {
      setUser(USERS.teacher);
      const req = makeRequest('POST', '/api/exam', {
        action: 'upload_results', examId: 'exam-1', results: [],
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('[-] teacher cannot upload for another class exam', async () => {
      setUser(USERS.teacher);
      prismaMock.exam.findFirst.mockResolvedValue({ ...EXAM, classId: 'cls-99' } as any);
      const req = makeRequest('POST', '/api/exam', {
        action: 'upload_results', examId: 'exam-1',
        results: [{ studentId: 'stu-1', subject: 'Math', marksObtained: 70 }],
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });

    it('[-] parent cannot upload results', async () => {
      setUser(USERS.parent);
      const req = makeRequest('POST', '/api/exam', {
        action: 'upload_results', examId: 'exam-1',
        results: [{ studentId: 'stu-1', subject: 'Math', marksObtained: 70 }],
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });
  });

  // ── APPROVE RESULTS ──────────────────────────────────────────────────────────

  describe('POST approve_results', () => {
    it('[+] school_admin can approve results', async () => {
      setUser(USERS.schoolAdmin);
      const req = makeRequest('POST', '/api/exam', {
        action: 'approve_results', examId: 'exam-1',
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
    });

    it('[-] teacher cannot approve results', async () => {
      setUser(USERS.teacher);
      const req = makeRequest('POST', '/api/exam', {
        action: 'approve_results', examId: 'exam-1',
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
    });
  });

  // ── PATCH ────────────────────────────────────────────────────────────────────

  describe('PATCH /api/exam', () => {
    it('[+] school_admin can update exam status', async () => {
      setUser(USERS.schoolAdmin);
      const req = makeRequest('PATCH', '/api/exam', { examId: 'exam-1', status: 'ongoing' });
      const res = await PATCH(req);
      expect(res.status).toBe(200);
    });

    it('[+] teacher can update exam for own class to scheduled/ongoing', async () => {
      setUser(USERS.teacher);
      const req = makeRequest('PATCH', '/api/exam', { examId: 'exam-1', status: 'ongoing' });
      const res = await PATCH(req);
      expect(res.status).toBe(200);
    });

    it('[-] teacher cannot publish/complete an exam', async () => {
      setUser(USERS.teacher);
      const req = makeRequest('PATCH', '/api/exam', { examId: 'exam-1', status: 'published' });
      const res = await PATCH(req);
      expect(res.status).toBe(403);
    });

    it('[-] unauthenticated returns 401', async () => {
      setUser(null);
      const req = makeRequest('PATCH', '/api/exam', { examId: 'exam-1', status: 'ongoing' });
      expect((await PATCH(req)).status).toBe(401);
    });
  });

  // ── DELETE ───────────────────────────────────────────────────────────────────

  describe('DELETE /api/exam', () => {
    it('[+] school_admin can delete exam', async () => {
      setUser(USERS.schoolAdmin);
      prismaMock.exam.deleteMany.mockResolvedValue({ count: 1 });
      const req = makeRequest('DELETE', '/api/exam', { examId: 'exam-1' });
      const res = await DELETE(req);
      expect(res.status).toBe(200);
    });

    it('[-] teacher cannot delete exam', async () => {
      setUser(USERS.teacher);
      const req = makeRequest('DELETE', '/api/exam', { examId: 'exam-1' });
      const res = await DELETE(req);
      expect(res.status).toBe(403);
    });

    it('[-] unauthenticated returns 401', async () => {
      setUser(null);
      const req = makeRequest('DELETE', '/api/exam', { examId: 'exam-1' });
      expect((await DELETE(req)).status).toBe(401);
    });
  });
});
