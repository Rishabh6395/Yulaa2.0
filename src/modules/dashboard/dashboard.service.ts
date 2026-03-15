import prisma from '@/lib/prisma';
import { withCache, CacheTTL } from '@/services/cache.service';
import { NotFoundError, ForbiddenError } from '@/utils/errors';

/** Platform-wide stats for super_admin (not tied to any school) */
export async function getSuperAdminDashboard() {
  return withCache('dashboard:super_admin', CacheTTL.dashboard, async () => {
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
          totalFees:  feeInvoices.reduce((s, i) => s + Number(i.amount), 0),
          collected:  feeInvoices.reduce((s, i) => s + Number(i.paidAmount), 0),
          overdueCount: feeInvoices.filter((i) => i.status === 'overdue').length,
        },
      },
    };
  });
}

export async function getAdminDashboard(schoolId: string) {
  return withCache(`dashboard:admin:${schoolId}`, CacheTTL.dashboard, async () => {
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
  });
}

export async function getParentDashboard(userId: string, studentId: string) {
  return withCache(`dashboard:parent:${userId}:${studentId}`, CacheTTL.dashboardParent, async () => {
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
        where: { schoolId: student.schoolId, status: 'active', OR: [{ targetRoles: { has: 'all' } }, { targetRoles: { has: 'parents' } }] },
        orderBy: { createdAt: 'desc' }, take: 5,
        select: { id: true, title: true, content: true, priority: true, createdAt: true },
      }),
    ]);

    const present = monthAttendance.filter((a) => a.status === 'present').length;
    const absent  = monthAttendance.filter((a) => a.status === 'absent').length;
    const late    = monthAttendance.filter((a) => a.status === 'late').length;
    const total   = monthAttendance.length;

    const feePending   = feeInvoices
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
          total:       feeInvoices.reduce((s, i) => s + Number(i.amount), 0),
          collected:   feeInvoices.reduce((s, i) => s + Number(i.paidAmount), 0),
          pending:     feePending,
          overdueCount: feeInvoices.filter((i) => i.status === 'overdue').length,
          dueCount:    feeInvoices.filter((i) => ['unpaid', 'overdue', 'partial'].includes(i.status)).length,
        },
      },
      recentAnnouncements,
      recentHomework: recentHomework.map((h) => ({
        id: h.id, subject: h.subject, title: h.title, due_date: h.dueDate,
        grade: h.class.grade, section: h.class.section,
        submission_status: h.submissions[0]?.status ?? null,
      })),
    };
  });
}
