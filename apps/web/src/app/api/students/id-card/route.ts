/**
 * GET /api/students/id-card?student_id=X
 *
 * Returns all data needed to render a student ID card as PDF/image.
 * The frontend uses this to generate the card via a PDF library or print CSS.
 *
 * GET /api/students/id-card?class_id=X   — bulk: all students in class
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');
    const classId   = searchParams.get('class_id');

    if (!studentId && !classId) throw new AppError('student_id or class_id required');

    const schoolId: string = primary.school_id ?? searchParams.get('school_id') ?? '';
    if (!schoolId && primary.role_code !== 'super_admin') throw new AppError('school_id required');

    // Parent can only access their own child
    if (primary.role_code === 'parent' && studentId) {
      const link = await prisma.parentStudent.findFirst({
        where: { parentId: (await prisma.parent.findUnique({ where: { userId: user.id } }))?.id ?? '', studentId },
      });
      if (!link) throw new ForbiddenError('Access denied');
    } else if (!['super_admin', 'school_admin', 'principal', 'teacher'].includes(primary.role_code)) {
      throw new ForbiddenError('Access denied');
    }

    const students = await prisma.student.findMany({
      where: {
        ...(studentId ? { id: studentId } : {}),
        ...(classId   ? { classId }       : {}),
        ...(schoolId  ? { schoolId }       : {}),
        status: 'active',
      },
      select: {
        id: true, firstName: true, lastName: true, admissionNo: true,
        dateOfBirth: true, gender: true, photoUrl: true, bloodGroup: true,
        class: { select: { grade: true, section: true, name: true } },
        school: { select: { id: true, name: true, address: true, phone: true, logoUrl: true } },
        parentStudents: {
          where:   { isPrimary: true },
          include: { parent: { select: { user: { select: { firstName: true, lastName: true, phone: true } } } } },
          take: 1,
        },
      },
    });

    const cards = students.map(s => ({
      studentId:    s.id,
      admissionNo:  s.admissionNo,
      name:         `${s.firstName} ${s.lastName}`,
      dateOfBirth:  s.dateOfBirth,
      gender:       s.gender,
      photoUrl:     s.photoUrl,
      bloodGroup:   s.bloodGroup,
      class:        s.class ? `${s.class.grade} - ${s.class.section}` : null,
      school: {
        name:    s.school.name,
        address: s.school.address,
        phone:   s.school.phone,
        logoUrl: s.school.logoUrl,
      },
      guardian: s.parentStudents[0]
        ? {
            name:  `${s.parentStudents[0].parent.user.firstName} ${s.parentStudents[0].parent.user.lastName}`,
            phone: s.parentStudents[0].parent.user.phone,
          }
        : null,
    }));

    return Response.json(studentId ? { card: cards[0] ?? null } : { cards });
  } catch (err) { return handleError(err); }
}
