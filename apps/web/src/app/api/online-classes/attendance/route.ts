/**
 * Online Class Attendance
 * GET   - teacher views attendance for a class
 * POST  - teacher bulk-marks attendance for a session
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const { role_code: role, school_id: schoolId } = primary;

    if (!['teacher', 'school_admin', 'principal', 'hod'].includes(role)) throw new ForbiddenError();

    const { searchParams } = new URL(request.url);
    const onlineClassId = searchParams.get('online_class_id');
    if (!onlineClassId) throw new AppError('online_class_id is required');

    // Verify the online class belongs to this school
    const oc = await prisma.onlineClass.findFirst({ where: { id: onlineClassId, schoolId } });
    if (!oc) throw new AppError('Online class not found');

    // Get class students + their attendance records
    const students = oc.classId
      ? await prisma.student.findMany({
          where: { classId: oc.classId, status: 'active' },
          select: { id: true, firstName: true, lastName: true, admissionNo: true },
          orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        })
      : [];

    const attendances = await prisma.onlineClassAttendance.findMany({
      where: { onlineClassId },
      select: { studentId: true, status: true, markedByTeacher: true, joinedAt: true, durationMinutes: true },
    });
    const attendanceMap = Object.fromEntries(attendances.map(a => [a.studentId, a]));

    const rows = students.map(s => ({
      ...s,
      attendance: attendanceMap[s.id] ?? null,
    }));

    return Response.json({ students: rows, total: rows.length, onlineClass: oc });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const { role_code: role, school_id: schoolId } = primary;

    if (!['teacher', 'school_admin', 'principal'].includes(role)) throw new ForbiddenError();

    const body = await request.json();
    const { online_class_id, attendance } = body;
    // attendance: [{ student_id, status }]

    if (!online_class_id || !Array.isArray(attendance)) {
      throw new AppError('online_class_id and attendance[] are required');
    }

    // Verify class belongs to school
    const oc = await prisma.onlineClass.findFirst({ where: { id: online_class_id, schoolId } });
    if (!oc) throw new AppError('Online class not found');

    // If teacher, verify ownership
    if (role === 'teacher') {
      const teacher = await prisma.teacher.findFirst({ where: { schoolId, userId: user.id }, select: { id: true } });
      if (!teacher || oc.teacherId !== teacher.id) throw new ForbiddenError();
    }

    // Upsert attendance records
    await Promise.all(
      attendance.map((a: { student_id: string; status: string }) =>
        prisma.onlineClassAttendance.upsert({
          where: { onlineClassId_studentId: { onlineClassId: online_class_id, studentId: a.student_id } },
          create: { onlineClassId: online_class_id, studentId: a.student_id, status: a.status, markedByTeacher: true },
          update: { status: a.status, markedByTeacher: true },
        })
      )
    );

    return Response.json({ saved: attendance.length });
  } catch (err) { return handleError(err); }
}
