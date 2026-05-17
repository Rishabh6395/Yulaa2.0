/**
 * GET    /api/performance/risk-flags?school_id=X&class_id=X&risk_level=X   — list flags
 * POST   /api/performance/risk-flags/compute                                — compute for school/class
 * PATCH  /api/performance/risk-flags?id=X                                  — resolve a flag
 *
 * Risk rules:
 *   attendance < 75%        → +40 risk points
 *   attendance 75–80%       → +20 risk points
 *   declining exams (2+)    → +30 risk points per decline
 *   behavior score < 0      → +10 risk points per negative incident
 *   composite rating drop   → +20 risk points
 *
 *   0–30  → low
 *   31–60 → medium
 *   61–80 → high
 *   81+   → critical
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const ADMIN_ROLES = ['super_admin', 'school_admin', 'principal', 'hod', 'teacher'];

function riskLevel(score: number): string {
  if (score >= 81) return 'critical';
  if (score >= 61) return 'high';
  if (score >= 31) return 'medium';
  return 'low';
}

async function resolveSchoolId(user: any, override?: string | null): Promise<string> {
  const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
  if (primary.role_code === 'super_admin' && override) return override;
  if (primary.school_id) return primary.school_id;
  throw new AppError('school_id required');
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!ADMIN_ROLES.includes(primary.role_code)) throw new ForbiddenError();

    const { searchParams } = new URL(request.url);
    const schoolId  = await resolveSchoolId(user, searchParams.get('school_id'));
    const classId   = searchParams.get('class_id');
    const riskLvl   = searchParams.get('risk_level');
    const resolved  = searchParams.get('resolved') === 'true';

    const flags = await prisma.riskFlag.findMany({
      where: {
        schoolId,
        ...(riskLvl ? { riskLevel: riskLvl }       : {}),
        ...(resolved ? { resolvedAt: { not: null } } : { resolvedAt: null }),
      },
      include: {
        student: {
          select: {
            id: true, firstName: true, lastName: true, admissionNo: true, classId: true,
            class: { select: { grade: true, section: true } },
          },
        },
      },
      orderBy: { riskScore: 'desc' },
    });

    // Filter by classId after fetch if needed (no direct relation on RiskFlag)
    const filtered = classId
      ? flags.filter(f => f.student.classId === classId)
      : flags;

    return Response.json({ flags: filtered });
  } catch (err) { return handleError(err); }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!['super_admin', 'school_admin', 'principal'].includes(primary.role_code)) throw new ForbiddenError();

    const body = await request.json();
    const { schoolId: sid, classId, cycleId } = body;
    const schoolId = await resolveSchoolId(user, sid);

    // Get students to evaluate
    const students = await prisma.student.findMany({
      where: { schoolId, status: 'active', ...(classId ? { classId } : {}) },
      select: { id: true, classId: true },
    });

    let flagged = 0, updated = 0;

    for (const s of students) {
      const triggers: { type: string; detail: string }[] = [];
      let score = 0;

      // 1. Latest attendance summary
      const attSummary = cycleId
        ? await prisma.attendancePeriodSummary.findUnique({ where: { studentId_cycleId: { studentId: s.id, cycleId } } })
        : await prisma.attendancePeriodSummary.findFirst({ where: { studentId: s.id }, orderBy: { computedAt: 'desc' } });

      const attPct = attSummary ? Number(attSummary.attendancePercent) : null;
      if (attPct !== null) {
        if (attPct < 75) { score += 40; triggers.push({ type: 'attendance', detail: `${attPct.toFixed(1)}% (critical)` }); }
        else if (attPct < 80) { score += 20; triggers.push({ type: 'attendance', detail: `${attPct.toFixed(1)}% (low)` }); }
      }

      // 2. Declining exam results (last 2 exams)
      const examResults = await prisma.examResult.findMany({
        where: { studentId: s.id, schoolId },
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: { marksObtained: true, maxMarks: true, createdAt: true },
      });
      if (examResults.length >= 2) {
        let declines = 0;
        for (let i = 0; i < examResults.length - 1; i++) {
          const curr = Number(examResults[i].marksObtained) / Number(examResults[i].maxMarks);
          const prev = Number(examResults[i + 1].marksObtained) / Number(examResults[i + 1].maxMarks);
          if (curr < prev - 0.05) declines++;
        }
        if (declines >= 2) {
          score += 30;
          triggers.push({ type: 'declining_exams', detail: `${declines} consecutive declines` });
        }
      }

      // 3. Negative behavior incidents
      const negativeIncidents = await prisma.behaviorIncident.count({
        where: { studentId: s.id, schoolId, incidentType: 'negative', ...(cycleId ? { cycleId } : {}) },
      });
      if (negativeIncidents > 0) {
        score += Math.min(negativeIncidents * 5, 20);
        triggers.push({ type: 'behavior', detail: `${negativeIncidents} negative incident(s)` });
      }

      const level = riskLevel(score);
      const action = score >= 61
        ? 'Immediate counseling session and parent notification required'
        : score >= 31
        ? 'Schedule teacher-parent meeting and monitor closely'
        : 'Regular monitoring recommended';

      if (score > 0) {
        await prisma.riskFlag.upsert({
          where: { id: (await prisma.riskFlag.findFirst({ where: { studentId: s.id, resolvedAt: null } }))?.id ?? 'new' },
          create: {
            schoolId, studentId: s.id,
            riskLevel: level, riskScore: score, triggers,
            attendancePct: attPct,
            decliningExams: examResults.length >= 2 ? examResults.length : 0,
            recommendedAction: action,
          },
          update: { riskLevel: level, riskScore: score, triggers, attendancePct: attPct, recommendedAction: action, resolvedAt: null },
        });
        flagged++;
      }
      updated++;
    }

    return Response.json({ evaluated: updated, flagged });
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
    const flag = await prisma.riskFlag.findUnique({ where: { id } });
    if (!flag) throw new AppError('Risk flag not found', 404);
    if (primary.school_id && flag.schoolId !== primary.school_id) throw new ForbiddenError();

    await prisma.riskFlag.update({
      where: { id },
      data:  { resolvedAt: new Date(), resolvedById: user.id },
    });

    return Response.json({ ok: true, resolvedAt: new Date() });
  } catch (err) { return handleError(err); }
}
