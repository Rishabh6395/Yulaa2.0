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

      const existing = await prisma.reportCard.findFirst({ where: { studentId: aca.studentId, cycleId } });

      if (existing) {
        await prisma.reportCard.update({
          where: { id: existing.id },
          data: {
            academicData,
            attendanceData,
            academicRating:    aca.rating ?? null,
            attendanceRating:  att?.rating ?? null,
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
            academicRating:   aca.rating ?? null,
            attendanceRating: att?.rating ?? null,
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
