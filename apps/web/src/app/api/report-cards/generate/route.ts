/**
 * POST /api/report-cards/generate
 * Body: { cycleId, classId?, regenerate? }
 *
 * Reads CycleAcademicSummary + AttendancePeriodSummary for every student in the cycle,
 * upserts a ReportCard per student, and returns the count.
 * Only school_admin / principal / super_admin may trigger.
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

const ALLOWED = ['super_admin', 'school_admin', 'principal'];

const DEFAULT_CFG = { excellentMin: 90, goodMin: 75, averageMin: 60, belowAverageMin: 40 };
const DEFAULT_RATING_SCALE = [
  { min: 90, max: 100, label: 'Outstanding' },
  { min: 75, max: 89,  label: 'Excellent' },
  { min: 60, max: 74,  label: 'Good' },
  { min: 40, max: 59,  label: 'Average' },
  { min:  0, max: 39,  label: 'Below Average' },
];

function getRating(score: number, cfg: { excellentMin: number; goodMin: number; averageMin: number; belowAverageMin: number } | undefined): string {
  const c = cfg ?? DEFAULT_CFG;
  if (score >= c.excellentMin) return 'Excellent';
  if (score >= c.goodMin)      return 'Good';
  if (score >= c.averageMin)   return 'Average';
  if (score >= c.belowAverageMin) return 'Below Average';
  return 'Poor';
}

function getCompositeLabel(score: number, ratingScale: any): string {
  const scale = Array.isArray(ratingScale) && ratingScale.length > 0 ? ratingScale : DEFAULT_RATING_SCALE;
  const band = (scale as { min: number; max: number; label: string }[]).find(b => score >= b.min && score <= b.max);
  return band ? band.label : 'Below Average';
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!ALLOWED.includes(primary.role_code)) throw new ForbiddenError('Admin role required');

    const body = await request.json();
    const { cycleId, classId, regenerate = false } = body;
    if (!cycleId) throw new AppError('cycleId required');

    const schoolId: string = primary.role_code === 'super_admin' && body.schoolId
      ? body.schoolId
      : primary.school_id;
    if (!schoolId) throw new AppError('school_id required');

    const cycle = await prisma.performanceCycle.findFirst({ where: { id: cycleId, schoolId } });
    if (!cycle) throw new AppError('Cycle not found', 404);

    // Fetch academic + attendance summaries
    const [acaSummaries, attSummaries] = await Promise.all([
      prisma.cycleAcademicSummary.findMany({
        where: { cycleId, schoolId, ...(classId ? { classId } : {}) },
        include: { student: { select: { id: true, firstName: true, lastName: true, admissionNo: true, classId: true } } },
      }),
      prisma.attendancePeriodSummary.findMany({
        where: { cycleId, schoolId },
      }),
    ]);

    // ── Behavior & ECO data (bulk fetch for the whole cycle) ─────────────────────
    const [behaviorKpiCfgs, ratingCfgs, incidents, ecoEntries] = await Promise.all([
      prisma.behaviorKpiConfig.findMany({ where: { schoolId, isActive: true } }),
      prisma.kpiRatingConfig.findMany({ where: { schoolId } }),
      prisma.behaviorIncident.findMany({ where: { schoolId, cycleId } }),
      prisma.extracurricularEntry.findMany({ where: { schoolId, cycleId } }),
    ]);

    const codeToWeight = Object.fromEntries(behaviorKpiCfgs.map(c => [c.code, c.weight]));
    const behCfg  = ratingCfgs.find(c => c.segment === 'behavior');
    const ecoCfg  = ratingCfgs.find(c => c.segment === 'extracurricular');
    const comCfg  = ratingCfgs.find(c => c.segment === 'composite');

    const wAca = comCfg?.weightAcademic   ?? 40;
    const wAtt = comCfg?.weightAttendance ?? 30;
    const wBeh = comCfg?.weightBehavior   ?? 20;
    const wEco = comCfg?.weightEco        ?? 10;

    // Group by studentId for O(1) per-student lookup
    const incidentsByStudent: Record<string, typeof incidents> = {};
    for (const inc of incidents) {
      if (!incidentsByStudent[inc.studentId]) incidentsByStudent[inc.studentId] = [];
      incidentsByStudent[inc.studentId].push(inc);
    }
    const ecoPointsByStudent: Record<string, number> = {};
    for (const e of ecoEntries) {
      ecoPointsByStudent[e.studentId] = (ecoPointsByStudent[e.studentId] ?? 0) + e.points;
    }

    const attMap = Object.fromEntries(attSummaries.map(a => [a.studentId, a]));

    let created = 0, updated = 0, skipped = 0;

    for (const aca of acaSummaries) {
      const att = attMap[aca.studentId];

      // Skip if already exists and regenerate=false
      if (!regenerate) {
        const existing = await prisma.reportCard.findFirst({ where: { studentId: aca.studentId, cycleId } });
        if (existing) { skipped++; continue; }
      }

      const academicData = JSON.stringify({
        overallPercentage: aca.overallPercentage,
        overallGrade:      aca.overallGrade,
        classRank:         aca.classRank,
        gradeRank:         aca.gradeRank,
        classAverage:      aca.classAverage,
        weakSubjects:      aca.weakSubjects,
        strongSubjects:    aca.strongSubjects,
        rating:            aca.rating,
        subjects:          aca.subjectsData ? JSON.parse(aca.subjectsData) : [],
      });

      const attendanceData = att ? JSON.stringify({
        workingDays:       att.workingDays,
        presentDays:       att.presentDays,
        absentDays:        att.absentDays,
        lateDays:          att.lateDays,
        attendancePercent: att.attendancePercent,
        rating:            att.rating,
      }) : null;

      // ── Behavior score ───────────────────────────────────────────────────────
      const sIncidents = incidentsByStudent[aca.studentId] ?? [];
      let behScore = 100;
      for (const inc of sIncidents) {
        behScore += codeToWeight[inc.category] ?? (inc.incidentType === 'negative' ? -5 : 5);
      }
      behScore = Math.max(0, Math.min(100, behScore));

      const behaviorData = JSON.stringify({
        score:     behScore,
        incidents: sIncidents.length,
        rating:    getRating(behScore, behCfg as any),
      });

      // ── ECO score ────────────────────────────────────────────────────────────
      const ecoPoints = ecoPointsByStudent[aca.studentId] ?? 0;
      const ecoScore  = ecoCfg
        ? ecoPoints >= ecoCfg.ecoExcellentMin ? 100
        : ecoPoints >= ecoCfg.ecoGoodMin      ? 75
        : ecoPoints >= ecoCfg.ecoAverageMin   ? 50
        : ecoPoints >= ecoCfg.ecoBelowAvgMin  ? 25 : 0
        : Math.min(100, ecoPoints * 5);

      const ecoData = JSON.stringify({
        score:    ecoScore,
        points:   ecoPoints,
        entries:  ecoEntries.filter(e => e.studentId === aca.studentId).length,
        rating:   getRating(ecoScore, ecoCfg as any),
      });

      // ── Composite score ──────────────────────────────────────────────────────
      const acaScore = Number(aca.overallPercentage ?? 50);
      const attScore = Number(att?.attendancePercent ?? 80);

      const compositeScore = Math.round(
        acaScore * wAca / 100 +
        attScore * wAtt / 100 +
        behScore * wBeh / 100 +
        ecoScore * wEco / 100,
      );

      const overallRating   = getCompositeLabel(compositeScore, comCfg?.ratingScale);
      const behaviorRating  = getRating(behScore, behCfg as any);
      const ecoRating       = getRating(ecoScore, ecoCfg as any);

      const existing = await prisma.reportCard.findFirst({ where: { studentId: aca.studentId, cycleId } });

      if (existing) {
        await prisma.reportCard.update({
          where: { id: existing.id },
          data: {
            academicData,
            attendanceData,
            behaviorData,
            ecoData,
            compositeScore,
            overallRating,
            academicRating:    aca.rating ?? null,
            attendanceRating:  att?.rating ?? null,
            behaviorRating,
            ecoRating,
            status:            'draft',
          },
        });
        updated++;
      } else {
        await prisma.reportCard.create({
          data: {
            schoolId,
            studentId:        aca.studentId,
            cycleId,
            classId:          aca.classId ?? aca.student.classId ?? null,
            academicYear:     cycle.academicYear,
            term:             cycle.name,
            academicData,
            attendanceData,
            behaviorData,
            ecoData,
            compositeScore,
            overallRating,
            academicRating:   aca.rating ?? null,
            attendanceRating: att?.rating ?? null,
            behaviorRating,
            ecoRating,
            status:           'draft',
            sentById:         user.id,
          },
        });
        created++;
      }
    }

    return Response.json({ created, updated, skipped, total: acaSummaries.length });
  } catch (err) { return handleError(err); }
}
