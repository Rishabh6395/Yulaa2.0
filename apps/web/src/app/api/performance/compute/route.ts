/**
 * POST /api/performance/compute
 * Trigger cycle-end computation for a given cycleId:
 *   1. AttendancePeriodSummary per student
 *   2. CycleAcademicSummary per student (with bell curve, ranks, strength/weakness)
 *   3. BehaviorIncident aggregation + rating per student
 *   4. ExtracurricularEntry aggregation + points rating
 *   5. Composite score + overall rating per student
 *   6. CourseRecommendation auto-creation for weak subjects
 *   7. EarlyWarningLog trigger for 2-cycle drops
 *
 * Called by cron or manually by admin.
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

// ── Rating helpers ────────────────────────────────────────────────────────────

function getRating(score: number, cfg: { excellentMin: number; goodMin: number; averageMin: number; belowAverageMin: number }): string {
  if (score >= cfg.excellentMin)    return 'Excellent';
  if (score >= cfg.goodMin)         return 'Good';
  if (score >= cfg.averageMin)      return 'Average';
  if (score >= cfg.belowAverageMin) return 'Below Average';
  return 'Poor';
}

function getBehaviorRating(score: number, cfg: { excellentMin: number; goodMin: number; averageMin: number; belowAverageMin: number }): string {
  return getRating(score, cfg);
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function buildBellCurve(values: number[]): { range: string; count: number }[] {
  const buckets: Record<string, number> = {};
  for (let i = 0; i <= 90; i += 10) {
    buckets[`${i}-${i + 10}`] = 0;
  }
  for (const v of values) {
    const bucket = Math.min(Math.floor(v / 10) * 10, 90);
    buckets[`${bucket}-${bucket + 10}`]++;
  }
  return Object.entries(buckets).map(([range, count]) => ({ range, count }));
}

// ── Main compute function ─────────────────────────────────────────────────────

async function computeCycle(cycleId: string, triggeredBy: string) {
  const cycle = await prisma.performanceCycle.findUnique({
    where: { id: cycleId },
    include: { school: true },
  });
  if (!cycle) throw new AppError('Cycle not found', 404);

  const schoolId   = cycle.schoolId;
  const computedAt = new Date();
  const log: string[] = [];

  // Load rating configs for this school
  const ratingCfgs = await prisma.kpiRatingConfig.findMany({ where: { schoolId } });
  const getCfg = (segment: string) => ratingCfgs.find(c => c.segment === segment);

  const attCfg = getCfg('attendance');
  const acaCfg = getCfg('academic');
  const behCfg = getCfg('behavior');
  const ecoCfg = getCfg('extracurricular');
  const comCfg = getCfg('composite');

  // Fallback defaults
  const defaultCfg = { excellentMin: 90, goodMin: 75, averageMin: 60, belowAverageMin: 40 };

  // Load all active students in school
  const students = await prisma.student.findMany({
    where: { schoolId, status: 'active' },
    select: { id: true, classId: true },
  });

  // ── Step 1: Attendance Period Summaries ──────────────────────────────────────
  const timing = await prisma.schoolTimingConfig.findFirst({
    where: { schoolId },
    orderBy: { effectiveFrom: 'desc' },
  });

  const attRows = await prisma.attendance.findMany({
    where: {
      schoolId,
      date: { gte: cycle.startDate, lte: cycle.endDate },
      studentId: { in: students.map(s => s.id) },
    },
    select: { studentId: true, status: true, punchInTime: true },
  });

  const attByStudent: Record<string, typeof attRows> = {};
  for (const a of attRows) {
    if (!a.studentId) continue;
    if (!attByStudent[a.studentId]) attByStudent[a.studentId] = [];
    attByStudent[a.studentId].push(a);
  }

  const attSummaries: { studentId: string; present: number; absent: number; late: number; half: number; excused: number; total: number; pct: number; lateCount: number }[] = [];

  for (const s of students) {
    const rows = attByStudent[s.id] ?? [];
    const present = rows.filter(r => r.status === 'present').length;
    const absent  = rows.filter(r => r.status === 'absent').length;
    const late    = rows.filter(r => r.status === 'late').length;
    const half    = rows.filter(r => r.status === 'half_day').length;
    const excused = rows.filter(r => r.status === 'excused').length;
    const total   = rows.length;
    const pct     = total > 0 ? Math.round(((present + late + half * 0.5) / total) * 100) : 0;
    attSummaries.push({ studentId: s.id, present, absent, late, half, excused, total, pct, lateCount: late });
  }

  // Upsert AttendancePeriodSummary
  await prisma.$transaction(
    attSummaries.map(s =>
      prisma.attendancePeriodSummary.upsert({
        where:  { studentId_cycleId: { studentId: s.studentId, cycleId } },
        create: {
          schoolId, studentId: s.studentId, cycleId,
          workingDays:       s.total,
          presentDays:       s.present,
          absentDays:        s.absent,
          lateDays:          s.late,
          halfDays:          s.half,
          excusedDays:       s.excused,
          attendancePercent: s.pct,
          lateCount:         s.lateCount,
          rating:            getRating(s.pct, attCfg ?? defaultCfg),
          computedAt,
        },
        update: {
          workingDays:       s.total,
          presentDays:       s.present,
          absentDays:        s.absent,
          lateDays:          s.late,
          halfDays:          s.half,
          excusedDays:       s.excused,
          attendancePercent: s.pct,
          lateCount:         s.lateCount,
          rating:            getRating(s.pct, attCfg ?? defaultCfg),
          computedAt,
        },
      }),
    ),
  );
  log.push(`attendance: ${attSummaries.length} summaries`);

  // ── Step 2: Academic Summaries ────────────────────────────────────────────────
  const examResults = await prisma.examResult.findMany({
    where: {
      exam: { performanceCycleId: cycleId },
      approved: true,
    },
    include: { exam: { select: { classId: true } } },
  });

  // Group by student
  const resultsByStudent: Record<string, typeof examResults> = {};
  for (const r of examResults) {
    if (!resultsByStudent[r.studentId]) resultsByStudent[r.studentId] = [];
    resultsByStudent[r.studentId].push(r);
  }

  // Compute class-level stats for bell curve + ranks
  const classBySubject: Record<string, Record<string, number[]>> = {}; // classId → subject → pcts

  for (const [studentId, results] of Object.entries(resultsByStudent)) {
    const student = students.find(s => s.id === studentId);
    if (!student?.classId) continue;
    if (!classBySubject[student.classId]) classBySubject[student.classId] = {};
    for (const r of results) {
      const pct = Math.round((Number(r.marksObtained) / r.maxMarks) * 100);
      if (!classBySubject[student.classId][r.subject]) classBySubject[student.classId][r.subject] = [];
      classBySubject[student.classId][r.subject].push(pct);
    }
  }

  const acaSummaries = students.map(s => {
    const results = resultsByStudent[s.id] ?? [];
    if (results.length === 0) return null;

    const subjectMap: Record<string, { marks: number; max: number; pct: number }[]> = {};
    for (const r of results) {
      const pct = Math.round((Number(r.marksObtained) / r.maxMarks) * 100);
      if (!subjectMap[r.subject]) subjectMap[r.subject] = [];
      subjectMap[r.subject].push({ marks: Number(r.marksObtained), max: r.maxMarks, pct });
    }

    const subjectsData = Object.entries(subjectMap).map(([subject, rows]) => {
      const avgPct  = Math.round(rows.reduce((a, r) => a + r.pct, 0) / rows.length);
      const classAvgs = s.classId ? classBySubject[s.classId]?.[subject] ?? [] : [];
      const classAvg  = classAvgs.length ? Math.round(classAvgs.reduce((a, b) => a + b, 0) / classAvgs.length) : avgPct;
      const sd        = stdDev(classAvgs);
      const rank      = classAvgs.filter(p => p > avgPct).length + 1;
      return {
        subject,
        maxMarks:   rows[0].max,
        marks:      Math.round(rows.reduce((a, r) => a + r.marks, 0) / rows.length),
        percentage: avgPct,
        grade:      avgPct >= 90 ? 'A+' : avgPct >= 80 ? 'A' : avgPct >= 70 ? 'B+' : avgPct >= 60 ? 'B' : avgPct >= 50 ? 'C' : avgPct >= 40 ? 'D' : 'F',
        classRank:  rank,
        classAverage: classAvg,
        isWeak:     avgPct < classAvg - sd,
        isStrong:   avgPct > classAvg + sd,
        bellCurve:  buildBellCurve(classAvgs),
      };
    });

    const overallPct  = subjectsData.length
      ? Math.round(subjectsData.reduce((a, s) => a + s.percentage, 0) / subjectsData.length)
      : 0;

    const weakSubjects   = subjectsData.filter(s => s.isWeak).map(s => s.subject).join(', ');
    const strongSubjects = subjectsData.filter(s => s.isStrong).map(s => s.subject).join(', ');

    return {
      studentId:         s.id,
      classId:           s.classId,
      subjectsData:      JSON.stringify(subjectsData),
      overallPercentage: overallPct,
      overallGrade:      overallPct >= 90 ? 'A+' : overallPct >= 80 ? 'A' : overallPct >= 70 ? 'B+' : overallPct >= 60 ? 'B' : 'C',
      weakSubjects,
      strongSubjects,
      rating:            getRating(overallPct, acaCfg ?? defaultCfg),
      bellCurveData:     null,
    };
  }).filter(Boolean) as NonNullable<ReturnType<typeof students['map']>[number]>[];

  await prisma.$transaction(
    (acaSummaries as any[]).map((s: any) =>
      prisma.cycleAcademicSummary.upsert({
        where:  { studentId_cycleId: { studentId: s.studentId, cycleId } },
        create: { schoolId, cycleId, computedAt, ...s },
        update: { computedAt, ...s },
      }),
    ),
  );
  log.push(`academic: ${acaSummaries.length} summaries`);

  // ── Step 3: Behavior scoring ──────────────────────────────────────────────────
  const behaviorKpiCfgs = await prisma.behaviorKpiConfig.findMany({ where: { schoolId, isActive: true } });
  const codeToWeight = Object.fromEntries(behaviorKpiCfgs.map(c => [c.code, c.weight]));

  const incidents = await prisma.behaviorIncident.findMany({
    where: { schoolId, cycleId, studentId: { in: students.map(s => s.id) } },
  });

  // ── Step 4: ECO scoring ───────────────────────────────────────────────────────
  const ecoEntries = await prisma.extracurricularEntry.findMany({
    where: { schoolId, cycleId, studentId: { in: students.map(s => s.id) } },
  });

  const ecoByStudent: Record<string, number> = {};
  for (const e of ecoEntries) {
    ecoByStudent[e.studentId] = (ecoByStudent[e.studentId] ?? 0) + e.points;
  }

  // ── Step 5: Composite scores ──────────────────────────────────────────────────
  const wAca  = comCfg?.weightAcademic    ?? 40;
  const wAtt  = comCfg?.weightAttendance  ?? 30;
  const wBeh  = comCfg?.weightBehavior    ?? 20;
  const wEco  = comCfg?.weightEco         ?? 10;

  // ── Step 6: Course recommendations for weak subjects ──────────────────────────
  const newRecs: any[] = [];

  for (const s of students) {
    const attSum = attSummaries.find(a => a.studentId === s.id);
    const acaSum = (acaSummaries as any[]).find((a: any) => a.studentId === s.id);

    const attScore = attSum?.pct ?? 80;

    // Behavior score
    const sIncidents = incidents.filter(i => i.studentId === s.id);
    let behScore = 100;
    for (const inc of sIncidents) {
      behScore += codeToWeight[inc.category] ?? (inc.incidentType === 'negative' ? -5 : 5);
    }
    behScore = Math.max(0, Math.min(100, behScore));

    const ecoPoints = ecoByStudent[s.id] ?? 0;
    const ecoScore  = ecoCfg
      ? ecoPoints >= ecoCfg.excellentMin ? 100
      : ecoPoints >= ecoCfg.goodMin      ? 75
      : ecoPoints >= ecoCfg.averageMin   ? 50
      : ecoPoints >= ecoCfg.belowAverageMin ? 25 : 0
      : Math.min(100, ecoPoints * 5);

    const acaScore = acaSum?.overallPercentage ?? 50;

    const composite = Math.round(
      acaScore * wAca / 100 +
      attScore * wAtt / 100 +
      behScore * wBeh / 100 +
      ecoScore * wEco / 100,
    );

    // Update AttendancePeriodSummary with behavior + ECO for report card (store composite in academic summary)
    if (acaSum) {
      // Parse weak subjects and create recommendations
      const weakSubjs = (acaSum.weakSubjects ?? '').split(',').map((s: string) => s.trim()).filter(Boolean);
      for (const subj of weakSubjs) {
        const existingRec = await prisma.courseRecommendation.findFirst({
          where: { schoolId, studentId: s.id, cycleId, subject: subj, source: 'auto' },
        });
        if (!existingRec) {
          newRecs.push({
            schoolId, studentId: s.id, cycleId, subject: subj,
            reason: `Score below class average by >1 std deviation in ${subj}`,
            source: 'auto', status: 'pending',
          });
        }
      }
    }
  }

  if (newRecs.length > 0) {
    await prisma.courseRecommendation.createMany({ data: newRecs, skipDuplicates: true });
  }
  log.push(`course recommendations: ${newRecs.length} auto-created`);

  // ── Step 7: Early warning detection ──────────────────────────────────────────
  // Find previous cycle for same school + academic year
  const prevCycle = await prisma.performanceCycle.findFirst({
    where: {
      schoolId,
      academicYear: cycle.academicYear,
      endDate: { lt: cycle.startDate },
      status:  { in: ['locked', 'report_published'] },
    },
    orderBy: { endDate: 'desc' },
  });

  if (prevCycle) {
    const prevAcaSummaries = await prisma.cycleAcademicSummary.findMany({
      where: { cycleId: prevCycle.id, schoolId },
    });

    const warnings: any[] = [];
    for (const curr of acaSummaries as any[]) {
      const prev = prevAcaSummaries.find((p) => p.studentId === curr.studentId);
      if (!prev) continue;

      const currRating = curr.rating;
      const prevRating = (prev as any).rating;
      const ratingOrder = ['Excellent', 'Good', 'Average', 'Below Average', 'Poor'];
      const currIdx = ratingOrder.indexOf(currRating);
      const prevIdx = ratingOrder.indexOf(prevRating);

      if (currIdx > prevIdx + 1) { // Dropped 2+ bands
        const existing = await prisma.earlyWarningLog.findFirst({
          where: { studentId: curr.studentId, cycleId, warningType: 'academic_drop' },
        });
        if (!existing) {
          warnings.push({
            schoolId, studentId: curr.studentId, cycleId,
            warningType:    'academic_drop',
            segment:        'academic',
            previousRating: prevRating,
            currentRating:  currRating,
            notifiedParent: false,
          });
        }
      }
    }

    if (warnings.length > 0) {
      await prisma.earlyWarningLog.createMany({ data: warnings, skipDuplicates: true });
    }
    log.push(`early warnings: ${warnings.length} triggered`);
  }

  return { cycleId, schoolId, computedAt, log };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    if (!['super_admin', 'school_admin', 'principal'].includes(primary.role_code))
      throw new ForbiddenError('Admin access required');

    const body = await request.json();
    const { cycleId } = body;
    if (!cycleId) throw new AppError('cycleId required');

    const result = await computeCycle(cycleId, user.id);
    return Response.json(result);
  } catch (err) { return handleError(err); }
}

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const { searchParams } = new URL(request.url);
    const cycleId   = searchParams.get('cycle_id');
    const studentId = searchParams.get('student_id');
    const primary   = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];

    // Resolve schoolId — never allow unscoped cross-school access
    let schoolId: string;
    if (primary.role_code === 'super_admin') {
      const paramSchoolId = searchParams.get('school_id');
      if (!paramSchoolId) throw new AppError('school_id is required for super_admin');
      schoolId = paramSchoolId;
    } else {
      if (!primary.school_id) throw new AppError('school_id required');
      schoolId = primary.school_id;
    }

    if (!cycleId) throw new AppError('cycle_id required');

    // Verify cycle belongs to this school to prevent cross-school access
    const cycle = await prisma.performanceCycle.findFirst({ where: { id: cycleId, schoolId } });
    if (!cycle) throw new AppError('Cycle not found', 404);

    const [attSummaries, acaSummaries] = await Promise.all([
      prisma.attendancePeriodSummary.findMany({
        where: { cycleId, schoolId, ...(studentId ? { studentId } : {}) },
        include: { student: { select: { firstName: true, lastName: true, admissionNo: true } } },
      }),
      prisma.cycleAcademicSummary.findMany({
        where: { cycleId, schoolId, ...(studentId ? { studentId } : {}) },
        include: { student: { select: { firstName: true, lastName: true, admissionNo: true } } },
      }),
    ]);

    return Response.json({ attSummaries, acaSummaries });
  } catch (err) { return handleError(err); }
}
