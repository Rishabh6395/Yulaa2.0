/**
 * PATCH /api/report-cards/[id]/status
 *
 * Drives the report card through its lifecycle:
 *   draft → principal_approved  (principal / school_admin)
 *   principal_approved → published  (principal / school_admin — sets publishedAt)
 *   published → parent_acknowledged  (parent — explicit acknowledgement)
 *
 * Body: { status: 'principal_approved' | 'published' | 'parent_acknowledged', remarks?: string }
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, NotFoundError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const PRINCIPAL_ROLES = ['school_admin', 'principal', 'super_admin'];

function getPrimary(user: any) {
  return user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const { id } = await params;
    const body = await request.json();
    const { status: newStatus, remarks } = body;

    if (!newStatus) throw new AppError('status is required', 400);

    const card = await prisma.reportCard.findUnique({ where: { id } });
    if (!card) throw new NotFoundError('Report card');

    const primary   = getPrimary(user);
    const isPrincipal = PRINCIPAL_ROLES.includes(primary.role_code);
    const isParent    = primary.role_code === 'parent';

    // School scope check for staff
    if (!isParent && primary.school_id && card.schoolId !== primary.school_id)
      throw new ForbiddenError('Access denied');

    const current = card.status;

    if (newStatus === 'principal_approved') {
      if (!isPrincipal) throw new ForbiddenError('Only principal or admin can approve report cards');
      if (current !== 'draft') throw new AppError(`Cannot approve: report card is already ${current}`, 400);
      const updated = await prisma.reportCard.update({
        where: { id },
        data:  { status: 'principal_approved', ...(remarks ? { principalRemarks: remarks } : {}) },
      });
      return Response.json({ reportCard: updated });
    }

    if (newStatus === 'published') {
      if (!isPrincipal) throw new ForbiddenError('Only principal or admin can publish report cards');
      if (current !== 'principal_approved' && current !== 'draft')
        throw new AppError(`Cannot publish: report card must be approved first (current: ${current})`, 400);
      const updated = await prisma.reportCard.update({
        where: { id },
        data:  { status: 'published', publishedAt: new Date() },
      });
      return Response.json({ reportCard: updated });
    }

    if (newStatus === 'parent_acknowledged') {
      if (!isParent) throw new ForbiddenError('Only a parent can acknowledge a report card');
      // Verify this parent's child owns the report card
      const parentRecord = await prisma.parent.findUnique({
        where:   { userId: user.id },
        include: { parentStudents: { select: { studentId: true } } },
      });
      const childIds = parentRecord?.parentStudents.map((ps: any) => ps.studentId) ?? [];
      if (!childIds.includes(card.studentId)) throw new ForbiddenError('Access denied');
      if (current !== 'published') throw new AppError('Report card must be published before it can be acknowledged', 400);
      const updated = await prisma.reportCard.update({
        where: { id },
        data:  { status: 'parent_acknowledged', parentAcknowledgedAt: new Date(), viewedAt: card.viewedAt ?? new Date() },
      });
      return Response.json({ reportCard: updated });
    }

    throw new AppError(`Invalid status transition: ${newStatus}`, 400);
  } catch (err) { return handleError(err); }
}
