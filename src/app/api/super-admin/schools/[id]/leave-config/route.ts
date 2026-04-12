import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
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

// Holiday upload now also accessible to school_admin (spec requirement)
function assertHolidayAccess(user: any) {
  if (!user) throw new UnauthorizedError();
  const allowed = ['super_admin', 'school_admin', 'principal'];
  if (!user.roles.some((r: any) => allowed.includes(r.role_code)))
    throw new ForbiddenError('Holiday configuration requires admin access');
}

// Week-off configuration remains super_admin / principal only
function assertWeekoffAccess(user: any) {
  if (!user) throw new UnauthorizedError();
  const allowed = ['super_admin', 'principal'];
  if (!user.roles.some((r: any) => allowed.includes(r.role_code)))
    throw new ForbiddenError('Week-off configuration requires super_admin or principal access');
}

// ─── GET ─────────────────────────────────────────────────────────────────────
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
      assertAdminAccess(user);
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
      const [leaveTypes, policies, school] = await Promise.all([
        prisma.leaveTypeMaster.findMany({ where: { schoolId }, orderBy: { name: 'asc' } }),
        prisma.leaveBalancePolicy.findMany({ where: { schoolId } }),
        prisma.school.findUnique({ where: { id: schoolId }, select: { leaveCarryForwardDate: true } }),
      ]);
      return Response.json({ leaveTypes, policies, leaveCarryForwardDate: school?.leaveCarryForwardDate ?? null });
    }

    // Default: all (holidays only for holiday-access roles)
    assertAdminAccess(user);
    const canHoliday = user.roles.some((r: any) => ['super_admin', 'school_admin', 'principal'].includes(r.role_code));
    const [leaveTypes, policies, holidays, school] = await Promise.all([
      prisma.leaveTypeMaster.findMany({ where: { schoolId }, orderBy: { name: 'asc' } }),
      prisma.leaveBalancePolicy.findMany({ where: { schoolId } }),
      canHoliday
        ? prisma.holidayCalendar.findMany({ where: { schoolId, academicYear }, orderBy: { date: 'asc' } })
        : Promise.resolve([]),
      prisma.school.findUnique({ where: { id: schoolId }, select: { leaveCarryForwardDate: true } }),
    ]);
    return Response.json({ leaveTypes, policies, holidays, leaveCarryForwardDate: school?.leaveCarryForwardDate ?? null });
  } catch (err) { return handleError(err); }
}

