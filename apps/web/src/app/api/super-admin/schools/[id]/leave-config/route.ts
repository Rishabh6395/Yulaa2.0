import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError } from '@/utils/errors';
import prisma from '@/lib/prisma';
import { upsertLeaveWorkflow } from '@/modules/leave/leave.repo';

// Canonical epoch dates for each weekday (Sun=0 … Sat=6)
const WEEKOFF_DATES = [
  '1970-01-04', // 0 Sunday
  '1970-01-05', // 1 Monday
  '1970-01-06', // 2 Tuesday
  '1970-01-07', // 3 Wednesday
  '1970-01-08', // 4 Thursday
  '1970-01-09', // 5 Friday
  '1970-01-10', // 6 Saturday
];
const WEEKOFF_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKOFF_YEAR  = '__weekoff__';

function assertAdminAccess(user: any) {
  if (!user) throw new UnauthorizedError();
  const allowed = ['super_admin', 'school_admin', 'principal'];
  if (!user.roles.some((r: any) => allowed.includes(r.role_code))) throw new ForbiddenError();
}

// Holidays and weekoffs: school_admin excluded
function assertHolidayAccess(user: any) {
  if (!user) throw new UnauthorizedError();
  const allowed = ['super_admin', 'principal'];
  if (!user.roles.some((r: any) => allowed.includes(r.role_code)))
    throw new ForbiddenError('Holiday configuration requires super_admin or principal access');
}

// ─── GET: leave types, policies, holidays, weekoffs ─────────────────────────
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    const schoolId = params.id;
    const url = new URL(request.url);
    const resource = url.searchParams.get('resource');
    const academicYear = url.searchParams.get('year') || '2025-2026';

    if (resource === 'holidays') {
      assertHolidayAccess(user);
      const holidays = await prisma.holidayCalendar.findMany({
        where: { schoolId, academicYear },
        orderBy: { date: 'asc' },
      });
      return Response.json({ holidays });
    }

    if (resource === 'weekoffs') {
      assertHolidayAccess(user);
      const entries = await prisma.holidayCalendar.findMany({
        where: { schoolId, academicYear: WEEKOFF_YEAR },
      });
      const weekoffDays = entries.map(w => {
        const d = new Date(w.date).toISOString().split('T')[0];
        return WEEKOFF_DATES.indexOf(d);
      }).filter(d => d >= 0);
      return Response.json({ weekoffDays });
    }

    if (resource === 'policies') {
      assertAdminAccess(user);
      const [leaveTypes, policies] = await Promise.all([
        prisma.leaveTypeMaster.findMany({ where: { schoolId }, orderBy: { name: 'asc' } }),
        prisma.leaveBalancePolicy.findMany({ where: { schoolId } }),
      ]);
      return Response.json({ leaveTypes, policies });
    }

    // Default: all (uses general admin access; holidays excluded for school_admin — they get empty array)
    assertAdminAccess(user);
    const isHolidayAllowed = user.roles.some((r: any) => ['super_admin', 'principal'].includes(r.role_code));
    const [leaveTypes, policies, holidays] = await Promise.all([
      prisma.leaveTypeMaster.findMany({ where: { schoolId }, orderBy: { name: 'asc' } }),
      prisma.leaveBalancePolicy.findMany({ where: { schoolId } }),
      isHolidayAllowed
        ? prisma.holidayCalendar.findMany({ where: { schoolId, academicYear }, orderBy: { date: 'asc' } })
        : Promise.resolve([]),
    ]);
    return Response.json({ leaveTypes, policies, holidays });
  } catch (err) { return handleError(err); }
}

