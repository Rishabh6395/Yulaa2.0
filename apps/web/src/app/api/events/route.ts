import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const ADMIN_ROLES = ['super_admin', 'school_admin', 'principal'];

async function getSchoolId(user: any, bodySchoolId?: string): Promise<string> {
  const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  if (bodySchoolId && ADMIN_ROLES.includes(primary.role_code)) return bodySchoolId;
  if (primary.school_id) return primary.school_id;
  const def = await prisma.school.findFirst({ where: { isDefault: true }, select: { id: true } });
  if (def) return def.id;
  throw new AppError('No school found');
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const { searchParams } = new URL(request.url);
    const schoolId = await getSchoolId(user, searchParams.get('schoolId') ?? undefined);
    const academicYear = searchParams.get('academicYear') || undefined;
    const eventId = searchParams.get('eventId');

    if (eventId) {
      const event = await prisma.schoolEvent.findFirst({
        where: { id: eventId, schoolId },
        include: {
          tasks: { include: { teacher: { include: { user: { select: { firstName: true, lastName: true } } } } } },
          participants: { include: { student: { select: { firstName: true, lastName: true, admissionNo: true } } } },
        },
      });
      if (!event) throw new AppError('Event not found');
      return Response.json({ event });
    }

    const events = await prisma.schoolEvent.findMany({
      where: { schoolId, ...(academicYear ? { academicYear } : {}) },
      orderBy: { startDate: 'asc' },
      include: {
        _count: { select: { tasks: true, participants: true } },
      },
    });
    return Response.json({ events });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError('Admin access required');

    const body = await request.json();
    const { action } = body;
    const schoolId = await getSchoolId(user, body.schoolId);

    // Create event
    if (!action || action === 'create_event') {
      const { title, eventType, startDate, endDate, venue, description, academicYear, status } = body;
      if (!title || !eventType || !startDate) throw new AppError('title, eventType, startDate required');
      const event = await prisma.schoolEvent.create({
        data: {
          schoolId,
          title,
          eventType,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : new Date(startDate),
          venue: venue || null,
          description: description || null,
          academicYear: academicYear || '',
          status: status || 'upcoming',
          createdBy: user.id,
        },
      });
      return Response.json({ event }, { status: 201 });
    }

    // Add task to event
    if (action === 'add_task') {
      const { eventId, title: taskTitle, assignedTo, role, dueDate } = body;
      if (!eventId || !taskTitle) throw new AppError('eventId and title required');
      const event = await prisma.schoolEvent.findFirst({ where: { id: eventId, schoolId } });
      if (!event) throw new AppError('Event not found');
      const task = await prisma.eventTask.create({
        data: {
          eventId,
          title: taskTitle,
          assignedTo: assignedTo || null,
          role: role || null,
          status: 'pending',
          dueDate: dueDate ? new Date(dueDate) : null,
        },
      });
      return Response.json({ task }, { status: 201 });
    }

    // Add participant
    if (action === 'add_participant') {
      const { eventId, studentId, participantRole } = body;
      if (!eventId || !studentId) throw new AppError('eventId and studentId required');
      const event = await prisma.schoolEvent.findFirst({ where: { id: eventId, schoolId } });
      if (!event) throw new AppError('Event not found');
      const participant = await prisma.eventParticipant.upsert({
        where: { eventId_studentId: { eventId, studentId } },
        update: { role: participantRole || null, status: 'registered' },
        create: {
          eventId,
          studentId,
          role: participantRole || null,
          status: 'registered',
          attended: false,
        },
      });
      return Response.json({ participant }, { status: 201 });
    }

    throw new AppError('Unknown action');
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const body = await request.json();
    const { action } = body;
    const schoolId = await getSchoolId(user, body.schoolId);

    // Update event
    if (action === 'update_event') {
      if (!ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError();
      const { eventId, ...updates } = body;
      if (!eventId) throw new AppError('eventId required');
      const event = await prisma.schoolEvent.findFirst({ where: { id: eventId, schoolId } });
      if (!event) throw new AppError('Event not found');
      const updated = await prisma.schoolEvent.update({
        where: { id: eventId },
        data: {
          ...(updates.title && { title: updates.title }),
          ...(updates.status && { status: updates.status }),
          ...(updates.venue !== undefined && { venue: updates.venue }),
          ...(updates.description !== undefined && { description: updates.description }),
          ...(updates.startDate && { startDate: new Date(updates.startDate) }),
          ...(updates.endDate && { endDate: new Date(updates.endDate) }),
        },
      });
      return Response.json({ event: updated });
    }

    // Update task status
    if (action === 'update_task') {
      const { taskId, status } = body;
      if (!taskId || !status) throw new AppError('taskId and status required');
      const task = await prisma.eventTask.findFirst({
        where: { id: taskId, event: { schoolId } },
      });
      if (!task) throw new AppError('Task not found');
      // Teacher can only update their own task
      if (!ADMIN_ROLES.includes(primary.role_code) && task.assignedTo !== user.id) throw new ForbiddenError();
      const updated = await prisma.eventTask.update({ where: { id: taskId }, data: { status } });
      return Response.json({ task: updated });
    }

    // Mark attendance for participant
    if (action === 'mark_attendance') {
      if (!ADMIN_ROLES.includes(primary.role_code) && primary.role_code !== 'teacher') throw new ForbiddenError();
      const { participantId, attended } = body;
      if (!participantId) throw new AppError('participantId required');
      const updated = await prisma.eventParticipant.update({
        where: { id: participantId },
        data: { attended: !!attended, status: attended ? 'attended' : 'registered' },
      });
      return Response.json({ participant: updated });
    }

    throw new AppError('Unknown action');
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError();
    const { eventId, taskId, participantId } = await request.json();
    const schoolId = await getSchoolId(user);

    if (taskId) {
      await prisma.eventTask.deleteMany({ where: { id: taskId, event: { schoolId } } });
      return Response.json({ ok: true });
    }
    if (participantId) {
      await prisma.eventParticipant.deleteMany({ where: { id: participantId, event: { schoolId } } });
      return Response.json({ ok: true });
    }
    if (eventId) {
      await prisma.schoolEvent.deleteMany({ where: { id: eventId, schoolId } });
      return Response.json({ ok: true });
    }
    throw new AppError('eventId, taskId, or participantId required');
  } catch (err) { return handleError(err); }
}
