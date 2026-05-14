import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError, NotFoundError } from '@/utils/errors';
import { KPI_DEFINITIONS, KPI_MAP } from '@/lib/kpiDefinitions';
import prisma from '@/lib/prisma';

function isSuperAdmin(user: any) {
  return user.roles.some((r: any) => r.role_code === 'super_admin');
}
function isSchoolAdmin(user: any) {
  return user.roles.some((r: any) => ['super_admin', 'school_admin', 'principal'].includes(r.role_code));
}
function getPrimarySchoolId(user: any) {
  const r = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  return r?.school_id ?? null;
}
function parseJson(s: string | null | undefined): any {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}

// ── GET /api/super-admin/kpi-config ──────────────────────────────────────────
// Returns all KPI definitions + per-school config for a given schoolId+academicYear.
// Super admin: any schoolId. School admin/principal: own school only.

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!isSchoolAdmin(user)) throw new ForbiddenError('Admin or principal access required');

    const { searchParams } = new URL(request.url);
    let schoolId       = searchParams.get('schoolId');
    const academicYear = searchParams.get('academicYear') || currentAcademicYear();

    if (!isSuperAdmin(user)) {
      schoolId = getPrimarySchoolId(user);
    }
    if (!schoolId) throw new AppError('schoolId is required');

    const stored = await prisma.schoolKpiConfig.findMany({
      where: { schoolId, academicYear },
    });
    const storedMap: Record<string, any> = Object.fromEntries(stored.map(s => [s.kpiCode, s]));

    const kpis = KPI_DEFINITIONS.map(def => {
      const cfg = storedMap[def.code];
      return {
        code:             def.code,
        name:             def.name,
        description:      def.description,
        segment:          def.segment,
        category:         def.category,
        unit:             def.unit,
        higherIsBetter:   def.higherIsBetter,
        targetDirection:  cfg?.targetDirection ?? def.targetDirection,
        defaultTarget:    def.defaultTarget,
        targetValue:      cfg ? Number(cfg.targetValue) : def.defaultTarget,
        isEnabled:        cfg ? cfg.isEnabled : true,
        visibleTo:        def.visibleTo,                          // definition defaults
        visibleToRoles:   parseJson(cfg?.visibleToRoles) ?? null, // school override (null = use defaults)
        formulaParamDefs: def.formulaParamDefs ?? [],
        formulaParams:    parseJson(cfg?.formulaParams) ?? null,
        configId:         cfg?.id ?? null,
      };
    });

    return Response.json({ kpis, academicYear, schoolId });
  } catch (err) { return handleError(err); }
}

// ── POST /api/super-admin/kpi-config ─────────────────────────────────────────
// Upsert a single KPI config for a school.

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!isSchoolAdmin(user)) throw new ForbiddenError('Admin or principal access required');

    const body = await request.json();
    const { kpiCode, targetValue, isEnabled, targetDirection, visibleToRoles, formulaParams } = body;
    const academicYear = body.academicYear || currentAcademicYear();

    let schoolId = body.schoolId;
    if (!isSuperAdmin(user)) schoolId = getPrimarySchoolId(user);
    if (!schoolId) throw new AppError('schoolId is required');
    if (!kpiCode)  throw new AppError('kpiCode is required');

    const def = KPI_MAP[kpiCode];
    if (!def) throw new AppError(`Unknown KPI code: ${kpiCode}`);

    const config = await prisma.schoolKpiConfig.upsert({
      where:  { schoolId_kpiCode_academicYear: { schoolId, kpiCode, academicYear } },
      update: {
        isEnabled:       isEnabled ?? true,
        targetValue:     targetValue ?? def.defaultTarget,
        targetDirection: targetDirection ?? def.targetDirection,
        visibleToRoles:  visibleToRoles ? JSON.stringify(visibleToRoles) : null,
        formulaParams:   formulaParams  ? JSON.stringify(formulaParams)  : null,
      },
      create: {
        schoolId,
        kpiCode,
        academicYear,
        isEnabled:       isEnabled ?? true,
        targetValue:     targetValue ?? def.defaultTarget,
        targetDirection: targetDirection ?? def.targetDirection,
        visibleToRoles:  visibleToRoles ? JSON.stringify(visibleToRoles) : null,
        formulaParams:   formulaParams  ? JSON.stringify(formulaParams)  : null,
        createdById:     user.id,
      },
    });
    return Response.json({ config }, { status: 201 });
  } catch (err) { return handleError(err); }
}

// ── PATCH /api/super-admin/kpi-config ────────────────────────────────────────
// Bulk upsert multiple KPI configs at once.
// Body: { schoolId?, academicYear?, configs: [{ kpiCode, targetValue, isEnabled, targetDirection, visibleToRoles?, formulaParams? }] }

export async function PATCH(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!isSchoolAdmin(user)) throw new ForbiddenError('Admin or principal access required');

    const body = await request.json();
    const { configs } = body;
    if (!Array.isArray(configs) || configs.length === 0) throw new AppError('configs array is required');

    const academicYear = body.academicYear || currentAcademicYear();
    let schoolId = body.schoolId;
    if (!isSuperAdmin(user)) schoolId = getPrimarySchoolId(user);
    if (!schoolId) throw new AppError('schoolId is required');

    const results = await Promise.all(
      configs.map(async (c: any) => {
        const def = KPI_MAP[c.kpiCode];
        if (!def) return null;
        return prisma.schoolKpiConfig.upsert({
          where:  { schoolId_kpiCode_academicYear: { schoolId, kpiCode: c.kpiCode, academicYear } },
          update: {
            isEnabled:       c.isEnabled ?? true,
            targetValue:     c.targetValue ?? def.defaultTarget,
            targetDirection: c.targetDirection ?? def.targetDirection,
            visibleToRoles:  c.visibleToRoles ? JSON.stringify(c.visibleToRoles) : null,
            formulaParams:   c.formulaParams  ? JSON.stringify(c.formulaParams)  : null,
          },
          create: {
            schoolId,
            kpiCode:         c.kpiCode,
            academicYear,
            isEnabled:       c.isEnabled ?? true,
            targetValue:     c.targetValue ?? def.defaultTarget,
            targetDirection: c.targetDirection ?? def.targetDirection,
            visibleToRoles:  c.visibleToRoles ? JSON.stringify(c.visibleToRoles) : null,
            formulaParams:   c.formulaParams  ? JSON.stringify(c.formulaParams)  : null,
            createdById:     user.id,
          },
        });
      }),
    );

    return Response.json({ saved: results.filter(Boolean).length, total: configs.length });
  } catch (err) { return handleError(err); }
}

// ── DELETE /api/super-admin/kpi-config ───────────────────────────────────────
// Reset a KPI config override (delete it — reverts to definition defaults). Body: { id }

export async function DELETE(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!isSuperAdmin(user)) throw new ForbiddenError('Super admin only');

    const { id } = await request.json();
    if (!id) throw new AppError('id is required');

    const cfg = await prisma.schoolKpiConfig.findUnique({ where: { id } });
    if (!cfg) throw new NotFoundError('KPI config');

    await prisma.schoolKpiConfig.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (err) { return handleError(err); }
}

function currentAcademicYear() {
  const y = new Date().getFullYear();
  const m = new Date().getMonth() + 1;
  return m >= 4 ? `${y}-${(y + 1).toString().slice(2)}` : `${y - 1}-${y.toString().slice(2)}`;
}
