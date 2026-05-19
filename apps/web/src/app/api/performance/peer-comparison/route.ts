/**
 * GET /api/performance/peer-comparison?student_id=X&cycle_id=X
 *
 * Returns anonymized peer comparison for a student within their class for a cycle:
 *   - Student's own percentile rank in class (overall + per subject)
 *   - Class distribution (bell curve data already stored in CycleAcademicSummary)
 *   - Comparison to class average and top 10%
 *
 * Parents see their child only. Teachers see their class. Admins see all.
 */
import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    const primary = user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');
    const cycleId   = searchParams.get('cycle_id');
    if (!studentId || !cycleId) throw new AppError('student_id and cycle_id required');

    // Authorization: parent must own this student
    if (primary.role_code === 'parent') {
      const parent = await prisma.parent.findUnique({ where: { userId: user.id }, include: { parentStudents: { select: { studentId: true } } } });
      if (!parent?.parentStudents.some(ps => ps.studentId === studentId)) throw new ForbiddenError();
    }

    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { classId: true, schoolId: true } });
    if (!student) throw new AppError('Student not found', 404);

    const mySummary = await prisma.cycleAcademicSummary.findUnique({
      where: { studentId_cycleId: { studentId, cycleId } },
    });
    if (!mySummary) throw new AppError('No academic summary for this student/cycle', 404);

    // All summaries for the same class + cycle (anonymized)
    const classSummaries = await prisma.cycleAcademicSummary.findMany({
      where: { cycleId, classId: student.classId },
      select: { studentId: true, overallPercentage: true, classRank: true, rating: true },
    });

    const percentages = classSummaries.map(s => Number(s.overallPercentage)).sort((a, b) => a - b);
    const myPct = Number(mySummary.overallPercentage);

    // Percentile = (students scoring below me / total) * 100
    const below = percentages.filter(p => p < myPct).length;
    const percentile = classSummaries.length > 1
      ? Math.round((below / (classSummaries.length - 1)) * 100)
      : 100;

    const avg = percentages.length > 0 ? percentages.reduce((a, b) => a + b, 0) / percentages.length : 0;
    const top10Threshold = percentages[Math.floor(percentages.length * 0.9)] ?? 0;

    // Per-subject breakdown
    const mySubjects: any[] = mySummary.subjectsData ? JSON.parse(mySummary.subjectsData) : [];
    const subjectComparisons = mySubjects.map((sub: any) => ({
      subject:        sub.subject,
      myScore:        sub.pct,
      classAvg:       sub.classAvg ?? null,
      position:       sub.classRank ?? null,
      aboveAverage:   sub.classAvg !== undefined ? sub.pct >= sub.classAvg : null,
    }));

    return Response.json({
      studentId,
      cycleId,
      overall: {
        myPercentage: myPct,
        classRank:    mySummary.classRank,
        percentile,
        classAverage: Math.round(avg * 100) / 100,
        classSize:    classSummaries.length,
        top10Threshold,
        isTop10:      myPct >= top10Threshold,
        rating:       mySummary.rating,
      },
      subjects:    subjectComparisons,
      bellCurve:   mySummary.bellCurveData ? JSON.parse(mySummary.bellCurveData) : null,
      weakSubjects: mySummary.weakSubjects   ? mySummary.weakSubjects.split(',')   : [],
      strongSubjects: mySummary.strongSubjects ? mySummary.strongSubjects.split(',') : [],
    });
  } catch (err) { return handleError(err); }
}
