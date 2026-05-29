/**
 * GET    /api/hrms/payroll?school_id=X&month=M&year=Y   — list payroll records
 * POST   /api/hrms/payroll                              — generate payroll for month
 * PATCH  /api/hrms/payroll?id=X                         — approve / mark paid
 * DELETE /api/hrms/payroll?id=X                         — delete draft payroll
 *
 * POST body: { schoolId?, month, year, teacherIds? }
 * If teacherIds omitted → generates for ALL teachers with salary config.
 *
 * Calculation:
 *   grossSalary = basic + hra + da + ta + otherAllowances  (pro-rated by attendance)
 *   deductions  = pfEmployee + esiEmployee + tds + otherDeductions
 *   netSalary   = grossSalary - deductions
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const ADMIN_ROLES = ['super_admin', 'school_admin', 'principal'];

async function resolveSchoolId(user: any, override?: string | null): Promise<string> {
  const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  if (primary.role_code === 'super_admin' && override) return override;
  if (primary.school_id) return primary.school_id;
  throw new AppError('school_id required');
}

function round2(n: number) { return Math.round(n * 100) / 100; }

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError('Admin role required');

    const { searchParams } = new URL(request.url);
    const schoolId  = await resolveSchoolId(user, searchParams.get('school_id'));
    const month     = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined;
    const year      = searchParams.get('year')  ? parseInt(searchParams.get('year')!)  : undefined;
    const teacherId = searchParams.get('teacher_id');
    const status    = searchParams.get('status');

    const payrolls = await prisma.staffPayroll.findMany({
      where: {
        schoolId,
        ...(month     ? { month }     : {}),
        ...(year      ? { year }      : {}),
        ...(teacherId ? { teacherId } : {}),
        ...(status    ? { status }    : {}),
      },
      include: {
        teacher: { select: { id: true, employeeId: true, designation: true, user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    return Response.json({ payrolls });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError('Admin role required');

    const body = await request.json();
    const { schoolId: sid, month, year, teacherIds } = body;
    const schoolId = await resolveSchoolId(user, sid);
    if (!month || !year) throw new AppError('month and year required');
    if (month < 1 || month > 12) throw new AppError('month must be 1–12');

    // Determine working days in month
    const daysInMonth = new Date(year, month, 0).getDate();

    // Fetch salary configs
    const configs = await prisma.staffSalaryConfig.findMany({
      where: {
        schoolId,
        ...(teacherIds ? { teacherId: { in: teacherIds } } : {}),
      },
    });

    if (configs.length === 0) throw new AppError('No salary configs found', 404);

    // For each teacher, get attendance for the month
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd   = new Date(year, month - 1, daysInMonth);

    const results: any[] = [];
    for (const cfg of configs) {
      // Skip if payroll already exists
      const existing = await prisma.staffPayroll.findFirst({ where: { teacherId: cfg.teacherId, month, year } });
      if (existing) { results.push({ teacherId: cfg.teacherId, status: 'skipped', reason: 'already_exists' }); continue; }

      // Count attendance
      const attRows = await prisma.attendance.findMany({
        where: { teacherId: cfg.teacherId, date: { gte: monthStart, lte: monthEnd } },
        select: { status: true },
      });
      const presentDays = attRows.filter(a => ['present', 'late'].includes(a.status)).length;
      const leaveDays   = attRows.filter(a => a.status === 'excused').length;
      const lopDays     = Math.max(0, daysInMonth - presentDays - leaveDays);

      // Pro-rate salary by attendance ratio
      const ratio = daysInMonth > 0 ? (presentDays + leaveDays) / daysInMonth : 1;
      const basic    = round2(Number(cfg.basic)           * ratio);
      const hra      = round2(Number(cfg.hra)             * ratio);
      const da       = round2(Number(cfg.da)              * ratio);
      const ta       = round2(Number(cfg.ta)              * ratio);
      const other    = round2(Number(cfg.otherAllowances) * ratio);
      const gross    = round2(basic + hra + da + ta + other);

      const pfEmployee  = round2(gross * Number(cfg.pfPercent)  / 100);
      const pfEmployer  = round2(gross * Number(cfg.pfEmployer) / 100);
      const esiEmployee = round2(gross * Number(cfg.esiPercent) / 100);
      const esiEmployer = round2(gross * Number(cfg.esiEmployer) / 100);
      const tds         = round2(Number(cfg.tdsMonthly));
      const net         = round2(Math.max(0, gross - pfEmployee - esiEmployee - tds));

      const payroll = await prisma.staffPayroll.create({
        data: {
          schoolId, teacherId: cfg.teacherId, configId: cfg.id,
          month, year,
          workingDays: daysInMonth, presentDays, leaveDays,
          lopDays,
          basic, hra, da, ta, otherAllowances: other,
          grossSalary: gross,
          pfEmployee, pfEmployer, esiEmployee, esiEmployer,
          tds, otherDeductions: 0, netSalary: net,
          status: 'draft',
          createdById: user.id,
        },
      });
      results.push({ teacherId: cfg.teacherId, payrollId: payroll.id, status: 'created', netSalary: net });
    }

    return Response.json({
      results,
      generated: results.filter(r => r.status === 'created').length,
      skipped:   results.filter(r => r.status === 'skipped').length,
    });
  } catch (err) { return handleError(err); }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError();

    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new AppError('id required');
    const payroll = await prisma.staffPayroll.findUnique({ where: { id } });
    if (!payroll) throw new AppError('Payroll not found', 404);
    if (primary.school_id && payroll.schoolId !== primary.school_id) throw new ForbiddenError();

    const body = await request.json();
    const { action } = body;

    if (action === 'approve') {
      if (payroll.status !== 'draft') throw new AppError('Only draft payroll can be approved');
      const updated = await prisma.staffPayroll.update({ where: { id }, data: { status: 'approved' } });
      return Response.json({ payroll: updated });
    }

    if (action === 'pay') {
      if (payroll.status !== 'approved') throw new AppError('Payroll must be approved before marking paid');
      const updated = await prisma.staffPayroll.update({
        where: { id },
        data:  { status: 'paid', paidAt: new Date(), paidById: user.id, payslipUrl: body.payslipUrl ?? null },
      });
      return Response.json({ payroll: updated });
    }

    // Allow editing draft payroll
    if (payroll.status !== 'draft') throw new AppError('Only draft payrolls can be edited');
    const numFields = ['basic','hra','da','ta','otherAllowances','otherDeductions','tds'];
    const data: Record<string, any> = {};
    for (const f of numFields) { if (body[f] !== undefined) data[f] = body[f]; }
    if (body.remarks) data.remarks = body.remarks;

    // Recompute gross and net if any components changed
    if (Object.keys(data).length > 0) {
      const basic   = data.basic   ?? Number(payroll.basic);
      const hra     = data.hra     ?? Number(payroll.hra);
      const da      = data.da      ?? Number(payroll.da);
      const ta      = data.ta      ?? Number(payroll.ta);
      const other   = data.otherAllowances ?? Number(payroll.otherAllowances);
      const gross   = round2(basic + hra + da + ta + other);
      const pfEmp   = Number(payroll.pfEmployee);
      const esiEmp  = Number(payroll.esiEmployee);
      const tds     = data.tds     ?? Number(payroll.tds);
      const otherD  = data.otherDeductions ?? Number(payroll.otherDeductions);
      data.grossSalary = gross;
      data.netSalary   = round2(Math.max(0, gross - pfEmp - esiEmp - tds - otherD));
    }

    const updated = await prisma.staffPayroll.update({ where: { id }, data });
    return Response.json({ payroll: updated });
  } catch (err) { return handleError(err); }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError();

    const id = new URL(request.url).searchParams.get('id');
    if (!id) throw new AppError('id required');
    const payroll = await prisma.staffPayroll.findUnique({ where: { id } });
    if (!payroll) throw new AppError('Payroll not found', 404);
    if (primary.school_id && payroll.schoolId !== primary.school_id) throw new ForbiddenError();
    if (payroll.status !== 'draft') throw new AppError('Only draft payrolls can be deleted', 409);

    await prisma.staffPayroll.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}
