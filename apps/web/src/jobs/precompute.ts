/**
 * Precomputation worker — runs via /api/cron/dashboard
 *
 * Fills Redis ahead of time so API reads are ~5–20 ms (Redis GET only).
 * Dashboard routes fall back to DB only on a cold start or after a deploy.
 */

import prisma from '@/lib/prisma';
import { cacheSet } from '@/lib/redis';
import { CacheTTL } from '@/services/cache.service';

// ── Compute helpers (pure DB → return, no caching inside) ────────────────────

export async function computeSuperAdminDashboard() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalSchools, activeSchools, totalStudents, totalTeachers, totalClasses, todayAttendanceRows, feeInvoices] = await Promise.all([
    prisma.school.count(),
    prisma.school.count({ where: { status: 'active' } }),
    prisma.student.count(),
    prisma.teacher.count({ where: { status: 'active' } }),
    prisma.class.count(),
    prisma.attendance.findMany({ where: { date: today }, select: { status: true } }),
    prisma.feeInvoice.findMany({ select: { amount: true, paidAmount: true, status: true } }),
  ]);

  const present = todayAttendanceRows.filter((a) => a.status === 'present').length;
  const total   = todayAttendanceRows.length;

  return {
    isSuperAdmin: true,
    stats: {
      totalSchools, activeSchools,
      totalStudents, totalTeachers, totalClasses,
      todayAttendance: { present, total, rate: total > 0 ? Math.round((present / total) * 100) : 0 },
      fees: {
        totalFees:    feeInvoices.reduce((s, i) => s + Number(i.amount), 0),
        collected:    feeInvoices.reduce((s, i) => s + Number(i.paidAmount), 0),
        overdueCount: feeInvoices.filter((i) => i.status === 'overdue').length,
      },
    },
  };
}

export async function computeAdminDashboard(schoolId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalStudents, approvedStudents, pendingStudents,
    totalTeachers, totalClasses,
    todayAttendanceRows, feeInvoices, recentAnnouncements, recentHomework,
  ] = await Promise.all([
    prisma.student.count({ where: { schoolId } }),
    prisma.student.count({ where: { schoolId, status: 'active' } }),
    prisma.student.count({ where: { schoolId, status: 'pending' } }),
    prisma.teacher.count({ where: { schoolId, status: 'active' } }),
    prisma.class.count({ where: { schoolId } }),
    prisma.attendance.findMany({ where: { schoolId, date: today }, select: { status: true } }),
    prisma.feeInvoice.findMany({ where: { schoolId }, select: { amount: true, paidAmount: true, status: true } }),
    prisma.announcement.findMany({
      where: { schoolId }, orderBy: { createdAt: 'desc' }, take: 5,
      select: { id: true, title: true, content: true, priority: true, createdAt: true },
    }),
    prisma.homework.findMany({
      where: { schoolId },
      include: { class: true, teacher: { include: { user: true } } },
      orderBy: { createdAt: 'desc' }, take: 5,
    }),
  ]);

  const present = todayAttendanceRows.filter((a) => a.status === 'present').length;
  const absent  = todayAttendanceRows.filter((a) => a.status === 'absent').length;
  const late    = todayAttendanceRows.filter((a) => a.status === 'late').length;
  const total   = todayAttendanceRows.length;

  const feeTotal     = feeInvoices.reduce((s, i) => s + Number(i.amount), 0);
  const feeCollected = feeInvoices.reduce((s, i) => s + Number(i.paidAmount), 0);
  const feePending   = feeInvoices
    .filter((i) => ['unpaid', 'overdue', 'partial'].includes(i.status))
    .reduce((s, i) => s + (Number(i.amount) - Number(i.paidAmount)), 0);

  return {
    stats: {
      totalStudents, approvedStudents, pendingAdmissions: pendingStudents,
      totalTeachers, totalClasses,
      todayAttendance: { present, absent, late, total, rate: total > 0 ? Math.round((present / total) * 100) : 0 },
      fees: { totalFees: feeTotal, collected: feeCollected, pending: feePending, overdueCount: feeInvoices.filter((i) => i.status === 'overdue').length },
    },
    recentAnnouncements,
    recentHomework: recentHomework.map((h) => ({
      id: h.id, subject: h.subject, title: h.title, due_date: h.dueDate,
      grade: h.class.grade, section: h.class.section,
      teacher_name: `${h.teacher.user.firstName} ${h.teacher.user.lastName}`,
    })),
  };
}

