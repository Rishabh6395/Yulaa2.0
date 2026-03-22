import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';
import prisma from '@/lib/prisma';

function assertAdminAccess(user: any) {
  if (!user) throw new UnauthorizedError();
  const allowed = ['super_admin', 'school_admin', 'principal'];
  if (!user.roles.some((r: any) => allowed.includes(r.role_code))) throw new ForbiddenError();
}

// ─── GET: leave types, policies, holidays ────────────────────────────────────
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    assertAdminAccess(user);
    const schoolId = params.id;
    const url = new URL(request.url);
    const resource = url.searchParams.get('resource');
    const academicYear = url.searchParams.get('year') || '2025-2026';

    if (resource === 'holidays') {
      const holidays = await prisma.holidayCalendar.findMany({
        where: { schoolId, academicYear },
        orderBy: { date: 'asc' },
      });
      return Response.json({ holidays });
    }

    if (resource === 'policies') {
      const [leaveTypes, policies] = await Promise.all([
        prisma.leaveTypeMaster.findMany({ where: { schoolId }, orderBy: { name: 'asc' } }),
        prisma.leaveBalancePolicy.findMany({ where: { schoolId } }),
      ]);
      return Response.json({ leaveTypes, policies });
    }

    // Default: all
    const [leaveTypes, policies, holidays] = await Promise.all([
      prisma.leaveTypeMaster.findMany({ where: { schoolId }, orderBy: { name: 'asc' } }),
      prisma.leaveBalancePolicy.findMany({ where: { schoolId } }),
      prisma.holidayCalendar.findMany({ where: { schoolId, academicYear }, orderBy: { date: 'asc' } }),
    ]);
    return Response.json({ leaveTypes, policies, holidays });
  } catch (err) { return handleError(err); }
}

// ─── POST: create leave type OR holiday ──────────────────────────────────────
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    assertAdminAccess(user);
    const schoolId = params.id;
    const body = await request.json();

    if (body.action === 'create_leave_type') {
      const { name, code, applicableTo } = body;
      if (!name || !code) return Response.json({ error: 'name and code required' }, { status: 400 });
      const lt = await prisma.leaveTypeMaster.create({
        data: { schoolId, name: name.trim(), code: code.trim().toLowerCase(), applicableTo: applicableTo || [] },
      });
      return Response.json({ leaveType: lt }, { status: 201 });
    }

    if (body.action === 'add_holiday') {
      const { date, name, type, academicYear } = body;
      if (!date || !name) return Response.json({ error: 'date and name required' }, { status: 400 });
      const holiday = await prisma.holidayCalendar.create({
        data: {
          schoolId, date: new Date(date), name: name.trim(),
          type: type || 'mandatory', academicYear: academicYear || '2025-2026',
        },
      });
      return Response.json({ holiday }, { status: 201 });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) { return handleError(err); }
}

// ─── PUT: upsert balance policy OR update leave type ─────────────────────────
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    assertAdminAccess(user);
    const schoolId = params.id;
    const body = await request.json();

    if (body.action === 'upsert_policy') {
      const { leaveTypeId, roleCode, daysPerYear, carryForward, maxCarryDays } = body;
      if (!leaveTypeId || !roleCode) return Response.json({ error: 'leaveTypeId and roleCode required' }, { status: 400 });
      const policy = await prisma.leaveBalancePolicy.upsert({
        where: { schoolId_leaveTypeId_roleCode: { schoolId, leaveTypeId, roleCode } },
        update: {
          daysPerYear: daysPerYear ?? 0,
          carryForward: carryForward ?? false,
          maxCarryDays: maxCarryDays ?? 0,
        },
        create: {
          schoolId, leaveTypeId, roleCode,
          daysPerYear: daysPerYear ?? 0,
          carryForward: carryForward ?? false,
          maxCarryDays: maxCarryDays ?? 0,
        },
      });
      return Response.json({ policy });
    }

    if (body.action === 'update_leave_type') {
      const { id, name, applicableTo, isActive } = body;
      const lt = await prisma.leaveTypeMaster.update({
        where: { id },
        data: { name: name?.trim(), applicableTo, isActive },
      });
      return Response.json({ leaveType: lt });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) { return handleError(err); }
}

// ─── DELETE: remove leave type OR holiday ────────────────────────────────────
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    assertAdminAccess(user);
    const url = new URL(request.url);
    const leaveTypeId = url.searchParams.get('leaveTypeId');
    const holidayId = url.searchParams.get('holidayId');

    if (leaveTypeId) {
      await prisma.leaveTypeMaster.delete({ where: { id: leaveTypeId } });
      return Response.json({ success: true });
    }
    if (holidayId) {
      await prisma.holidayCalendar.delete({ where: { id: holidayId } });
      return Response.json({ success: true });
    }
    return Response.json({ error: 'Provide leaveTypeId or holidayId' }, { status: 400 });
  } catch (err) { return handleError(err); }
}