// ─── POST: create leave type, add holiday, bulk holidays, upsert weekoffs ────
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    const schoolId = params.id;
    const body = await request.json();

    if (body.action === 'create_leave_type') {
      assertAdminAccess(user);
      const { name, code, applicableTo } = body;
      if (!name || !code) return Response.json({ error: 'name and code required' }, { status: 400 });
      const lt = await prisma.leaveTypeMaster.create({
        data: { schoolId, name: name.trim(), code: code.trim().toLowerCase(), applicableTo: applicableTo || [] },
      });
      return Response.json({ leaveType: lt }, { status: 201 });
    }

    if (body.action === 'add_holiday') {
      assertHolidayAccess(user);
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

    // Bulk upload from Excel/CSV (base64-encoded file data)
    if (body.action === 'bulk_holidays') {
      assertHolidayAccess(user);
      const { fileData, fileExt, academicYear } = body;
      if (!fileData) return Response.json({ error: 'fileData required' }, { status: 400 });

      const buf = Buffer.from(fileData, 'base64');
      let rows: { date: string; name: string; type: string }[] = [];

      if (fileExt === 'csv') {
        const text = buf.toString('utf-8');
        const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean);
        for (const line of lines.slice(1)) {
          const parts = line.split(',').map((s: string) => s.trim().replace(/^["']|["']$/g, ''));
          const [date, name, type] = parts;
          if (date && name) rows.push({ date, name, type: type || 'mandatory' });
        }
      } else {
        // Excel via ExcelJS
        const ExcelJS = (await import('exceljs')).default;
        const wb = new ExcelJS.Workbook();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await wb.xlsx.load(buf as any);
        const ws = wb.worksheets[0];
        ws.eachRow((row: any, rowNum: number) => {
          if (rowNum === 1) return;
          const rawDate  = row.getCell(1).value;
          const rawName  = row.getCell(2).value?.toString?.()?.trim();
          const rawType  = row.getCell(3).value?.toString?.()?.trim() || 'mandatory';
          if (!rawDate || !rawName) return;
          const dateStr = rawDate instanceof Date
            ? rawDate.toISOString().split('T')[0]
            : String(rawDate);
          rows.push({ date: dateStr, name: rawName, type: rawType });
        });
      }

      let added = 0;
      for (const row of rows) {
        try {
          const d = new Date(row.date);
          if (isNaN(d.getTime())) continue;
          await prisma.holidayCalendar.upsert({
            where: { schoolId_date: { schoolId, date: d } },
            create: { schoolId, date: d, name: row.name, type: row.type, academicYear: academicYear || '2025-2026' },
            update: { name: row.name, type: row.type },
          });
          added++;
        } catch { /* skip duplicates / invalid rows */ }
      }
      return Response.json({ added });
    }

    // Save weekoff days (array of 0-6 day numbers)
    if (body.action === 'upsert_weekoffs') {
      assertHolidayAccess(user);
      const days: number[] = Array.isArray(body.days) ? body.days : [];

      // Delete all existing weekoff entries for this school
      await prisma.holidayCalendar.deleteMany({ where: { schoolId, academicYear: WEEKOFF_YEAR } });

      // Re-create for selected days
      for (const day of days) {
        if (day < 0 || day > 6) continue;
        await prisma.holidayCalendar.upsert({
          where: { schoolId_date: { schoolId, date: new Date(WEEKOFF_DATES[day]) } },
          create: { schoolId, date: new Date(WEEKOFF_DATES[day]), name: WEEKOFF_NAMES[day], type: 'weekoff', academicYear: WEEKOFF_YEAR },
          update: { name: WEEKOFF_NAMES[day], type: 'weekoff', academicYear: WEEKOFF_YEAR },
        });
      }
      return Response.json({ ok: true, weekoffDays: days });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) { return handleError(err); }
}

// ─── PUT: upsert balance policy, update leave type, upsert workflow ───────────
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

    if (body.action === 'upsert_workflow') {
      const { type, steps } = body;
      if (!type || !Array.isArray(steps)) return Response.json({ error: 'type and steps required' }, { status: 400 });
      const wf = await upsertLeaveWorkflow(schoolId, type, steps);
      return Response.json({ workflow: wf });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) { return handleError(err); }
}

// ─── DELETE: remove leave type OR holiday ────────────────────────────────────
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    const schoolId = params.id;
    const url = new URL(request.url);
    const leaveTypeId = url.searchParams.get('leaveTypeId');
    const holidayId = url.searchParams.get('holidayId');

    if (leaveTypeId) {
      assertAdminAccess(user);
      await prisma.leaveTypeMaster.delete({ where: { id: leaveTypeId } });
      return Response.json({ success: true });
    }
    if (holidayId) {
      assertHolidayAccess(user);
      await prisma.holidayCalendar.delete({ where: { id: holidayId } });
      return Response.json({ success: true });
    }
    return Response.json({ error: 'Provide leaveTypeId or holidayId' }, { status: 400 });
  } catch (err) { return handleError(err); }
}
