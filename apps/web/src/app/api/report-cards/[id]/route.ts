import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, NotFoundError } from '@/utils/errors';
import prisma from '@/lib/prisma';

function getPrimary(user: any) {
  return user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
}
function isParent(user: any) { return user.roles.some((r: any) => r.role_code === 'parent'); }
function canSend(user: any) {
  return user.roles.some((r: any) => ['school_admin', 'principal', 'teacher', 'super_admin'].includes(r.role_code));
}

// ── GET /api/report-cards/[id] ───────────────────────────────────────────────
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const { id } = await params;

    const card = await prisma.reportCard.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true, firstName: true, lastName: true, admissionNo: true,
            gender: true, photoUrl: true,
            class: { select: { grade: true, section: true, name: true } },
            school: { select: { id: true, name: true } },
          },
        },
        sentBy: { select: { firstName: true, lastName: true } },
        school: { select: { id: true, name: true } },
      },
    });
    if (!card) throw new NotFoundError('Report card');

    if (isParent(user)) {
      const parentRecord = await prisma.parent.findUnique({
        where: { userId: user.id },
        include: { parentStudents: { select: { studentId: true } } },
      });
      const childIds = parentRecord?.parentStudents.map(ps => ps.studentId) ?? [];
      if (!childIds.includes(card.studentId))
        throw new ForbiddenError('Access denied');
    } else if (canSend(user)) {
      const schoolId = getPrimary(user)?.school_id;
      if (schoolId && card.schoolId !== schoolId)
        throw new ForbiddenError('Access denied');
    } else {
      throw new ForbiddenError('Access denied');
    }

    if (isParent(user) && !card.viewedAt) {
      await prisma.reportCard.update({
        where: { id: card.id },
        data:  { viewedAt: new Date(), status: 'viewed' },
      });
    }

    function safe(s: string | null) {
      if (!s) return null;
      try { return JSON.parse(s); } catch { return null; }
    }

    return Response.json({
      reportCard: {
        ...card,
        academicData:   safe(card.academicData),
        attendanceData: safe(card.attendanceData),
        behaviorData:   safe(card.behaviorData),
      },
    });
  } catch (err) { return handleError(err); }
}

// ── PATCH /api/report-cards/[id] ─────────────────────────────────────────────
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!canSend(user)) throw new ForbiddenError('Access denied');
    const { id } = await params;

    const card = await prisma.reportCard.findUnique({ where: { id } });
    if (!card) throw new NotFoundError('Report card');

    const schoolId = getPrimary(user)?.school_id;
    if (schoolId && card.schoolId !== schoolId) throw new ForbiddenError('Access denied');

    const { teacherRemarks } = await request.json();
    const updated = await prisma.reportCard.update({
      where: { id },
      data:  { teacherRemarks: teacherRemarks ?? card.teacherRemarks },
    });
    return Response.json({ reportCard: updated });
  } catch (err) { return handleError(err); }
}
