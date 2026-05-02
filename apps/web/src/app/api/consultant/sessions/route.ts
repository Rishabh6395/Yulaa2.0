import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, NotFoundError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

async function getConsultant(userId: string) {
  return prisma.consultant.findUnique({ where: { userId } });
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const primaryRole  = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    const isConsultant = primaryRole.role_code === 'consultant';
    const isAdmin      = ['super_admin', 'school_admin'].includes(primaryRole.role_code);

    if (!isConsultant && !isAdmin) throw new ForbiddenError();

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    let consultantId: string | undefined;

    if (isConsultant) {
      const consultant = await getConsultant(user.id);
      if (!consultant) throw new NotFoundError('Consultant profile');
      consultantId = consultant.id;
    }

    const sessions = await prisma.consultantSession.findMany({
      where: {
        ...(isConsultant && consultantId ? { consultantId } : {}),
        ...(isAdmin && !isConsultant ? { schoolId: primaryRole.school_id! } : {}),
        ...(statusFilter && { status: statusFilter }),
      },
      include: {
        consultant: { include: { user: { select: { firstName: true, lastName: true } } } },
        school: { select: { name: true } },
      },
      orderBy: { sessionDate: 'desc' },
    });

    const rows = sessions.map((cs) => ({
      id: cs.id,
      title: cs.title,
      description: cs.description,
      session_type: cs.sessionType,
      target_grades: cs.targetGrades,
      session_date: cs.sessionDate,
      duration_minutes: cs.durationMinutes,
      max_participants: cs.maxParticipants,
      status: cs.status,
      meeting_link: cs.meetingLink,
      created_at: cs.createdAt,
      consultant_name: `${cs.consultant.user.firstName} ${cs.consultant.user.lastName}`,
      specialization: cs.consultant.specialization,
      school_name: cs.school.name,
    }));

    return Response.json({ sessions: rows });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (primaryRole.role_code !== 'consultant') throw new ForbiddenError('Only consultants can create sessions');

    const consultant = await getConsultant(user.id);
    if (!consultant) throw new NotFoundError('Consultant profile');

    const body = await request.json();
    const { title, description, session_type, target_grades, session_date, duration_minutes, max_participants, meeting_link } = body;

    if (!title || !session_type) throw new AppError('title and session_type are required');

    const activeContract = await prisma.consultantContract.findFirst({
      where: { consultantId: consultant.id, schoolId: primaryRole.school_id!, status: 'active', endDate: { gte: new Date() } },
    });
    if (!activeContract) throw new ForbiddenError('No active contract with this school');

    const session = await prisma.consultantSession.create({
      data: {
        consultantId: consultant.id,
        schoolId: primaryRole.school_id!,
        title,
        description: description || null,
        sessionType: session_type,
        targetGrades: target_grades || [],
        sessionDate: session_date ? new Date(session_date) : new Date(),
        durationMinutes: duration_minutes || 60,
        maxParticipants: max_participants || null,
        meetingLink: meeting_link || null,
        status: 'scheduled',
      },
    });

    return Response.json({ session }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
    if (primaryRole.role_code !== 'consultant') throw new ForbiddenError('Only consultants can update sessions');

    const consultant = await getConsultant(user.id);
    if (!consultant) throw new NotFoundError('Consultant profile');

    const body = await request.json();
    const { id, title, description, session_type, target_grades, session_date, duration_minutes, max_participants, meeting_link, status } = body;

    if (!id) throw new AppError('id is required');

    const existing = await prisma.consultantSession.findFirst({ where: { id, consultantId: consultant.id } });
    if (!existing) throw new NotFoundError('Session');

    const session = await prisma.consultantSession.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description: description || null }),
        ...(session_type && { sessionType: session_type }),
        ...(target_grades && { targetGrades: target_grades }),
        ...(session_date && { sessionDate: new Date(session_date) }),
        ...(duration_minutes && { durationMinutes: duration_minutes }),
        ...(max_participants !== undefined && { maxParticipants: max_participants || null }),
        ...(meeting_link !== undefined && { meetingLink: meeting_link || null }),
        ...(status && { status }),
      },
    });

    return Response.json({ session });
  } catch (err) { return handleError(err); }
}