export async function computeTeacherDashboard(userId: string, schoolId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const teacher = await prisma.teacher.findUnique({
    where: { userId_schoolId: { userId, schoolId } },
  });

  if (!teacher) {
    const announcements = await prisma.announcement.findMany({
      where: { schoolId }, orderBy: { createdAt: 'desc' }, take: 5,
      select: { id: true, title: true, content: true, priority: true, createdAt: true },
    });
    return {
      stats: { totalStudents: 0, todayAttendance: { present: 0, absent: 0, late: 0, total: 0, rate: 0 } },
      recentAnnouncements: announcements,
    };
  }

  const myClass = await prisma.class.findFirst({
    where: { classTeacherId: teacher.id, schoolId },
  });

  const [totalStudents, todayAttendanceRows, announcements] = await Promise.all([
    myClass
      ? prisma.student.count({ where: { classId: myClass.id } })
      : prisma.student.count({ where: { schoolId } }),
    myClass ? prisma.attendance.findMany({ where: { classId: myClass.id, date: today }, select: { status: true } }) : [],
    prisma.announcement.findMany({
      where: { schoolId }, orderBy: { createdAt: 'desc' }, take: 5,
      select: { id: true, title: true, content: true, priority: true, createdAt: true },
    }),
  ]);

  const present = (todayAttendanceRows as { status: string }[]).filter((a) => a.status === 'present').length;
  const absent  = (todayAttendanceRows as { status: string }[]).filter((a) => a.status === 'absent').length;
  const late    = (todayAttendanceRows as { status: string }[]).filter((a) => a.status === 'late').length;
  const total   = (todayAttendanceRows as { status: string }[]).length;

  return {
    stats: {
      totalStudents,
      className:   myClass ? `${myClass.grade} ${myClass.section}` : null,
      sectionName: myClass?.section ?? null,
      todayAttendance: { present, absent, late, total, rate: total > 0 ? Math.round((present / total) * 100) : 0 },
    },
    recentAnnouncements: announcements,
  };
}

// ── Precompute runner ─────────────────────────────────────────────────────────

/**
 * Precomputes and stores all dashboard data in Redis for every school/teacher.
 * Designed to run as a background cron job (every 2–5 minutes).
 */
export async function precomputeAllDashboards(): Promise<{ computed: string[] }> {
  const computed: string[] = [];

  // 1. Super-admin dashboard
  try {
    const data = await computeSuperAdminDashboard();
    await cacheSet('dashboard:super_admin', data, CacheTTL.dashboard);
    computed.push('dashboard:super_admin');
  } catch (e) {
    console.error('[precompute] super_admin failed:', e);
  }

  // 2. Per-school admin dashboards
  const schools = await prisma.school.findMany({
    where:  { status: 'active' },
    select: { id: true },
  });

  await Promise.allSettled(
    schools.map(async ({ id: schoolId }) => {
      try {
        const data = await computeAdminDashboard(schoolId);
        await cacheSet(`dashboard:admin:${schoolId}`, data, CacheTTL.dashboard);
        computed.push(`dashboard:admin:${schoolId}`);
      } catch (e) {
        console.error(`[precompute] admin:${schoolId} failed:`, e);
      }
    }),
  );

  // 3. Per-teacher dashboards (only active class teachers)
  const teachers = await prisma.teacher.findMany({
    where:  { status: 'active' },
    select: { userId: true, schoolId: true },
  });

  await Promise.allSettled(
    teachers.map(async ({ userId, schoolId }) => {
      try {
        const data = await computeTeacherDashboard(userId, schoolId);
        await cacheSet(`dashboard:teacher:${userId}:${schoolId}`, data, CacheTTL.dashboard);
        computed.push(`dashboard:teacher:${userId}:${schoolId}`);
      } catch (e) {
        console.error(`[precompute] teacher:${userId} failed:`, e);
      }
    }),
  );

  console.log(`[precompute] Done — ${computed.length} keys written`);
  return { computed };
}
