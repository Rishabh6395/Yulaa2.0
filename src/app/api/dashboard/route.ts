import { getUserFromRequest } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('student_id');
  const isParent = user.roles.some((r) => r.role_code === 'parent');

  // Parent view: return child-specific stats
  if (isParent && studentId) {
    try {
      // Validate parent has access to this student
      const parent = await prisma.parent.findUnique({ where: { userId: user.id } });
      if (!parent) {
        return Response.json({ error: 'Parent profile not found' }, { status: 404 });
      }

      const link = await prisma.parentStudent.findFirst({
        where: { parentId: parent.id, studentId },
        include: {
          student: {
            include: { class: true },
          },
        },
      });

      if (!link) {
        return Response.json({ error: 'Student not found or access denied' }, { status: 404 });
      }

      const student = link.student;
      const childSchoolId = student.schoolId;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      // Today's attendance status
      const todayAttendance = await prisma.attendance.findUnique({
        where: { studentId_date: { studentId, date: today } },
        select: { status: true },
      });

      // This month's attendance summary
      const monthAttendance = await prisma.attendance.findMany({
        where: {
          studentId,
          date: { gte: firstOfMonth, lte: lastOfMonth },
        },
        select: { status: true },
      });

      const present = monthAttendance.filter((a) => a.status === 'present').length;
      const absent = monthAttendance.filter((a) => a.status === 'absent').length;
      const late = monthAttendance.filter((a) => a.status === 'late').length;
      const total = monthAttendance.length;
      const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;

      // Fee summary for this student
      const feeInvoices = await prisma.feeInvoice.findMany({
        where: { studentId },
        select: { amount: true, paidAmount: true, status: true },
      });

      const feeTotal = feeInvoices.reduce((s, i) => s + Number(i.amount), 0);
      const feeCollected = feeInvoices.reduce((s, i) => s + Number(i.paidAmount), 0);
      const feePending = feeInvoices
        .filter((i) => ['unpaid', 'overdue', 'partial'].includes(i.status))
        .reduce((s, i) => s + (Number(i.amount) - Number(i.paidAmount)), 0);
      const overdueCount = feeInvoices.filter((i) => i.status === 'overdue').length;
      const dueCount = feeInvoices.filter((i) =>
        ['unpaid', 'overdue', 'partial'].includes(i.status)
      ).length;

      // Recent homework for this student's class
      const recentHomework = student.classId
        ? await prisma.homework.findMany({
            where: { classId: student.classId },
            include: {
              class: true,
              submissions: {
                where: { studentId },
                select: { status: true },
              },
            },
            orderBy: { dueDate: 'asc' },
            take: 5,
          })
        : [];

      // Recent announcements from this child's school
      const recentAnnouncements = await prisma.announcement.findMany({
        where: {
          schoolId: childSchoolId,
          status: 'active',
          OR: [
            { targetRoles: { has: 'all' } },
            { targetRoles: { has: 'parents' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, content: true, priority: true, createdAt: true },
      });

      const homeworkRows = recentHomework.map((h) => ({
        id: h.id,
        subject: h.subject,
        title: h.title,
        due_date: h.dueDate,
        grade: h.class.grade,
        section: h.class.section,
        submission_status: h.submissions[0]?.status ?? null,
      }));

      return Response.json({
        isParentView: true,
        student: {
          id: student.id,
          school_id: student.schoolId,
          class_id: student.classId,
          first_name: student.firstName,
          last_name: student.lastName,
          grade: student.class?.grade ?? null,
          section: student.class?.section ?? null,
        },
        stats: {
          todayStatus: todayAttendance?.status ?? null,
          monthAttendance: { present, absent, late, total, rate: attendanceRate },
          fees: {
            total: feeTotal,
            collected: feeCollected,
            pending: feePending,
            overdueCount,
            dueCount,
          },
        },
        recentAnnouncements,
        recentHomework: homeworkRows,
      });
    } catch (err) {
      console.error('Parent dashboard error:', err);
      return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  // Admin / teacher / default view
  const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
  const schoolId = primaryRole.school_id!;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalStudents,
      approvedStudents,
      pendingStudents,
      totalTeachers,
      totalClasses,
      todayAttendanceRows,
      feeInvoices,
      recentAnnouncements,
      recentHomework,
    ] = await Promise.all([
      prisma.student.count({ where: { schoolId } }),
      prisma.student.count({ where: { schoolId, status: 'active' } }),
      prisma.student.count({ where: { schoolId, status: 'pending' } }),
      prisma.teacher.count({ where: { schoolId, status: 'active' } }),
      prisma.class.count({ where: { schoolId } }),
      prisma.attendance.findMany({
        where: { schoolId, date: today },
        select: { status: true },
      }),
      prisma.feeInvoice.findMany({
        where: { schoolId },
        select: { amount: true, paidAmount: true, status: true },
      }),
      prisma.announcement.findMany({
        where: { schoolId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, content: true, priority: true, createdAt: true },
      }),
      prisma.homework.findMany({
        where: { schoolId },
        include: {
          class: true,
          teacher: { include: { user: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const presentCount = todayAttendanceRows.filter((a) => a.status === 'present').length;
    const absentCount = todayAttendanceRows.filter((a) => a.status === 'absent').length;
    const lateCount = todayAttendanceRows.filter((a) => a.status === 'late').length;
    const totalAttendance = todayAttendanceRows.length;
    const attendanceRate =
      totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

    const feeTotal = feeInvoices.reduce((s, i) => s + Number(i.amount), 0);
    const feeCollected = feeInvoices.reduce((s, i) => s + Number(i.paidAmount), 0);
    const feePending = feeInvoices
      .filter((i) => ['unpaid', 'overdue', 'partial'].includes(i.status))
      .reduce((s, i) => s + (Number(i.amount) - Number(i.paidAmount)), 0);
    const overdueCount = feeInvoices.filter((i) => i.status === 'overdue').length;

    const homeworkRows = recentHomework.map((h) => ({
      id: h.id,
      subject: h.subject,
      title: h.title,
      due_date: h.dueDate,
      grade: h.class.grade,
      section: h.class.section,
      teacher_name: `${h.teacher.user.firstName} ${h.teacher.user.lastName}`,
    }));

    return Response.json({
      stats: {
        totalStudents,
        approvedStudents,
        pendingAdmissions: pendingStudents,
        totalTeachers,
        totalClasses,
        todayAttendance: {
          present: presentCount,
          absent: absentCount,
          late: lateCount,
          total: totalAttendance,
          rate: attendanceRate,
        },
        fees: {
          totalFees: feeTotal,
          collected: feeCollected,
          pending: feePending,
          overdueCount,
        },
      },
      recentAnnouncements,
      recentHomework: homeworkRows,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
