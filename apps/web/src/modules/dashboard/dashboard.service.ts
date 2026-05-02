/**
 * Dashboard service — thin read-only layer.
 *
 * Priority:  Redis cache (precomputed) → withCacheLock fallback (DB compute on miss)
 * Timing:    console.time logs for every request to spot slow paths quickly.
 */

import { cacheGet } from '@/lib/redis';
import { withCacheLock, CacheTTL } from '@/services/cache.service';
import { NotFoundError, ForbiddenError } from '@/utils/errors';
import {
  computeSuperAdminDashboard,
  computeAdminDashboard,
  computeTeacherDashboard,
} from '@/jobs/precompute';
import prisma from '@/lib/prisma';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function readOrCompute<T>(
  key: string,
  ttl: number,
  fn: () => Promise<T>,
  label: string,
): Promise<T> {
  const t0 = Date.now();

  // 1. Redis hit (precomputed by cron)
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    if (process.env.NODE_ENV === 'development') console.log(`[dashboard] ${label} — cache hit (${Date.now() - t0}ms)`);
    return cached;
  }

  // 2. Miss — compute with stampede protection
  if (process.env.NODE_ENV === 'development') console.log(`[dashboard] ${label} — cache miss, computing…`);
  const result = await withCacheLock(key, ttl, fn);
  if (process.env.NODE_ENV === 'development') console.log(`[dashboard] ${label} — computed + stored (${Date.now() - t0}ms)`);
  return result;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getSuperAdminDashboard() {
  return readOrCompute(
    'dashboard:super_admin',
    CacheTTL.dashboard,
    computeSuperAdminDashboard,
    'super_admin',
  );
}

export async function getAdminDashboard(schoolId: string) {
  return readOrCompute(
    `dashboard:admin:${schoolId}`,
    CacheTTL.dashboard,
    () => computeAdminDashboard(schoolId),
    `admin:${schoolId}`,
  );
}

export async function getTeacherDashboard(userId: string, schoolId: string) {
  return readOrCompute(
    `dashboard:teacher:${userId}:${schoolId}`,
    CacheTTL.dashboard,
    () => computeTeacherDashboard(userId, schoolId),
    `teacher:${userId}`,
  );
}

export async function getParentDashboard(userId: string, studentId: string) {
  // Parent dashboards are per-student — too many permutations for precompute.
  // Use withCacheLock directly (stampede-safe, but no precomputed warm entry).
  const key   = `dashboard:parent:${userId}:${studentId}`;
  const label = `parent:${userId}:${studentId}`;
  const t0    = Date.now();

  const cached = await cacheGet(key);
  if (cached !== null) {
    if (process.env.NODE_ENV === 'development') console.log(`[dashboard] ${label} — cache hit (${Date.now() - t0}ms)`);
    return cached;
  }

  if (process.env.NODE_ENV === 'development') console.log(`[dashboard] ${label} — cache miss, computing…`);
  const result = await withCacheLock(key, CacheTTL.dashboardParent, () => computeParentDashboard(userId, studentId));
  if (process.env.NODE_ENV === 'development') console.log(`[dashboard] ${label} — computed + stored (${Date.now() - t0}ms)`);
  return result;
}

// ── Parent compute (stays here — not in precompute since it's per-student) ────

async function computeParentDashboard(userId: string, studentId: string) {
  const parent = await prisma.parent.findUnique({ where: { userId } });
  if (!parent) throw new NotFoundError('Parent profile');

  const link = await prisma.parentStudent.findFirst({
    where:   { parentId: parent.id, studentId },
    include: { student: { include: { class: true } } },
  });
  if (!link) throw new ForbiddenError('Student not found or access denied');

  const student      = link.student;
  const today        = new Date();
  today.setHours(0, 0, 0, 0);
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastOfMonth  = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [todayAttendance, monthAttendance, feeInvoices, recentHomework, recentAnnouncements] = await Promise.all([
    prisma.attendance.findUnique({
      where: { studentId_date: { studentId, date: today } }, select: { status: true },
    }),
    prisma.attendance.findMany({
      where: { studentId, date: { gte: firstOfMonth, lte: lastOfMonth } }, select: { status: true },
    }),
    prisma.feeInvoice.findMany({ where: { studentId }, select: { amount: true, paidAmount: true, status: true } }),
    student.classId
      ? prisma.homework.findMany({
          where: { classId: student.classId },
          include: { class: true, submissions: { where: { studentId }, select: { status: true } } },
          orderBy: { dueDate: 'asc' }, take: 5,
        })
      : [],
    prisma.announcement.findMany({
      where: {
        schoolId: student.schoolId, status: 'active',
        OR: [{ targetRoles: { has: 'all' } }, { targetRoles: { has: 'parents' } }],
      },
      orderBy: { createdAt: 'desc' }, take: 5,
      select: { id: true, title: true, content: true, priority: true, createdAt: true },
    }),
  ]);

  const present = monthAttendance.filter((a) => a.status === 'present').length;
  const absent  = monthAttendance.filter((a) => a.status === 'absent').length;
  const late    = monthAttendance.filter((a) => a.status === 'late').length;
  const total   = monthAttendance.length;

  const feePending = feeInvoices
    .filter((i) => ['unpaid', 'overdue', 'partial'].includes(i.status))
    .reduce((s, i) => s + (Number(i.amount) - Number(i.paidAmount)), 0);

  return {
    isParentView: true,
    student: {
      id: student.id, school_id: student.schoolId, class_id: student.classId,
      first_name: student.firstName, last_name: student.lastName,
      grade: student.class?.grade ?? null, section: student.class?.section ?? null,
    },
    stats: {
      todayStatus:     todayAttendance?.status ?? null,
      monthAttendance: { present, absent, late, total, rate: total > 0 ? Math.round((present / total) * 100) : 0 },
      fees: {
        total:        feeInvoices.reduce((s, i) => s + Number(i.amount), 0),
        collected:    feeInvoices.reduce((s, i) => s + Number(i.paidAmount), 0),
        pending:      feePending,
        overdueCount: feeInvoices.filter((i) => i.status === 'overdue').length,
        dueCount:     feeInvoices.filter((i) => ['unpaid', 'overdue', 'partial'].includes(i.status)).length,
      },
    },
    recentAnnouncements,
    recentHomework: (recentHomework as any[]).map((h) => ({
      id: h.id, subject: h.subject, title: h.title, due_date: h.dueDate,
      grade: h.class.grade, section: h.class.section,
      submission_status: h.submissions[0]?.status ?? null,
    })),
  };
}
