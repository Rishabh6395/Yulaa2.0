import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    // Diagnostic endpoint — super_admin only.
    // Previously exposed cross-tenant aggregate counts to any authenticated user (G-004).
    const isSuperAdmin = user.roles.some((r) => r.role_code === 'super_admin');
    if (!isSuperAdmin) throw new ForbiddenError();

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');

    const userId = user.id;
    const parent = await prisma.parent.findUnique({ where: { userId } });

    const links = parent
      ? await prisma.parentStudent.findMany({
          where: { parentId: parent.id },
          include: {
            student: {
              select: { id: true, firstName: true, lastName: true, admissionNo: true, status: true, schoolId: true },
            },
          },
        })
      : [];

    // DB stats are always scoped to a specific school — never cross-tenant.
    const dbStats = schoolId
      ? {
          schoolId,
          totalStudents: await prisma.student.count({ where: { schoolId } }),
          totalParents:  await prisma.user.count({
            where: { userRoles: { some: { schoolId, role: { code: 'parent' } } } },
          }),
          totalLinks: await prisma.parentStudent.count({ where: { student: { schoolId } } }),
        }
      : null;

    return Response.json({
      userId,
      parentRecord: parent ? { id: parent.id, userId: parent.userId } : null,
      childLinks: links.map((l) => ({
        studentId:   l.studentId,
        studentName: `${l.student.firstName} ${l.student.lastName}`,
        admissionNo: l.student.admissionNo,
        status:      l.student.status,
      })),
      dbStats,
      note: dbStats ? undefined : 'Pass ?schoolId=<id> to get school-scoped stats.',
    });
  } catch (err) { return handleError(err); }
}
