import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const ALLOWED = new Set(['super_admin', 'school_admin']);

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!user.roles.some((r: any) => ALLOWED.has(r.role_code))) throw new ForbiddenError();

    const primaryRole = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const schoolId    = primaryRole.school_id;
    const { searchParams } = new URL(request.url);

    const year  = parseInt(searchParams.get('year')  ?? String(new Date().getFullYear()), 10);
    const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1), 10);

    const from = new Date(Date.UTC(year, month - 1, 1));
    const to   = new Date(Date.UTC(year, month, 0, 23, 59, 59));

    const whereSchool = schoolId ? { schoolId } : {};

    const [
      attendance,
      feeInvoices,
      homeworkStats,
      leaveStats,
      queryStats,
      studentCount,
      teacherCount,
      newStudents,
    ] = await Promise.all([
      // Attendance for month
      prisma.attendance.findMany({
        where: { ...whereSchool, date: { gte: from, lte: to } },
        select: { status: true, date: true },
      }),
      // Fee invoices due or paid this month
      prisma.feeInvoice.findMany({
        where: { ...whereSchool, dueDate: { gte: from, lte: to } },
        select: { amount: true, paidAmount: true, status: true },
      }),
      // Homework created this month
      prisma.homework.groupBy({
        by: ['classId'],
        where: { ...whereSchool, createdAt: { gte: from, lte: to } },
        _count: true,
      }),
      // Leave requests this month
      prisma.leaveRequest.groupBy({
        by: ['status'],
        where: { ...whereSchool, createdAt: { gte: from, lte: to } },
        _count: true,
      }),
      // Queries this month
      prisma.studentQuery.groupBy({
        by: ['status'],
        where: { ...whereSchool, createdAt: { gte: from, lte: to } },
        _count: true,
      }),
      // Active students
      prisma.student.count({ where: { ...whereSchool, status: 'active' } }),
      // Active teachers
      prisma.teacher.count({ where: { ...whereSchool, status: 'active' } }),
      // New admissions this month
      prisma.student.count({ where: { ...whereSchool, createdAt: { gte: from, lte: to } } }),
    ]);

    // Attendance summary
    const totalAttendance = attendance.length;
    const presentDays     = attendance.filter(a => a.status === 'present').length;
    const absentDays      = attendance.filter(a => a.status === 'absent').length;
    const lateCount       = attendance.filter(a => a.status === 'late').length;
    const attendanceRate  = totalAttendance > 0 ? Math.round((presentDays / totalAttendance) * 100) : 0;

    // Attendance by day (for chart)
    const byDay: Record<string, { present: number; absent: number; late: number }> = {};
    for (const a of attendance) {
      const d = a.date.toISOString().split('T')[0];
      if (!byDay[d]) byDay[d] = { present: 0, absent: 0, late: 0 };
      byDay[d][a.status as 'present' | 'absent' | 'late'] = (byDay[d][a.status as 'present' | 'absent' | 'late'] ?? 0) + 1;
    }
    const attendanceByDay = Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ date, ...counts }));

    // Fee summary
    const totalFeesDue   = feeInvoices.reduce((s, i) => s + Number(i.amount), 0);
    const totalCollected = feeInvoices.reduce((s, i) => s + Number(i.paidAmount), 0);
    const feesPending    = feeInvoices.filter(i => i.status === 'unpaid' || i.status === 'partial').length;
    const feesOverdue    = feeInvoices.filter(i => i.status === 'overdue').length;
    const collectionRate = totalFeesDue > 0 ? Math.round((totalCollected / totalFeesDue) * 100) : 0;

    // Homework
    const totalHomework = homeworkStats.reduce((s, h) => s + h._count, 0);

    // Leave
    const leaveApproved = leaveStats.find(l => l.status === 'approved')?._count ?? 0;
    const leavePending  = leaveStats.find(l => l.status === 'pending')?._count ?? 0;
    const leaveRejected = leaveStats.find(l => l.status === 'rejected')?._count ?? 0;

    // Queries
    const queriesOpen     = queryStats.find(q => q.status === 'open')?._count ?? 0;
    const queriesResolved = queryStats.find(q => q.status === 'resolved')?._count ?? 0;

    return Response.json({
      period: { year, month, from: from.toISOString(), to: to.toISOString() },
      overview: { studentCount, teacherCount, newStudents },
      attendance: {
        total: totalAttendance, present: presentDays, absent: absentDays,
        late: lateCount, rate: attendanceRate, byDay: attendanceByDay,
      },
      fees: {
        totalDue: totalFeesDue, collected: totalCollected,
        pending: feesPending, overdue: feesOverdue, collectionRate,
      },
      homework: { total: totalHomework },
      leave:    { approved: leaveApproved, pending: leavePending, rejected: leaveRejected },
      queries:  { open: queriesOpen, resolved: queriesResolved },
    });
  } catch (err) { return handleError(err); }
}
