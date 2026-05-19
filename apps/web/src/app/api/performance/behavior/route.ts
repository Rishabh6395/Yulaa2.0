/**
 * GET  /api/performance/behavior?student_id=X&from=YYYY-MM-DD&to=YYYY-MM-DD
 * POST /api/performance/behavior  — log a behavior incident
 * DELETE /api/performance/behavior?id=X  — admin only
 */
import { REVIEWER_ROLES, MANAGEMENT_ROLES } from '@/lib/roles';
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const VALID_TYPES     = ['positive', 'negative'];
const VALID_SEVERITIES = ['low', 'medium', 'high'];
const VALID_CATEGORIES = [
  'discipline', 'achievement', 'conduct', 'attendance',
  'academic', 'leadership', 'sports', 'arts', 'other',
];

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!REVIEWER_ROLES.includes(primaryRole.role_code)) throw new ForbiddenError('Access denied');
    const schoolId = primaryRole.school_id!;

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');
    const from      = searchParams.get('from');
    const to        = searchParams.get('to');

    if (!studentId) throw new AppError('student_id is required');

    const student = await prisma.student.findFirst({ where: { id: studentId, schoolId }, select: { id: true } });
    if (!student) throw new AppError('Student not found', 404);

    const dateFilter: any = {};
    if (from) dateFilter.gte = new Date(from);
    if (to)   dateFilter.lte = new Date(to);

    const incidents = await prisma.behaviorIncident.findMany({
      where: {
        schoolId,
        studentId,
        ...(from || to ? { date: dateFilter } : {}),
      },
      orderBy: { date: 'desc' },
    });

    const positiveCount = incidents.filter(i => i.incidentType === 'positive').length;
    const negativeCount = incidents.filter(i => i.incidentType === 'negative').length;

    return Response.json({ incidents, summary: { positive: positiveCount, negative: negativeCount, total: incidents.length } });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (!REVIEWER_ROLES.includes(primaryRole.role_code)) throw new ForbiddenError('Only teachers and admins can log incidents');
    const schoolId = primaryRole.school_id!;

    const { student_id, incident_type, category, description, severity, action_taken, date } = await request.json();
    if (!student_id)    throw new AppError('student_id is required');
    if (!incident_type) throw new AppError('incident_type is required (positive/negative)');
    if (!category)      throw new AppError('category is required');
    if (!description)   throw new AppError('description is required');
    if (!VALID_TYPES.includes(incident_type)) throw new AppError(`incident_type must be one of: ${VALID_TYPES.join(', ')}`);
    if (!VALID_CATEGORIES.includes(category)) throw new AppError(`category must be one of: ${VALID_CATEGORIES.join(', ')}`);
    if (severity && !VALID_SEVERITIES.includes(severity)) throw new AppError(`severity must be one of: ${VALID_SEVERITIES.join(', ')}`);

    const student = await prisma.student.findFirst({ where: { id: student_id, schoolId }, select: { id: true } });
    if (!student) throw new AppError('Student not found in your school', 404);

    const incidentDate = date ? new Date(date) : new Date();
    if (isNaN(incidentDate.getTime())) throw new AppError('Invalid date format');

    const incident = await prisma.behaviorIncident.create({
      data: {
        schoolId,
        studentId:    student_id,
        reportedBy:   user.id,
        incidentType: incident_type,
        category,
        description,
        severity:     incident_type === 'negative' ? (severity || 'low') : null,
        actionTaken:  action_taken || null,
        date:         incidentDate,
      },
    });

    return Response.json({ incident }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    // Only management roles can delete incidents
    if (!MANAGEMENT_ROLES.includes(primaryRole.role_code)) throw new ForbiddenError('Admin access required to delete incidents');
    const schoolId = primaryRole.school_id!;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) throw new AppError('id is required');

    const existing = await prisma.behaviorIncident.findFirst({ where: { id, schoolId }, select: { id: true } });
    if (!existing) throw new AppError('Incident not found', 404);

    await prisma.behaviorIncident.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
