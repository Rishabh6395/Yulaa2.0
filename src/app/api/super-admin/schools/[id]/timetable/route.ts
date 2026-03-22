import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';
import prisma from '@/lib/prisma';

function assertAdminAccess(user: any) {
  if (!user) throw new UnauthorizedError();
  const allowed = ['super_admin', 'school_admin', 'principal'];
  if (!user.roles.some((r: any) => allowed.includes(r.role_code))) throw new ForbiddenError();
}

// ─── GET: timetable for a class ──────────────────────────────────────────────
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    assertAdminAccess(user);
    const schoolId = params.id;
    const url = new URL(request.url);
    const classId = url.searchParams.get('classId');
    const academicYear = url.searchParams.get('year') || '2025-2026';

    if (!classId) {
      // Return all timetables for school (summary)
      const timetables = await prisma.timetable.findMany({
        where: { schoolId, academicYear },
        include: {
          class: { select: { id: true, name: true, grade: true, section: true } },
          _count: { select: { slots: true } },
        },
        orderBy: [{ class: { grade: 'asc' } }, { class: { section: 'asc' } }],
      });
      return Response.json({ timetables });
    }

    const timetable = await prisma.timetable.findUnique({
      where: { schoolId_classId_academicYear: { schoolId, classId, academicYear } },
      include: {
        class: { select: { id: true, name: true, grade: true, section: true } },
        slots: {
          include: { teacher: { select: { id: true, user: { select: { firstName: true, lastName: true } } } } },
          orderBy: [{ dayOfWeek: 'asc' }, { periodNo: 'asc' }],
        },
      },
    });
    return Response.json({ timetable });
  } catch (err) { return handleError(err); }
}

// ─── POST: save full timetable (upsert slots) ─────────────────────────────────
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    assertAdminAccess(user);
    const schoolId = params.id;
    const { classId, academicYear = '2025-2026', slots } = await request.json();

    if (!classId) return Response.json({ error: 'classId required' }, { status: 400 });

    // Upsert the timetable record
    const timetable = await prisma.timetable.upsert({
      where: { schoolId_classId_academicYear: { schoolId, classId, academicYear } },
      update: { isActive: true },
      create: { schoolId, classId, academicYear, isActive: true },
    });

    // Delete existing slots and re-insert
    await prisma.timetableSlot.deleteMany({ where: { timetableId: timetable.id } });

    if (Array.isArray(slots) && slots.length > 0) {
      await prisma.timetableSlot.createMany({
        data: slots.map((s: any) => ({
          timetableId: timetable.id,
          dayOfWeek: s.dayOfWeek,
          periodNo: s.periodNo,
          startTime: s.startTime,
          endTime: s.endTime,
          subject: s.subject,
          teacherId: s.teacherId || null,
        })),
      });
    }

    const updated = await prisma.timetable.findUnique({
      where: { id: timetable.id },
      include: {
        slots: {
          include: { teacher: { select: { id: true, user: { select: { firstName: true, lastName: true } } } } },
          orderBy: [{ dayOfWeek: 'asc' }, { periodNo: 'asc' }],
        },
      },
    });
    return Response.json({ timetable: updated });
  } catch (err) { return handleError(err); }
}

// ─── DELETE: remove timetable for a class ────────────────────────────────────
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    assertAdminAccess(user);
    const schoolId = params.id;
    const url = new URL(request.url);
    const classId = url.searchParams.get('classId');
    const academicYear = url.searchParams.get('year') || '2025-2026';
    if (!classId) return Response.json({ error: 'classId required' }, { status: 400 });

    await prisma.timetable.deleteMany({ where: { schoolId, classId, academicYear } });
    return Response.json({ success: true });
  } catch (err) { return handleError(err); }
}