// ─── POST ─────────────────────────────────────────────────────────────────────
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
      // Prevent using the reserved week-off academic year key
      if (academicYear === WEEKOFF_YEAR) throw new AppError('Invalid academic year');
      const holiday = await prisma.holidayCalendar.upsert({
        where: { schoolId_date: { schoolId, date: new Date(date) } },
        create: {
          schoolId, date: new Date(date), name: name.trim(),
          type: type || 'mandatory', academicYear: academicYear || '2025-2026',
        },
        update: { name: name.trim(), type: type || 'mandatory', academicYear: academicYear || '2025-2026' },
      });
      return Response.json({ holiday }, { status: 201 });
    }

    // Bulk upload from Excel/CSV — school_admin and principal can now also upload
    if (body.action === 'bulk_holidays') {
      assertHolidayAccess(user);
      const { fileData, fileExt, academicYear } = body;
      if (!fileData) return Response.json({ error: 'fileData required' }, { status: 400 });
      if (academicYear === WEEKOFF_YEAR) throw new AppError('Invalid academic year');

      const buf = Buffer.from(fileData, 'base64');
      let rows: { date: string; name: string; type: string }[] = [];

      if (fileExt === 'csv') {
        const text = buf.toString('utf-8');
        const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean);
        for (const line of lines.slice(1)) {
          const parts = line.split(',').map((s: string) => s.trim().replace(/^["']|["']$/g, ''));
          const [date, name, type] = parts;
          if (date && name) rows.push({ date, name, type: (type || '').toLowerCase() === 'optional' ? 'optional' : 'mandatory' });
        }
      } else {
        const ExcelJS = (await import('exceljs')).default;
        const wb = new ExcelJS.Workbook();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await wb.xlsx.load(buf as any);
        const ws = wb.worksheets[0];
        ws.eachRow((row: any, rowNum: number) => {
          if (rowNum === 1) return; // skip header
          const rawDate  = row.getCell(1).value;
          const rawName  = row.getCell(2).value?.toString?.()?.trim();
          const rawType  = row.getCell(3).value?.toString?.()?.trim()?.toLowerCase() || 'mandatory';
          if (!rawDate || !rawName) return;
          const dateStr = rawDate instanceof Date
            ? rawDate.toISOString().split('T')[0]
            : String(rawDate);
          rows.push({ date: dateStr, name: rawName, type: rawType === 'optional' ? 'optional' : 'mandatory' });
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
            // Do NOT overwrite academicYear of existing weekoff entries (they use __weekoff__)
            update: { name: row.name, type: row.type, academicYear: academicYear || '2025-2026' },
          });
          added++;
        } catch { /* skip duplicates / invalid rows */ }
      }
      return Response.json({ added });
    }

    // Holiday template download
    if (body.action === 'holiday_template') {
      assertHolidayAccess(user);
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Holidays');
      ws.columns = [
        { header: 'Date (YYYY-MM-DD)', key: 'date',  width: 20 },
        { header: 'Holiday Name',       key: 'name',  width: 30 },
        { header: 'Type (mandatory/optional)', key: 'type', width: 25 },
      ];
      ws.addRow({ date: '2025-08-15', name: 'Independence Day', type: 'mandatory' });
      ws.addRow({ date: '2025-10-02', name: 'Gandhi Jayanti',   type: 'mandatory' });
      ws.addRow({ date: '2025-11-14', name: 'Diwali',           type: 'optional'  });
      const buf = await wb.xlsx.writeBuffer();
      return new Response(buf, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="holiday-template.xlsx"',
        },
      });
    }

    // Save weekoff days — super_admin / principal only
    if (body.action === 'upsert_weekoffs') {
      assertWeekoffAccess(user);
      const days: number[] = Array.isArray(body.days) ? body.days : [];

      await prisma.holidayCalendar.deleteMany({ where: { schoolId, academicYear: WEEKOFF_YEAR } });

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

// ─── PUT ──────────────────────────────────────────────────────────────────────
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    assertAdminAccess(user);
    const schoolId = params.id;
    const body = await request.json();

    // Monthly balance policy upsert (new fields: daysPerMonth, initialBalance)
    if (body.action === 'upsert_policy') {
      const { leaveTypeId, roleCode, daysPerMonth, initialBalance, carryForward, maxCarryDays } = body;
      if (!leaveTypeId || !roleCode) return Response.json({ error: 'leaveTypeId and roleCode required' }, { status: 400 });

      const monthVal = Math.max(0, Math.round(Number(daysPerMonth) || 0));
      const initVal  = Math.max(0, Math.round(Number(initialBalance) || 0));
      // Derive daysPerYear from monthly for backward compatibility
      const yearVal  = monthVal * 12;

      const policy = await prisma.leaveBalancePolicy.upsert({
        where: { schoolId_leaveTypeId_roleCode: { schoolId, leaveTypeId, roleCode } },
        update: {
          daysPerMonth:   monthVal,
          initialBalance: initVal,
          daysPerYear:    yearVal,
          carryForward:   carryForward ?? false,
          maxCarryDays:   Math.max(0, Number(maxCarryDays) || 0),
        },
        create: {
          schoolId, leaveTypeId, roleCode,
          daysPerMonth:   monthVal,
          initialBalance: initVal,
          daysPerYear:    yearVal,
          carryForward:   carryForward ?? false,
          maxCarryDays:   Math.max(0, Number(maxCarryDays) || 0),
        },
      });
      return Response.json({ policy });
    }

    // Save carry-forward run date (MM-DD, e.g. "03-31" = March 31)
    if (body.action === 'set_carry_forward_date') {
      const { date } = body; // expects "MM-DD"
      if (!date || !/^\d{2}-\d{2}$/.test(date)) throw new AppError('date must be in MM-DD format');
      await prisma.school.update({ where: { id: schoolId }, data: { leaveCarryForwardDate: date } });
      return Response.json({ ok: true, leaveCarryForwardDate: date });
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

    // Execute carry-forward: move unused leave to new academic year
    if (body.action === 'execute_carry_forward') {
      const { fromYear, toYear } = body;
      if (!fromYear || !toYear) throw new AppError('fromYear and toYear are required');

      const policies = await prisma.leaveBalancePolicy.findMany({
        where: { schoolId, carryForward: true },
        select: { leaveTypeId: true, roleCode: true, maxCarryDays: true, leaveType: { select: { code: true } } },
      });

      const teachers = await prisma.teacher.findMany({
        where: { schoolId, status: 'active' },
        select: { id: true },
      });

      let processed = 0;
      for (const teacher of teachers) {
        for (const policy of policies) {
          const prevBalance = await prisma.teacherLeaveBalance.findFirst({
            where: { schoolId, teacherId: teacher.id, leaveType: policy.leaveType.code, academicYear: fromYear },
          });
          if (!prevBalance) continue;

          const leftover    = Math.max(0, prevBalance.totalDays - prevBalance.usedDays);
          const carryAmount = Math.min(leftover, policy.maxCarryDays);
          if (carryAmount <= 0) continue;

          // Get new year's policy daysPerYear for the base total
          const newYearPolicy = await prisma.leaveBalancePolicy.findFirst({
            where: { schoolId, leaveTypeId: policy.leaveTypeId, roleCode: policy.roleCode },
          });
          const baseTotal = newYearPolicy?.daysPerYear ?? 0;

          await prisma.teacherLeaveBalance.upsert({
            where: { schoolId_teacherId_leaveType_academicYear: { schoolId, teacherId: teacher.id, leaveType: policy.leaveType.code, academicYear: toYear } },
            create: { schoolId, teacherId: teacher.id, leaveType: policy.leaveType.code, academicYear: toYear, totalDays: baseTotal + carryAmount, usedDays: 0 },
            update: { totalDays: { increment: carryAmount } },
          });
          processed++;
        }
      }

      return Response.json({ ok: true, processed });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) { return handleError(err); }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request);
    const schoolId = params.id;
    const url = new URL(request.url);
    const leaveTypeId = url.searchParams.get('leaveTypeId');
    const holidayId   = url.searchParams.get('holidayId');

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
