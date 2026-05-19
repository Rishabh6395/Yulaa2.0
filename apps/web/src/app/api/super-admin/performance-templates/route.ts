/**
 * GET    /api/super-admin/performance-templates          — list all templates
 * POST   /api/super-admin/performance-templates          — create template
 * PATCH  /api/super-admin/performance-templates?id=X    — update template
 * DELETE /api/super-admin/performance-templates?id=X    — delete template
 *
 * Super admin defines cycle templates (Quarterly, Monthly, etc.) with default weights.
 * School admin picks a template when creating a performance cycle.
 * weightAcademic + weightAttendance + weightBehavior + weightEco must = 100
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const CYCLE_TYPES = ['monthly', 'quarterly', 'half_yearly', 'yearly', 'custom'];
const REPORT_TEMPLATES = ['compact', 'standard', 'comprehensive'];

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const templates = await prisma.performanceTemplate.findMany({
      where: { isActive: true },
      orderBy: { cycleType: 'asc' },
    });

    return Response.json({ templates });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (primary.role_code !== 'super_admin') throw new ForbiddenError('Super admin only');

    const body = await request.json();
    const {
      name, description, cycleType,
      weightAcademic = 40, weightAttendance = 30, weightBehavior = 20, weightEco = 10,
      reportCardTemplate = 'standard',
    } = body;

    if (!name || !cycleType) throw new AppError('name and cycleType required');
    if (!CYCLE_TYPES.includes(cycleType)) throw new AppError(`cycleType must be one of: ${CYCLE_TYPES.join(', ')}`);
    if (!REPORT_TEMPLATES.includes(reportCardTemplate)) throw new AppError(`reportCardTemplate must be one of: ${REPORT_TEMPLATES.join(', ')}`);

    const totalWeight = weightAcademic + weightAttendance + weightBehavior + weightEco;
    if (totalWeight !== 100) throw new AppError(`Weights must sum to 100. Got ${totalWeight}`);

    const template = await prisma.performanceTemplate.create({
      data: {
        name, description: description ?? null, cycleType,
        weightAcademic, weightAttendance, weightBehavior, weightEco,
        reportCardTemplate, createdById: user.id,
      },
    });

    return Response.json({ template }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (primary.role_code !== 'super_admin') throw new ForbiddenError('Super admin only');

    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new AppError('id required');
    const existing = await prisma.performanceTemplate.findUnique({ where: { id } });
    if (!existing) throw new AppError('Template not found', 404);

    const body = await request.json();

    // Validate weights if any provided
    const wa = body.weightAcademic   ?? existing.weightAcademic;
    const wt = body.weightAttendance ?? existing.weightAttendance;
    const wb = body.weightBehavior   ?? existing.weightBehavior;
    const we = body.weightEco        ?? existing.weightEco;
    if (wa + wt + wb + we !== 100) throw new AppError(`Weights must sum to 100. Got ${wa + wt + wb + we}`);

    const updated = await prisma.performanceTemplate.update({
      where: { id },
      data: {
        ...(body.name               !== undefined && { name:               body.name }),
        ...(body.description        !== undefined && { description:        body.description }),
        ...(body.cycleType          !== undefined && { cycleType:          body.cycleType }),
        ...(body.reportCardTemplate !== undefined && { reportCardTemplate: body.reportCardTemplate }),
        ...(body.isActive           !== undefined && { isActive:           body.isActive }),
        weightAcademic: wa, weightAttendance: wt, weightBehavior: wb, weightEco: we,
      },
    });

    return Response.json({ template: updated });
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (primary.role_code !== 'super_admin') throw new ForbiddenError('Super admin only');

    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new AppError('id required');
    await prisma.performanceTemplate.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
