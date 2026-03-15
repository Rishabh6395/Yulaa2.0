import { getUserFromRequest } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
  const schoolId = primaryRole.school_id!;
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const classId = searchParams.get('class_id');
  const studentId = searchParams.get('student_id');
  const month = searchParams.get('month'); // YYYY-MM

  try {
    // Monthly data for a student (calendar view)
    if (studentId && month) {
      const [year, monthNum] = month.split('-').map(Number);
      const firstDay = new Date(year, monthNum - 1, 1);
      const lastDay = new Date(year, monthNum, 0);

      const attendance = await prisma.attendance.findMany({
        where: {
          studentId,
          date: { gte: firstDay, lte: lastDay },
        },
        select: { date: true, status: true },
        orderBy: { date: 'asc' },
      });

      return Response.json({ attendance });
    }

    const date = new Date(dateStr);
    date.setUTCHours(0, 0, 0, 0);

    // Class attendance for a specific date
    if (classId) {
      const students = await prisma.student.findMany({
        where: { classId, status: 'active' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNo: true,
          attendance: {
            where: { date },
            select: { id: true, status: true, remarks: true },
          },
        },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      });

      const rows = students.map((s) => ({
        student_id: s.id,
        first_name: s.firstName,
        last_name: s.lastName,
        admission_no: s.admissionNo,
        status: s.attendance[0]?.status ?? null,
        remarks: s.attendance[0]?.remarks ?? null,
        attendance_id: s.attendance[0]?.id ?? null,
      }));

      return Response.json({ students: rows, date: dateStr });
    }

    // Summary for a date: group by class
    const classes = await prisma.class.findMany({
      where: { schoolId },
      select: {
        id: true,
        grade: true,
        section: true,
        attendance: {
          where: { date },
          select: { status: true },
        },
      },
      orderBy: [{ grade: 'asc' }, { section: 'asc' }],
    });

    const rows = classes.map((c) => ({
      class_id: c.id,
      grade: c.grade,
      section: c.section,
      present: c.attendance.filter((a) => a.status === 'present').length,
      absent: c.attendance.filter((a) => a.status === 'absent').length,
      late: c.attendance.filter((a) => a.status === 'late').length,
      total: c.attendance.length,
    }));

    return Response.json({ classes: rows, date: dateStr });
  } catch (err) {
    console.error('Attendance GET error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
  const schoolId = primaryRole.school_id!;

  try {
    const body = await request.json();
    const { records, date, class_id } = body;

    if (!records || !Array.isArray(records) || !date || !class_id) {
      return Response.json({ error: 'records array, date, and class_id required' }, { status: 400 });
    }

    const parsedDate = new Date(date);
    parsedDate.setUTCHours(0, 0, 0, 0);

    await Promise.all(
      records.map((record: { student_id: string; status: string; remarks?: string }) =>
        prisma.attendance.upsert({
          where: { studentId_date: { studentId: record.student_id, date: parsedDate } },
          create: {
            schoolId,
            studentId: record.student_id,
            classId: class_id,
            date: parsedDate,
            status: record.status,
            markedBy: user.id,
            remarks: record.remarks || null,
          },
          update: {
            status: record.status,
            markedBy: user.id,
            remarks: record.remarks || null,
          },
        })
      )
    );

    return Response.json({ message: `Attendance marked for ${records.length} students`, date });
  } catch (err) {
    console.error('Attendance POST error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
