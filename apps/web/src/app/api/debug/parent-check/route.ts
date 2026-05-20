import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError } from '@/utils/errors';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const userId = user.id;

    // Check Parent record
    const parent = await prisma.parent.findUnique({ where: { userId } });

    // Check ParentStudent links
    const links = parent
      ? await prisma.parentStudent.findMany({
          where: { parentId: parent.id },
          include: { student: { select: { id: true, firstName: true, lastName: true, admissionNo: true, status: true, schoolId: true } } },
        })
      : [];

    // Count total students in DB for reference
    const totalStudents = await prisma.student.count();
    const totalParents  = await prisma.parent.count();
    const totalLinks    = await prisma.parentStudent.count();

    return Response.json({
      userId,
      parentRecord: parent ? { id: parent.id, userId: parent.userId } : null,
      childLinks: links.map(l => ({
        studentId: l.studentId,
        studentName: `${l.student.firstName} ${l.student.lastName}`,
        admissionNo: l.student.admissionNo,
        status: l.student.status,
      })),
      dbStats: { totalStudents, totalParents, totalLinks },
    });
  } catch (err) { return handleError(err); }
}
