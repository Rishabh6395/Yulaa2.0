import { getUserFromRequest } from '@/lib/auth';
import prisma from '@/lib/prisma';

async function getConsultant(userId: string) {
  return prisma.consultant.findUnique({ where: { userId } });
}

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
  const isConsultant = primaryRole.role_code === 'consultant';
  const isAdmin = ['super_admin', 'school_admin'].includes(primaryRole.role_code);

  if (!isConsultant && !isAdmin) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status');

  try {
    let consultantId: string | undefined;

    if (isConsultant) {
      const consultant = await getConsultant(user.id);
      if (!consultant) {
        return Response.json({ error: 'Consultant profile not found' }, { status: 404 });
      }
      consultantId = consultant.id;
    }

    const sessions = await prisma.consultantSession.findMany({
      where: {
        ...(isConsultant && consultantId ? { consultantId } : {}),
        ...(isAdmin && !isConsultant ? { schoolId: primaryRole.school_id! } : {}),
        ...(statusFilter && { status: statusFilter }),
      },
      include: {
        consultant: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
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
  } catch (err) {
    console.error('Sessions GET error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
  if (primaryRole.role_code !== 'consultant') {
    return Response.json({ error: 'Only consultants can create sessions' }, { status: 403 });
  }

  const consultant = await getConsultant(user.id);
  if (!consultant) {
    return Response.json({ error: 'Consultant profile not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const {
      title,
      description,
      session_type,
      target_grades,
      session_date,
      duration_minutes,
      max_participants,
      meeting_link,
    } = body;

    if (!title || !session_type) {
      return Response.json({ error: 'title and session_type are required' }, { status: 400 });
    }

    // Verify consultant has an active contract with this school
    const activeContract = await prisma.consultantContract.findFirst({
      where: {
        consultantId: consultant.id,
        schoolId: primaryRole.school_id!,
        status: 'active',
        endDate: { gte: new Date() },
      },
    });

    if (!activeContract) {
      return Response.json({ error: 'No active contract with this school' }, { status: 403 });
    }

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
  } catch (err) {
    console.error('Sessions POST error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const primaryRole = user.roles.find((r) => r.is_primary) ?? user.roles[0];
  if (primaryRole.role_code !== 'consultant') {
    return Response.json({ error: 'Only consultants can update sessions' }, { status: 403 });
  }

  const consultant = await getConsultant(user.id);
  if (!consultant) {
    return Response.json({ error: 'Consultant profile not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const {
      id,
      title,
      description,
      session_type,
      target_grades,
      session_date,
      duration_minutes,
      max_participants,
      meeting_link,
      status,
    } = body;

    if (!id) return Response.json({ error: 'id is required' }, { status: 400 });

    // Verify ownership
    const existing = await prisma.consultantSession.findFirst({
      where: { id, consultantId: consultant.id },
    });
    if (!existing) {
      return Response.json({ error: 'Session not found or access denied' }, { status: 404 });
    }

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
  } catch (err: any) {
    if (err.code === 'P2025') {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }
    console.error('Sessions PATCH error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
