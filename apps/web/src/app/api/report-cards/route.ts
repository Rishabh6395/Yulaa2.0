import { getUserFromRequest } from '@/lib/auth';
import { handleError, UnauthorizedError, ForbiddenError, AppError } from '@/utils/errors';
import prisma from '@/lib/prisma';

// ── Role helpers ─────────────────────────────────────────────────────────────

function getPrimary(user: any) {
  return user.roles.find((r: any) => r.is_primary) ?? user.roles[0];
}
function canSend(user: any) {
  return user.roles.some((r: any) =>
    ['school_admin', 'principal', 'teacher'].includes(r.role_code),
  );
}
function isParent(user: any) {
  return user.roles.some((r: any) => r.role_code === 'parent');
}
function getSchoolId(user: any) {
  return getPrimary(user)?.school_id ?? null;
}

// ── Rating helpers ───────────────────────────────────────────────────────────

interface RatingCfg {
  excellentMin: number; goodMin: number; averageMin: number; belowAverageMin: number;
  behExcellentMax: number; behGoodMax: number; behAverageMax: number; behBelowAvgMax: number;
}

const DEFAULT_RATING_CFG: Record<string, RatingCfg> = {
  academic:   { excellentMin: 90, goodMin: 75, averageMin: 60, belowAverageMin: 40, behExcellentMax: 0, behGoodMax: 2, behAverageMax: 5, behBelowAvgMax: 10 },
  attendance: { excellentMin: 95, goodMin: 85, averageMin: 75, belowAverageMin: 60, behExcellentMax: 0, behGoodMax: 2, behAverageMax: 5, behBelowAvgMax: 10 },
  behavior:   { excellentMin: 90, goodMin: 75, averageMin: 60, belowAverageMin: 40, behExcellentMax: 0, behGoodMax: 2, behAverageMax: 5, behBelowAvgMax: 10 },
};

async function getRatingCfg(schoolId: string): Promise<Record<string, RatingCfg>> {
  try {
    const rows = await prisma.kpiRatingConfig.findMany({ where: { schoolId } });
    const cfg = { ...DEFAULT_RATING_CFG };
    for (const r of rows) {
      cfg[r.segment] = {
        excellentMin:    r.excellentMin,    goodMin:         r.goodMin,
        averageMin:      r.averageMin,      belowAverageMin: r.belowAverageMin,
        behExcellentMax: r.behExcellentMax, behGoodMax:      r.behGoodMax,
        behAverageMax:   r.behAverageMax,   behBelowAvgMax:  r.behBelowAvgMax,
      };
    }
    return cfg;
  } catch { return DEFAULT_RATING_CFG; }
}

function rateScore(pct: number, cfg: RatingCfg): string {
  if (pct >= cfg.excellentMin)    return 'Excellent';
  if (pct >= cfg.goodMin)         return 'Good';
  if (pct >= cfg.averageMin)      return 'Average';
  if (pct >= cfg.belowAverageMin) return 'Below Average';
  return 'Needs Improvement';
}

function rateBehavior(negCount: number, cfg: RatingCfg): string {
  if (negCount <= cfg.behExcellentMax) return 'Excellent';
  if (negCount <= cfg.behGoodMax)      return 'Good';
  if (negCount <= cfg.behAverageMax)   return 'Average';
  if (negCount <= cfg.behBelowAvgMax)  return 'Below Average';
  return 'Needs Improvement';
}

// ── Academic year → date range ────────────────────────────────────────────────

function yearDateRange(ay: string): { gte: Date; lte: Date } {
  // ay = "2024-25" → Apr 1 2024 – Mar 31 2025
  const startYear = parseInt(ay.split('-')[0], 10);
  return {
    gte: new Date(`${startYear}-04-01`),
    lte: new Date(`${startYear + 1}-03-31T23:59:59`),
  };
}

// ── Snapshot builder ─────────────────────────────────────────────────────────

