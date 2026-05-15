/**
 * GET  /api/performance/skills?student_id=X&academic_year=YYYY-YYYY
 * POST /api/performance/skills  — teacher rates a student skill (upsert)
 * DELETE /api/performance/skills?id=X
 */
import { REVIEWER_ROLES } from '@/lib/roles';
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';
import { currentAcademicYearLabel } from '@/lib/school-utils';

const VALID_SKILLS = [
  'Communication', 'Critical Thinking', 'Creativity', 'Collaboration',
  'Leadership', 'Digital Skills', 'Problem Solving', 'Discipline',
  'Responsibility', 'Sports', 'Arts', 'Public Speaking',
];

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!REVIEWER_ROLES.includes(primaryRole.role_code)) throw new ForbiddenError('Access denied');
    const schoolId = primaryRole.school_id!;

    const { searchParams } = new URL(request.url);
    const studentId    = searchParams.get('student_id');
    const academicYear = searchParams.get('academic_year') || currentAcademicYearLabel();
    if (!studentId) throw new AppError('student_id is required');

    // Verify student belongs to school
    const student = await prisma.student.findFirst({ where: { id: studentId, schoolId }, select: { id: true } });
    if (!student) throw new AppError('Student not found', 404);

    const ratings = await prisma.studentSkillRating.findMany({
      where: { schoolId, studentId, academicYear },
      include: { teacher: { select: { user: { select: { firstName: true, lastName: true } } } } },
      orderBy: { skillName: 'asc' },
    });

    return Response.json({
      ratings: ratings.map(r => ({
        id:            r.id,
        skillName:     r.skillName,
        rating:        r.rating,
        comments:      r.comments,
        academicYear:  r.academicYear,
        teacherName:   r.teacher.user ? `${r.teacher.user.firstName} ${r.teacher.user.lastName}` : 'Unknown',
        createdAt:     r.createdAt,
        updatedAt:     r.updatedAt,
      })),
    });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!REVIEWER_ROLES.includes(primaryRole.role_code)) throw new ForbiddenError('Only teachers and admins can rate skills');
    const schoolId = primaryRole.school_id!;

    const { student_id, skill_name, rating, comments, academic_year } = await request.json();
    if (!student_id)  throw new AppError('student_id is required');
    if (!skill_name)  throw new AppError('skill_name is required');
    if (rating === undefined) throw new AppError('rating is required');
    if (typeof rating !== 'number' || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      throw new AppError('rating must be an integer 1–5');
    }

    // Verify student in same school
    const student = await prisma.student.findFirst({ where: { id: student_id, schoolId }, select: { id: true } });
    if (!student) throw new AppError('Student not found in your school', 404);

    // Resolve teacher record for the caller
    const teacher = await prisma.teacher.findFirst({ where: { userId: user.id, schoolId }, select: { id: true } });
    if (!teacher) throw new AppError('Teacher record not found');

    const academicYear = academic_year || currentAcademicYearLabel();

    const skillRating = await prisma.studentSkillRating.upsert({
      where: {
        schoolId_studentId_teacherId_skillName_academicYear: {
          schoolId, studentId: student_id, teacherId: teacher.id, skillName: skill_name, academicYear,
        },
      },
      update: { rating, comments: comments || null },
      create:  { schoolId, studentId: student_id, teacherId: teacher.id, skillName: skill_name, rating, comments: comments || null, academicYear },
    });

    return Response.json({ skillRating }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!REVIEWER_ROLES.includes(primaryRole.role_code)) throw new ForbiddenError('Access denied');
    const schoolId = primaryRole.school_id!;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) throw new AppError('id is required');

    // Scope to school
    const existing = await prisma.studentSkillRating.findFirst({ where: { id, schoolId }, select: { id: true } });
    if (!existing) throw new AppError('Skill rating not found', 404);

    await prisma.studentSkillRating.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