async function buildSnapshot(
  studentId: string,
  schoolId: string,
  academicYear: string,
  ratingCfg: Record<string, RatingCfg>,
) {
  const dateRange = yearDateRange(academicYear);

  // ── Academic data ─────────────────────────────────────────────────────────
  const results = await prisma.examResult.findMany({
    where: {
      studentId,
      exam: { schoolId, academicYear },
    },
    include: {
      exam: { select: { title: true, examType: true, gradingType: true, maxMarks: true, passingMarks: true, startDate: true } },
    },
    orderBy: { exam: { startDate: 'desc' } },
  });

  const subjectMap: Record<string, { subject: string; exams: any[] }> = {};
  for (const r of results) {
    const pct = r.exam.maxMarks > 0 ? Math.round((Number(r.marksObtained) / r.exam.maxMarks) * 100) : 0;
    if (!subjectMap[r.subject]) subjectMap[r.subject] = { subject: r.subject, exams: [] };
    subjectMap[r.subject].exams.push({
      examId:        r.examId,
      examTitle:     r.exam.title,
      examType:      r.exam.examType,
      gradingType:   r.exam.gradingType,
      marksObtained: Number(r.marksObtained),
      maxMarks:      r.exam.maxMarks,
      passingMarks:  r.exam.passingMarks,
      percentage:    pct,
      grade:         r.grade ?? null,
      remarks:       r.remarks ?? null,
      date:          r.exam.startDate,
    });
  }

  const subjects = Object.values(subjectMap).map(s => {
    const avgPct = s.exams.length
      ? Math.round(s.exams.reduce((acc, e) => acc + e.percentage, 0) / s.exams.length)
      : 0;
    return { ...s, avgPct };
  });

  const allPcts = subjects.map(s => s.avgPct).filter(p => p > 0);
  const overallAvg = allPcts.length ? Math.round(allPcts.reduce((a, b) => a + b, 0) / allPcts.length) : 0;
  const passedSubjects = subjects.filter(s => s.avgPct >= 40).length;

  const academicData = {
    subjects,
    overallAvg,
    totalSubjects: subjects.length,
    passedSubjects,
    failedSubjects: subjects.length - passedSubjects,
    kpis: {
      avg_score:       overallAvg,
      pass_percentage: subjects.length ? Math.round((passedSubjects / subjects.length) * 100) : 0,
    },
  };

  // ── Attendance data ───────────────────────────────────────────────────────
  const attRecords = await prisma.attendance.findMany({
    where: { studentId, schoolId, date: dateRange },
    select: { status: true, date: true },
  });

  const presentDays = attRecords.filter(a => a.status === 'present').length;
  const lateDays    = attRecords.filter(a => a.status === 'late').length;
  const absentDays  = attRecords.filter(a => a.status === 'absent').length;
  const totalDays   = attRecords.length;
  const attPct      = totalDays ? Math.round(((presentDays + lateDays) / totalDays) * 100) : 0;

  const attendanceData = {
    totalDays,
    presentDays,
    lateDays,
    absentDays,
    attendancePct: attPct,
    kpis: {
      student_attendance_pct: attPct,
      late_arrival_rate: totalDays ? Math.round((lateDays / totalDays) * 100) : 0,
    },
  };

  // ── Behavior data ─────────────────────────────────────────────────────────
  const incidents = await (prisma as any).behaviorIncident?.findMany?.({
    where: { studentId, schoolId, date: dateRange },
    select: { incidentType: true, category: true, description: true, severity: true, date: true },
    orderBy: { date: 'desc' as const },
  }) ?? [];

  const positiveCount = incidents.filter((i: any) => i.incidentType === 'positive').length;
  const negativeCount = incidents.filter((i: any) => i.incidentType === 'negative').length;
  const positiveRatio = incidents.length
    ? Math.round((positiveCount / incidents.length) * 100)
    : 100;

  const behaviorData = {
    totalIncidents: incidents.length,
    positiveCount,
    negativeCount,
    positiveRatio,
    incidents: incidents.slice(0, 10),  // last 10 incidents in snapshot
    kpis: {
      discipline_incident_count: negativeCount,
      positive_behavior_ratio:   positiveRatio,
    },
  };

  return {
    academicData,
    attendanceData,
    behaviorData,
    academicRating:   rateScore(overallAvg,  ratingCfg['academic']   ?? DEFAULT_RATING_CFG['academic']),
    attendanceRating: rateScore(attPct,      ratingCfg['attendance'] ?? DEFAULT_RATING_CFG['attendance']),
    behaviorRating:   rateBehavior(negativeCount, ratingCfg['behavior'] ?? DEFAULT_RATING_CFG['behavior']),
  };
}

// ── GET /api/report-cards ─────────────────────────────────────────────────────
// Parent: sees their children's report cards.
// Teacher/Admin: sees report cards for their school (optionally filtered by studentId / classId).

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();

    const { searchParams } = new URL(request.url);
    const qStudentId   = searchParams.get('studentId');
    const qClassId     = searchParams.get('classId');
    const qAcademicYear = searchParams.get('academicYear');
    const qTerm        = searchParams.get('term');

    if (isParent(user)) {
      // Parent: fetch their linked children's IDs
      const parentRecord = await prisma.parent.findUnique({
        where: { userId: user.id },
        include: { parentStudents: { select: { studentId: true } } },
      });
      if (!parentRecord) throw new ForbiddenError('Parent record not found');

      const childIds = parentRecord.parentStudents.map(ps => ps.studentId);
      const targetStudentId = qStudentId && childIds.includes(qStudentId) ? qStudentId : undefined;

      const cards = await prisma.reportCard.findMany({
        where: {
          studentId: targetStudentId ?? { in: childIds },
          ...(qAcademicYear ? { academicYear: qAcademicYear } : {}),
          ...(qTerm ? { term: qTerm } : {}),
        },
        include: {
          student: { select: { firstName: true, lastName: true, admissionNo: true, class: { select: { grade: true, section: true } } } },
          sentBy:  { select: { firstName: true, lastName: true } },
        },
        orderBy: { sentAt: 'desc' },
      });
      return Response.json({ reportCards: cards });
    }

    if (canSend(user)) {
      const schoolId = getSchoolId(user);
      if (!schoolId) throw new AppError('School context required');

      const primary = getPrimary(user);
      // Teachers: only see report cards they sent OR for their class
      const isTeacher = primary.role_code === 'teacher';

      const cards = await prisma.reportCard.findMany({
        where: {
          schoolId,
          ...(qStudentId   ? { studentId: qStudentId }     : {}),
          ...(qClassId     ? { classId: qClassId }         : {}),
          ...(qAcademicYear ? { academicYear: qAcademicYear } : {}),
          ...(qTerm        ? { term: qTerm }               : {}),
          ...(isTeacher    ? { sentById: user.id }         : {}),
        },
        include: {
          student: { select: { firstName: true, lastName: true, admissionNo: true, class: { select: { grade: true, section: true } } } },
          sentBy:  { select: { firstName: true, lastName: true } },
        },
        orderBy: { sentAt: 'desc' },
      });
      return Response.json({ reportCards: cards });
    }

    throw new ForbiddenError('Access denied');
  } catch (err) { return handleError(err); }
}

// ── POST /api/report-cards ────────────────────────────────────────────────────
// Generate & send report cards for one or more students.
// Body: { studentIds: string[], academicYear, term, teacherRemarks?, templateId? }

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) throw new UnauthorizedError();
    if (!canSend(user)) throw new ForbiddenError('Only school admin, principal, or teacher can send report cards');

    const schoolId = getSchoolId(user);
    if (!schoolId) throw new AppError('School context required');

    const body = await request.json();
    const { studentIds, academicYear, term, teacherRemarks, templateId } = body;

    if (!Array.isArray(studentIds) || studentIds.length === 0)
      throw new AppError('studentIds array is required');
    if (!academicYear) throw new AppError('academicYear is required');
    if (!term)         throw new AppError('term is required');

    // Verify all students belong to this school
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds }, schoolId },
      select: { id: true, classId: true },
    });
    if (students.length !== studentIds.length)
      throw new ForbiddenError('Some students do not belong to your school');

    // For teachers: only allow their own class students
    const primary = getPrimary(user);
    if (primary.role_code === 'teacher') {
      const teacher = await prisma.teacher.findFirst({ where: { userId: user.id, schoolId } });
      if (teacher) {
        let classId = teacher.classId ?? null;
        if (!classId) {
          const cls = await prisma.class.findFirst({ where: { classTeacherId: teacher.id, schoolId } });
          classId = cls?.id ?? null;
        }
        if (classId) {
          const outsideClass = students.filter(s => s.classId !== classId);
          if (outsideClass.length > 0)
            throw new ForbiddenError('You can only send reports for students in your assigned class');
        }
      }
    }

    // Load school's rating config (falls back to defaults if not configured)
    const ratingCfg = await getRatingCfg(schoolId);

    // Build snapshots + create ReportCard records
    const created = await Promise.all(
      students.map(async (s) => {
        const snap = await buildSnapshot(s.id, schoolId, academicYear, ratingCfg);
        return prisma.reportCard.create({
          data: {
            schoolId,
            studentId:       s.id,
            classId:         s.classId ?? null,
            academicYear,
            term,
            sentById:        user.id,
            academicData:    JSON.stringify(snap.academicData),
            attendanceData:  JSON.stringify(snap.attendanceData),
            behaviorData:    JSON.stringify(snap.behaviorData),
            academicRating:  snap.academicRating,
            attendanceRating: snap.attendanceRating,
            behaviorRating:  snap.behaviorRating,
            teacherRemarks:  teacherRemarks ?? null,
            templateId:      templateId ?? null,
            status:          'sent',
          },
        });
      }),
    );

    return Response.json({ sent: created.length, reportCards: created }, { status: 201 });
  } catch (err) { return handleError(err); }
}
